/**
 * Column filter for a checklist: the row passes when its value is one of the
 * ticked ones.
 *
 * TanStack's own filterFns have no "scalar is in a list" — `arrIncludesSome` is
 * the other way round (the CELL holds the array). Every select-type column used
 * to carry a single string and its own equality function (caseInsensitiveEquals,
 * exactMatchFilter, 'equals', or the default includesString), which is exactly
 * why none of them could take two suppliers at once. This is the one function
 * they all use now, and the value MultiSelectFilter writes is `string[]`.
 *
 * Matching is case-insensitive on the trimmed string form, so 'Paid' and 'paid'
 * are one box. A cell that itself holds a list (Consignee on the Contracts
 * Statement stacks one client per line) passes when ANY entry is ticked.
 *
 * An empty list is "no filter", and autoRemove drops it from the table state so
 * "Reset filters" and the active-filter count stay honest.
 */
const norm = (v) => String(v ?? '').trim().toLowerCase();

export const oneOf = (row, columnId, filterValue) => {
  if (!Array.isArray(filterValue) || filterValue.length === 0) return true;
  const wanted = new Set(filterValue.map(norm));
  const v = row.getValue(columnId);
  const cellValues = Array.isArray(v) ? v : [v];
  return cellValues.some((x) => wanted.has(norm(x)));
};

oneOf.autoRemove = (val) => !Array.isArray(val) || val.length === 0;

export default oneOf;
