import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/store/auth';

// ONE live copy of the raw (non year-bucketed) stock ledger.
//
// Six screens need the same full collection — Inventory, Shared Stock, Storage Costs,
// Aging, Stock Audit and Cashflow's unsold-stock pillar. Sharing one key means the first
// screen pays for it and the rest are instant; the persisted cache holds a single copy.
//
// It is fed by a Firestore listener (stockLedger.ts) rather than repeated reads: the
// collection is 5.2 MB in production, so re-downloading it after every write — which is
// what the old invalidate-on-change did — froze the app for seconds at a time. The
// listener delivers only what changed, so the data is fresher AND cheaper. staleTime is
// therefore Infinity: nothing but an explicit pull-to-refresh needs to re-read it.
export const STOCK_LOTS_KEY = 'all-stock-lots';

export function useAllStockLots() {
  const uidCollection = useAuth((s) => s.uidCollection);
  const qc = useQueryClient();

  useEffect(() => {
    if (!uidCollection) return;
    let release: (() => void) | undefined;
    // Imported lazily so the module graph stays free of a cycle (the ledger needs the key).
    import('./stockLedger').then(({ holdLots }) => {
      release = holdLots(uidCollection, qc);
    });
    return () => release?.();
  }, [uidCollection, qc]);

  return useQuery({
    enabled: !!uidCollection,
    queryKey: [STOCK_LOTS_KEY, uidCollection],
    queryFn: async () => {
      const { lotsReady } = await import('./stockLedger');
      return lotsReady(uidCollection as string, qc);
    },
    staleTime: Infinity,
  });
}
