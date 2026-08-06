import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/store/auth';
import { saveStockIn, newId } from '@/data/writes';
import { STOCK_LOTS_KEY } from './useAllStockLots';

// Move part of a lot to another warehouse — verbatim port of whModal.moveStock.
//
// The move is recorded as TWO docs, never as an edit of the original: an OUT row
// against the source warehouse ({moveType:'out', newStock}) and a cloned IN row
// against the target ({moveType:'in', oldStock}). Every stock reader nets these,
// so history stays intact and the move is reversible by deleting the pair.
//
// moveType 'out' is what keeps a transfer from counting as a SALE — the unsold
// calculation explicitly skips outs whose moveType is 'out'.

const stamp = () => {
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const d = new Date();
  return `${String(d.getDate()).padStart(2, '0')}-${MONTHS[d.getMonth()]}-${d.getFullYear()}`;
};

export interface MoveStockArgs {
  /** the aggregated inventory row being moved from */
  item: any;
  qnty: number;
  /** target warehouse id */
  toStock: string;
}

export function useMoveStock() {
  const { uidCollection } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ item, qnty, toStock }: MoveStockArgs) => {
      if (!uidCollection) throw new Error('Not authenticated');
      if (!qnty || !toStock) throw new Error('Pick a quantity and a target warehouse.');
      if (qnty > Number(item.qnty)) throw new Error('Selected weight is bigger than available.');
      if (toStock === item.stock) throw new Error('Source and target warehouse are the same.');

      const group: any[] = Array.isArray(item.data) ? item.data : [];
      const first = group[0] || {};
      const itemOut = {
        stock: item.stock,
        id: newId(),
        invoice: '',
        unitPrc: item.unitPrc,
        date: stamp(),
        qnty: qnty * 1,
        type: 'out',
        supplier: item.supplier,
        descriptionId: first.type === 'in' ? first.description : first.descriptionId,
        newStock: toStock,
        cur: item.cur,
        descriptionName: item.descriptionName,
        moveType: 'out',
      };

      const sourceIn = group.find((x) => x.type === 'in') || first;
      const itemIn = {
        ...sourceIn,
        id: newId(),
        qnty,
        total: qnty * Number(item.unitPrc || 0),
        stock: toStock,
        invoice: '',
        oldStock: item.stock,
        moveType: 'in',
        date: stamp(),
      };

      await saveStockIn(uidCollection, [itemOut, itemIn]);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [STOCK_LOTS_KEY] });
    },
  });
}
