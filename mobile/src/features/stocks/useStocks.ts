import { useMemo } from 'react';
import { useSettings } from '@/store/settings';
import { computeInventory, formatInventoryRow, setTotals, InventoryTotal } from './aggregate';
import { useAllStockLots } from './useAllStockLots';

// All current inventory, aggregated (net in − out per warehouse|description) with
// finance-faithful parity to the web Stocks page. Reads the SHARED stock-ledger
// query so Inventory/Shared/Storage/Aging/Audit don't each re-download it.
export function useStocks() {
  const settings = useSettings((s) => s.settings);
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
    // Newest contract first, PO number breaking ties — the web Stocks page's default
    // (stocks/page.js), which in turn is Cashflow's. Without it the list came out in
    // Firestore document-id order, i.e. no order at all. Sorted here, not inside
    // computeInventory, so the shared aggregation stays a straight port.
    const contractTs = (r: any) => {
      const d = (r.data || []).find((z: any) => z?.contractData)?.contractData?.date;
      return d ? new Date(d).getTime() || 0 : 0;
    };
    const ordered = [...rows].sort((a: any, b: any) =>
      contractTs(b) - contractTs(a)
      || String(a.order ?? '').localeCompare(String(b.order ?? ''), undefined, { numeric: true }));
    return {
      rows: ordered.map((r) => formatInventoryRow(r, settings)),
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
