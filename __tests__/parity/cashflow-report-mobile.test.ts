import { describe, expect, it } from 'vitest';
import { makeContract, makeInvoice, makePoInvoice, makeSettings } from './_helpers/fixtures';
import { computeCashflow } from '@/features/cashflow/useCashflow';
import { buildCashflowReport } from '@/features/cashflow/cashflowReport';

// The phone's Cashflow report (twin of web cashflow/report.js) is built only from what the
// Cashflow screen computed, so it must reconcile with it figure for figure.
const settings = makeSettings();
const world = (over: Partial<Parameters<typeof computeCashflow>[0]>) =>
  computeCashflow({
    invoices: [], contracts4y: [], contracts2y: [], expenses: [], companyExpenses: [],
    margins: [], cashflowDoc: {}, stocks: [], settings, ...over,
  });
const asOf = new Date('2026-09-30T12:00:00Z');
const report = (d: ReturnType<typeof world>, isAdmin = true) => buildCashflowReport(d, { isAdmin, asOf, warehouseName: (id) => `WH ${id}` });

describe('mobile Cashflow report', () => {
  const invoices = [
    makeInvoice({ id: 'i1', invoice: 1001, totalAmount: 12000, payments: [], date: '2026-09-20', dateRange: { startDate: '2026-09-20', endDate: '2026-09-20' } }),
    makeInvoice({ id: 'i2', invoice: 1002, totalAmount: 4000, payments: [], date: '2026-06-01', dateRange: { startDate: '2026-06-01', endDate: '2026-06-01' } }),
    makeInvoice({ id: 'i3', invoice: 1003, totalAmount: 2500, payments: [], paymentPending: true, client: 'cli-2' }),
  ];
  const contract = makeContract({
    poInvoices: [
      makePoInvoice({ id: 'po-a', inv: 'A', invValue: '10000', pmnt: '0', blnc: '10000', payments: [] }),
      makePoInvoice({ id: 'po-b', inv: 'B', invValue: '3000', pmnt: '0', blnc: '3000', payments: [] }),
    ],
    pendingInvoices: { 'po-b': true },
  });
  const d = world({ invoices, contracts4y: [contract] });
  const r = report(d);

  it('receivables are the screen\'s, and the ageing adds back up to them', () => {
    expect(r.receivables.byCur).toEqual(d.receivablesByCur);
    const aged: Record<string, number> = {};
    [...r.receivables.aging, r.receivables.undated].forEach((b) => Object.entries(b.byCur).forEach(([c, v]) => (aged[c] = (aged[c] || 0) + v)));
    expect(aged.us).toBeCloseTo(d.receivablesByCur.us, 6);
  });

  it('ages each invoice from its own date', () => {
    expect(r.receivables.aging[0].byCur.us).toBeCloseTo(12000, 6); // 10 days
    expect(r.receivables.aging[3].byCur.us).toBeCloseTo(4000, 6);  // ~4 months
  });

  it('holds are carried beside the figures, not in them — and listed, largest first', () => {
    expect(r.receivables.pendingByCur.us).toBeCloseTo(2500, 6);
    expect(r.payables.usd).toBeCloseTo(d.payablesUsd, 6);
    expect(r.payables.usd).toBeCloseTo(10000, 6);
    expect(r.payables.pendingUsd).toBeCloseTo(3000, 6);
    expect(r.holds.map((h) => [h.kind, h.ref])).toEqual([['Supplier invoice', 'B'], ['Client invoice', '1003']]);
  });

  it('the position is admin-only, and equals the screen\'s', () => {
    expect(report(d, false).position).toBeNull();
    expect(r.position?.totalLeft).toBeCloseTo(d.totalLeft, 6);
    expect(r.position?.totalRight).toBeCloseTo(d.totalRight, 6);
    expect(r.position?.balance).toBeCloseTo(d.balance, 6);
  });

  it('every invoice is a row of the export', () => {
    expect(r.rows.filter((x) => x.section === 'Receivables').map((x) => x.ref).sort()).toEqual(['1001', '1002', '1003']);
    expect(r.rows.filter((x) => x.section === 'Payables').map((x) => x.ref).sort()).toEqual(['A', 'B']);
  });

  it('never adds two currencies together', () => {
    const eu = world({ invoices: [...invoices, makeInvoice({ id: 'i4', invoice: 1004, totalAmount: 900, payments: [], cur: 'eu' })] });
    const re = report(eu);
    expect(re.receivables.byCur.eu).toBeCloseTo(900, 6);
    expect(re.receivables.byCur.us).toBeCloseTo(eu.receivablesByCur.us, 6);
  });
});
