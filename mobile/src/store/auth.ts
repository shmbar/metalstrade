import { create } from 'zustand';
import { AppState } from 'react-native';
import { touchPresence, endPresence, PRESENCE_HEARTBEAT_MS } from '@/data/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut as fbSignOut,
  User,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { queryClient, asyncStoragePersister } from '@/query/client';
import { clearSettingsCache, useSettings } from '@/store/settings';
import { stopLotsLedger } from '@/features/stocks/stockLedger';
// @ts-ignore — plain JS module shared verbatim with the web
import { isSuperAdmin, normalizeRole, resolvePages } from '@shared/permissions';
import { canOpenRoute, landingHrefFor } from '@/lib/access';
import { decideOnResume, parseLastSeen, IDLE_SIGNED_OUT_MESSAGE } from '@/lib/sessionPolicy';

// Idle expiry — the rule and its reasons live in lib/sessionPolicy.ts (24 hours,
// the web's "Keep me signed in" window). The stamp below is "when the app was last
// in use": written when the app leaves the foreground and after a resume passes
// the check — never before it.
const LAST_SEEN_KEY = 'ims:lastSeen';

const bumpLastSeen = () => {
  AsyncStorage.setItem(LAST_SEEN_KEY, String(Date.now())).catch(() => {});
};
const readLastSeen = async () => parseLastSeen(await AsyncStorage.getItem(LAST_SEEN_KEY).catch(() => null));

// The GIS account's uidCollection — same sentinel the web app uses to flip
// "Sharon Admin" ↔ "Gis Admin" and a handful of GIS-specific behaviors.
const GIS_UID_COLLECTION = 'aB3dE7FgHi9JkLmNoPqRsTuVwGIS';

// Username → email, ported VERBATIM from the web app (actions/validations.js
// completeUserEmail) so the same login works on both. Users type a bare username
// (e.g. "sharonims") and we resolve it to the Firebase email Firebase expects.
const completeUserEmail = (userName: string): string => {
  const u = (userName || '').trim();
  return u.includes('@')
    ? u
    : u === 'isims'
      ? 'isims@is.is'
      : u === 'isgis'
        ? 'isgis@is.is'
        : u.slice(-3) === 'ims'
          ? u + '@ims-metals.com'
          : u + '@gismetals.com';
};

export interface CurrentUser {
  uid: string;
  name: string;
  email: string;
}

interface AuthState {
  user: User | null;
  initializing: boolean;
  uidCollection: string | null;
  userTitle: string | null; // 'Admin' | 'accounting' | other
  gisAccount: boolean;
  // Web parity (utils/permissions.js): superAdmin is the workspace owner or the
  // `role` claim; isAdmin also covers a plain 'admin' role. Gates the same
  // admin-only figures web hides from regular staff (Cashflow's Financing /
  // Total Left-Right-Balance strip, the Airwallex-style manual incoming rows).
  isAdmin: boolean;
  superAdmin: boolean;
  /** the custom claims the permissions resolve from (null when signed out) */
  claims: Record<string, any> | null;
  /** web page keys this user may open — utils/permissions.js resolvePages */
  allowedPages: string[];
  /** where web's landingPage() sends this user, as a mobile route */
  landingHref: string;
  /** may this user open the mobile route ('contracts', 'cashflow', 'index', …)? */
  canRoute: (route: string) => boolean;
  currentUser: CurrentUser;
  error: string | null;
  /** why the last session ended without the user signing out (shown on sign-in) */
  signedOutReason: string | null;
  signIn: (email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ ok: boolean; message: string }>;
  init: () => () => void;
}

// Derive a readable name from an email local-part ("anna.smith@x" → "Anna Smith"),
// matching the web app's currentUser fallback used for activity attribution.
const nameFromEmail = (email?: string | null): string => {
  if (!email) return '';
  return String(email)
    .split('@')[0]
    .split(/[._-]+/)
    .filter(Boolean)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ');
};

const buildCurrentUser = (user: User | null): CurrentUser => ({
  uid: user?.uid || '',
  name: user?.displayName?.trim() || nameFromEmail(user?.email) || 'Unknown',
  email: user?.email || '',
});

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  initializing: true,
  uidCollection: null,
  userTitle: null,
  gisAccount: false,
  isAdmin: false,
  superAdmin: false,
  claims: null,
  allowedPages: [],
  landingHref: '/(app)',
  currentUser: buildCurrentUser(null),
  error: null,
  signedOutReason: null,

  signIn: async (email, password) => {
    set({ error: null });
    try {
      // Stamp BEFORE the credential lands: onAuthStateChanged runs the idle check,
      // and must not judge a brand-new login by the previous session's stamp.
      bumpLastSeen();
      await signInWithEmailAndPassword(auth, completeUserEmail(email), password);
      set({ signedOutReason: null });
      return true;
    } catch (e: any) {
      const code = e?.code || '';
      const msg =
        code === 'auth/invalid-email'
          ? 'Enter your username or email.'
          : code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found'
            ? 'Incorrect email or password.'
            : code === 'auth/too-many-requests'
              ? 'Too many attempts. Try again later.'
              : e?.message || 'Sign-in failed.';
      set({ error: msg });
      return false;
    }
  },

  signOut: async () => {
    // Tell the workspace we are leaving BEFORE dropping the session — a stale
    // heartbeat would otherwise keep us "online" on everyone else's Activity
    // panel for the next five minutes (web useAuthContext does the same).
    const { uidCollection: uc, currentUser: cu } = get();
    if (uc && cu?.uid) await endPresence(uc, cu.uid).catch(() => {});
    await AsyncStorage.removeItem(LAST_SEEN_KEY).catch(() => {});
    stopLotsLedger();
    await fbSignOut(auth).catch(() => {});
  },

  canRoute: (route: string) => {
    const { claims, user } = get();
    return canOpenRoute(claims, user?.uid || '', route);
  },

  // Send a Firebase password-reset email — parity with the web "Forgot password".
  resetPassword: async (email) => {
    if (!email.trim()) return { ok: false, message: 'Enter your username or email first.' };
    const e = completeUserEmail(email);
    try {
      await sendPasswordResetEmail(auth, e);
      return { ok: true, message: `Reset link sent to ${e}. Check your inbox.` };
    } catch (err: any) {
      const code = err?.code || '';
      const message =
        code === 'auth/invalid-email'
          ? 'Enter a valid email address.'
          : code === 'auth/user-not-found'
            ? 'No account found for that email.'
            : err?.message || 'Could not send reset email.';
      return { ok: false, message };
    }
  },

  // Subscribes to Firebase auth; resolves the per-account namespace + role from
  // the user's custom claims (identical model to the web app's AuthContext).
  init: () => {
    // Keep the "last activity" stamp fresh while the app is used (foreground
    // transitions are the natural mobile heartbeat), mirroring the web's bump.
    /* Mirror the heartbeat into Firestore so OTHER people can see who is here.
       The AsyncStorage stamp above is readable only by this device, and mobile
       never wrote the shared one at all — so anyone using the app was invisible
       on web's "Who's online" panel and their "last here" never moved. Slower
       than the local stamp (two minutes, web's cadence) because this one costs a
       write, and non-fatal: a missed beat costs a green dot, never a screen. */
    const beat = () => {
      const { uidCollection: uc, currentUser: cu } = get();
      if (auth.currentUser && uc && cu?.uid) touchPresence(uc, cu).catch(() => {});
    };
    const beatId = setInterval(beat, PRESENCE_HEARTBEAT_MS);
    // Expire this session if it has sat unused past the window; true if it did.
    // Signing out lands in onAuthStateChanged(null), which clears the device copy
    // of the company's data along with the session.
    const expireIfIdle = async () => {
      if (decideOnResume(await readLastSeen(), Date.now()) === 'resume') return false;
      set({ signedOutReason: IDLE_SIGNED_OUT_MESSAGE });
      await get().signOut();
      return true;
    };
    const appStateSub = AppState.addEventListener('change', async (next) => {
      if (!auth.currentUser) return;
      if (next === 'background') {
        // Leaving the app is the last moment it was in use. Not 'inactive': iOS passes
        // through it on the way BACK from the background too, and a stamp written
        // there would let the check below pass every time.
        bumpLastSeen();
        return;
      }
      if (next === 'active') {
        // Check FIRST. Stamping here before checking is what let an app left in the
        // background for two days come straight back signed in.
        if (await expireIfIdle()) return;
        bumpLastSeen();
        // Coming back to the app is the moment the dot is most likely stale.
        beat();
      }
    });
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      // The same check on a cold start with a saved session.
      if (user) {
        if (await expireIfIdle()) return; // fires again with null and resets state
        bumpLastSeen();
      }
      if (!user) {
        // The query cache is PERSISTED (≈10 MB of contracts, stocks and invoices in
        // AsyncStorage). Signing out has to take it with it: otherwise a signed-out
        // phone still holds the company's ledger on disk, and the next person to sign
        // in on this device can be shown the previous account's figures for the frame
        // before their own data arrives. Covers idle-expiry too, which lands here.
        queryClient.clear();
        Promise.resolve(asyncStoragePersister.removeClient()).catch(() => {});
        // The device copy of supplier/client/warehouse lists goes with it.
        useSettings.getState().reset();
        clearSettingsCache();
        set({
          user: null,
          uidCollection: null,
          userTitle: null,
          gisAccount: false,
          isAdmin: false,
          superAdmin: false,
          claims: null,
          allowedPages: [],
          landingHref: '/(app)',
          currentUser: buildCurrentUser(null),
          initializing: false,
        });
        return;
      }
      try {
        const token = await user.getIdTokenResult();
        const claims = token.claims as Record<string, any>;
        const uidCollection = (claims.uidCollection as string) || null;
        const userTitle = (claims.title as string) || null;
        const superAdmin = isSuperAdmin(claims, user.uid);
        const cu = buildCurrentUser(user);
        set({
          user,
          uidCollection,
          userTitle,
          gisAccount: uidCollection === GIS_UID_COLLECTION,
          superAdmin,
          isAdmin: superAdmin || normalizeRole(claims.role || claims.title) === 'admin',
          // Per-page permissions (web b783925b): an explicit `pages` claim picked in
          // Settings → Users, else the role's default set. Mobile only knew "admin"
          // and "accounting-only", so a user an admin had limited to three pages on
          // the web could open every screen on the phone.
          claims,
          allowedPages: resolvePages(claims, user.uid),
          landingHref: landingHrefFor(claims, user.uid),
          currentUser: cu,
          initializing: false,
        });
        /* Stamp presence as soon as the account resolves, with loginAtMs, so the
           workspace sees the arrival immediately rather than up to two minutes
           later at the first heartbeat (web useAuthContext:266). */
        if (uidCollection && cu?.uid) {
          touchPresence(uidCollection, cu, { loginAtMs: Date.now() }).catch(() => {});
        }
      } catch {
        set({
          user,
          uidCollection: null,
          userTitle: null,
          gisAccount: false,
          isAdmin: false,
          superAdmin: false,
          claims: null,
          allowedPages: [],
          landingHref: '/(app)',
          currentUser: buildCurrentUser(user),
          initializing: false,
        });
      }
    });
    return () => {
      clearInterval(beatId);
      appStateSub.remove();
      unsubscribe();
    };
  },
}));
