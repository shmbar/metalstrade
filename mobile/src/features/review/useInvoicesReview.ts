import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/store/auth';
import { useSettings } from '@/store/settings';
import { loadData } from '@/data/firestore';
import { Contract, Invoice } from '@/data/types';
import { InvoiceView } from '@/features/invoices/useInvoices';
import { computeInvoicesReview, PartyStatement } from '@/features/review/reviewCore';

export type { PartyStatement } from '@/features/review/reviewCore';

// Invoices Review: review rows (deduped invoices with balances) + a statement of
// client receivables and supplier payables, per currency. All of the arithmetic
// lives in reviewCore.ts so it can be parity-tested against web without React.
export function useInvoicesReview() {
  const { uidCollection } = useAuth();
  const { settings, dateSelect, loaded } = useSettings();

  const query = useQuery({
    enabled: !!uidCollection && loaded,
    queryKey: ['invoices-review', uidCollection, dateSelect.start, dateSelect.end],
    queryFn: async () => {
      const uid = uidCollection as string;
      const [invoices, contracts] = await Promise.all([
        loadData<Invoice>(uid, 'invoices', dateSelect),
        loadData<Contract>(uid, 'contracts', dateSelect),
      ]);
      return { invoices, contracts };
    },
  });

  const data = useMemo(() => {
    if (!query.data)
      return {
        rows: [] as InvoiceView[],
        clients: [] as PartyStatement[],
        suppliers: [] as PartyStatement[],
        receivablesByCur: {} as Record<string, number>,
      };
    return computeInvoicesReview(query.data.invoices, query.data.contracts, settings);
  }, [query.data, settings]);

  return { ...data, isLoading: query.isLoading, isError: query.isError, error: query.error, refetch: query.refetch };
}
