import { resolveInvoiceDate } from '@shared/pureHelpers';
import type { CashflowData, Counterparty } from './useCashflow';

/*
 * Cashflow report — the phone's twin of web cashflow/report.js (eb201c9f, client
 * 2026-09-29: the export "just shows totals for each customer/supplier"). One picture of the
 * page: the position, who owes us and for how long, whom we owe, what is in the warehouses,
 * unpaid expenses, unsold stock, and every Pending hold — largest first.
 *
 * Built ONLY from what the Cashflow screen already computed (useCashflow), so every figure
 * reconciles with the screen by construction: a party's figure is its active figure, holds
 * are carried beside it (web pendingSplit), and currencies are never added together — a
 * client's $ and € stay two amounts. Pure; tested in __tests__/cashflowReport.mobile.test.ts.
 */

export type ByCur = Record<string, number>;
export interface ReportParty { name: string; byCur: ByCur; usd: number; count: number; pendingCount: number; pendingByCur: ByCur }
export interface AgingBucket { label: string; count: number; byCur: ByCur }
export interface HoldRow { kind: 'Client invoice' | 'Supplier invoice' | 'Stock'; party: string; ref: string; cur: string; amount: number; usd: number }
export interface ReportRow { section: string; party: string; ref: string; po: string; date: string; description: string; cur: string; amount: number; balance: number; status: string }

export interface CashflowReport {
  asOf: string;
  /** Admin only — the page shows the position to admins only. */
  position: { left: { label: string; usd: number }[]; right: { label: string; usd: number }[]; totalLeft: number; totalRight: number; balance: number } | null;
  receivables: { byCur: ByCur; pendingByCur: ByCur; aging: AgingBucket[]; undated: AgingBucket; parties: ReportParty[] };
  payables: { usd: number; pendingUsd: number; parties: ReportParty[] };
  stock: { paidUsd: number; unpaidUsd: number; pendingUsd: number; warehouses: { name: string; paidUsd: number; unpaidUsd: number; lots: number }[] };
  expenses: { usd: number; parties: ReportParty[] };
  unsold: { byCur: ByCur; parties: { name: string; cur: string; total: number; lines: number }[] };
  holds: HoldRow[];
  /** Every detail row, grouped by section then party — the CSV. */
  rows: ReportRow[];
}

const AGE = [
  { label: '0–30 days', maxDays: 30 },
  { label: '31–60 days', maxDays: 60 },
  { label: '61–90 days', maxDays: 90 },
  { label: 'Over 90 days', maxDays: Infinity },
];
const DAY = 86_400_000;

const add = (m: ByCur, cur: string, v: number) => {
  if (!Number.isFinite(v)) return;
  m[cur] = (m[cur] || 0) + v;
};
const mergeParties = (lists: Counterparty[][]): ReportParty[] => {
  const by = new Map<string, ReportParty>();
  lists.flat().forEach((c) => {
    const p = by.get(c.name) || { name: c.name, byCur: {}, usd: 0, count: 0, pendingCount: 0, pendingByCur: {} };
    Object.entries(c.byCur || {}).forEach(([k, v]) => add(p.byCur, k, v));
    Object.entries(c.pendingByCur || {}).forEach(([k, v]) => add(p.pendingByCur, k, v));
    p.usd += c.usd || 0;
    p.count += c.count || 0;
    p.pendingCount += c.pendingCount || 0;
    by.set(c.name, p);
  });
  return [...by.values()].sort((a, b) => b.usd - a.usd);
};

export function buildCashflowReport(
  data: CashflowData,
  opts: { isAdmin: boolean; asOf?: Date; warehouseName: (id: string) => string }
): CashflowReport {
  const asOf = opts.asOf || new Date();
  const rows: ReportRow[] = [];
  const holds: HoldRow[] = [];

  // ── receivables, with ageing from the invoice date (web report.js AGE_BUCKETS) ──
  const aging: AgingBucket[] = AGE.map((a) => ({ label: a.label, count: 0, byCur: {} }));
  const undated: AgingBucket = { label: 'No invoice date', count: 0, byCur: {} };
  const receivableCounterparties = [...data.clientsNoPayment, ...data.clientsWithBalance];
  receivableCounterparties.forEach((c) =>
    c.items.forEach((it: any) => {
      const date = resolveInvoiceDate(it.raw) || '';
      const ref = `${it.number ?? ''}${it.marker || ''}`;
      rows.push({ section: 'Receivables', party: c.name, ref, po: it.order || '', date, description: '', cur: it.cur, amount: Number(it.amount) || 0, balance: Number(it.balance) || 0, status: it.pending ? 'Pending' : '' });
      if (it.pending) {
        holds.push({ kind: 'Client invoice', party: c.name, ref, cur: it.cur, amount: Number(it.balance) || 0, usd: 0 });
        return;
      }
      const bal = Number(it.balance) || 0;
      if (bal <= 0.01) return; // credits and settled residues are not ageing debt (web)
      if (!date) {
        undated.count++;
        add(undated.byCur, it.cur, bal);
        return;
      }
      const days = Math.floor((asOf.getTime() - new Date(`${date}T00:00:00`).getTime()) / DAY);
      const b = aging[AGE.findIndex((a) => days <= a.maxDays)] || aging[aging.length - 1];
      b.count++;
      add(b.byCur, it.cur, bal);
    })
  );
  const receivablesPending: ByCur = {};
  receivableCounterparties.forEach((c) => Object.entries(c.pendingByCur || {}).forEach(([k, v]) => add(receivablesPending, k, v)));

  // ── payables ──
  const supplierCounterparties = [...data.suppliersNoPayment, ...data.suppliersWithBalance];
  let payablesPendingUsd = 0;
  supplierCounterparties.forEach((c) =>
    c.items.forEach((it: any) => {
      const ref = String(it.inv ?? '');
      rows.push({ section: 'Payables', party: c.name, ref, po: it.order || '', date: '', description: '', cur: it.cur, amount: Number(it.invValue) || 0, balance: Number(it.balance) || 0, status: it.pending ? 'Pending' : '' });
      if (it.pending) {
        const usd = Number(it.usd) || 0;
        payablesPendingUsd += usd;
        holds.push({ kind: 'Supplier invoice', party: c.name, ref, cur: it.cur, amount: Number(it.balance) || 0, usd });
      }
    })
  );

  // ── stock ──
  const whMap = new Map<string, { name: string; paidUsd: number; unpaidUsd: number; lots: number }>();
  const stockRows = (list: typeof data.stocksPaid, paid: boolean) =>
    list.forEach((w) => {
      const name = opts.warehouseName(w.stock);
      const e = whMap.get(w.stock) || { name, paidUsd: 0, unpaidUsd: 0, lots: 0 };
      if (paid) e.paidUsd += w.total;
      else e.unpaidUsd += w.total;
      e.lots += w.count;
      whMap.set(w.stock, e);
      w.items.forEach((l) => {
        rows.push({ section: paid ? 'Stocks - Paid' : 'Stocks - UnPaid', party: name, ref: '', po: l.order, date: '', description: l.description, cur: l.cur, amount: l.total, balance: l.total, status: l.pending ? 'Pending' : '' });
        if (l.pending) holds.push({ kind: 'Stock', party: name, ref: `PO ${l.order || '—'} · ${l.description}`, cur: l.cur, amount: l.total, usd: 0 });
      });
    });
  stockRows(data.stocksPaid, true);
  stockRows(data.stocksUnpaid, false);

  // ── expenses ──
  data.expenseSuppliers.forEach((c) =>
    c.items.forEach((it: any) =>
      rows.push({ section: 'Expenses', party: c.name, ref: String(it.expense ?? ''), po: it.order || '', date: String(it.date || '').slice(0, 10), description: it.expType || '', cur: it.cur, amount: Number(it.amount) || 0, balance: Number(it.amount) || 0, status: '' })
    )
  );

  // ── unsold ──
  data.unsoldBySupplier.forEach((u) =>
    u.items.forEach((l: any) =>
      rows.push({ section: 'Unsold Stocks', party: u.name, ref: '', po: l.order || '', date: '', description: l.description || '', cur: l.cur || u.cur, amount: Number(l.total) || 0, balance: Number(l.total) || 0, status: '' })
    )
  );

  const position = opts.isAdmin
    ? {
        left: [
          { label: 'Future (margins)', usd: data.incoming },
          { label: 'Opening entries', usd: data.manual.initial },
          { label: 'Stocks paid', usd: data.stocksPaidTotal },
          { label: 'Stocks unpaid', usd: data.stocksUnpaidTotal },
          { label: 'Client receivables', usd: data.kpi.clientsDue },
          { label: 'Financing (left)', usd: data.manual.financedLeft },
        ],
        right: [
          { label: 'Supplier payables', usd: data.payablesUsd },
          { label: 'Unpaid expenses', usd: data.expensesUsd },
          { label: 'Financing (right)', usd: data.manual.financedRight },
        ],
        totalLeft: data.totalLeft,
        totalRight: data.totalRight,
        balance: data.balance,
      }
    : null;

  return {
    asOf: asOf.toISOString().slice(0, 10),
    position,
    receivables: { byCur: { ...data.receivablesByCur }, pendingByCur: receivablesPending, aging, undated, parties: mergeParties([receivableCounterparties]) },
    payables: { usd: data.payablesUsd, pendingUsd: payablesPendingUsd, parties: mergeParties([supplierCounterparties]) },
    stock: {
      paidUsd: data.stocksPaidTotal,
      unpaidUsd: data.stocksUnpaidTotal,
      pendingUsd: data.stocksUnpaid.reduce((s, w) => s + (w.pendingTotal || 0), 0),
      warehouses: [...whMap.values()].sort((a, b) => b.paidUsd + b.unpaidUsd - (a.paidUsd + a.unpaidUsd)),
    },
    expenses: { usd: data.expensesUsd, parties: mergeParties([data.expenseSuppliers]) },
    unsold: {
      byCur: { ...data.unsoldByCur },
      parties: data.unsoldBySupplier.map((u) => ({ name: u.name, cur: u.cur, total: u.total, lines: u.items.length })).sort((a, b) => b.total - a.total),
    },
    holds: holds.sort((a, b) => Math.abs(b.usd || b.amount) - Math.abs(a.usd || a.amount)),
    rows,
  };
}
