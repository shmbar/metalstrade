import { sumMonths } from './marginsView';

/* The Margins page as its Excel and PDF print it (marginsExport.js): the months, rows and
   totals exactly as listed — the All / shared-only switch and the search applied — and every
   figure as the screen shows it. Pure, so both files are built from one object and can never
   disagree with each other or with the page. */

const n = (v) => Number(v) || 0;   // as marginsView.js reads a figure, so rows and totals agree
// A figure the row does not have yet (nothing typed): blank, as on screen.
const opt = (v) => (v === '' || v == null ? null : n(v));
// Total Margin and Remaining as their cell shows them: half of a shared deal — the company's share.
const share = (i, key) => (i.gis ? n(i[key]) / 2 : opt(i[key]));
// A row's date: yyyy-mm-dd, or '' when none is set (Excel writes it as a real date)…
const iso = (d) => /^\d{4}-\d{2}-\d{2}/.exec(String(d?.startDate ?? ''))?.[0] || '';
// …and as the table shows it: dd.mm.yy.
const dmy = (d) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso(d));
    return m ? `${m[3]}.${m[2]}.${m[1].slice(2)}` : '';
};
// A line added and never filled in. The page lists it, ready to type into; a printout does
// not. It holds no figure, so every total is the same with or without it.
const blank = (r) => !r.date && !r.description.trim() && !r.supplier && !r.client
    && r.qty == null && r.margin == null && r.shipped == null && !r.totalMargin && !r.openShip && !r.remaining;

export const buildMarginsReport = ({ months, year, scope = 'all', other = 'GIS', query = '', settings, company = '' }) => {
    const sup = (id) => settings?.Supplier?.Supplier?.find((x) => x.id === id)?.nname || '';
    const cli = (id) => settings?.Client?.Client?.find((x) => x.id === id)?.nname || '';
    const label = (m) => `${m.month}-${year}`;
    const shared = scope === 'shared';
    const us = String(company || '').trim().split(/\s+/)[0] || 'the company';
    return {
        year, company, other, query,
        title: `Margins ${year}${shared ? ` · ${other} only` : ''}`,
        columns: ['Date', 'Qty (MT)', 'Description', 'Supplier', 'Client', 'Margin', 'Total Margin', 'Shipped', 'Open Ship', 'Remaining', other],
        // Months with rows in this view, each with its rows and its footer's totals.
        months: (months || []).map((m) => ({
            label: label(m),
            rows: m.items.map((i) => ({
                date: dmy(i.date),
                iso: iso(i.date),
                qty: opt(i.purchase),
                description: String(i.description ?? ''),
                supplier: sup(i.supplier),
                client: cli(i.client),
                margin: opt(i.margin),
                totalMargin: share(i, 'totalMargin'),
                shipped: opt(i.shipped),
                openShip: opt(i.openShip),
                remaining: share(i, 'remaining'),
                shared: !!i.gis,
            })).filter((r) => !blank(r)),
            totals: m.totals,
        })).filter((m) => m.rows.length),
        total: sumMonths(months),
        // The two tables under the page's months: every month, the share and the shared deals whole.
        byMonth: (months || []).map((m) => ({ label: label(m), ...m.totals })),
        wholeByMonth: (months || []).map((m) => ({ label: label(m), ...m.whole })),
        whole: sumMonths(months, 'whole'),
        note: `Total Margin and Remaining are ${us}'s share: a deal ticked ${other} counts half. "Total ${other}" adds those deals up whole.`,
        fileName: `Margins_${year}${shared ? `_${other}-only` : ''}`,
    };
};
