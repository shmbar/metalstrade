'use client';

// Slim reference-style progress bar: 4px rounded track + tone fill.
// value: 0..1 (clamped). tone: 'brand' | 'green' | 'amber' | 'red' | auto by value.
const FILLS = {
    brand: 'var(--brand)',
    green: 'var(--ok-text)',
    amber: 'var(--warn-text)',
    red: 'var(--bad-text)',
};

export default function ProgressBar({ value = 0, tone = 'brand', width = '100%', label, className = '' }) {
    const v = Math.max(0, Math.min(1, Number(value) || 0));
    const fill = FILLS[tone] || FILLS.brand;
    return (
        <div className={`flex items-center gap-1.5 min-w-0 ${className}`} style={{ width }}>
            <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'var(--bg-sunken)' }}>
                <div
                    className="h-full rounded-full"
                    style={{ width: `${v * 100}%`, background: fill, transition: 'width 0.5s cubic-bezier(0.16,1,0.3,1)' }}
                />
            </div>
            {label != null && (
                <span className="font-medium shrink-0" style={{ fontSize: 'var(--fs-table)', color: 'var(--ink-muted)', fontVariantNumeric: 'tabular-nums' }}>
                    {label}
                </span>
            )}
        </div>
    );
}
