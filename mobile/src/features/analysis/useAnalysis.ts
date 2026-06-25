import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/store/auth';
import { useSettings } from '@/store/settings';
import { loadData } from '@/data/firestore';
import { Invoice } from '@/data/types';
import { groupInvoices, isIssued, num } from '@shared/finance';
import { resolveClientName } from '@/features/invoices/useInvoices';

export interface AnalysisRow {
  name: string;
  weight: number; // shipped MT
  count: number;
}

const invoiceWeight = (inv: any) =>
  (inv.productsDataInvoice || []).reduce((s: number, r: any) => s + (r.qnty === 's' ? 0 : num(r.qnty)), 0);

// Weight analysis (parity with the web Analysis page): shipped weight grouped by
// material and by client across the period's issued invoices.
export function useAnalysis() {
  const { uidCollection } = useAuth();
  const { settings, dateSelect, loaded } = useSettings();

  const query = useQuery({
    enabled: !!uidCollection && loaded,
    queryKey: ['analysis', uidCollection, dateSelect.start, dateSelect.end],
    queryFn: async () => groupInvoices(await loadData<Invoice>(uidCollection as string, 'invoices', dateSelect)).filter(isIssued),
  });

  const data = useMemo(() => {
    const byMaterial = new Map<string, AnalysisRow>();
    const byClient = new Map<string, AnalysisRow>();
    (query.data || []).forEach((inv: any) => {
      const w = invoiceWeight(inv);
      if (w <= 0) return;
      const client = resolveClientName(inv.client, settings) || '—';
      const c = byClient.get(client) || { name: client, weight: 0, count: 0 };
      c.weight += w; c.count += 1; byClient.set(client, c);

      (inv.productsDataInvoice || []).forEach((r: any) => {
        if (r.qnty === 's') return;
        const mat = r.description || r.descriptionText || '—';
        const m = byMaterial.get(mat) || { name: mat, weight: 0, count: 0 };
        m.weight += num(r.qnty); m.count += 1; byMaterial.set(mat, m);
      });
    });
    const sort = (m: Map<string, AnalysisRow>) => [...m.values()].sort((a, b) => b.weight - a.weight);
    return { byMaterial: sort(byMaterial), byClient: sort(byClient) };
  }, [query.data, settings]);

  return { ...data, isLoading: query.isLoading, isError: query.isError, error: query.error, refetch: query.refetch };
}
