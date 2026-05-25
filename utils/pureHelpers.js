// Pure (Firebase-free, JSX-free) helpers. Extracted from utils.js so they can
// be unit-tested in isolation without booting Firebase or transforming JSX.
// utils.js re-exports everything below — every existing import keeps working.

const MONTH_MAP = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
};

// Converts "14-May-2026" / "14-may-2026" to ISO "2026-05-14".
// Passes through strings that already look like YYYY-MM-DD. Returns null on failure.
export const toIsoDate = (s) => {
  if (!s || typeof s !== 'string') return null;
  const trimmed = s.trim();
  if (!trimmed) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10);
  const m = trimmed.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
  if (m) {
    const month = MONTH_MAP[m[2].toLowerCase()];
    if (month) return `${m[3]}-${month}-${m[1].padStart(2, '0')}`;
  }
  // Last-resort: let Date try, then re-emit ISO
  const d = new Date(trimmed);
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
};

/**
 * Resolves an invoice's payment due date regardless of whether it's still a draft
 * (delDate = { startDate, endDate } object) or finalized (delDate = "dd-mmm-yyyy" string).
 * Always returns ISO "YYYY-MM-DD" or null — safe to pass to new Date() everywhere.
 */
export const resolveDueDate = (inv) => {
  if (!inv?.delDate) return null;
  if (typeof inv.delDate === 'string') return toIsoDate(inv.delDate);
  return toIsoDate(inv.delDate.startDate || inv.delDate.endDate);
};

/**
 * Resolves an invoice's primary date — handles both draft shape (dateRange.startDate
 * or top-level date) and finalized shape (date is a 'dd-mmm-yyyy' string).
 * Always returns ISO "YYYY-MM-DD" or null.
 */
export const resolveInvoiceDate = (inv) => {
  if (!inv) return null;
  if (typeof inv.date === 'string' && inv.date) return toIsoDate(inv.date);
  return toIsoDate(inv.dateRange?.startDate || inv.dateRange?.endDate);
};

/**
 * Groups raw invoice docs by their `invoice` number and merges related
 * docs (original + credit notes + final settlements) into a single
 * deduplicated entry per invoice. Mirrors the logic of runInvoices() in
 * app/(root)/cashflow/funcs.js so AI features can use the same accurate
 * receivables figures the Cashflow page already shows.
 */
export const groupInvoicesByNumber = (invoices) => {
  if (!Array.isArray(invoices)) return [];
  const groups = {};
  invoices.forEach(inv => {
    if (!inv || inv.invoice == null) return;
    const key = String(inv.invoice);
    if (!groups[key]) groups[key] = [];
    groups[key].push(inv);
  });
  return Object.values(groups).flatMap(group => {
    if (group.length === 1) return group;

    const types = group.map(g => parseInt(g.invType, 10)).filter(t => !isNaN(t));
    if (types.length < 2 || new Set(types).size === 1) return group;

    // Keep only the highest invType doc(s) (CN/FN supersede the original
    // '1111' invoice). Payments are combined across ALL related docs.
    const maxType = Math.max(...types);
    const keptDocs = group.filter(g => parseInt(g.invType, 10) === maxType);
    const allPayments = group.flatMap(g => g.payments || []);
    const totalAmount = keptDocs.reduce((s, g) => s + (parseFloat(g.totalAmount) || 0), 0);
    const paidSum = allPayments.reduce((s, p) => s + (parseFloat(p.pmnt) || 0), 0);
    const debtBlnc = totalAmount - paidSum;

    return [{
      ...keptDocs[0],
      payments: allPayments,
      totalAmount,
      debtBlnc,
    }];
  });
};
