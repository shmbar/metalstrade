'use client';

import { isNumericLike } from './numberUtils';
import { columnRank, isIdentifierColumn } from './columnKind';

/**
 * Which columns Quick Sum offers, best first.
 *
 * A column qualifies when the values actually in it are numbers — with the strict
 * parser, "751 Microgranules" no longer counts as 751, so Description is out.
 * Reference columns are out too: PO# 280526 and invoice 2630989 parse perfectly
 * and add up to nothing anybody wants (a page can force one in with
 * `meta: { money: true }` or force any column out with `excludeFromQuickSum`).
 *
 * Order matters because the first one is what gets summed by default: quantities,
 * then money, then anything else — so Stocks opens on Quantity rather than on
 * whichever numeric column happens to sit leftmost.
 *
 * Returns: [{ id, label }]
 */
export const detectNumericCols = ({
  table,
  sampleSize = 50,
  exclude = ['select'],
}) => {
  const cols = table.getAllLeafColumns();

  // sample from current row model (already filtered/sorted)
  const rows = table.getRowModel().rows.slice(0, sampleSize);

  const numeric = [];
  for (const col of cols) {
    const id = col.id;
    const meta = col.columnDef?.meta;
    if (exclude.includes(id)) continue;
    if (meta?.excludeFromQuickSum) continue;
    if (meta?.options) continue;
    if (meta?.filterVariant === 'dates') continue;
    if (isIdentifierColumn(col) && meta?.money !== true) continue;

    let hits = 0;
    let seen = 0;

    for (const r of rows) {
      const v = r.getValue(id);
      if (v == null || v === '') continue;
      seen += 1;
      if (isNumericLike(v)) hits += 1;
    }

    // Decide numeric if:
    // - we saw at least 1 value, and
    // - most of them are numeric-like
    if (seen > 0 && hits / seen >= 0.7) {
      numeric.push({
        id,
        label: String(col.columnDef?.header ?? id),
        rank: columnRank(col),
      });
    }
  }

  // Stable: equal ranks keep the table's own column order.
  return numeric
    .map((c, i) => ({ ...c, i }))
    .sort((a, b) => (a.rank - b.rank) || (a.i - b.i))
    .map(({ id, label }) => ({ id, label }));
};
