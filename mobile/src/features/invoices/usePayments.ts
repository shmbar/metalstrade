import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/store/auth';
import { saveInvoicePayments, newId } from '@/data/writes';
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
      /** { pmnt, date: 'YYYY-MM-DD' } — normalized to the web record shape below. */
      payment: { pmnt: number; date: string };
    }) => {
      if (!uidCollection) throw new Error('Not authenticated');
      const fresh = await loadInvoiceDocByYear(uidCollection, invoiceId, year);
      const existing = (fresh?.payments as Payment[]) || [];

      // Write the EXACT record web writes (cashflow clientPartialPayment /
      // contracts payments modal): { id, cur, date: {startDate,endDate}, pmnt }.
      // Mobile used to write { pmnt, date: 'YYYY-MM-DD' } with no id and no cur —
      // web's Payments modal binds `date` straight into its range datepicker, and
      // its delete + Final-Note de-dup paths both key on payment.id, so an
      // id-less mobile payment could not be deleted and could be mis-stripped.
      const record: any = {
        id: newId(),
        cur: (fresh as any)?.cur ?? '',
        date: { startDate: payment.date, endDate: payment.date },
        pmnt: payment.pmnt,
      };

      const next = [...existing, record];
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
