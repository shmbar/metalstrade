// Single source of truth for the shipment lifecycle status shared by the Shipment page and the
// Contracts Statement, so the statement's Status column follows the same vocabulary/colors the
// user manages on the Shipment page (add a status here and both pages pick it up).

export const SHIPMENT_STATUSES = ['', 'Pending', 'Shipped', 'In Transit', 'Arrived', 'Completed', 'On Hold'];

// Old stored values are mapped to the current vocabulary on read — no data migration needed.
const LEGACY_ALIASES = { 'At Port': 'Arrived', 'Delivered': 'Completed' };
export const normalizeStatus = (s) => LEGACY_ALIASES[s] || s || '';

export const SHIPMENT_STATUS_STYLES = {
    'Pending':    { backgroundColor: 'var(--warn-bg)', border: '1px solid var(--warn-border)', color: 'var(--warn-text)' },
    'Shipped':    { backgroundColor: 'var(--brand-soft)', border: '1px solid var(--brand-border)', color: 'var(--brand-strong)' },
    'In Transit': { backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--line)', color: 'var(--chathams-blue)' },
    'Arrived':    { backgroundColor: 'var(--brand-soft)', border: '1px solid var(--brand-border)', color: 'var(--brand-strong)' },
    'Completed':  { backgroundColor: 'var(--ok-bg)', border: '1px solid var(--ok-border)', color: 'var(--ok-text)' },
    /* Was --bad-bg with --pink-strong TEXT: a rose foreground on a red background,
       the one place two different status families were mixed inside one chip.
       "On Hold" is a pause, not a failure, and statusTone() already classifies it
       amber — so it takes the warn family and the two vocabularies now agree. */
    'On Hold':    { backgroundColor: 'var(--warn-bg)', border: '1px solid var(--warn-border)', color: 'var(--warn-text)' },
    // Legacy keys kept as a safety net for any raw (un-normalized) value.
    'At Port':    { backgroundColor: 'var(--brand-soft)', border: '1px solid var(--brand-border)', color: 'var(--brand-strong)' },
    'Delivered':  { backgroundColor: 'var(--ok-bg)', border: '1px solid var(--ok-border)', color: 'var(--ok-text)' },
    '':           { backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--line-strong)', color: 'var(--port-gore)' },
};

// True when a real lifecycle status has been set on the contract (not the empty default).
export const hasShipmentStatus = (s) => !!normalizeStatus(s);
