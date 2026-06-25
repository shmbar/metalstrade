import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/store/auth';
import { useSettings } from '@/store/settings';
import { loadAllStockData } from '@/data/firestore';
import { computeInventory, formatInventoryRow } from './aggregate';

// All current inventory, aggregated (net in − out per warehouse|description) with
// finance-faithful parity to the web Stocks page.
export function useStocks() {
  const { uidCollection } = useAuth();
  const { settings, loaded } = useSettings();

  const query = useQuery({
    enabled: !!uidCollection && loaded,
    queryKey: ['stocks', uidCollection],
    queryFn: async () => loadAllStockData(uidCollection as string),
  });

  const data = useMemo(() => {
    if (!query.data) return null;
    const { rows, totals } = computeInventory(query.data, settings);
    return {
      rows: rows.map((r) => formatInventoryRow(r, settings)),
      totals: totals.map((t) => ({
        ...t,
        warehouseName: settings?.Stocks?.Stocks?.find((s: any) => s.id === t.stock)?.nname || '—',
        curLabel: settings?.Currency?.Currency?.find((c: any) => c.id === t.cur)?.cur || t.cur,
        qTypeLabel: settings?.Quantity?.Quantity?.find((q: any) => q.id === t.qTypeTable)?.qTypeTable || '',
      })),
    };
  }, [query.data, settings]);

  return { data, isLoading: query.isLoading, isError: query.isError, error: query.error, refetch: query.refetch };
}
