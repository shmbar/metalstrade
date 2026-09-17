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
