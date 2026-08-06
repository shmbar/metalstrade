import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/store/auth';
import { markPoInvoicePaid, markExpensesPaid, partialPayPoInvoice, clientPartialPayment } from '@/data/writes';

// Mark a supplier purchase invoice (poInvoice) fully paid, or an expense paid.
// Both refresh the cashflow + dashboard so balances update.
export function useCashflowActions() {
  const { uidCollection } = useAuth();
  const qc = useQueryClient();
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['cashflow'] });
    qc.invalidateQueries({ queryKey: ['dashboard'] });
    qc.invalidateQueries({ queryKey: ['contracts'] });
  };

  const paySupplier = useMutation({
    mutationFn: async (ref: { contractId: string; contractDate: string; poInvoiceId: string }) => {
      if (!uidCollection) throw new Error('Not authenticated');
      await markPoInvoicePaid(uidCollection, ref);
    },
    onSuccess: refresh,
  });

  const payExpense = useMutation({
    mutationFn: async (expense: any) => {
      if (!uidCollection) throw new Error('Not authenticated');
      await markExpensesPaid(uidCollection, [expense]);
    },
    onSuccess: refresh,
  });

  // Record a client payment in place — web does this from the cashflow row rather
  // than sending the user to the invoice page.
  const payClient = useMutation({
    mutationFn: async (args: { invoice: any; amount: number; dateIso: string }) => {
      if (!uidCollection) throw new Error('Not authenticated');
      await clientPartialPayment(uidCollection, args.invoice, { pmnt: args.amount, dateIso: args.dateIso });
    },
    onSuccess: () => { refresh(); qc.invalidateQueries({ queryKey: ['invoices'] }); },
  });

  const partialPay = useMutation({
    mutationFn: async (args: {
      ref: { contractId: string; contractDate: string; poInvoiceId: string };
      amount: number;
      perc: number | string;
      dateIso: string;
    }) => {
      if (!uidCollection) throw new Error('Not authenticated');
      await partialPayPoInvoice(uidCollection, args.ref, args.amount, args.perc, args.dateIso);
    },
    onSuccess: refresh,
  });

  return { paySupplier, payExpense, partialPay, payClient };
}
