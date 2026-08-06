import { useMemo } from 'react';
import { useSettings } from '@/store/settings';
import { computeInventory, formatInventoryRow } from './aggregate';
import { useAllStockLots } from './useAllStockLots';

// All current inventory, aggregated (net in − out per warehouse|description) with
// finance-faithful parity to the web Stocks page. Reads the SHARED stock-ledger
// query so Inventory/Shared/Storage/Aging/Audit don't each re-download it.
export function useStocks() {
  const { settings } = useSettings();
  const query = useAllStockLots();

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
