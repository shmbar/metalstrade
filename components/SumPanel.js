'use client';
import { useRef, useState } from 'react';
import { BtnIcon } from './buttonIcons';

/**
 * The floating selection tally — ONE shell for every "sum what I ticked" panel.
 *
 * Cashflow's basket and the tables' Quick Sum were two designs for the same job:
 * a draggable glass card on Cashflow, and an inline violet pill on every table
 * page that appeared between the toolbar and the rows — so ticking the first row
 * pushed the whole table down and the row you had just clicked slid out from under
 * the cursor. Both render this now: same card, same header, same actions, same
 * stat pills. What sits under the header (a metric switcher, a line list) stays
 * with the page that needs it.
 *
 *   <SumPanel title="Selected rows" count={n} storageKey="ims:quickSumPos"
 *     actions={<SumPanelAction action="copy" title="Copy summary" onClick={…} />}>
 *     <SumStat label="Quantity" value="18.85" />
 *   </SumPanel>
 *
 * Where it sits is a preference, not data: a dragged position is kept per browser
 * under `storageKey`, and ignored if it would land off-screen (a smaller window,
 * a monitor that is no longer attached). Default is top-right under the header —
 * the bottom edge already carries the toast, the ⌘K hint and the chat launcher.
 */
export default function SumPanel({ title, count, storageKey, actions, children }) {
    const [pos, setPos] = useState(() => {
        try {
            const saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
            if (saved && saved.left >= 0 && saved.top >= 0
                && saved.left < window.innerWidth - 40 && saved.top < window.innerHeight - 40) return saved;
        } catch { /* private mode, or nothing stored */ }
        return null;
    });
    const ref = useRef(null);

    // ── Drag (header handle) ───────────────────────────────────────────────
    const startDrag = (e) => {
        const el = ref.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const dx = e.clientX - rect.left;
        const dy = e.clientY - rect.top;
        const move = (ev) => {
            setPos({
                left: Math.min(Math.max(8, ev.clientX - dx), window.innerWidth - rect.width - 8),
                top: Math.min(Math.max(8, ev.clientY - dy), window.innerHeight - 44),
            });
        };
        const up = () => {
            setPos(cur => {
                try { if (cur) localStorage.setItem(storageKey, JSON.stringify(cur)); } catch { /* private mode */ }
                return cur;
            });
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', up);
        };
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
    };

    return (
        <div
            ref={ref}
            className={`fixed z-40 w-[19rem] rounded-2xl overflow-hidden font-sans
                border border-[var(--line)]
                bg-[var(--glass)] backdrop-blur-md shadow-pop
                animate-in fade-in slide-in-from-top-3 duration-300
                ${pos ? '' : 'top-20 right-4'}`}
            style={pos ? { left: pos.left, top: pos.top } : undefined}
        >
            {/* Header — drag handle */}
            <div
                onPointerDown={startDrag}
                className="flex items-center justify-between gap-2 px-3 py-2 cursor-grab active:cursor-grabbing select-none
                    bg-[var(--bg-card)] border-b border-[var(--line)] text-[var(--ink)]"
            >
                <div className="flex items-center gap-2 min-w-0">
                    <span className="grid place-items-center w-6 h-6 rounded-lg bg-[var(--brand-soft)] text-[var(--brand)] shrink-0">
                        <BtnIcon action="sum" />
                    </span>
                    <span className="font-semibold responsiveTextInput truncate">{title}</span>
                    <span className="shrink-0 responsiveTextTable font-bold tabular-nums px-1.5 py-0.5 rounded-lg bg-[var(--bg-subtle)] text-[var(--ink-secondary)]">
                        {count}
                    </span>
                </div>
                <div className="flex items-center gap-0.5 shrink-0 text-[var(--ink-secondary)]">
                    {actions}
                </div>
            </div>
            {children}
        </div>
    );
}

/**
 * A header action. Swallows pointerdown so pressing it never starts a drag.
 * `danger` paints a failed action red until the caller clears it; `pulse` is the
 * in-flight state of an action that keeps its glyph.
 */
export function SumPanelAction({ action, title, onClick, disabled = false, danger = false, pulse = false }) {
    return (
        <button
            type="button"
            onPointerDown={e => e.stopPropagation()}
            onClick={onClick}
            disabled={disabled}
            title={title}
            aria-label={title}
            className="grid place-items-center p-1 rounded-lg hover:bg-[var(--bg-subtle)] transition-colors disabled:opacity-50"
            style={danger ? { color: 'var(--danger-text)' } : undefined}
        >
            <BtnIcon action={action} className={pulse ? 'animate-pulse' : ''} />
        </button>
    );
}

/**
 * One subtotal — the soft stat pill. `badge` is the currency mark: "$" on the
 * brand fill, "€" a step darker so the two read apart when both are shown. Leave
 * it off for a count or a weight, which is in no currency.
 */
export function SumStat({ label, value, badge }) {
    return (
        <div className="flex items-center justify-between gap-2 rounded-2xl px-2.5 py-1.5 bg-[var(--bg-subtle)] border border-[var(--line)]">
            <span className="flex items-center gap-1.5 min-w-0 responsiveTextTable font-semibold text-[var(--ink-muted)]">
                {badge && (
                    <span className={`grid place-items-center w-4 h-4 shrink-0 rounded-full text-[var(--on-brand)] responsiveTextTable font-bold leading-none ${badge === '€' ? 'bg-[var(--brand-strong)]' : 'bg-[var(--brand)]'}`}>
                        {badge}
                    </span>
                )}
                <span className="truncate">{label}</span>
            </span>
            <span className="numeric responsiveTextTitle text-[var(--ink)] leading-none whitespace-nowrap">
                {value}
            </span>
        </div>
    );
}
