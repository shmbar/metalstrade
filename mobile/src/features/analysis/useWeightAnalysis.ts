import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/store/auth';
import { useSettings } from '@/store/settings';
import { loadDataWeightAnalysis, getInvoicesByNumbers } from '@/data/firestore';
import { createWeightRows, WeightRow } from './weightAnalysis';

// Weight Analysis — supplier-scoped contracted-vs-returned assay report.
// The supplier is a REQUIRED filter: web loads nothing until one is chosen, and
// this mirrors that (the query stays disabled).
export function useWeightAnalysis(supplierId: string) {
  const { uidCollection } = useAuth();
  const { dateSelect, loaded } = useSettings();

  const query = useQuery({
    enabled: !!uidCollection && loaded && !!supplierId && !!dateSelect.start && !!dateSelect.end,
    queryKey: ['weight-analysis', uidCollection, supplierId, dateSelect.start, dateSelect.end],
    queryFn: async (): Promise<WeightRow[]> => {
      const uid = uidCollection as string;
      const contracts = await loadDataWeightAnalysis<any>(uid, 'contracts', dateSelect, 'supplier', supplierId);
      if (!contracts.length) return [];

      // Per contract: batch its invoice numbers by year, then load the RAW docs.
      const enriched = await Promise.all(
        contracts.map(async (con: any) => {
          const refs = con.invoices || [];
          const yrs = [...new Set(refs.map((x: any) => String(x.date || '').substring(0, 4)))].filter(Boolean);
          const batches = yrs.map((yr) => ({
            yr: yr as string,
            arrInv: [...new Set(refs.filter((x: any) => String(x.date || '').substring(0, 4) === yr).map((y: any) => y.invoice))],
          }));
          const invoicesData = batches.length ? await getInvoicesByNumbers<any>(uid, 'invoices', batches) : [];
          return { ...con, invoicesData };
        })
      );

      return createWeightRows(enriched);
    },
  });

  return {
    rows: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    enabled: !!supplierId,
  };
}
