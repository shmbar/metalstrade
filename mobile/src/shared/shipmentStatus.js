// Single source of truth for the shipment lifecycle status shared by the Shipment page and the
// Contracts Statement, so the statement's Status column follows the same vocabulary/colors the
// user manages on the Shipment page (add a status here and both pages pick it up).

export const SHIPMENT_STATUSES = ['', 'Pending', 'Shipped', 'In Transit', 'Arrived', 'Completed', 'On Hold'];

// Old stored values are mapped to the current vocabulary on read — no data migration needed.
const LEGACY_ALIASES = { 'At Port': 'Arrived', 'Delivered': 'Completed' };
export const normalizeStatus = (s) => LEGACY_ALIASES[s] || s || '';

export const SHIPMENT_STATUS_STYLES = {
    'Pending':    { backgroundColor: '#efeadd', border: '1px solid #d9cfb4', color: '#75612f' },
    'Shipped':    { backgroundColor: '#eeebfc', border: '1px solid #d6cff7', color: '#5a49cb' },
    'In Transit': { backgroundColor: '#f4f3f9', border: '1px solid #eae8f2', color: '#1e1b39' },
    'Arrived':    { backgroundColor: '#eeebfc', border: '1px solid #d6cff7', color: '#5a49cb' },
    'Completed':  { backgroundColor: '#e6efe9', border: '1px solid #c6dace', color: '#2e6a4f' },
    /* Was --bad-bg with --pink-strong TEXT: a rose foreground on a red background,
       the one place two different status families were mixed inside one chip.
       "On Hold" is a pause, not a failure, and statusTone() already classifies it
       amber — so it takes the warn family and the two vocabularies now agree. */
    'On Hold':    { backgroundColor: '#efeadd', border: '1px solid #d9cfb4', color: '#75612f' },
    // Legacy keys kept as a safety net for any raw (un-normalized) value.
    'At Port':    { backgroundColor: '#eeebfc', border: '1px solid #d6cff7', color: '#5a49cb' },
    'Delivered':  { backgroundColor: '#e6efe9', border: '1px solid #c6dace', color: '#2e6a4f' },
    '':           { backgroundColor: '#f4f3f9', border: '1px solid #dad6e8', color: '#1e1b39' },
};

// True when a real lifecycle status has been set on the contract (not the empty default).
export const hasShipmentStatus = (s) => !!normalizeStatus(s);
