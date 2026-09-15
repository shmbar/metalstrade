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
  updateContractField,
} from '@/data/writes';
import { hapticSuccess, hapticWarning } from '@/lib/haptics';
import { toast } from '@/store/toast';

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
    onSuccess: () => {
      refresh();
      toast.success('Supplier invoice marked paid');
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
      toast.success('Expense marked paid');
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
      toast.success('Client payment recorded');
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
      toast.success('Partial payment recorded');
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
      toast.success('Cashflow rows saved');
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
      toast.success('Year total saved');
    },
    onError,
  });

  // Cargo status on a supplier PO: RDY (ready to be shipped) or TRN (in transit), ''
  // to clear. Replaces the planned ETD/ETA in the supplier tables (client request,
  // web 3eb1cdae) — the question on this side is whether goods already paid for are
  // still at the supplier or on the way. A property of the CONTRACT, so every
  // purchase invoice of the PO changes together. No success toast: the chip itself
  // is the confirmation; a failure says so and the screen puts the old value back.
  const saveCargoStatus = useMutation({
    mutationFn: async (args: { contractId: string; contractDate: string; code: '' | 'RDY' | 'TRN' }) => {
      if (!uidCollection) throw new Error('Not authenticated');
      if (!args.contractId || !args.contractDate) throw new Error('This purchase invoice has no contract date.');
      await updateContractField(uidCollection, args.contractId, args.contractDate, { cargoStatus: args.code });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cashflow'] });
      qc.invalidateQueries({ queryKey: ['contracts'] });
    },
    onError: () => {
      hapticWarning();
      toast.error('Could not save the cargo status — please try again.');
    },
  });

  // Settle a purchase invoice's residual as an adjustment, not a payment — web's
  // supplierCloseBalance, for the few cents or the rounding a supplier writes off.
  const closeBalance = useMutation({
    mutationFn: async (ref: { contractId: string; contractDate: string; poInvoiceId: string }) => {
      if (!uidCollection) throw new Error('Not authenticated');
      await closePoInvoiceBalance(uidCollection, ref);
    },
    onSuccess: () => {
      refresh();
      toast.success('Balance closed — settlement adjustment recorded');
    },
    onError,
  });

  return { paySupplier, payExpense, partialPay, payClient, saveManualRows, saveYearTotal, saveCargoStatus, closeBalance };
}
