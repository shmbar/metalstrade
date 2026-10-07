// Single source of truth for core financial math — PURE (no Firebase, no JSX), so it
// can be unit-tested in isolation and shared by every screen (dashboard, cashflow,
// contracts, invoices, reviews, alerts, AI assistant). See
// tasks/financial-calc-consolidation.md for the rationale and the open decisions.
//
// Phase 0: this module is additive. Nothing imports it yet, so no displayed number can
// change until a screen is deliberately migrated to it (with golden-value verification).

import { resolveDueDate, resolveInvoiceDate, toIsoDate, docsInForce, heldDraftIds } from './pureHelpers.js';

export { resolveDueDate, resolveInvoiceDate, toIsoDate, docsInForce, heldDraftIds };

// shipData.fnlzing === FINALIZED_FLAG means the final invoice has been issued.
export const FINALIZED_FLAG = '4568';

// Default payment term: when an invoice has no explicit delivery/due date, its due date
// is assumed to be this many days after the invoice date. Adjustable (later: per-account
// setting). Lets overdue detection work without forcing manual due-date entry.
export const DEFAULT_TERM_DAYS = 30;

// Quantity unit → metric-tonne factor. Mirrors the Inventory tab's setNum().
export const UNIT_TO_MT = { MT: 1, KGS: 0.001, LB: 0.0005 };

// invType comes in two shapes across the app: numeric ids ('1111'/'2222'/'3333')
// on drafts and labels ('Invoice'/'Credit Note'/'Final Note') on finalized docs.
// Rank lets Credit/Final notes supersede the original invoice in a group.
const INV_TYPE_RANK = {
  '1111': 1, Invoice: 1,
  '2222': 2, 'Credit Note': 2,
  '3333': 3, 'Final Note': 3,
};
const invTypeRank = (inv) => INV_TYPE_RANK[inv?.invType] ?? 1;

// Finite-number coercion — the bedrock against NaN poisoning (a single bad field
// must never turn a whole total into NaN/$0).
export const num = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

// Currency normalizer. cur is 'us'/'eu' on drafts and an object { cur: 'USD'|'EUR' }
// on finalized invoices; contracts use the 'us'/'eu' id. Always returns 'us' | 'eu'.
export const resolveCur = (entity) => {
  const c = entity?.cur;
  if (c && typeof c === 'object') return String(c.cur || '').toUpperCase() === 'EUR' ? 'eu' : 'us';
  return c === 'eu' ? 'eu' : 'us';
};

// ── per-invoice ──────────────────────────────────────────────────────────────
export const invoicePaid = (inv) => (inv?.payments || []).reduce((s, p) => s + num(p?.pmnt), 0);

// Balance = totalAmount − payments, always recomputed (stored debtBlnc is a cache).
// DECISION #3: confirm we never trust a stored debtBlnc that disagrees.
export const invoiceBalance = (inv) => num(inv?.totalAmount) - invoicePaid(inv);

// Issued = not a draft and not canceled. DECISION #2: confirm draft === true semantics.
export const isIssued = (inv) => inv?.draft !== true && !inv?.canceled;

// The one word for what an invoice document is — the Invoices page's Status column, its
// filter and cards, the Excel and the search all ask here, and it is isIssued said aloud:
// it follows the invoice's own Draft box. The page used to follow `final`, a flag nothing
// sets any more, so every invoice read "Draft" whatever its Draft box said: IMS's 2026
// cards showed "Final 0 · Draft 169" for 166 issued invoices and 3 drafts (2026-10-06).
export const invoiceStatus = (inv) => (inv?.canceled ? 'Canceled' : inv?.draft === true ? 'Draft' : 'Issued');

// A Final Note IS the final invoice — issuing one finalizes the shipment even when
// the manual Finalizing flag was never switched (rows like "0018FN" showed Final: No).
export const isFinalNote = (inv) => inv?.invType === '3333' || inv?.invType === 'Final Note';
export const isFinalized = (inv) => inv?.shipData?.fnlzing === FINALIZED_FLAG || isFinalNote(inv);

// Effective due date: the explicit delivery/due date if present, otherwise invoice date +
// DEFAULT_TERM_DAYS. So overdue detection works even when no due date was entered.
export const effectiveDueDate = (inv, termDays = DEFAULT_TERM_DAYS) => {
  const explicit = resolveDueDate(inv);
  if (explicit) return explicit;
  const invDate = resolveInvoiceDate(inv);
  if (!invDate) return null;
  const d = new Date(invDate);
  d.setDate(d.getDate() + termDays);
  return d.toISOString().slice(0, 10);
};

// Overdue = issued, still owes money, and past its effective due date.
export const isOverdue = (inv, asOf = new Date(), termDays = DEFAULT_TERM_DAYS) => {
  if (!isIssued(inv) || invoiceBalance(inv) <= 0.01) return false;
  const due = effectiveDueDate(inv, termDays);
  return !!due && new Date(due) < asOf;
};

// ── currency / FX ────────────────────────────────────────────────────────────
// NaN-safe conversion. `rate` is base-units per EUR (i.e. euroToUSD when base='us').
// Same currency passes through; a missing/invalid rate falls back to 1:1 (never NaN).
// DECISION #5: base currency + whether `rate` comes from the contract or a central feed.
export const fx = (amount, cur, rate, base = 'us') => {
  const a = num(amount);
  if (resolveCur({ cur }) === base) return a;
  const r = num(rate);
  return base === 'us' ? a * (r > 0 ? r : 1) : a / (r > 0 ? r : 1);
};

// ── quantity / MT ────────────────────────────────────────────────────────────
export const unitOf = (contract, settings) =>
  settings?.Quantity?.Quantity?.find(q => q.id === contract?.qTypeTable)?.qTypeTable || 'MT';

export const toMT = (qty, contract, settings) => num(qty) * (UNIT_TO_MT[unitOf(contract, settings)] ?? 1);

/* How much an `in` lot actually put into the warehouse.

   `qnty` is what the PO said; `finalqnty` is what it weighed at settlement, so a
   settled lot counts its settled figure — a 0.876 lot that weighed 0.634 is 0.634.

   The exception is a lot whose ORIGINAL quantity is zero, and it is not an edge
   case — it is a working practice. When a shipment is sorted at the client's
   premises and items turn up that were never on the PO, those items are entered
   back on the contract as ZERO-weight lines, purely so the final settlement can
   show them and the supplier can be paid. The material was found at the buyer's
   end: it left the warehouse with the shipment and never returned. Booking its
   settled weight as an arrival invents stock that does not exist.

   Nicrometal PO 181024 was exactly this. 718 Solids read 0.254 MT and Waspaloy
   Solids 0.310 MT, and every real gram had already shipped out on invoice 1186 —
   the whole remaining balance was zero-weight settlement lines.

   The stocks page already calls these "0-qnty balancing rows" and refuses to let
   one overwrite a row's unit price. Quantity was the field that never got the
   same guard. */
export const settledInQty = (lot) => {
  const base = Math.abs(num(lot?.qnty));
  if (base === 0) return 0;
  const q = num(lot?.qnty);
  const fin = num(lot?.finalqnty);
  // Kept in the original shape (base + delta) rather than "return finalqnty", so a
  // negatively-signed qnty behaves exactly as it did before.
  const settle = lot?.finalqnty && fin !== q ? fin - q : 0;
  return base + settle;
};

/* The other half of that story: a zero-weight settlement line whose settled figure
   is NEGATIVE — the supplier settling for LESS than was delivered.

   Triart PO 150125-1 (client, 2026-09-21: "where is this 20 kg from — I found it in
   the final settlement but we didn't put this material there"). Delivery 150125-1-5
   booked 21.191 MT on 21 Feb 2025 and sales invoice 1240 sold 21.171 MT the same
   day; settlement invoice CI250407-1 then recorded the 0.020 MT difference as a
   zero-weight line with finalqnty -0.020. Every other delivery on that PO matches
   its sale to the gram, so the line sat at exactly that 0.020 MT — $62.99 of stock
   that is not in any warehouse.

   Only reductions count here. A POSITIVE figure on a zero-weight line is the
   Nicrometal case above — material found at the buyer's end, already shipped —
   and adding it would invent stock; subtracting a reduction can only ever remove
   stock that was never there. Takes the lots of ONE material line (they are not
   per-lot: the correction belongs to the line, not to any single delivery). */
export const settlementReduction = (lots = []) =>
  lots.reduce((total, l) => {
    if (!l || l.type !== 'in') return total;
    if (Math.abs(num(l.qnty)) !== 0) return total;
    const fin = num(l.finalqnty);
    return fin < 0 ? total + fin : total;
  }, 0);

// ── grouping ─────────────────────────────────────────────────────────────────
// Dedupe a flat list of invoice docs by invoice number. When a group contains a
// Credit/Final note, those supersede the original '1111' invoice; payments are
// combined across all related docs. DECISION #6: confirm the supersede rule.
export const groupInvoices = (list) => {
  if (!Array.isArray(list)) return [];
  const groups = {};
  list.forEach(inv => {
    if (!inv || inv.invoice == null) return;
    (groups[String(inv.invoice)] ||= []).push(inv);
  });
  // A draft note does not stand in for the invoice it would replace — the invoice stays,
  // with its own payments and balance (pureHelpers.js docsInForce). Merged into the draft
  // note it was then dropped by every `.filter(isIssued)` below: an issued invoice with
  // money still owed on it was in no receivable, no aging bucket and no revenue.
  return Object.values(groups).map(docsInForce).flatMap(group => {
    if (group.length === 1) return group;
    const maxRank = Math.max(...group.map(invTypeRank));
    const ranks = group.map(invTypeRank);
    if (new Set(ranks).size === 1) return group; // same type → not an original+note pair
    const kept = group.filter(g => invTypeRank(g) === maxRank);
    const allPayments = group.flatMap(g => g.payments || []);
    const totalAmount = kept.reduce((s, g) => s + num(g.totalAmount), 0);
    return [{ ...kept[0], payments: allPayments, totalAmount, debtBlnc: totalAmount - allPayments.reduce((s, p) => s + num(p?.pmnt), 0) }];
  });
};

// ── which document states an invoice ─────────────────────────────────────────
/* An invoice and its notes share one invoice NUMBER, and a Credit or Final Note in this
   data is the invoice issued again with its settled figures — not a correction to add to
   it: IMS's 305 Final Notes come to a median 0.995 of the invoice they settle, and none is
   negative (2026-10-06). So the invoice AS IT STANDS is its highest-ranked live document,
   and adding a note to its invoice counts the sale twice — Accounting read $92.80M of 2026
   income for $69.03M of invoices, and Sales Contracts shipped PCI / 3014 twice over.
   Several documents can share the top rank — invoice 1298 was settled by two Final Notes,
   one per container group, that add up to the invoice — so all of them stand.
   A note still saved as a DRAFT is not in force, so it does not outrank the invoice it
   would replace (pureHelpers.js docsInForce): IMS #1431 stands at the $309,349.00 it was
   issued for, not at its draft Final Note's $277,016.00, until that note is issued. */
export const invoiceRank = invTypeRank;
export const isLiveDoc = (inv) => !!inv && !inv.canceled;
export const standingDocs = (group, isLive = isLiveDoc) => {
  const live = docsInForce(group).filter(isLive);
  if (!live.length) return [];
  const top = Math.max(...live.map(invTypeRank));
  return live.filter(inv => invTypeRank(inv) === top);
};

// A document's date: a draft keeps it in its picker range, a finalised one as a string.
const docDate = (inv) => {
  const d = !inv?.final ? inv?.dateRange?.startDate : inv?.date;
  return typeof d === 'string' ? d : '';
};

/* The day an invoice is booked on: its ORIGINAL's date. Taken from the original when it is
   among the documents, else from the pointer every note carries (originalInvoice.date), so
   an invoice issued before the window that was loaded still keeps its own year; a note with
   neither is booked on its own date. '' when no document carries a date. */
export const invoiceBookedOn = (group) => {
  const g = group || [];
  const originals = g.filter(inv => invTypeRank(inv) === 1).map(docDate).filter(Boolean);
  const pointers = g.map(inv => inv?.originalInvoice?.date).filter(d => typeof d === 'string' && d);
  const dates = originals.length ? originals : pointers.length ? pointers : g.map(docDate).filter(Boolean);
  return dates.length ? dates.slice().sort()[0] : '';
};

/* The sales of a period: every invoice issued in it, at the value it stands at now —
   [{ doc, bookedOn }], one entry per standing document (standingDocs).
   A Final Note dated after the period restates the invoice; it does not sell the material
   a second time. Booked on its own date, a note counted a deal in two years: invoice 1327
   was issued on 20 Aug 2025 ($121,208.41) and settled by a Final Note on 23 Jan 2026
   ($118,072.80), and the Dashboard put the first in 2025 and the second in 2026 —
   $969,843.78 of IMS's 2026 sales had been sold in 2025. Accounting has always booked an
   invoice in its original's period; the Dashboard and the reviews now do the same.
   Drafts and cancelled documents are not sales. */
export const salesBookedIn = (invoices, { start, end } = {}, isLive = isIssued) => {
  const groups = {};
  (invoices || []).forEach(inv => {
    if (inv && inv.invoice != null) (groups[String(inv.invoice)] ||= []).push(inv);
  });
  const out = [];
  Object.values(groups).forEach(group => {
    const bookedOn = invoiceBookedOn(group);
    if (!bookedOn || (start && bookedOn < start) || (end && bookedOn > end)) return;
    standingDocs(group, isLive).forEach(doc => out.push({ doc, bookedOn }));
  });
  return out;
};

/* Accounting's totals from its ledger lines. Income is each invoice once, at the value it
   stands at (standingDocs); a cost is each supplier invoice and each expense once, however
   many sales invoices list it — a supplier invoice that covers two shipments is listed
   under both, and was added twice: PO 280426-1-TIM's $6,722,430 supplier invoice under
   1441 and 1436 (IMS 2026: $13,699,412.05 of costs counted again). Per currency — nothing
   here converts.
     sales: [{ invoice, invType, amount, cur, canceled, draft }]  one per sales document
     costs: [{ key, amount, cur }]                                one per listed cost line
   `draft` is what lets a note still saved as a draft stay out of its invoice's place. */
const curKey = (c) => (/^(eu|eur|€)$/i.test(String(c ?? '').trim()) ? 'eu' : 'us');
export const ledgerTotals = ({ sales = [], costs = [] } = {}) => {
  const zero = () => ({ us: 0, eu: 0 });
  const income = zero(), expense = zero();
  const groups = {};
  (sales || []).forEach(s => {
    if (s && s.invoice != null && s.invoice !== '') (groups[String(s.invoice)] ||= []).push(s);
  });
  Object.values(groups).forEach(group => standingDocs(group).forEach(s => { income[curKey(s.cur)] += num(s.amount); }));
  const seen = new Set();
  (costs || []).forEach(c => {
    if (!c) return;
    if (c.key) { if (seen.has(c.key)) return; seen.add(c.key); }
    expense[curKey(c.cur)] += num(c.amount);
  });
  return {
    income, expense,
    balance: { us: income.us - expense.us, eu: income.eu - expense.eu },
    invoices: Object.keys(groups).length,
  };
};

// ── collections ──────────────────────────────────────────────────────────────
// Revenue from a flat invoice list: deduped, issued-only, per-currency + base total.
export const invoiceRevenue = (list, { base = 'us', rateOf } = {}) => {
  const byCur = {};
  let baseTotal = 0;
  groupInvoices(list).filter(isIssued).forEach(inv => {
    const c = resolveCur(inv);
    const amt = num(inv.totalAmount);
    byCur[c] = (byCur[c] || 0) + amt;
    baseTotal += fx(amt, c, rateOf ? rateOf(inv) : inv.euroToUSD, base);
  });
  return { byCur, base: baseTotal };
};

// Outstanding receivables: deduped, issued-only, kept PER CURRENCY (never summed
// across currencies). Splits both due/balance (by due date) and finalized/provisional.
export const receivables = (list, { asOf = new Date(), termDays = DEFAULT_TERM_DAYS } = {}) => {
  const byCur = {};
  const slot = (c) => (byCur[c] || (byCur[c] = {
    due: 0, balance: 0, finalized: 0, provisional: 0,
    dueCount: 0, balanceCount: 0, finalizedCount: 0, provisionalCount: 0,
  }));
  groupInvoices(list).filter(isIssued).forEach(inv => {
    const bal = invoiceBalance(inv);
    if (bal <= 0.01) return;
    const s = slot(resolveCur(inv));
    if (isOverdue(inv, asOf, termDays)) { s.due += bal; s.dueCount++; }
    else { s.balance += bal; s.balanceCount++; }
    if (isFinalized(inv)) { s.finalized += bal; s.finalizedCount++; }
    else { s.provisional += bal; s.provisionalCount++; }
  });
  return { byCur };
};

// Receivables aging — outstanding balances bucketed by how old each invoice is
// (days since invoice date): 0–30 / 31–60 / 61–90 / 90+. Per currency, deduped,
// issued-only. Standard AR aging; needs no due-date entry.
export const agingBuckets = (list, { asOf = new Date() } = {}) => {
  const buckets = [
    { label: '0–30', maxDays: 30 },
    { label: '31–60', maxDays: 60 },
    { label: '61–90', maxDays: 90 },
    { label: '90+', maxDays: Infinity },
  ].map(b => ({ ...b, byCur: {}, count: 0 }));
  groupInvoices(list).filter(isIssued).forEach(inv => {
    const bal = invoiceBalance(inv);
    if (bal <= 0.01) return;
    const invDate = resolveInvoiceDate(inv);
    if (!invDate) return;
    const ageDays = Math.max(0, Math.floor((asOf - new Date(invDate)) / 86400000));
    const b = buckets.find(x => ageDays <= x.maxDays) || buckets[buckets.length - 1];
    const c = resolveCur(inv);
    b.byCur[c] = (b.byCur[c] || 0) + bal;
    b.count++;
  });
  return buckets;
};

// Contract purchase value (Σ poInvoices.pmnt), per-currency + base.
export const contractPurchaseValue = (contract, { base = 'us' } = {}) => {
  const c = resolveCur(contract);
  const raw = (contract?.poInvoices || []).reduce((s, z) => s + num(z?.pmnt), 0);
  return { byCur: { [c]: raw }, base: fx(raw, c, contract?.euroToUSD, base) };
};

// P&L is intentionally basis-agnostic: it just nets pre-aggregated totals. WHICH
// revenue/cost feed in (period vs deal — DECISION #1) is the caller's concern, so
// the open accounting decision never lives in the math.
export const pnl = ({ revenue = 0, cost = 0, expense = 0 } = {}) => {
  const r = num(revenue), c = num(cost), e = num(expense);
  return { revenue: r, cost: c, expense: e, profit: r - c - e };
};
