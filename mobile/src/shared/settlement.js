// Final settlement → supplier (purchase) invoices. Shared verbatim with the phone
// (mobile/src/shared/settlement.js); the parity suite checks the two are identical.
//
// From 2026-06-28 a CONFIRMED settlement overwrote each supplier invoice's value with the
// settled total of its lots, on its own. That is only right when the lots are priced at
// what the supplier invoiced. Thormet's PO 300126 lots carry $9,350–12,350/MT against
// invoices at $6,400–6,960/MT, so confirming its settlement on 2026-10-02 turned eleven
// invoices paid in full into $337,893.43 of balance (client, 2026-10-07: "the value of the
// invoices were changed automatically … we paid in full every invoice for supplier
// Thormet").
//
// Now nothing changes on its own. The settlement window lists what WOULD change
// (settledInvoiceChanges) and the person chooses: keep the invoice values — the default —
// or use the settled totals (applySettledTotals, the old behaviour).

const round2 = (n) => Math.round(n * 100) / 100;
const amount = (v) => {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : 0;
};

/** Settled total per supplier invoice id: the sum of `finaltotal` over the lots that name it. */
export const settledTotalsByInvoice = (lots = []) => {
    const out = {};
    (lots || []).forEach((x) => {
        if (!x?.poInvoice) return;
        out[x.poInvoice] = (out[x.poInvoice] || 0) + amount(x.finaltotal);
    });
    return out;
};

/** The supplier invoices whose value the settled totals would change — what each is now,
    what it would become, and its balance before and after. Empty when nothing would move. */
export const settledInvoiceChanges = (poInvoices = [], lots = []) => {
    const settled = settledTotalsByInvoice(lots);
    return (poInvoices || [])
        .filter((pi) => pi && settled[pi.id] != null)
        .map((pi) => {
            const now = round2(amount(pi.invValue));
            const next = round2(settled[pi.id]);
            const paid = amount(pi.pmnt);
            return {
                id: pi.id, inv: pi.inv, now, settled: next, paid,
                balanceNow: round2(now - paid), balanceAfter: round2(next - paid),
            };
        })
        .filter((c) => Math.abs(c.settled - c.now) > 0.005);
};

/** Each supplier invoice's value set to its settled total, and its balance to value − paid.
    Only when the person chooses it in the settlement window. */
export const applySettledTotals = (poInvoices = [], lots = []) => {
    const settled = settledTotalsByInvoice(lots);
    return (poInvoices || []).map((pi) => {
        if (!pi || settled[pi.id] == null) return pi;
        const invValue = round2(settled[pi.id]);
        return { ...pi, invValue, blnc: round2(invValue - amount(pi.pmnt)) };
    });
};
