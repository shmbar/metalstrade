'use client';

import { isNumericLike } from './numberUtils';

/**
 * Detect numeric columns by sampling row values.
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
    if (exclude.includes(id)) continue;
    if (col.columnDef?.meta?.excludeFromQuickSum) continue;
    if (col.columnDef?.meta?.options) continue;
    if (col.columnDef?.meta?.filterVariant === 'dates') continue;
    
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
      });
    }
  }

  return numeric;
};
