import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/store/auth';
import { useSettings } from '@/store/settings';
import { loadFlatByDate } from '@/data/firestore';
import { updateSpecialInvoiceField } from '@/data/writes';
import { num } from '@shared/finance';

export const MISC_CATS = [
  { id: 'personal', label: 'Personal' },
  { id: 'random', label: 'Random' },
  { id: 'shipments', label: 'Shipments' },
] as const;

export type MiscCat = 'personal' | 'random' | 'shipments' | '';

export interface MiscRow {
  id: string;
  supplier?: string;
  supplierName: string;
  cur: string;
  total: number;
  paidNotPaid?: string;
  category: MiscCat;
  invoice?: string;
  description?: string;
  order?: string;
  date?: string;
  raw: any;
}

export function useMiscInvoices() {
  const { uidCollection } = useAuth();
  const { settings, dateSelect, loaded } = useSettings();

  const query = useQuery({
    enabled: !!uidCollection && loaded,
    queryKey: ['misc-invoices', uidCollection, dateSelect.start, dateSelect.end],
    queryFn: async () => loadFlatByDate<any>(uidCollection as string, 'specialInvoices', dateSelect),
  });

  const rows: MiscRow[] = useMemo(
    () =>
      (query.data || []).filter(Boolean).map((r: any) => ({
        id: r.id,
        supplier: r.supplier,
        supplierName: settings?.Supplier?.Supplier?.find((s: any) => s.id === r.supplier)?.nname || r.compName || '—',
        cur: r.cur || 'us',
        total: num(r.total),
        paidNotPaid: r.paidNotPaid,
        category: (['personal', 'random', 'shipments'].includes(r.category) ? r.category : '') as MiscCat,
        invoice: r.invoice,
        description: r.description,
        order: r.order,
        date: r.date,
        raw: r,
      })),
    [query.data, settings]
  );

  // Per-currency totals (unpaid and all), mirroring the web page's grouping.
  const totals = useMemo(() => {
    const all: Record<string, number> = {};
    const unpaid: Record<string, number> = {};
    rows.forEach((r) => {
      all[r.cur] = (all[r.cur] || 0) + r.total;
      if (r.paidNotPaid !== 'Paid') unpaid[r.cur] = (unpaid[r.cur] || 0) + r.total;
    });
    const byCat: Record<string, Record<string, number>> = {};
    rows.forEach((r) => {
      const cat = r.category || 'uncategorized';
      (byCat[cat] ||= {});
      byCat[cat][r.cur] = (byCat[cat][r.cur] || 0) + r.total;
    });
    return { all, unpaid, byCat };
  }, [rows]);

  return { rows, totals, isLoading: query.isLoading, isError: query.isError, error: query.error, refetch: query.refetch };
}

export function useSetMiscCategory() {
  const { uidCollection } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, category }: { id: string; category: MiscCat }) => {
      if (!uidCollection) throw new Error('Not authenticated');
      await updateSpecialInvoiceField(uidCollection, id, { category });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['misc-invoices'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
