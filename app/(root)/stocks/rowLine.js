/* A row of the Stocks table → the stock line its window opens.

   On Lines a row is a line. On By grade a row is a fold with a made-up id
   ("grade:<key>") that is in no list; the lines it folds are in `_lineIds`:
     · one line → that line. Such a row has no arrow and nothing under it, so a
       double-click on it is the only way to the line's window;
     · several  → none. They open from their own rows, under the arrow.
   None either for a row that has left the list (reloaded under the click).

   The page looked every row up by its own id. A fold's id found nothing, the window
   opened on nothing, and the whole page went down with "Application error" (client,
   2026-10-05). */
export const lineOfRow = (row, lines) => {
  if (!row) return null
  const ids = row._lineIds ?? [row.id]
  if (ids.length !== 1) return null
  return (lines || []).find(l => l.id === ids[0]) ?? null
}
