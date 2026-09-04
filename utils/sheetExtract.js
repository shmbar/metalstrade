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

/* ── The grid, kept as a grid ────────────────────────────────────────────────
   Asking the model to retype a 50-heat assay meant it generated a few thousand
   tokens per read, which is what pushed the request past the function's time
   limit however fast the model was (Sharoon's 504, 2026-09-04).

   So the model stops transcribing. It sees a SAMPLE of the sheet and answers a
   small question — which row are the headers on, which column is the weight,
   which column is Ni — and the server then reads every row straight out of the
   cells. Output drops from thousands of tokens to a couple of hundred, the read
   stops depending on how many lots the document has, and the figures are the
   spreadsheet's own rather than a retyped copy of them. */
export async function extractSheetGrid(buffer, mimeType, fileName = '') {
    try {
        if (isCsv(mimeType, fileName)) {
            /* Enough CSV for a packing list: quoted fields with embedded commas
               and doubled quotes. Not a full RFC parser — a spreadsheet export is
               the only thing that reaches here. */
            const rows = [];
            for (const line of buffer.toString('utf8').split(/\r?\n/)) {
                if (!line.trim()) continue;
                const cells = [];
                let cur = '', q = false;
                for (let i = 0; i < line.length; i++) {
                    const ch = line[i];
                    if (q) {
                        if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
                        else if (ch === '"') q = false;
                        else cur += ch;
                    } else if (ch === '"') q = true;
                    else if (ch === ',' || ch === ';') { cells.push(cur.trim()); cur = ''; }
                    else cur += ch;
                }
                cells.push(cur.trim());
                rows.push(cells);
                if (rows.length >= MAX_ROWS) break;
            }
            return rows.length ? { ok: true, sheets: [{ name: 'CSV', rows }] } : { ok: false, reason: 'EMPTY' };
        }

        const wb = new ExcelJS.Workbook();
        await wb.xlsx.load(buffer);
        const sheets = [];
        let budget = MAX_ROWS;
        wb.eachSheet((sheet) => {
            if (budget <= 0) return;
            const rows = [];
            /* includeEmpty on the ROW iterator matters: a blank row inside a block
               must keep its index, or every row number the model gives back points
               at the wrong line. Blank rows are dropped when the server walks the
               block, not here. */
            sheet.eachRow({ includeEmpty: true }, (row) => {
                if (budget <= 0) return;
                const cells = [];
                row.eachCell({ includeEmpty: true }, (cell, col) => {
                    if (col > MAX_COLS) return;
                    cells[col - 1] = cellText(cell.value).replace(/\s+/g, ' ').trim();
                });
                rows.push(Array.from({ length: cells.length }, (_, i) => cells[i] || ''));
                budget -= 1;
            });
            if (rows.some(r => r.some(c => c))) sheets.push({ name: sheet.name, rows });
        });
        return sheets.length ? { ok: true, sheets } : { ok: false, reason: 'EMPTY' };
    } catch (e) {
        return { ok: false, reason: 'FAILED', message: e?.message || String(e) };
    }
}

/* The first rows of each sheet, numbered, for the model to map. Row numbers are
   0-based per sheet and are the SAME indices the server will use, so a map that
   says "headers on row 3" can be applied without translation. */
export function sampleGrid(sheets, rowsPerSheet = 22) {
    return sheets.map(s => {
        const lines = s.rows.slice(0, rowsPerSheet)
            .map((r, i) => `${i}\t${r.join('\t')}`.replace(/\t+$/, ''));
        const more = s.rows.length > rowsPerSheet ? `\n… ${s.rows.length - rowsPerSheet} further rows, same shape` : '';
        return `--- Sheet: ${s.name} (${s.rows.length} rows) ---\n${lines.join('\n')}${more}`;
    }).join('\n\n').slice(0, MAX_CHARS);
}

const SUMMARY_RE = /^\s*(total|totals|average|avg|sum|grand\s*total|итого|всего|среднее|сред\.?)\b/i;

const toNum = (s) => {
    if (s == null) return null;
    let t = String(s).trim().replace(/\s| /g, '');
    if (!t) return null;
    // "12.500,00" (EU) vs "12,500.00" (UK/US): whichever separator comes last is
    // the decimal one. A lone comma with 1-3 trailing digits is a decimal too.
    const lastDot = t.lastIndexOf('.'), lastComma = t.lastIndexOf(',');
    if (lastDot >= 0 && lastComma >= 0) {
        t = lastComma > lastDot ? t.replace(/\./g, '').replace(',', '.') : t.replace(/,/g, '');
    } else if (lastComma >= 0) {
        t = /,\d{1,3}$/.test(t) ? t.replace(',', '.') : t.replace(/,/g, '');
    }
    t = t.replace(/[^0-9.\-]/g, '');
    if (!t || t === '-' || t === '.') return null;
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
};

/**
 * Walk the real grid using the model's column map. Returns the material rows.
 *
 * `blocks` is what the model answered: one entry per header+data block it found,
 * each naming a sheet, the first data row, and the column index of the material,
 * the weight and each element.
 */
export function readBlocks(sheets, blocks) {
    const bySheet = new Map(sheets.map(s => [s.name, s.rows]));
    const list = (Array.isArray(blocks) ? blocks : []).filter(Boolean);
    const out = [];

    for (let bi = 0; bi < list.length; bi++) {
        const b = list[bi];
        const rows = bySheet.get(b?.sheet) || (sheets.length === 1 ? sheets[0].rows : null);
        if (!rows) continue;
        const elementCols = b?.elementCols && typeof b.elementCols === 'object' ? b.elementCols : {};
        const cols = Object.entries(elementCols).filter(([, i]) => Number.isInteger(i) && i >= 0);
        if (!cols.length) continue;

        const start = Number.isInteger(b?.firstDataRow) ? b.firstDataRow : 0;
        /* Where this block ENDS. A sheet holding two shipments has the second
           block's header a couple of rows below the first block's last lot, and
           a block told only "start here" runs straight through it — reading the
           second shipment's lots twice and hiding the first one's total row
           behind them. The next block on the same sheet is a hard stop. */
        const nextOnSheet = list.slice(bi + 1)
            .filter(x => x?.sheet === b?.sheet)
            .map(x => (Number.isInteger(x?.headerRow) ? x.headerRow : x?.firstDataRow))
            .filter(Number.isInteger)
            .sort((x, y) => x - y)
            .find(x => x > start);
        const declared = Number.isInteger(b?.lastDataRow) ? b.lastDataRow : rows.length - 1;
        const end = Math.min(declared, nextOnSheet != null ? nextOnSheet - 1 : rows.length - 1, rows.length - 1);
        const cell = (r, i) => (Number.isInteger(i) && i >= 0 ? (r[i] ?? '') : '');

        const block = [];
        let blanks = 0;
        for (let i = start; i <= end; i++) {
            const r = rows[i];
            if (!r) continue;
            const material = String(cell(r, b?.materialCol)).trim();
            const elements = {};
            let any = false;
            let textInElementCols = 0;
            for (const [key, idx] of cols) {
                const raw = String(cell(r, idx)).trim();
                const v = toNum(raw);
                if (v != null) { elements[String(key).toLowerCase()] = v; any = true; }
                else if (raw) textInElementCols += 1;
            }
            const weight = toNum(cell(r, b?.weightCol));

            /* A REPEATED HEADER ends the block. When every mapped element column
               holds words rather than numbers, this row is the next table's
               header — a belt to the braces above, for the case where the model
               reported only the first of several blocks. */
            if (!any && textInElementCols >= Math.min(2, cols.length)) break;

            if (!any && weight == null) {
                // A run of blank rows means the block has ended too.
                if (++blanks >= 3) break;
                continue;
            }
            blanks = 0;
            /* "Average" / "Итого" is not always in the column the materials are
               in — on a certificate keyed by heat number it sits in the trailer
               column to its left. Test the row's leading cells, not just the one. */
            const leading = r.slice(0, Math.max(3, (b?.materialCol ?? 0) + 1)).join(' ');
            if (SUMMARY_RE.test(material) || SUMMARY_RE.test(leading)) continue;
            block.push({ material, weight, elements });
        }

        /* The unlabelled total. These sheets end a block with a row that has no
           identifier but real figures — the sum of the weights above it and the
           weighted average of the assays. It is not a bundle, and no wording gives
           it away, so it is caught arithmetically: drop a trailing row whose weight
           is the sum of the rows before it. Repeated, because a block can carry a
           subtotal and then a grand total. */
        for (let guard = 0; guard < 3; guard++) {
            const last = block[block.length - 1];
            if (!last || block.length < 2 || last.material) break;
            const sum = block.slice(0, -1).reduce((s, r) => s + (r.weight || 0), 0);
            if (last.weight != null && sum > 0 && Math.abs(last.weight - sum) <= Math.max(0.5, sum * 0.005)) block.pop();
            else break;
        }
        out.push(...block);
    }
    return out;
}
