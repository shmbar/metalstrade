import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/store/auth';
import { useSettings } from '@/store/settings';
import { loadData, loadFlatByDate } from '@/data/firestore';
import { saveSplit } from '@/data/writes';
import { num } from '@shared/finance';
import { splitStatusOf } from '@shared/splitUtils';

export interface ExpenseRow {
  unpaid: boolean;
  id: string;
  supplierName: string;
  cur: string;
  amount: number;
  paid: boolean; // paid === '111'
  expTypeLabel: string;
  invoice?: string;
  order?: string;
  date?: string;
  comments?: string;
  /** raw `split` object — drives the IMS/GIS SplitControl (web parity) */
  split?: any;
  splitStatus: 'none' | 'pending' | 'done';
}

function mapRows(list: any[], settings: any): ExpenseRow[] {
  const expTypes = settings?.Expenses?.Expenses || [];
  return list.filter(Boolean).map((z) => ({
    id: z.id,
    supplierName: settings?.Supplier?.Supplier?.find((s: any) => s.id === z.supplier)?.nname || 'Expense',
    cur: z.cur || 'us',
    amount: num(z.amount),
    paid: z.paid === '111',
    unpaid: z.paid === '222', // web sentinel: ONLY '222' counts as unpaid in totals
    expTypeLabel: expTypes.find((e: any) => e.id === z.expType)?.expType || '',
    invoice: z.expense,
    order: z.poSupplier?.order,
    date: z.date,
    comments: z.comments || '',
    split: z.split,
    splitStatus: splitStatusOf(z),
  }));
}

const totalsByCur = (rows: ExpenseRow[], onlyUnpaid = false) => {
  const m: Record<string, number> = {};
  rows.forEach((r) => {
    if (onlyUnpaid && !r.unpaid) return; // web parity: unpaid total = paid === '222'
    m[r.cur] = (m[r.cur] || 0) + r.amount;
  });
  return m;
};

// Supplier-linked expenses (year-bucketed) + company expenses (flat), with totals.
export function useExpenses() {
  const { uidCollection } = useAuth();
  const { settings, dateSelect, loaded } = useSettings();

  const query = useQuery({
    enabled: !!uidCollection && loaded,
    queryKey: ['expenses-screen', uidCollection, dateSelect.start, dateSelect.end],
    queryFn: async () => {
      const uid = uidCollection as string;
      const [supplier, company] = await Promise.all([
        loadData<any>(uid, 'expenses', dateSelect),
        loadFlatByDate<any>(uid, 'companyExpenses', dateSelect),
      ]);
      return { supplier, company };
    },
  });

  const data = useMemo(() => {
    if (!query.data) return null;
    const supplier = mapRows(query.data.supplier, settings).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    const company = mapRows(query.data.company, settings).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    return {
      supplier,
      company,
      supplierTotals: { all: totalsByCur(supplier), unpaid: totalsByCur(supplier, true) },
      companyTotals: { all: totalsByCur(company), unpaid: totalsByCur(company, true) },
    };
  }, [query.data, settings]);

  return { data, isLoading: query.isLoading, isError: query.isError, error: query.error, refetch: query.refetch };
}

// Persist an IMS/GIS split on an expense row. Supplier expenses live in the
// year-bucketed expenses_{year}; company expenses in the flat companyExpenses —
// the same two write paths the web pages use.
export function useSaveExpenseSplit() {
  const { uidCollection } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      row,
      kind,
      split,
    }: {
      row: ExpenseRow;
      kind: 'expense' | 'companyexpense';
      split: Record<string, unknown> | null;
    }) => {
      if (!uidCollection) throw new Error('Not authenticated');
      await saveSplit(uidCollection, { kind, id: row.id, date: row.date }, split);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses-screen'] });
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
