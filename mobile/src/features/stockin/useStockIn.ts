import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { STOCK_LOTS_KEY } from '@/features/stocks/useAllStockLots';
import { useAuth } from '@/store/auth';
import { loadStockDataByIds, loadLedgerRowsReferencing } from '@/data/firestore';
import { saveContractStocks } from '@/data/writes';
import { Contract } from '@/data/types';
import { duplicateEntries, entryNameKey, foldEntries, safeMerges } from '@shared/productEntries';
import { groupSalesByLine } from '@shared/salesUsage';
import { filteredArray } from '@/features/stocks/aggregate';
import { toast } from '@/store/toast';

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

/* A contract's lots in the order they were entered — web whModal (66b06dd7), a standing
   client rule. Every save writes contract.stock[] from the rows as they stand on screen,
   so stock[] IS that order. The query returns lots by random document id, and the
   arrival-date sort this used to do could only break ties in that random order: rows
   sharing a date came back shuffled on each open, and a re-dated row jumped after Save.
   A lot missing from stock[] goes last. */
export const inEnteredOrder = <T extends { id?: string }>(lots: T[], stockIds: string[] = []): T[] => {
  const entered = new Map(stockIds.map((id, i) => [id, i]));
  const place = (row: T) => entered.get(row.id as string) ?? entered.size;
  return [...lots].sort((a, b) => place(a) - place(b));
};

/* Which sales invoices each lot has gone out on — web whModal's "Sales Inv#" cell
   (8cb0e89d, client request). Read from the ledger, never typed, so it cannot go stale:
   every sale row on this contract's lines (web loadSalesMovementsByLine — superseded
   invoices filtered, drafts out), allocated to lots by weight first, then first in first
   out (@shared/salesUsage). A failed read shows nothing and never blocks the rows. */
export function useLotSales(contract: Contract | undefined) {
  const uidCollection = useAuth((s) => s.uidCollection);
  const lineIds = ((contract?.productsData || []) as any[]).map((p) => p.id).filter(Boolean);
  const q = useQuery({
    enabled: !!uidCollection && lineIds.length > 0,
    queryKey: ['stockin-sales', uidCollection, contract?.id, lineIds.join(',')],
    queryFn: async () => {
      const rows = await loadLedgerRowsReferencing(uidCollection as string, lineIds);
      return groupSalesByLine(filteredArray(rows).filter((l: any) => l.draft !== true));
    },
    retry: false,
  });
  return q.data || {};
}

// Load a contract's existing warehouse lots, in entered order.
export function useStockInLots(contract: Contract | undefined) {
  const uidCollection = useAuth((s) => s.uidCollection);
  const ids = contract?.stock || [];
  return useQuery({
    enabled: !!uidCollection && !!contract,
    queryKey: ['stockin-lots', uidCollection, contract?.id, ids.join(',')],
    queryFn: async () => {
      const lots = ids.length ? await loadStockDataByIds(uidCollection as string, ids) : [];
      return inEnteredOrder(lots, ids);
    },
  });
}

// Persist the contract's stock lots via the faithful saveContractStocks port
// (writes lots, re-saves the contract with the lot-id list, regenerates spInv rows).
export function useSaveStockIn() {
  const uidCollection = useAuth((s) => s.uidCollection);
  const qc = useQueryClient();
  return useMutation({
    meta: { success: 'Stock successfully saved!' },
    mutationFn: async ({ contract, lots }: { contract: Contract; lots: any[] }) => {
      if (!uidCollection) throw new Error('Not authenticated');
      /* A hidden entry that now carries the same name as the PO line it came from is a
         duplicate (@shared/productEntries) — PO 110926-1 listed "CpTi Powder" twice, the
         PO line empty and the copy holding the lot. It is folded back into its line in
         this same save, exactly as web's Materials Breakdown does (8f7d81d2): lots
         re-pointed, entry dropped. Anything else in the ledger still naming it (a sale, a
         transfer, another contract's lot) leaves it alone; a failed check folds nothing. */
      let rows = lots;
      let con = contract;
      let folded: { from: string; to: string }[] = [];
      const merges = duplicateEntries(contract.productsData as any[]);
      if (merges.length) {
        const refs = await loadLedgerRowsReferencing(uidCollection, merges.map((m) => m.from)).catch(() => null);
        folded = refs ? safeMerges(merges, refs, lots.map((r) => r.id)) : [];
        if (folded.length) {
          const next = foldEntries(contract.productsData as any[], lots, folded);
          rows = next.rows;
          con = { ...contract, productsData: next.productsData } as Contract;
        }
      }
      await saveContractStocks(uidCollection, con, rows);
      return [
        ...new Set(
          folded
            .map((m) => ((contract.productsData || []) as any[]).find((p) => p.id === m.to)?.description)
            .filter((n) => entryNameKey(n))
        ),
      ] as string[];
    },
    onSuccess: (foldedNames) => {
      if (foldedNames?.length) {
        toast.success(`${foldedNames.map((n) => `"${n}"`).join(', ')} was listed twice — its lots are now on the PO line.`);
      }
      qc.invalidateQueries({ queryKey: ['stockin-lots'] });
      qc.invalidateQueries({ queryKey: [STOCK_LOTS_KEY] });
      qc.invalidateQueries({ queryKey: ['contracts'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['settlement-lots'] });
    },
  });
}
