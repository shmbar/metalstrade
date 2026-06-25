import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/store/auth';
import { useSettings } from '@/store/settings';
import { loadData, loadFlatByDate, loadAllStockData } from '@/data/firestore';
import { Contract, Invoice } from '@/data/types';
import { computeInventory } from '@/features/stocks/aggregate';
import { resolveClientName } from '@/features/invoices/useInvoices';
import { groupInvoices, isIssued, invoiceBalance, resolveCur, num } from '@shared/finance';

// EUR→USD constant the cashflow expenses use (web parity: runExpenses mult 1.08).
const EXP_EUR_USD = 1.08;

export interface Counterparty {
  name: string;
  byCur: Record<string, number>;
  usd: number;
  count: number;
  items: any[];
}

export interface CashflowData {
  // Incoming — outstanding client receivables (per currency, deduped, issued, balance>0).
  receivablesByCur: Record<string, number>;
  receivableClients: Counterparty[];
  // Outgoing — supplier payables from contract poInvoices (USD basis, EUR×euroToUSD).
  payablesUsd: number;
  payableSuppliers: Counterparty[];
  // Outgoing — unpaid expenses (paid==='222'), USD basis (EUR×1.08).
  expensesUsd: number;
  expenseSuppliers: Counterparty[];
  // Unsold stock value (capital tied up) — per currency, from inventory netting.
  unsoldByCur: Record<string, number>;
}

const addCur = (map: Record<string, number>, cur: string, v: number) => {
  map[cur] = (map[cur] || 0) + v;
};

export function useCashflow() {
  const { uidCollection } = useAuth();
  const { settings, dateSelect, loaded } = useSettings();
  const year = dateSelect.start.substring(0, 4);
  const range = { start: `${year}-01-01`, end: `${year}-12-31` };

  const query = useQuery({
    enabled: !!uidCollection && loaded,
    queryKey: ['cashflow', uidCollection, year],
    queryFn: async () => {
      const uid = uidCollection as string;
      const [invoices, contracts, expenses, companyExpenses, stocks] = await Promise.all([
        loadData<Invoice>(uid, 'invoices', range),
        loadData<Contract>(uid, 'contracts', range),
        loadData<any>(uid, 'expenses', range),
        loadFlatByDate<any>(uid, 'companyExpenses', range),
        loadAllStockData(uid),
      ]);
      return { invoices, contracts, expenses, companyExpenses, stocks };
    },
  });

  const data = useMemo<CashflowData | null>(() => {
    if (!query.data) return null;
    const { invoices, contracts, expenses, companyExpenses, stocks } = query.data;

    // ── Receivables (clients) ──────────────────────────────────────────────
    const receivablesByCur: Record<string, number> = {};
    const clientMap = new Map<string, Counterparty>();
    groupInvoices(invoices)
      .filter(isIssued)
      .forEach((inv) => {
        const bal = invoiceBalance(inv);
        if (bal <= 0.01) return;
        const cur = resolveCur(inv);
        addCur(receivablesByCur, cur, bal);
        const name = resolveClientName(inv.client, settings) || '—';
        const c = clientMap.get(name) || { name, byCur: {}, usd: 0, count: 0, items: [] };
        addCur(c.byCur, cur, bal);
        c.usd += cur === 'us' ? bal : bal * num((inv as any).euroToUSD || EXP_EUR_USD);
        c.count += 1;
        c.items.push({ kind: 'invoice', id: inv.id, number: inv.invoice, balance: bal, cur });
        clientMap.set(name, c);
      });

    // ── Payables (suppliers) — from contract poInvoices, USD basis ─────────
    const supMap = new Map<string, Counterparty>();
    let payablesUsd = 0;
    contracts.forEach((con) => {
      const cur = con.cur === 'eu' ? 'eu' : 'us';
      const rate = num(con.euroToUSD) || EXP_EUR_USD;
      (con.poInvoices || []).forEach((inv: any) => {
        const blnc = num(inv.blnc);
        if (blnc === 0) return;
        const usd = cur === 'us' ? blnc : blnc * rate;
        payablesUsd += usd;
        const name = settings?.Supplier?.Supplier?.find((s: any) => s.id === con.supplier)?.nname || '—';
        const c = supMap.get(name) || { name, byCur: {}, usd: 0, count: 0, items: [] };
        addCur(c.byCur, cur, blnc);
        c.usd += usd;
        c.count += 1;
        c.items.push({
          kind: 'poInvoice',
          contractId: con.id,
          contractDate: con.dateRange?.startDate || con.date || '',
          poInvoiceId: inv.id,
          inv: inv.inv,
          balance: blnc,
          cur,
        });
        supMap.set(name, c);
      });
    });

    // ── Unpaid expenses (paid === '222') ───────────────────────────────────
    const expMap = new Map<string, Counterparty>();
    let expensesUsd = 0;
    [...expenses, ...companyExpenses]
      .filter((z) => z && z.paid === '222')
      .forEach((e) => {
        const cur = e.cur === 'eu' || e.cur === 'EUR' ? 'eu' : 'us';
        const amt = num(e.amount);
        const usd = amt * (cur === 'us' ? 1 : EXP_EUR_USD);
        expensesUsd += usd;
        const name = settings?.Supplier?.Supplier?.find((s: any) => s.id === e.supplier)?.nname || 'Expense';
        const c = expMap.get(name) || { name, byCur: {}, usd: 0, count: 0, items: [] };
        addCur(c.byCur, cur, amt);
        c.usd += usd;
        c.count += 1;
        c.items.push({ kind: 'expense', id: e.id, date: e.date, amount: amt, cur, expense: e.expense, poSupplier: e.poSupplier });
        expMap.set(name, c);
      });

    // ── Unsold stock value ─────────────────────────────────────────────────
    const unsoldByCur: Record<string, number> = {};
    computeInventory(stocks, settings).totals.forEach((t) => addCur(unsoldByCur, t.cur, t.total));

    const sortByUsd = (m: Map<string, Counterparty>) =>
      [...m.values()].sort((a, b) => b.usd - a.usd).slice(0, 8);

    return {
      receivablesByCur,
      receivableClients: sortByUsd(clientMap),
      payablesUsd,
      payableSuppliers: sortByUsd(supMap),
      expensesUsd,
      expenseSuppliers: sortByUsd(expMap),
      unsoldByCur,
    };
  }, [query.data, settings]);

  return { data, isLoading: query.isLoading, isError: query.isError, error: query.error, refetch: query.refetch };
}
