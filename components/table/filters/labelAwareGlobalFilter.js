import { matchesAllWords, searchWords, shownAs } from '../../../utils/search';

/* The tables' search box: every keyword must be found somewhere in the ROW.
 *
 * TanStack calls a global filter once per column and keeps the row if any call
 * says yes, so the old version answered "does THIS column contain the whole
 * query?" — and "708 triart" matched nothing, because no single cell holds both
 * the description and the supplier. This one ignores the column it was asked
 * about, builds the row's searchable text from every column the table lets the
 * box search, and asks whether each word is in there. The answer is the same
 * for every column of a row, so it is worked out once per row per query.
 *
 * A column backed by a dropdown stores an id; its meta.options ({ value, label })
 * turn the id into the name on screen, so the box matches what the user reads.
 * A cell that holds a list (the statement's stacked Consignee) contributes every
 * entry. Columns opted out with enableGlobalFilter: false (the figure columns on
 * Stocks) stay out. */
const cache = new WeakMap(); // row → { sig, text }

/* Which columns the box reads. NOT column.getCanGlobalFilter(): TanStack's default
   for that looks at the FIRST row only and says no unless its value is a plain
   string or number — so a stacked cell (the statement's Consignee list) and any
   column whose first row happens to be blank were unsearchable on every row. A
   column is in unless it opts out with enableGlobalFilter: false. */
const searchable = (c) => c.column.accessorFn && c.column.columnDef.enableGlobalFilter !== false;

/* A flag a column draws as its OWN words rather than Yes/No. Every table's `completed`
   column reads Completed / Incompleted (contracts, invoices, expenses, misc invoices…);
   a column elsewhere can say what it writes with meta.boolLabels: [ifTrue, ifFalse]. */
const BOOL_LABELS = { completed: ['Completed', 'Incompleted'] };
const boolLabelsOf = (column) => column.columnDef.meta?.boolLabels || BOOL_LABELS[column.id] || null;
const boolWords = (column, v) => {
  const labels = boolLabelsOf(column);
  return labels ? [v ? labels[0] : labels[1]] : [];
};

/* Everything one cell says on the screen: its value as stored, as the screens write it
   (utils/search.js shownAs — dates, figures, flags), and whatever its column draws
   around it (meta.searchText(value, rowOriginal) — an invoice number's CN/FN, say). */
export const cellSearchParts = (column, raw, original) => {
  const parts = [];
  if (raw == null || raw === '') {
    // Never set is not "nothing on the screen": a flag column draws its false word
    // ("Incompleted" on a contract nobody has completed yet).
    if (boolLabelsOf(column)) parts.push(...boolWords(column, false));
  } else {
    const options = column.columnDef.meta?.options;
    const vals = Array.isArray(raw) ? raw : [raw];
    for (const v of vals) {
      const label = Array.isArray(options)
        ? options.find((o) => String(o.value) === String(v))?.label ?? v
        : v;
      if (label == null || typeof label === 'object') continue;
      parts.push(...shownAs(label));
      if (typeof label === 'boolean') parts.push(...boolWords(column, label));
    }
  }
  const extra = column.columnDef.meta?.searchText;
  if (typeof extra === 'function') {
    const t = extra(raw, original);
    if (t != null && t !== '') parts.push(String(t));
  }
  return parts;
};

const rowSearchText = (row) => {
  const cells = row.getAllCells().filter(searchable);
  const sig = cells.map((c) => c.column.id).join('|');
  const hit = cache.get(row);
  if (hit && hit.sig === sig) return hit.text;

  const parts = [];
  for (const cell of cells) {
    parts.push(...cellSearchParts(cell.column, row.getValue(cell.column.id), row.original));
  }
  /* A row that stands for others — a Contracts Statement PO over its lines — is searched
     by what it holds as well as by its own cells, so a word that is only on its lines
     still finds it. A sub-row is still filtered on its own when the row expands.
     (Stocks' By grade does not come through here: it searches the lines themselves and
     folds the ones found into grades — stocks/newTable.js, client 2026-10-06.) */
  (row.subRows || []).forEach((sub) => parts.push(rowSearchText(sub)));
  const text = parts.join(' ');
  cache.set(row, { sig, text });
  return text;
};

export const labelAwareGlobalFilter = (row, _columnId, filterValue) => {
  const words = Array.isArray(filterValue) ? filterValue : searchWords(filterValue);
  if (!words.length) return true;
  return matchesAllWords(rowSearchText(row), words);
};

// Split the query once per filter pass rather than once per row × column.
labelAwareGlobalFilter.resolveFilterValue = (value) => searchWords(value);
labelAwareGlobalFilter.autoRemove = (value) => !searchWords(value).length;

export default labelAwareGlobalFilter;
