import { create } from 'zustand';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut as fbSignOut,
  User,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';

// Idle-expiry parity with the web app's AuthContext. A phone is inherently a
// "Remember me" device (users expect to stay signed in), so mobile uses the web's
// remembered tier: the session expires after 30 idle DAYS — a forgotten login on
// an old device can't live forever — never the 2h no-remember cap.
const IDLE_MAX_MS = 30 * 24 * 60 * 60 * 1000;
const LAST_SEEN_KEY = 'ims:lastSeen';

const bumpLastSeen = () => {
  AsyncStorage.setItem(LAST_SEEN_KEY, String(Date.now())).catch(() => {});
};

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
  currentUser: CurrentUser;
  error: string | null;
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

export const useAuth = create<AuthState>((set) => ({
  user: null,
  initializing: true,
  uidCollection: null,
  userTitle: null,
  gisAccount: false,
  currentUser: buildCurrentUser(null),
  error: null,

  signIn: async (email, password) => {
    set({ error: null });
    try {
      await signInWithEmailAndPassword(auth, completeUserEmail(email), password);
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
    await AsyncStorage.removeItem(LAST_SEEN_KEY).catch(() => {});
    await fbSignOut(auth).catch(() => {});
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
    const appStateSub = AppState.addEventListener('change', (next) => {
      if (auth.currentUser && (next === 'active' || next === 'background')) bumpLastSeen();
    });
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      // Enforce the idle cap on restore: a session untouched for 30+ days must
      // re-authenticate instead of silently auto-resuming (web parity).
      if (user) {
        const raw = await AsyncStorage.getItem(LAST_SEEN_KEY).catch(() => null);
        const last = parseInt(raw || '0', 10);
        if (last && Date.now() - last > IDLE_MAX_MS) {
          await AsyncStorage.removeItem(LAST_SEEN_KEY).catch(() => {});
          await fbSignOut(auth).catch(() => {});
          return; // onAuthStateChanged fires again with null and resets state
        }
        bumpLastSeen();
      }
      if (!user) {
        set({
          user: null,
          uidCollection: null,
          userTitle: null,
          gisAccount: false,
          currentUser: buildCurrentUser(null),
          initializing: false,
        });
        return;
      }
      try {
        const token = await user.getIdTokenResult();
        const uidCollection = (token.claims.uidCollection as string) || null;
        const userTitle = (token.claims.title as string) || null;
        set({
          user,
          uidCollection,
          userTitle,
          gisAccount: uidCollection === GIS_UID_COLLECTION,
          currentUser: buildCurrentUser(user),
          initializing: false,
        });
      } catch {
        set({
          user,
          uidCollection: null,
          userTitle: null,
          gisAccount: false,
          currentUser: buildCurrentUser(user),
          initializing: false,
        });
      }
    });
    return () => {
      appStateSub.remove();
      unsubscribe();
    };
  },
}));
