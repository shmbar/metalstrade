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

      for (const r of selectedRows) {
        const n = toNumber(r.getValue(colId));
        if (!Number.isFinite(n)) continue;
        const currency = getCurrency(r);
        byCurrency[currency] = (byCurrency[currency] || 0) + n;
      }

      const keys = Object.keys(byCurrency);

      // No currency column — return single plain total (backward compat)
      if (keys.length === 0) return { id: colId, total: 0, byCurrency: {} };
      if (keys.length === 1 && keys[0] === 'plain') return { id: colId, total: byCurrency.plain, byCurrency: {} };

      // Multi-currency — return grouped totals
      return { id: colId, total: null, byCurrency };
    });
  }, [enabled, selectedRows, selectedColumnIds]);

  return {
    selectedCount: selectedRows.length,
    totals,
  };
};
