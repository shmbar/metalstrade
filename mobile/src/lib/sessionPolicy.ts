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
