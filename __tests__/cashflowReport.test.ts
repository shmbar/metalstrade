// Cashflow report (app/(root)/cashflow/report.js) — the object behind the Report dialog
// and the Excel export. Its one promise is that it reconciles with the page: every
// section total is the page's own figure, Left/Right add up the way page.js adds them,
// and Pending holds stay out of the totals but are never lost. Like the page it is in
// dollars, a euro line at the rate the page loaded with (`fx`, 2026-10-07).
import { describe, expect, it } from 'vitest';
// @ts-ignore — plain JS module
import { buildCashflowReport } from '../app/(root)/cashflow/report.js';
// @ts-ignore — plain JS module
import { eurRateNote } from '../utils/currency.js';
// @ts-ignore — plain JS module, the phone's byte-identical copy
import { eurRateNote as phoneEurRateNote } from '../mobile/src/shared/currency.js';

const names = {
  client: (id: string) => ({ c1: 'Acme', c2: 'Borealis' } as any)[id] || `client ${id}`,
  supplier: (id: string) => ({ s1: 'Triart', s2: 'Buss' } as any)[id] || `supplier ${id}`,
  warehouse: (id: string) => ({ w1: 'Seagull' } as any)[id] || `wh ${id}`,
  expType: () => 'Freight',
};

const clientRow = (over: any) => ({
  client: 'c1', cur: 'us', invoice: 1001, totalAmount: 1000, debtBlnc: 1000, payments: [],
  poSupplier: { order: 'PO-1' }, shipData: { etd: { startDate: '2026-08-01' } }, date: '2026-08-01', ...over,
});
const supplierRow = (over: any) => ({
  supplier: 's1', cur: 'us', order: '280526', invoice: '280526-3', invValue: 500, pmnt: 0, blnc: 500,
  euroToUSD: 1.1, orderData: { id: 'con-1', date: '2026-05-28' }, ...over,
});

const world = (over: any = {}) => {
  const clientRows = [
    clientRow({ invoice: 1001, debtBlnc: 1000, totalAmount: 1000 }),
    clientRow({ invoice: 1002, debtBlnc: 400, totalAmount: 400, pending: true }),
    clientRow({ client: 'c2', invoice: 2001, debtBlnc: 300, totalAmount: 500, payments: [{ pmnt: 200 }], date: '2026-01-10' }),
  ];
  const supplierRows = [
    supplierRow({}),
    supplierRow({ id: 'x', invoice: '280526-5', blnc: 200, invValue: 200, cur: 'eu' }), // 220 USD
    supplierRow({ supplier: 's2', invoice: '09/2026-3', invValue: 900, pmnt: 100, blnc: 800, pending: true }),
  ];
  return {
    names, isAdmin: true, account: 'IMS', years: [2025, 2026], asOf: new Date('2026-09-29T12:00:00Z'),
    fx: { rate: 1.1, source: 'live', stale: false }, // page.js fxRate
    incoming: 5000,
    initialData: [{ title: 'Airwallex', num: '2000' }],
    financedLeft: [{ title: 'Loan in', num: 100 }],
    financedRight: [{ title: 'Loan out', num: 50 }],
    stockPaid: [{ stock: 'w1', cur: 'us', total: 700 }],
    stockPaidRows: [{ stock: 'w1', cur: 'us', total: 700, qnty: '7', unitPrc: 100, order: 'PO-9', supplier: 's1', descriptionName: 'Ni' }],
    stockUnpaid: [{ stock: 'w1', cur: 'us', total: 300, _pendingBlnc: 150, _pendingCount: 1 }],
    stockUnpaidRows: [
      { stock: 'w1', cur: 'us', total: 300, qnty: '3', unitPrc: 100, order: 'PO-8', supplier: 's1' },
      { stock: 'w1', cur: 'us', total: 150, qnty: '1.5', unitPrc: 100, order: 'PO-7', supplier: 's2', pending: true },
    ],
    clientRows,
    // the page's aggregates (getTotals): active figure + the hold beside it
    clientsPayment: [{ client: 'c1', cur: 'us', debtBlnc: 1000, _pendingBlnc: 400, _pendingCount: 1 }],
    clientsBalances: [{ client: 'c2', cur: 'us', debtBlnc: 300, _pendingBlnc: 0, _pendingCount: 0 }],
    supplierRows,
    suppliersPayment: [{ supplier: 's1', blnc: 720, _pendingBlnc: 0, _pendingCount: 0 }],
    suppliersBalances: [{ supplier: 's2', blnc: 0, _pendingBlnc: 800, _pendingCount: 1 }],
    expenses: [{ supplier: 's1', amount: 110 + 10 }], // the page's vendor row: €100 at 1.1 + $10
    expenseRows: [
      { supplier: 's1', cur: 'eu', amount: 100, expense: 'E-1', expType: 't', date: '2026-09-01' },
      { supplier: 's1', cur: 'us', amount: 10, expense: 'E-2', expType: 't', date: '2026-09-02' },
    ],
    unsold: [{ supplier: 's1', supplierName: 'Triart', cur: 'us', total: 900 }],
    unsoldRows: [{ supplier: 's1', order: 'PO-5', description: 'Mo', stockName: 'Seagull', qnty: 9, unitPrc: 100, total: 900, cur: 'us' }],
    ...over,
  };
};

describe('cashflow report', () => {
  it('section totals are the page figures, holds carried beside them', () => {
    const r = buildCashflowReport(world());
    const s = Object.fromEntries(r.sections.map((x: any) => [x.key, x]));
    expect(s.clientsPayment.total).toBe(1000);
    expect(s.clientsPayment.pendingTotal).toBe(400);
    expect(s.suppliersPayment.total).toBe(720);
    expect(s.suppliersBalances.total).toBe(0);
    expect(s.suppliersBalances.pendingTotal).toBe(800);
    expect(s.stocksUnpaid.total).toBe(300);
    expect(s.expenses.total).toBe(120);
    expect(s.unsold.total).toBe(900);
  });

  it('Left / Right add up the way page.js adds Total (Left) and Total (Right)', () => {
    const r = buildCashflowReport(world());
    // page.js: incoming + initialData + stocks paid + unpaid + both client sections + financedLeft
    expect(r.position.leftTotal).toBeCloseTo(5000 + 2000 + 700 + 300 + 1000 + 300 + 100, 6);
    // page.js: both supplier sections + expenses + financedRight
    expect(r.position.rightTotal).toBeCloseTo(720 + 0 + 120 + 50, 6);
    expect(r.position.balance).toBeCloseTo(r.position.leftTotal - r.position.rightTotal, 6);
    expect(r.position.left.reduce((t: number, l: any) => t + l.share, 0)).toBeCloseTo(1, 6);
  });

  it('non-admins get no position block, as the page hides Left/Right from them', () => {
    expect(buildCashflowReport(world({ isAdmin: false })).position).toBeNull();
  });

  it('a party row sums its ACTIVE invoices and shows the hold in its own column', () => {
    const r = buildCashflowReport(world());
    const acme = r.sections.find((x: any) => x.key === 'clientsPayment').parties[0];
    expect(acme.name).toBe('Acme');
    expect(acme.rows).toHaveLength(2); // the held invoice is listed…
    expect(acme.summary.count).toBe(2);
    expect(acme.summary.amount).toBe(1000); // …but not summed
    expect(acme.summary.balance).toBe(1000);
    expect(acme.summary.hold).toBe(400);
    expect(acme.summary.status).toBe('1 pending');
    expect(acme.rows[1].status).toBe('Pending');
  });

  it('mixed currencies are never added together — only USD columns and the page figure', () => {
    const r = buildCashflowReport(world());
    const triart = r.sections.find((x: any) => x.key === 'suppliersPayment').parties[0];
    expect(triart.summary.cur).toBe('Mixed');
    expect(triart.summary.value).toBeUndefined(); // USD 500 + EUR 200 is not 700 of anything
    expect(triart.summary.balanceUsd).toBeCloseTo(500 + 200 * 1.1, 6);
    expect(triart.rows[1].balanceUsd).toBeCloseTo(220, 6); // getTotalsSupPayments' conversion
  });

  it('a euro line is converted at the PAGE\'s rate, never the one its PO was saved at', () => {
    const r = buildCashflowReport(world({ fx: { rate: 1.25, source: 'live' } }));
    const triart = r.sections.find((x: any) => x.key === 'suppliersPayment').parties[0];
    expect(triart.rows[1].balance).toBe(200); // the line keeps its own euros…
    expect(triart.rows[1].cur).toBe('eu');
    expect(triart.rows[1].balanceUsd).toBeCloseTo(250, 6); // …and its dollars at 1.25, not the PO's 1.1
    const exp = r.sections.find((x: any) => x.key === 'expenses').parties[0];
    expect(exp.rows.map((x: any) => x.usd)).toEqual([125, 10]);
  });

  it('a euro client invoice is in dollars everywhere a figure is added — section, ageing, holds', () => {
    const eu = { client: 'c2', cur: 'eu', invoice: 41, totalAmount: 117260, debtBlnc: 117260, payments: [],
      poSupplier: { order: 'PO-41' }, date: '2026-09-20' };
    const r = buildCashflowReport(world({
      fx: { rate: 1.125, source: 'live' },
      clientRows: [eu, { ...eu, invoice: 42, debtBlnc: 1000, totalAmount: 1000, pending: true }],
      // the page's aggregate (getTotals): dollars, the held invoice beside it
      clientsPayment: [{ client: 'c2', cur: 'us', debtBlnc: 117260 * 1.125, _pendingBlnc: 1125, _pendingCount: 1 }],
      clientsBalances: [],
    }));
    const sec = r.sections.find((x: any) => x.key === 'clientsPayment');
    const party = sec.parties[0];
    expect(party.rows[0]).toMatchObject({ cur: 'eu', balance: 117260 });
    expect(party.rows[0].balanceUsd).toBeCloseTo(131917.5, 6);
    expect(party.summary.balanceUsd).toBeCloseTo(131917.5, 6); // the page's own figure
    expect(sec.total).toBeCloseTo(131917.5, 6);
    expect(r.receivables.due).toBeCloseTo(131917.5, 6);
    expect(r.receivables.aging[0].amount).toBeCloseTo(131917.5, 6); // 9 days old, in dollars
    expect(r.receivables.notFinalAmount).toBeCloseTo(131917.5, 6);
    const hold = r.holds.find((h: any) => h.section === 'Clients - Payment');
    expect(hold).toMatchObject({ cur: 'us' });
    expect(hold.amount).toBeCloseTo(1125, 6);
  });

  it('says what rate it used and where from — and falls back when the page had none', () => {
    const r = buildCashflowReport(world());
    expect(r.fx).toEqual({ rate: 1.1, source: 'live', stale: false, hasEuro: true });
    const none = buildCashflowReport(world({ fx: undefined }));
    expect(none.fx.rate).toBe(1.08);
    expect(none.fx.source).toBeNull();
    const usdOnly = buildCashflowReport(world({ supplierRows: [supplierRow({})], expenseRows: [] }));
    expect(usdOnly.fx.hasEuro).toBe(false);
  });

  it.each([['web', eurRateNote], ['phone', phoneEurRateNote]])('the rate sentence names its source (%s, utils/currency eurRateNote)', (_app, note: any) => {
    expect(note({ rate: 1.12345, source: 'live' })).toBe('Euro amounts are converted at $1.1235 per € — live rate');
    expect(note({ rate: 1.1, source: 'daily' })).toBe("Euro amounts are converted at $1.1000 per € — today's rate");
    expect(note({ rate: 1.1, source: 'live', stale: true })).toBe('Euro amounts are converted at $1.1000 per € — last rate received');
    expect(note({ rate: 1.08, source: null })).toBe('Euro amounts are converted at $1.0800 per € — the live rate did not answer, so this is a fixed rate');
  });

  it('receivables age from the invoice date and leave held invoices out', () => {
    const r = buildCashflowReport(world());
    const byLabel = Object.fromEntries(r.receivables.aging.map((b: any) => [b.label, b]));
    expect(byLabel['31–60 days'].amount).toBe(1000); // 1 Aug → 29 Sep = 59 days
    expect(byLabel['Over 90 days'].amount).toBe(300); // 10 Jan
    expect(r.receivables.aging.reduce((t: number, b: any) => t + b.count, 0)).toBe(2); // not the held one
    expect(r.receivables.due).toBe(1300);
    expect(r.receivables.pendingCount).toBe(1);
    expect(r.receivables.top[0]).toMatchObject({ name: 'Acme', amount: 1000, count: 1 });
  });

  it('lists every hold, largest first, with the figure its section counts in', () => {
    const r = buildCashflowReport(world());
    expect(r.holds.map((h: any) => [h.section, h.amount])).toEqual([
      ['Supplier - Balances', 800],
      ['Clients - Payment', 400],
      ['Stocks - UnPaid', 150],
    ]);
  });

  it('stock tonnage counts active lines only', () => {
    const r = buildCashflowReport(world());
    expect(r.stock.unpaidQty).toBeCloseTo(3, 6);
    expect(r.stock.paidQty).toBeCloseTo(7, 6);
    expect(r.stock.pendingTotal).toBe(150);
  });
});
