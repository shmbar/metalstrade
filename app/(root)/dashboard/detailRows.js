import { matchesAllWords, shownAs } from '../../../utils/search';
import { toIsoDate } from '../../../utils/pureHelpers';

/* Search and sort for the records behind a Dashboard card (client, 2026-10-08: "when
   opening cards, should be able to filter, and sort"). The phone's sheet does the same
   (mobile/src/features/dashboard/detailRows.ts).

   A column is { key, label, right?, render?(row), sort?(row) } — the shape page.js's card
   details already use. The search is the app's keyword search — every word anywhere in what
   a row SHOWS, a comma = either (utils/search.js) — and it also finds a figure typed in full,
   though the cells show it compact ($315.67K). A column sorts on its own `sort`, else on its
   raw figure (a right-aligned column), its date, or the text on screen: "Vendor" stores an
   id but reads, and so sorts, as a name. */

// The text a cell shows — a string, a number, or the words inside a rendered element.
export const textOf = (n) => (n == null || typeof n === 'boolean') ? ''
  : (typeof n === 'string' || typeof n === 'number') ? String(n)
  : Array.isArray(n) ? n.map(textOf).join(' ')
  : n.props ? textOf(n.props.children) : '';

export const cellText = (c, r) => textOf(c.render ? c.render(r) : r[c.key]);

// Every way a row can be found: what each cell shows, and — for a figure or a date — its
// value as the screens write it, so a full amount finds a compact $315.67K (a computed
// column through its own `sort`). Never a stored id: a Vendor cell stores a settings uuid
// and shows a name, and a search must not find a row by a uuid's letters.
export const rowWords = (cols, r) => cols.flatMap((c) => {
  const raw = c.right ? (c.sort ? c.sort(r) : r[c.key]) : c.key === 'date' ? r.date : null;
  return [cellText(c, r), ...shownAs(raw)];
});

export const matchesRow = (cols, r, query) => matchesAllWords(rowWords(cols, r), query);

export const dateMs = (d) => {
  const iso = toIsoDate(String(d || ''));
  const t = iso ? Date.parse(iso) : NaN;
  return Number.isFinite(t) ? t : null;
};

export const sortValue = (c, r) => {
  if (c.sort) return c.sort(r);
  if (c.right) { const n = parseFloat(r[c.key]); return Number.isFinite(n) ? n : null; }
  if (c.key === 'date') return dateMs(r.date);
  const t = cellText(c, r).trim();
  return t && t !== '—' ? t.toLowerCase() : null;
};

// One column's order. A row with nothing in that column goes last either way; rows that
// tie keep the order the card gave them.
export const sortByCol = (rows, c, dir) => rows
  .map((r) => ({ r, v: sortValue(c, r) }))
  .sort((x, y) => {
    if (x.v == null) return y.v == null ? 0 : 1;
    if (y.v == null) return -1;
    const d = typeof x.v === 'number' && typeof y.v === 'number'
      ? x.v - y.v
      : String(x.v).localeCompare(String(y.v), undefined, { numeric: true });
    return dir === 'asc' ? d : -d;
  })
  .map((x) => x.r);

export const NO_SORT = { key: null, dir: 'asc' };
// A first click sorts A→Z / smallest first, the next one turns it round — as every other
// sortable table in the app (components/table/sorting.js useSortState).
export const nextSort = (s, key) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' });

// The rows a card shows: those the search finds, in the column order chosen.
export const visibleRows = (rows, cols, query, sort) => {
  const hit = query ? rows.filter((r) => matchesRow(cols, r, query)) : rows;
  const col = cols.find((c) => c.key === sort?.key);
  return col ? sortByCol(hit, col, sort.dir) : hit;
};
