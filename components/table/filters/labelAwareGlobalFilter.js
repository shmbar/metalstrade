import { matchesAllWords, searchWords } from '../../../utils/search';

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

const rowSearchText = (row) => {
  const cells = row.getAllCells().filter(searchable);
  const sig = cells.map((c) => c.column.id).join('|');
  const hit = cache.get(row);
  if (hit && hit.sig === sig) return hit.text;

  const parts = [];
  for (const cell of cells) {
    const raw = row.getValue(cell.column.id);
    if (raw == null || raw === '') continue;
    const options = cell.column.columnDef.meta?.options;
    const vals = Array.isArray(raw) ? raw : [raw];
    for (const v of vals) {
      const label = Array.isArray(options)
        ? options.find((o) => String(o.value) === String(v))?.label ?? v
        : v;
      if (label != null && typeof label !== 'object') parts.push(String(label));
    }
  }
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
