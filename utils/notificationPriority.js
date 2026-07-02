// Notification priority — classification (the audit), ordering, and visual tokens.
//
// Pure (no React / Firebase) so it's the single source of truth shared by the data
// layer (persists `priority` on write), the context (sorts the stream), and the bell
// (groups + badges), and can be unit-tested in isolation — same pattern as finance.js
// and storageUtils.js.

// Visual tokens + sort rank for each level. Rank 0 sorts first (High on top).
export const PRIORITY = {
    high: { key: 'high', rank: 0, label: 'High', color: '#dc2626', bg: '#fee2e2', border: '#fca5a5' },
    medium: { key: 'medium', rank: 1, label: 'Medium', color: '#b45309', bg: '#fff3cd', border: '#ffc107' },
    low: { key: 'low', rank: 2, label: 'Low', color: '#475569', bg: '#f1f5f9', border: '#cbd5e1' },
};

// Display order: High → Medium → Low.
export const PRIORITY_ORDER = ['high', 'medium', 'low'];

// Classify a notification. An explicit `priority` field wins (so a call site can
// override); otherwise it's derived from `type`/`entityType` so existing notifications
// (written before this field existed) still slot correctly. First matching rule wins.
export const priorityOf = (n = {}) => {
    if (n.priority && PRIORITY[n.priority]) return n.priority;
    const t = String(n.type || '');
    const et = String(n.entityType || '');

    // ── High: money owed / at risk, contract readiness, overdue shipment follow-up ──
    if (/^(payment|settlement)/.test(t)) return 'high';   // payment.recorded, settlement.overdue
    if (t === 'invoice.unpaid') return 'high';            // customer invoice unpaid 3+ days after issue
    if (t === 'contract.delayed') return 'high';          // 14 days after delivery, no purchase invoice
    if (t === 'shipment.eta14') return 'high';            // 14 days after ETA — follow up

    // ── Low: created records, warehouse/storage, purely informational ──
    if (t === 'contract.created') return 'low';
    if (t.startsWith('stock') || et === 'stock') return 'low';   // aging / demurrage / storage charges
    if (t.startsWith('comment')) return 'low';
    if (t === 'activity' || t === '') return 'low';

    // ── Medium: everything else (updates, finalizations, split-pending, ETA/ETD due…) ──
    return 'medium';
};

export const priorityRank = (n) => (PRIORITY[priorityOf(n)] || PRIORITY.medium).rank;

// Sort by priority (High → Medium → Low), then newest first within each level.
export const sortByPriority = (arr = []) =>
    [...arr].sort((a, b) => priorityRank(a) - priorityRank(b) || (b.createdAtMs || 0) - (a.createdAtMs || 0));
