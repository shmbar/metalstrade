'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { detectNumericCols } from './detectNumericCols';
import { useQuickSum } from './useQuickSum';

/**
 * QuickSumButton — toggle + columns picker, sits inline in the icons row
 */
export function QuickSumButton({
  table,
  enabled,
  setEnabled,
  selectedColumnIds,
  setSelectedColumnIds,
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);
  const [dropdownStyle, setDropdownStyle] = useState({});
  const [portalNode, setPortalNode] = useState(null);

  // Create portal node on mount
  useEffect(() => {
    const node = document.createElement('div');
    node.setAttribute('id', 'quicksum-columns-portal');
    document.body.appendChild(node);
    setPortalNode(node);
    return () => {
      if (node.parentNode) node.parentNode.removeChild(node);
    };
  }, []);

  // Update dropdown position when open
  useEffect(() => {
    if (!open || !triggerRef.current) return;

    const updatePos = () => {
      const rect = triggerRef.current.getBoundingClientRect();
      const ddWidth = 256;
      const ddHeight = 300;
      const margin = 12;

      let top = rect.bottom + 8;
      let left = rect.right - ddWidth;

      if (left < margin) left = margin;
      if (left + ddWidth > window.innerWidth - margin) {
        left = window.innerWidth - ddWidth - margin;
      }
      if (top + ddHeight > window.innerHeight - margin) {
        top = rect.top - ddHeight - 8;
        if (top < margin) top = margin;
      }

      setDropdownStyle({
        position: 'fixed',
        top: Math.round(top) + 'px',
        left: Math.round(left) + 'px',
        zIndex: 999999,
        width: ddWidth + 'px'
      });
    };

    updatePos();
    window.addEventListener('resize', updatePos);
    window.addEventListener('scroll', updatePos, true);

    return () => {
      window.removeEventListener('resize', updatePos);
      window.removeEventListener('scroll', updatePos, true);
    };
  }, [open]);

  const currentRowCount = table.getRowModel().rows.length;

  const numericCols = useMemo(() => {
    return detectNumericCols({ table, sampleSize: 60, exclude: ['select'] });
  }, [table, currentRowCount]);

  useEffect(() => {
    if (!enabled) return;
    if (selectedColumnIds?.length) return;
    if (numericCols.length) {
      setSelectedColumnIds([numericCols[0].id]);
    }
  }, [enabled, numericCols, selectedColumnIds, setSelectedColumnIds]);

  const toggleEnabled = () => {
    const next = !enabled;
    setEnabled(next);
    if (!next) {
      table.resetRowSelection();
      setOpen(false);
    }
  };

  const toggleCol = (colId) => {
    setSelectedColumnIds((prev) => {
      const cur = Array.isArray(prev) ? prev : [];
      if (cur.includes(colId)) return cur.filter((x) => x !== colId);
      return [...cur, colId];
    });
  };

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={toggleEnabled}
        className={`px-3 py-1 rounded-2xl text-[11px] font-medium transition-all border
          ${enabled
            ? 'bg-[var(--endeavour)] border-[var(--endeavour)]'
            : 'bg-white text-[var(--endeavour)] border-[var(--endeavour)] hover:bg-[var(--selago)]'}`}
        style={enabled ? { color: '#ffffff' } : {}}
        title="Quick Sum"
      >
        Quick Sum
      </button>

      {enabled && (
        <div className="relative">
          <button
            ref={triggerRef}
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="px-2 py-1 rounded-2xl text-[11px] font-medium transition-all bg-white text-[var(--port-gore)] border border-[var(--rock-blue)]/50 hover:border-[var(--endeavour)]"
            title="Choose columns"
          >
            Columns ▾
          </button>

          {open && portalNode && createPortal(
            <>
              <div
                style={{ position: 'fixed', top: 0, right: 0, bottom: 0, left: 0, zIndex: 999998, background: 'transparent' }}
                onClick={() => setOpen(false)}
              />
              <div
                style={dropdownStyle}
                className="bg-white border border-[var(--selago)] rounded-xl shadow-lg p-3"
              >
                <div className="text-sm font-medium text-[var(--port-gore)] mb-2 pl-1">
                  Select numeric columns
                </div>

                {numericCols.length === 0 ? (
                  <div className="text-sm text-[var(--port-gore)] p-2">
                    No numeric columns detected.
                  </div>
                ) : (
                  <div className="max-h-56 overflow-auto">
                    {numericCols.map((c) => (
                      <label
                        key={c.id}
                        className="flex items-center gap-2 text-xs py-2 px-2 cursor-pointer hover:bg-[var(--selago)]/50 rounded-lg transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={(selectedColumnIds || []).includes(c.id)}
                          onChange={() => toggleCol(c.id)}
                          className="w-4 h-4 accent-[var(--endeavour)] rounded"
                        />
                        <span className="truncate text-[var(--port-gore)]">{c.label}</span>
                      </label>
                    ))}
                  </div>
                )}

                <div className="mt-2 pt-2 border-t border-[var(--selago)] flex items-center justify-between">
                  <button
                    type="button"
                    className="text-xs text-[var(--endeavour)] hover:underline"
                    onClick={() => setSelectedColumnIds([])}
                  >
                    Clear columns
                  </button>
                  <button
                    type="button"
                    className="text-xs text-[var(--endeavour)] hover:underline"
                    onClick={() => setOpen(false)}
                  >
                    Close
                  </button>
                </div>
              </div>
            </>,
            portalNode
          )}
        </div>
      )}
    </div>
  );
}

/**
 * QuickSumTotals — displays the totals row, rendered separately below controls
 */
export function QuickSumTotals({
  table,
  enabled,
  selectedColumnIds,
}) {
  const { selectedCount, totals } = useQuickSum({
    table,
    enabled,
    selectedColumnIds,
  });

  if (!enabled) return null;

  if (selectedCount === 0) return null;

  return (
    <div className="inline-flex flex-wrap items-center gap-1.5 text-xs text-[var(--port-gore)] border border-[var(--endeavour)] rounded-2xl bg-white px-3 py-1.5 shadow-sm">
      <span className="font-semibold text-[var(--endeavour)]">{selectedCount} selected</span>
      <span className="text-[var(--rock-blue)]">|</span>
      {(totals || []).map((t) => {
        const col = table.getAllColumns().find(c => c.id === t.id);
        const label = col?.columnDef?.header || t.id;
        const formatted = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(t.total);
        return (
          <span key={t.id} className="bg-white border border-[var(--selago)] rounded-full px-3 py-0.5 text-[11px] whitespace-nowrap font-medium">
            {label}: <span className="text-[var(--endeavour)]">{formatted}</span>
          </span>
        );
      })}
      <button
        type="button"
        className="text-[11px] underline text-[var(--endeavour)] ml-1"
        onClick={() => table.resetRowSelection()}
      >
        Clear rows
      </button>
    </div>
  );
}

// Default export for backward compat
export default QuickSumButton;
