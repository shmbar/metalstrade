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

// The chip recipe — soft bg, strong text, matching border — as a style object.
// Twenty-odd call sites were spelling this out by hand, which is how two of them
// ended up mixing families (a rose foreground on a red background). Build chips
// from here so "what a status chip looks like" has one definition.
export const toneChipStyle = (tone) => ({
    backgroundColor: tone.bg,
    color: tone.text,
    border: `1px solid ${tone.border}`,
});

// Convenience: label straight to a chip style, via statusTone().
export const statusChipStyle = (label) => toneChipStyle(TONES[statusTone(label)]);

// Map a free-text status label to a tone. Order matters: negative/partial checks
// run before the positive check so "Not Shipped" / "Partly Shipped" don't match
// the "shipped" → green rule.
export function statusTone(label = '') {
    const s = String(label).toLowerCase().trim();
    if (!s) return 'gray';
    if (s.includes('draft')) return 'blue';
    if (/(unpaid|not shipped|unsold|cancel|overdue|delayed|reject|fail|loss|denied|expired|stale)/.test(s)) return 'red';
    if (/(partial|partly|pending|\bopen\b|hold|await|processing|review|in transit|in progress|ongoing)/.test(s)) return 'amber';
    if (/(paid|final|finish|closed|shipped|complete|active|approved|done|delivered|success)/.test(s)) return 'green';
    return 'gray';
}

// Text-colour class for signed amounts.
//
// This used to return 'text-red-600' / 'text-green-700' — Tailwind palette names.
// They resolved to tokens only because tailwind.config happens to remap those two
// shades, which meant the rule "signed amounts are coloured from --danger/--ok"
// lived in a config file rather than here. Returning the token class directly
// makes this module the single source of truth the way the rest of the file
// already is, and it cannot be broken by a future palette edit.
//
// Positives are deliberately NOT green. A green figure on every positive number
// is what made the client read the palette as loud: in a ledger, positive is the
// normal case and does not need to be flagged. Only the exception is coloured —
// negatives get --danger-text. Positives take the default ink and are told apart
// by the absence of a minus sign, which is how a printed statement does it.
// Returns '' for zero / non-numbers so they stay default-coloured.
export function amountToneClass(n) {
    const v = typeof n === 'number' ? n : parseFloat(String(n ?? '').replace(/[^0-9.-]/g, ''));
    if (!Number.isFinite(v) || v === 0) return '';
    return v < 0 ? 'text-[var(--danger-text)]' : '';
}

// Same decision, as an inline-style value — for the many call sites that build a
// style object rather than a className. Returns undefined for "leave it alone".
export function amountToneColor(n) {
    const v = typeof n === 'number' ? n : parseFloat(String(n ?? '').replace(/[^0-9.-]/g, ''));
    if (!Number.isFinite(v) || v === 0) return undefined;
    return v < 0 ? 'var(--danger-text)' : undefined;
}

// Direction of a stock/inventory movement — in vs out. NOT a status: an inbound
// movement is not "good" and an outbound one is not "bad", so colouring them
// green/red (which is what /stocks did) overstated them. Both take muted ink and
// are told apart by their arrow icon; only the token differs enough to scan.
export const MOVEMENT = {
    in: 'var(--ok-text)',
    out: 'var(--ink-secondary)',
};
