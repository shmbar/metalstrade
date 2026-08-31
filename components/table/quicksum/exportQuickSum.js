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
// Values go in as NUMBERS wherever the column is numeric, so the recipient can
// re-sum them in Excel; formatting is applied as a number format, not by writing
// a pre-formatted string.

import { saveAs } from 'file-saver';
import { toNumber } from './numberUtils';

const BUCKET_LABEL = { USD: 'Total (USD)', EUR: 'Total (EUR)', plain: 'Total' };
const BUCKET_FMT = { USD: '"$"#,##0.00', EUR: '"€"#,##0.00', plain: '#,##0.000' };

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

    const summed = new Set(summedColumnIds);
    const wb = new ExcelJS.Workbook();
    wb.created = new Date();
    const ws = wb.addWorksheet('Selection');

    ws.columns = cols.map(c => ({
        header: headerText(c),
        key: c.id,
        width: Math.min(Math.max(headerText(c).length + 4, 12), 40),
    }));

    ws.getRow(1).font = { bold: true };
    ws.getRow(1).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

    for (const r of rows) {
        const rec = {};
        for (const c of cols) {
            const raw = r.getValue(c.id);
            // A summed column is numeric by definition — write the number so Excel
            // can total it, not the display string.
            if (summed.has(c.id)) {
                const n = toNumber(raw);
                rec[c.id] = Number.isFinite(n) ? n : '';
            } else {
                rec[c.id] = cellText(raw);
            }
        }
        ws.addRow(rec);
    }

    // Number format for each summed column, so the figures read the way they do on
    // screen. Set BEFORE the total rows below: a column-level format overwrites the
    // cell-level one, so doing this afterwards stripped the $/€ off the totals.
    for (const c of cols) {
        const t = totals.find(x => x.id === c.id);
        if (!t) continue;
        ws.getColumn(c.id).numFmt = t.money === false ? '#,##0.000' : '#,##0.00';
    }

    // Which buckets actually carry a figure? A selection all in dollars gets one
    // total row, not three mostly-empty ones.
    const buckets = [];
    for (const t of totals) {
        const keys = Object.keys(t.byCurrency || {});
        if (keys.length) keys.forEach(k => { if (!buckets.includes(k)) buckets.push(k); });
        else if (t.total != null && !buckets.includes('plain')) buckets.push('plain');
    }
    // Stable, readable order.
    buckets.sort((a, b) => ['USD', 'EUR', 'plain'].indexOf(a) - ['USD', 'EUR', 'plain'].indexOf(b));

    if (buckets.length) ws.addRow({});

    for (const bucket of buckets) {
        const rec = {};
        let labelled = false;
        for (const c of cols) {
            const t = totals.find(x => x.id === c.id);
            if (!t) {
                // First non-summed column carries the label, so the row is readable.
                if (!labelled) { rec[c.id] = BUCKET_LABEL[bucket] || 'Total'; labelled = true; }
                continue;
            }
            const v = Object.keys(t.byCurrency || {}).length
                ? t.byCurrency[bucket]
                : (bucket === 'plain' ? t.total : undefined);
            if (v != null) rec[c.id] = v;
        }
        const row = ws.addRow(rec);
        row.font = { bold: true };
        for (const c of cols) {
            const t = totals.find(x => x.id === c.id);
            if (!t) continue;
            // A non-money column keeps three decimals whatever bucket it lands in.
            row.getCell(c.id).numFmt = t.money === false ? '#,##0.000' : (BUCKET_FMT[bucket] || '#,##0.00');
        }
    }

    const buf = await wb.xlsx.writeBuffer();
    saveAs(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
        `${filename}.xlsx`);
    return true;
};

export default exportQuickSum;
