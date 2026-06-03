// Pure status → color helpers (no JSX/React) so they're unit-testable in isolation
// and reusable anywhere. The <StatusBadge> component in StatusBadge.js renders these.

export const TONES = {
    green: { bg: '#dcfce7', text: '#15803d', border: '#86efac' },
    amber: { bg: '#fef3c7', text: '#92400e', border: '#fde68a' },
    red: { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' },
    blue: { bg: '#dbeeff', text: '#0366ae', border: '#b8ddf8' },
    gray: { bg: '#f1f5f9', text: '#475569', border: '#e2e8f0' },
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
