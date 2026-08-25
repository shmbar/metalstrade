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
