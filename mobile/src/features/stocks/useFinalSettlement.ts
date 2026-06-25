import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/store/auth';
import { loadStockDataByIds } from '@/data/firestore';
import { saveContractStocks } from '@/data/writes';
import { Contract } from '@/data/types';

// One settlement row's editable + confirmed (live) values. Mirrors the web
// finalSettlmentModal's per-lot `base`/`working` construction.
export interface SettlementBase {
  finalqnty: any;
  finaltotal: any;
  unitPrc: any;
  unitPrcFinal: any;
  descriptionText: any;
  remark: any;
}

export interface SettlementRow {
  lot: any; // the full stock lot
  base: SettlementBase; // last-confirmed (live) values
  working: SettlementBase; // values shown in the form (draft edits if held, else base)
}

const removeNonNumeric = (n: any) => (n ?? '').toString().replace(/[^0-9.\-]/g, '');
const fnum = (v: any) => parseFloat(removeNonNumeric(v)) || 0;

// Build the per-lot base (confirmed) + working (shown) values — verbatim logic from
// the web modal's loadStock effect.
export function buildSettlementRows(lots: any[]): { rows: SettlementRow[]; isDraft: boolean } {
  const rows = (lots || []).map((z) => {
    const base: SettlementBase = {
      finalqnty: z.finalqnty ?? z.qnty,
      finaltotal: z.finaltotal ?? z.total,
      unitPrc: z.unitPrc,
      unitPrcFinal: z.unitPrcFinal ?? z.unitPrc,
      descriptionText: z.descriptionText ?? z.productsData?.find((k: any) => k.id === z.description)?.description,
      remark: z.remark ?? '',
    };
    const working = z.fsDraft && z.fsDraftData ? { ...base, ...z.fsDraftData } : base;
    return { lot: z, base, working };
  });
  return { rows, isDraft: (lots || []).some((z) => z.fsDraft) };
}

// finaltotal is always finalqnty × unitPrcFinal (web parity).
export function recomputeTotal(w: SettlementBase): SettlementBase {
  return { ...w, finaltotal: fnum(w.finalqnty) * fnum(w.unitPrcFinal) };
}

// Build the stock-lot payload to persist — verbatim from the modal's saveD():
// draft ON holds edits in fsDraftData (live fields stay confirmed); draft OFF makes
// the edits live and clears the draft.
export function buildPayload(rows: SettlementRow[], working: SettlementBase[], isDraft: boolean): any[] {
  return rows.map((r, i) => {
    const w = working[i];
    const base = r.base;
    if (isDraft) {
      return {
        ...r.lot,
        finalqnty: base.finalqnty,
        finaltotal: base.finaltotal,
        unitPrc: base.unitPrc,
        unitPrcFinal: base.unitPrcFinal,
        descriptionText: base.descriptionText,
        remark: base.remark,
        fsDraft: true,
        fsDraftData: {
          finalqnty: w.finalqnty,
          finaltotal: w.finaltotal,
          unitPrc: w.unitPrc,
          unitPrcFinal: w.unitPrcFinal,
          descriptionText: w.descriptionText,
          remark: w.remark,
        },
      };
    }
    return {
      ...r.lot,
      finalqnty: w.finalqnty,
      finaltotal: w.finaltotal,
      unitPrc: w.unitPrc,
      unitPrcFinal: w.unitPrcFinal,
      descriptionText: w.descriptionText,
      remark: w.remark,
      fsDraft: false,
      fsDraftData: null,
    };
  });
}

export function useSettlementLots(contract: Contract | undefined) {
  const { uidCollection } = useAuth();
  const ids = contract?.stock || [];
  return useQuery({
    enabled: !!uidCollection && !!contract && ids.length > 0,
    queryKey: ['settlement-lots', uidCollection, contract?.id, ids.length],
    queryFn: async () => loadStockDataByIds(uidCollection as string, ids),
  });
}

export function useSaveFinalSettlement() {
  const { uidCollection } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ contract, payload }: { contract: Contract; payload: any[] }) => {
      if (!uidCollection) throw new Error('Not authenticated');
      return saveContractStocks(uidCollection, contract, payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stocks'] });
      qc.invalidateQueries({ queryKey: ['contracts'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['settlement-lots'] });
    },
  });
}
