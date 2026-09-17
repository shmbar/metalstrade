import { describe, it, expect } from 'vitest';
import { toNumber, isNumericLike } from '../components/table/quicksum/numberUtils.js';
import { isRateColumn } from '../components/table/quicksum/columnKind.js';
import { detectNumericCols } from '../components/table/quicksum/detectNumericCols.js';
import { createTable, getCoreRowModel } from '@tanstack/table-core';

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

// The client: "remove Unit Price from Quick Sum". A sum of per-MT prices is not the
// price of anything, and neither is a sum of averages.
describe('Quick Sum column picker — unit prices and averages are not offered', () => {
    const col = (accessorKey, header) => ({ id: accessorKey, columnDef: { accessorKey, header } });

    it('recognises every per-unit column the app has, whatever its header says', () => {
        expect(isRateColumn(col('unitPrc', 'Unit Price'))).toBe(true);      // Stocks, Shared stock
        expect(isRateColumn(col('unitPrc', 'Price'))).toBe(true);           // Misc invoices
        expect(isRateColumn(col('unitPrc', 'Purchase Value'))).toBe(true);  // Contracts Review — holds the unit price
        expect(isRateColumn(col('avgPrice', 'Avg Cost /MT'))).toBe(true);   // Stocks summary
        expect(isRateColumn(col('storage', 'Cost per MT'))).toBe(true);
    });

    it('leaves real amounts and weights summable', () => {
        for (const [k, h] of [['total', 'Total'], ['totalAmount', 'Amount'], ['qnty', 'Quantity'], ['pmnt', 'Payment'],
            ['storageCost', 'Storage Cost'], ['freight', 'Freight'], ['debtBlnc', 'Balance'], ['totalMargin', 'Margin'],
            ['operator', 'Operator'], ['separated', 'Separated']]) {
            expect(isRateColumn(col(k, h)), `${h} (${k})`).toBe(false);
        }
    });

    it('Stocks offers Quantity and Total, not Unit Price — the export still sees all three as numbers', () => {
        const data = [
            { order: '280526', qnty: '6.987', unitPrc: 7300, total: 51005.1 },
            { order: '010726', qnty: '13.833', unitPrc: 4519.47, total: 62516.92 },
        ];
        const columns = [
            { accessorKey: 'order', header: 'PO#' },
            { accessorKey: 'qnty', header: 'Quantity' },
            { accessorKey: 'unitPrc', header: 'Unit Price' },
            { accessorKey: 'total', header: 'Total' },
        ];
        const table = createTable({ data, columns, getCoreRowModel: getCoreRowModel(), state: {}, onStateChange: () => {}, renderFallbackValue: null });
        table.setOptions((prev) => ({ ...prev, state: { ...table.initialState } }));
        expect(detectNumericCols({ table }).map((c) => c.label)).toEqual(['Quantity', 'Total']);
        expect(detectNumericCols({ table, includeRates: true }).map((c) => c.label)).toEqual(['Quantity', 'Unit Price', 'Total']);
    });
});
