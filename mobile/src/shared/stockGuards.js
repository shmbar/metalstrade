// Guards that run before a sales invoice writes stock movements — PURE, with the
// ledger read injected, so they can be tested against a known ledger without
// Firestore or React. The hook that saves invoices supplies the real loader.

const EPS = 0.0005;

/**
 * The stock ledger of ONE contract, as it stood before this invoice was saved.
 *
 * A line id alone does not find a contract's stock. A PO put together from lines of
 * other POs keeps THEIR line ids, so the ledger under such an id holds every copy's
 * lots: IMS PO 220526 shares its 31Ni BalTi line with PO 050626, and the 35.683 MT
 * the trap once reported on 220526 had all arrived on 050626. So each row is claimed
 * by what it carries:
 *   • a purchase lot, or the arriving half of a warehouse transfer — contractData.id
 *   • a sale — only its invoice number; the contract lists its invoices
 *   • the leaving half of a transfer — nothing; it is written together with its
 *     arriving half (same line, weight and day, oldStock = where it left), which does
 *
 * The invoice being saved is left out, original and final alike. On a re-save its
 * rows are already in the ledger; counted, they empty the very lines it sells from —
 * re-saving Oryx invoice 1448 found its REN88 line at zero because 1448 had sold it.
 */
export const contractLedger = (rows = [], contract, invoiceNum) => {
    const own = Number(invoiceNum) > 0 ? Number(invoiceNum) : null;
    const sales = new Set((contract?.invoices || []).map(x => Number(x.invoice)).filter(n => n > 0 && n !== own));
    const mine = (r) => !!contract?.id && r.contractData?.id === contract.id;
    const arrivals = rows.filter(r => r.type === 'in' && r.moveType === 'in' && mine(r));
    return rows.filter(r => {
        if (r.type === 'in') return mine(r);
        if (r.moveType === 'out') return arrivals.some(a =>
            a.oldStock === r.stock && a.stock === r.newStock && a.date === r.date
            && Math.abs(Number(a.qnty) - Number(r.qnty)) < EPS
            && [a.description, a.descriptionId].includes(r.descriptionId));
        return sales.has(Number(r.invoice));
    });
};

/** Net quantity per line — a purchase lot names its line in `description`, an out row in `descriptionId`. */
export const onHandByLine = (rows = [], lineIds = []) => {
    const onHand = Object.fromEntries(lineIds.map(id => [id, 0]));
    rows.forEach(r => {
        const key = lineIds.includes(r.description) ? r.description : r.descriptionId;
        if (key in onHand) onHand[key] += (Number(r.qnty) || 0) * (r.type === 'in' ? 1 : -1);
    });
    return onHand;
};

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
 * @param invoice   the invoice being saved (draft, invoice, productsDataInvoice)
 * @param contract  its contract { id, productsData: [{ id, description }], invoices }
 * @param loadRows  async (lineIds) => the ledger rows on those lines, every warehouse,
 *                  drafts dropped and superseded invoices already filtered out
 * @returns null when fine, else the message to show the user
 */
export const duplicateLineTrap = async (invoice, contract, loadRows) => {
    if (invoice?.draft) return null;
    const contractProducts = contract?.productsData || [];
    const lines = (invoice?.productsDataInvoice || [])
        .filter(l => l.qnty !== 's' && parseFloat(l.qnty) > 0 && l.descriptionId && l.stock);
    const ids = contractProducts.map(p => p.id).filter(Boolean);
    if (!lines.length || ids.length < 2) return null;

    const ledger = contractLedger(await loadRows(ids), contract, invoice.invoice);
    for (const wh of [...new Set(lines.map(l => l.stock))]) {
        const onHand = onHandByLine(ledger.filter(r => r.stock === wh), ids);
        const here = lines.filter(x => x.stock === wh);
        // Stock a sibling line of THIS invoice already draws on is not an alternative:
        // on invoice 46 the 59Ni line held 5.44, enough to cover the 5.202 in question,
        // but that 5.44 was the 59Ni line's own sale. Only unclaimed stock counts.
        const claimed = {};
        here.forEach(x => { claimed[x.descriptionId] = (claimed[x.descriptionId] || 0) + parseFloat(x.qnty); });
        const available = (id) => (onHand[id] || 0) - (claimed[id] || 0);
        for (const l of here) {
            if ((onHand[l.descriptionId] || 0) > EPS) continue;             // has stock: fine
            const need = parseFloat(l.qnty);
            const alt = ids
                .filter(id => id !== l.descriptionId && available(id) >= need - EPS)
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
