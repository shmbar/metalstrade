'use server'

import admin from 'firebase-admin'
import { getAuth } from 'firebase-admin/auth';
import {
    buildClaims,
    canManageRole,
    canManageUsers,
    isProtectedAccount,
    isSuperAdmin,
    normalizeRole,
    resolvePages,
    roleLabel,
} from '../utils/permissions';

function getAdminAuth() {
    if (admin.apps.length === 0) {
        const serviceAccount = {
            type: process.env.FIREBASE_TYPE || "service_account",
            project_id: process.env.FIREBASE_PROJECT_ID,
            private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
            private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            client_email: process.env.FIREBASE_CLIENT_EMAIL,
            client_id: process.env.FIREBASE_CLIENT_ID,
            auth_uri: process.env.FIREBASE_AUTH_URI || "https://accounts.google.com/o/oauth2/auth",
            token_uri: process.env.FIREBASE_TOKEN_URI || "https://oauth2.googleapis.com/token",
            auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL || "https://www.googleapis.com/oauth2/v1/certs",
            client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
            universe_domain: process.env.FIREBASE_UNIVERSE_DOMAIN || "googleapis.com",
        };

        if (!serviceAccount.project_id || !serviceAccount.private_key || !serviceAccount.client_email) {
            throw new Error("Firebase Admin: missing required environment variables (FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL)");
        }

        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    }
    return getAuth();
}

// ─────────────────────────────────────────────────────────────────────────────
// Caller authorization.
//
// A server action is a plain POST endpoint: anyone who knows its id can call
// it. These used to take a uidCollection straight off the wire and trust it,
// which let any caller mint an Admin into any workspace. Every mutating action
// below now starts from the caller's own ID token instead, and the workspace
// is read from THAT — never from the argument.
// ─────────────────────────────────────────────────────────────────────────────

// Bootstrap escape hatch. The workspace owner (uid === uidCollection) is super
// admin automatically, but if a deployment has no such account there'd be no way
// to mint the first one. Listing an email in SUPER_ADMIN_EMAILS makes that person
// a super admin the next time they sign in; after that the role is a normal claim
// and the env var can be removed.
//   SUPER_ADMIN_EMAILS=zak@example.com,someone@example.com
function bootstrapEmails() {
    return String(process.env.SUPER_ADMIN_EMAILS || '')
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
}

// Verifies the caller's Firebase ID token and returns their identity + claims.
// Throws (as a returned error, never a crash) if the token is missing/expired.
async function getActor(idToken) {
    if (!idToken || typeof idToken !== 'string') {
        throw new Error('Not signed in. Please reload the page and try again.');
    }
    let decoded;
    try {
        // checkRevoked: a signed-out or disabled session can't keep administering.
        decoded = await getAdminAuth().verifyIdToken(idToken, true);
    } catch {
        throw new Error('Your session has expired. Please sign in again.');
    }
    const claims = {
        uidCollection: decoded.uidCollection,
        role: decoded.role,
        title: decoded.title,
        pages: decoded.pages,
    };
    if (!claims.uidCollection) throw new Error('Your account is not attached to a workspace.');

    // What the token ACTUALLY carries, captured before the env override below.
    // ensureSuperAdminClaim needs this: if it compared against the overridden
    // value it would conclude the role was already stored and skip writing it,
    // so the bootstrap would appear to work every session and never persist.
    const storedRole = normalizeRole(claims.role || claims.title);

    // An env-listed address outranks whatever the token currently says, so a
    // stale claim can't lock the bootstrap admin out of their own workspace.
    const viaEnv = Boolean(decoded.email && bootstrapEmails().includes(String(decoded.email).toLowerCase()));
    if (viaEnv) claims.role = 'superadmin';

    return { uid: decoded.uid, email: decoded.email, claims, storedRole, viaEnv };
}

// Called once after sign-in. If this account should be a super admin (workspace
// owner, or listed in SUPER_ADMIN_EMAILS) but its token doesn't say so yet, write
// the claim. Returns true when something changed, so the client knows to refresh
// its token and pick the new permissions up immediately.
export async function ensureSuperAdminClaim(idToken) {
    let actor;
    try {
        actor = await getActor(idToken);
    } catch {
        return { changed: false };
    }
    // `shouldBe` is the effective answer (owner uid, or env-listed). `alreadyIs`
    // must come from the STORED role, not the effective one, or the write below
    // is skipped forever and the promotion never sticks.
    const shouldBe = isSuperAdmin(actor.claims, actor.uid);
    const alreadyIs = actor.storedRole === 'superadmin';
    if (!shouldBe || alreadyIs) return { changed: false };

    try {
        await getAdminAuth().setCustomUserClaims(actor.uid, buildClaims({
            uidCollection: actor.claims.uidCollection,
            role: 'superadmin',
        }));
        return { changed: true };
    } catch (error) {
        console.log('Error stamping super admin claim:', error);
        return { changed: false };
    }
}

// The caller must be able to manage users at all, and must outrank the role
// they're trying to hand out.
async function requireUserAdmin(idToken, targetRole) {
    const actor = await getActor(idToken);
    if (!canManageUsers(actor.claims, actor.uid)) {
        throw new Error('You do not have permission to manage users.');
    }
    if (targetRole !== undefined && !canManageRole(actor.claims, targetRole, actor.uid)) {
        throw new Error(`Only a Super Admin can assign the ${roleLabel(targetRole)} role.`);
    }
    return actor;
}

// Guards edits/deletes of an EXISTING member: same workspace, and the target
// must rank strictly below the actor so an Admin can't remove a Super Admin.
async function requireCanTouchTarget(actor, targetUid) {
    if (!targetUid) throw new Error('No user selected.');
    if (targetUid === actor.uid) {
        throw new Error('You cannot change your own role or delete your own account.');
    }
    let target;
    try {
        target = await getAdminAuth().getUser(targetUid);
    } catch {
        throw new Error('That user no longer exists.');
    }
    const tClaims = target.customClaims || {};
    if (tClaims.uidCollection !== actor.claims.uidCollection) {
        throw new Error('That user belongs to a different workspace.');
    }
    if (isProtectedAccount(target.uid, tClaims)) {
        throw new Error('The workspace owner account cannot be modified or deleted.');
    }
    const targetRole = isSuperAdmin(tClaims, target.uid) ? 'superadmin' : normalizeRole(tClaims.role || tClaims.title);
    if (!canManageRole(actor.claims, targetRole, actor.uid)) {
        throw new Error(`You do not have permission to modify a ${roleLabel(targetRole)}.`);
    }
    return target;
}

// Server actions can't throw across the wire cleanly, so failures come back as
// a plain object the UI can show. Callers check for `.error`.
const fail = (e) => ({ error: { message: e?.message || 'Something went wrong.' } });

// ─────────────────────────────────────────────────────────────────────────────

export async function createNewUser(obj) {
    let actor;
    try {
        actor = await requireUserAdmin(obj?.idToken, obj?.role);
    } catch (e) {
        return fail(e);
    }

    try {
        // Workspace comes from the actor's own token, so a tampered payload
        // can't plant a user in someone else's account.
        const claims = buildClaims({
            uidCollection: actor.claims.uidCollection,
            role: obj.role,
            pages: obj.pages,
        });

        const userRecord = await getAdminAuth().createUser({
            email: obj.email,
            emailVerified: true,
            password: obj.password,
            displayName: obj.displayName,
            disabled: false,
        });

        await getAdminAuth().setCustomUserClaims(userRecord.uid, claims);
        return { uid: userRecord.uid, ...claims };
    } catch (error) {
        console.log('Error creating new user:', error);
        return fail(new Error(friendlyAuthError(error)));
    }
}

// Accounts kept out of the client-facing user list (they predate this rewrite —
// support/developer logins attached to customer workspaces). They are hidden, not
// restricted: they still hold whatever claims they hold. Because the delete and
// edit actions work from the list, hiding them here is also what keeps them from
// being removed by accident.
const HIDDEN_UIDS = [
    'lmPDuojUfPYeZhpySVIDHupS9Io1',
    'BYfS1Yf5Bac6cVhlVw68SjGVsAj2',
    '1wD74Rzav1PZ40MxXStjn9WgtJm2',
];

export async function getAllUsers(idToken) {
    let actor;
    try {
        actor = await getActor(idToken);
    } catch {
        return [];
    }
    // Anyone signed in may see who's in their own workspace; only user admins
    // get to act on them (enforced per-action above).
    const arrs = await listAllUsers();
    return arrs
        .filter((x) => x?.customClaims?.uidCollection === actor.claims.uidCollection)
        .filter((x) => !HIDDEN_UIDS.includes(x.uid))
        .map((x) => {
            const c = x.customClaims || {};
            const role = isSuperAdmin(c, x.uid) ? 'superadmin' : normalizeRole(c.role || c.title);
            return {
                ...x,
                role,
                title: roleLabel(role),
                pages: resolvePages(c, x.uid),
                // A hand-picked set exists only when the claim itself carries one.
                customPages: Array.isArray(c.pages) && c.pages.length > 0,
                isOwner: x.uid === c.uidCollection,
                isSelf: x.uid === actor.uid,
                userCreated: x.metadata?.creationTime,
                lastLogedIn: x.metadata?.lastSignInTime,
            };
        });
}

const listAllUsers = async (nextPageToken) => {
    let arr = [];
    try {
        const listUsersResult = await getAdminAuth().listUsers(1000, nextPageToken);
        listUsersResult.users.forEach((userRecord) => {
            arr.push(userRecord.toJSON());
        });
        if (listUsersResult.pageToken) {
            // The original dropped every page after the first — the recursive
            // call's result was never awaited or merged, so workspaces past
            // 1000 total users silently lost members from the list.
            const rest = await listAllUsers(listUsersResult.pageToken);
            arr = arr.concat(rest);
        }
    } catch (error) {
        console.log('Error listing users:', error);
    }
    return arr;
};

export const updateUser = async (obj) => {
    let actor;
    try {
        actor = await requireUserAdmin(obj?.idToken, obj?.role);
        await requireCanTouchTarget(actor, obj?.uid);
    } catch (e) {
        return fail(e);
    }

    function formatPhoneNumber(phoneNumber) {
        if (phoneNumber.charAt(0) !== '+') {
            return '+' + phoneNumber;
        }
        return phoneNumber;
    }

    try {
        const newObj = {
            email: obj.email,
            phoneNumber: obj.phoneNumber && obj.phoneNumber !== '' ? formatPhoneNumber(obj.phoneNumber) : null,
            displayName: obj.displayName,
        };
        if (obj.password) newObj.password = obj.password;

        const claims = buildClaims({
            uidCollection: actor.claims.uidCollection,
            role: obj.role,
            pages: obj.pages,
        });

        const userRecord = await getAdminAuth().updateUser(obj.uid, newObj);
        await getAdminAuth().setCustomUserClaims(userRecord.uid, claims);
        return { uid: userRecord.uid, ...claims };
    } catch (error) {
        console.log('Error updating user:', error);
        return fail(new Error(friendlyAuthError(error)));
    }
}

export const delUser = async ({ idToken, uid }) => {
    let actor;
    try {
        actor = await requireUserAdmin(idToken);
        await requireCanTouchTarget(actor, uid);
    } catch (e) {
        return fail(e);
    }
    try {
        await getAdminAuth().deleteUser(uid);
        return { deleted: uid };
    } catch (error) {
        console.log('Error deleting user:', error);
        return fail(new Error(friendlyAuthError(error)));
    }
}

function friendlyAuthError(error) {
    const code = String(error?.code || '');
    if (code.includes('email-already-exists')) return 'That email address is already in use.';
    if (code.includes('invalid-password')) return 'Password must be at least 6 characters.';
    if (code.includes('invalid-phone-number')) return 'That phone number is not a valid international number (e.g. +33612345678).';
    if (code.includes('user-not-found')) return 'That user no longer exists.';
    return error?.message || 'Something went wrong.';
}
