'use client';
import { useContext, useEffect, useMemo, useRef } from 'react';
import { UserAuth } from '../../../contexts/useAuthContext';
import { SettingsContext } from '../../../contexts/useSettingsContext';
import { ensureNotification } from '../../../utils/utils';
import { arrivalOf, daysStored, bucketOf } from './agingUtils';
import { Warehouse, AlertTriangle, Clock, PackageCheck } from 'lucide-react';

// Aging thresholds (days). Constants for now — surfacing these in Settings is a
// follow-up (#11 "configurable thresholds").
const STALE_DAYS = 60;       // flag as sitting too long
const DEMURRAGE_DAYS = 90;   // warn about possible storage / demurrage charges

const fmtQty = (n) => new Intl.NumberFormat('en-US', { minimumFractionDigits: 3 }).format(Number(n) || 0);

const StorageAging = ({ data = [] }) => {
    const { settings } = useContext(SettingsContext);
    const { uidCollection } = UserAuth();
    const notifiedRef = useRef(false);

    const stockName = (id) => settings?.Stocks?.Stocks?.find(s => s.id === id)?.nname || id || '—';
    const today = Date.now();

    // Per-row age + terminal grouping (only in-stock cargo, which `data` already is).
    const { byTerminal, staleRows, staleTerminals } = useMemo(() => {
        const rows = (data || []).map(r => {
            const arrival = arrivalOf(r);
            const days = daysStored(arrival, today);
            return { ...r, _arrival: arrival, _days: days, _bucket: bucketOf(days) };
        });

        const groups = {};
        rows.forEach(r => {
            const key = r.stock || '—';
            if (!groups[key]) {
                groups[key] = { terminal: key, name: stockName(r.stock), count: 0, qty: 0, oldest: 0, buckets: { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0, unknown: 0 } };
            }
            const g = groups[key];
            g.count += 1;
            g.qty += parseFloat(r.qnty) || 0;
            g.buckets[r._bucket] += 1;
            if (r._days != null && r._days > g.oldest) g.oldest = r._days;
        });

        const stale = rows
            .filter(r => r._days != null && r._days >= STALE_DAYS)
            .sort((a, b) => (b._days || 0) - (a._days || 0));

        // Aggregate stale cargo per terminal for the monthly digest notification
        // (count, how many at demurrage risk, oldest) — one nudge per terminal.
        const staleGroups = {};
        stale.forEach(r => {
            const key = r.stock || '—';
            if (!staleGroups[key]) staleGroups[key] = { terminal: key, name: stockName(r.stock), count: 0, demurrage: 0, oldest: 0 };
            const g = staleGroups[key];
            g.count += 1;
            if (r._days >= DEMURRAGE_DAYS) g.demurrage += 1;
            if (r._days > g.oldest) g.oldest = r._days;
        });

        return {
            byTerminal: Object.values(groups).sort((a, b) => b.oldest - a.oldest),
            staleRows: stale,
            staleTerminals: Object.values(staleGroups),
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data, settings]);

    // One idempotent monthly DIGEST per terminal (not per item) — collapses many
    // aged items into a single actionable nudge: total aged, how many at demurrage
    // risk, and the oldest. Monthly id = a fresh digest each month it keeps sitting.
    // Full per-item detail lives in the panel below + the Stocks page.
    useEffect(() => {
        if (!uidCollection || notifiedRef.current || !staleTerminals.length) return;
        notifiedRef.current = true;
        const ym = new Date().toISOString().slice(0, 7).replace('-', ''); // YYYYMM
        staleTerminals.forEach(t => {
            const hasDemurrage = t.demurrage > 0;
            ensureNotification(uidCollection, `stale:terminal:${t.terminal}:${ym}`, {
                type: 'stock.stale', entityType: 'stock', entityId: t.terminal || '',
                entityLabel: t.name,
                action: 'aging', severity: hasDemurrage ? 'warning' : 'info',
                message: `${t.name}: ${t.count} cargo item${t.count !== 1 ? 's' : ''} aged ${STALE_DAYS}+ days`
                    + (hasDemurrage ? ` — ${t.demurrage} at demurrage risk (${DEMURRAGE_DAYS}+d)` : '')
                    + ` · oldest ${t.oldest}d`,
            });
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [staleTerminals, uidCollection]);

    if (!data?.length) return null;

    const bucketColor = { '0-30': '#16a34a', '31-60': '#0366ae', '61-90': '#d97706', '90+': '#dc2626' };

    return (
        <div className='w-full mt-6'>
            <div className='flex items-center gap-2 mb-2'>
                <Warehouse className='w-4 h-4' style={{ color: 'var(--chathams-blue)' }} />
                <h3 className='responsiveTextTitle font-medium text-[var(--chathams-blue)]'>Storage Aging by Terminal</h3>
                {staleRows.length > 0 && (
                    <span className='flex items-center gap-1 px-2 py-0.5 rounded-full' style={{ fontSize: '0.6rem', background: '#fee2e2', color: '#991b1b' }}>
                        <AlertTriangle className='w-3 h-3' /> {staleRows.length} sitting {STALE_DAYS}d+
                    </span>
                )}
            </div>

            {/* Per-terminal summary */}
            <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3'>
                {byTerminal.map((g) => {
                    const danger = g.oldest >= DEMURRAGE_DAYS;
                    const warn = g.oldest >= STALE_DAYS;
                    return (
                        <div key={g.terminal} className='rounded-2xl border p-3' style={{ borderColor: danger ? '#fca5a5' : warn ? '#fde68a' : '#b8ddf8', background: 'white' }}>
                            <div className='flex items-center justify-between mb-1.5'>
                                <span className='font-medium responsiveText text-[var(--chathams-blue)] truncate'>{g.name}</span>
                                <span className='flex items-center gap-1' style={{ fontSize: '0.6rem', color: danger ? '#dc2626' : warn ? '#d97706' : 'var(--regent-gray)' }}>
                                    <Clock className='w-3 h-3' /> oldest {g.oldest}d
                                </span>
                            </div>
                            <div className='flex items-center gap-3 mb-2' style={{ fontSize: '0.62rem', color: 'var(--port-gore)' }}>
                                <span className='flex items-center gap-1'><PackageCheck className='w-3 h-3' style={{ color: 'var(--endeavour)' }} /> {g.count} item(s)</span>
                                <span>{fmtQty(g.qty)} qty</span>
                            </div>
                            {/* Age bucket bar */}
                            <div className='flex w-full h-2 rounded-full overflow-hidden' style={{ background: '#eef5fc' }}>
                                {['0-30', '31-60', '61-90', '90+'].map(b => {
                                    const pct = g.count ? (g.buckets[b] / g.count) * 100 : 0;
                                    return pct > 0 ? <div key={b} style={{ width: `${pct}%`, background: bucketColor[b] }} title={`${b}d: ${g.buckets[b]}`} /> : null;
                                })}
                            </div>
                            <div className='flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5' style={{ fontSize: '0.55rem', color: 'var(--regent-gray)' }}>
                                {['0-30', '31-60', '61-90', '90+'].map(b => g.buckets[b] > 0 && (
                                    <span key={b} className='flex items-center gap-1'>
                                        <span className='inline-block w-2 h-2 rounded-full' style={{ background: bucketColor[b] }} /> {b}d: {g.buckets[b]}
                                    </span>
                                ))}
                                {g.buckets.unknown > 0 && <span>no date: {g.buckets.unknown}</span>}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Stale cargo list */}
            {staleRows.length > 0 && (
                <div className='mt-3 rounded-2xl border border-[#fde68a] bg-[#fffbeb] p-3'>
                    <p className='font-medium mb-1.5' style={{ fontSize: '0.68rem', color: '#92400e' }}>
                        Cargo sitting {STALE_DAYS}+ days without movement
                    </p>
                    <div className='flex flex-col gap-1 max-h-56 overflow-y-auto'>
                        {staleRows.slice(0, 100).map(r => (
                            <div key={r.id} className='flex items-center justify-between gap-2 px-2 py-1 rounded-lg bg-white border border-[#fde68a]'>
                                <span className='truncate' style={{ fontSize: '0.62rem', color: 'var(--port-gore)' }}>
                                    {r.descriptionName || 'Cargo'} · {stockName(r.stock)} · {fmtQty(r.qnty)}
                                </span>
                                <span className='flex-shrink-0 px-2 py-0.5 rounded-full' style={{ fontSize: '0.55rem', background: r._days >= DEMURRAGE_DAYS ? '#fee2e2' : '#fef3c7', color: r._days >= DEMURRAGE_DAYS ? '#991b1b' : '#92400e' }}>
                                    {r._days}d{r._days >= DEMURRAGE_DAYS ? ' · demurrage risk' : ''}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default StorageAging;
