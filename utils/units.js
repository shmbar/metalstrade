// Weight units and the conversions between them — PURE (no React, no JSX), so it can
// be unit-tested and shared. It was defined inside contracts/modals/productsTable.js,
// which is a JSX component file: importable by the app but not by a test, and not by
// the PO PDF path without dragging a component along.
//
// The "View in" overlay on the products table re-expresses a contract on screen
// without touching what is stored, and the PO PDF prints whatever that overlay is
// showing. Both sides therefore have to convert with the SAME factors — a second copy
// is how a sheet on screen and the sheet a supplier receives start disagreeing.

export const LB_PER_MT = 2204.6226218; // 1 metric tonne = 2204.6226218 lb
export const KG_PER_MT = 1000;         // 1 metric tonne = 1000 kg

// 1 MT expressed in each unit (weight). A common pivot for unit<->unit conversion.
export const W_FACTOR = { mt: 1, kg: KG_PER_MT, lb: LB_PER_MT };
export const UNIT_LABEL = { mt: 'MT', kg: 'KGS', lb: 'LB' };
// Display decimals per weight unit (kg/lb numbers are larger, so fewer decimals).
export const Q_DEC = { mt: 3, kg: 1, lb: 1 };

// Map a Quantity label ('MT' | 'KGS' | 'LB') to a unit code. Empty/unknown -> 'mt'.
export const unitFromLabel = (label) => {
    const l = String(label || '').toLowerCase();
    if (l.includes('kg')) return 'kg';
    if (l.includes('lb')) return 'lb';
    return 'mt';
};

// Weight: value_to = value_from * (1 MT in `to`) / (1 MT in `from`).
export const convertWeight = (num, fromUnit, toUnit) =>
    num * ((W_FACTOR[toUnit] ?? 1) / (W_FACTOR[fromUnit] ?? 1));

// Per-unit price moves the opposite way (per-lb -> per-MT multiplies up).
export const convertPrice = (num, fromUnit, toUnit) =>
    num * ((W_FACTOR[fromUnit] ?? 1) / (W_FACTOR[toUnit] ?? 1));

// USD<->EUR at a given rate (rate = USD per 1 EUR). Same/unknown currency passes
// through untouched, so a contract with no rate on file is never silently rescaled.
export const convertCurrency = (price, fromCode, toCode, rate) => {
    const p = Number(price);
    if (!toCode || toCode === fromCode || !rate) return p;
    const usd = fromCode === 'USD' ? p : p * rate;
    return toCode === 'USD' ? usd : usd / rate;
};
