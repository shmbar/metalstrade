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
} from './marginsModel';
import { num } from '@shared/finance';

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
  const { uidCollection } = useAuth();
  const { settings, dateSelect, loaded } = useSettings();
  const marginThreshold =
    settings?.MarginAlert?.threshold != null ? num(settings.MarginAlert.threshold) : 0;
  const year = parseInt(dateSelect.start.substring(0, 4)) || new Date().getFullYear();

  const query = useQuery({
    enabled: !!uidCollection && loaded,
    queryKey: ['margins', uidCollection, year],
    queryFn: () => loadMargins(uidCollection as string, year),
  });

  const data = useMemo(() => {
    const rows: MarginMonth[] = (query.data || [])
      .map((z: any) => {
        const purchase = num(z.purchase);
        const openShip = num(z.openShip);
        return {
          month: String(z.month ?? ''),
          monthLabel: monthName(z.month),
          purchase,
          openShip,
          totalMargin: num(z.totalMargin),
          remaining: num(z.remaining),
          shipped: purchase - openShip,
        };
      })
      .sort((a, b) => parseInt(a.month) - parseInt(b.month));

    const sum = (k: keyof MarginMonth) => rows.reduce((s, r) => s + (r[k] as number), 0);
    // GIS totals — web margins page.js:213-221 (full un-halved item values).
    const gisSum = (field: string) =>
      (query.data || []).reduce(
        (s: number, z: any) => s + (z.items || []).reduce((a: number, c: any) => a + (c.gis ? num(c[field]) : 0), 0),
        0
      );
    const totals: MarginTotals = {
      incoming: sum('remaining'),
      outstandingShip: sum('openShip'),
      quantity: sum('purchase'),
      profit: sum('totalMargin'),
      shipped: sum('purchase') - sum('openShip'),
      profitGIS: gisSum('totalMargin'),
      purchaseGIS: gisSum('purchase'),
      openShipGIS: gisSum('openShip'),
      remainingGIS: gisSum('remaining'),
    };

    // Items at/below the alert threshold — web rule (margins page.js:257-263):
    // "entered" when per-unit margin OR total margin is non-zero; alert when
    // totalMargin <= the CONFIGURED threshold (settings.MarginAlert.threshold).
    const threshold = marginThreshold;
    const alertedItems: any[] = [];
    (query.data || []).forEach((m: any) =>
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
  const { uidCollection } = useAuth();
  const { dateSelect, loaded } = useSettings();
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
    mutationFn: async () => {
      if (!uidCollection) throw new Error('Not authenticated');
      await saveMargins(uidCollection, months, year);
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
