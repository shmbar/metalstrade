import { describe, it, expect, vi, beforeAll } from 'vitest';
import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import ExcelJS from 'exceljs';
import { createTable, getCoreRowModel } from '@tanstack/table-core';

// The Quick Sum spreadsheet, read back cell by cell. The client's copy of this file
// had a bold header and nothing else: 8460 under Unit Price, 62516.92462 under
// Total, quantities stored as text and "751 Microgranules" cut off — next to a
// Cashflow export from the same app with the purple header, $ amounts and a
// banded total. These are that client's six Stocks rows.

let saved = null;
vi.mock('file-saver', () => ({
    saveAs: (blob, name) => { saved = { blob, name }; },
}));

const { exportQuickSum } = await import('../components/table/quicksum/exportQuickSum.js');

const ROWS = [
    { order: '210426-1', supplier: 'Triart', stock: 'Triart', descriptionName: '742 Turnings', qnty: '24.444', qTypeTable: 'MT', unitPrc: 8460, total: 206796.24, sType: 'Virtual', cur: 'us' },
    { order: '280526', supplier: 'Triart', stock: 'Seagull', descriptionName: '751 Microgranules', qnty: '6.987', qTypeTable: 'MT', unitPrc: 7300, total: 51005.1, sType: 'Warehouse', cur: 'us' },
    { order: '280526', supplier: 'Triart', stock: 'Seagull', descriptionName: '741 Microgranules', qnty: '10.658', qTypeTable: 'MT', unitPrc: 7325, total: 78069.85, sType: 'Warehouse', cur: 'us' },
    { order: '280526', supplier: 'Triart', stock: 'Triart', descriptionName: '741 Turnings', qnty: '19.758', qTypeTable: 'MT', unitPrc: 8350, total: 164979.3, sType: 'Virtual', cur: 'us' },
    { order: '010726', supplier: 'ELG Utica US', stock: 'SH Bell', descriptionName: '718 Turnings off grade (Ni 50-55)', qnty: '13.833', qTypeTable: 'MT', unitPrc: 4519.47, total: 62516.92462, sType: '', cur: 'eu' },
    { order: '280526', supplier: 'Triart', stock: 'Triart', descriptionName: '742 Turnings', qnty: '18.975', qTypeTable: 'MT', unitPrc: 9435, total: 179029.125, sType: 'Virtual', cur: 'us' },
];

// Headers exactly as the Stocks page shows them.
const COLUMNS = [
    { accessorKey: 'order', header: 'PO#' },
    { accessorKey: 'supplier', header: 'Supplier' },
    { accessorKey: 'stock', header: 'Material warehouse' },
    { accessorKey: 'descriptionName', header: 'Description' },
    { accessorKey: 'qnty', header: 'Quantity' },
    { accessorKey: 'qTypeTable', header: 'Weight type' },
    { accessorKey: 'unitPrc', header: 'Unit Price' },
    { accessorKey: 'total', header: 'Total' },
    { accessorKey: 'sType', header: 'Warehouse type' },
];

const makeTable = () => {
    const table = createTable({
        data: ROWS, columns: COLUMNS,
        getCoreRowModel: getCoreRowModel(),
        state: {}, onStateChange: () => {}, renderFallbackValue: null,
    });
    table.setOptions((prev) => ({
        ...prev,
        state: { ...table.initialState, rowSelection: Object.fromEntries(ROWS.map((_, i) => [i, true])) },
    }));
    return table;
};

let ws;
const col = (header) => {
    let n = 0;
    ws.getRow(1).eachCell((c, i) => { if (c.value === header) n = i; });
    return n;
};
const dataRow = (i) => ws.getRow(i + 2);

beforeAll(async () => {
    const table = makeTable();
    // What the bar shows with Quantity and Total ticked: a weight in one pool, money
    // split by the row's currency.
    const totals = [
        { id: 'qnty', total: 94.655, byCurrency: {}, money: false },
        { id: 'total', total: null, byCurrency: { USD: 679879.615, EUR: 62516.92462 }, money: true },
    ];
    await exportQuickSum({ table, totals, summedColumnIds: ['qnty', 'total'], filename: 'stocks-selection' });
    const buf = Buffer.from(await saved.blob.arrayBuffer());
    // Left in the temp folder so the sheet can be opened and looked at by hand.
    writeFileSync(join(tmpdir(), 'quicksum-export-sample.xlsx'), buf);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf);
    ws = wb.worksheets[0];
});

describe('Quick Sum Excel export — dressed like every other export in the app', () => {
    it('saves under the name it was given', () => {
        expect(saved.name).toBe('stocks-selection.xlsx');
    });

    it('header band is the app export purple with white bold 12pt, bordered, and frozen', () => {
        ws.getRow(1).eachCell((c) => {
            expect(c.fill.fgColor.argb).toMatch(/800080$/);
            expect(c.font).toMatchObject({ bold: true, size: 12 });
            expect(c.font.color.argb).toMatch(/FFFFFF$/);
            expect(c.border.top.style).toBe('thin');
        });
        expect(ws.views[0]).toMatchObject({ state: 'frozen', ySplit: 1 });
    });

    it('prices and totals are numbers in the row\'s own currency, never raw floats', () => {
        const price = col('Unit Price'), total = col('Total');
        expect(dataRow(0).getCell(price)).toMatchObject({ value: 8460, numFmt: '"$"#,##0.00' });
        expect(dataRow(0).getCell(total)).toMatchObject({ value: 206796.24, numFmt: '"$"#,##0.00' });
        // The euro row keeps its €, and the full-precision value stays underneath the
        // two-decimal display so a re-sum in Excel is exact.
        expect(dataRow(4).getCell(price)).toMatchObject({ value: 4519.47, numFmt: '"€"#,##0.00' });
        expect(dataRow(4).getCell(total)).toMatchObject({ value: 62516.92462, numFmt: '"€"#,##0.00' });
    });

    it('quantities are numbers to three decimals, not text', () => {
        const q = col('Quantity');
        ROWS.forEach((r, i) => {
            expect(dataRow(i).getCell(q).value).toBe(Number(r.qnty));
            expect(dataRow(i).getCell(q).numFmt).toBe('#,##0.000');
        });
    });

    it('references stay text, so PO 010726 keeps its leading zero', () => {
        expect(dataRow(4).getCell(col('PO#')).value).toBe('010726');
    });

    it('every data cell is bordered, the empty Warehouse type included', () => {
        ROWS.forEach((_, i) => {
            for (let c = 1; c <= COLUMNS.length; c++) expect(dataRow(i).getCell(c).border?.top?.style).toBe('thin');
        });
    });

    it('columns are sized to their content, so descriptions are not cut off', () => {
        const longest = Math.max(...ROWS.map((r) => r.descriptionName.length));
        expect(ws.getColumn(col('Description')).width).toBeGreaterThanOrEqual(longest);
        expect(ws.getColumn(col('Material warehouse')).width).toBeGreaterThanOrEqual('Material warehouse'.length);
        // "$206,796.24" needs 11 characters.
        expect(ws.getColumn(col('Total')).width).toBeGreaterThanOrEqual(11);
    });

    it('totals are banded light blue across the full width, one row per currency', () => {
        const rows = [];
        ws.eachRow((row) => { if (/^Total/.test(String(row.getCell(1).value))) rows.push(row); });
        expect(rows.map((r) => r.getCell(1).value)).toEqual(['Total (USD)', 'Total (EUR)']);
        for (const r of rows) {
            for (let c = 1; c <= COLUMNS.length; c++) {
                const cell = r.getCell(c);
                expect(cell.fill?.fgColor?.argb).toMatch(/BFDBFE$/);
                expect(cell.font?.bold).toBe(true);
                expect(cell.border?.top?.style).toBe('thin');
            }
        }
        expect(rows[0].getCell(col('Total'))).toMatchObject({ value: 679879.615, numFmt: '"$"#,##0.00' });
        expect(rows[1].getCell(col('Total'))).toMatchObject({ value: 62516.92462, numFmt: '"€"#,##0.00' });
        // The weight lands in the USD row (the first) with its three decimals — never a $.
        expect(rows[0].getCell(col('Quantity'))).toMatchObject({ value: 94.655, numFmt: '#,##0.000' });
    });
});

describe('Quick Sum Excel export — only Quantity ticked (the client\'s file)', () => {
    it('writes one banded "Total" row holding the tonnage, and still formats every price', async () => {
        await exportQuickSum({
            table: makeTable(),
            totals: [{ id: 'qnty', total: 94.655, byCurrency: {}, money: false }],
            summedColumnIds: ['qnty'],
        });
        const wb = new ExcelJS.Workbook();
        await wb.xlsx.load(Buffer.from(await saved.blob.arrayBuffer()));
        const sheet = wb.worksheets[0];
        const totalRows = [];
        sheet.eachRow((row) => { if (/^Total/.test(String(row.getCell(1).value))) totalRows.push(row); });
        expect(totalRows).toHaveLength(1);
        expect(totalRows[0].getCell(1).value).toBe('Total');
        expect(totalRows[0].getCell(5)).toMatchObject({ value: 94.655, numFmt: '#,##0.000' });
        expect(totalRows[0].getCell(9).fill?.fgColor?.argb).toMatch(/BFDBFE$/);
        // Not summed, still money: the column is read as numbers with $/€ either way.
        expect(sheet.getRow(2).getCell(7)).toMatchObject({ value: 8460, numFmt: '"$"#,##0.00' });
        expect(sheet.getRow(6).getCell(8)).toMatchObject({ value: 62516.92462, numFmt: '"€"#,##0.00' });
    });
});
