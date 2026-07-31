// Single source of truth for the shipment lifecycle status shared by the Shipment page and the
// Contracts Statement, so the statement's Status column follows the same vocabulary/colors the
// user manages on the Shipment page (add a status here and both pages pick it up).

export const SHIPMENT_STATUSES = ['', 'Pending', 'Shipped', 'In Transit', 'Arrived', 'Completed', 'On Hold'];

// Old stored values are mapped to the current vocabulary on read — no data migration needed.
const LEGACY_ALIASES = { 'At Port': 'Arrived', 'Delivered': 'Completed' };
export const normalizeStatus = (s) => LEGACY_ALIASES[s] || s || '';

export const SHIPMENT_STATUS_STYLES = {
    'Pending':    { backgroundColor: 'var(--warn-bg)', border: '1px solid var(--warn-border)', color: 'var(--warn-strong)' },
    'Shipped':    { backgroundColor: 'var(--surface-header)', border: '1px solid var(--border-divider)', color: 'var(--chathams-blue)' },
    'In Transit': { backgroundColor: 'var(--surface-header)', border: '1px solid var(--border-divider)', color: 'var(--chathams-blue)' },
    'Arrived':    { backgroundColor: 'var(--violet-bg)', border: '1px solid var(--violet-border)', color: 'var(--violet-strong)' },
    'Completed':  { backgroundColor: 'var(--ok-bg)', border: '1px solid var(--ok-border)', color: 'var(--ok-strong)' },
    'On Hold':    { backgroundColor: 'var(--pink-bg)', border: '1px solid var(--pink-bg)', color: 'var(--pink-strong)' },
    // Legacy keys kept as a safety net for any raw (un-normalized) value.
    'At Port':    { backgroundColor: 'var(--violet-bg)', border: '1px solid var(--violet-border)', color: 'var(--violet-strong)' },
    'Delivered':  { backgroundColor: 'var(--ok-bg)', border: '1px solid var(--ok-border)', color: 'var(--ok-strong)' },
    '':           { backgroundColor: 'var(--surface-pill)', border: '1px solid var(--border-cell)', color: 'var(--port-gore)' },
};

// True when a real lifecycle status has been set on the contract (not the empty default).
export const hasShipmentStatus = (s) => !!normalizeStatus(s);
