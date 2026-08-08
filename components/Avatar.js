'use client';

// Deterministic initial-avatar chip for suppliers/clients/users.
// Same name -> same color, always. Soft tone bg + strong tone text (reference style).
// Tokens, not literals: these chips sit on cards, so they have to flip with dark
// mode and follow the chosen colour preset like everything else.
const PALETTE = [
    { bg: 'var(--brand-soft)', text: 'var(--brand-strong)' },  // violet
    { bg: 'var(--ok-bg)', text: 'var(--ok-text)' },            // green
    { bg: 'var(--warn-bg)', text: 'var(--warn-text)' },        // amber
    { bg: 'var(--pink-bg)', text: 'var(--pink-text)' },        // rose
    { bg: 'var(--bg-sunken)', text: 'var(--teal-text)' },      // teal
    { bg: 'var(--neutral-bg)', text: 'var(--ink-secondary)' }, // neutral
];

const hashName = (s) => {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    return Math.abs(h);
};

const initialsOf = (name) => {
    const words = String(name).trim().split(/\s+/).filter(Boolean);
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
