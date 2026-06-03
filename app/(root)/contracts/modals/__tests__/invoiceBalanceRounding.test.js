import { describe, it, expect } from 'vitest';
import { numericFormatter } from 'react-number-format';

// QA characterisation test for the invoice "Balance Due" rounding fix.
//
// Bug: invoice modal rendered Balance Due as Math.ceil(balanceDue*100)/100,
// which always rounds the customer's balance UP a cent, so it could read one
// cent higher than the cashflow "Balance" column for the same invoice.
//
// Important: react-number-format's <NumericFormat decimalScale={2}> TRUNCATES
// the extra decimals (it does NOT round) — e.g. 7200.375 -> "7,200.37",
// 2.675 -> "2.67". Cashflow renders its RAW debtBlnc straight through
// NumericFormat, so it truncates. To match it exactly the invoice must also
// render its RAW balanceDue (no Math.ceil / Math.round pre-step), otherwise a
// half-cent value would round up on the invoice but truncate on cashflow.
//
// Fix (productsTableInvoice.js:713): value={value.balanceDue || 0}.

// The <NumericFormat> props both screens use for a currency balance.
const FMT = { thousandSeparator: true, decimalScale: 2, fixedDecimalScale: true, prefix: '$' };

// Cashflow renders the RAW debtBlnc straight through NumericFormat (funcs.js).
const cashflowDisplay = (raw) => numericFormatter(String(raw), FMT);

// Invoice display variants:
const invoiceOld = (b) => numericFormatter(String(Math.ceil(b * 100) / 100), FMT);   // buggy (ceil)
const invoiceRound = (b) => numericFormatter(String(Math.round(b * 100) / 100), FMT); // 1st attempt (still diverges)
const invoiceNew = (b) => numericFormatter(String(b || 0), FMT);                      // the fix: raw, like cashflow

describe('invoice Balance Due rounding vs cashflow', () => {
  it('proves NumericFormat truncates rather than rounds (why raw-render is required)', () => {
    expect(cashflowDisplay(7200.375)).toBe('$7,200.37');     // not .38
    expect(cashflowDisplay(2.675)).toBe('$2.67');            // not 2.68
    expect(cashflowDisplay(146706.375)).toBe('$146,706.37'); // not .38
  });

  it('reproduces the reported penny gap and fixes it', () => {
    // A raw balance in [7200.37, 7200.38): cashflow truncates to .37, old ceil'd to .38.
    const raw = 7200.372;
    expect(invoiceOld(raw)).toBe('$7,200.38');      // old bug: one cent high
    expect(cashflowDisplay(raw)).toBe('$7,200.37'); // what cashflow shows
    expect(invoiceNew(raw)).toBe('$7,200.37');      // fixed: matches cashflow
  });

  it('shows the interim Math.round fix would STILL diverge on half-cents', () => {
    // Documents why we did not stop at Math.round.
    expect(invoiceRound(7200.375)).toBe('$7,200.38');
    expect(cashflowDisplay(7200.375)).toBe('$7,200.37');
    expect(invoiceNew(7200.375)).toBe('$7,200.37'); // raw-render matches cashflow
  });

  it('invoice (raw) matches cashflow across a full sweep of fractional cents', () => {
    const mismatches = [];
    for (let i = 0; i < 1000; i++) {
      const raw = 7200 + i / 1000; // 7200.000 .. 7200.999
      if (invoiceNew(raw) !== cashflowDisplay(raw)) {
        mismatches.push({ raw, invoice: invoiceNew(raw), cashflow: cashflowDisplay(raw) });
      }
    }
    expect(mismatches).toEqual([]);
  });

  it('matches on classic float-rounding boundaries', () => {
    for (const v of [1.005, 2.675, 0.125, 5.555, 1.015, 0.005, 7200.998, 1000000.005]) {
      expect(invoiceNew(v)).toBe(cashflowDisplay(v));
    }
  });

  it('matches on negative balances (credit notes / overpayment)', () => {
    for (const v of [-7200.372, -0.125, -1234.565, -0.005, -2.675]) {
      expect(invoiceNew(v)).toBe(cashflowDisplay(v));
    }
  });

  it('renders an empty/blank balanceDue as $0.00 (no NaN/blank regression)', () => {
    expect(invoiceNew('')).toBe('$0.00');
    expect(invoiceNew(0)).toBe('$0.00');
    expect(invoiceNew(undefined)).toBe('$0.00');
  });
});

// Store-time rounding (productsTableInvoice.js handleKeyPress1 / handleKeyPress2).
// These model what we now WRITE to balanceDue/totalPrepayment. The point is that
// the stored number is a clean 2-decimal value, so every surface agrees no matter
// whether it truncates (screen/cashflow) or rounds (the PDF's Intl.NumberFormat).

// PDF renders via Intl.NumberFormat currency, which ROUNDS (not truncates).
const pdfDisplay = (v) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(v);

const storeFromPercentage = (totalAmount, pct) => ({
  totalPrepayment: Math.round((pct / 100 * totalAmount) * 100) / 100,
  balanceDue: Math.round((totalAmount - pct / 100 * totalAmount) * 100) / 100,
});
const storeFromPrepayment = (totalAmount, prepayment) => ({
  balanceDue: Math.round((totalAmount - prepayment) * 100) / 100,
});

const isCleanCents = (n) => Math.round(n * 100) / 100 === n;

describe('store-time rounding keeps balanceDue clean (screen == PDF)', () => {
  it('stores a clean 2-decimal balanceDue from a percentage', () => {
    // 95.32% of 153,906.75 = 146,704.1133 -> prepayment & balance must be clean cents.
    const { totalPrepayment, balanceDue } = storeFromPercentage(153906.75, 95.32);
    expect(isCleanCents(totalPrepayment)).toBe(true);
    expect(isCleanCents(balanceDue)).toBe(true);
    // screen (truncate) and PDF (round) now show the same cent:
    expect(invoiceNew(balanceDue)).toBe(pdfDisplay(balanceDue));
  });

  it('stores a clean balanceDue from a typed prepayment', () => {
    const { balanceDue } = storeFromPrepayment(153906.75, 146706.37);
    expect(isCleanCents(balanceDue)).toBe(true);
    expect(balanceDue).toBe(7200.38);
    expect(invoiceNew(balanceDue)).toBe(pdfDisplay(balanceDue)); // both "$7,200.38"
  });

  it('screen and PDF agree for many percentage splits (previously could differ 1c)', () => {
    const total = 153906.75;
    const mismatches = [];
    for (let pct = 0; pct <= 100; pct += 0.01) {
      const p = Math.round(pct * 100) / 100; // valid 2dp percentage input
      const { balanceDue } = storeFromPercentage(total, p);
      if (invoiceNew(balanceDue) !== pdfDisplay(balanceDue)) {
        mismatches.push({ pct: p, balanceDue, screen: invoiceNew(balanceDue), pdf: pdfDisplay(balanceDue) });
      }
    }
    expect(mismatches).toEqual([]);
  });
});
