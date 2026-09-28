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

/**
 * The wrong-warehouse trap.
 *
 * A sale is written off the warehouse chosen on its invoice line, and a wrong choice went
 * unnoticed: the warehouse that really holds the lot keeps it, and the chosen one goes
 * negative. IMS invoice 1464 (PO 280426-2) took its 20.495 MT of 698 Turnings from
 * Seagull, which held only the unsold 10.192; the 20.495 lot sat in Triart. Cashflow then
 * listed the sold 20.495 under Stocks - Paid, and the unpaid 10.192 vanished from
 * Stocks - UnPaid behind Seagull's -10.303 (client, 2026-09-28).
 *
 * Caught at the same moment as the duplicate-line trap, and as narrowly: a non-draft save
 * that takes more of a line from a warehouse than that warehouse holds of it, while
 * ANOTHER warehouse holds enough of the same line on the same contract. When no warehouse
 * holds enough — invoicing before the lot arrives, a final weight a little over the lot —
 * it is let through, as before.
 *
 * @param whName  (warehouseId) => its display name, for the message
 * @returns null when fine, else the message to show the user
 */
export const wrongWarehouseTrap = async (invoice, contract, loadRows, whName = (id) => id) => {
    if (invoice?.draft) return null;
    const contractProducts = contract?.productsData || [];
    const ids = contractProducts.map(p => p.id).filter(Boolean);
    const lines = (invoice?.productsDataInvoice || [])
        .filter(l => l.qnty !== 's' && parseFloat(l.qnty) > 0 && ids.includes(l.descriptionId) && l.stock);
    if (!lines.length) return null;

    const ledger = contractLedger(await loadRows(ids), contract, invoice.invoice);
    const warehouses = [...new Set(ledger.map(r => r.stock).filter(Boolean))];
    const onHand = Object.fromEntries(warehouses.map(wh => [wh, onHandByLine(ledger.filter(r => r.stock === wh), ids)]));
    const held = (wh, id) => onHand[wh]?.[id] || 0;
    // What this invoice takes of each line from each warehouse.
    const takes = new Map();
    lines.forEach(l => {
        const k = `${l.stock}\u0000${l.descriptionId}`;
        takes.set(k, (takes.get(k) || 0) + parseFloat(l.qnty));
    });
    const taken = (wh, id) => takes.get(`${wh}\u0000${id}`) || 0;

    for (const [k, need] of takes) {
        const [wh, id] = k.split('\u0000');
        if (held(wh, id) >= need - EPS) continue;                          // enough here: fine
        // Somewhere else holds it all — after what this invoice already takes from there.
        const alt = warehouses.find(w => w !== wh && held(w, id) - taken(w, id) >= need - EPS);
        if (!alt) continue;                                                // nowhere holds it: allowed
        const name = contractProducts.find(p => p.id === id)?.description || 'This material';
        return `"${name}": ${whName(wh)} holds ${Math.max(0, held(wh, id)).toFixed(3)} MT of it, but this invoice takes `
            + `${need.toFixed(3)} MT from there — ${whName(alt)} holds ${held(alt, id).toFixed(3)} MT. `
            + `Choose the warehouse the material is in, or record the transfer first.`;
    }
    return null;
};
