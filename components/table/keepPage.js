/* Is a table's new data the SAME list refreshed, or a DIFFERENT list?

   The page a person is on should survive the first and not the second. Saving in an
   edit window hands the table a fresh copy of the same records — one edited, perhaps
   one added or removed — and the person working down page 3 expects to still be on
   page 3. Another warehouse, Lines ↔ By grade, a find-by-spec, a new date range: those
   are different records, and page 3 of them means nothing, so they start at page 1.

   The data cannot say which it is, but the records can: by their own ids. A row with
   no id is keyed by position, so a table without ids still keeps its page across a
   refresh of the same length. Pure — no React — so it is tested on its own
   (__tests__/keepPage.test.js); components/table/useTablePrefs.js useKeepPage uses it. */

export const rowKeys = (rows) => new Set((rows || []).map((r, i) =>
  (r && r.id !== undefined && r.id !== null && r.id !== '' ? `id:${r.id}` : `#${i}`)))

/* Same list when almost every record is on both sides: up to 3 changed, or up to 5% of
   a long list. An edit changes none, a new record or a deletion one; a filter or a
   switch of view changes most of them. */
export const isSameList = (before, after) => {
  if (!before || !after) return false
  let shared = 0
  for (const k of before) if (after.has(k)) shared++
  const changed = (before.size - shared) + (after.size - shared)
  return changed <= Math.max(3, Math.floor(Math.max(before.size, after.size) * 0.05))
}

/* The page to show after a change, or null to leave it alone.
     viewChanged — the person changed what is shown (search, a column filter, the sort)
     sameList    — the rows are the same records refreshed (isSameList)
     pageIndex / pageCount — where the table is now */
export const nextPageIndex = ({ viewChanged = false, sameList = true, pageIndex = 0, pageCount = 0 }) => {
  if (viewChanged || !sameList) return pageIndex === 0 ? null : 0
  // The same list, shorter: a page that no longer exists becomes the last one that does.
  const last = Math.max(0, pageCount - 1)
  return pageIndex > last ? last : null
}
