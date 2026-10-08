import { matchesAllWords, shownAs } from '@shared/search';
import { toIsoDate } from '@shared/pureHelpers';

/* Search and sort for the records behind a Dashboard card — as web's Dashboard
   (app/(root)/dashboard/detailRows.js; client, 2026-10-08: "when opening cards, should be
   able to filter, and sort"). The search is the shared keyword search over everything a row
   shows; Amount and Date start largest / newest, Name A–Z, and a second tap turns the order
   round. A row with nothing to sort on goes last either way; ties keep the card's order. */

/** The fields of a sheet row the search and the sort read (webCards DetailRow). */
export interface SearchableRow {
  title: string;
  meta?: string;
  sub?: string;
  value: string;
  valueSub?: string;
  amount?: number;
  date?: string;
  /** Other figures the row shows only compact ("Paid $1.23K") — a search finds them typed in full, as web's. */
  figures?: number[];
}

export type SheetSortKey = 'amount' | 'date' | 'name';
export type SheetSort = { key: SheetSortKey | null; dir: 'asc' | 'desc' };

export const SHEET_SORTS: { key: SheetSortKey; label: string; first: 'asc' | 'desc' }[] = [
  { key: 'amount', label: 'Amount', first: 'desc' },
  { key: 'date', label: 'Date', first: 'desc' },
  { key: 'name', label: 'Name', first: 'asc' },
];

export const NO_SHEET_SORT: SheetSort = { key: null, dir: 'desc' };

export const dateMs = (d?: string): number | null => {
  const iso = toIsoDate(d || '');
  const t = iso ? Date.parse(iso) : NaN;
  return Number.isFinite(t) ? t : null;
};

// A row with no name ('—', as web shows it) has nothing to sort on — it goes last, as on web.
const nameValue = (r: SearchableRow) => {
  const t = (r.title || '').trim();
  return t && t !== '—' ? t.toLowerCase() : null;
};

const sortValue = (r: SearchableRow, key: SheetSortKey): number | string | null =>
  key === 'amount' ? (Number.isFinite(r.amount) ? (r.amount as number) : null)
    : key === 'date' ? dateMs(r.date)
      : nameValue(r);

export const sortSheetRows = <T extends SearchableRow>(rows: T[], key: SheetSortKey, dir: 'asc' | 'desc'): T[] =>
  rows
    .map((r) => ({ r, v: sortValue(r, key) }))
    .sort((x, y) => {
      if (x.v == null) return y.v == null ? 0 : 1;
      if (y.v == null) return -1;
      const d = typeof x.v === 'number' && typeof y.v === 'number'
        ? x.v - y.v
        : String(x.v).localeCompare(String(y.v), undefined, { numeric: true });
      return dir === 'asc' ? d : -d;
    })
    .map((x) => x.r);

/** Tapping a sort chip: a new key starts in its own direction, the active one turns round. */
export const nextSheetSort = (s: SheetSort, key: SheetSortKey): SheetSort =>
  s.key === key ? { key, dir: s.dir === 'desc' ? 'asc' : 'desc' } : { key, dir: SHEET_SORTS.find((x) => x.key === key)!.first };

/** Only the orders these rows can take: a list of clients has no dates. */
export const sortsFor = (rows: SearchableRow[]) =>
  SHEET_SORTS.filter((s) => s.key === 'name' || rows.some((r) => (s.key === 'amount' ? Number.isFinite(r.amount) : dateMs(r.date) != null)));

/** The rows a sheet shows: those the search finds, in the order chosen. */
export const visibleSheetRows = <T extends SearchableRow>(rows: T[], query: string, sort: SheetSort): T[] => {
  const hit = query
    ? rows.filter((r) => matchesAllWords(
      [r.title, r.meta, r.sub, r.value, r.valueSub, ...shownAs(r.amount), ...shownAs(r.date), ...(r.figures || []).flatMap((f) => shownAs(f))],
      query
    ))
    : rows;
  return sort.key ? sortSheetRows(hit, sort.key, sort.dir) : hit;
};
