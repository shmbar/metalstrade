'use client';

/* What Quick Sum will treat as a number.
 *
 * Strictly: the WHOLE value has to be a number. It used to strip every character
 * that wasn't a digit and keep what was left, so "751 Microgranules" came back as
 * 751 — which is how the Stocks Description column passed for numeric, got picked
 * as the default summed column, and totalled six material names to 4,435.00
 * (client, 2026-09-12). A figure nobody can trace is worse than no figure.
 *
 * Accepted: 1234 · 1,234.50 · 1 234,50 · $1,234.50 · 12.5% · (1,200.00) · -12 ·
 *           1.234,56 (European) · a number stored as a JS number.
 * Rejected: anything carrying letters ("751 Microgranules", "210426-1", "12 MT"),
 *           bare separators, empty values.
 */
const CURRENCY = /[$€£¥₪₽]|(?:^|\s)(?:usd|eur|gbp|chf|ils|rub)(?:\s|$)/gi;
const THIN_SPACE = /[   ']/g;   // nbsp, narrow nbsp, thin space, apostrophe

export const toNumber = (val) => {
  if (val == null) return NaN;
  if (typeof val === 'number') return Number.isFinite(val) ? val : NaN;
  if (typeof val !== 'string') return NaN;

  let s = val.trim();
  if (!s) return NaN;

  // "(123.45)" is how a negative is written in accounting exports.
  const parens = s.startsWith('(') && s.endsWith(')');
  if (parens) s = s.slice(1, -1);

  s = s.replace(CURRENCY, '').trim();

  if (s.endsWith('%')) s = s.slice(0, -1).trim();

  s = s.replace(THIN_SPACE, '');

  let sign = parens ? -1 : 1;
  if (s.startsWith('-')) { sign = -sign; s = s.slice(1).trim(); }
  else if (s.startsWith('+')) { s = s.slice(1).trim(); }

  // A letter anywhere and it is not a number. Spaces are allowed only here,
  // as thousands separators, and are dropped immediately after.
  if (!/^[\d., ]+$/.test(s)) return NaN;
  s = s.replace(/ /g, '');

  const hasDot = s.includes('.');
  const hasComma = s.includes(',');
  if (hasDot && hasComma) {
    // Whichever comes last is the decimal separator: 1,234.56 vs 1.234,56
    s = s.lastIndexOf(',') > s.lastIndexOf('.')
      ? s.replace(/\./g, '').replace(',', '.')
      : s.replace(/,/g, '');
  } else if (hasComma) {
    // "1,234" groups; "12,5" is a decimal comma.
    s = /^\d{1,3}(,\d{3})+$/.test(s) ? s.replace(/,/g, '') : s.replace(',', '.');
  }

  if (!/^\d+(\.\d*)?$/.test(s) && !/^\.\d+$/.test(s)) return NaN;

  const num = Number(s);
  return Number.isFinite(num) ? sign * num : NaN;
};

export const isNumericLike = (val) => Number.isFinite(toNumber(val));
