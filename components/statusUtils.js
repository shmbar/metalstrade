// Pure status → color helpers (no JSX/React) so they're unit-testable in isolation
// and reusable anywhere. The <StatusBadge> component in StatusBadge.js renders these.

// One pastel system: soft bg, strong text, matching border. Every value is a
// token so chips follow the colour preset and flip correctly in dark mode.
// "blue" is the info/accent tone — violet in this palette.
export const TONES = {
    green: { bg: 'var(--ok-bg)', text: 'var(--ok-text)', border: 'var(--ok-border)' },
    amber: { bg: 'var(--warn-bg)', text: 'var(--warn-text)', border: 'var(--warn-border)' },
    red: { bg: 'var(--bad-bg)', text: 'var(--bad-text)', border: 'var(--bad-border)' },
    blue: { bg: 'var(--brand-soft)', text: 'var(--brand-strong)', border: 'var(--brand-border)' },
    gray: { bg: 'var(--neutral-bg)', text: 'var(--ink-secondary)', border: 'var(--neutral-border)' },
};

// Map a free-text status label to a tone. Order matters: negative/partial checks
// run before the positive check so "Not Shipped" / "Partly Shipped" don't match
// the "shipped" → green rule.
export function statusTone(label = '') {
    const s = String(label).toLowerCase().trim();
    if (!s) return 'gray';
    if (s.includes('draft')) return 'blue';
    if (/(unpaid|not shipped|unsold|cancel|overdue|delayed|reject|fail|loss|denied|expired|stale)/.test(s)) return 'red';
    if (/(partial|partly|pending|\bopen\b|hold|await|processing|review|in transit)/.test(s)) return 'amber';
    if (/(paid|final|finish|closed|shipped|complete|active|approved|done|delivered|success)/.test(s)) return 'green';
    return 'gray';
}

// Tailwind text-color class for signed amounts (negatives red, positives green).
// Returns '' for zero / non-numbers so they stay default-colored.
export function amountToneClass(n) {
    const v = typeof n === 'number' ? n : parseFloat(String(n ?? '').replace(/[^0-9.-]/g, ''));
    if (!Number.isFinite(v) || v === 0) return '';
    return v < 0 ? 'text-red-600' : 'text-green-700';
}
