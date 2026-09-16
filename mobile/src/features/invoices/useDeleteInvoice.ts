import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/store/auth';
import { deleteInvoiceForContract } from '@/data/writes';

// Delete an empty invoice — web invoiceDetails Delete (useInvoiceState.delInvoice).
// The write owns the guards; an invoice with materials never moves stock here, so
// the stock ledger needs no refresh.
export function useDeleteInvoice() {
  const uidCollection = useAuth((s) => s.uidCollection);
  const qc = useQueryClient();
  return useMutation({
    meta: { success: 'Invoice successfully deleted!' },
    mutationFn: async ({ id, year }: { id: string; year: string }) => {
      if (!uidCollection) throw new Error('Not authenticated');
      await deleteInvoiceForContract(uidCollection, id, year);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] });
      qc.invalidateQueries({ queryKey: ['contracts'] });
      qc.invalidateQueries({ queryKey: ['contract-invoices'] });
      qc.invalidateQueries({ queryKey: ['cashflow'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
