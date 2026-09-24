// Currency display — the single source of truth for "how is a currency shown".
//
// Six pages rendered the same currency column six different ways: /contracts and
// /salescontracts printed the raw settings label ("USD"/"EUR"), /invoices and
// /accstatement and /companyexpenses printed a "$"/"€" chip, and each chip was
// hand-rolled with its own radius, padding, type size and colour triple. On top of
// that the column header read "USD/EUR" on four pages (via getTtl) and "$/€" on two,
// so the same data carried two different names depending on where you looked.
//
// Rule, applied everywhere: a currency is DISPLAYED as its symbol ($ / €) and
// NAMED as "Currency". The three-letter code is kept for the places that need a
// code rather than a glyph — Intl.NumberFormat, Excel/PDF exports, and the toggle
// in the contract products table, where you are choosing a currency rather than
// reading one.
//
// Storage is inconsistent by history: contract/invoice rows hold a settings id
// ('us'/'eu'), some rows hold the label ('USD'/'EUR'), and a few hold the glyph
// already. Every helper here takes all three encodings.

// 'usd' | 'eur' | null — the one place that decides what a stored value means.
export function curKind(cur) {
    const c = String(cur ?? '').trim().toLowerCase();
    if (!c) return null;
    if (c === 'us' || c === 'usd' || c === '$') return 'usd';
    if (c === 'eu' || c === 'eur' || c === '€') return 'eur';
    return null;
}

// Display glyph. An unrecognised code passes through verbatim rather than being
// swallowed — a third currency added in Settings should still show its own label —
// and it keeps the trailing space the split badge relies on, so "GBP 1,000" doesn't
// render as "GBP1,000". Callers that want a bare glyph (the chip) trim it.
export function curSymbol(cur) {
    const k = curKind(cur);
    if (k === 'usd') return '$';
    if (k === 'eur') return '€';
    return cur ? `${cur} ` : '';
}

// ISO code — for Intl.NumberFormat, exports, and anywhere a code is the point.
export function curCode(cur) {
    const k = curKind(cur);
    if (k === 'usd') return 'USD';
    if (k === 'eur') return 'EUR';
    return cur ? String(cur).toUpperCase() : '';
}

// TONES key (see components/statusUtils.js). USD green / EUR violet is what the
// /invoices and /contracts chips already used and what users recognise; the
// /accstatement and /companyexpenses chips were the outliers, painting --ok-border
// as a background so USD came out twice as saturated as everywhere else.
export function curTone(cur) {
    const k = curKind(cur);
    if (k === 'usd') return 'green';
    if (k === 'eur') return 'blue';
    return 'gray';
}

// ── Money amounts ─────────────────────────────────────────────────────────────────────
//
// One money format for web AND mobile (client, 2026-09-24: "some cells are missing
// decimals and/or the $ symbol"). Pages had grown their own formatters — "$-1,234.00" on
// one, "$1,234.5" on another, no symbol at all for a third currency, 1 decimal in one
// dashboard card and 2 in the next. Every amount printed as text goes through these two:
//   - the amount's own currency symbol ($ / €), or its code for any other currency;
//   - exactly two decimals unless the caller asks otherwise, with thousands separators;
//   - the minus sign in front of the symbol: -$1,234.50 (as react-number-format prints it).
// The caller passes the currency of THIS amount; nothing here converts or mixes currencies.
// An amount with no currency recorded is in the base currency, USD (finance.js fx base 'us').

const toAmount = (value) => {
    const n = typeof value === 'string' ? Number(value.replace(/[^0-9.-]+/g, '')) : Number(value);
    return Number.isFinite(n) ? n : 0;
};

const digits = (n, decimals) =>
    n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

// A negative that rounds to zero shows as $0.00, not -$0.00.
const signed = (v, body) => (v < 0 && /[1-9]/.test(body) ? '-' : '');

const moneySymbol = (cur) => curSymbol(cur) || '$';

// Full amount: "$1,234.50", "€0.05", "-$12.00", "GBP 1,234.50".
export function moneyFull(cur, value, decimals = 2) {
    const v = toAmount(value);
    const body = digits(Math.abs(v), decimals);
    return `${signed(v, body)}${moneySymbol(cur)}${body}`;
}

// Tiles and totals: "$1.23M", "€45.60K", "-$980.00".
export function moneyCompact(cur, value, decimals = 2) {
    const v = toAmount(value);
    const a = Math.abs(v);
    const [n, unit] = a >= 1e6 ? [a / 1e6, 'M'] : a >= 1e3 ? [a / 1e3, 'K'] : [a, ''];
    const body = digits(n, decimals) + unit;
    return `${signed(v, body)}${moneySymbol(cur)}${body}`;
}
