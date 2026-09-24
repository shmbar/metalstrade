import { describe, it, expect } from 'vitest';
import {
  IDLE_MAX_MS, parseLastSeen, isIdleExpired, decideOnResume,
} from '../mobile/src/lib/sessionPolicy';

// The client (2026-09-16): "even when not logged in 48h, it remembers the log in —
// this is a security and privacy importance to be fixed." These pin the phone's rule.

const H = 60 * 60 * 1000;
const NOW = Date.UTC(2026, 8, 17, 12, 0, 0);

describe('mobile session policy — a day of inactivity ends the session', () => {
  it('the window is 24 hours, the web "Keep me signed in" window, not the old 30 days', () => {
    expect(IDLE_MAX_MS).toBe(24 * H);
  });

  it('the client\'s case: an app untouched for 48 hours does not resume', () => {
    expect(decideOnResume(NOW - 48 * H, NOW)).toBe('expire');
  });

  it('within the day it resumes, and the boundary itself still resumes', () => {
    expect(decideOnResume(NOW - 23 * H, NOW)).toBe('resume');
    expect(decideOnResume(NOW - 24 * H, NOW)).toBe('resume');
    expect(decideOnResume(NOW - 24 * H - 1, NOW)).toBe('expire');
  });

  it('no stamp is not expiry — an install from before the stamp must not be logged out on update', () => {
    expect(isIdleExpired(0, NOW)).toBe(false);
    expect(parseLastSeen(null)).toBe(0);
    expect(parseLastSeen('')).toBe(0);
    expect(parseLastSeen('garbage')).toBe(0);
    expect(parseLastSeen(String(NOW))).toBe(NOW);
  });

  it('checking before stamping is what makes it work: stamp-then-check can never expire', () => {
    const lastUse = NOW - 48 * H;
    // The old order — stamp "used now" on resume, then look — reads a fresh stamp.
    const stampedFirst = NOW;
    expect(decideOnResume(stampedFirst, NOW)).toBe('resume');
    // The new order reads the stamp left when the app went to the background.
    expect(decideOnResume(lastUse, NOW)).toBe('expire');
  });
});

import {
  decideSession,
  isRevokedAuthError,
  LOCK_AFTER_MS,
  BIOMETRIC_MAX_MS,
} from '../mobile/src/lib/sessionPolicy';

describe('Face ID lock instead of sign-out (client, 2026-09-24)', () => {
  const now = Date.UTC(2026, 8, 24, 12);
  const H = 60 * 60 * 1000;
  const lock = { biometricLock: true };
  const noLock = { biometricLock: false };

  it('with Face ID, two days away LOCKS instead of signing out — the session and data are kept', () => {
    expect(decideSession(now - 48 * H, now, lock)).toBe('lock');
  });

  it('without Face ID, the 16 Sep rule still stands: two days away signs out', () => {
    expect(decideSession(now - 48 * H, now, noLock)).toBe('expire');
  });

  it('a quick app switch never locks', () => {
    expect(decideSession(now - 10_000, now, lock)).toBe('resume');
    expect(decideSession(now - LOCK_AFTER_MS, now, lock)).toBe('resume');
    expect(decideSession(now - LOCK_AFTER_MS - 1, now, lock)).toBe('lock');
  });

  it('even with Face ID a password is required after 30 days away', () => {
    expect(decideSession(now - BIOMETRIC_MAX_MS, now, lock)).toBe('lock');
    expect(decideSession(now - BIOMETRIC_MAX_MS - 1, now, lock)).toBe('expire');
  });

  it('a cold start with no stamp asks for Face ID when the lock is on, and just opens when it is off', () => {
    expect(decideSession(0, now, lock)).toBe('lock');
    expect(decideSession(0, now, noLock)).toBe('resume');
  });

  it('only a definite account error signs out — never a network failure', () => {
    expect(isRevokedAuthError('auth/user-disabled')).toBe(true);
    expect(isRevokedAuthError('auth/user-token-expired')).toBe(true);
    expect(isRevokedAuthError('auth/network-request-failed')).toBe(false);
    expect(isRevokedAuthError(undefined)).toBe(false);
  });
});
