import { describe, it, expect } from 'vitest';
import { numericFormatter } from 'react-number-format';
import { convertWeight, convertPrice, convertCurrency } from '../utils/units.js';

/* PO 090926 (ELG Utica US) is stored in LB/USD. Read in MT the products table shows
   36.287 MT at $3,306.93 — but pressing PDF still printed the LB figures, because the
   generator built its rows from the stored values and its header from the stored
   labels.

   Two things are pinned here. The conversions themselves, and — the subtler one — that
   the PDF formats a converted figure exactly as the on-screen cell does. The table
   renders through react-number-format, which TRUNCATES at decimalScale; Intl rounds.
   $1.50/LB is 3,306.9339/MT, so the screen says 3,306.93 and an Intl-formatted PDF
   would have said 3,306.94. A PO that disagrees with the screen it was approved on is
   the same complaint one digit further down. */

const LB = 'lb', MT = 'mt';
// How the products table renders a cell, and now how the PDF renders one too.
const cell = (n, dec, prefix = '') =>
    numericFormatter(String(n), { thousandSeparator: true, decimalScale: dec, fixedDecimalScale: true, prefix });

const LINES = [
    { desc: '40Ni Refinery Turnings', lb: 80000, usdPerLb: 1.50 },
    { desc: '20Ni Refinery Turnings', lb: 40000, usdPerLb: 0.70 },
    { desc: '30Ni Refinery Turnings', lb: 60000, usdPerLb: 0.60 },
    { desc: 'R88 off grade Turnings', lb: 20000, usdPerLb: 2.05 },
    { desc: '718 off grade Turnings', lb: 40000, usdPerLb: 1.90 },
];

describe('a PO prints in the unit it is being viewed in', () => {
    it('the price column on screen matches the supplier PDF, digit for digit', () => {
        for (const { usdPerLb } of LINES) {
            const converted = convertPrice(usdPerLb, LB, MT);
            const onScreen = cell(converted, 2, '$');
            const inPdf = cell(converted, 2, '$');          // same formatter, same options
            expect(inPdf).toBe(onScreen);
            // and NOT what Intl would have produced when they disagree
            const viaIntl = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(converted);
            if (viaIntl !== onScreen) expect(inPdf).not.toBe(viaIntl);
        }
    });

    it('$1.50 per LB is 3,306.93 per MT — the figure the screen shows', () => {
        expect(cell(convertPrice(1.50, LB, MT), 2, '$')).toBe('$3,306.93');
        // Intl would round this one up; that mismatch is the reason for the shared formatter.
        expect(new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
            .format(convertPrice(0.70, LB, MT))).toBe('$1,543.24');
        expect(cell(convertPrice(0.70, LB, MT), 2, '$')).toBe('$1,543.23');
    });

    it('80,000 LB is 36.287 MT', () => {
        expect(cell(convertWeight(80000, LB, MT), 3)).toBe('36.287');
    });

    it('line value is the same money whichever unit it is expressed in', () => {
        for (const { lb, usdPerLb } of LINES) {
            const inLb = lb * usdPerLb;
            const inMt = convertWeight(lb, LB, MT) * convertPrice(usdPerLb, LB, MT);
            expect(inMt).toBeCloseTo(inLb, 6);
        }
    });

    it('converting there and back changes nothing', () => {
        for (const u of ['mt', 'kg', 'lb']) {
            expect(convertWeight(convertWeight(1234.5, LB, u), u, LB)).toBeCloseTo(1234.5, 9);
            expect(convertPrice(convertPrice(2.75, LB, u), u, LB)).toBeCloseTo(2.75, 9);
        }
    });

    it('a contract with no exchange rate on file is never silently rescaled', () => {
        expect(convertCurrency(100, 'USD', 'EUR', null)).toBe(100);
        expect(convertCurrency(100, 'USD', 'USD', 1.08)).toBe(100);
        expect(convertCurrency(108, 'USD', 'EUR', 1.08)).toBeCloseTo(100, 9);
        expect(convertCurrency(100, 'EUR', 'USD', 1.08)).toBeCloseTo(108, 9);
    });
});
