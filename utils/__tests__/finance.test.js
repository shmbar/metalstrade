import { describe, it, expect } from 'vitest';
import {
  num,
  resolveCur,
  invoicePaid,
  invoiceBalance,
  isIssued,
  isFinalized,
  isOverdue,
  fx,
  toMT,
  unitOf,
  groupInvoices,
  invoiceRevenue,
  receivables,
  contractPurchaseValue,
  pnl,
  effectiveDueDate,
  agingBuckets,
  DEFAULT_TERM_DAYS,
} from '../finance.js';

const settings = {
  Quantity: { Quantity: [{ id: 'mt', qTypeTable: 'MT' }, { id: 'kg', qTypeTable: 'KGS' }, { id: 'lb', qTypeTable: 'LB' }] },
};

describe('num', () => {
  it('coerces and never returns NaN', () => {
    expect(num('1234.5')).toBe(1234.5);
    expect(num('')).toBe(0);
    expect(num(undefined)).toBe(0);
    expect(num('abc')).toBe(0);
    expect(num(null)).toBe(0);
  });
});

describe('resolveCur', () => {
  it('handles draft id, finalized object, and defaults', () => {
    expect(resolveCur({ cur: 'eu' })).toBe('eu');
    expect(resolveCur({ cur: 'us' })).toBe('us');
    expect(resolveCur({ cur: { cur: 'EUR' } })).toBe('eu');
    expect(resolveCur({ cur: { cur: 'USD' } })).toBe('us');
    expect(resolveCur({})).toBe('us');
  });
});

describe('invoicePaid / invoiceBalance', () => {
  it('sums payments and recomputes balance from totalAmount', () => {
    const inv = { totalAmount: 1000, payments: [{ pmnt: 300 }, { pmnt: '200' }, { pmnt: 'x' }] };
    expect(invoicePaid(inv)).toBe(500);
    expect(invoiceBalance(inv)).toBe(500);
  });
  it('ignores a stored debtBlnc that disagrees (always recompute)', () => {
    const inv = { totalAmount: 1000, debtBlnc: 999, payments: [{ pmnt: 400 }] };
    expect(invoiceBalance(inv)).toBe(600);
  });
});

describe('isIssued / isFinalized', () => {
  it('issued = not draft and not canceled', () => {
    expect(isIssued({})).toBe(true);
    expect(isIssued({ draft: false })).toBe(true);
    expect(isIssued({ draft: true })).toBe(false);
    expect(isIssued({ canceled: true })).toBe(false);
  });
  it('finalized via shipData.fnlzing', () => {
    expect(isFinalized({ shipData: { fnlzing: '4568' } })).toBe(true);
    expect(isFinalized({ shipData: { fnlzing: '2587' } })).toBe(false);
    expect(isFinalized({})).toBe(false);
  });
});

describe('isOverdue', () => {
  const asOf = new Date('2026-06-14');
  it('overdue when issued, owing, and past due date', () => {
    expect(isOverdue({ totalAmount: 100, delDate: '2026-01-01', payments: [] }, asOf)).toBe(true);
  });
  it('not overdue when fully paid, future due, no due date, or draft', () => {
    expect(isOverdue({ totalAmount: 100, delDate: '2026-01-01', payments: [{ pmnt: 100 }] }, asOf)).toBe(false);
    expect(isOverdue({ totalAmount: 100, delDate: '2026-12-31', payments: [] }, asOf)).toBe(false);
    expect(isOverdue({ totalAmount: 100, payments: [] }, asOf)).toBe(false); // no delDate
    expect(isOverdue({ totalAmount: 100, delDate: '2026-01-01', draft: true, payments: [] }, asOf)).toBe(false);
  });
});

describe('effectiveDueDate (default term)', () => {
  it('uses the explicit delivery/due date when present', () => {
    expect(effectiveDueDate({ delDate: '2026-05-14' })).toBe('2026-05-14');
  });
  it('falls back to invoice date + DEFAULT_TERM_DAYS when no due date', () => {
    expect(DEFAULT_TERM_DAYS).toBe(30);
    expect(effectiveDueDate({ date: '2026-01-01' })).toBe('2026-01-31');
    expect(effectiveDueDate({ date: '2026-01-01' }, 60)).toBe('2026-03-02');
  });
  it('returns null when there is no date at all', () => {
    expect(effectiveDueDate({})).toBeNull();
  });
});

describe('isOverdue with default term', () => {
  const asOf = new Date('2026-06-14');
  it('flags an old unpaid invoice with NO due date as overdue (via the 30-day default)', () => {
    expect(isOverdue({ totalAmount: 100, date: '2026-01-01', payments: [] }, asOf)).toBe(true);
  });
  it('a recent invoice (within the term) is not yet overdue', () => {
    expect(isOverdue({ totalAmount: 100, date: '2026-06-10', payments: [] }, asOf)).toBe(false);
  });
});

describe('agingBuckets', () => {
  const asOf = new Date('2026-06-14');
  it('buckets outstanding balances by invoice age, per currency', () => {
    const list = [
      { invoice: 1, cur: 'us', date: '2026-06-01', totalAmount: 100, payments: [] }, // ~13d → 0–30
      { invoice: 2, cur: 'us', date: '2026-05-01', totalAmount: 200, payments: [] }, // ~44d → 31–60
      { invoice: 3, cur: 'eu', date: '2026-01-01', totalAmount: 300, payments: [] }, // ~164d → 90+
      { invoice: 4, cur: 'us', date: '2026-06-01', totalAmount: 50, payments: [{ pmnt: 50 }] }, // settled → excluded
    ];
    const b = agingBuckets(list, { asOf });
    expect(b[0].byCur.us).toBe(100); expect(b[0].count).toBe(1);   // 0–30
    expect(b[1].byCur.us).toBe(200);                               // 31–60
    expect(b[3].byCur.eu).toBe(300);                               // 90+
    expect(b[2].count).toBe(0);                                    // 61–90 empty
  });
});

describe('fx (NaN-safe)', () => {
  it('passes through same currency', () => {
    expect(fx(100, 'us', 1.1, 'us')).toBe(100);
  });
  it('converts EUR→USD with the rate', () => {
    expect(fx(100, 'eu', 1.1, 'us')).toBeCloseTo(110);
  });
  it('falls back to 1:1 on a missing/invalid rate — never NaN', () => {
    expect(fx(100, 'eu', undefined, 'us')).toBe(100);
    expect(fx(100, 'eu', 0, 'us')).toBe(100);
    expect(fx(100, 'eu', 'x', 'us')).toBe(100);
  });
});

describe('toMT', () => {
  it('converts by the contract unit', () => {
    expect(toMT(15000, { qTypeTable: 'kg' }, settings)).toBe(15);     // KGS ÷ 1000
    expect(toMT(2000, { qTypeTable: 'lb' }, settings)).toBe(1);       // LB ÷ 2000
    expect(toMT(15, { qTypeTable: 'mt' }, settings)).toBe(15);        // MT as-is
    expect(toMT(15, { qTypeTable: 'unknown' }, settings)).toBe(15);   // default MT
    expect(unitOf({ qTypeTable: 'kg' }, settings)).toBe('KGS');
  });
});

describe('groupInvoices', () => {
  it('keeps singletons as-is', () => {
    const list = [{ invoice: 1, invType: '1111', totalAmount: 100, payments: [] }];
    expect(groupInvoices(list)).toHaveLength(1);
  });
  it('lets a Final note supersede the original invoice and combines payments', () => {
    const list = [
      { invoice: 5, invType: '1111', totalAmount: 100, payments: [{ pmnt: 30 }] },
      { invoice: 5, invType: 'Final Note', totalAmount: 90, payments: [{ pmnt: 20 }] },
    ];
    const out = groupInvoices(list);
    expect(out).toHaveLength(1);
    expect(out[0].totalAmount).toBe(90);          // FN supersedes
    expect(invoicePaid(out[0])).toBe(50);         // payments combined
    expect(out[0].debtBlnc).toBe(40);
  });
});

describe('invoiceRevenue', () => {
  it('dedupes, excludes drafts/canceled, and splits by currency', () => {
    const list = [
      { invoice: 1, invType: '1111', cur: 'us', totalAmount: 1000, payments: [] },
      { invoice: 2, invType: '1111', cur: 'eu', totalAmount: 500, payments: [] },
      { invoice: 3, invType: '1111', cur: 'us', totalAmount: 999, draft: true, payments: [] }, // excluded
      { invoice: 4, invType: '1111', cur: 'us', totalAmount: 50, canceled: true, payments: [] }, // excluded
    ];
    const rev = invoiceRevenue(list, { base: 'us' });
    expect(rev.byCur.us).toBe(1000);
    expect(rev.byCur.eu).toBe(500);
    expect(rev.base).toBeCloseTo(1000 + 500); // eu has no rate → 1:1 fallback
  });
});

describe('receivables', () => {
  const asOf = new Date('2026-06-14');
  it('keeps currencies separate and splits due/balance + finalized/provisional', () => {
    const list = [
      { invoice: 1, cur: 'us', totalAmount: 1000, payments: [{ pmnt: 200 }], delDate: '2026-01-01', shipData: { fnlzing: '4568' } }, // due 800, finalized
      { invoice: 2, cur: 'us', totalAmount: 500, payments: [], delDate: '2026-12-31' }, // balance 500, provisional
      { invoice: 3, cur: 'eu', totalAmount: 300, payments: [], shipData: { fnlzing: '4568' } }, // balance 300 (no due date), finalized, EUR
      { invoice: 4, cur: 'us', totalAmount: 100, payments: [{ pmnt: 100 }] }, // settled → excluded
      { invoice: 5, cur: 'us', totalAmount: 100, draft: true, payments: [] }, // draft → excluded
    ];
    const { byCur } = receivables(list, { asOf });
    expect(byCur.us.due).toBe(800);
    expect(byCur.us.balance).toBe(500);
    expect(byCur.us.finalized).toBe(800);
    expect(byCur.us.provisional).toBe(500);
    expect(byCur.eu.balance).toBe(300);
    expect(byCur.eu.finalized).toBe(300);
    expect(byCur.us.dueCount).toBe(1);
    expect(byCur.us.balanceCount).toBe(1);
  });
});

describe('contractPurchaseValue', () => {
  it('sums poInvoices and converts to base', () => {
    const con = { cur: 'eu', euroToUSD: 1.1, poInvoices: [{ pmnt: 100 }, { pmnt: 200 }] };
    const v = contractPurchaseValue(con, { base: 'us' });
    expect(v.byCur.eu).toBe(300);
    expect(v.base).toBeCloseTo(330);
  });
});

describe('pnl', () => {
  it('nets revenue minus cost minus expense (basis-agnostic)', () => {
    expect(pnl({ revenue: 1000, cost: 600, expense: 150 }).profit).toBe(250);
    expect(pnl({ revenue: 'x', cost: 600 }).profit).toBe(-600); // NaN-safe inputs
  });
});
