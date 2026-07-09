import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/store/auth';
import { useSettings } from '@/store/settings';
import { loadData, loadFlatByDate, loadAllStockData } from '@/data/firestore';
import { Contract, Invoice } from '@/data/types';
import { resolveClientName } from '@/features/invoices/useInvoices';
import { num } from '@shared/finance';
// @ts-ignore — plain JS module shared verbatim with the web
import { lotIsSold } from '@shared/soldStatus';

// EUR→USD constant the cashflow expenses use (web parity: runExpenses mult 1.08).
const EXP_EUR_USD = 1.08;
const round2 = (n: any) => Math.round((Number(n) || 0) * 100) / 100;

export interface Counterparty {
  name: string;
  byCur: Record<string, number>;
  usd: number;
  count: number;
  items: any[];
}

export interface CashflowData {
  // Incoming — outstanding client receivables (per currency; includes credit balances).
  receivablesByCur: Record<string, number>;
  receivableClients: Counterparty[];
  // Outgoing — supplier payables from contract poInvoices (USD basis, EUR×euroToUSD).
  payablesUsd: number;
  payableSuppliers: Counterparty[];
  // Outgoing — unpaid expenses (paid==='222'), USD basis (EUR×1.08).
  expensesUsd: number;
  expenseSuppliers: Counterparty[];
  // Unsold stock value (capital tied up).
  unsoldByCur: Record<string, number>;
}

const addCur = (map: Record<string, number>, cur: string, v: number) => {
  map[cur] = (map[cur] || 0) + v;
};

// ── Receivables: verbatim port of web cashflow runInvoices (funcs.js:748-822) ──
// Only invoices linked to a contract (poSupplier.id). Per-invoice balance uses the
// web's Total() semantics; invoice+note groups recompute from the non-original notes.
function computeReceivablesWeb(invoices: Invoice[]): any[] {
  const eligible = (invoices || []).filter((inv: any) => inv?.poSupplier?.id);

  // Single-invoice balance — Total(data,'totalAmount').accumuLastInv with data.length===1:
  // only an original ('1111'/'Invoice') contributes; canceled contributes 0.
  const singleDebt = (inv: any) => {
    const isOriginal = ['1111', 'Invoice'].includes(inv.invType);
    const t = isOriginal && !isNaN(inv.totalAmount) ? (inv.canceled ? 0 : inv.totalAmount * 1) : 0;
    const p = (inv.payments || []).reduce((s: number, x: any) => s + (parseFloat(x?.pmnt) || 0), 0);
    return round2(round2(t) - round2(p));
  };

  const perInv = eligible.map((inv: any) => ({ ...inv, debtBlnc: singleDebt(inv) }));

  // groupedArrayInvoice: group by invoice number.
  const groups: any[][] = [];
  [...perInv]
    .sort((a, b) => a.invoice - b.invoice)
    .forEach((obj) => {
      const g = groups.find((grp) => grp[0]?.invoice === obj.invoice);
      if (g) g.push(obj);
      else groups.push([obj]);
    });

  const rows = groups.map((z) => {
    if (z.length === 1) return z[0];
    // Multi (invoice + credit/final notes): sum EVERY non-original note's total
    // (web does not re-zero canceled here — replicated exactly), all payments combined.
    const notes = z.filter((o) => o.invType !== '1111');
    const pmnts = z.map((x) => x.payments || []).flat();
    const totalAmount = notes.reduce((t, o) => t + (o.totalAmount * 1 || 0), 0);
    const db = round2(round2(totalAmount) - round2(pmnts.reduce((t, o) => t + (o.pmnt * 1 || 0), 0)));
    return { ...notes[0], payments: pmnts, debtBlnc: db, totalAmount };
  });

  // One-cent artifacts are settled; drafts excluded. NEGATIVE balances (credits) kept.
  return rows.filter((r) => Math.abs(r.debtBlnc) > 0.011).filter((r) => r.draft === undefined || r.draft === false);
}

// ── Unsold stocks: verbatim port of web runStocks unsold block (funcs.js:211-272) ──
// Driven by the manual Sold/Unsold lot status; fully-sold contracts (and their
// duplicated phantoms) drop out; not-yet-received products fall back to contract qty.
function computeUnsoldWeb(contractsData: any[], stockData: any[], settings: any) {
  const inLotById = new Map(stockData.filter((l) => l.type === 'in').map((l) => [l.id, l]));
  const unSoldAll = (contractsData || []).flatMap((con: any) => {
    const ownLots = (con.stock || []).map((id: string) => inLotById.get(id)).filter(Boolean) as any[];
    const contractFullySold = ownLots.length > 0 && ownLots.every(lotIsSold);
    if (contractFullySold) return [];
    const rows: any[] = [];
    for (const prod of con.productsData || []) {
      if (prod.import) continue;
      const prodLots = ownLots.filter((l) => l.description === prod.id || l.descriptionId === prod.id);
      if (prodLots.length > 0 && prodLots.every(lotIsSold)) continue;
      const unsoldLots = prodLots.filter((l) => !lotIsSold(l));
      const qnty = prodLots.length > 0
        ? unsoldLots.reduce((s, l) => s + (Number(l.qnty) || 0), 0)
        : Number(prod.qnty) || 0;
      const unitPrc = Number(prod.unitPrc) || 0;
      rows.push({ order: con.order, supplier: con.supplier, total: qnty * unitPrc, cur: con.cur });
    }
    return rows;
  });

  // Per-supplier totals (web unSoldArrTitles).
  const bySupplier: Record<string, { supplier: string; total: number; cur: string }> = {};
  unSoldAll.forEach((item: any) => {
    if (!item?.order) return;
    if (!bySupplier[item.supplier]) bySupplier[item.supplier] = { supplier: item.supplier, total: 0, cur: item.cur };
    bySupplier[item.supplier].total += Number(item.total) || 0;
  });
  return Object.values(bySupplier);
}

export function useCashflow() {
  const { uidCollection } = useAuth();
  const { settings, loaded } = useSettings();

  // Web parity: cashflow figures are RUNNING BALANCES anchored on the real current
  // year — independent of the selected period. Receivables/payables look back 4
  // years, expenses 2, unsold-stock contracts 2 (cashflow/page.js + funcs.js).
  const curYr = new Date().getFullYear();
  const range4y = { start: `${curYr - 3}-01-01`, end: `${curYr}-12-31` };
  const range2y = { start: `${curYr - 1}-01-01`, end: `${curYr}-12-31` };

  const query = useQuery({
    enabled: !!uidCollection && loaded,
    queryKey: ['cashflow', uidCollection, curYr],
    queryFn: async () => {
      const uid = uidCollection as string;
      const [invoices, contracts4y, contracts2y, expenses, companyExpenses, stocks] = await Promise.all([
        loadData<Invoice>(uid, 'invoices', range4y),
        loadData<Contract>(uid, 'contracts', range4y),
        loadData<Contract>(uid, 'contracts', range2y),
        loadData<any>(uid, 'expenses', range2y),
        loadFlatByDate<any>(uid, 'companyExpenses', range2y),
        loadAllStockData(uid),
      ]);
      return { invoices, contracts4y, contracts2y, expenses, companyExpenses, stocks };
    },
  });

  const data = useMemo<CashflowData | null>(() => {
    if (!query.data) return null;
    const { invoices, contracts4y, contracts2y, expenses, companyExpenses, stocks } = query.data;

    // ── Receivables (clients) — web runInvoices pipeline ───────────────────
    const receivablesByCur: Record<string, number> = {};
    const clientMap = new Map<string, Counterparty>();
    computeReceivablesWeb(invoices).forEach((inv: any) => {
      const bal = inv.debtBlnc;
      const cur = inv.cur === 'eu' ? 'eu' : 'us';
      addCur(receivablesByCur, cur, bal);
      const name = resolveClientName(inv.client, settings) || '—';
      const c = clientMap.get(name) || { name, byCur: {}, usd: 0, count: 0, items: [] };
      addCur(c.byCur, cur, bal);
      c.usd += cur === 'us' ? bal : bal * (num(inv.euroToUSD) || EXP_EUR_USD);
      c.count += 1;
      c.items.push({ kind: 'invoice', id: inv.id, number: inv.invoice, balance: bal, cur });
      clientMap.set(name, c);
    });

    // ── Payables (suppliers) — poInvoices, drafts excluded, 1¢ artifacts dropped ──
    const supMap = new Map<string, Counterparty>();
    let payablesUsd = 0;
    contracts4y.forEach((con) => {
      const cur = con.cur === 'eu' ? 'eu' : 'us';
      // Web has no rate fallback (NaN poisons its total on missing euroToUSD) —
      // the 1.08 fallback here is a deliberate hardening, matching the expenses rate.
      const rate = num(con.euroToUSD) || EXP_EUR_USD;
      (con.poInvoices || []).forEach((inv: any) => {
        if (inv.draft) return; // web: draft purchase invoices excluded
        const blnc = num(inv.blnc);
        if (Math.abs(blnc) <= 0.011) return; // web: ≤1¢ residues are settled
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

    // ── Unpaid expenses (paid === '222'); web: anything non-'us' converts ×1.08 ──
    const expMap = new Map<string, Counterparty>();
    let expensesUsd = 0;
    [...expenses, ...companyExpenses]
      .filter((z) => z && z.paid === '222')
      .forEach((e) => {
        const isUs = e.cur === 'us';
        const amt = num(e.amount);
        const usd = amt * (isUs ? 1 : EXP_EUR_USD);
        expensesUsd += usd;
        const name = settings?.Supplier?.Supplier?.find((s: any) => s.id === e.supplier)?.nname || 'Expense';
        const c = expMap.get(name) || { name, byCur: {}, usd: 0, count: 0, items: [] };
        addCur(c.byCur, isUs ? 'us' : 'eu', amt);
        c.usd += usd;
        c.count += 1;
        c.items.push({ kind: 'expense', id: e.id, date: e.date, amount: amt, cur: isUs ? 'us' : 'eu', expense: e.expense, poSupplier: e.poSupplier });
        expMap.set(name, c);
      });

    // ── Unsold stock value — web Sold/Unsold lot-status algorithm ──────────
    const unsoldByCur: Record<string, number> = {};
    computeUnsoldWeb(contracts2y, stocks, settings).forEach((row) => addCur(unsoldByCur, row.cur === 'eu' ? 'eu' : 'us', row.total));

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
