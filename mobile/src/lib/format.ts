// Display formatters — ported from the web dashboard (app/(root)/dashboard/page.js)
// so on-screen numbers match the CRM exactly. Pure, no React.

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

// Compact $K / $M formatter (defaults to USD symbol). Mirrors dashboard fmtAutoKM.
export const fmtAutoKM = (n: number, decimals = 2, sym = '$'): string => {
  const num = Number(n);
  if (!Number.isFinite(num)) return `${sym}0`;
  if (Math.abs(num) >= 1_000_000) return `${sym}${fmtMoney(num / 1_000_000, decimals)}M`;
  if (Math.abs(num) >= 1_000) return `${sym}${fmtMoney(num / 1_000, decimals)}K`;
  return `${sym}${fmtMoney(num, decimals)}`;
};

// Currency-aware compact formatter — used wherever amounts must stay per-currency
// (never summed across $/€). Mirrors the dashboard's fmtCurKM.
export const fmtCurKM = (cur: string, n: number): string => {
  const s = curSymbol(cur);
  const num = Number(n) || 0;
  const a = Math.abs(num);
  if (a >= 1e6) return `${s}${(num / 1e6).toFixed(2)}M`;
  if (a >= 1e3) return `${s}${(num / 1e3).toFixed(2)}K`;
  return `${s}${num.toFixed(2)}`;
};

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

export const initials = (name = ''): string =>
  name
    .toString()
    .split(' ')
    .map((s) => s[0] || '')
    .slice(0, 2)
    .join('')
    .toUpperCase();
