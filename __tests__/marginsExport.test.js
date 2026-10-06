import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { jsPDF } from 'jspdf';
import { Workbook } from 'exceljs';
import { saveAs } from 'file-saver';
import { shareOf, totalsOf, wholeTotalsOf, viewMonths, withStoredTotals, sumMonths } from '../app/(root)/margins/marginsView.js';
import { buildMarginsReport } from '../app/(root)/margins/marginsReport.js';
import { exportMarginsExcel, exportMarginsPdf } from '../app/(root)/margins/marginsExport.js';
import { matchesAllWords } from '../utils/search.js';

/* Margins → Excel / PDF, and "GIS only" (client, 2026-10-06: "in margin page, is it possible
   to print out on excel/pdf, also the option to select GIS only to show and same excel/pdf").
   The page, the workbook and the PDF are all drawn from one view of the rows
   (marginsView.js → marginsReport.js), so what is tested here is that the three agree: the
   rows listed, the share of a shared deal, and the totals of exactly those rows. */

// utils/utils.js holds JSX and cannot be imported here; the PDF fonts use one helper of it.
vi.mock('../utils/utils.js', () => ({
    fileToBase64: async (blob) => Buffer.from(await blob.arrayBuffer()).toString('base64'),
}));
vi.mock('file-saver', () => ({ saveAs: vi.fn() }));

// ── a year as the page holds it ───────────────────────────────────────────────────────────
const SETTINGS = {
    Supplier: { Supplier: [{ id: 's1', nname: 'Triart' }, { id: 's2', nname: 'Thormet' }] },
    Client: { Client: [{ id: 'c1', nname: 'Solumet' }] },
};
const on = (d) => ({ startDate: d, endDate: d });
const BLANK = { date: null, purchase: '', description: '', supplier: '', client: '', margin: '', totalMargin: '', shipped: '', openShip: '', remaining: '' };
const YEAR = () => [
    {
        // Stored totals left behind by a deleted row — what GIS 01-2026 looked like.
        month: '01', purchase: 123, openShip: 15, totalMargin: 101075, remaining: 7500, ids: ['a', 'b', 'c'],
        items: [
            { id: 'a', date: on('2026-01-14'), purchase: '20', description: 'Ni 201 solids', supplier: 's1', client: 'c1', margin: '500', totalMargin: 10000, shipped: '5', openShip: 15, remaining: 7500 },
            { id: 'b', date: on('2026-01-20'), purchase: '10', description: '698  triart   turnings', supplier: 's2', client: 'c1', margin: '300', totalMargin: 3000, shipped: '10', openShip: 0, remaining: 0, gis: true },
            { id: 'c', ...BLANK },
        ],
    },
    {
        month: '02', purchase: 4.5, openShip: 4.5, totalMargin: 2250, remaining: 2250, ids: ['d'],
        items: [
            { id: 'd', date: on('2026-02-03'), purchase: '4.5', description: 'Hast X', supplier: 's1', client: '', margin: '1000', totalMargin: 4500, shipped: '', openShip: 4.5, remaining: 4500, gis: true },
        ],
    },
    { month: '03', purchase: '', openShip: '', totalMargin: '', remaining: '', ids: [], items: [] },
];
// The page's search: every typed word, anywhere in the description or the two names.
const search = (q) => (x) => matchesAllWords([
    x.description,
    SETTINGS.Supplier.Supplier.find((s) => s.id === x.supplier)?.nname || '',
    SETTINGS.Client.Client.find((c) => c.id === x.client)?.nname || '',
], q);
const report = (opts = {}) => {
    const { scope = 'all', query = '', other = 'GIS', company = 'IMS Metals & Alloys OU' } = opts;
    const months = viewMonths(YEAR(), { scope, keep: query ? search(query) : null });
    return buildMarginsReport({ months, year: 2026, scope, other, query, settings: SETTINGS, company });
};

describe('the view: rows, the share of a shared deal, and totals of exactly those rows', () => {
    it('a shared deal counts half in Total Margin and Remaining — never in the tonnage', () => {
        const [, b] = YEAR()[0].items;
        expect(shareOf(b, 'totalMargin')).toBe(1500);
        expect(shareOf({ ...b, gis: false }, 'totalMargin')).toBe(3000);
        expect(totalsOf(YEAR()[0].items)).toEqual({ purchase: 30, shipped: 15, openShip: 15, totalMargin: 11500, remaining: 7500 });
        expect(totalsOf(YEAR()[1].items)).toEqual({ purchase: 4.5, shipped: 0, openShip: 4.5, totalMargin: 2250, remaining: 2250 });
    });

    it('"Total GIS" adds the shared deals up whole', () => {
        expect(wholeTotalsOf(YEAR()[0].items)).toEqual({ purchase: 10, shipped: 10, openShip: 0, totalMargin: 3000, remaining: 0 });
        expect(sumMonths(viewMonths(YEAR()), 'whole')).toEqual({ purchase: 14.5, shipped: 10, openShip: 4.5, totalMargin: 7500, remaining: 4500 });
    });

    it('the year is added up from the rows, not from the totals a month stores', () => {
        // Month 01 stores 123 MT and $101,075; its rows make 30 MT and $11,500.
        expect(sumMonths(viewMonths(YEAR()))).toEqual({ purchase: 34.5, shipped: 15, openShip: 19.5, totalMargin: 13750, remaining: 9750 });
    });

    it('"GIS only" lists the shared deals and totals only them', () => {
        const v = viewMonths(YEAR(), { scope: 'shared' });
        expect(v.map((m) => m.items.map((i) => i.id))).toEqual([['b'], ['d'], []]);
        expect(v[0].totals).toEqual({ purchase: 10, shipped: 10, openShip: 0, totalMargin: 1500, remaining: 0 });
        expect(sumMonths(v)).toEqual({ purchase: 14.5, shipped: 10, openShip: 4.5, totalMargin: 3750, remaining: 2250 });
        // Whole, those deals are the same in either view.
        expect(sumMonths(v, 'whole')).toEqual(sumMonths(viewMonths(YEAR()), 'whole'));
    });

    it('a search narrows the rows and the totals with them, inside the scope', () => {
        const ids = (v) => v.flatMap((m) => m.items.map((i) => i.id));
        expect(ids(viewMonths(YEAR(), { keep: search('triart') }))).toEqual(['a', 'b', 'd']);
        expect(ids(viewMonths(YEAR(), { keep: search('698 triart') }))).toEqual(['b']);
        expect(ids(viewMonths(YEAR(), { scope: 'shared', keep: search('triart') }))).toEqual(['b', 'd']);
        expect(sumMonths(viewMonths(YEAR(), { keep: search('698 triart') })).totalMargin).toBe(1500);
    });

    it('a month keeps everything else it holds, and the data is not touched', () => {
        const data = YEAR();
        const before = JSON.stringify(data);
        const v = viewMonths(data, { scope: 'shared' });
        expect(v[0].month).toBe('01');
        expect(v[0].ids).toEqual(['a', 'b', 'c']);
        expect(JSON.stringify(data)).toBe(before);
    });

    it('a save puts a month\'s stored totals back in step with its rows', () => {
        const saved = withStoredTotals(YEAR());
        expect(saved[0]).toMatchObject({ purchase: 30, openShip: 15, totalMargin: 11500, remaining: 7500 });
        expect(saved[1]).toMatchObject({ purchase: 4.5, openShip: 4.5, totalMargin: 2250, remaining: 2250 });
        expect(saved[2]).toMatchObject({ purchase: 0, openShip: 0, totalMargin: 0, remaining: 0 });
        // Nothing else of the month changes: its rows, their order, its number.
        expect(saved[0].items).toEqual(YEAR()[0].items);
        expect(saved[0].ids).toEqual(['a', 'b', 'c']);
        expect(Object.keys(saved[0]).sort()).toEqual(Object.keys(YEAR()[0]).sort());
    });
});

describe('the report both files are printed from', () => {
    it('lists each row as its cells show it', () => {
        const r = report();
        expect(r.title).toBe('Margins 2026');
        expect(r.fileName).toBe('Margins_2026');
        expect(r.columns).toEqual(['Date', 'Qty (MT)', 'Description', 'Supplier', 'Client', 'Margin', 'Total Margin', 'Shipped', 'Open Ship', 'Remaining', 'GIS']);
        expect(r.months.map((m) => m.label)).toEqual(['01-2026', '02-2026']);
        expect(r.months[0].rows[0]).toEqual({
            date: '14.01.26', iso: '2026-01-14', qty: 20, description: 'Ni 201 solids', supplier: 'Triart', client: 'Solumet',
            margin: 500, totalMargin: 10000, shipped: 5, openShip: 15, remaining: 7500, shared: false,
        });
        // The shared deal: half its Total Margin, as its cell shows; nothing typed stays blank.
        expect(r.months[0].rows[1]).toMatchObject({ supplier: 'Thormet', totalMargin: 1500, remaining: 0, shared: true });
        expect(r.months[1].rows[0]).toMatchObject({ client: '', shipped: null, totalMargin: 2250, openShip: 4.5, remaining: 2250, shared: true });
    });

    it('leaves out a line nobody filled in, and a month with nothing to list', () => {
        const r = report();
        expect(r.months[0].rows).toHaveLength(2);
        expect(r.months.some((m) => m.label === '03-2026')).toBe(false);
        // The tables of totals still name every month, as the page does.
        expect(r.byMonth.map((m) => m.label)).toEqual(['01-2026', '02-2026', '03-2026']);
        expect(r.byMonth[2]).toMatchObject({ purchase: 0, totalMargin: 0 });
    });

    it('its totals are the totals of the rows it lists', () => {
        for (const opts of [{}, { scope: 'shared' }, { query: 'triart' }, { scope: 'shared', query: 'hast' }]) {
            const r = report(opts);
            const rows = r.months.flatMap((m) => m.rows);
            const add = (k) => rows.reduce((s, x) => s + (x[k] || 0), 0);
            expect(r.total.purchase, JSON.stringify(opts)).toBeCloseTo(add('qty'), 6);
            expect(r.total.totalMargin, JSON.stringify(opts)).toBeCloseTo(add('totalMargin'), 6);
            expect(r.total.openShip, JSON.stringify(opts)).toBeCloseTo(add('openShip'), 6);
            expect(r.total.remaining, JSON.stringify(opts)).toBeCloseTo(add('remaining'), 6);
            r.months.forEach((m) => expect(m.totals.totalMargin).toBeCloseTo(m.rows.reduce((s, x) => s + (x.totalMargin || 0), 0), 6));
        }
    });

    it('"GIS only" in IMS, "IMS only" in GIS — in the title, the column and the file name', () => {
        const ims = report({ scope: 'shared' });
        expect(ims.title).toBe('Margins 2026 · GIS only');
        expect(ims.fileName).toBe('Margins_2026_GIS-only');
        expect(ims.months.flatMap((m) => m.rows).every((x) => x.shared)).toBe(true);
        expect(ims.note).toContain("IMS's share");

        const gis = report({ scope: 'shared', other: 'IMS', company: 'GIS Metals OÜ' });
        expect(gis.title).toBe('Margins 2026 · IMS only');
        expect(gis.fileName).toBe('Margins_2026_IMS-only');
        expect(gis.columns.at(-1)).toBe('IMS');
        expect(gis.note).toContain("GIS's share");
        expect(gis.note).toContain('"Total IMS"');
    });
});

// ── Excel: written, then read back the way Excel reads it ─────────────────────────────────
const workbook = async (rep) => {
    saveAs.mockClear();
    await exportMarginsExcel(rep);
    const [blob, name] = saveAs.mock.calls[0];
    const wb = new Workbook();
    await wb.xlsx.load(Buffer.from(await blob.arrayBuffer()));
    return { wb, name };
};
const rowsOf = (ws) => {
    const out = [];
    ws.eachRow({ includeEmpty: false }, (row, n) => out.push({ n, v: Array.from({ length: 11 }, (_, i) => row.getCell(i + 1).value) }));
    return out;
};

describe('Excel', () => {
    it('lists the months under one header, each with its total, then the year', async () => {
        const rep = report();
        const { wb, name } = await workbook(rep);
        expect(name).toBe('Margins_2026.xlsx');
        expect(wb.worksheets.map((w) => w.name)).toEqual(['Margins 2026', 'Totals by month']);
        const ws = wb.worksheets[0];
        expect(ws.getCell('A1').value).toBe('Margins 2026');
        expect(String(ws.getCell('A2').value)).toMatch(/^IMS Metals & Alloys OU · printed \d{2}-[A-Z][a-z]{2}-\d{4}$/);
        expect(ws.getRow(4).values.slice(1)).toEqual(rep.columns);
        expect(ws.getCell('A4').fill.fgColor.argb).toBe('800080');
        expect(ws.getCell('K4').fill.fgColor.argb).toBe('800080');

        const lines = rowsOf(ws).filter((r) => r.n > 4);
        expect(lines.map((r) => (r.v[0] instanceof Date ? 'row' : r.v[0]))).toEqual([
            '01-2026', 'row', 'row', 'Total', '02-2026', 'row', 'Total', 'Total 2026', rep.note,
        ]);
    });

    it('a figure is a number Excel can add up, a date is a date', async () => {
        const { wb } = await workbook(report());
        const ws = wb.worksheets[0];
        const first = ws.getRow(6);
        expect(first.getCell(1).value).toEqual(new Date('2026-01-14T00:00:00Z'));
        expect(first.getCell(1).numFmt).toBe('dd.mm.yy');
        expect(first.getCell(2).value).toBe(20);
        expect(first.getCell(2).numFmt).toBe('#,##0.000');
        expect(first.getCell(3).value).toBe('Ni 201 solids');
        expect([4, 5].map((c) => first.getCell(c).value)).toEqual(['Triart', 'Solumet']);
        expect([6, 7, 10].map((c) => first.getCell(c).numFmt)).toEqual(['"$"#,##0.00', '"$"#,##0.00', '"$"#,##0.00']);
        expect([6, 7, 8, 9, 10].map((c) => first.getCell(c).value)).toEqual([500, 10000, 5, 15, 7500]);
        expect(first.getCell(11).value).toBeNull();
        // The shared deal: its half, and the tick.
        expect(ws.getRow(7).getCell(7).value).toBe(1500);
        expect(ws.getRow(7).getCell(11).value).toBe('Yes');
    });

    it('each total is the sum of the cells above it', async () => {
        for (const opts of [{}, { scope: 'shared' }, { query: 'triart' }]) {
            const rep = report(opts);
            const { wb } = await workbook(rep);
            const lines = rowsOf(wb.worksheets[0]).filter((r) => r.n > 4);
            const year = lines.find((r) => r.v[0] === 'Total 2026');
            const data = lines.filter((r) => r.v[0] instanceof Date);
            for (const col of [1, 6, 8, 9]) {
                const sum = data.reduce((s, r) => s + (r.v[col] || 0), 0);
                expect(year.v[col], `${JSON.stringify(opts)} column ${col + 1}`).toBeCloseTo(sum, 6);
            }
            expect(year.v[1]).toBeCloseTo(rep.total.purchase, 6);
            expect(year.v[6]).toBeCloseTo(rep.total.totalMargin, 6);
        }
    });

    it('a month line and a totals line are bands across every column', async () => {
        const { wb } = await workbook(report());
        const ws = wb.worksheets[0];
        expect(ws.getCell('A5').value).toBe('01-2026');
        expect(ws.getCell('A5').isMerged).toBe(true);
        expect(ws.getCell('K5').master.address).toBe('A5');
        expect(ws.getCell('A5').fill.fgColor.argb).toBe('F3F4F6');
        for (const col of ['A', 'C', 'K']) {
            expect(ws.getCell(`${col}8`).fill.fgColor.argb, `${col}8`).toBe('BFDBFE');
            expect(ws.getCell(`${col}8`).font.bold, `${col}8`).toBe(true);
        }
    });

    it('"GIS only": its own title, file and rows — and both tables of totals on the second sheet', async () => {
        const rep = report({ scope: 'shared' });
        const { wb, name } = await workbook(rep);
        expect(name).toBe('Margins_2026_GIS-only.xlsx');
        expect(wb.worksheets[0].getCell('A1').value).toBe('Margins 2026 · GIS only');
        const lines = rowsOf(wb.worksheets[0]).filter((r) => r.n > 4);
        expect(lines.filter((r) => r.v[0] instanceof Date).every((r) => r.v[10] === 'Yes')).toBe(true);

        const ts = wb.worksheets[1];
        expect(ts.getCell('A1').value).toBe('Totals · Margins 2026 · GIS only');
        expect(ts.getCell('G1').value).toBe('Total GIS · Margins 2026 · GIS only');
        expect(ts.getRow(3).values.slice(1, 6)).toEqual(['Months', 'Purchased quantity (MT)', 'Profit', 'Outstanding shipment', 'Remaining']);
        expect(ts.getRow(4).values.slice(1, 6)).toEqual(['01-2026', 10, 1500, 0, 0]);
        expect(ts.getRow(7).values.slice(1, 6)).toEqual(['Total', 14.5, 3750, 4.5, 2250]);
        // The shared deals whole, beside it.
        expect(ts.getRow(4).values.slice(7, 12)).toEqual(['01-2026', 10, 3000, 0, 0]);
        expect(ts.getRow(7).values.slice(7, 12)).toEqual(['Total', 14.5, 7500, 4.5, 4500]);
        expect(ts.getCell('I7').numFmt).toBe('"$"#,##0.00');
        expect(ts.getCell('H7').numFmt).toBe('#,##0.000');
    });

    it('nothing listed is said, not left as an empty sheet', async () => {
        const { wb } = await workbook(report({ query: 'no such deal' }));
        expect(rowsOf(wb.worksheets[0]).filter((r) => r.n > 4).map((r) => r.v[0])[0]).toBe('Nothing is listed.');
    });
});

// ── PDF: drawn as the app draws it, every word measured ───────────────────────────────────
const realFetch = globalThis.fetch;
const realAddImage = jsPDF.API.addImage;
// Every document made during an export — the PDF itself is the one that gets saved (the
// exporter also measures on a spare sheet it throws away).
let made = [];
beforeAll(() => {
    globalThis.fetch = async (url) => ({ ok: true, status: 200, blob: async () => new Blob([readFileSync('public' + url)]) });
    jsPDF.API.addImage = function (img, ...rest) {
        if (typeof img === 'string' && !img.startsWith('data:')) {
            made.find((r) => r.doc === this)?.images.push(img);
            img = 'data:image/jpeg;base64,' + readFileSync('public/' + img.replace(/^\//, '')).toString('base64');
        }
        return realAddImage.call(this, img, ...rest);
    };
    jsPDF.API.events.push(['initialized', function () {
        const doc = this;
        const rec = { draws: [], images: [], saved: null, doc };
        made.push(rec);
        const text = doc.text;
        doc.text = function (t, x, y, opts, ...rest) {
            const align = (opts && opts.align) || 'left';
            (Array.isArray(t) ? t : String(t ?? '').split('\n')).forEach((line) => {
                const w = doc.getTextWidth(String(line));
                const left = align === 'right' ? x - w : align === 'center' ? x - w / 2 : x;
                rec.draws.push({ s: String(line), y, left, right: left + w, page: doc.internal.getCurrentPageInfo().pageNumber });
            });
            return text.call(doc, t, x, y, opts, ...rest);
        };
        doc.save = (name) => { rec.saved = name; };
    }]);
});
afterAll(() => {
    globalThis.fetch = realFetch;
    jsPDF.API.addImage = realAddImage;
});
const pdf = async (rep, gisAccount = false) => {
    made = [];
    await exportMarginsPdf(rep, gisAccount);
    const current = made.find((r) => r.saved);
    const draws = current.draws.filter((d) => d.s.trim());
    return {
        ...current, draws,
        pages: current.doc.internal.getNumberOfPages(),
        at: (s, page) => {
            const d = draws.find((x) => x.s === s && (!page || x.page === page));
            if (!d) throw new Error(`"${s}" was not drawn`);
            return d;
        },
        all: (s) => draws.filter((x) => x.s === s),
    };
};
const near = (a, b, what) => expect(Math.abs(a - b), `${what}: ${a.toFixed(3)} vs ${b}`).toBeLessThan(0.05);

describe('PDF', () => {
    it('a landscape page on the documents\' margins: logo, title and a table 10–287 mm', async () => {
        const rep = report();
        const r = await pdf(rep);
        expect(r.saved).toBe('Margins_2026.pdf');
        expect(r.doc.internal.pageSize.getWidth()).toBeCloseTo(297, 1);
        expect(r.images).toEqual(['/logo/logoIms.jpg']);
        near(r.at('Margins 2026').right, 287, 'title ends on the margin');
        // Every word sits between the margins.
        const out = r.draws.filter((d) => d.left < 10 - 0.05 || d.right > 287 + 0.05).map((d) => `"${d.s}" ${d.left.toFixed(1)}–${d.right.toFixed(1)}`);
        expect(out).toEqual([]);
    });

    it('prints the rows, the month totals and the year as the report holds them', async () => {
        const r = await pdf(report());
        for (const s of ['01-2026', '14.01.26', 'Ni 201 solids', 'Triart', 'Solumet', '$500.00', '$10,000.00', '20.000', '$7,500.00', 'Thormet', 'Hast X', 'Total 2026']) {
            expect(r.all(s).length, s).toBeGreaterThan(0);
        }
        // Text as the screen shows it: runs of spaces collapsed (pdfText.js).
        expect(r.all('698 triart turnings')).toHaveLength(1);
        // Month 01's totals line, then the year's: Qty, Total Margin, Open Ship, Remaining.
        for (const s of ['30.000', '$11,500.00', '34.500', '$13,750.00', '19.500', '$9,750.00']) expect(r.all(s).length, s).toBeGreaterThan(0);
        // The two tables under the months, and what the figures mean.
        expect(r.all('Totals')).toHaveLength(1);
        expect(r.all('Total GIS')).toHaveLength(1);
        expect(r.draws.some((d) => d.s.startsWith("Total Margin and Remaining are IMS's share"))).toBe(true);
        expect(r.at('Margins 2026 · page 1 of 1').y).toBeGreaterThan(200);
    });

    it('a figure sits under the middle of its heading, a name starts where its heading starts', async () => {
        const r = await pdf(report());
        const mid = (d) => (d.left + d.right) / 2;
        const head = (s) => r.draws.find((d) => d.s === s && d.y < 40);
        near(mid(r.at('20.000')), mid(head('Qty (MT)')), 'Qty');
        near(mid(r.at('$10,000.00')), mid(head('Total Margin')), 'Total Margin');
        near(r.at('Ni 201 solids').left, head('Description').left, 'Description');
        near(r.at('Triart').left, head('Supplier').left, 'Supplier');
        // The month line starts on the table's edge.
        near(r.at('01-2026').left, 11, 'month line');
    });

    it('"GIS only" — and GIS\'s own logo and label in the GIS workspace', async () => {
        const ims = await pdf(report({ scope: 'shared' }));
        expect(ims.saved).toBe('Margins_2026_GIS-only.pdf');
        near(ims.at('Margins 2026 · GIS only').right, 287, 'title');
        expect(ims.all('Ni 201 solids')).toHaveLength(0);
        expect(ims.all('Hast X')).toHaveLength(1);
        for (const s of ['14.500', '$3,750.00', '$7,500.00']) expect(ims.all(s).length, s).toBeGreaterThan(0);

        const gis = await pdf(report({ scope: 'shared', other: 'IMS', company: 'GIS Metals OÜ' }), true);
        expect(gis.images).toEqual(['/logo/gisLogo.jpg']);
        expect(gis.saved).toBe('Margins_2026_IMS-only.pdf');
        expect(gis.all('Total IMS')).toHaveLength(1);
    });

    // A year of `sizes[m]` deals in month m+1, each named "Deal <month>/<n>".
    const yearOf = (sizes, describe = (m, i) => `Deal ${m + 1}/${i + 1}`) => {
        const months = sizes.map((size, m) => ({
            month: String(m + 1).padStart(2, '0'), ids: [], items: Array.from({ length: size }, (_, i) => ({
                id: `r${m}-${i}`, date: on(`2026-${String(m + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`), purchase: '10', description: describe(m, i),
                supplier: 's1', client: 'c1', margin: '100', totalMargin: 1000, shipped: '4', openShip: 6, remaining: 600, gis: i % 3 === 0,
            })),
        }));
        return buildMarginsReport({ months: viewMonths(months), year: 2026, settings: SETTINGS, company: 'IMS Metals & Alloys OU' });
    };
    // The pages a month's lines are drawn on: its name, each of its deals, its total.
    const pagesOf = (r, rep, m) => {
        const label = rep.months[m].label;
        const name = r.draws.find((d) => d.s === label && d.left < 12);
        const deals = r.draws.filter((d) => d.s.startsWith(`Deal ${m + 1}/`));
        // Its total is the first "Total" line under its last deal, on that page.
        const last = deals[deals.length - 1];
        const total = r.draws.filter((d) => d.s === 'Total' && d.page === last.page && d.y > last.y && d.left < 30).sort((a, b) => a.y - b.y)[0];
        return { name, deals, total, pages: new Set([name.page, ...deals.map((d) => d.page), total?.page]) };
    };

    it('a long year: a month is never split over two pages, and every page has one heading row', async () => {
        const rep = yearOf(Array(12).fill(14));
        const r = await pdf(rep);
        expect(r.pages).toBeGreaterThan(3);
        const dealPages = new Set();
        for (let m = 0; m < 12; m++) {
            const p = pagesOf(r, rep, m);
            expect(p.deals).toHaveLength(14);
            expect(p.total, `month ${m + 1} has its total under its deals`).toBeTruthy();
            expect([...p.pages], `month ${m + 1} is on one page`).toHaveLength(1);
            // In order down the page: its name, its deals, its total.
            expect(p.name.y).toBeLessThan(p.deals[0].y);
            dealPages.add(p.name.page);
        }
        // One heading row at the top of each of those pages — under the title on the first.
        for (const page of dealPages) {
            const heads = r.all('Description').filter((d) => d.page === page);
            expect(heads, `page ${page}`).toHaveLength(1);
            const firstLine = Math.min(...r.draws.filter((d) => d.page === page && /^\d{2}-2026$/.test(d.s) && d.left < 12).map((d) => d.y));
            expect(heads[0].y).toBeLessThan(firstLine);
            expect(heads[0].y).toBeLessThan(page === 1 ? 40 : 20);
        }
        // The year's total closes the last month, on its page.
        expect(r.at('Total 2026').page).toBe(pagesOf(r, rep, 11).name.page);
        // Both totals tables on one page: 12 months and a total, none split.
        const page = r.at('Totals').page;
        expect(r.at('Total GIS').page).toBe(page);
        expect(r.all('12-2026').filter((d) => d.page === page && d.left > 12)).toHaveLength(2);
        // Nothing runs under the page line or off the page.
        expect(r.draws.filter((d) => d.y > 197).map((d) => d.s).every((s) => / · page \d+ of \d+$/.test(s))).toBe(true);
        expect(r.all(`Margins 2026 · page ${r.pages} of ${r.pages}`)).toHaveLength(1);
    });

    it('months of every size: whole whenever a page can hold them, with the columns still true', async () => {
        const rep = yearOf([3, 30, 1, 22, 9, 38, 2, 17, 26, 5]);
        const r = await pdf(rep);
        for (let m = 0; m < 10; m++) expect([...pagesOf(r, rep, m).pages], `month ${m + 1}`).toHaveLength(1);
        // Every "Deal" starts at the Description column's edge, on every page.
        const x = r.at('Description').left;
        for (const d of r.draws.filter((q) => q.s.startsWith('Deal '))) near(d.left, x, d.s);
        expect(new Set(r.all('Description').map((d) => d.left.toFixed(2))).size).toBe(1);
    });

    it('a month longer than a page starts where it is and runs on under the heading', async () => {
        const rep = yearOf([4, 70, 3]);
        const r = await pdf(rep);
        const first = pagesOf(r, rep, 0), long = pagesOf(r, rep, 1), after = pagesOf(r, rep, 2);
        expect([...first.pages]).toEqual([1]);
        // It does not leave the first page nearly empty to start on a fresh one…
        expect(long.name.page).toBe(1);
        expect(long.deals).toHaveLength(70);
        const spread = [...new Set(long.deals.map((d) => d.page))];
        expect(spread.length).toBeGreaterThan(1);
        // …each page it runs onto has the heading row above its deals…
        for (const page of spread.slice(1)) {
            const heads = r.all('Description').filter((d) => d.page === page);
            expect(heads, `page ${page}`).toHaveLength(1);
            expect(heads[0].y).toBeLessThan(Math.min(...long.deals.filter((d) => d.page === page).map((d) => d.y)));
        }
        // …and the short month after it is whole.
        expect([...after.pages]).toHaveLength(1);
        expect(r.draws.filter((d) => d.y > 197).map((d) => d.s).every((s) => / · page \d+ of \d+$/.test(s))).toBe(true);
    });

    it('a description too long for its column wraps inside it, and the month still stays whole', async () => {
        const long = 'Nickel refinery material mixed turnings and solids, as per the photos and the assay sent by the supplier on loading';
        const rep = yearOf([20, 20, 20], (m, i) => (i % 2 ? `Deal ${m + 1}/${i + 1}` : `Deal ${m + 1}/${i + 1} ${long}`));
        const r = await pdf(rep);
        const col = { left: r.at('Description').left, right: r.at('Supplier').left };
        const wrapped = r.draws.filter((d) => d.left >= col.left - 0.05 && d.left < col.right && d.y > 40 && d.page === 1 && !/^Deal \d+\/\d+$/.test(d.s) && d.s !== 'Description');
        expect(wrapped.length).toBeGreaterThan(10);
        for (const d of wrapped) expect(d.right, d.s).toBeLessThanOrEqual(col.right + 0.05);
        for (let m = 0; m < 3; m++) expect([...pagesOf(r, rep, m).pages], `month ${m + 1}`).toHaveLength(1);
    });

    it('console.error is put back, whatever happens', async () => {
        const before = console.error;
        await pdf(report());
        expect(console.error).toBe(before);
        await expect(exportMarginsPdf(null, false)).rejects.toThrow();
        expect(console.error).toBe(before);
    });
});
