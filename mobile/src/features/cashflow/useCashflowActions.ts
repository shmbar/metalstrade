import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/store/auth';
import {
  markPoInvoicePaid,
  markExpensesPaid,
  partialPayPoInvoice,
  clientPartialPayment,
  saveCashflowInitialEntries,
} from '@/data/writes';

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

  // Admin-only "Future" incoming rows (web cashflow/page.js saveInitData) — the
  // whole edited list is passed in, so add/edit/delete are all just "save the
  // array again" from the screen's point of view.
  const saveInitialEntries = useMutation({
    mutationFn: async (rows: { title: string; num: string }[]) => {
      if (!uidCollection) throw new Error('Not authenticated');
      await saveCashflowInitialEntries(uidCollection, rows);
    },
    onSuccess: refresh,
  });

  return { paySupplier, payExpense, partialPay, payClient, saveInitialEntries };
}
