import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/store/auth';
import { updateInvoiceDoc } from '@/data/writes';

// Patch an existing invoice's editable fields (header + materials). Keeps the
// invoice in its current year bucket (date year unchanged) to avoid doc moves.
export function useEditInvoice() {
  const { uidCollection } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, year, patch }: { id: string; year: string; patch: Record<string, unknown> }) => {
      if (!uidCollection) throw new Error('Not authenticated');
      await updateInvoiceDoc(uidCollection, id, year, patch);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['contract-invoices'] });
    },
  });
}
