import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/store/auth';
import { useSettings } from '@/store/settings';
import { loadMargins } from '@/data/firestore';
import { saveMargins, newId } from '@/data/writes';
import {
  MarginMonth as MarginMonthDoc,
  orderByIds,
  applyItemChange,
  applyItemSelect,
  applyGisToggle,
  addItem as addItemPure,
  deleteItem as deleteItemPure,
  addMonth as addMonthPure,
  deleteMonth as deleteMonthPure,
  withStoredTotals,
} from './marginsModel';
import { monthPurchase, monthMargin, monthOpenShip, monthRemaining, yearFigures } from './derive';
import { num } from '@shared/finance';
import { useShallow } from 'zustand/react/shallow';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const monthName = (m: any) => {
  const n = parseInt(String(m), 10);
  return n >= 1 && n <= 12 ? MONTHS[n - 1] : String(m);
};

export interface MarginMonth {
  month: string;
  monthLabel: string;
  purchase: number; // Qty (MT)
  openShip: number;
  totalMargin: number; // profit $
  remaining: number;
  shipped: number;
}

export interface MarginTotals {
  incoming: number; // remaining
  outstandingShip: number; // openShip
  quantity: number; // purchase (MT)
  profit: number; // totalMargin
  shipped: number; // purchase - openShip
  profitGIS: number;
  purchaseGIS: number;
  openShipGIS: number;
  remainingGIS: number;
}

// Monthly margins for the selected year + headline totals. Mirrors the web margins
// page aggregation (incoming=remaining, outstanding=openShip, shipped=purchase-openShip).
export function useMargins() {
  const uidCollection = useAuth((s) => s.uidCollection);
  const { settings, dateSelect, loaded } = useSettings(useShallow((s) => ({ settings: s.settings, dateSelect: s.dateSelect, loaded: s.loaded })));
  const marginThreshold =
    settings?.MarginAlert?.threshold != null ? num(settings.MarginAlert.threshold) : 0;
  const year = parseInt(dateSelect.start.substring(0, 4)) || new Date().getFullYear();

  const query = useQuery({
    enabled: !!uidCollection && loaded,
    queryKey: ['margins', uidCollection, year],
    queryFn: () => loadMargins(uidCollection as string, year),
  });

  const data = useMemo(() => {
    // Every figure is added up from the months' ROWS, as web does (marginsView.js) —
    // never read off the totals a month document stores. Deleting a row left those as
    // they were, so the cards kept counting a deal that was gone (derive.ts yearFigures).
    // The rows are the ones a month lists, in its saved order — what the editor shows.
    const docs = orderByIds(query.data || []);
    const rows: MarginMonth[] = docs
      .map((z: any) => {
        const purchase = monthPurchase(z.items);
        const openShip = monthOpenShip(z.items);
        return {
          month: String(z.month ?? ''),
          monthLabel: monthName(z.month),
          purchase,
          openShip,
          totalMargin: monthMargin(z.items),
          remaining: monthRemaining(z.items),
          shipped: purchase - openShip,
        };
      })
      .sort((a, b) => parseInt(a.month) - parseInt(b.month));

    const totals: MarginTotals = yearFigures(docs);

    // Items at/below the alert threshold — web rule (margins page.js:257-263):
    // "entered" when per-unit margin OR total margin is non-zero; alert when
    // totalMargin <= the CONFIGURED threshold (settings.MarginAlert.threshold).
    const threshold = marginThreshold;
    const alertedItems: any[] = [];
    docs.forEach((m: any) =>
      (m.items || []).forEach((it: any) => {
        const perUnit = num(it.margin);
        const totalM = num(it.totalMargin);
        const entered = perUnit !== 0 || totalM !== 0;
        if (entered && totalM <= threshold) {
          alertedItems.push({ ...it, month: m.month });
        }
      })
    );

    return { rows, totals, year, alertedItems, threshold };
  }, [query.data, marginThreshold]);

  return { ...data, isLoading: query.isLoading, isError: query.isError, error: query.error, refetch: query.refetch };
}

// ── editable working copy ────────────────────────────────────────────────────
// Web keeps the whole year's months in component state, mutates them as the user
// types, and persists the SET with one batched save (deleting months that are no
// longer on screen). Mobile was read-only — no item rows, no save path at all.
//
// Items are ordered by each doc's `ids` array on load so on-screen row order
// survives a round trip, exactly like web.
export function useMarginsEditor() {
  const uidCollection = useAuth((s) => s.uidCollection);
  const { dateSelect, loaded } = useSettings(useShallow((s) => ({ dateSelect: s.dateSelect, loaded: s.loaded })));
  const qc = useQueryClient();
  const year = parseInt(dateSelect.start.substring(0, 4)) || new Date().getFullYear();

  const query = useQuery({
    enabled: !!uidCollection && loaded,
    queryKey: ['margins', uidCollection, year],
    queryFn: () => loadMargins(uidCollection as string, year),
  });

  const [months, setMonths] = useState<MarginMonthDoc[]>([]);
  const [dirty, setDirty] = useState(false);

  // Reload replaces the working copy — but never while the user has unsaved edits,
  // or a background refetch would silently discard them.
  useEffect(() => {
    if (query.data && !dirty) {
      setMonths(orderByIds(query.data).sort((a, b) => parseInt(a.month) - parseInt(b.month)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.data]);

  const apply = (next: MarginMonthDoc[] | null) => {
    if (!next) return; // rejected keystroke (>3 decimals)
    setMonths(next);
    setDirty(true);
  };

  const save = useMutation({
    meta: { success: 'Data successfully saved!' },
    mutationFn: async () => {
      if (!uidCollection) throw new Error('Not authenticated');
      // Each month's stored totals back in step with its rows (marginsModel.withStoredTotals),
      // as web saves them: Cashflow and the Assistant read those totals, and deleting a row
      // re-totals nothing.
      await saveMargins(uidCollection, withStoredTotals(months), year);
    },
    onSuccess: () => {
      setDirty(false);
      qc.invalidateQueries({ queryKey: ['margins'] });
    },
  });

  return {
    months,
    year,
    dirty,
    setField: (month: string, id: string, name: any, raw: string) =>
      apply(applyItemChange(months, month, id, name, raw)),
    setSelect: (month: string, id: string, name: any, value: any) =>
      apply(applyItemSelect(months, month, id, name, value)),
    toggleGis: (month: string, id: string, value: boolean) => apply(applyGisToggle(months, month, id, value)),
    addItem: (month: string) => apply(addItemPure(months, month, newId())),
    deleteItem: (month: string, id: string) => apply(deleteItemPure(months, month, id)),
    addMonth: () => apply(addMonthPure(months)),
    deleteMonth: (month: string) => apply(deleteMonthPure(months, month)),
    save,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
