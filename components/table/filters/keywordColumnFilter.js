import { filterFns } from '@tanstack/react-table';
import { matchesAllWords, searchWords } from '../../../utils/search';

/* The default filter for a column's own "Search..." box: every keyword must be
   in the cell. Set through `defaultColumn` on each table, so a column that names
   its own filterFn (oneOf, dateBetweenFilterFn) keeps it and everything else gets
   this instead of TanStack's `auto`.

   `auto` picked includesString for text — a whole-query substring test, the same
   thing the tables' search box used to do — and, for a figure column whose value
   is stored as a string, the SAME includesString against a [min, max] pair, so
   the Min/Max boxes on those columns never matched a row. A [min, max] value is
   handed to inNumberRange here whatever the cell's type. An id in a dropdown-
   backed column is matched by its label (meta.options), as the search box does.

   The value arrives already resolved (see resolveFilterValue): a range as the
   [min, max] number pair, text as { words }. Text is boxed so that a resolved
   keyword list can never be mistaken for a range. */
const isRange = (v) => Array.isArray(v);

export const keywordColumnFilter = (row, columnId, value, addMeta) => {
  if (isRange(value)) return filterFns.inNumberRange(row, columnId, value, addMeta);
  const words = value?.words ?? searchWords(value);
  if (!words.length) return true;
  const raw = row.getValue(columnId);
  const options = row.getAllCells().find((c) => c.column.id === columnId)?.column.columnDef.meta?.options;
  const vals = Array.isArray(raw) ? raw : [raw];
  const labels = vals.map((v) => (Array.isArray(options)
    ? options.find((o) => String(o.value) === String(v))?.label ?? v
    : v));
  return matchesAllWords(labels, words);
};

// A range resolves as inNumberRange does (strings → numbers, blanks → ±Infinity);
// text resolves to its keywords once per filter pass rather than once per row.
keywordColumnFilter.resolveFilterValue = (value) =>
  isRange(value) ? filterFns.inNumberRange.resolveFilterValue(value) : { words: searchWords(value) };
keywordColumnFilter.autoRemove = (value) =>
  isRange(value) ? filterFns.inNumberRange.autoRemove(value) : !searchWords(value).length;

export default keywordColumnFilter;
