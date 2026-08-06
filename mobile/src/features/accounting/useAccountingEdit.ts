import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/store/auth';
import { updateExpenseField, updateInvoiceField } from '@/data/writes';
import { AccountingGroup, AccountingLine } from './useAccounting';

// Inline editing for the Accounting reconciliation view — port of web's
// onCellUpdate (app/(root)/accounting/page.js:556-600). Mobile was entirely
// read-only here.
//
// Two rules carried over verbatim:
//   • rows whose expType is 'Purchase' are NOT editable — they are derived from the
//     contract's poInvoices, so the edit belongs on the contract, not here.
//   • the expense side and the invoice side write to DIFFERENT collections, each
//     keyed by its own { id, date } pair.

export type ExpenseField = 'expInvoice' | 'amountExp' | 'expType' | 'supplier';

export function useAccountingEdit() {
  const { uidCollection } = useAuth();
  const qc = useQueryClient();
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['accounting'] });
    qc.invalidateQueries({ queryKey: ['expenses-screen'] });
    qc.invalidateQueries({ queryKey: ['invoices'] });
  };

  const editExpense = useMutation({
    mutationFn: async ({ line, field, value }: { line: AccountingLine; field: ExpenseField; value: string }) => {
      if (!uidCollection) throw new Error('Not authenticated');
      // Purchase rows come from contract poInvoices — web blocks editing them here.
      if (line.expType === 'Purchase') throw new Error('Purchase rows are edited on the contract.');
      if (!line.expenseId || !line.expenseDate) throw new Error('Missing expense mapping.');

      const patch =
        field === 'expInvoice' ? { expense: value }
        : field === 'amountExp' ? { amount: parseFloat(value) || 0 }
        : field === 'expType' ? { expType: value }
        : { supplier: value };

      await updateExpenseField(uidCollection, line.expenseId, line.expenseDate, patch);
    },
    onSuccess: refresh,
  });

  const editInvoiceClient = useMutation({
    mutationFn: async ({ group, client }: { group: AccountingGroup; client: string }) => {
      if (!uidCollection) throw new Error('Not authenticated');
      if (!group.invoiceId || !group.invoiceDate) throw new Error('Missing invoice mapping.');
      await updateInvoiceField(uidCollection, group.invoiceId, group.invoiceDate, { client });
    },
    onSuccess: refresh,
  });

  return { editExpense, editInvoiceClient };
}
