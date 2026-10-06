// The Margins page as an Excel workbook and as a PDF, both printed from one object
// (marginsReport.js buildMarginsReport) — the months, rows and totals as the page lists
// them, the All / shared-only switch and the search applied.
//
// Excel is dressed like every other export in the app (cashflow/excel.js): purple header
// band, white bold 12pt; light-blue totals band with thin borders. The PDF sits on the
// documents' grid (pdfLayout.js) turned landscape — 10 mm margins, a table exactly that
// wide, the documents' fonts, text printed as the screen shows it. exceljs and jsPDF are
// imported on demand so they stay off the first-load bundle.
import { saveAs } from 'file-saver';
import { moneyFull } from '@utils/currency';
import { registerPdfFonts } from '../contracts/modals/pdf/pdfFonts';
import { pdfRows } from '../contracts/modals/pdf/pdfText';
import { LEFT, gridCell } from '../contracts/modals/pdf/pdfLayout';

// The columns of the page's table, in its order. `kind` is how a value is written.
const KINDS = ['date', 'qty', 'text', 'text', 'text', 'money', 'money', 'qty', 'qty', 'money', 'flag'];
const TEXT = (i) => KINDS[i] === 'text';
// A month's four totals, under the columns the page's footer puts them: Qty, Total Margin,
// Open Ship, Remaining.
const totalCells = (label, t) => [label, t.purchase, '', '', '', '', t.totalMargin, '', t.openShip, t.remaining, ''];
// The two tables under the page's months.
const BY_MONTH = ['Months', 'Purchased quantity (MT)', 'Profit', 'Outstanding shipment', 'Remaining'];
const monthCells = (label, t) => [label, t.purchase, t.totalMargin, t.openShip, t.remaining];
const BY_MONTH_KINDS = ['text', 'qty', 'money', 'qty', 'money'];

const printed = () => {
    const d = new Date();
    const mon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()];
    return `${String(d.getDate()).padStart(2, '0')}-${mon}-${d.getFullYear()}`;
};
const subtitle = (rep) => [rep.company, rep.query && `search "${rep.query}"`, `printed ${printed()}`].filter(Boolean).join(' · ');

// ── Excel ───────────────────────────────────────────────────────────────────────────────
const HEADER_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: '800080' } };
const TOTAL_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'BFDBFE' } };
const MONTH_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F3F4F6' } };
const THIN = { style: 'thin', color: { argb: 'D1D5DB' } };
const BORDER = { top: THIN, left: THIN, bottom: THIN, right: THIN };
const MUTED = { argb: '6B7280' };
const NUM_FMT = { money: '"$"#,##0.00', qty: '#,##0.000', date: 'dd.mm.yy' };
const CENTER = { horizontal: 'center', vertical: 'middle' };

// One value into one cell, written as its kind: a figure stays a number Excel can add up.
const put = (cell, v, kind) => {
    if (v === '' || v == null) return;
    cell.value = v;
    if (typeof v === 'number' && NUM_FMT[kind]) cell.numFmt = NUM_FMT[kind];
    if (v instanceof Date) { cell.numFmt = NUM_FMT.date; cell.alignment = CENTER; }
    if (kind === 'flag') cell.alignment = CENTER;
};
// A band: filled and ruled across every column, whether or not a cell holds a value.
const band = (ws, rowNo, from, count, fill, font) => {
    for (let c = from; c < from + count; c++) {
        const cell = ws.getRow(rowNo).getCell(c);
        cell.fill = fill;
        cell.font = font;
        cell.border = BORDER;
    }
};
const WHITE_BOLD = { bold: true, size: 12, color: { argb: 'FFFFFF' } };

export const exportMarginsExcel = async (rep) => {
    const { Workbook } = await import('exceljs');
    const wb = new Workbook();
    wb.creator = rep.company || 'IMS';
    wb.created = new Date();
    const cols = rep.columns.length;

    // ── The months, as the page lists them ──
    const ws = wb.addWorksheet(`Margins ${rep.year}`, { views: [{ state: 'frozen', ySplit: 4 }] });
    ws.columns = [11, 12, 38, 20, 20, 13, 16, 11, 12, 15, 7].map((width) => ({ width }));
    ws.getRow(1).getCell(1).value = rep.title;
    ws.getRow(1).getCell(1).font = { bold: true, size: 14 };
    ws.getRow(2).getCell(1).value = subtitle(rep);
    ws.getRow(2).getCell(1).font = { italic: true, color: MUTED };

    const head = ws.getRow(4);
    rep.columns.forEach((label, i) => { head.getCell(i + 1).value = label; });
    band(ws, 4, 1, cols, HEADER_FILL, WHITE_BOLD);
    head.eachCell((cell) => { cell.alignment = { ...CENTER, wrapText: true }; });
    head.height = 20;

    const totalRow = (label, t, font) => {
        const row = ws.addRow([]);
        totalCells(label, t).forEach((v, i) => put(row.getCell(i + 1), v, KINDS[i] === 'date' ? 'text' : KINDS[i]));
        band(ws, row.number, 1, cols, TOTAL_FILL, font);
    };
    rep.months.forEach((m) => {
        const title = ws.addRow([m.label]);
        ws.mergeCells(title.number, 1, title.number, cols);
        band(ws, title.number, 1, 1, MONTH_FILL, { bold: true });
        m.rows.forEach((r) => {
            const row = ws.addRow([]);
            // A real date, so the column sorts and filters as one. UTC: the day never shifts.
            const date = r.iso ? new Date(`${r.iso}T00:00:00Z`) : '';
            [date, r.qty, r.description, r.supplier, r.client, r.margin, r.totalMargin, r.shipped, r.openShip, r.remaining, r.shared ? 'Yes' : '']
                .forEach((v, i) => put(row.getCell(i + 1), v, KINDS[i]));
        });
        totalRow('Total', m.totals, { bold: true });
    });
    if (rep.months.length) totalRow(`Total ${rep.year}`, rep.total, { bold: true, size: 12 });
    else ws.addRow(['Nothing is listed.']).font = { italic: true, color: MUTED };
    ws.addRow([]);
    ws.addRow([rep.note]).font = { italic: true, color: MUTED };

    // ── The two tables under the page's months, side by side as there ──
    const ts = wb.addWorksheet('Totals by month', { views: [{ state: 'frozen', ySplit: 3 }] });
    ts.columns = [12, 25, 16, 22, 16, 4, 12, 25, 16, 22, 16].map((width) => ({ width }));
    const line = (rowNo, at, values) => values.forEach((v, i) => {
        const cell = ts.getRow(rowNo).getCell(at + i);
        put(cell, v, BY_MONTH_KINDS[i]);
        if (i === 0) cell.alignment = CENTER;
    });
    [['Totals', rep.byMonth, rep.total, 1], [`Total ${rep.other}`, rep.wholeByMonth, rep.whole, 7]].forEach(([title, rows, total, at]) => {
        ts.getRow(1).getCell(at).value = `${title} · ${rep.title}`;
        ts.getRow(1).getCell(at).font = { bold: true, size: 13 };
        line(3, at, BY_MONTH);
        band(ts, 3, at, BY_MONTH.length, HEADER_FILL, WHITE_BOLD);
        for (let c = at; c < at + BY_MONTH.length; c++) ts.getRow(3).getCell(c).alignment = { ...CENTER, wrapText: true };
        rows.forEach((r, i) => line(4 + i, at, monthCells(r.label, r)));
        line(4 + rows.length, at, monthCells('Total', total));
        band(ts, 4 + rows.length, at, BY_MONTH.length, TOTAL_FILL, { bold: true });
    });
    ts.getRow(3).height = 20;
    ts.getRow(6 + rep.byMonth.length).getCell(1).value = rep.note;
    ts.getRow(6 + rep.byMonth.length).getCell(1).font = { italic: true, color: MUTED };

    const buf = await wb.xlsx.writeBuffer();
    saveAs(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `${rep.fileName}.xlsx`);
};

// ── PDF ─────────────────────────────────────────────────────────────────────────────────
// Literals on purpose: jsPDF cannot resolve var(), and a document's colours do not follow
// the screen's theme. The same ink and head band as every other document.
const INK = [32, 55, 100];
const HEAD_BAND = [9, 110, 182];
const MONTH_BAND = [243, 244, 246];
const TOTAL_BAND = [191, 219, 254];
const WIDTHS = [18, 18, 60, 30, 30, 22, 26, 17, 18, 24, 14];   // mm — add up to the 277 between the margins
const FIRST = 32;    // where the heading row starts on the first page, under the logo and title
const TOP = 12;      // …and on every page after it
const FOOT = 14;     // room kept under a table for the page line

const qty = (v) => new Intl.NumberFormat('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(v);
const usd = (v) => moneyFull('us', v);
const show = (v, kind) => (typeof v !== 'number' ? (v ?? '') : kind === 'money' ? usd(v) : kind === 'qty' ? qty(v) : String(v));
const boldOn = (fillColor) => ({ fillColor, font: 'PoppinsB', fontStyle: 'bold' });

export const exportMarginsPdf = async (rep, gisAccount) => {
    const [{ jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    // jsPDF reports its font lookups through console.error — muted while the document is
    // built, and put back whatever happens (see materialtables/pdfTable.js).
    const consoleError = console.error;
    console.error = () => { };
    try {
        await registerPdfFonts(doc);
        const pageWidth = doc.internal.pageSize.getWidth();     // 297
        const pageHeight = doc.internal.pageSize.getHeight();   // 210
        const right = pageWidth - LEFT;
        const cols = rep.columns.length;
        const sides = { left: LEFT, right: LEFT };
        const lastPage = () => doc.internal.getNumberOfPages();

        // The logo where every document has it; the title block ends at the right margin.
        gisAccount ? doc.addImage('/logo/gisLogo.jpg', 'JPEG', 8, 8, 40, 20) : doc.addImage('/logo/logoIms.jpg', 'JPEG', LEFT, 8, 40, 20);
        doc.setTextColor(...INK);
        doc.setFont('PoppinsB', 'bold');
        doc.setFontSize(14);
        doc.text(rep.title, right, 16, { align: 'right' });
        doc.setFont('Plus Jakarta Sans', 'normal');
        doc.setFontSize(8);
        doc.text(subtitle(rep), right, 22, { align: 'right' });

        // One set of columns for the heading row and for every month under it.
        const grid = {
            theme: 'plain',
            rowPageBreak: 'avoid',
            headStyles: { fillColor: HEAD_BAND, textColor: [255, 255, 255], fontSize: 8, halign: 'center', valign: 'middle', font: 'PoppinsB' },
            bodyStyles: { fontSize: 7.5, font: 'Plus Jakarta Sans', textColor: INK, valign: 'middle' },
            // Names read from the left; a figure sits under the middle of its heading.
            columnStyles: Object.fromEntries(WIDTHS.map((cellWidth, i) => [i, { cellWidth, halign: TEXT(i) ? 'left' : 'center' }])),
            didParseCell: (data) => {
                if (data.section === 'head' && TEXT(data.column.index)) data.cell.styles.halign = 'left';
                gridCell(data);
                // A month line spans the table — it is not its first column's width.
                if (data.cell.colSpan > 1) data.cell.styles.cellWidth = 'auto';
            },
        };
        // The heading row, once at the top of every page that lists deals. Returns the y under it.
        const heading = (pageNo, at) => {
            doc.setPage(pageNo);
            autoTable(doc, { ...grid, startY: at, margin: sides, head: [rep.columns], body: [] });
            return doc.lastAutoTable.finalY;
        };
        let y = heading(1, FIRST);
        const under = TOP + (y - FIRST);                        // where a later page's rows start
        const margin = { ...sides, top: under, bottom: FOOT };
        const room = () => pageHeight - FOOT - y;               // what is left of this page
        const fullPage = pageHeight - FOOT - under;             // what a fresh page holds

        // A month: its line, its rows, its totals — and the year's under the last one.
        const totalLine = (label, t) => totalCells(label, t).map((v, i) => ({ content: show(v, KINDS[i]), styles: boldOn(TOTAL_BAND) }));
        const blocks = rep.months.map((m, k) => [
            [{ content: m.label, colSpan: cols, styles: { ...boldOn(MONTH_BAND), halign: 'left' } }],
            ...m.rows.map((r) => [r.date, r.qty, r.description, r.supplier, r.client, r.margin, r.totalMargin, r.shipped, r.openShip, r.remaining, r.shared ? 'Yes' : '']
                .map((v, i) => show(v, KINDS[i]))),
            totalLine('Total', m.totals),
            ...(k === rep.months.length - 1 ? [totalLine(`Total ${rep.year}`, rep.total)] : []),
        ]);
        if (!blocks.length) blocks.push([[{ content: 'Nothing is listed.', colSpan: cols, styles: { halign: 'center' } }]]);

        /* A month is kept on one page. Drawn as one long table, the page ended wherever it
           ran out: a month's name could be the last line of a page with its deals overleaf, or
           its total the first line of the next. Each month is measured first — on a spare
           sheet long enough to hold it unbroken — and starts a new page when the rest of this
           one is too short for it. Only a month longer than a whole page runs over. */
        const spare = new jsPDF({ unit: 'mm', format: [pageWidth, 5000] });
        await registerPdfFonts(spare);
        const heightOf = (lines) => {
            autoTable(spare, { ...grid, startY: 0, margin: { ...sides, top: 0, bottom: 0 }, showHead: 'never', body: lines });
            return spare.lastAutoTable.finalY;
        };
        blocks.forEach((block) => {
            // Cleaned before it is measured, so a cell is placed by the text it will show (pdfText.js).
            const lines = pdfRows(block);
            const height = heightOf(lines);
            if (height > room() + 0.01 && (height <= fullPage || room() < 15)) {
                doc.addPage();
                y = heading(lastPage(), TOP);
            }
            const from = lastPage();
            autoTable(doc, { ...grid, startY: y, margin, showHead: 'never', body: lines });
            y = doc.lastAutoTable.finalY;
            for (let p = from + 1; p <= lastPage(); p++) heading(p, TOP);   // a month that ran over
            doc.setPage(lastPage());
        });

        // The two tables under the page's months, side by side as there. Kept on one page.
        const gap = 10;
        const half = (right - LEFT - gap) / 2;
        y += 12;
        if (y + (rep.byMonth.length + 2) * 5 + 8 > pageHeight - FOOT) { doc.addPage(); y = 20; }
        const page = lastPage();
        let foot = y;
        [['Totals', rep.byMonth, rep.total, LEFT], [`Total ${rep.other}`, rep.wholeByMonth, rep.whole, LEFT + half + gap]].forEach(([title, rows, total, x]) => {
            doc.setPage(page);
            doc.setFont('PoppinsB', 'bold');
            doc.setFontSize(9);
            doc.text(title, x, y - 2);
            autoTable(doc, {
                theme: 'plain',
                startY: y,
                margin: { left: x, right: pageWidth - x - half, bottom: FOOT },
                tableWidth: half,
                headStyles: { fillColor: HEAD_BAND, textColor: [255, 255, 255], fontSize: 8, halign: 'center', font: 'PoppinsB' },
                bodyStyles: { fontSize: 7.5, font: 'Plus Jakarta Sans', textColor: INK, halign: 'center' },
                head: [BY_MONTH],
                body: [
                    ...rows.map((r) => monthCells(r.label, r).map((v, i) => show(v, BY_MONTH_KINDS[i]))),
                    monthCells('Total', total).map((v, i) => ({ content: show(v, BY_MONTH_KINDS[i]), styles: boldOn(TOTAL_BAND) })),
                ],
                columnStyles: Object.fromEntries(BY_MONTH.map((_, i) => [i, { cellWidth: half / BY_MONTH.length }])),
                didParseCell: gridCell,
            });
            foot = Math.max(foot, doc.lastAutoTable.finalY);
        });
        doc.setPage(page);
        doc.setFont('Plus Jakarta Sans', 'normal');
        doc.setFontSize(7);
        doc.text(rep.note, LEFT, Math.min(foot + 6, pageHeight - FOOT + 2));

        const pages = lastPage();
        for (let i = 1; i <= pages; i++) {
            doc.setPage(i);
            doc.setFont('Plus Jakarta Sans', 'normal');
            doc.setFontSize(7);
            doc.text(`${rep.title} · page ${i} of ${pages}`, pageWidth / 2, pageHeight - 6, { align: 'center' });
        }
        doc.save(`${rep.fileName}.pdf`);
    } finally {
        console.error = consoleError;
    }
};
