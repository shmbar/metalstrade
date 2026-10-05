import { useEffect, useState } from 'react';
import { queryClient } from '@/query/client';
import { useSettings } from '@/store/settings';
import { createLaunchGate } from './launchGate';

/**
 * The app's one launch gate (launchGate.ts). app/_layout marks the device copy restored;
 * the signed-in layout arms it for each session; the background warm-ups (stock ledger,
 * live sync, the notification badge) wait for it to settle.
 */
export const launch = createLaunchGate({
  later: (fn, ms) => {
    const timer = setTimeout(fn, ms);
    return () => clearTimeout(timer);
  },
  // The screen is still loading while the name lists are not in (every screen waits for
  // them) or any query is fetching.
  isBusy: () => queryClient.isFetching() > 0 || !useSettings.getState().loaded,
  onActivity: (fn) => {
    const offQueries = queryClient.getQueryCache().subscribe(fn);
    const offSettings = useSettings.subscribe(fn);
    return () => {
      offQueries();
      offSettings();
    };
  },
});

// The cache provider reports the restore (app/_layout.tsx onSuccess / onError); should it
// ever report neither, the ledger must still load, so the restore counts as done by then.
export const RESTORE_CAP_MS = 15_000;
const restoreCap: any = setTimeout(() => launch.markRestored(), RESTORE_CAP_MS);
restoreCap?.unref?.(); // in Node (tests), a pending cap must not keep the process alive

/** A session begins whenever the signed-in company changes. Call BEFORE the warm-up hooks. */
export function useLaunchSession(uidCollection: string | null) {
  useEffect(() => {
    if (uidCollection) launch.arm();
  }, [uidCollection]);
}

/** True once the session's first screen has settled — for a query that must not compete with it. */
export function useLaunchSettled(): boolean {
  const [settled, setSettled] = useState(() => launch.isSettled());
  useEffect(() => {
    if (settled) return;
    let live = true;
    launch.whenSettled().then(() => {
      if (live) setSettled(true);
    });
    return () => {
      live = false;
    };
  }, [settled]);
  return settled;
}
