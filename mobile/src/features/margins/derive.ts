// Derived (never persisted) figures for the margins screens.
//
// Everything here is a verbatim port of a formula that lives inside a web page
// component, so it is pure and testable — see __tests__/parity/margins-materials-formulas.test.ts.

// ── collapsed month header — app/(root)/margins/marginTable.js:19-22 ──────────
//
// Web re-derives the four header figures from the VISIBLE item rows on every
// render. It never reads the persisted month aggregate, which is why a row added
// or deleted in the editor updates the header immediately, before any save.
//
// Deriving here rather than rolling up on add/delete is deliberate: web does not
// roll up either, and unilaterally changing what mobile PERSISTS would make the
// saved month doc — and the Profits KPI that sums it — diverge from web.
//
// The gis rule is the subtle part: a gis row is a shared deal, so it contributes
// HALF its totalMargin and HALF its remaining, but its FULL purchase and openShip.

export const monthPurchase = (items: any[]): number =>
  (items || []).reduce((sum: number, r: any) => sum + (Number(r?.purchase) || 0), 0);

export const monthMargin = (items: any[]): number =>
  (items || []).reduce(
    (sum: number, r: any) => sum + (r?.gis ? Number(r?.totalMargin) / 2 || 0 : Number(r?.totalMargin) || 0),
    0
  );

export const monthOpenShip = (items: any[]): number =>
  (items || []).reduce((sum: number, r: any) => sum + (Number(r?.openShip) || 0), 0);

export const monthRemaining = (items: any[]): number =>
  (items || []).reduce(
    (sum: number, r: any) => sum + (r?.gis ? Number(r?.remaining) / 2 || 0 : Number(r?.remaining) || 0),
    0
  );

// ── GIS totals decimal rules — app/(root)/margins/thirdpart.js ────────────────
//
// The GIS totals row formats its columns inconsistently on web, and mobile has to
// match or the two screens print different numbers of digits for the same figure:
//
//   Purchased quantity  decimalScale={!Number.isInteger(purchase) && '3'}   (:340)
//        → `false` disables NumericFormat's decimal limit entirely, so a whole
//          number renders with NO decimals at all ("1,200", not "1,200.00").
//   Outstanding shipment decimalScale="3"                                    (:404)
//        → always three, whole number or not. Both are tonnage, and tonnage is
//          three decimals across the app (client, 2026-09-23: 0.707 MT read 0.70).

/** Decimal places for the GIS "Purchased quantity (MT)" total: none when whole, else 3. */
export const gisPurchasedDecimals = (v: number): number => (Number.isInteger(v) ? 0 : 3);

/** Decimal places for the GIS "Outstanding shipment" total: always 3. */
export const GIS_OUTSTANDING_DECIMALS = 3;
