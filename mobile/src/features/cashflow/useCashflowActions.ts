import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/store/auth';
import {
  markPoInvoicePaid,
  markExpensesPaid,
  partialPayPoInvoice,
  closePoInvoiceBalance,
  clientPartialPayment,
  saveCashflowManualRows,
  saveCashflowYearTotal,
  setPaymentPending,
} from '@/data/writes';
import { toast } from '@/store/toast';

// Mark a supplier purchase invoice (poInvoice) fully paid, or an expense paid.
// Both refresh the cashflow + dashboard so balances update.
export function useCashflowActions() {
  const uidCollection = useAuth((s) => s.uidCollection);
  const qc = useQueryClient();
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['cashflow'] });
    qc.invalidateQueries({ queryKey: ['dashboard'] });
    qc.invalidateQueries({ queryKey: ['contracts'] });
  };
  // Success and failure are felt through the toast and the app-wide mutation error
  // pulse (query/client.ts), the same as every other save.
  const onError = () => {};

  const paySupplier = useMutation({
    mutationFn: async (ref: { contractId: string; contractDate: string; poInvoiceId: string }) => {
      if (!uidCollection) throw new Error('Not authenticated');
      await markPoInvoicePaid(uidCollection, ref);
    },
    onSuccess: () => {
      refresh();
      toast.success('Payments successfully saved!');
    },
    onError,
  });

  const payExpense = useMutation({
    mutationFn: async (expense: any) => {
      if (!uidCollection) throw new Error('Not authenticated');
      await markExpensesPaid(uidCollection, [expense]);
    },
    onSuccess: () => {
      refresh();
      toast.success('Payments successfully saved!');
    },
    onError,
  });

  // Record a client payment in place — web does this from the cashflow row rather
  // than sending the user to the invoice page.
  const payClient = useMutation({
    mutationFn: async (args: { invoice: any; amount: number; dateIso: string }) => {
      if (!uidCollection) throw new Error('Not authenticated');
      await clientPartialPayment(uidCollection, args.invoice, { pmnt: args.amount, dateIso: args.dateIso });
    },
    onSuccess: () => {
      refresh();
      qc.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Payments successfully saved!');
    },
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
    onSuccess: () => {
      refresh();
      toast.success('Payments successfully saved!');
    },
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
    onSuccess: () => {
      refresh();
      toast.success('Data successfully saved!');
    },
    onError,
  });

  // Admin "Total for {year}" (web cashflow/page.js handleChange + saveInitData).
  const saveYearTotal = useMutation({
    mutationFn: async (args: { year: number; value: string }) => {
      if (!uidCollection) throw new Error('Not authenticated');
      await saveCashflowYearTotal(uidCollection, args.year, args.value);
    },
    onSuccess: () => {
      refresh();
      toast.success('Data successfully saved!');
    },
    onError,
  });

  /* Pending — a payment on hold (web Cashflow, client 2026-09-24). A held invoice stays
     listed but leaves every active total. It took over the Status column from the RDY /
     TRN cargo status, which the client dropped ("at this stage we don't need it"); what was
     saved as cargoStatus stays on the contract, only the control is gone. Where it is
     written: writes.ts setPaymentPending. The screen flips the row first and puts it back
     if the write fails. */
  const savePending = useMutation({
    mutationFn: async (args: { item: any; flag: boolean }) => {
      if (!uidCollection) throw new Error('Not authenticated');
      await setPaymentPending(uidCollection, args.item, args.flag);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cashflow'] });
      qc.invalidateQueries({ queryKey: ['contracts'] });
      qc.invalidateQueries({ queryKey: ['invoices'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: () => {
      toast.error('Could not save the pending status — please try again.');
    },
  });

  /* Stocks - UnPaid: hold (or release) a stock line — every unpaid purchase invoice behind it,
     written exactly as the supplier toggle writes one (web saveSupplierPending(invs[]),
     a074b342). So the same invoices show as held under Supplier - Payment too: one invoice,
     one status, whichever side it was set from. */
  const saveStockPending = useMutation({
    mutationFn: async (args: { holds: { contractId: string; contractDate: string; poInvoiceId: string }[]; flag: boolean }) => {
      if (!uidCollection) throw new Error('Not authenticated');
      for (const h of args.holds) await setPaymentPending(uidCollection, { kind: 'poInvoice', ...h }, args.flag);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cashflow'] });
      qc.invalidateQueries({ queryKey: ['contracts'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: () => {
      toast.error('Could not save the pending status — please try again.');
    },
  });

  // Settle a purchase invoice's residual as an adjustment, not a payment — web's
  // supplierCloseBalance, for the few cents or the rounding a supplier writes off.
  const closeBalance = useMutation({
    mutationFn: async (ref: { contractId: string; contractDate: string; poInvoiceId: string; inv?: string | number }) => {
      if (!uidCollection) throw new Error('Not authenticated');
      await closePoInvoiceBalance(uidCollection, ref);
    },
    onSuccess: (_d, ref) => {
      refresh();
      toast.success(`Balance of invoice ${ref.inv ?? ''} closed (settlement adjustment recorded)`);
    },
    onError,
  });

  return { paySupplier, payExpense, partialPay, payClient, saveManualRows, saveYearTotal, savePending, saveStockPending, closeBalance };
}
