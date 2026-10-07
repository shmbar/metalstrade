// Cashflow's adders: the figure beside every client, supplier, warehouse and expense
// vendor on the page, and so every section total, card and the left/right balance built
// from them. Pure (no React, no Firestore) so they can be tested on their own
// (__tests__/cashflowTotals.test.ts); funcs.js and page.js call them.

/* Cashflow is a DOLLAR page: every section total, the cards and the left/right balance
   are in dollars. A euro invoice, lot or expense is added in at TODAY's EUR→USD — the
   live rate the page asks for once per load (hooks/useExchangeRates.js fetchEurUsd) and
   hands to every adder below (finance.js fx does the arithmetic).

   It used to be three different answers on one page (found 2026-10-07): client balances
   and stock went in at face value, €1 as $1 — GIS's €117,260.00 receivable counted as
   $117,260.00; supplier balances at each PO's own rate; expenses at a fixed 1.08.

   EUR_USD_FALLBACK (finance.js) is only for a load on which neither rate feed answered —
   the page says so under its title when that happens.

   A row built here is in dollars (`cur: 'us'`) and carries `_eur`, the euro amount it
   includes as it was booked, so the page can still show what was converted. The lines a
   detail table lists stay in their own currency. */
import { fx, num, resolveCur, EUR_USD_FALLBACK } from '../../../utils/finance';

export const isEuro = (row) => resolveCur(row) === 'eu';
// An expense is in euros unless it is marked dollars — how its own table has always read
// it (ExpensesToolTip's "Total €" takes every row that is not `us`).
export const expenseCur = (row) => (row?.cur === 'us' ? 'us' : 'eu');

// Shipment-finalized badge. The only "finalized" signal in the app is the sales
// invoice's shipData.fnlzing (Finalizing const: '4568' = Yes, '2587' = No). A
// finalized shipment means the final invoice has been issued; anything else
// (No, or unset on older data) is still provisional — i.e. a balance from
// BEFORE the final invoice. Used on client balances (read straight off the
// invoice) and supplier balances (mirrored from the linked contract's sales
// invoice via contract id, wired up in cashflow/page.js).
// A Final Note doc counts as finalized by itself — issuing the final note IS the
// finalization; the manual Finalizing flag stays for shipments finalized without one.
export const isFN = (t) => t === '3333' || t === 'Final Note';
// Purchase invoices carry no invoice-type field — the business convention is an
// "FN" suffix in the number itself ("0012FN"), so that counts as a final note too.
export const isFNNumber = (no) => /fn\s*$/i.test(String(no || '').trim());

/* Pending invoices (payment on hold) stay OUT of every active total — the supplier
   header, the section total, the Suppliers-due card, the left/right balance — and are
   carried beside it as _pendingBlnc / _pendingCount so each place can still say how
   much is on hold (client, 2026-09-24). Everything on the page is summed from what
   these two functions return, so this is the one place the rule has to live.
   A raw row reads its own `pending` flag; an already-aggregated row (the sort handlers
   re-run these on their own output) carries its split forward unchanged. */
const pendingSplit = (item, value) => {
    if (item._finTotal != null) {
        return { active: value, pending: Number(item._pendingBlnc) || 0, count: item._pendingCount || 0 };
    }
    return item.pending
        ? { active: 0, pending: value, count: 1 }
        : { active: value, pending: 0, count: 0 };
};

// Clients — one row per client: its open balance in dollars (Clients - Payment / Balances).
export const getTotals = (arr, eurUsd = EUR_USD_FALLBACK) => {
    const acc = new Map();

    for (const item of arr) {
        const ent = item.client;
        if (!ent) continue;

        // Carry counts forward when re-aggregating an already-summarised array
        // (the sort handlers re-run getTotals on its own output); only fall back
        // to the raw shipData flag on the first pass over per-invoice rows.
        const done = item._finTotal != null;
        const incTotal = done ? item._finTotal : 1;
        const incFinal = done ? (item._finCount || 0) : ((item.shipData?.fnlzing === '4568' || isFN(item.invType)) ? 1 : 0);
        // In dollars: a euro invoice's balance at today's rate (see the DOLLAR-page note
        // at the top). A client owing in both currencies used to get the two added as they
        // stood, under whichever currency its first invoice happened to be in. An aggregate
        // handed back in is already in dollars and is carried forward as it is.
        const own = Number(item.debtBlnc) || 0;
        // `_eur` is the euro part of the ACTIVE figure — a held invoice is in neither.
        const eur = done ? (item._eur || 0) : isEuro(item) && !item.pending ? own : 0;
        // Pending receivables stay out of the active figure — same rule, and same
        // carried-forward split, as getTotalsSupPayments (see pendingSplit).
        const split = pendingSplit(item, done ? own : fx(own, item.cur, eurUsd));
        if (!acc.has(ent)) {
            acc.set(ent, {
                ...item, cur: 'us', pending: false, debtBlnc: split.active,
                _pendingBlnc: split.pending, _pendingCount: split.count,
                _finCount: incFinal, _finTotal: incTotal, _eur: eur,
            });
        } else {
            const existing = acc.get(ent);
            existing.debtBlnc += split.active;
            existing._pendingBlnc += split.pending;
            existing._pendingCount += split.count;
            existing._finCount += incFinal;
            existing._finTotal += incTotal;
            existing._eur += eur;
        }
    }

    return [...acc.values()];
};

// Suppliers — one row per supplier: what we owe it in dollars (Supplier - Payment / Balances).
export const getTotalsSupPayments = (arr, eurUsd = EUR_USD_FALLBACK) => {

    let totalBySupplier = Object.values(arr.reduce((acc, item) => {
        const supplier = item.supplier;
        // In dollars: a euro PO's balance at TODAY's rate, the same one the rest of the page
        // uses (see the DOLLAR-page note at the top) — it was the rate the PO was saved at,
        // and a PO with none on it turned the whole section into NaN.
        // An aggregate handed back in (the sort handlers re-run this on its own output) is
        // already in dollars. It used to be multiplied by its first PO's rate a second time
        // on every sort, because it still carried that PO's `cur`.
        const done = item._finTotal != null;
        const own = num(item.blnc);
        const eur = done ? (item._eur || 0) : isEuro(item) && !item.pending ? own : 0; // active part only, as above
        const split = pendingSplit(item, done ? own : fx(own, item.cur, eurUsd));
        // Idempotent under re-aggregation: carry forward existing counts, else derive
        // from the raw flag.
        const incTotal = done ? item._finTotal : 1;
        const incFinal = done ? (item._finCount || 0)
            : ((item.fnlzing === '4568' || isFNNumber(item.invoice)) ? 1 : 0);
        if (!acc[supplier]) {
            // Seed with the PARSED, currency-converted balance — never the raw field.
            // AI-imported purchase invoices store blnc as a string, and seeding the
            // raw value made later `+=` STRING-CONCATENATE (a $31,500 + $12,345 pair
            // displayed as $31,50012,345…) and skipped the EUR→USD conversion.
            acc[supplier] = {
                ...item, cur: 'us', pending: false, blnc: split.active,
                _pendingBlnc: split.pending, _pendingCount: split.count,
                _finCount: incFinal, _finTotal: incTotal, _eur: eur,
            };
        } else {
            acc[supplier].blnc += split.active;
            acc[supplier]._pendingBlnc += split.pending;
            acc[supplier]._pendingCount += split.count;
            acc[supplier]._finCount += incFinal;
            acc[supplier]._finTotal += incTotal;
            acc[supplier]._eur += eur;
        }

        return acc;
    }, {}));

    return totalBySupplier;
};

/* Stocks – UnPaid per warehouse — runStocks' unpaid rows, re-summed on the page so a hold
   moves it at once. Held rows are carried beside the active total as _pendingBlnc /
   _pendingCount, the names the section helpers already read for suppliers and clients.
   A warehouse whose every row is held stays listed (its total reads 0, its hold does not). */
export const sumUnpaidStocksByWarehouse = (rows, eurUsd = EUR_USD_FALLBACK) => {
    const byStock = {};
    for (const r of rows) {
        const w = (byStock[r.stock || 'no_stock'] ||= {
            stock: r.stock, cur: 'us', qTypeTable: r.qTypeTable, qnty: 0, total: 0, _pendingBlnc: 0, _pendingCount: 0, _eur: 0,
        });
        // In dollars: a lot bought in euros at today's rate (see the DOLLAR-page note at the top).
        const own = r.total === '-' ? 0 : parseFloat(r.total) || 0;
        const value = fx(own, r.cur, eurUsd);
        if (isEuro(r) && !r.pending) w._eur += own; // the euro part of the active figure
        if (r.pending) { w._pendingBlnc += value; w._pendingCount += 1; }
        else { w.qnty += parseFloat(r.qnty) || 0; w.total += value; }
    }
    return Object.values(byStock).filter(w => w.total !== 0 || w._pendingBlnc !== 0);
};

/* Stocks - Paid (and runStocks' first pass at UnPaid): one line per warehouse, in
   DOLLARS. runStocks hands in its per-warehouse, per-currency groups; a euro group goes
   in at today's rate. They were added as they stood — a warehouse holding lots bought in
   both currencies read dollars plus euros under whichever currency its first group had. */
export const warehouseTotals = (groups, eurUsd = EUR_USD_FALLBACK) => Object.values(groups.reduce((acc, item) => {
    const stock = item.stock || 'no_stock';  // Handle cases where stock is undefined
    const w = (acc[stock] ||= { ...item, cur: 'us', qnty: 0, total: 0, _eur: 0 });
    w.qnty += item.qnty;
    w.total += fx(item.total, item.cur, eurUsd);
    if (isEuro(item)) w._eur += num(item.total);
    return acc;
}, {}));

/* Unsold Stocks: one line per supplier, in dollars — a euro PO's lines at today's rate.
   The row used to take its first PO's currency and add every line as it stood.
   `supplierName(id)` names the row. Lines without a PO number are not listed. */
export const unsoldBySupplier = (lines, supplierName, eurUsd = EUR_USD_FALLBACK) => Object.values(
    lines.reduce((acc, item) => {
        if (!item?.order) return acc;
        const supplier = item.supplier;
        const total = Number(item.total) || 0;
        if (!acc[supplier]) {
            acc[supplier] = { supplier, total: 0, cur: 'us', supplierName: supplierName(supplier), _eur: 0 };
        }
        acc[supplier].total += fx(total, item.cur, eurUsd);
        if (isEuro(item)) acc[supplier]._eur += total;
        return acc;
    }, {})
);

/* Expenses: each vendor's unpaid total in DOLLARS — a euro expense at today's EUR→USD.
   It was a fixed 1.08, whatever the euro was worth that day. `_eur` is the euro part as
   entered, so the row can still say what was converted. */
export const vendorTotals = (rows, eurUsd = EUR_USD_FALLBACK) => {
    const byVendor = {};
    rows.forEach((item) => {
        const v = (byVendor[item.supplier] ||= { supplier: item.supplier, amount: 0, _eur: 0 });
        const cur = expenseCur(item);
        v.amount += fx(item.amount, cur, eurUsd);
        if (cur === 'eu') v._eur += num(item.amount);
    });
    return Object.values(byVendor);
};
