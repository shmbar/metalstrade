import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { launch } from '@/features/live/launch';
import { holdLots } from './stockLedger';

/*
 * Start the stock ledger in the background once the user is signed in, not when they first
 * open a stock screen. It is the one genuinely big download in the app (5.3 MB), so having
 * it before Cashflow or Stocks is opened turns a long wait there into an instant screen.
 * After that it stays live and only deltas arrive, so this costs nothing to keep open.
 *
 * "In the background" now means AFTER the first screen has its data (features/live/
 * launchGate.ts): started at the same moment as the Dashboard's reads, it took the
 * bandwidth and the JS thread the Dashboard needed. Opening a stock screen sooner than that
 * still starts it at once (useAllStockLots).
 */
export function useWarmLedger(uidCollection: string | null) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!uidCollection) return;
    let live = true;
    let release: (() => void) | undefined;
    launch.whenSettled().then(() => {
      if (live) release = holdLots(uidCollection, qc);
    });
    return () => {
      live = false;
      release?.();
    };
  }, [uidCollection, qc]);
}
