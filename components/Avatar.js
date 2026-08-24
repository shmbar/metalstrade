'use client';

// Deterministic initial-avatar chip for suppliers/clients/users.
// Same name -> same color, always. Soft tone bg + strong tone text (reference style).
// Tokens, not literals: these chips sit on cards, so they have to flip with dark
// mode and follow the chosen colour preset like everything else.
const PALETTE = [
    { bg: 'var(--brand-soft)', text: 'var(--brand-strong)' },  // violet
    { bg: 'var(--ok-bg)', text: 'var(--ok-text)' },            // green
    { bg: 'var(--warn-bg)', text: 'var(--warn-text)' },        // amber
    { bg: 'var(--pink-bg)', text: 'var(--pink-text)' },        // plum (was rose)
    { bg: 'var(--bg-sunken)', text: 'var(--teal-text)' },      // muted teal
    { bg: 'var(--neutral-bg)', text: 'var(--ink-secondary)' }, // neutral
];

const hashName = (s) => {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    return Math.abs(h);
};

const initialsOf = (name) => {
    // Punctuation is stripped BEFORE the split, not after: "Metalfund (Igor)"
    // splits on whitespace into ["Metalfund", "(Igor)"], and taking the raw first
    // character of each gave a chip reading "M(" — a bracket, not an initial.
    // Bracketed contacts and hyphenated names are both common here, so this reads
    // letters and digits only and lets "Han-Mu" fall through as one word.
    const words = String(name)
        .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
        .trim()
        .split(/\s+/)
        .filter(Boolean);
    if (!words.length) return '?';
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return (words[0][0] + words[1][0]).toUpperCase();
};

export default function Avatar({ name, size = 22, className = '', style = {} }) {
    const label = String(name || '').trim();
    if (!label) return null;
    const tone = PALETTE[hashName(label) % PALETTE.length];
    return (
        <span
            className={`inline-flex items-center justify-center rounded-full font-semibold select-none shrink-0 ${className}`}
            style={{
                width: size, height: size,
                background: tone.bg, color: tone.text,
                fontSize: Math.max(9, Math.round(size * 0.4)),
                letterSpacing: '0.02em',
                ...style,
            }}
            title={label}
        >
            {initialsOf(label)}
        </span>
    );
}

// The chip + the name, as one cell. Every table that prints a supplier, client,
// vendor or warehouse name goes through this, so the icon is always on the same
// side, at the same size, with the same gap — the audit that produced it found
// the chip on ~6 pages and missing on ~15, which is what made the app look
// half-finished rather than dense.
//
// `fallback` is what an empty name renders as. It defaults to null (nothing)
// because most of these columns sit in tables whose totals row is deliberately
// blank; pass '—' where a dash reads better than a hole.
export function NameCell({
    name,
    size = 18,
    maxWidth = 160,
    fallback = null,
    className = '',
    style = {},
}) {
    const label = String(name ?? '').trim();
    if (!label) return fallback;
    return (
        <span
            className={`inline-flex items-center gap-1.5 min-w-0 align-middle ${className}`}
            style={maxWidth ? { maxWidth, ...style } : style}
            title={label}
        >
            <Avatar name={label} size={size} />
            <span className={maxWidth ? 'block truncate' : 'block'}>{label}</span>
        </span>
    );
}

// Same chip, for a cell that holds SEVERAL names stacked (one consignee per
// shipment on a merged contract line, say). Kept next to NameCell so the two
// can't drift apart.
export function NameStack({ value, size = 18, maxWidth = 160, gapClass = 'gap-0.5' }) {
    const arr = Array.isArray(value) ? value : (value ? [value] : []);
    if (arr.length === 0) return null;
    return (
        <div className={`flex flex-col ${gapClass}`}>
            {arr.map((v, i) => <NameCell key={i} name={v} size={size} maxWidth={maxWidth} />)}
        </div>
    );
}
