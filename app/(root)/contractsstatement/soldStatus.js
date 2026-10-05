// Pure helpers for deriving a contract line's sold/unsold status on the Contracts Statement.
//
// "Sold" is derived from real allocation (consignee / sales-PO) or the manual flag — so a lot that
// has been committed to a buyer is never wrongly shown as Unsold just because the manual "Status"
// dropdown in the Materials Breakdown modal was never updated. This was the client-reported bug
// (e.g. 698 Solids/Turnings, Thormet) where genuinely sold material kept reading "Unsold".

import { normalizeStatus } from './shipmentStatus';

const hasVal = (v) => v !== null && v !== undefined && String(v).trim() !== '';
const fmtQty = (n) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(Number(n) || 0);

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
    const shipped = Number(shippedQty) || 0;
    const allocatedQty = lots.reduce((t, l) => t + (l.sold ? (Number(l.qnty) || 0) : 0), 0);
    // Most that is demonstrably sold, without double-counting shipped vs allocated, capped at basis.
    const soldQty = Math.min(basis, Math.max(shipped, allocatedQty));
    return { tone: rollupTone(soldQty, basis), soldQty, receivedQty: basis, shippedQty: shipped };
};

// The lifecycle statuses that mean the goods are in our hands.
const IN_HAND = new Set(['Arrived', 'Completed']);
// Below this much, unsold weight is not worth a warning on a finished PO.
const LEFT_TOLERANCE = 0.05;
// Weights are kept to the kilogram; without this 19.44 − 19.44 read "-0.000".
const round3 = (n) => Math.round((Number(n) || 0) * 1000) / 1000 || 0;

/* What a contract line — or a whole PO — has to ship, and what is left of it.

   The basis is the CONTRACTED quantity until the goods are in, and from then on what was
   RECEIVED; it is also what was received as soon as that is more than the contract
   (`byReceived`). PO 191125-1 (client, 2026-10-05): 176 MT contracted, 179.649 received,
   134.606 shipped. Against the contract it read "41.394 remaining" beside "Completed" — the
   3.65 MT over-delivered netted against two containers nobody had sold. Against what arrived
   it is 45.043. A helper line passes contractQty 0: its weight counts only through its lots. */
export const toShip = ({ contractQty = 0, receivedQty = 0, shippedQty = 0, shipmentStatus = '' } = {}) => {
    const contract = Number(contractQty) || 0;
    const received = Number(receivedQty) || 0;
    const shipped = Number(shippedQty) || 0;
    const inHand = IN_HAND.has(normalizeStatus(shipmentStatus));
    const byReceived = received > 0 && (inHand || received > contract);
    const basis = byReceived ? received : contract;
    return { basis, shipped, remaining: round3(basis - shipped), byReceived };
};

/* What nobody has shipped OR sold: of a line's weight left to ship, the part on lots with no
   buyer. A sold lot's leftover is a weight difference — 8.509 MT received, 8.205 invoiced to
   the buyer it went to — not stock to chase; the 45 MT of 52Ni on PO 191125-1 had no buyer.
   `lots` are the statement's { qnty, sold } (lotIsSold). */
export const unsoldLeft = ({ remaining = 0, lots = [] } = {}) => {
    const onUnsoldLots = (lots || []).reduce((t, l) => t + (l && !l.sold ? (Number(l.qnty) || 0) : 0), 0);
    return round3(Math.min(Math.max(0, Number(remaining) || 0), onUnsoldLots));
};

// Aggregate already-computed line roll-ups into a PO-level roll-up.
export const aggregateRollups = (rollups = []) => {
    const soldQty = rollups.reduce((t, r) => t + (Number(r?.soldQty) || 0), 0);
    const receivedQty = rollups.reduce((t, r) => t + (Number(r?.receivedQty) || 0), 0);
    const shippedQty = rollups.reduce((t, r) => t + (Number(r?.shippedQty) || 0), 0);
    return { tone: rollupTone(soldQty, receivedQty), soldQty, receivedQty, shippedQty };
};

// Final status for a line/PO. Follows the software lifecycle: the contract's shipment status
// (Pending/Shipped/In Transit/Arrived/Completed/On Hold) when it's set, otherwise an auto-derived
// status from sold + shipped quantities. Returns { key, label, isShipment } — `key` selects the
// chip colour (a shipment-status name when isShipment, else one of the fallback keys below).
// `unsold` (unsoldLeft) lets a "Completed" that still holds weight with no buyer say so, with
// `warn: true`, instead of reading as done beside it.
export const lineStatus = ({ shipmentStatus, rollup, unsold } = {}) => {
    const st = normalizeStatus(shipmentStatus);
    if (st === 'Completed' && Number(unsold) > LEFT_TOLERANCE) {
        return { key: st, label: `Completed · ${fmtQty(unsold)} MT unsold`, isShipment: true, warn: true };
    }
    if (st) return { key: st, label: st, isShipment: true };

    if (!rollup || rollup.tone === 'none' || !(Number(rollup.receivedQty) > 0.0001)) {
        return { key: 'none', label: '—', isShipment: false };
    }
    const basis = Number(rollup.receivedQty) || 0;   // contracted quantity (the basis)
    const shipped = Number(rollup.shippedQty) || 0;
    const sold = Number(rollup.soldQty) || 0;

    if (shipped >= basis - 0.0001) return { key: 'shipped', label: 'Shipped', isShipment: false };
    if (shipped > 0.0001) return { key: 'partial', label: `Shipped ${fmtQty(shipped)} / ${fmtQty(basis)} MT`, isShipment: false };
    if (sold > 0.0001) return { key: 'pending', label: 'Sold · pending shipment', isShipment: false };
    return { key: 'unsold', label: `Unsold ${fmtQty(basis)} MT`, isShipment: false };
};
