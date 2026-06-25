import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/store/auth';
import { useSettings } from '@/store/settings';
import { loadData, loadAllStockData } from '@/data/firestore';
import { updateExpenseField } from '@/data/writes';
import { isStorageType, toUsd, mtInWh, computeStorageMetric, ym } from '@shared/storageUtils';

// Storage-cost data: storage-type expenses in the period + all stock lots, then the
// per-warehouse rate (shared storageUtils, identical to the web page).
export function useStorage() {
  const { uidCollection } = useAuth();
  const { settings, dateSelect, loaded } = useSettings();

  const expTypes = settings?.Expenses?.Expenses || [];
  const warehouses = settings?.Stocks?.Stocks || [];
  const whName = (id: string) => {
    const w = warehouses.find((k: any) => k.id === id);
    return w?.stock || w?.nname || '';
  };

  const query = useQuery({
    enabled: !!uidCollection && loaded,
    queryKey: ['storage', uidCollection, dateSelect.start, dateSelect.end],
    queryFn: async () => {
      const [exp, lots] = await Promise.all([
        loadData<any>(uidCollection as string, 'expenses', dateSelect),
        loadAllStockData(uidCollection as string),
      ]);
      return {
        expenses: (exp || []).filter((e) => isStorageType(e, expTypes)),
        lots: (lots || []).filter(Boolean),
      };
    },
  });

  const derived = useMemo(() => {
    if (!query.data) return null;
    const { expenses, lots } = query.data;
    const tagged = expenses.filter((e: any) => e.storageWh && e.storageMonth);
    const untagged = expenses.filter((e: any) => !(e.storageWh && e.storageMonth));
    const metric = computeStorageMetric({ tagged, lots, whName });

    const totalSpend = expenses.reduce((s: number, e: any) => s + toUsd(parseFloat(e.amount) || 0, e.cur), 0);
    const whMt = warehouses
      .map((w: any) => ({ id: w.id, name: whName(w.id), mt: mtInWh(lots, w.id, '') }))
      .filter((x: any) => x.mt > 0.01)
      .sort((a: any, b: any) => b.mt - a.mt);
    const totalMt = whMt.reduce((s: number, x: any) => s + x.mt, 0);

    return {
      metric,
      tagged,
      untagged,
      actuals: { totalSpend, count: expenses.length, taggedCount: tagged.length, whMt, totalMt },
    };
  }, [query.data, settings]);

  return { derived, isLoading: query.isLoading, isError: query.isError, error: query.error, refetch: query.refetch };
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ['storage'] }),
  });
}
