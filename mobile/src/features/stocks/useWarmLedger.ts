import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { holdLots } from './stockLedger';

/*
 * Start the stock ledger as soon as the user is signed in, not when they first open a
 * stock screen. It is the one genuinely big download in the app (5.2 MB), so paying for
 * it in the background while the dashboard is being read turns a 10-30 second wait on
 * Cashflow or Stocks into an instant screen. After that it stays live and only deltas
 * arrive, so this costs nothing to keep open.
 */
export function useWarmLedger(uidCollection: string | null) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!uidCollection) return;
    return holdLots(uidCollection, qc);
  }, [uidCollection, qc]);
}
