// Pure helpers for deriving a contract line's sold/unsold status on the Contracts Statement.
//
// "Sold" is derived from real allocation (consignee / sales-PO) or the manual flag — so a lot that
// has been committed to a buyer is never wrongly shown as Unsold just because the manual "Status"
// dropdown in the Materials Breakdown modal was never updated. This was the client-reported bug
// (e.g. 698 Solids/Turnings, Thormet) where genuinely sold material kept reading "Unsold".

const hasVal = (v) => v !== null && v !== undefined && String(v).trim() !== '';

// A single warehouse lot counts as sold if it is allocated to a buyer (consignee or sales-PO set)
// or was manually flagged "sold".
export const lotIsSold = (lot = {}) =>
    String(lot.status || '').toLowerCase() === 'sold' ||
    hasVal(lot.client) ||
    hasVal(lot.salesPo);

// Tone from sold vs basis quantities. Shared so a line and its PO parent always agree.
export const rollupTone = (soldQty, basisQty) => {
    if (!(basisQty > 0.0001)) return 'none';
    if (soldQty <= 0.0001) return 'unsold';
    if (soldQty < basisQty - 0.0001) return 'partial';
    return 'sold';
};

// Sold roll-up for one contract line. The basis is the CONTRACTED quantity, and a line counts as
// sold for whatever has been shipped/invoiced OR allocated on the warehouse lot (consignee /
// sales-PO / manual flag). So a line that shipped to a client no longer shows "Unsold", and an
// untouched contracted line reads "Unsold {contract qty}" instead of a blank dash.
// `receivedQty` carries the basis (contract qty) so the chip/label denominator is correct.
export const computeLineSold = ({ contractQty = 0, shippedQty = 0, lots = [] }) => {
    const basis = Number(contractQty) || 0;
    const allocatedQty = lots.reduce((t, l) => t + (l.sold ? (Number(l.qnty) || 0) : 0), 0);
    // Most that is demonstrably sold, without double-counting shipped vs allocated, capped at basis.
    const soldQty = Math.min(basis, Math.max(Number(shippedQty) || 0, allocatedQty));
    return { tone: rollupTone(soldQty, basis), soldQty, receivedQty: basis };
};

// Aggregate already-computed line roll-ups into a PO-level roll-up.
export const aggregateRollups = (rollups = []) => {
    const soldQty = rollups.reduce((t, r) => t + (Number(r?.soldQty) || 0), 0);
    const receivedQty = rollups.reduce((t, r) => t + (Number(r?.receivedQty) || 0), 0);
    return { tone: rollupTone(soldQty, receivedQty), soldQty, receivedQty };
};
