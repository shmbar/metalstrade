'use client';
import CountUp from './CountUp';
import { TONES } from './statusUtils';

// Reference-style KPI cards: icon tile + caption + big number (+ optional sub note).
// items: [{ label, value, format?, icon: LucideIcon, tone?: 'blue'|'green'|'amber'|'red'|'gray', sub? }]
//
// size: 'default' (24px) | 'compact' (--fs-page, 16px). Compact exists for strips
// whose values are long currency strings — cashflow runs to "$33,745,945.77",
// where 24px crowds the card, while a page showing "65" does not have that
// problem. 16px also matches the margins stat cards, so the two summary rows in
// this app read at the same size. Everything else about the card is identical.
export default function KpiStrip({ items = [], size = 'default' }) {
    const valueCls = size === 'compact'
        ? 'leading-tight font-display font-bold text-[var(--ink)]'
        : 'text-stat leading-tight font-display';
    const valueStyle = size === 'compact'
        ? { fontSize: 'var(--fs-page)', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em' }
        : undefined;
    if (!items.length) return null;
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {items.map(({ label, value, format, icon: Icon, tone = 'blue', sub }, i) => {
                const t = TONES[tone] || TONES.blue;
                return (
                    <div
                        key={i}
                        className="kpi-card bg-[var(--bg-card)] rounded-2xl border border-[var(--line)] shadow-card p-4 flex items-start gap-3 min-w-0"
                        style={{ animation: `rise-in 0.4s cubic-bezier(0.16,1,0.3,1) both`, animationDelay: `${i * 50}ms` }}
                    >
                        {Icon && (
                            <span
                                className="w-8 h-8 rounded-control flex items-center justify-center shrink-0"
                                style={{ background: t.bg, color: t.text }}
                            >
                                <Icon size={16} strokeWidth={1.75} />
                            </span>
                        )}
                        <div className="min-w-0">
                            <div
                                className="font-medium uppercase text-[var(--ink-muted)]"
                                style={{ fontSize: 'var(--fs-body)', letterSpacing: '0.04em' }}
                            >
                                {label}
                            </div>
                            <div className={valueCls} style={valueStyle}>
                                <CountUp value={value} format={format} />
                            </div>
                            {sub ? (
                                <div className="text-[var(--ink-muted)] truncate" style={{ fontSize: 'var(--fs-body)' }}>
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
