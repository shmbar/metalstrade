// Guards that run before a sales invoice writes stock movements — PURE, with the
// ledger read injected, so they can be tested against a known ledger without
// Firestore or React. The hook that saves invoices supplies the real loader.

/**
 * The duplicate-line trap.
 *
 * A contract can carry the same physical material on two lines — the PO's own line
 * and one added later by autofill or by a copy from the counterpart account, named
 * the way THAT document named it. Stock lands under one; the sales invoice is
 * written against the other. Nothing links them, so the sale never consumes the
 * stock: 5.202 MT of "625 AM Turnings" sat under Stocks - UnPaid for weeks while a
 * phantom -5.202 hung off a line with nothing under it (GIS invoice 46 / PO 2808-26).
 *
 * Ordering rules cannot prevent it in a copy-driven workflow, so this catches it at
 * the one moment it becomes real: a non-draft save that would write off stock from a
 * line with NOTHING under it while a sibling line on the same contract holds enough.
 * Nothing received on any line is let through — invoicing before receipt is normal
 * and simply goes negative until the lot arrives.
 *
 * @param invoice          the invoice being saved (draft, productsDataInvoice)
 * @param contractProducts the contract's product lines [{ id, description }]
 * @param loadOnHand       async (lineIds, warehouseId) => { [lineId]: netQty }
 * @returns null when fine, else the message to show the user
 */
export const duplicateLineTrap = async (invoice, contractProducts = [], loadOnHand) => {
    if (invoice?.draft) return null;
    const lines = (invoice?.productsDataInvoice || [])
        .filter(l => l.qnty !== 's' && parseFloat(l.qnty) > 0 && l.descriptionId && l.stock);
    const ids = contractProducts.map(p => p.id).filter(Boolean);
    if (!lines.length || ids.length < 2) return null;

    for (const wh of [...new Set(lines.map(l => l.stock))]) {
        const onHand = await loadOnHand(ids, wh);
        const here = lines.filter(x => x.stock === wh);
        // Stock a sibling line of THIS invoice already draws on is not an alternative:
        // on invoice 46 the 59Ni line held 5.44, enough to cover the 5.202 in question,
        // but that 5.44 was the 59Ni line's own sale. Only unclaimed stock counts.
        const claimed = {};
        here.forEach(x => { claimed[x.descriptionId] = (claimed[x.descriptionId] || 0) + parseFloat(x.qnty); });
        const available = (id) => (onHand[id] || 0) - (claimed[id] || 0);
        for (const l of here) {
            if ((onHand[l.descriptionId] || 0) > 0.0005) continue;         // has stock: fine
            const need = parseFloat(l.qnty);
            const alt = ids
                .filter(id => id !== l.descriptionId && available(id) >= need - 0.0005)
                .map(id => contractProducts.find(p => p.id === id))
                .filter(Boolean)[0];
            if (!alt) continue;                                            // nothing anywhere: allowed
            const chosen = contractProducts.find(p => p.id === l.descriptionId)?.description || 'that line';
            return `"${chosen}" has nothing in stock at this warehouse, but "${alt.description}" has ${onHand[alt.id].toFixed(3)} — `
                + `the same material may be on two lines. Pick the line with stock, or fix it in the Materials Breakdown.`;
        }
    }
    return null;
};
