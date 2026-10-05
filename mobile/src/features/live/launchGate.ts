/*
 * What the app downloads in the BACKGROUND waits until the screen the user is looking at
 * has its data.
 *
 * Measured on production data, 2026-10-05 (mobile/__tests__/perf/_load-path.smoke.ts): at
 * launch the 5.3 MB stock ledger, six live-sync listeners (each one's first answer is a full
 * read of its collection) and the notification feed all started in the same moment as the
 * Dashboard's own reads — 9.7 MB in one burst. On the shared Firestore stream the Dashboard
 * waited for all of it (12.3 s); on a phone the bandwidth and the JS thread are shared even
 * where the stream is not. None of that background work is on screen, so it now starts once
 * the session's first screen has SETTLED: the device copy has been restored, the name lists
 * are in, and no query has been fetching for LAUNCH_QUIET_MS — or LAUNCH_CAP_MS after the
 * session began at the latest, so a screen that never settles cannot hold it back for good.
 *
 * A screen that NEEDS something does not wait: opening Stocks or Cashflow starts the ledger
 * at once (features/stocks/useAllStockLots.ts). Only the warm-ups wait.
 *
 * Pure: the clock and the query client are injected (__tests__/launch-gate.test.ts).
 */

/** No query fetching for this long = the screen has what it asked for. */
export const LAUNCH_QUIET_MS = 500;
/** Background work starts this long after the session began at the latest. */
export const LAUNCH_CAP_MS = 10_000;

export interface LaunchGate {
  /** The device copy has been read back into the query cache (or there was none). */
  markRestored(): void;
  /** Resolves once the device copy is in the cache — before that, an empty cache means nothing. */
  whenRestored(): Promise<void>;
  /** A session begins (sign-in, company switch): background work waits for its first screen. */
  arm(): void;
  /** Resolves once the current session's first screen has settled (see above). */
  whenSettled(): Promise<void>;
  isSettled(): boolean;
}

export function createLaunchGate(deps: {
  /** Run `fn` after `ms`; returns a cancel. */
  later: (fn: () => void, ms: number) => () => void;
  /** Is anything the screen asked for still loading? */
  isBusy: () => boolean;
  /** Call `fn` whenever that might have changed; returns an unsubscribe. */
  onActivity: (fn: () => void) => () => void;
}): LaunchGate {
  let restored = false;
  let armed = false;
  let settled = false;
  const restoredWaiters: (() => void)[] = [];
  const settledWaiters: (() => void)[] = [];
  let cancelQuiet: (() => void) | null = null;
  let cancelCap: (() => void) | null = null;
  let unsubscribe: (() => void) | null = null;

  const stopWatching = () => {
    cancelQuiet?.();
    cancelCap?.();
    unsubscribe?.();
    cancelQuiet = cancelCap = unsubscribe = null;
  };

  const settle = () => {
    if (settled || !armed) return;
    settled = true;
    stopWatching();
    settledWaiters.splice(0).forEach((fn) => fn());
  };

  // Every change of activity restarts the quiet period; a busy moment cancels it.
  const check = () => {
    if (settled) return;
    cancelQuiet?.();
    cancelQuiet = null;
    if (deps.isBusy()) return;
    cancelQuiet = deps.later(() => {
      if (!deps.isBusy()) settle();
    }, LAUNCH_QUIET_MS);
  };

  const watch = () => {
    if (!restored || !armed || settled || unsubscribe) return;
    cancelCap = deps.later(settle, LAUNCH_CAP_MS);
    unsubscribe = deps.onActivity(check);
    check();
  };

  return {
    markRestored() {
      if (restored) return;
      restored = true;
      restoredWaiters.splice(0).forEach((fn) => fn());
      watch();
    },
    whenRestored: () => (restored ? Promise.resolve() : new Promise<void>((resolve) => restoredWaiters.push(resolve))),
    arm() {
      stopWatching();
      armed = true;
      settled = false;
      watch();
    },
    whenSettled: () => (settled ? Promise.resolve() : new Promise<void>((resolve) => settledWaiters.push(resolve))),
    isSettled: () => settled,
  };
}
