// What a stock lot is worth per unit. Shared verbatim with the phone
// (mobile/src/shared/lotPrice.js); the parity suite checks the two are identical.
//
// A lot is normally priced per unit of material — per MT, per kg: its PO's unit. Some are
// priced per unit of ONE ELEMENT'S CONTENT. Client, 2026-10-07, on Hf Ni VAR (PO
// 190626-2-TIM): "it's per content … check the Hf content in the assay" — $3,950 is per kg
// of hafnium, and the lot is 89.06% Hf, so its 660 kg are worth 660 × 89.06% × $3,950 =
// $2,321,794.20 — exactly the supplier's invoice — not 660 × $3,950 = $2,607,000.
//
// `priceOn` on the lot names that element ('Hf'); absent means per unit of material. The
// content comes from the lot's certificate analysis, or its spec when there is none
// (grades.js parseAssay, which reads "89.06Hf 10.1Ni" as Hf 89.06).
import { parseAssay } from './grades.js';

/** The element's content in the lot, in %, from its analysis or else its spec; null when not stated. */
export const contentPct = (lot, el) => {
    if (!el) return null;
    for (const src of [lot?.analysis, lot?.spec]) {
        const v = parseAssay(String(src || ''))[el];
        if (Number.isFinite(v) && v > 0 && v <= 100) return v;
    }
    return null;
};

/** The share of the lot's weight its price applies to: 1 for a price per unit of material;
    the element's content when priced per content. When that content is not stated anywhere
    the share stays 1 — the lot keeps the value it always had, and the Materials Breakdown
    shows the content as missing, rather than the lot silently counting as worth nothing. */
export const priceShare = (lot) => {
    if (!lot?.priceOn) return 1;
    const pct = contentPct(lot, lot.priceOn);
    return pct ? pct / 100 : 1;
};

/** Price per unit of material: the lot's typed price (or the one given) × priceShare. */
export const effectiveUnitPrice = (lot, price = lot?.unitPrc) => {
    const p = parseFloat(price);
    return Number.isFinite(p) ? p * priceShare(lot) : 0;
};

/** The lot's line total for a quantity and price, rounded to cents — what the Materials
    Breakdown shows and stores as `total`. */
export const lotLineTotal = (lot, qnty = lot?.qnty, price = lot?.unitPrc) => {
    const q = parseFloat(qnty);
    const p = parseFloat(price);
    if (!Number.isFinite(q) || !Number.isFinite(p)) return 0;
    return Math.round(q * p * priceShare(lot) * 100) / 100;
};
