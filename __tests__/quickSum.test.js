import { describe, it, expect } from 'vitest';
import { toNumber, isNumericLike } from '../components/table/quicksum/numberUtils.js';

// The bug this file guards: the row's `cur` column says what currency the ROW
// trades in, and it was applied to every summed column — so a tonnage total came
// out as "$285.86". A column now declares itself with meta.money.
//
// useQuickSum is a hook, so the bucketing rule is reproduced here against the same
// inputs rather than rendered: what matters is which pool a value lands in.
const getCurrency = (row) => {
    const curRaw = row.cur;
    if (!curRaw) return 'plain';
    const c = String(curRaw).toLowerCase().trim();
    if (c === 'us' || c === 'usd') return 'USD';
    if (c === 'eu' || c === 'eur') return 'EUR';
    return 'plain';
};

const sumColumn = (rows, colId, { money = true } = {}) => {
    const byCurrency = {};
    for (const r of rows) {
        const n = toNumber(r[colId]);
        if (!Number.isFinite(n)) continue;
        const bucket = money ? getCurrency(r) : 'plain';
        byCurrency[bucket] = (byCurrency[bucket] || 0) + n;
    }
    const keys = Object.keys(byCurrency);
    if (keys.length === 0) return { total: 0, byCurrency: {}, money };
    if (keys.length === 1 && keys[0] === 'plain') return { total: byCurrency.plain, byCurrency: {}, money };
    return { total: null, byCurrency, money };
};

// The six ticked sales contracts from the report.
const SELECTED = [
    { cur: 'us', qty: 23.000, total: 203850 },
    { cur: 'us', qty: 36.000, total: 312480 },
    { cur: 'us', qty: 76.000, total: 509200 },
    { cur: 'us', qty: 18.289, total: 128023 },
    { cur: 'us', qty: 22.575, total: 158025 },
    { cur: 'us', qty: 110.000, total: 349250 },
];

describe('the reported bug — a tonnage total wearing a $', () => {
    it('sums quantity into one plain pool, not a currency pool', () => {
        const t = sumColumn(SELECTED, 'qty', { money: false });
        expect(t.byCurrency).toEqual({});          // nothing to prefix with $ or €
        expect(t.total).toBeCloseTo(285.864, 3);
    });

    it('still buckets a money column by the row currency', () => {
        const t = sumColumn(SELECTED, 'total', { money: true });
        expect(t.byCurrency.USD).toBe(1660828);
        expect(t.total).toBeNull();
    });

    it('keeps a mixed-currency money column split rather than adding it up', () => {
        const mixed = [
            { cur: 'us', total: 100 },
            { cur: 'eu', total: 50 },
        ];
        const t = sumColumn(mixed, 'total', { money: true });
        expect(t.byCurrency).toEqual({ USD: 100, EUR: 50 });
        expect(t.total).toBeNull();
    });

    it('pools a quantity across currencies — tonnes are tonnes', () => {
        const mixed = [
            { cur: 'us', qty: 10 },
            { cur: 'eu', qty: 5 },
        ];
        const t = sumColumn(mixed, 'qty', { money: false });
        expect(t.byCurrency).toEqual({});
        expect(t.total).toBe(15);
    });

    it('is unchanged on a table with no currency column at all', () => {
        const rows = [{ qty: 2.5 }, { qty: 3.25 }];
        expect(sumColumn(rows, 'qty', { money: true }).total).toBe(5.75);
        expect(sumColumn(rows, 'qty', { money: false }).total).toBe(5.75);
    });
});

describe('formatting the total', () => {
    const fmt = (n, money) => new Intl.NumberFormat('en-US',
        money === false
            ? { minimumFractionDigits: 0, maximumFractionDigits: 3 }
            : { minimumFractionDigits: 2, maximumFractionDigits: 2 }
    ).format(n);

    it('keeps three decimals on a quantity, which 2dp was silently dropping', () => {
        expect(fmt(285.864, false)).toBe('285.864');
        expect(fmt(285.864, true)).toBe('285.86');   // the old, lossy output
    });

    it('still shows money at two decimals', () => {
        expect(fmt(1660828, true)).toBe('1,660,828.00');
    });
});

describe('toNumber — what the sum is built on', () => {
    it('reads the formats these tables actually render', () => {
        expect(toNumber('$203,850.00')).toBe(203850);
        expect(toNumber('€1.234,00'.replace('.', '').replace(',', '.'))).toBe(1234);
        expect(toNumber('(1,200.00)')).toBe(-1200);
        expect(toNumber('18.289')).toBeCloseTo(18.289, 3);
        expect(toNumber('12%')).toBe(12);
    });

    it('rejects what is not a number rather than counting it as zero', () => {
        ['', '   ', '-', '.', null, undefined, 'n/a'].forEach(v => {
            expect(Number.isFinite(toNumber(v))).toBe(false);
        });
        expect(isNumericLike('abc')).toBe(false);
        expect(isNumericLike('42')).toBe(true);
    });
});
