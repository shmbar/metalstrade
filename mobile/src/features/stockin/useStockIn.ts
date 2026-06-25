import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/store/auth';
import { loadStockDataByIds } from '@/data/firestore';
import { saveContractStocks } from '@/data/writes';
import { Contract } from '@/data/types';

// A blank warehouse stock lot — mirrors whModal's newStock.
export const blankLot = (id: string) => ({
  id,
  description: '', // contract product id
  qnty: '',
  unitPrc: '',
  total: '',
  poInvoice: '', // contract poInvoices id
  indDate: null as null | { startDate: string | null; endDate: string | null },
  stock: '', // warehouse id
  spInv: false,
  compName: '',
  status: '', // 'sold' | 'unsold'
  client: '',
});

// Load a contract's existing warehouse lots (sorted by arrival date, like whModal).
export function useStockInLots(contract: Contract | undefined) {
  const { uidCollection } = useAuth();
  const ids = contract?.stock || [];
  return useQuery({
    enabled: !!uidCollection && !!contract,
    queryKey: ['stockin-lots', uidCollection, contract?.id, ids.length],
    queryFn: async () => {
      const lots = ids.length ? await loadStockDataByIds(uidCollection as string, ids) : [];
      return lots.sort((a: any, b: any) => {
        const da = a.indDate?.endDate ? new Date(a.indDate.endDate).getTime() : Infinity;
        const db = b.indDate?.endDate ? new Date(b.indDate.endDate).getTime() : Infinity;
        return da - db;
      });
    },
  });
}

// Persist the contract's stock lots via the faithful saveContractStocks port
// (writes lots, re-saves the contract with the lot-id list, regenerates spInv rows).
export function useSaveStockIn() {
  const { uidCollection } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ contract, lots }: { contract: Contract; lots: any[] }) => {
      if (!uidCollection) throw new Error('Not authenticated');
      return saveContractStocks(uidCollection, contract, lots);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stockin-lots'] });
      qc.invalidateQueries({ queryKey: ['stocks'] });
      qc.invalidateQueries({ queryKey: ['contracts'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['settlement-lots'] });
    },
  });
}
