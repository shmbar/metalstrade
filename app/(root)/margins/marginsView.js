/* What the Margins page shows, worked out in one place for the page and its Excel and PDF
   exports, so the two can never print different figures from the screen.

   A row's Total Margin and Remaining are the company's SHARE: a deal ticked as shared with
   the other company (the GIS column in IMS, the IMS column in GIS) is split 50/50, so half of
   it is shown and added up — its cell's tooltip carries the whole. Qty, Shipped and Open Ship
   are the deal's own. The "Total GIS" table adds the shared deals up whole.

   Totals are always added up from the rows, never read off the month document: deleting a row
   left the stored month totals as they were, and the boxes at the top and the Totals table
   kept counting it — GIS 01-2026 read $101,075 profit for rows that make $74,675. */

// A figure as a month's footer reads it (newTable.js `value * 1 || 0`): a number, or 0 for
// anything that is not one yet. parseFloat would read a half-typed "1.2.3" as 1.2 where the
// footer above it counts 0.
const n = (v) => Number(v) || 0;

// The company's share of one row's figure.
export const shareOf = (item, key) => (item?.gis ? n(item[key]) / 2 : n(item[key]));

const ZERO = { purchase: 0, shipped: 0, openShip: 0, totalMargin: 0, remaining: 0 };

// Rows added up as a month's footer adds them: Total Margin and Remaining as the share.
export const totalsOf = (items) => (items || []).reduce((t, i) => ({
    purchase: t.purchase + n(i.purchase),
    shipped: t.shipped + n(i.shipped),
    openShip: t.openShip + n(i.openShip),
    totalMargin: t.totalMargin + shareOf(i, 'totalMargin'),
    remaining: t.remaining + shareOf(i, 'remaining'),
}), { ...ZERO });

// The shared deals among these rows, added up whole — the "Total GIS" table.
export const wholeTotalsOf = (items) =>
    totalsOf((items || []).filter((i) => i?.gis).map((i) => ({ ...i, gis: false })));

/* The months as a view shows them: each month's rows narrowed to the scope — 'all', or
   'shared' for only the deals ticked as shared — and to `keep` (the search box), with the
   totals of exactly those rows. */
export const viewMonths = (data, { scope = 'all', keep } = {}) => (data || []).map((m) => {
    const items = (m.items || []).filter((i) => i && (scope !== 'shared' || i.gis) && (!keep || keep(i)));
    return { ...m, items, totals: totalsOf(items), whole: wholeTotalsOf(items) };
});

/* The totals a month document stores, put back in step with its rows before it is saved. The
   Dashboard, Cashflow and the Assistant read them, and deleting a row never updated them
   (IMS 07-2025, GIS 01-2026). The same sums an edit writes (page.js handleChange). */
export const withStoredTotals = (data) => (data || []).map((m) => {
    const t = totalsOf(m.items || []);
    return { ...m, purchase: t.purchase, openShip: t.openShip, totalMargin: t.totalMargin, remaining: t.remaining };
});

// A view's months added up: `key` 'totals' (the share) or 'whole' (the shared deals whole).
export const sumMonths = (months, key = 'totals') => (months || []).reduce((t, m) => ({
    purchase: t.purchase + (m[key]?.purchase || 0),
    shipped: t.shipped + (m[key]?.shipped || 0),
    openShip: t.openShip + (m[key]?.openShip || 0),
    totalMargin: t.totalMargin + (m[key]?.totalMargin || 0),
    remaining: t.remaining + (m[key]?.remaining || 0),
}), { ...ZERO });
