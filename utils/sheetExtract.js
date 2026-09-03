// Spreadsheet → text, for /api/ai/document-reader.
//
// Packing lists and assay certificates arrive as .xlsx at least as often as PDF
// (Zak, 2026-08-26). A spreadsheet is the easiest document this reader will ever
// see: the grid is already exact, so there is nothing to OCR and nothing to
// reconstruct — the cells go down the same TEXT path a digital PDF uses, and the
// model is told not to second-guess a layout it can trust.
//
// exceljs is already a dependency (the Excel exports use it), so this adds no
// weight to the bundle it isn't already carrying.

import ExcelJS from 'exceljs';

// Belt and braces: Windows reports .csv as application/vnd.ms-excel about as
// often as text/csv, and .xlsx occasionally arrives as octet-stream from a
// mail client. Extension is the more reliable signal of the two, so both are
// consulted and either one is enough.
const SHEET_MIME = new Set([
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel',                                          // .xls, and .csv on Windows
    'text/csv',
    'application/csv',
]);

export function isSpreadsheet(mimeType, fileName = '') {
    const ext = String(fileName).toLowerCase().split('.').pop();
    return SHEET_MIME.has(mimeType) || ['xlsx', 'xlsm', 'csv', 'xls'].includes(ext);
}

export function isLegacyXls(mimeType, fileName = '') {
    // exceljs reads the OOXML formats only. A real BIFF .xls has to be re-saved,
    // and saying so beats a parse error the user cannot act on.
    const ext = String(fileName).toLowerCase().split('.').pop();
    return ext === 'xls' || (mimeType === 'application/vnd.ms-excel' && ext !== 'csv');
}

function isCsv(mimeType, fileName = '') {
    const ext = String(fileName).toLowerCase().split('.').pop();
    return ext === 'csv' || mimeType === 'text/csv' || mimeType === 'application/csv';
}

/* A cell's value is not always a string: exceljs hands back Dates, formula
   objects ({ formula, result }), rich text runs and hyperlink wrappers. Taking
   String() of those puts "[object Object]" in the grid, which is exactly the
   sort of thing the model then invents a number from. */
function cellText(v) {
    if (v == null) return '';
    if (v instanceof Date) return v.toISOString().slice(0, 10);
    if (typeof v === 'object') {
        if (v.result !== undefined) return cellText(v.result);   // formula
        if (Array.isArray(v.richText)) return v.richText.map(r => r.text).join('');
        if (v.text !== undefined) return cellText(v.text);       // hyperlink
        if (v.error) return '';
        return '';
    }
    return String(v);
}

const MAX_ROWS = 500;   // a long packing list, with room to spare
const MAX_COLS = 60;
const MAX_CHARS = 60000;

/**
 * Returns { ok, text, reason }. `text` is the workbook as tab-separated rows,
 * one sheet after another — the shape a model reads most reliably, and the one
 * that keeps a column a column.
 */
export async function extractSheetText(buffer, mimeType, fileName = '') {
    try {
        if (isCsv(mimeType, fileName)) {
            const text = buffer.toString('utf8').slice(0, MAX_CHARS);
            return text.trim() ? { ok: true, text } : { ok: false, reason: 'EMPTY' };
        }

        const wb = new ExcelJS.Workbook();
        await wb.xlsx.load(buffer);

        const out = [];
        let rowBudget = MAX_ROWS;
        wb.eachSheet((sheet) => {
            if (rowBudget <= 0) return;
            const lines = [];
            sheet.eachRow({ includeEmpty: false }, (row) => {
                if (rowBudget <= 0) return;
                const cells = [];
                row.eachCell({ includeEmpty: true }, (cell, col) => {
                    if (col > MAX_COLS) return;
                    cells[col - 1] = cellText(cell.value).replace(/\s+/g, ' ').trim();
                });
                const line = Array.from(cells, c => c || '').join('\t').replace(/\t+$/, '');
                // A row of nothing but empty cells is a spacer, not data — it costs
                // tokens and invites the model to read a gap as a section break.
                if (line.trim()) { lines.push(line); rowBudget -= 1; }
            });
            if (lines.length) out.push(`--- Sheet: ${sheet.name} ---\n${lines.join('\n')}`);
        });

        const text = out.join('\n\n').slice(0, MAX_CHARS);
        return text.trim() ? { ok: true, text } : { ok: false, reason: 'EMPTY' };
    } catch (e) {
        return { ok: false, reason: 'FAILED', message: e?.message || String(e) };
    }
}
