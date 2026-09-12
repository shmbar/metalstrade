'use client';

import { useMemo, useRef, useState } from 'react';
import { ChevronDown, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@components/ui/popover';
import { matchesAllWords } from '@utils/search';

/**
 * The checklist column filter — tick any number of suppliers, clients, stocks
 * or statuses at once. Replaces the native <select> that every select-type
 * column used to carry, which could hold one value and drew the OS's own
 * square, system-font menu that no CSS could reach.
 *
 * Writes `string[]` to the column's filter value; the column's filterFn must be
 * `oneOf` (./oneOfFilter) or something else that understands a list.
 *
 * Options come from the rows themselves — every distinct value the column
 * holds before any filter is applied, with a count beside each — so the list
 * is never longer than what is actually on the page and never offers a box
 * that would match nothing. A cell holding a list (a stacked Consignee cell)
 * contributes each entry. Labels resolve through `meta.options` ({value,label})
 * where the row stores an id, the same map labelAwareGlobalFilter reads; when
 * options are given their order is kept (a lifecycle reads Pending → Completed,
 * not alphabetically), and anything the data holds that they don't name goes
 * after, sorted.
 *
 * The search box appears at six or more options, the same line Selector draws:
 * below that the box is more chrome than help.
 */
const norm = (v) => String(v ?? '').trim().toLowerCase();

export function MultiSelectFilter({ column, table, placeholder = 'All' }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const searchRef = useRef(null);

  const raw = column.getFilterValue();
  const selected = useMemo(() => (Array.isArray(raw) ? raw : []), [raw]);
  const selectedSet = useMemo(() => new Set(selected.map(norm)), [selected]);

  const meta = column.columnDef.meta || {};
  const preRows = table.getPreFilteredRowModel().rows;

  const options = useMemo(() => {
    const counts = new Map(); // norm(value) → { value, count }
    for (const row of preRows) {
      const v = row.getValue(column.id);
      const vals = Array.isArray(v) ? v : [v];
      for (const x of vals) {
        if (x === null || x === undefined || String(x).trim() === '') continue;
        const k = norm(x);
        const cur = counts.get(k);
        if (cur) cur.count += 1;
        else counts.set(k, { value: x, count: 1 });
      }
    }
    const labelled = Array.isArray(meta.options) ? meta.options : null;
    const labelOf = (v) => {
      if (!labelled) return String(v);
      return labelled.find((o) => String(o.value) === String(v))?.label ?? String(v);
    };
    const list = [...counts.values()].map((o) => ({ ...o, label: labelOf(o.value) }));
    if (labelled) {
      const order = new Map(labelled.map((o, i) => [norm(o.value), i]));
      list.sort((a, b) => {
        const ia = order.has(norm(a.value)) ? order.get(norm(a.value)) : Infinity;
        const ib = order.has(norm(b.value)) ? order.get(norm(b.value)) : Infinity;
        if (ia !== ib) return ia - ib;
        return a.label.localeCompare(b.label);
      });
    } else {
      list.sort((a, b) => a.label.localeCompare(b.label));
    }
    return list;
  }, [preRows, column.id, meta.options]);

  const searchable = options.length > 5;
  const shown = query
    ? options.filter((o) => matchesAllWords(o.label, query))
    : options;

  const commit = (next) => column.setFilterValue(next.length ? next : undefined);
  const toggle = (value) => {
    const k = norm(value);
    commit(selectedSet.has(k) ? selected.filter((s) => norm(s) !== k) : [...selected, value]);
  };
  const selectShown = () => {
    const merged = [...selected];
    for (const o of shown) if (!selectedSet.has(norm(o.value))) merged.push(o.value);
    commit(merged);
  };
  const clear = () => commit([]);

  // What the closed trigger says. One name reads as itself; two or more read as
  // the first plus a count, which is still a name — "2 selected" alone would
  // force a click just to see which two.
  const labelOfValue = (v) => options.find((o) => norm(o.value) === norm(v))?.label ?? String(v);
  const summary = selected.length === 0
    ? placeholder
    : selected.length === 1
      ? labelOfValue(selected[0])
      : `${labelOfValue(selected[0])} +${selected.length - 1}`;
  const active = selected.length > 0;

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setQuery(''); }}>
      <PopoverTrigger asChild>
        <button
          type="button"
          title={active ? selected.map(labelOfValue).join(', ') : 'Filter'}
          className={`group flex items-center gap-1 w-full h-6 min-w-0 px-2 rounded-lg border bg-[var(--bg-card)] responsiveText font-normal text-left transition-colors focus:outline-none focus:border-[var(--brand)] ${
            active ? 'border-[var(--brand)]' : 'border-[var(--line-strong)]'
          }`}
        >
          <span className={`flex-1 min-w-0 truncate ${active ? 'text-[var(--ink)]' : 'text-[var(--ink-muted)]'}`}>
            {summary}
          </span>
          {active ? (
            /* A span, not a nested <button>: the trigger is already a button. */
            <span
              role="button"
              aria-label="Clear filter"
              onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); clear(); }}
              className="field-clear -mr-1"
            >
              <X />
            </span>
          ) : (
            <ChevronDown className="w-3 h-3 shrink-0 text-[var(--ink-muted)]" aria-hidden="true" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={4}
        className="z-popover w-56 p-0 overflow-hidden rounded-2xl border-[var(--line)] bg-[var(--bg-card)] shadow-pop"
        onOpenAutoFocus={(e) => {
          if (!searchable) return;
          e.preventDefault();
          requestAnimationFrame(() => searchRef.current?.focus());
        }}
      >
        {searchable && (
          <div className="p-1.5 border-b border-[var(--line)]">
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false); }}
              placeholder="Search…"
              className="w-full h-7 px-2 rounded-lg border border-[var(--line-strong)] bg-[var(--bg-subtle)] responsiveTextInput text-[var(--ink)] focus:outline-none focus:border-[var(--brand)]"
            />
          </div>
        )}

        <div className="max-h-56 overflow-y-auto py-1">
          {shown.length === 0 ? (
            <div className="px-3 py-2 responsiveTextInput text-[var(--ink-muted)]">
              {options.length === 0 ? 'Nothing to filter' : 'No matches'}
            </div>
          ) : shown.map((o) => {
            const checked = selectedSet.has(norm(o.value));
            return (
              <label
                key={norm(o.value)}
                className="flex items-center gap-2 px-2.5 py-1 cursor-pointer hover:bg-[var(--bg-subtle)] transition-colors responsiveTextInput"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(o.value)}
                  className="w-3.5 h-3.5 shrink-0 rounded cursor-pointer"
                  style={{ accentColor: 'var(--brand)' }}
                />
                <span className={`flex-1 min-w-0 truncate ${checked ? 'text-[var(--ink)] font-medium' : 'text-[var(--ink)]'}`}>
                  {o.label}
                </span>
                <span className="numeric responsiveTextTable text-[var(--ink-muted)]">{o.count}</span>
              </label>
            );
          })}
        </div>

        <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 border-t border-[var(--line)] bg-[var(--bg-subtle)] responsiveTextTable">
          <button
            type="button"
            onClick={selectShown}
            disabled={shown.length === 0}
            className="text-[var(--brand)] hover:underline disabled:opacity-50 disabled:no-underline"
          >
            {query ? 'Select shown' : 'Select all'}
          </button>
          <span className="numeric text-[var(--ink-muted)]">{active ? `${selected.length} selected` : ''}</span>
          <button
            type="button"
            onClick={clear}
            disabled={!active}
            className="text-[var(--ink-secondary)] hover:underline disabled:opacity-50 disabled:no-underline"
          >
            Clear
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default MultiSelectFilter;
