import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/store/auth';
import { loadAllStockData } from '@/data/firestore';

// ONE cached copy of the raw (non year-bucketed) stock ledger.
//
// Six different screens need the same full collection — Inventory, Shared Stock,
// Storage Costs, Aging, Stock Audit and Cashflow's unsold-stock pillar. Each used
// to call loadAllStockData() under its OWN query key, so walking Stocks → Shared →
// Storage → Audit → Cashflow downloaded the largest collection in the account five
// times over. Sharing one key means the first screen pays for it and the rest are
// instant, and the persisted cache holds a single copy instead of five.
//
// staleTime is deliberately longer than the global 2min default: stock lots change
// on explicit user writes, and every one of those already invalidates ['all-stock-lots']
// (or is followed by a refetch), so there is no correctness cost.
export const STOCK_LOTS_KEY = 'all-stock-lots';

export function useAllStockLots() {
  const { uidCollection } = useAuth();
  return useQuery({
    enabled: !!uidCollection,
    queryKey: [STOCK_LOTS_KEY, uidCollection],
    queryFn: async () => (await loadAllStockData(uidCollection as string)).filter(Boolean),
    staleTime: 1000 * 60 * 10,
  });
}
