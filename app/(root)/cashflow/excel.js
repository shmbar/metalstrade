// Excel export for the Cashflow page — the full report (report.js) as a workbook:
//
//   Summary   the current position: Left / Right and what makes them up, the sections
//             at a glance, receivables (with ageing), payables, stock, expenses,
//             unsold stock and everything on hold.
//   one sheet per section
//             each client / supplier / warehouse on one bold line with its count and
//             totals, its invoices (or stock lines) grouped underneath. The groups are
//             collapsed: click + beside a row — or the "2" above the row numbers for
//             all of them — to open them. The old export was the bold lines alone.
//
// Dressed like every other export in the app (sumBasket.js, InvoicesReview&Statement):
// purple header band, white bold 12pt; light-blue totals band with thin borders.
// exceljs is imported on demand so it stays off the first-load bundle.
import { saveAs } from 'file-saver';
import { eurRateNote } from '@utils/currency';

const HEADER_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: '800080' } };
const TOTAL_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'BFDBFE' } };
const PARTY_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F3F4F6' } };
const THIN = { style: 'thin', color: { argb: 'D1D5DB' } };
const BORDER = { top: THIN, left: THIN, bottom: THIN, right: THIN };
const MUTED = { argb: '6B7280' };

// Sign before the symbol ("-$1,234.50"), as utils/currency moneyFull prints it.
const moneyFmt = (cur) => (cur === 'eu' ? '"€"#,##0.00' : '"$"#,##0.00');
const QTY_FMT = '#,##0.000';
const PCT_FMT = '0.0%';
const DATE_FMT = 'dd.mm.yy';
const curCode = (cur) => (cur === 'us' ? 'USD' : cur === 'eu' ? 'EUR' : (cur || ''));

// Excel worksheet names: max 31 chars, no : \ / ? * [ ] — sanitize defensively.
const safeSheetName = (name, used) => {
    const base = String(name || 'Sheet').replace(/[:\\/?*[\]]/g, ' ').trim().slice(0, 31) || 'Sheet';
    let n = base;
    let i = 2;
    while (used.has(n)) {
        const suffix = ` (${i++})`;
        n = base.slice(0, 31 - suffix.length) + suffix;
    }
    used.add(n);
    return n;
};

const toDate = (iso) => {
    if (!iso) return '';
    const d = new Date(`${String(iso).slice(0, 10)}T00:00:00Z`);
    return Number.isNaN(d.getTime()) ? String(iso) : d;
};

const dressHeader = (row, cols) => {
    for (let c = 1; c <= cols; c++) {
        const cell = row.getCell(c);
        cell.fill = HEADER_FILL;
        cell.font = { bold: true, size: 12, color: { argb: 'FFFFFF' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.border = BORDER;
    }
};
// Fills the whole band — addRow only touches the cells it was given values for.
const dressTotal = (row, cols) => {
    for (let c = 1; c <= cols; c++) {
        const cell = row.getCell(c);
        cell.fill = TOTAL_FILL;
        cell.font = { bold: true };
        cell.border = BORDER;
    }
};

// ── One section sheet ───────────────────────────────────────────────────────────
const writeSection = (wb, used, sec) => {
    const ws = wb.addWorksheet(safeSheetName(sec.title, used), {
        views: [{ state: 'frozen', ySplit: 3 }],
        // The +/− sits on the party line ABOVE its rows, not below them.
        properties: { outlineLevelRow: 1, outlineProperties: { summaryBelow: false, summaryRight: false } },
    });
    const cols = sec.columns;
    ws.columns = cols.map(c => ({ key: c.key, width: c.width }));
    const n = cols.length;

    const rowTotal = sec.parties.reduce((t, p) => t + p.rows.length, 0);
    const title = ws.getRow(1);
    title.getCell(1).value = sec.title;
    title.getCell(1).font = { bold: true, size: 14 };
    const sub = ws.getRow(2);
    sub.getCell(1).value = `${sec.parties.length} ${sec.party.toLowerCase()}${sec.parties.length === 1 ? '' : 's'} · ${rowTotal} ${sec.unit[rowTotal === 1 ? 0 : 1]}`
        + (sec.pendingCount ? ` · ${sec.pendingCount} on hold (left out of the totals)` : '')
        + ' · click + beside a row, or "2" above the row numbers, to see its lines';
    sub.getCell(1).font = { italic: true, color: MUTED };

    const header = ws.getRow(3);
    cols.forEach((c, i) => { header.getCell(i + 1).value = c.header; });
    dressHeader(header, n);
    header.height = 20;

    const put = (row, values, cur, { party = false } = {}) => {
        cols.forEach((c, i) => {
            const v = values[c.key];
            if (v === undefined || v === null || v === '') return;
            const cell = row.getCell(i + 1);
            if (c.key === 'cur') { cell.value = curCode(v); return; }
            switch (c.kind) {
                case 'money': cell.value = v; cell.numFmt = moneyFmt(cur); break;
                case 'usd': cell.value = v; cell.numFmt = moneyFmt('us'); break;
                case 'qty': cell.value = v; cell.numFmt = QTY_FMT; break;
                case 'pct': cell.value = v / 100; cell.numFmt = PCT_FMT; break;
                case 'date': cell.value = toDate(v); cell.numFmt = DATE_FMT; break;
                default: cell.value = v;
            }
        });
        if (party) {
            for (let c = 1; c <= n; c++) {
                const cell = row.getCell(c);
                cell.fill = PARTY_FILL;
                cell.font = { bold: true };
                cell.border = BORDER;
            }
        }
    };

    sec.parties.forEach((p) => {
        const pr = ws.addRow({});
        put(pr, p.summary, p.summary._fmtCur, { party: true });
        p.rows.forEach((r) => {
            const dr = ws.addRow({});
            put(dr, r, r._cur);
            dr.outlineLevel = 1;
            dr.hidden = true;
            // The party name is repeated so a filtered or copied line still says whose
            // it is; greyed and indented so the eye reads it as belonging to the line above.
            const nameCell = dr.getCell(1);
            nameCell.font = { color: MUTED };
            nameCell.alignment = { indent: 1 };
            if (r._pending) {
                for (let c = 2; c <= n; c++) dr.getCell(c).font = { italic: true, color: MUTED };
            }
        });
    });

    // Closing lines, as on the page: what is on hold (only when anything is), then the
    // active total.
    const sumCol = (key) => sec.parties.reduce((t, p) => t + (Number(p.summary[key]) || 0), 0);
    const closing = (label, values) => {
        const r = ws.addRow({});
        put(r, { name: label, ...values }, 'us');
        dressTotal(r, n);
        return r;
    };
    ws.addRow({});
    if (sec.pendingCount) {
        const held = closing(`On hold (${sec.pendingCount})`, { hold: sec.pendingTotal });
        held.font = { italic: true, bold: true };
    }
    // Only what adds up across parties: counts, tonnage, USD columns and the page's own
    // section figure. A client in EUR and one in USD cannot share an "Amount" total.
    // Counted like the party lines above it: every invoice listed, held ones included
    // (the On hold line says how many of them are held).
    const totals = { count: rowTotal };
    cols.filter(c => c.sum && (c.kind === 'usd' || c.kind === 'qty')).forEach((c) => { totals[c.key] = sumCol(c.key); });
    totals[sec.amountKey] = sec.total;
    closing(`Total (${sec.parties.length})`, totals);
    return ws;
};

// ── Summary sheet ───────────────────────────────────────────────────────────────
const SUMMARY_WIDTHS = [40, 18, 16, 18, 16, 14];

const writeSummary = (wb, used, rep) => {
    const ws = wb.addWorksheet(safeSheetName('Summary', used));
    ws.columns = SUMMARY_WIDTHS.map(width => ({ width }));

    const text = (v, font) => { const r = ws.addRow([v]); if (font) r.getCell(1).font = font; return r; };
    const gap = () => ws.addRow([]);
    const heading = (t) => { gap(); text(t, { bold: true, size: 13, color: { argb: '800080' } }); };

    // A small table: header band, rows, optional totals band. `cells` per row is an
    // array of { v, fmt } (or plain values).
    const table = (headers, rows, total) => {
        const h = ws.addRow(headers);
        dressHeader(h, headers.length);
        const write = (cells) => {
            const r = ws.addRow([]);
            cells.forEach((c, i) => {
                if (c === null || c === undefined || c === '') return;
                const cell = r.getCell(i + 1);
                if (typeof c === 'object' && !(c instanceof Date)) { cell.value = c.v; if (c.fmt) cell.numFmt = c.fmt; }
                else cell.value = c;
                cell.border = BORDER;
            });
            for (let i = 1; i <= headers.length; i++) r.getCell(i).border = BORDER;
            return r;
        };
        rows.forEach(write);
        if (total) dressTotal(write(total), headers.length);
    };
    const usd = (v) => ({ v, fmt: moneyFmt('us') });
    const pct = (v) => ({ v, fmt: PCT_FMT });
    const qty = (v) => ({ v, fmt: QTY_FMT });
    // label / value pairs, two to a line
    const facts = (pairs) => {
        for (let i = 0; i < pairs.length; i += 2) {
            const r = ws.addRow([]);
            [pairs[i], pairs[i + 1]].forEach((pr, k) => {
                if (!pr) return;
                const lc = r.getCell(k * 3 + 1);
                lc.value = pr[0];
                lc.font = { color: MUTED };
                const vc = r.getCell(k * 3 + 2);
                vc.value = pr[1]?.v ?? pr[1];
                if (pr[1]?.fmt) vc.numFmt = pr[1].fmt;
                vc.font = { bold: true };
            });
        }
    };

    const when = rep.asOf instanceof Date ? rep.asOf : new Date(rep.asOf);
    text('Cashflow report', { bold: true, size: 16 });
    text(`${rep.account ? rep.account + ' · ' : ''}as of ${when.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`
        + (rep.years?.length ? ` · years ${rep.years.join(', ')}` : ''), { color: MUTED });
    text('Figures match the Cashflow page. Invoices on hold (Pending) are left out of every total and listed at the end.', { italic: true, color: MUTED });
    // Every total is in dollars; a sheet keeps each line in its own currency and adds
    // the dollar figure beside it, in the "… USD" column its totals are taken from.
    if (rep.fx?.hasEuro) text(`${eurRateNote(rep.fx)}. Each sheet shows a line in its own currency with the dollar figure beside it.`, { italic: true, color: MUTED });

    const byKey = Object.fromEntries(rep.sections.map(s => [s.key, s]));

    if (rep.position) {
        const pos = rep.position;
        heading('Position');
        facts([
            ['Total (Left)', usd(pos.leftTotal)], ['Total (Right)', usd(pos.rightTotal)],
            ['Balance (Left − Right)', usd(pos.balance)],
        ]);
        gap();
        table(['Left — what we have / are owed', 'Amount', 'Share'],
            pos.left.map(l => [l.label, usd(l.amount), pct(l.share)]),
            ['Total (Left)', usd(pos.leftTotal), pct(1)]);
        gap();
        table(['Right — what we owe', 'Amount', 'Share'],
            pos.right.map(l => [l.label, usd(l.amount), pct(l.share)]),
            ['Total (Right)', usd(pos.rightTotal), pct(1)]);
    }

    heading('Sections at a glance');
    const glance = rep.sections.filter(s => s.parties.length);
    table(['Section', 'Parties', 'Invoices / lines', 'Amount', 'On hold', 'Held items'],
        glance.map(s => [s.title, s.parties.length, s.rowCount, usd(s.total), s.pendingTotal ? usd(s.pendingTotal) : '', s.pendingCount || '']));

    const rc = rep.receivables;
    heading('Receivables — clients');
    facts([
        ['Clients due', usd(rc.due)], ['Open invoices', rc.openCount],
        ['No payment yet', usd(rc.noPaymentYet)], ['Partly paid', usd(rc.partlyPaid)],
        ['Not finalized', usd(rc.notFinalAmount)], ['… invoices', rc.notFinalCount],
        ['On hold', usd(rc.pendingTotal)], ['… invoices', rc.pendingCount],
    ]);
    gap();
    table(['Age (from invoice date)', 'Invoices', 'Balance', 'Share'],
        [...rc.aging.map(b => [b.label, b.count, usd(b.amount), pct(b.share)]),
            ...(rc.undated.count ? [['No invoice date', rc.undated.count, usd(rc.undated.amount), '']] : [])]);
    gap();
    table(['Largest clients', 'Invoices', 'Due', 'Share'],
        rc.top.map(t => [t.name, t.count, usd(t.amount), pct(t.share)]));

    const pb = rep.payables;
    heading('Payables — suppliers (USD)');
    facts([
        ['Suppliers due', usd(pb.due)], ['Open invoices', pb.openCount],
        ['No payment yet', usd(pb.noPaymentYet)], ['Partly paid', usd(pb.partlyPaid)],
        ['On hold', usd(pb.pendingTotal)], ['… invoices', pb.pendingCount],
    ]);
    gap();
    table(['Largest suppliers', 'Invoices', 'Due (USD)', 'Share'],
        pb.top.map(t => [t.name, t.count, usd(t.amount), pct(t.share)]));

    const st = rep.stock;
    heading('Stock');
    facts([
        ['Stock value', usd(st.total)], ['', ''],
        ['Paid', usd(st.paid)], ['… MT', qty(st.paidQty)],
        ['UnPaid', usd(st.unpaid)], ['… MT', qty(st.unpaidQty)],
        ['On hold', usd(st.pendingTotal)], ['… lines', st.pendingCount],
    ]);
    gap();
    table(['Largest warehouses', 'Lines', 'Qty (MT)', 'Value', 'Share'],
        st.top.map(t => [t.name, t.count, qty(t.qty), usd(t.amount), pct(t.share)]));

    const ex = rep.expenses;
    heading('Expenses (USD)');
    facts([['Outstanding expenses', usd(ex.total)], ['… items', ex.count]]);
    if (ex.top.length) {
        gap();
        table(['Largest vendors', 'Items', 'Amount (USD)', 'Share'], ex.top.map(t => [t.name, t.count, usd(t.amount), pct(t.share)]));
    }

    heading('Unsold stock — bought, not yet sold');
    facts([['Unsold value', usd(st.unsold)], ['… MT', qty(st.unsoldQty)]]);
    if (st.unsoldTop.length) {
        gap();
        table(['By supplier', 'Lines', 'Value', 'Share'], st.unsoldTop.map(t => [t.name, t.count, usd(t.amount), pct(t.share)]));
    }

    heading(`On hold (Pending) — ${rep.holds.length} item${rep.holds.length === 1 ? '' : 's'}`);
    if (rep.holds.length) {
        // Reference last: it is the long one, and runs on into the empty columns beside it.
        table(['Party', 'Section', 'Amount', 'Reference'],
            rep.holds.map(h => [h.party, h.section, { v: h.amount, fmt: moneyFmt(h.cur) }, h.reference]));
    } else {
        text('Nothing is on hold.', { color: MUTED });
    }
    return ws;
};

/**
 * The whole report as one workbook: Summary first, then a sheet per section that has
 * anything in it.
 * @param {Object} report  buildCashflowReport(...)
 * @param {string} fileName
 */
export const exportCashflowReport = async (report, fileName = 'cashflow.xlsx') => {
    const { Workbook } = await import('exceljs');
    const wb = new Workbook();
    wb.creator = report.account || 'IMS';
    wb.created = new Date();

    const used = new Set();
    writeSummary(wb, used, report);
    report.sections.filter(s => s.parties.length).forEach(s => writeSection(wb, used, s));

    const buf = await wb.xlsx.writeBuffer();
    saveAs(
        new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
        fileName
    );
};
