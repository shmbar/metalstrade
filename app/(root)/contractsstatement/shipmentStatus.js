// Single source of truth for the shipment lifecycle status shared by the Shipment page and the
// Contracts Statement, so the statement's Status column follows the same vocabulary/colors the
// user manages on the Shipment page (add a status here and both pages pick it up).

export const SHIPMENT_STATUSES = ['', 'Pending', 'Shipped', 'In Transit', 'Arrived', 'Completed', 'On Hold'];

// Old stored values are mapped to the current vocabulary on read — no data migration needed.
const LEGACY_ALIASES = { 'At Port': 'Arrived', 'Delivered': 'Completed' };
export const normalizeStatus = (s) => LEGACY_ALIASES[s] || s || '';

export const SHIPMENT_STATUS_STYLES = {
    'Pending':    { backgroundColor: '#fef9c3', border: '1px solid #fde68a', color: '#78350f' },
    'Shipped':    { backgroundColor: '#e0f2fe', border: '1px solid #bae6fd', color: '#075985' },
    'In Transit': { backgroundColor: '#dbeeff', border: '1px solid #b8ddf8', color: 'var(--chathams-blue)' },
    'Arrived':    { backgroundColor: '#ede9fe', border: '1px solid #ddd6fe', color: '#4c1d95' },
    'Completed':  { backgroundColor: '#dcfce7', border: '1px solid #bbf7d0', color: '#14532d' },
    'On Hold':    { backgroundColor: '#fce7f3', border: '1px solid #fbcfe8', color: '#831843' },
    // Legacy keys kept as a safety net for any raw (un-normalized) value.
    'At Port':    { backgroundColor: '#ede9fe', border: '1px solid #ddd6fe', color: '#4c1d95' },
    'Delivered':  { backgroundColor: '#dcfce7', border: '1px solid #bbf7d0', color: '#14532d' },
    '':           { backgroundColor: '#f8fbff', border: '1px solid #d8e8f5', color: 'var(--port-gore)' },
};

// True when a real lifecycle status has been set on the contract (not the empty default).
export const hasShipmentStatus = (s) => !!normalizeStatus(s);
