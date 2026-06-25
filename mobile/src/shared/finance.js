// Single source of truth for core financial math — PURE (no Firebase, no JSX), so it
// can be unit-tested in isolation and shared by every screen (dashboard, cashflow,
// contracts, invoices, reviews, alerts, AI assistant). See
// tasks/financial-calc-consolidation.md for the rationale and the open decisions.
//
// Phase 0: this module is additive. Nothing imports it yet, so no displayed number can
// change until a screen is deliberately migrated to it (with golden-value verification).

import { resolveDueDate, resolveInvoiceDate, toIsoDate } from './pureHelpers.js';

export { resolveDueDate, resolveInvoiceDate, toIsoDate };

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

export const isFinalized = (inv) => inv?.shipData?.fnlzing === FINALIZED_FLAG;

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
  return Object.values(groups).flatMap(group => {
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
