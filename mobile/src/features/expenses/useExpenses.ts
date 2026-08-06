import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/store/auth';
import { useSettings } from '@/store/settings';
import { loadData, loadFlatByDate } from '@/data/firestore';
import {
  saveSplit, saveExpense, deleteExpense, saveCompanyExpense, deleteCompanyExpense, copyExpenseToMisc,
} from '@/data/writes';
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
  /** the full Firestore doc — the edit form works on this */
  raw: any;
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
    raw: z,
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
    // Per-VENDOR breakdown — web renders two summary tables under each expense
    // page (all rows, and unpaid rows only), each with Total $ / Total EUR footers.
    const byVendor = (list: ExpenseRow[], onlyUnpaid = false) => {
      const m: Record<string, { vendor: string; byCur: Record<string, number> }> = {};
      list.forEach((r) => {
        if (onlyUnpaid && !r.unpaid) return;
        const key = r.supplierName || '—';
        (m[key] ||= { vendor: key, byCur: {} });
        m[key].byCur[r.cur] = (m[key].byCur[r.cur] || 0) + r.amount;
      });
      return Object.values(m).sort((a, b) => a.vendor.localeCompare(b.vendor));
    };

    return {
      supplier,
      company,
      supplierTotals: {
        all: totalsByCur(supplier),
        unpaid: totalsByCur(supplier, true),
        byVendor: byVendor(supplier),
        byVendorUnpaid: byVendor(supplier, true),
      },
      companyTotals: {
        all: totalsByCur(company),
        unpaid: totalsByCur(company, true),
        byVendor: byVendor(company),
        byVendorUnpaid: byVendor(company, true),
      },
    };
  }, [query.data, settings]);

  return { data, isLoading: query.isLoading, isError: query.isError, error: query.error, refetch: query.refetch };
}

// Save / delete an expense. Supplier expenses fan out to their linked invoice and
// contract (web parity); company expenses are self-contained.
export function useSaveExpense() {
  const { uidCollection } = useAuth();
  const { settings } = useSettings();
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['expenses-screen'] });
    qc.invalidateQueries({ queryKey: ['cashflow'] });
    qc.invalidateQueries({ queryKey: ['contracts'] });
    qc.invalidateQueries({ queryKey: ['invoices'] });
    qc.invalidateQueries({ queryKey: ['storage-expenses'] });
  };
  return useMutation({
    mutationFn: async ({
      expense,
      kind,
      previousDate,
    }: {
      expense: any;
      kind: 'expense' | 'companyexpense';
      previousDate?: string;
    }) => {
      if (!uidCollection) throw new Error('Not authenticated');
      if (kind === 'companyexpense') await saveCompanyExpense(uidCollection, expense, settings);
      else await saveExpense(uidCollection, { expense, previousDate });
    },
    onSuccess: invalidate,
  });
}

// "Copy to misc invoices" — web action on the company-expense modal.
export function useCopyExpenseToMisc() {
  const { uidCollection } = useAuth();
  const { settings } = useSettings();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (expense: any) => {
      if (!uidCollection) throw new Error('Not authenticated');
      await copyExpenseToMisc(uidCollection, expense, settings);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['misc-invoices'] }),
  });
}

export function useDeleteExpense() {
  const { uidCollection } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ expense, kind }: { expense: any; kind: 'expense' | 'companyexpense' }) => {
      if (!uidCollection) throw new Error('Not authenticated');
      if (kind === 'companyexpense') await deleteCompanyExpense(uidCollection, expense.id);
      else await deleteExpense(uidCollection, expense);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses-screen'] });
      qc.invalidateQueries({ queryKey: ['cashflow'] });
      qc.invalidateQueries({ queryKey: ['contracts'] });
      qc.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
}

// Fields web requires before an expense can be saved (validate(...) in
// useExpensesState.saveData_ExpenseExpenses).
export const EXPENSE_REQUIRED = ['expense', 'cur', 'supplier', 'expType', 'amount', 'date'] as const;

export function missingExpenseFields(v: any): string[] {
  return EXPENSE_REQUIRED.filter((k) => {
    if (k === 'date') return !(v?.dateRange?.startDate || v?.date);
    const val = v?.[k];
    return val === undefined || val === null || String(val).trim() === '';
  });
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
