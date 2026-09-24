// When a signed-in session on the phone has sat unused too long to resume.
//
// Kept free of React Native so the rule can be tested on its own; store/auth.ts
// does the reading, the stamping and the signing out.
//
// A phone is treated like the web's "Keep me signed in" login: it survives the app
// being closed, but for a day of inactivity, not thirty. The client found a web login
// still there after two untouched days (2026-09-16) and called it a security issue;
// the phone had the same thirty-day window, and a worse hole — see decideOnResume.

export const IDLE_MAX_MS = 24 * 60 * 60 * 1000;

/** How the sign-in screen explains an expiry. */
export const IDLE_SIGNED_OUT_MESSAGE = 'You were signed out after 24 hours of inactivity. Sign in to continue.';

/** Parse the stored stamp; 0 means "never stamped" (a fresh install or a new login). */
export const parseLastSeen = (raw: string | null | undefined): number => {
  const n = parseInt(raw || '0', 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

/**
 * Has the session outlived its window? A missing stamp is not expiry — there is
 * nothing to measure from, and signing out every install that predates the stamp
 * would log everyone out on update for no reason.
 */
export const isIdleExpired = (lastSeen: number, now: number, maxMs: number = IDLE_MAX_MS): boolean =>
  lastSeen > 0 && now - lastSeen > maxMs;

/**
 * The app has come back to the foreground (or cold-started with a saved session).
 *
 * The order is the whole fix: CHECK, then stamp. The app used to stamp "used now"
 * the instant it became active and never checked at all while it stayed in memory —
 * so an app left in the background for two days came back signed in, and the stamp
 * it had just written made the next cold-start check pass as well.
 */
export const decideOnResume = (lastSeen: number, now: number, maxMs: number = IDLE_MAX_MS): 'expire' | 'resume' =>
  isIdleExpired(lastSeen, now, maxMs) ? 'expire' : 'resume';

/*
 * ── Face ID lock instead of sign-out ─────────────────────────────────────────────────
 *
 * Client, 2026-09-24: the app should not log people out when Face ID is available. The
 * 16 Sep request (a 48-hour-idle session must not simply resume) still stands — what
 * changes is HOW it is enforced. With a biometric lock the session is kept (and the
 * offline copy of the data with it) but the app does not open without Face ID; the full
 * sign-in only comes back after a long hard limit, or if the account itself was
 * disabled or its session revoked. Without a biometric lock the 24-hour sign-out above
 * still applies, because then nothing else stands between a picked-up phone and the data.
 */

/** Away longer than this (backgrounded or closed) → Face ID before anything shows. */
export const LOCK_AFTER_MS = 45 * 1000;

/** Even with Face ID, a session untouched this long must sign in again with a password. */
export const BIOMETRIC_MAX_MS = 30 * 24 * 60 * 60 * 1000;

export const BIOMETRIC_EXPIRED_MESSAGE = 'For your security, sign in again after 30 days away.';
export const REVOKED_MESSAGE = 'Your session has ended. Please sign in again.';

export type ResumeDecision = 'resume' | 'lock' | 'expire';

/**
 * The whole rule, in one place.
 *
 * @param biometricLock  Face ID (or fingerprint) is enrolled on the device AND the user has
 *                       the lock turned on.
 */
export const decideSession = (
  lastSeen: number,
  now: number,
  { biometricLock }: { biometricLock: boolean }
): ResumeDecision => {
  // No stamp: a fresh sign-in or an install from before the stamp existed. Nothing to
  // measure; with the lock on, still ask for Face ID on a cold start.
  if (lastSeen <= 0) return biometricLock ? 'lock' : 'resume';
  const away = now - lastSeen;
  if (biometricLock) {
    if (away > BIOMETRIC_MAX_MS) return 'expire';
    return away > LOCK_AFTER_MS ? 'lock' : 'resume';
  }
  return away > IDLE_MAX_MS ? 'expire' : 'resume';
};

/**
 * Did a forced token refresh fail because the ACCOUNT is no longer valid (disabled,
 * deleted, session revoked) — as opposed to the network being down? Only the former may
 * sign anyone out; an offline phone must stay usable.
 */
export const isRevokedAuthError = (code: string | undefined | null): boolean =>
  !!code &&
  [
    'auth/user-disabled',
    'auth/user-not-found',
    'auth/user-token-expired',
    'auth/invalid-user-token',
    'auth/requires-recent-login',
  ].includes(code);
