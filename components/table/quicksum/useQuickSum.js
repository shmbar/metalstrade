'use client';

import { useMemo } from 'react';
import { toNumber } from './numberUtils';

const getCurrency = (row) => {
  try {
    const curRaw = row.getValue('cur');
    if (!curRaw) return 'plain';
    const c = String(curRaw).toLowerCase().trim();
    if (c === 'us' || c === 'usd') return 'USD';
    if (c === 'eu' || c === 'eur') return 'EUR';
  } catch {}
  return 'plain';
};

/**
 * Is this column money?
 *
 * The row's `cur` column says what currency the ROW trades in — it says nothing
 * about whether a given COLUMN holds money. Applied to every summed column, it
 * stamped a "$" on tonnages: six selected sales contracts summed to 285.864 MT
 * and the bar read "Quantity: $285.86".
 *
 * A quantity and an amount are both just numbers in the data, so nothing can tell
 * them apart by inspection — the column has to say. `meta: { money: false }` marks
 * a count/weight; `meta: { money: true }` forces currency on. Left unsaid, the
 * old behaviour stands, so no existing money column changes.
 */
const isMoneyColumn = (table, colId) => {
  const meta = table.getAllColumns().find(c => c.id === colId)?.columnDef?.meta;
  return meta?.money !== false;
};

export const useQuickSum = ({
  table,
  enabled,
  selectedColumnIds,
}) => {
  const selectedRows = table.getSelectedRowModel().rows;

  const totals = useMemo(() => {
    if (!enabled) return [];
    if (!selectedRows.length) return [];

    return (selectedColumnIds || []).map((colId) => {
      const byCurrency = {};
      const money = isMoneyColumn(table, colId);

      for (const r of selectedRows) {
        const n = toNumber(r.getValue(colId));
        if (!Number.isFinite(n)) continue;
        // A non-money column is one pool regardless of what currency the row
        // trades in — tonnes are tonnes whether the contract is priced in $ or €.
        const currency = money ? getCurrency(r) : 'plain';
        byCurrency[currency] = (byCurrency[currency] || 0) + n;
      }

      const keys = Object.keys(byCurrency);

      // No currency column — return single plain total (backward compat)
      if (keys.length === 0) return { id: colId, total: 0, byCurrency: {}, money };
      if (keys.length === 1 && keys[0] === 'plain') return { id: colId, total: byCurrency.plain, byCurrency: {}, money };

      // Multi-currency — return grouped totals
      return { id: colId, total: null, byCurrency, money };
    });
    // `table` is read for each column's meta.money. useReactTable returns a stable
    // instance, so listing it costs nothing and keeps the flags from going stale.
  }, [enabled, selectedRows, selectedColumnIds, table]);

  return {
    selectedCount: selectedRows.length,
    totals,
  };
};
