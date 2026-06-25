import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/store/auth';
import { saveInvoicePayments } from '@/data/writes';
import { loadInvoiceDocByYear } from '@/data/firestore';
import { Payment } from '@/data/types';

// Append a client payment to an invoice. To avoid double-counting when the cached
// entry is a grouped (invoice + credit/final note) record whose `payments` are
// combined, we re-read the target doc fresh and append to ITS OWN payments before
// writing. Then refresh invoices + dashboard (receivables) which read balances.
export function useAddPayment() {
  const { uidCollection } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      invoiceId,
      year,
      payment,
    }: {
      invoiceId: string;
      year: string;
      payment: Payment;
    }) => {
      if (!uidCollection) throw new Error('Not authenticated');
      const fresh = await loadInvoiceDocByYear(uidCollection, invoiceId, year);
      const existing = (fresh?.payments as Payment[]) || [];
      const next = [...existing, payment];
      await saveInvoicePayments(uidCollection, invoiceId, year, next);
      return next;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['contract-invoices'] });
    },
  });
}
