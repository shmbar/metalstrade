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

/**
 * Net in-stock summary per warehouse+material — the SAME aggregation the Stocks
 * page performs (app/(root)/stocks/page.js), so AI features report the numbers
 * the user sees on screen instead of a raw sum of every lot row:
 *   • 'in' lots add |qnty| (with the final-invoice quantity correction),
 *     'out' lots subtract — a raw sum counts SOLD material as still in stock.
 *   • Original-vs-final invoice rows are deduplicated per invoice number
 *     (highest invType wins), exactly like utils.filteredArray.
 *   • Rows with net qty ≤ 0.1 are dropped (same threshold the page uses).
 * Returns [{ description, qnty, unit, warehouse }] with RESOLVED labels —
 * unit is the human label from settings.Quantity (usually 'MT'), never the id.
 */
export const computeStockNetSummary = (stockDocs, settings) => {
  const lots = (Array.isArray(stockDocs) ? stockDocs : []).filter(Boolean)
    .filter(s => s.stock); // only lots assigned to a warehouse (page does the same)

  // Same dedup rule as utils.filteredArray: within one invoice number, if invTypes
  // differ keep only the highest (final/credit supersedes the original invoice).
  const dedupeFinals = (arr) => {
    const byInvoice = {};
    arr.forEach(l => { (byInvoice[l.invoice] ||= []).push(l); });
    return Object.values(byInvoice).flatMap(group => {
      const distinct = new Set(group.map(l => parseInt(l.invType, 10)));
      if (distinct.size <= 1) return group;
      const maxType = Math.max(...distinct);
      return group.filter(l => parseInt(l.invType, 10) === maxType);
    });
  };

  const quantityList = settings?.Quantity?.Quantity || [];
  const warehouseList = settings?.Stocks?.Stocks || [];

  // Group by warehouse + material id — same keys the Stocks page groups on.
  const groups = {};
  lots.forEach(s => {
    const matKey = s.description || s.descriptionId;
    if (!matKey) return;
    (groups[`${s.stock}|${matKey}`] ||= []).push(s);
  });

  const rows = [];
  Object.values(groups).forEach(groupLots => {
    const filtered = dedupeFinals(groupLots);
    let qty = 0;
    filtered.forEach(l => {
      const q = parseFloat(l.qnty) || 0;
      if (l.type === 'in') {
        // |qnty| in, corrected when a final settlement changed the quantity —
        // identical arithmetic to the Stocks page accumulation.
        qty += Math.abs(q) +
          ((l.finalqnty && l.finalqnty * 1 !== l.qnty * 1) ? (l.qnty * 1 - l.finalqnty * 1) * -1 : 0);
      } else {
        qty -= q;
      }
    });
    if (qty <= 0.1) return; // page hides empty/near-empty rows the same way

    const first = filtered[0] || groupLots[0];
    const resolvedDesc =
      (first.type === 'in' && first.description
        ? first.productsData?.find(y => y.id === first.description)?.description
        : (first.mtrlStatus === 'select' || first.isSelection)
          ? first.productsData?.find(y => y.id === first.descriptionId)?.description
          : (first.type === 'out' && first.moveType === 'out')
            ? first.descriptionName
            : first.descriptionText) || first.descriptionName || 'Unknown';

    rows.push({
      description: resolvedDesc,
      qnty: Math.round(qty * 1000) / 1000,
      unit: quantityList.find(u => u.id === first.qTypeTable)?.qTypeTable || '',
      warehouse: warehouseList.find(w => w.id === first.stock)?.nname
        || warehouseList.find(w => w.id === first.stock)?.stock || '',
    });
  });

  return rows.sort((a, b) => b.qnty - a.qnty);
};
