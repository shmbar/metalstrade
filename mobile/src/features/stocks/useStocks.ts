import { useMemo } from 'react';
import { useSettings } from '@/store/settings';
import { computeInventory, formatInventoryRow, setTotals, InventoryTotal } from './aggregate';
import { useAllStockLots } from './useAllStockLots';

// All current inventory, aggregated (net in − out per warehouse|description) with
// finance-faithful parity to the web Stocks page. Reads the SHARED stock-ledger
// query so Inventory/Shared/Storage/Aging/Audit don't each re-download it.
export function useStocks() {
  const { settings } = useSettings();
  const query = useAllStockLots();

  // Web recomputes its Summary-Stocks table from the FILTERED row model on every
  // search keystroke, so screens need to re-derive the totals from their own rows.
  const labelTotals = useMemo(
    () => (list: InventoryTotal[]) =>
      list.map((t) => ({
        ...t,
        warehouseName: settings?.Stocks?.Stocks?.find((s: any) => s.id === t.stock)?.nname || '—',
        curLabel: settings?.Currency?.Currency?.find((c: any) => c.id === t.cur)?.cur || t.cur,
        qTypeLabel: settings?.Quantity?.Quantity?.find((q: any) => q.id === t.qTypeTable)?.qTypeTable || '',
      })),
    [settings]
  );

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

  return { data, labelTotals, setTotals, isLoading: query.isLoading, isError: query.isError, error: query.error, refetch: query.refetch };
}
