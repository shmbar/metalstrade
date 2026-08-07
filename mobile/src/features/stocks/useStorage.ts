import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/store/auth';
import { useSettings } from '@/store/settings';
import { loadData } from '@/data/firestore';
import { useAllStockLots, STOCK_LOTS_KEY } from './useAllStockLots';
import { updateExpenseField } from '@/data/writes';
import { isStorageType, toUsd, mtInWh, computeStorageMetric, ym } from '@shared/storageUtils';

/**
 * The year a storage invoice belongs to — its COVERED month when tagged, else its
 * own date. Verbatim port of web app/(root)/storagecosts/page.js:142 expYear
 * (`storageMonth` is string-guarded there; `ym` already coerces non-strings).
 * Exported so the parity suite can check it without running the hook.
 */
export const expenseYear = (e: any): string =>
  ((typeof e?.storageMonth === 'string' ? e.storageMonth : '') || ym(e?.date) || '').slice(0, 4);

export interface PerYearRow {
  year: string;
  spend: number;
  count: number;
  taggedCount: number;
  mtMonths: number;
  rate: number | null;
}

/**
 * Warehouse display label. Verbatim port of web app/(root)/storagecosts/page.js:117
 * — `stock` is the terminal's own name and wins over the generic `nname`, so the
 * per-warehouse rate table reads the same on both platforms.
 */
export const makeWhName = (warehouses: any[]) => (id: string): string => {
  const w = (warehouses || []).find((k: any) => k.id === id);
  return w?.stock || w?.nname || '';
};

/**
 * Per-year roll-up. Verbatim port of web app/(root)/storagecosts/page.js:157-167.
 * Years descend; `spend` is every storage invoice of that year converted to USD;
 * `mtMonths`/`rate` come from the TAGGED subset only, because an invoice with no
 * warehouse+month cannot be attributed to any tonnage.
 * Exported (rather than left inline in the hook) so the parity suite runs THIS code
 * instead of a re-transcription of it.
 */
export function computePerYear(allExpenses: any[], lots: any[], whName: (id: string) => string): PerYearRow[] {
  const byYear: Record<string, any[]> = {};
  (allExpenses || []).forEach((e: any) => {
    const y = expenseYear(e);
    if (y) (byYear[y] ||= []).push(e);
  });
  return Object.entries(byYear)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([y, list]) => {
      const taggedY = list.filter((e: any) => e.storageWh && e.storageMonth);
      const m = computeStorageMetric({ tagged: taggedY, lots, whName });
      const spend = list.reduce((s: number, e: any) => s + toUsd(parseFloat(e.amount) || 0, e.cur), 0);
      return { year: y, spend, count: list.length, taggedCount: taggedY.length, mtMonths: m.totalMt, rate: m.overall };
    });
}

export interface ActualsRow {
  totalSpend: number;
  count: number;
  taggedCount: number;
  whMt: { id: string; name: string; mt: number }[];
  totalMt: number;
}

/**
 * The untagged "real actuals" card. Verbatim port of web
 * app/(root)/storagecosts/page.js:179-187 — spend needs no tagging at all, and the
 * warehouse list drops terminals holding less than 0.01 MT so an emptied warehouse
 * does not linger at 0.
 */
export function computeActuals(
  expenses: any[],
  lots: any[],
  warehouses: any[],
  whName: (id: string) => string
): ActualsRow {
  const list = expenses || [];
  const tagged = list.filter((e: any) => e.storageWh && e.storageMonth);
  const totalSpend = list.reduce((s: number, e: any) => s + toUsd(parseFloat(e.amount) || 0, e.cur), 0);
  const whMt = (warehouses || [])
    .map((w: any) => ({ id: w.id, name: whName(w.id), mt: mtInWh(lots, w.id, '') }))
    .filter((x: any) => x.mt > 0.01)
    .sort((a: any, b: any) => b.mt - a.mt);
  const totalMt = whMt.reduce((s: number, x: any) => s + x.mt, 0);
  return { totalSpend, count: list.length, taggedCount: tagged.length, whMt, totalMt };
}

// Storage-cost data — same load window and scoping as the web page
// (app/(root)/storagecosts/page.js):
//   • expenses are loaded across the LAST 10 YEARS, deliberately independent of the
//     app-wide period selector, because this page has its own year filter and shows a
//     per-year summary. Mobile previously scoped the read to `dateSelect`, so the
//     totals, the $/MT rate and the triage list all silently omitted everything
//     outside the selected period.
//   • an invoice's year is its COVERED month when tagged, else its own date.
export function useStorage() {
  const { uidCollection } = useAuth();
  const { settings, loaded } = useSettings();

  const expTypes = settings?.Expenses?.Expenses || [];
  const warehouses = settings?.Stocks?.Stocks || [];
  const whName = makeWhName(warehouses);

  // Page-local period filter: 'all' or a 'YYYY' present in the data (web parity).
  const [year, setYear] = useState<string>('all');

  // Storage expenses only — the stock ledger comes from the SHARED query so this
  // tab doesn't re-download the whole collection the Inventory tab just fetched.
  const query = useQuery({
    enabled: !!uidCollection && loaded,
    queryKey: ['storage-expenses', uidCollection],
    queryFn: async () => {
      const thisYr = new Date().getFullYear();
      const exp = await loadData<any>(uidCollection as string, 'expenses', {
        start: `${thisYr - 9}-01-01`,
        end: `${thisYr}-12-31`,
      });
      return { expenses: (exp || []).filter((e) => isStorageType(e, expTypes)) };
    },
  });
  const lotsQuery = useAllStockLots();

  const derived = useMemo(() => {
    if (!query.data || !lotsQuery.data) return null;
    const allExpenses = query.data.expenses;
    const lots = lotsQuery.data;

    // The year a storage invoice belongs to = its covered month if tagged, else its
    // date. (storageMonth is string-guarded; ym already coerces non-strings.)
    const expYear = expenseYear;

    const years: string[] = [...new Set(allExpenses.map(expYear).filter(Boolean) as string[])].sort(
      (a, b) => b.localeCompare(a)
    );

    const expenses = year === 'all' ? allExpenses : allExpenses.filter((e: any) => expYear(e) === year);

    // Per-year roll-up: spend, MT-months and the average $/MT rate for each year.
    const perYear: PerYearRow[] = computePerYear(allExpenses, lots, whName);

    const tagged = expenses.filter((e: any) => e.storageWh && e.storageMonth);
    const untagged = expenses.filter((e: any) => !(e.storageWh && e.storageMonth));
    const metric = computeStorageMetric({ tagged, lots, whName });

    const actuals = computeActuals(expenses, lots, warehouses, whName);

    return {
      metric,
      tagged,
      untagged,
      // The full year-scoped list. suggestWh has to search THIS, not just the
      // untagged slice — by construction an untagged row has no storageWh, so
      // searching it could only ever match a half-tagged row and the suggestion
      // came back empty every time, where web pre-fills the warehouse from the
      // terminal's previous invoice.
      expenses,
      years,
      perYear,
      actuals,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.data, lotsQuery.data, settings, year]);

  return {
    derived,
    year,
    setYear,
    isLoading: query.isLoading || lotsQuery.isLoading,
    isError: query.isError || lotsQuery.isError,
    error: query.error || lotsQuery.error,
    refetch: () => {
      query.refetch();
      lotsQuery.refetch();
    },
  };
}

// Suggest a warehouse for an untagged invoice — reuse one already chosen for another
// storage invoice from the same supplier (web parity).
export const suggestWh = (e: any, expenses: any[]): string =>
  expenses.find((x) => x.id !== e.id && x.supplier && x.supplier === e.supplier && x.storageWh)?.storageWh || '';

export const defaultMonth = (e: any): string => e.storageMonth || ym(e.date);

// Tag a storage expense to warehouse + month.
export function useTagStorage() {
  const { uidCollection } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ expense, storageWh, storageMonth }: { expense: any; storageWh: string; storageMonth: string }) => {
      if (!uidCollection) throw new Error('Not authenticated');
      await updateExpenseField(uidCollection, expense.id, expense.date, { storageWh, storageMonth });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['storage-expenses'] }); qc.invalidateQueries({ queryKey: [STOCK_LOTS_KEY] }); },
  });
}
