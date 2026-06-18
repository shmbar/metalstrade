// Pure helpers for the IMS/GIS expense-split workflow — no React, no Firestore, so
// they're trivially unit-testable and reusable on every page that tracks splits.
//
// A row's split lifecycle (stored on `row.split.status`):
//   'none'    → not under control (no split object, or no status)
//   'pending' → under control: flagged, NOT yet calculated between IMS & GIS
//   'done'    → split recorded (ratio + shares saved)

export const SPLIT_DEFAULT_RATIO = 50; // % allocated to IMS; the remainder goes to GIS

// Normalize any row to one of the three lifecycle states.
export function splitStatusOf(row) {
  const s = row?.split?.status;
  return s === 'pending' || s === 'done' ? s : 'none';
}

// Split an amount by a ratio (% to IMS), rounded to cents. GIS always takes the
// remainder so the two shares sum back to the original amount with no rounding drift.
export function computeShares(amount, ratioToIms = SPLIT_DEFAULT_RATIO) {
  const total = Number(amount) || 0;
  const r = Math.min(100, Math.max(0, Number(ratioToIms)));
  const imsShare = Math.round(((total * r) / 100) * 100) / 100;
  const gisShare = Math.round((total - imsShare) * 100) / 100;
  return { imsShare, gisShare };
}

// Deterministic notification id → lets us raise idempotently (create-if-absent) and
// clear by the exact same id once the split is calculated.
export const splitNotifId = (entityType, entityId) => `split:${entityType}:${entityId}`;

// Display helper: the various currency encodings used across pages ('us'/'eu' ids,
// 'USD'/'EUR', '$'/'€') → a compact symbol for share display in the badge/modal.
export function curSymbol(cur) {
  const c = String(cur || '').toLowerCase();
  if (c === 'us' || c === 'usd' || c === '$') return '$';
  if (c === 'eu' || c === 'eur' || c === '€') return '€';
  return cur ? `${cur} ` : '';
}
