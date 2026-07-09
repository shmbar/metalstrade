import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/store/auth';
import { useSettings } from '@/store/settings';
import { loadData } from '@/data/firestore';
import { num } from '@shared/finance';
import { arr } from '@/lib/guard';

// Sales contracts (sell-side) from the `salescontracts` collection, with shipped
// quantity derived from linked invoices (inv.salesContractId). Mirrors the web page.
export function useSalesContracts() {
  const { uidCollection } = useAuth();
  const { settings, dateSelect, loaded } = useSettings();

  const query = useQuery({
    enabled: !!uidCollection && loaded,
    queryKey: ['salescontracts', uidCollection, dateSelect.start, dateSelect.end],
    queryFn: async () => {
      const uid = uidCollection as string;
      const contracts = await loadData<any>(uid, 'salescontracts', dateSelect);
      const years = contracts.map((c) => (c.dateRange?.startDate || c.date || '').substring(0, 4)).filter(Boolean);
      const shipped: Record<string, number> = {};
      if (years.length) {
        const minY = Math.min(...years.map(Number));
        const maxY = Math.max(...years.map(Number));
        const invoices = await loadData<any>(uid, 'invoices', { start: `${minY}-01-01`, end: `${maxY}-12-31` });
        invoices
          .filter((inv) => inv.salesContractId && !inv.canceled)
          .forEach((inv) => {
            const q = arr<any>(inv.productsDataInvoice).reduce(
              (s: number, r: any) => s + (r.qnty === 's' ? 0 : num(r.qnty)),
              0
            );
            shipped[inv.salesContractId] = (shipped[inv.salesContractId] || 0) + q;
          });
      }
      return { contracts, shipped };
    },
  });

  const rows = useMemo(() => {
    if (!query.data) return [];
    const { contracts, shipped } = query.data;
    return contracts
      .map((c: any) => {
        const contractedQty = arr<any>(c.productsData).reduce((s: number, r: any) => s + num(r.qnty), 0);
        const shippedQty = shipped[c.id] || 0;
        const clientName =
          (c.client && typeof c.client === 'object' ? c.client.nname : null) ||
          settings?.Client?.Client?.find((x: any) => x.id === c.client)?.nname ||
          '—';
        const products = [...new Set(arr<any>(c.productsData).map((p: any) => p.description).filter(Boolean))] as string[];
        // Web parity (salescontracts/page.js): monetary total, uncapped remaining,
        // and the tolerance-based ship status.
        const totalAmount = arr<any>(c.productsData).reduce(
          (s: number, r: any) => s + num(r.qnty) * num(r.unitPrc),
          0
        );
        const remaining = contractedQty - shippedQty;
        const status =
          contractedQty > 0 && shippedQty >= contractedQty - 0.0001
            ? 'Fully shipped'
            : shippedQty > 0.0001
              ? 'Partial'
              : 'Outstanding';
        return {
          id: c.id,
          contractNo: c.contractNo || c.order || '—',
          clientName,
          contractedQty,
          shippedQty,
          remaining,
          status,
          totalAmount,
          cur: c.cur || 'us',
          pct: contractedQty > 0 ? Math.min(100, (shippedQty / contractedQty) * 100) : 0,
          products,
          date: c.dateRange?.startDate || c.date || '',
        };
      })
      .sort((a: any, b: any) => (b.date || '').localeCompare(a.date || ''));
  }, [query.data, settings]);

  return { rows, isLoading: query.isLoading, isError: query.isError, error: query.error, refetch: query.refetch };
}
