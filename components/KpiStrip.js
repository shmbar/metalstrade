'use client';
import { isValidElement } from 'react';
import CountUp from './CountUp';
import { TONES } from './statusUtils';

// Reference-style KPI cards: icon tile + caption + figure.
// items: [{ label, value, format?, icon: LucideIcon, tone?: 'blue'|'green'|'amber'|'red'|'gray', sub? }]
// cols: how many cards per row from md up (2..6). Below md it is always two.
//
// ONE band, no size prop (2026-08-25). This card used to come in two heights —
// a 24px figure on the count pages and a 16px "compact" one on the money pages —
// which made the same strip a different height depending on which page you were
// on, and the tall one ate ~70px above every table for four numbers that never
// need more than one line. The whole strip is now the compact end of that pair:
// a --fs-page (16px) figure over a --fs-table label, in px-3 py-2, which lands
// the card at ~50px instead of ~74px. Long currency runs like "$33,745,945.77"
// still fit on one line at a quarter of the page width, so nothing needs the
// second size any more.
//
// `value` is normally a number and is animated by CountUp through `format`.
// A ready-made node (a <NumericFormat>) is rendered as-is, which is how the
// margins strip shares this card without giving up its own formatters.
export default function KpiStrip({ items = [], cols = 4 }) {
    if (!items.length) return null;
    const colCls = { 2: 'md:grid-cols-2', 3: 'md:grid-cols-3', 4: 'md:grid-cols-4', 5: 'md:grid-cols-5', 6: 'md:grid-cols-6' }[cols] || 'md:grid-cols-4';
    return (
        <div className={`grid grid-cols-2 ${colCls} gap-2 mb-3`}>
            {items.map(({ label, value, format, icon: Icon, tone = 'blue', sub }, i) => {
                const t = TONES[tone] || TONES.blue;
                return (
                    <div
                        key={i}
                        className="kpi-card bg-[var(--bg-card)] rounded-2xl border border-[var(--line)] shadow-card flex items-center gap-2.5 min-w-0 px-3 py-2"
                        style={{ animation: `rise-in 0.4s cubic-bezier(0.16,1,0.3,1) both`, animationDelay: `${i * 50}ms` }}
                    >
                        {Icon && (
                            <span
                                className="w-7 h-7 rounded-control flex items-center justify-center shrink-0"
                                style={{ background: t.bg, color: t.text }}
                            >
                                <Icon size={14} strokeWidth={1.75} />
                            </span>
                        )}
                        <div className="min-w-0">
                            <div
                                className="font-medium uppercase leading-tight text-[var(--ink-muted)] truncate"
                                style={{ fontSize: 'var(--fs-table)', letterSpacing: '0.04em' }}
                            >
                                {label}
                            </div>
                            <div
                                className="font-display font-bold leading-tight text-[var(--ink)] truncate"
                                style={{ fontSize: 'var(--fs-page)', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em' }}
                            >
                                {isValidElement(value) ? value : <CountUp value={value} format={format} />}
                            </div>
                            {sub ? (
                                <div className="text-[var(--ink-muted)] truncate leading-tight" style={{ fontSize: 'var(--fs-caption)' }}>
                                    {sub}
                                </div>
                            ) : null}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
