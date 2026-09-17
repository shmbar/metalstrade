'use client';

// Excel export for a Quick Sum selection.
//
// Lives here rather than in the fifteen per-page excel.js files: Quick Sum is a
// property of the shared table toolbar, so one implementation covers every page
// that switches it on, and a page added later gets the export for free.
//
// What it writes: the SELECTED rows, in the columns currently visible, in the
// order they appear on screen — then the same totals the bar is showing, one row
// per currency bucket so a mixed $/€ selection stays honest instead of being
// added into a single meaningless figure.
//
// Dressed like every other export in the app (Stocks, Invoices, Contracts, the
// Cashflow selection basket): purple header band with white bold 12pt, thin borders
// on every cell, light-blue bordered total rows. It used to write a bold header and
// nothing else — prices came out as 8460 and 62516.92462, quantities as text, and
// columns sized to the header cut "751 Microgranules" off mid-word.
//
// Values go in as NUMBERS wherever the column is numeric, so the recipient can
// re-sum them in Excel; formatting is applied as a number format, not by writing
// a pre-formatted string.

import { saveAs } from 'file-saver';
import { toNumber } from './numberUtils';
import { numberKind } from './columnKind';
import { detectNumericCols } from './detectNumericCols';
import { getCurrency } from './useQuickSum';
import { curCode } from '../../../utils/currency';

const BUCKET_LABEL = { USD: 'Total (USD)', EUR: 'Total (EUR)', plain: 'Total' };
const BUCKET_ORDER = ['USD', 'EUR', 'plain'];

// Same values as app/(root)/cashflow/sumBasket.js and the per-page excel.js files.
const HEADER_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: '800080' } };
const HEADER_FONT = { bold: true, size: 12, color: { argb: 'FFFFFF' } };
const TOTAL_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'BFDBFE' } };
const THIN_BORDER = {
    top: { style: 'thin' }, left: { style: 'thin' },
    bottom: { style: 'thin' }, right: { style: 'thin' },
};

const FMT = {
    USD: '"$"#,##0.00',
    EUR: '"€"#,##0.00',
    money: '#,##0.00',          // a money column on a row with no known currency
    quantity: '#,##0.000',
};

// What the number format will show, for sizing the column — Excel has no autofit.
const shown = (n, fmt) => {
    if (typeof n !== 'number') return String(n ?? '');
    const decimals = fmt === FMT.quantity ? 3 : fmt ? 2 : 0;
    const body = n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: fmt ? decimals : 6 });
    return fmt === FMT.USD || fmt === FMT.EUR ? `$${body}` : body;
};

// react-table hands back whatever the accessor returned — sometimes an object or
// an array (a supplier record, a list of invoice refs). Excel can only take a
// scalar, so anything else becomes its readable form rather than "[object Object]".
const cellText = (v) => {
    if (v == null) return '';
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return v;
    if (Array.isArray(v)) return v.map(x => cellText(x)).filter(Boolean).join(', ');
    if (typeof v === 'object') return v.nname ?? v.name ?? v.label ?? v.title ?? v.id ?? '';
    return String(v);
};

// What a cell SHOWS, not what it stores. Most columns hold a settings id and
// resolve it in their cell renderer, so exporting the accessor value verbatim put
// raw ids in the spreadsheet — "3c760818-faae-…" under Consignee. meta.options is
// the id→label map those columns already carry (the global search reads it for the
// same reason), so it resolves them all rather than one column at a time.
const displayValue = (col, raw) => {
    const opts = col.columnDef?.meta?.options;
    if (Array.isArray(opts) && opts.length && (typeof raw === 'string' || typeof raw === 'number')) {
        const hit = opts.find(o => String(o.value) === String(raw));
        if (hit) return hit.label ?? raw;
    }
    // Currency is stored three different ways across the app ('us' / 'USD' / '$').
    // utils/currency names the code as the form exports should carry.
    if ((col.columnDef?.accessorKey ?? col.id) === 'cur' && raw) return curCode(raw) || raw;
    return raw;
};

const headerText = (col) => {
    const h = col.columnDef?.header;
    if (typeof h === 'string') return h;
    if (typeof h === 'number') return String(h);
    return col.id;
};

/**
 * @param table            the react-table instance
 * @param totals           the `totals` array from useQuickSum
 * @param summedColumnIds  which columns the bar is summing
 * @param filename         base name, no extension
 */
export const exportQuickSum = async ({ table, totals = [], summedColumnIds = [], filename = 'selection' }) => {
    const ExcelJS = (await import('exceljs')).default ?? (await import('exceljs'));
    const rows = table.getSelectedRowModel().rows;
    if (!rows.length) return false;

    // Visible, in on-screen order, minus the checkbox/selection gutter.
    const cols = table.getVisibleLeafColumns()
        .filter(c => c.id !== 'select' && c.id !== 'sum-col' && c.columnDef?.meta?.excludeFromExcel !== true);

    // Every column Quick Sum would call numeric (the same test the column picker
    // uses, so PO# 280526 stays a reference), plus whatever is being summed. Unit
    // prices are not offered for summing but are still numbers to format.
    const numericIds = new Set([
        ...detectNumericCols({ table, sampleSize: 60, includeRates: true }).map(c => c.id),
        ...summedColumnIds,
    ]);
    const totalOf = (id) => totals.find(x => x.id === id);
    // How each numeric column reads. A summed column follows the bar: the bar put a
    // currency on it unless it decided the column is a weight.
    const kindOf = (c) => {
        const t = totalOf(c.id);
        const kind = numberKind(c);
        if (t && t.money === false) return 'quantity';
        if (t && kind === 'plain') return 'money';
        return kind;
    };
    const kinds = Object.fromEntries(cols.filter(c => numericIds.has(c.id)).map(c => [c.id, kindOf(c)]));
    const fmtFor = (id, currency) => {
        const kind = kinds[id];
        if (kind === 'quantity') return FMT.quantity;
        if (kind === 'money') return FMT[currency] || FMT.money;
        return undefined;           // a plain number: Excel's General
    };

    const wb = new ExcelJS.Workbook();
    wb.creator = 'IMS';
    wb.created = new Date();
    // Header stays in view while scrolling a long selection.
    const ws = wb.addWorksheet('Selection', { views: [{ state: 'frozen', ySplit: 1 }] });
    ws.columns = cols.map(c => ({ header: headerText(c), key: c.id }));

    // Longest thing each column has to show, header included.
    const widest = Object.fromEntries(cols.map(c => [c.id, headerText(c).length]));
    const grow = (id, value, fmt) => { widest[id] = Math.max(widest[id], shown(value, fmt).length); };

    const header = ws.getRow(1);
    header.height = 24;
    header.eachCell((cell) => {
        cell.fill = HEADER_FILL;
        cell.font = HEADER_FONT;
        cell.border = THIN_BORDER;
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    });

    for (const r of rows) {
        const currency = getCurrency(r, table);
        const rec = {};
        for (const c of cols) {
            const raw = r.getValue(c.id);
            if (numericIds.has(c.id)) {
                const n = toNumber(raw);
                // A numeric column with a stray non-number keeps the text as shown,
                // rather than becoming a blank that reads as "nothing here".
                rec[c.id] = Number.isFinite(n) ? n : cellText(displayValue(c, raw));
            } else {
                rec[c.id] = cellText(displayValue(c, raw));
            }
        }
        const row = ws.addRow(rec);
        for (const c of cols) {
            const cell = row.getCell(c.id);
            cell.border = THIN_BORDER;
            cell.alignment = { vertical: 'middle' };
            const fmt = typeof cell.value === 'number' ? fmtFor(c.id, currency) : undefined;
            if (fmt) cell.numFmt = fmt;
            grow(c.id, cell.value, fmt);
        }
    }

    // One total row per currency the money columns actually carry. A single-pool
    // figure (a weight, or money with no currency split) rides on the FIRST row
    // rather than getting a row of its own: Quantity + a $/€ Total used to come out
    // as three rows — USD, EUR, and a third holding nothing but the tonnage.
    const buckets = [];
    for (const t of totals) {
        Object.keys(t.byCurrency || {}).forEach(k => { if (!buckets.includes(k)) buckets.push(k); });
    }
    if (!buckets.length && totals.some(t => t.total != null)) buckets.push('plain');
    buckets.sort((a, b) => BUCKET_ORDER.indexOf(a) - BUCKET_ORDER.indexOf(b));

    if (buckets.length) ws.addRow({});

    for (const [bi, bucket] of buckets.entries()) {
        const rec = {};
        let labelled = false;
        for (const c of cols) {
            const t = totalOf(c.id);
            if (!t) {
                // First non-summed column carries the label, so the row is readable.
                if (!labelled) { rec[c.id] = BUCKET_LABEL[bucket] || 'Total'; labelled = true; }
                continue;
            }
            const v = Object.keys(t.byCurrency || {}).length
                ? t.byCurrency[bucket]
                : (bi === 0 ? t.total : undefined);
            if (v != null) rec[c.id] = v;
        }
        const row = ws.addRow(rec);
        // The band runs the full width: addRow only touches cells it was given, so
        // unfilled ones would leave white gaps through it.
        for (const c of cols) {
            const cell = row.getCell(c.id);
            cell.fill = TOTAL_FILL;
            cell.font = { bold: true };
            cell.border = THIN_BORDER;
            cell.alignment = { vertical: 'middle' };
            const t = totalOf(c.id);
            if (!t || typeof cell.value !== 'number') continue;
            // A weight keeps three decimals whatever row it lands on, and a single-pool
            // money figure has no currency to claim.
            const split = Object.keys(t.byCurrency || {}).length > 0;
            const fmt = t.money === false ? FMT.quantity : (split ? (FMT[bucket] || FMT.money) : FMT.money);
            cell.numFmt = fmt;
            grow(c.id, cell.value, fmt);
        }
    }

    // Sized to content: a little air, never narrower than a short number, never so
    // wide one long description pushes the rest off screen (it wraps instead).
    for (const c of cols) {
        const col = ws.getColumn(c.id);
        col.width = Math.min(Math.max(widest[c.id] + 3, 10), 48);
        if (widest[c.id] + 3 > 48) {
            col.eachCell({ includeEmpty: false }, (cell, rowNumber) => {
                if (rowNumber > 1) cell.alignment = { ...cell.alignment, wrapText: true };
            });
        }
    }

    const buf = await wb.xlsx.writeBuffer();
    saveAs(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
        `${filename}.xlsx`);
    return true;
};

export default exportQuickSum;
