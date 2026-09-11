import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/store/auth';
import {
  markPoInvoicePaid,
  markExpensesPaid,
  partialPayPoInvoice,
  clientPartialPayment,
  saveCashflowManualRows,
  saveCashflowYearTotal,
} from '@/data/writes';
import { hapticSuccess, hapticWarning } from '@/lib/haptics';

// Mark a supplier purchase invoice (poInvoice) fully paid, or an expense paid.
// Both refresh the cashflow + dashboard so balances update.
export function useCashflowActions() {
  const { uidCollection } = useAuth();
  const qc = useQueryClient();
  const refresh = () => {
    hapticSuccess();
    qc.invalidateQueries({ queryKey: ['cashflow'] });
    qc.invalidateQueries({ queryKey: ['dashboard'] });
    qc.invalidateQueries({ queryKey: ['contracts'] });
  };
  // Every money-moving action here gets the same success/failure feel a
  // banking app gives a payment — a confirming tap on success, a firmer one
  // on failure — instead of only the toast/Alert telling you which happened.
  const onError = () => hapticWarning();

  const paySupplier = useMutation({
    mutationFn: async (ref: { contractId: string; contractDate: string; poInvoiceId: string }) => {
      if (!uidCollection) throw new Error('Not authenticated');
      await markPoInvoicePaid(uidCollection, ref);
    },
    onSuccess: refresh,
    onError,
  });

  const payExpense = useMutation({
    mutationFn: async (expense: any) => {
      if (!uidCollection) throw new Error('Not authenticated');
      await markExpensesPaid(uidCollection, [expense]);
    },
    onSuccess: refresh,
    onError,
  });

  // Record a client payment in place — web does this from the cashflow row rather
  // than sending the user to the invoice page.
  const payClient = useMutation({
    mutationFn: async (args: { invoice: any; amount: number; dateIso: string }) => {
      if (!uidCollection) throw new Error('Not authenticated');
      await clientPartialPayment(uidCollection, args.invoice, { pmnt: args.amount, dateIso: args.dateIso });
    },
    onSuccess: () => { refresh(); qc.invalidateQueries({ queryKey: ['invoices'] }); },
    onError,
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
    onError,
  });

  // Admin-only manual rows (web cashflow/page.js saveInitData) — "Future"
  // incoming (`initial`) and the Financing editors (`financedLeft`/
  // `financedRight`). The whole edited list is passed in, so add/edit/delete
  // are all just "save this field's array again" from the screen's point of view.
  const saveManualRows = useMutation({
    mutationFn: async (args: {
      field: 'initial' | 'financedLeft' | 'financedRight';
      rows: { title: string; num: string }[];
    }) => {
      if (!uidCollection) throw new Error('Not authenticated');
      await saveCashflowManualRows(uidCollection, args.field, args.rows);
    },
    onSuccess: refresh,
    onError,
  });

  // Admin "Total for {year}" (web cashflow/page.js handleChange + saveInitData).
  const saveYearTotal = useMutation({
    mutationFn: async (args: { year: number; value: string }) => {
      if (!uidCollection) throw new Error('Not authenticated');
      await saveCashflowYearTotal(uidCollection, args.year, args.value);
    },
    onSuccess: refresh,
    onError,
  });

  return { paySupplier, payExpense, partialPay, payClient, saveManualRows, saveYearTotal };
}
