// Pure storage-aging helpers (no Firebase / React) so they can be unit-tested in
// isolation. Used by storageAging.js (#11 warehouse monitoring).

export const DAY = 86400000;

// Stock dates are stored inconsistently (string or {startDate}). Normalize to a
// date string (or null).
export const dStr = (d) => {
    if (!d) return null;
    if (typeof d === 'string') return d;
    if (typeof d === 'object') return d.startDate || d.endDate || null;
    return null;
};

// Storage start = earliest arrival (indDate of an "in" record); fall back to the
// underlying contract date. Returns a Date or null.
export const arrivalOf = (row) => {
    const recs = Array.isArray(row?.data) ? row.data : [];
    const inDates = recs
        .filter(r => r.type === 'in' || !r.type)
        .map(r => dStr(r.indDate))
        .filter(Boolean)
        .map(s => new Date(s))
        .filter(d => !isNaN(d.getTime()));
    if (inDates.length) return new Date(Math.min(...inDates.map(d => d.getTime())));
    const cd = recs.map(r => r.contractData?.date).find(Boolean);
    if (cd) { const d = new Date(cd); if (!isNaN(d.getTime())) return d; }
    return null;
};

// Whole days a cargo has been stored, relative to `now` (ms). null if no arrival.
export const daysStored = (arrival, now = Date.now()) =>
    arrival ? Math.floor((now - arrival.getTime()) / DAY) : null;

export const bucketOf = (days) => {
    if (days == null) return 'unknown';
    if (days <= 30) return '0-30';
    if (days <= 60) return '31-60';
    if (days <= 90) return '61-90';
    return '90+';
};
