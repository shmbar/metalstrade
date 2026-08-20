// createSuperAdmin.mjs — bootstrap the first Super Admin for a workspace.
//
// The Users tab in Settings can create everyone else, but it needs an existing
// Super Admin (or Admin) to be signed in first. This script is how the very first
// one gets made.
//
// ─── Credentials ─────────────────────────────────────────────────────────────
// Needs Firebase Admin credentials, from EITHER:
//   • ./serviceAccountKey.json  (download: Firebase console → Project settings →
//     Service accounts → Generate new private key). It is listed in .gitignore —
//     it grants full admin access to the project, so it must never be committed.
//   • or the FIREBASE_* env vars that actions/pass.js already uses
//     (FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL).
//
// ─── Usage ───────────────────────────────────────────────────────────────────
//   # 1. Find the workspace id you want to attach the account to:
//   node createSuperAdmin.mjs --list-workspaces
//
//   # 2. Create (or promote) the account:
//   node createSuperAdmin.mjs \
//     --email sharon@example.com \
//     --name "sharon-super-admin" \
//     --workspace DQ9gNTpvXqh6K9BqMTPTgCfxD2Z2
//
// The password is read from the SUPER_ADMIN_PASSWORD environment variable so it
// never lands in shell history. --password works too, if you don't mind that.
//
// Re-running with the same email is safe: it updates the existing account rather
// than failing, so this doubles as "promote this person to Super Admin".

import { readFile } from 'node:fs/promises';
import admin from 'firebase-admin';
import { buildClaims, PAGE_KEYS } from './utils/permissions.js';

// ── args ─────────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const flag = (name) => {
    const i = argv.indexOf(`--${name}`);
    return i === -1 ? undefined : argv[i + 1];
};
const has = (name) => argv.includes(`--${name}`);

const die = (msg) => {
    console.error(`\n✖ ${msg}\n`);
    process.exit(1);
};

// ── credentials ──────────────────────────────────────────────────────────────
async function initAdmin() {
    if (admin.apps.length) return admin.app();

    // Prefer the key file, since that's what a local bootstrap usually has.
    try {
        const raw = await readFile(new URL('./serviceAccountKey.json', import.meta.url), 'utf8');
        return admin.initializeApp({ credential: admin.credential.cert(JSON.parse(raw)) });
    } catch { /* fall through to env vars */ }

    const { FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL } = process.env;
    if (!FIREBASE_PROJECT_ID || !FIREBASE_PRIVATE_KEY || !FIREBASE_CLIENT_EMAIL) {
        die(
            'No Firebase Admin credentials found.\n' +
            '  Either place serviceAccountKey.json in the project root\n' +
            '  (Firebase console → Project settings → Service accounts → Generate new private key),\n' +
            '  or set FIREBASE_PROJECT_ID / FIREBASE_PRIVATE_KEY / FIREBASE_CLIENT_EMAIL.'
        );
    }
    return admin.initializeApp({
        credential: admin.credential.cert({
            projectId: FIREBASE_PROJECT_ID,
            privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            clientEmail: FIREBASE_CLIENT_EMAIL,
        }),
    });
}

// ── list every workspace in the project, so you can pick the right one ───────
async function listWorkspaces(auth) {
    const groups = new Map();
    let token;
    do {
        const page = await auth.listUsers(1000, token);
        for (const u of page.users) {
            const ws = u.customClaims?.uidCollection;
            if (!ws) continue;
            if (!groups.has(ws)) groups.set(ws, []);
            groups.get(ws).push(u);
        }
        token = page.pageToken;
    } while (token);

    if (!groups.size) return console.log('\nNo accounts carry a uidCollection claim yet.\n');

    console.log(`\nWorkspaces in this Firebase project (${groups.size}):\n`);
    for (const [ws, users] of groups) {
        // The account whose own uid IS the workspace id is the owner — and is
        // already an implicit Super Admin, so you may not need this script at all.
        const owner = users.find((u) => u.uid === ws);
        console.log(`  ${ws}   (${users.length} member${users.length === 1 ? '' : 's'})`);
        if (owner) console.log(`    owner account present: ${owner.email} — already an implicit Super Admin`);
        for (const u of users.slice(0, 6)) {
            const role = u.customClaims?.role || u.customClaims?.title || '—';
            console.log(`    · ${(u.email || u.uid).padEnd(34)} ${role}`);
        }
        if (users.length > 6) console.log(`    · … and ${users.length - 6} more`);
        console.log('');
    }
}

// ── main ─────────────────────────────────────────────────────────────────────
const app = await initAdmin();
const auth = admin.auth(app);

if (has('list-workspaces')) {
    await listWorkspaces(auth);
    process.exit(0);
}

const email = flag('email');
const name = flag('name') || 'Super Admin';
const workspace = flag('workspace');
const password = process.env.SUPER_ADMIN_PASSWORD || flag('password');

if (!email) die('Missing --email. Firebase email/password sign-in needs a real address.');
if (!workspace) die('Missing --workspace. Run with --list-workspaces to see the options.');
// A password is required only when the account has to be CREATED. Promoting an
// existing member must not silently reset the password they already use.
if (password && password.length < 6) die('Firebase requires a password of at least 6 characters.');

// Attaching a Super Admin to the wrong workspace hands someone full access to
// another customer's data, so confirm the target actually exists first.
const probe = await auth.listUsers(1000);
const known = new Set(probe.users.map((u) => u.customClaims?.uidCollection).filter(Boolean));
if (known.size && !known.has(workspace)) {
    die(
        `No existing account belongs to workspace "${workspace}".\n` +
        `  Known workspaces: ${[...known].join(', ')}\n` +
        '  Run with --list-workspaces to check, or re-run with the correct id.'
    );
}

const claims = buildClaims({ uidCollection: workspace, role: 'superadmin' });

// Firebase Auth is shared between your laptop and the deployed site, so this
// promotion takes effect everywhere the moment it's written — including on a
// deployment still running the OLD code.
//
// That's a trap. Old code reads only the `title` claim and compares it to the
// literal 'Admin'. buildClaims sets title to 'Super Admin' for this role, so a
// promotion made before the new code ships would fail every one of those checks
// and strip the account of Margins, Formulas and the Users tab on the live site.
//
// Writing the legacy-friendly title alongside the new `role` keeps BOTH readings
// correct: old code sees 'Admin' and grants admin, new code sees role
// 'superadmin' and grants everything. Pass --strict-title to skip this once the
// new code is deployed everywhere.
if (!has('strict-title')) claims.title = 'Admin';

let record = null;
try {
    record = await auth.getUserByEmail(email);
} catch { /* no such account yet — created below */ }

if (record) {
    // Promote in place. Only touch the password/name if they were explicitly
    // supplied, so "make this person a Super Admin" cannot lock them out of the
    // credentials they already sign in with.
    const changes = {};
    if (password) changes.password = password;
    if (flag('name')) changes.displayName = name;
    if (Object.keys(changes).length) await auth.updateUser(record.uid, changes);
    console.log(`\n✓ Promoting existing account ${record.uid}`);
    if (!password) console.log('  (password left unchanged)');
} else {
    if (!password) die('That account does not exist yet, so a password is required to create it.\n  Set SUPER_ADMIN_PASSWORD=… or pass --password.');
    record = await auth.createUser({ email, password, displayName: name, emailVerified: true, disabled: false });
    console.log(`\n✓ Created account ${record.uid}`);
}

await auth.setCustomUserClaims(record.uid, claims);

// Read the account back rather than echoing the inputs — printing `name` here
// claimed a displayName had been set even when --name was never passed and the
// existing one was deliberately left alone.
const saved = await auth.getUser(record.uid);
console.log(`  email      ${saved.email}`);
console.log(`  name       ${saved.displayName || '(none set)'}`);
console.log(`  workspace  ${workspace}`);
console.log(`  role       superadmin  (all ${PAGE_KEYS.length} pages)`);
console.log('\nSign in at /signin with that email and password.');
console.log('If the account was already signed in somewhere, it picks the new role up on next token refresh.\n');

process.exit(0);
