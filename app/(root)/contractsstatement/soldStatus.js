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

// Tone from sold vs received quantities. Shared so a line and its PO parent always agree.
export const rollupTone = (soldQty, receivedQty) => {
    if (!(receivedQty > 0.0001)) return 'none';
    if (soldQty <= 0.0001) return 'unsold';
    if (soldQty < receivedQty - 0.0001) return 'partial';
    return 'sold';
};

// Roll-up across a contract line's lots. Each lot: { qnty:number, sold:boolean }.
export const computeSoldRollup = (lots = []) => {
    const receivedQty = lots.reduce((t, l) => t + (Number(l.qnty) || 0), 0);
    const soldQty = lots.reduce((t, l) => t + (l.sold ? (Number(l.qnty) || 0) : 0), 0);
    return { tone: rollupTone(soldQty, receivedQty), soldQty, receivedQty };
};

// Aggregate already-computed line roll-ups into a PO-level roll-up.
export const aggregateRollups = (rollups = []) => {
    const soldQty = rollups.reduce((t, r) => t + (Number(r?.soldQty) || 0), 0);
    const receivedQty = rollups.reduce((t, r) => t + (Number(r?.receivedQty) || 0), 0);
    return { tone: rollupTone(soldQty, receivedQty), soldQty, receivedQty };
};
