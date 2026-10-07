// Cashflow's adders (app/(root)/cashflow/totals.js). Every figure on the page — each
// client, supplier, warehouse and vendor line, the section totals, the cards and the
// left/right balance — is one of these rows or a plain sum of them.
//
// The page is in DOLLARS (2026-10-07): a euro amount goes in at the rate the page loaded
// with — today's live EUR→USD. Before that one page had three rules: client balances and
// stock at face value (GIS #41's €117,260.00 counted as $117,260.00), suppliers at each
// PO's own rate, expenses at a fixed 1.08.
import { describe, expect, it } from 'vitest';
// @ts-ignore — plain JS module
import { getTotals, getTotalsSupPayments, sumUnpaidStocksByWarehouse, warehouseTotals, unsoldBySupplier, vendorTotals } from '../app/(root)/cashflow/totals.js';
// @ts-ignore — plain JS module
import { EUR_USD_FALLBACK } from '../utils/finance.js';

const RATE = 1.125;

describe('clients — getTotals', () => {
  it('a euro balance goes in at the rate, and the row says how many euros it holds', () => {
    const rows = getTotals([
      { client: 'c1', cur: 'us', debtBlnc: 1000 },
      { client: 'c1', cur: 'eu', debtBlnc: 2000 },
      { client: 'c2', cur: 'eu', debtBlnc: 117260 },
    ], RATE);
    const c1 = rows.find((r: any) => r.client === 'c1');
    const c2 = rows.find((r: any) => r.client === 'c2');
    expect(c1.cur).toBe('us');
    expect(c1.debtBlnc).toBeCloseTo(1000 + 2000 * RATE, 6);
    expect(c1._eur).toBeCloseTo(2000, 6);
    // GIS #41: no longer €117,260.00 counted as dollars.
    expect(c2.debtBlnc).toBeCloseTo(117260 * RATE, 6);
    expect(c2.cur).toBe('us');
  });

  it('a finalized invoice spells its currency as an object — still euros', () => {
    const [row] = getTotals([{ client: 'c1', cur: { cur: 'EUR' }, debtBlnc: 100 }], RATE);
    expect(row.debtBlnc).toBeCloseTo(100 * RATE, 6);
  });

  it('re-adding its own output (the sort buttons) changes nothing', () => {
    const once = getTotals([
      { client: 'c1', cur: 'eu', debtBlnc: 2000, shipData: { fnlzing: '4568' } },
      { client: 'c1', cur: 'us', debtBlnc: 500, pending: true },
    ], RATE);
    const again = getTotals(getTotals(once, RATE), RATE);
    expect(again[0].debtBlnc).toBeCloseTo(once[0].debtBlnc, 6);
    expect(again[0]._eur).toBeCloseTo(2000, 6);
    expect(again[0]._pendingBlnc).toBeCloseTo(500, 6);
    expect(again[0]._finCount).toBe(1);
    expect(again[0]._finTotal).toBe(2);
  });

  it('a held invoice stays out of the figure and out of its euro note — converted all the same', () => {
    const [row] = getTotals([
      { client: 'c1', cur: 'eu', debtBlnc: 100, pending: true },
      { client: 'c1', cur: 'us', debtBlnc: 50 },
    ], RATE);
    expect(row.debtBlnc).toBeCloseTo(50, 6);
    expect(row._eur).toBe(0);
    expect(row._pendingBlnc).toBeCloseTo(100 * RATE, 6);
    expect(row._pendingCount).toBe(1);
  });

  it('with no rate at all it uses the fallback, never €1 = $1', () => {
    const [row] = getTotals([{ client: 'c1', cur: 'eu', debtBlnc: 100 }]);
    expect(row.debtBlnc).toBeCloseTo(100 * EUR_USD_FALLBACK, 6);
  });
});

describe('suppliers — getTotalsSupPayments', () => {
  it('a euro PO balance goes in at the page rate, not the rate the PO was saved at', () => {
    const [row] = getTotalsSupPayments([{ supplier: 's1', cur: 'eu', blnc: '1000', euroToUSD: 1.05 }], RATE);
    expect(row.blnc).toBeCloseTo(1000 * RATE, 6);
    expect(row._eur).toBeCloseTo(1000, 6);
  });

  it('a PO saved with no rate no longer turns the section into NaN', () => {
    const [row] = getTotalsSupPayments([{ supplier: 's1', cur: 'eu', blnc: '1000' }], RATE);
    expect(row.blnc).toBeCloseTo(1000 * RATE, 6);
  });

  it('sorting does not convert a second time', () => {
    // An aggregate is dollars already. It used to keep its first PO's `cur: 'eu'` and be
    // multiplied by that PO's rate again on every click of a sort button.
    const once = getTotalsSupPayments([
      { supplier: 's1', cur: 'eu', blnc: '1000', euroToUSD: 1.1 },
      { supplier: 's1', cur: 'us', blnc: '500' },
    ], RATE);
    const sortedTwice = getTotalsSupPayments(getTotalsSupPayments(once, RATE), RATE);
    expect(once[0].cur).toBe('us');
    expect(sortedTwice[0].blnc).toBeCloseTo(500 + 1000 * RATE, 6);
  });

  it('balances stored as text are added as numbers', () => {
    const [row] = getTotalsSupPayments([
      { supplier: 's1', cur: 'us', blnc: '31500' },
      { supplier: 's1', cur: 'us', blnc: '12345' },
    ], RATE);
    expect(row.blnc).toBeCloseTo(43845, 6);
  });

  it('a held purchase invoice is carried beside the figure, in dollars', () => {
    const [row] = getTotalsSupPayments([
      { supplier: 's1', cur: 'eu', blnc: '200', pending: true },
      { supplier: 's1', cur: 'us', blnc: '300' },
    ], RATE);
    expect(row.blnc).toBeCloseTo(300, 6);
    expect(row._pendingBlnc).toBeCloseTo(200 * RATE, 6);
    expect(row._eur).toBe(0);
  });
});

describe('stock', () => {
  it('Stocks - UnPaid: one dollar line per warehouse, held lots beside it', () => {
    const [w] = sumUnpaidStocksByWarehouse([
      { stock: 'w1', cur: 'us', total: 300, qnty: '3' },
      { stock: 'w1', cur: 'eu', total: 200, qnty: '2' },
      { stock: 'w1', cur: 'eu', total: 100, qnty: '1', pending: true },
      { stock: 'w1', cur: 'us', total: '-', qnty: '9' },
    ], RATE);
    expect(w.cur).toBe('us');
    expect(w.total).toBeCloseTo(300 + 200 * RATE, 6);
    expect(w._eur).toBeCloseTo(200, 6);
    expect(w._pendingBlnc).toBeCloseTo(100 * RATE, 6);
    expect(w._pendingCount).toBe(1);
    expect(w.qnty).toBeCloseTo(14, 6);
  });

  it('Stocks - Paid: a warehouse with lots bought in both currencies is one dollar line', () => {
    // runStocks hands in one group per warehouse AND currency.
    const rows = warehouseTotals([
      { stock: 'w1', cur: 'us', qTypeTable: 'mt', qnty: 4, total: 4000 },
      { stock: 'w1', cur: 'eu', qTypeTable: 'mt', qnty: 2, total: 1000 },
      { stock: 'w2', cur: 'eu', qTypeTable: 'mt', qnty: 1, total: 500 },
    ], RATE);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ stock: 'w1', cur: 'us', qnty: 6, _eur: 1000 });
    expect(rows[0].total).toBeCloseTo(4000 + 1000 * RATE, 6);
    expect(rows[1].total).toBeCloseTo(500 * RATE, 6);
  });

  it('Unsold: one dollar line per supplier; lines with no PO number are not listed', () => {
    const rows = unsoldBySupplier([
      { order: 'PO-1', supplier: 's1', cur: 'us', total: 900 },
      { order: 'PO-2', supplier: 's1', cur: 'eu', total: 92895 },
      { order: '', supplier: 's1', cur: 'us', total: 5 },
    ], (id: string) => ({ s1: 'Triart' } as any)[id], RATE);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ supplier: 's1', supplierName: 'Triart', cur: 'us', _eur: 92895 });
    expect(rows[0].total).toBeCloseTo(900 + 92895 * RATE, 6);
  });
});

describe('expenses — vendorTotals', () => {
  it('a euro expense at the rate; one not marked dollars is euros, as its own table reads it', () => {
    const rows = vendorTotals([
      { supplier: 'v1', cur: 'us', amount: '26914.25' },
      { supplier: 'v1', cur: 'eu', amount: '23703.13' },
      { supplier: 'v2', amount: '100' },
    ], RATE);
    const v1 = rows.find((r: any) => r.supplier === 'v1');
    const v2 = rows.find((r: any) => r.supplier === 'v2');
    expect(v1.amount).toBeCloseTo(26914.25 + 23703.13 * RATE, 6);
    expect(v1._eur).toBeCloseTo(23703.13, 6);
    expect(v2.amount).toBeCloseTo(100 * RATE, 6);
  });

  it('an amount that is not a number adds nothing, instead of turning the total into NaN', () => {
    const [v] = vendorTotals([{ supplier: 'v1', cur: 'us', amount: 'abc' }, { supplier: 'v1', cur: 'us', amount: '10' }], RATE);
    expect(v.amount).toBe(10);
  });
});
