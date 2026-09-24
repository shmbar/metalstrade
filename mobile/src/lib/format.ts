// Display formatters — ported from the web dashboard (app/(root)/dashboard/page.js)
// so on-screen numbers match the web app exactly. Pure, no React.
import { moneyCompact as sharedMoneyCompact, moneyFull as sharedMoneyFull } from '@shared/currency';

export const curSymbol = (cur: string | undefined): string => {
  const c = String(cur || '').toLowerCase();
  if (c === 'us' || c === 'usd' || c === '$') return '$';
  if (c === 'eu' || c === 'eur' || c === '€') return '€';
  return cur ? `${cur} ` : '$';
};

export const fmtMoney = (n: number | string, decimals = 2): string => {
  const num =
    typeof n === 'string' ? Number(n.replace(/[^0-9.-]+/g, '')) : Number(n);
  if (!Number.isFinite(num)) return (0).toFixed(decimals);
  return num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

// Compact $K / $M formatter (defaults to USD). Web's dashboard fmtAutoKM is the same
// shared moneyCompact; `sym` accepts a glyph ('$', '€') or a currency id.
export const fmtAutoKM = (n: number, decimals = 2, sym = '$'): string => sharedMoneyCompact(sym, n, decimals);

// Currency-aware compact formatter — used wherever amounts must stay per-currency
// (never summed across $/€). Mirrors the dashboard's fmtCurKM.
export const fmtCurKM = (cur: string, n: number): string => moneyCompact(cur, n);

export const fmtMT = (n: number): string =>
  `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n || 0)} MT`;

// Dates are stored inconsistently across legacy records: plain ISO strings OR
// datepicker objects {startDate, endDate}. Rendering the object crashes React
// ("Objects are not valid as a React child") — always display through this.
export const dateLabel = (d: any): string => {
  if (!d) return '—';
  if (typeof d === 'string') return d.substring(0, 10);
  if (typeof d === 'object') {
    const s = d.startDate || d.endDate;
    return typeof s === 'string' ? s.substring(0, 10) : '—';
  }
  return '—';
};

// Avatar initials. Verbatim port of web's one canonical implementation
// (components/CommentThread.js:16, identical in components/ActivityLog.js:30):
// split on whitespace/@/., drop empty tokens, take the first letter of the first
// two, and fall back to '?' so an avatar is never blank. Mobile previously split
// on a single space only — which produced 'A' for 'Acme  Metals' (double space),
// 'Z' for an email address, and '' for an empty name.
export const initials = (name = ''): string =>
  name
    .toString()
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() || '')
    .join('') || '?';

/*
 * ── One money format for the whole app ───────────────────────────────────────────────
 *
 * Client, 2026-09-24: "some cells are missing decimals and/or the $ symbol". Screens had
 * grown their own little formatters: one printed $1,234.5 (no minimum decimals), one printed
 * NO symbol for a currency other than $/€, one rounded money to whole dollars. Every amount
 * now goes through these two, which always give:
 *   - the currency's own symbol ($, €) — or its code for any other currency, never nothing;
 *   - exactly two decimals, with thousands separators;
 *   - the minus sign in front of the symbol (-$1,234.50), as web's Intl output does.
 * Never mixes currencies: the caller passes the currency of THIS amount.
 */
// Both live in the shared currency module (utils/currency.js ⇄ @shared/currency), so web
// and mobile print every amount the same way.
/** Full amount: "$1,234.50", "€0.05", "-$12.00", "GBP 1,234.50". */
export const moneyFull = (cur: string | undefined, value: number | string, decimals = 2): string =>
  sharedMoneyFull(cur, value, decimals);

/** Compact amount for tiles and totals: "$1.23M", "€45.60K", "-$980.00". */
export const moneyCompact = (cur: string | undefined, value: number | string): string => sharedMoneyCompact(cur, value);
