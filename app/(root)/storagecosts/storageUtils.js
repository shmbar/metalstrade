// Pure helpers for the Storage Costs page (no React / Firebase) so the rate math can
// be unit-tested in isolation — same pattern as agingUtils / soldStatus / splitUtils.
import { lotIsSold } from '../contractsstatement/soldStatus';

// Expense-type labels that are true ongoing storage cost (demurrage = delay penalty,
// stuffing/freight = one-time handling → deliberately excluded from the per-MT rate).
export const STORAGE_LABELS = ['storage', 'warehouse'];
export const EUR_USD = 1.08;

// Per-unit multiplier applied to a monthly $/MT rate to re-express it.
export const UNIT = [
    { key: 'week', label: 'per week', factor: 1 / 4.345 },
    { key: 'month', label: 'per month', factor: 1 },
    { key: 'year', label: 'per year', factor: 12 },
];

export const toUsd = (amt, cur) => (cur === 'us' || cur === 'USD' ? amt : (Number(amt) || 0) * EUR_USD);
export const ym = (s) => (s || '').substring(0, 7); // YYYY-MM

// Arrival date string for a lot (mirrors agingUtils): indDate, else contract date.
export const arrivalStr = (lot) => {
    const d = lot?.indDate;
    if (typeof d === 'string' && d) return d;
    if (d && typeof d === 'object') return d.startDate || d.endDate || lot?.contractData?.date || '';
    return lot?.contractData?.date || '';
};

// Whether an expense is a storage/warehouse type, resolved via the settings list.
export const isStorageType = (exp, expTypes = []) => {
    const label = expTypes.find(e => e.id === exp?.expType)?.expType || '';
    return STORAGE_LABELS.includes(label.toLowerCase());
};

// MT stored in a warehouse as of a given month: unsold inbound lots that had arrived
// by month-end (exit dates aren't tracked, so current sold status is the proxy).
export const mtInWh = (lots, whId, month) => (lots || []).reduce((sum, l) => {
    if (l.stock !== whId) return sum;
    if (l.type && l.type !== 'in') return sum;
    if (lotIsSold(l)) return sum;
    const arr = ym(arrivalStr(l));
    if (month && arr && arr > month) return sum; // arrived after this month
    return sum + Math.max(0, parseFloat(l.qnty) || 0);
}, 0);

// Aggregate tagged storage expenses into per-warehouse cost, MT-months and a monthly
// $/MT rate, plus an overall (cost-weighted) rate.
export const computeStorageMetric = ({ tagged = [], lots = [], whName = () => '' }) => {
    const perWh = {}; // whId -> { cost, mtMonths, months:Set }
    tagged.forEach(e => {
        const wh = e.storageWh;
        if (!wh || !e.storageMonth) return;
        perWh[wh] ??= { cost: 0, mtMonths: 0, months: new Set() };
        perWh[wh].cost += toUsd(parseFloat(e.amount) || 0, e.cur);
        if (!perWh[wh].months.has(e.storageMonth)) {
            perWh[wh].months.add(e.storageMonth);
            perWh[wh].mtMonths += mtInWh(lots, wh, e.storageMonth);
        }
    });
    const rows = Object.entries(perWh).map(([wh, v]) => ({
        wh, name: whName(wh) || '—', cost: v.cost, mt: v.mtMonths,
        rate: v.mtMonths > 0 ? v.cost / v.mtMonths : null, // $/MT/month
    })).sort((a, b) => (b.rate || 0) - (a.rate || 0));
    const totalCost = rows.reduce((s, r) => s + r.cost, 0);
    const totalMt = rows.reduce((s, r) => s + r.mt, 0);
    const overall = totalMt > 0 ? totalCost / totalMt : null;
    return { rows, totalCost, totalMt, overall };
};
