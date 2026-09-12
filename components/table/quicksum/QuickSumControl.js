'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { detectNumericCols } from './detectNumericCols';
import { useQuickSum } from './useQuickSum';
import { BtnIcon } from '../../buttonIcons';
import SumPanel, { SumPanelAction, SumStat } from '../../SumPanel';
import { exportQuickSum } from './exportQuickSum';

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

  /* Two jobs, and they have to stay apart.

     1. Drop ticked columns that are no longer on offer. One that stops qualifying
        used to stay ticked and keep showing its total — Description was summable
        until the parser was tightened, so a session that had already picked it
        would otherwise go on displaying that 4,435.00.
     2. Pick a default ONCE per switch-on, the first of the offered columns
        (quantities rank first — see detectNumericCols).

     The old version re-picked whenever the list was empty, which is also the state
     "Clear columns" leaves behind — so that button cleared the ticks and the
     default came straight back. A deliberate empty selection now stays empty. */
  const pickedDefault = useRef(false);
  useEffect(() => {
    if (!enabled) { pickedDefault.current = false; return; }
    if (!numericCols.length) return;
    const offered = new Set(numericCols.map((c) => c.id));
    const cur = selectedColumnIds || [];
    const kept = cur.filter((id) => offered.has(id));
    if (kept.length !== cur.length) { setSelectedColumnIds(kept); return; }
    if (!pickedDefault.current && kept.length === 0) {
      pickedDefault.current = true;
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
        className={enabled
            ? 'whiteButton whitespace-nowrap !bg-[var(--brand)] !text-[var(--on-brand)] !border-[var(--line)]'
            : 'whiteButton whitespace-nowrap'}
        title="Quick Sum"
      >
        <BtnIcon action="sum" />Quick Sum
      </button>

      {enabled && (
        <div className="relative">
          <button
            ref={triggerRef}
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="whiteButton whitespace-nowrap"
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
                className="bg-[var(--bg-card)] border border-[var(--line)] rounded-2xl shadow-lg p-3"
              >
                <div className="responsiveTextTitle font-medium text-[var(--port-gore)] mb-2 pl-1">
                  Select numeric columns
                </div>

                {numericCols.length === 0 ? (
                  <div className="responsiveTextTitle text-[var(--port-gore)] p-2">
                    No numeric columns detected.
                  </div>
                ) : (
                  <div className="max-h-56 overflow-auto">
                    {numericCols.map((c) => (
                      <label
                        key={c.id}
                        className="flex items-center gap-2 responsiveTextInput py-2 px-2 cursor-pointer hover:bg-[var(--selago)]/50 rounded-lg transition-colors"
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

                <div className="mt-2 pt-2 border-t border-[var(--line)] flex items-center justify-between">
                  <button
                    type="button"
                    className="responsiveTextInput text-[var(--endeavour)] hover:underline"
                    onClick={() => setSelectedColumnIds([])}
                  >
                    Clear columns
                  </button>
                  <button
                    type="button"
                    className="responsiveTextInput text-[var(--endeavour)] hover:underline"
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
 * QuickSumTotals — the selection tally, as the same floating panel Cashflow's
 * basket uses (components/SumPanel). It used to be an inline bar between the
 * toolbar and the table, which pushed every row down the moment the first one was
 * ticked; floating, the table never moves under the cursor.
 */
export function QuickSumTotals({
  table,
  enabled,
  selectedColumnIds,
  exportName = 'selection',
}) {
  const { selectedCount, totals } = useQuickSum({
    table,
    enabled,
    selectedColumnIds,
  });
  // Declared above the early returns below — a hook cannot sit behind a condition.
  const [exporting, setExporting] = useState(false);
  const [exportErr, setExportErr] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!enabled) return null;

  if (selectedCount === 0) return null;

  // One pill per figure. A plain or single-currency column is one line; a column
  // whose rows mix $ and € is one line per currency — never added across them.
  const stats = (totals || []).flatMap((t) => {
    // A column header can be a render function (sortable headers are); only a
    // string is a label. Falls back to the column id rather than rendering nothing.
    const header = table.getAllColumns().find(c => c.id === t.id)?.columnDef?.header;
    const label = typeof header === 'string' ? header : t.id;
    // Money is always 2dp. A quantity is not: these tables carry tonnages to
    // three ("18.289"), and forcing 2 turned a 285.864 MT total into 285.86.
    const fmt = (n) => new Intl.NumberFormat('en-US',
      t.money === false
        ? { minimumFractionDigits: 0, maximumFractionDigits: 3 }
        : { minimumFractionDigits: 2, maximumFractionDigits: 2 }
    ).format(n);

    if (t.byCurrency && Object.keys(t.byCurrency).length > 0) {
      const out = [];
      if (t.byCurrency.USD != null) out.push({ key: `${t.id}-usd`, label, badge: '$', text: `$${fmt(t.byCurrency.USD)}` });
      if (t.byCurrency.EUR != null) out.push({ key: `${t.id}-eur`, label, badge: '€', text: `€${fmt(t.byCurrency.EUR)}` });
      if (t.byCurrency.plain != null) out.push({ key: `${t.id}-plain`, label, text: fmt(t.byCurrency.plain) });
      return out;
    }
    return [{ key: t.id, label, text: fmt(t.total) }];
  });

  const copySummary = () => {
    const out = `Selected rows (${selectedCount})\n${stats.map(s => `${s.label}\t${s.text}`).join('\n')}`;
    navigator.clipboard?.writeText(out).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }).catch(() => {});
  };

  // Same totals the panel is showing, as a spreadsheet. Lives here rather than in
  // each page's excel.js so every Quick Sum table has it, including future ones.
  const runExport = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      await exportQuickSum({ table, totals, summedColumnIds: selectedColumnIds, filename: exportName });
    } catch (e) {
      // Said on the button, not only in the console — a silent catch looks idle.
      console.error('Quick Sum export failed', e);
      setExportErr(true);
      setTimeout(() => setExportErr(false), 2500);
    } finally {
      setExporting(false);
    }
  };

  return (
    <SumPanel
      title="Selected rows"
      count={selectedCount}
      storageKey="ims:quickSumPos"
      actions={<>
        <SumPanelAction action="excel" onClick={runExport} disabled={exporting} pulse={exporting} danger={exportErr}
          title={exportErr ? 'Export failed — see the browser console' : 'Export selection to Excel'} />
        <SumPanelAction action={copied ? 'confirm' : 'copy'} onClick={copySummary} disabled={!stats.length} title="Copy summary" />
        <SumPanelAction action="close" onClick={() => table.resetRowSelection()} title="Clear rows" />
      </>}
    >
      <div className="px-3 py-2.5 flex flex-col gap-1.5 bg-[var(--surface-card)]">
        {stats.length ? (
          stats.map(s => <SumStat key={s.key} label={s.label} badge={s.badge} value={s.text} />)
        ) : (
          <div className="responsiveTextTable text-[var(--ink-muted)] italic">
            No columns summed — pick them from Columns ▾
          </div>
        )}
      </div>
    </SumPanel>
  );
}

// Default export for backward compat
export default QuickSumButton;
