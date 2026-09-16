import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/store/auth';
import { saveContract, deleteContract } from '@/data/writes';
import { Contract } from '@/data/types';

// Save (create or update) a contract, then refresh the lists/dashboard that
// depend on it. `existing` is the pre-edit doc (for year-change + update logic).
export function useSaveContract() {
  const uidCollection = useAuth((s) => s.uidCollection);
  const qc = useQueryClient();

  return useMutation({
    meta: { success: (_d: any, v: any) => v?.successMessage ?? 'Contract successfully saved!' },
    mutationFn: async ({ value, existing }: { value: Contract; existing?: Contract; successMessage?: string }) => {
      if (!uidCollection) throw new Error('Not authenticated');
      return saveContract(uidCollection, value, existing);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contracts'] });
      qc.invalidateQueries({ queryKey: ['contract-invoices'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useDeleteContract() {
  const uidCollection = useAuth((s) => s.uidCollection);
  const qc = useQueryClient();

  return useMutation({
    meta: { success: (res: any) => (res?.ok ? 'Contract successfully deleted!' : null) },
    mutationFn: async (value: Contract) => {
      if (!uidCollection) throw new Error('Not authenticated');
      return deleteContract(uidCollection, value);
    },
    onSuccess: (res) => {
      if (res.ok) {
        qc.invalidateQueries({ queryKey: ['contracts'] });
        qc.invalidateQueries({ queryKey: ['dashboard'] });
      }
    },
  });
}
