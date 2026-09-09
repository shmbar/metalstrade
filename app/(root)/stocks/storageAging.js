'use client';
import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { NumericFormat } from 'react-number-format';
import { UserAuth } from '../../../contexts/useAuthContext';
import { SettingsContext } from '../../../contexts/useSettingsContext';
import { ensureNotification } from '../../../utils/utils';
import { arrivalOf, daysStored, bucketOf, formatDuration } from './agingUtils';
import { Warehouse, AlertTriangle, Clock, PackageCheck, ChevronRight } from 'lucide-react';
import { TONES } from '../../../components/statusUtils';
import SortIcon from '../../../components/table/SortIcon';
import Tltip from '../../../components/tlTip';
import BtnIcon from '../../../components/buttonIcons';

/* Same Σ control as the cashflow tables — tick a lot to add it to a running total.
   Copied in shape, not imported, because the cashflow one is a module-private
   helper inside funcs.js. */
const SumToggle = ({ active, onToggle }) => (
    <Tltip direction='right' tltpText={active ? 'Remove from sum' : 'Add to running sum'}>
        <button type="button" onClick={onToggle}
            className={`inline-flex items-center justify-center w-4 h-4 rounded border align-middle transition-colors ${active
                ? 'bg-[var(--brand)] border-[var(--brand)] text-[var(--on-brand)]'
                : 'bg-[var(--bg-card)] border-[var(--brand-border)] text-[var(--brand)] hover:bg-[var(--brand-soft)]'}`}>
            <BtnIcon action={active ? 'confirm' : 'add'} strokeWidth={2.5} />
        </button>
    </Tltip>
);

// How old a lot must be to count as "stale" for the card's headline figure.
const AGE_FILTERS = [
    { key: 'all', label: 'All' },
    { key: '60', label: '60d+' },
    { key: '90', label: '90d+' },
];

// Aging thresholds (days). Constants for now — surfacing these in Settings is a
// follow-up (#11 "configurable thresholds").
const STALE_DAYS = 60;       // flag as sitting too long
const LONG_STAY_DAYS = 90;   // second tier: sitting long enough to want an answer

const fmtQty = (n) => new Intl.NumberFormat('en-US', { minimumFractionDigits: 3 }).format(Number(n) || 0);

const StorageAging = ({ data = [] }) => {
    const { settings } = useContext(SettingsContext);
    const { uidCollection } = UserAuth();
    const notifiedRef = useRef(false);

    const stockName = (id) => settings?.Stocks?.Stocks?.find(s => s.id === id)?.nname || id || '—';
    const supName = (id) => settings?.Supplier?.Supplier?.find(s => s.id === id)?.nname || '—';
    const today = Date.now();

    // Which terminal cards are open, and which lots are ticked into the running sum.
    const [openTerminals, setOpenTerminals] = useState({});
    const [sumSel, setSumSel] = useState({});
    const [ageFilter, setAgeFilter] = useState('all');
    /* Supplier A→Z by default. Oldest-first sounds like the obvious order, but the
       list is worked through by chasing whoever the material sits with, so grouping
       a supplier's lots together beats scattering them among everyone else's. Days
       is still one click away in the header. */
    const [listSort, setListSort] = useState({ key: '_supplier', dir: 'asc' });

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
                groups[key] = {
                    terminal: key, name: stockName(r.stock), count: 0, qty: 0, oldest: 0,
                    staleQty: 0, staleCount: 0, lots: [],
                    buckets: { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0, unknown: 0 },
                };
            }
            const g = groups[key];
            const qty = parseFloat(r.qnty) || 0;
            g.count += 1;
            g.qty += qty;
            g.buckets[r._bucket] += 1;
            g.lots.push(r);
            if (r._days != null && r._days >= STALE_DAYS) { g.staleQty += qty; g.staleCount += 1; }
            if (r._days != null && r._days > g.oldest) g.oldest = r._days;
        });
        // Oldest lot first inside each card — the reason you opened it.
        Object.values(groups).forEach(g => g.lots.sort((a, b) => (b._days ?? -1) - (a._days ?? -1)));

        const stale = rows
            .filter(r => r._days != null && r._days >= STALE_DAYS)
            .sort((a, b) => (b._days || 0) - (a._days || 0));

        // Aggregate stale cargo per terminal for the monthly digest notification
        // (count, how many in the long-stay tier, oldest) — one nudge per terminal.
        const staleGroups = {};
        stale.forEach(r => {
            const key = r.stock || '—';
            if (!staleGroups[key]) staleGroups[key] = { terminal: key, name: stockName(r.stock), count: 0, longStay: 0, oldest: 0 };
            const g = staleGroups[key];
            g.count += 1;
            if (r._days >= LONG_STAY_DAYS) g.longStay += 1;
            if (r._days > g.oldest) g.oldest = r._days;
        });

        return {
            /* Sorted by stale TONNAGE, not by oldest day. Oldest-first put a
               single 0.26 MT drum above 42 aged Seagull lots, so the card that
               needed acting on was never the one at the top. */
            byTerminal: Object.values(groups).sort((a, b) => b.staleQty - a.staleQty || b.oldest - a.oldest),
            staleRows: stale,
            staleTerminals: Object.values(staleGroups),
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data, settings]);

    // One idempotent monthly DIGEST per terminal (not per item) — collapses many
    // aged items into a single actionable nudge: total aged, how many in the long-stay
    // tier, and the oldest. Monthly id = a fresh digest each month it keeps sitting.
    // Full per-item detail lives in the panel below + the Stocks page.
    useEffect(() => {
        if (!uidCollection || notifiedRef.current || !staleTerminals.length) return;
        notifiedRef.current = true;
        const ym = new Date().toISOString().slice(0, 7).replace('-', ''); // YYYYMM
        staleTerminals.forEach(t => {
            const hasLongStay = t.longStay > 0;
            ensureNotification(uidCollection, `stale:terminal:${t.terminal}:${ym}`, {
                type: 'stock.stale', entityType: 'stock', entityId: t.terminal || '',
                entityLabel: t.name,
                action: 'aging', severity: hasLongStay ? 'warning' : 'info',
                message: `${t.name}: ${t.count} cargo item${t.count !== 1 ? 's' : ''} aged ${STALE_DAYS}+ days`
                    + (hasLongStay ? ` — ${t.longStay} over ${LONG_STAY_DAYS} days` : '')
                    + ` · oldest ${formatDuration(t.oldest)}`,
            });
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [staleTerminals, uidCollection]);

    if (!data?.length) return null;

    const bucketColor = { '0-30': 'var(--ok-text)', '31-60': 'var(--brand)', '61-90': 'var(--warn-text)', '90+': 'var(--bad-text)' };

    const minDays = ageFilter === 'all' ? null : Number(ageFilter);
    const passesAge = (r) => minDays == null || (r._days != null && r._days >= minDays);
    // Cards with nothing left after the filter drop out — the point of filtering to
    // 90d+ is to be left holding only what needs acting on.
    const shownTerminals = byTerminal
        .map(g => {
            const shownLots = g.lots.filter(passesAge);
            // Bar and legend have to describe what is on screen. Left on the full
            // set they claimed "0-30d: 2" on a card filtered to 90d+ and listing
            // none of them.
            const buckets = { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0, unknown: 0 };
            shownLots.forEach(r => { buckets[r._bucket] += 1; });
            return { ...g, shownLots, buckets, shownQty: shownLots.reduce((s, r) => s + (parseFloat(r.qnty) || 0), 0) };
        })
        .filter(g => g.shownLots.length > 0);

    const toggleSum = (id) => setSumSel(prev => {
        const next = { ...prev };
        if (next[id]) delete next[id]; else next[id] = true;
        return next;
    });

    // Running total of every ticked lot, across all terminals.
    const selected = byTerminal.flatMap(g => g.lots).filter(r => sumSel[r.id]);
    const selQty = selected.reduce((s, r) => s + (parseFloat(r.qnty) || 0), 0);
    const selValue = selected.reduce((s, r) => s + (r.total === '-' ? 0 : parseFloat(r.total) || 0), 0);

    /* The stale-cargo table follows the same age filter as the cards, falling back
       to the 60-day definition of "stale" when the filter is off. No 100-row cut:
       it scrolls, and a silent truncation on a list about money is a trap. */
    const listThreshold = minDays ?? STALE_DAYS;
    const sortBy = (key) => setListSort(prev =>
        prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' });
    // Plain computation, not useMemo: this sits after the `!data.length` early
    // return, and a hook below a conditional return is a rules-of-hooks break.
    const listRows = (() => {
        const rows = staleRows
            .filter(r => r._days != null && r._days >= listThreshold)
            .map(r => ({ ...r, _supplier: supName(r.supplier), _stockName: stockName(r.stock) }));
        const { key, dir } = listSort;
        const sign = dir === 'asc' ? 1 : -1;
        return rows.sort((a, b) => {
            const x = a[key], y = b[key];
            const nx = typeof x === 'number' ? x : parseFloat(x);
            const ny = typeof y === 'number' ? y : parseFloat(y);
            const primary = Number.isFinite(nx) && Number.isFinite(ny)
                ? (nx - ny) * sign
                : String(x ?? '').localeCompare(String(y ?? '')) * sign;
            // Within one supplier the oldest still comes first, so grouping by who
            // holds the material does not scramble the ages inside each group.
            return primary || (b._days || 0) - (a._days || 0);
        });
    })();
    const listQty = listRows.reduce((s, r) => s + (parseFloat(r.qnty) || 0), 0);
    const listValue = listRows.reduce((s, r) => s + (r.total === '-' ? 0 : parseFloat(r.total) || 0), 0);

    return (
        <div className='w-full mt-6'>
            <div className='flex items-center gap-2 mb-2'>
                <Warehouse className='w-4 h-4' style={{ color: 'var(--ink)' }} />
                <h3 className='responsiveTextTitle font-medium text-[var(--ink)]'>Storage Aging by Terminal</h3>
                {staleRows.length > 0 && (
                    <span className='flex items-center gap-1 px-2 py-0.5 rounded-lg' style={{ fontSize: 'var(--fs-table)', background: TONES.red.bg, color: TONES.red.text, border: `1px solid ${TONES.red.border}` }}>
                        <AlertTriangle className='w-3 h-3' /> {staleRows.length} sitting {STALE_DAYS}d+
                    </span>
                )}
                {/* Age filter — narrows the cards AND what each one lists. */}
                <div className='flex items-center bg-[var(--bg-subtle)] border border-[var(--line)] rounded-lg p-0.5 ml-auto'>
                    {AGE_FILTERS.map(f => (
                        <button key={f.key} type='button' onClick={() => setAgeFilter(f.key)}
                            className={`rounded-lg transition-colors ${ageFilter === f.key
                                ? 'bg-[var(--bg-card)] text-[var(--ink)] font-medium shadow-card'
                                : 'text-[var(--ink-secondary)]'}`}
                            style={{ fontSize: 'var(--fs-table)', padding: '3px 10px' }}>
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Running sum of the ticked lots — the cashflow basket, for cargo. */}
            {selected.length > 0 && (
                <div className='flex flex-wrap items-center gap-x-4 gap-y-1 mb-2 px-3 py-1.5 rounded-lg border'
                    style={{ borderColor: 'var(--brand-border)', background: 'var(--brand-soft)', fontSize: 'var(--fs-table)' }}>
                    <span className='font-medium' style={{ color: 'var(--brand)' }}>&#931; {selected.length} lot(s) selected</span>
                    <span style={{ color: 'var(--ink)' }}>{fmtQty(selQty)} qty</span>
                    <span style={{ color: 'var(--ink)' }}>
                        <NumericFormat value={selValue} displayType='text' thousandSeparator prefix='$' decimalScale={2} fixedDecimalScale />
                    </span>
                    <button type='button' onClick={() => setSumSel({})}
                        className='ml-auto' style={{ color: 'var(--ink-muted)', fontSize: 'var(--fs-caption)' }}>
                        Clear
                    </button>
                </div>
            )}

            {/* Per-terminal summary */}
            <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3'>
                {shownTerminals.map((g) => {
                    const danger = g.oldest >= LONG_STAY_DAYS;
                    const warn = g.oldest >= STALE_DAYS;
                    const isOpen = !!openTerminals[g.terminal];
                    return (
                        <div key={g.terminal} className='rounded-2xl border p-3 shadow-card' style={{ borderColor: danger ? TONES.red.border : warn ? TONES.amber.border : 'var(--line)', background: "var(--bg-card)" }}>
                            <div className='flex items-center justify-between mb-1.5 cursor-pointer'
                                onClick={() => setOpenTerminals(prev => ({ ...prev, [g.terminal]: !prev[g.terminal] }))}>
                                <span className='font-medium responsiveText text-[var(--ink)] truncate flex items-center gap-1'>
                                    <ChevronRight className='w-3 h-3 shrink-0 transition-transform'
                                        style={{ transform: isOpen ? 'rotate(90deg)' : 'none', color: 'var(--endeavour)' }} />
                                    {g.name}
                                </span>
                                <span className='flex items-center gap-1' style={{ fontSize: 'var(--fs-table)', color: danger ? TONES.red.text : warn ? TONES.amber.text : 'var(--ink-muted)' }}>
                                    <Clock className='w-3 h-3' /> <span title={`${g.oldest} days`}>oldest {formatDuration(g.oldest)}</span>
                                </span>
                            </div>
                            <div className='flex flex-wrap items-center gap-x-3 gap-y-0.5 mb-2' style={{ fontSize: 'var(--fs-table)', color: 'var(--ink)' }}>
                                <span className='flex items-center gap-1'><PackageCheck className='w-3 h-3' style={{ color: 'var(--brand)' }} /> {g.shownLots.length} item(s)</span>
                                <span>{fmtQty(g.shownQty)} qty</span>
                                {/* The figure the card is really about: how much of that tonnage is aged. */}
                                {minDays == null && g.staleQty > 0 && (
                                    <span style={{ color: TONES.amber.text }}>{fmtQty(g.staleQty)} aged {STALE_DAYS}d+</span>
                                )}
                            </div>
                            {/* Age bucket bar */}
                            <div className='flex w-full h-2 rounded-full overflow-hidden' style={{ background: 'var(--bg-sunken)' }}>
                                {['0-30', '31-60', '61-90', '90+'].map(b => {
                                    const pct = g.shownLots.length ? (g.buckets[b] / g.shownLots.length) * 100 : 0;
                                    return pct > 0 ? <div key={b} style={{ width: `${pct}%`, background: bucketColor[b] }} title={`${b}d: ${g.buckets[b]}`} /> : null;
                                })}
                            </div>
                            <div className='flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5' style={{ fontSize: 'var(--fs-caption)', color: 'var(--ink-muted)' }}>
                                {['0-30', '31-60', '61-90', '90+'].map(b => g.buckets[b] > 0 && (
                                    <span key={b} className='flex items-center gap-1'>
                                        <span className='inline-block w-2 h-2 rounded-full' style={{ background: bucketColor[b] }} /> {b}d: {g.buckets[b]}
                                    </span>
                                ))}
                                {g.buckets.unknown > 0 && <span>no date: {g.buckets.unknown}</span>}
                            </div>

                            {/* The lots behind the figure — the section had no way to see
                                them, so the card asserted a tonnage you had to go to the
                                main table to verify. Tick any of them into the sum above. */}
                            {isOpen && (
                                <div className='mt-2 -mx-1 overflow-x-auto' style={{ maxHeight: '15rem', overflowY: 'auto' }}>
                                    <table className='detail-popup-table'>
                                        <thead>
                                            <tr>
                                                <th style={{ width: '1%' }}>&#931;</th>
                                                <th>PO#</th>
                                                <th>Supplier</th>
                                                <th>Description</th>
                                                <th>Qty</th>
                                                <th>Days</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {g.shownLots.map(r => (
                                                <tr key={r.id}>
                                                    <td style={{ width: '1%' }}>
                                                        <SumToggle active={!!sumSel[r.id]} onToggle={() => toggleSum(r.id)} />
                                                    </td>
                                                    <td>{r.order || '—'}</td>
                                                    <td>{supName(r.supplier)}</td>
                                                    <td style={{ textAlign: 'left' }}>
                                                        <span className='block truncate' style={{ maxWidth: '180px' }} title={r.descriptionName || ''}>
                                                            {r.descriptionName || '—'}
                                                        </span>
                                                    </td>
                                                    <td>{fmtQty(r.qnty)}</td>
                                                    <td>
                                                        <span className='px-1.5 py-0.5 rounded-lg' style={{
                                                            fontSize: 'var(--fs-caption)',
                                                            background: r._days == null ? 'var(--bg-subtle)' : r._days >= LONG_STAY_DAYS ? TONES.red.bg : r._days >= STALE_DAYS ? TONES.amber.bg : TONES.green.bg,
                                                            color: r._days == null ? 'var(--ink-muted)' : r._days >= LONG_STAY_DAYS ? TONES.red.text : r._days >= STALE_DAYS ? TONES.amber.text : TONES.green.text,
                                                        }}>
                                                            {r._days == null ? 'no date' : formatDuration(r._days)}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Stale cargo, across every terminal.

                This was a list of divs with the description, warehouse and quantity
                run together in one text line and a day chip on the right: nothing to
                sort by, no PO# or supplier to act on, no value, no Σ, and a silent
                cut at 100 rows. The cards answer "which terminal"; this answers
                "what is oldest anywhere", so it earns its place — as a table. */}
            {listRows.length > 0 && (
                <div className='mt-3 rounded-2xl border overflow-hidden' style={{ borderColor: 'var(--line)', background: 'var(--bg-card)' }}>
                    <div className='flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2' style={{ background: TONES.amber.bg, borderBottom: `1px solid ${TONES.amber.border}` }}>
                        <span className='font-medium' style={{ fontSize: 'var(--fs-body)', color: TONES.amber.text }}>
                            Cargo sitting {listThreshold}+ days without movement
                        </span>
                        {/* The headline the old panel never gave: how much, and worth what. */}
                        <span style={{ fontSize: 'var(--fs-table)', color: TONES.amber.text }}>
                            {listRows.length} lot(s) · {fmtQty(listQty)} qty ·{' '}
                            <NumericFormat value={listValue} displayType='text' thousandSeparator prefix='$' decimalScale={2} fixedDecimalScale />
                        </span>
                    </div>
                    <div className='overflow-x-auto' style={{ maxHeight: '22rem', overflowY: 'auto' }}>
                        <table className='detail-popup-table'>
                            <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                                <tr>
                                    <th style={{ width: '1%' }}>&#931;</th>
                                    {[
                                        ['order', 'PO#'], ['_supplier', 'Supplier'], ['descriptionName', 'Description'],
                                        ['_stockName', 'Warehouse'], ['qnty', 'Qty'], ['total', 'Value'], ['_days', 'Days'],
                                    ].map(([k, label]) => (
                                        <th key={k} onClick={() => sortBy(k)} className='cursor-pointer select-none'>
                                            <span className='inline-flex items-center gap-1'>
                                                {label}
                                                <SortIcon direction={listSort.key === k ? listSort.dir : false} inline />
                                            </span>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {listRows.map(r => (
                                    <tr key={r.id}>
                                        <td style={{ width: '1%' }}>
                                            <SumToggle active={!!sumSel[r.id]} onToggle={() => toggleSum(r.id)} />
                                        </td>
                                        <td>{r.order || '—'}</td>
                                        <td>{r._supplier}</td>
                                        <td style={{ textAlign: 'left' }}>
                                            <span className='block truncate' style={{ maxWidth: '260px' }} title={r.descriptionName || ''}>
                                                {r.descriptionName || '—'}
                                            </span>
                                        </td>
                                        <td>{r._stockName}</td>
                                        <td>{fmtQty(r.qnty)}</td>
                                        <td>
                                            <NumericFormat value={r.total === '-' ? 0 : parseFloat(r.total) || 0} displayType='text'
                                                thousandSeparator prefix='$' decimalScale={2} fixedDecimalScale />
                                        </td>
                                        <td>
                                            <span className='px-1.5 py-0.5 rounded-lg whitespace-nowrap' style={{
                                                fontSize: 'var(--fs-caption)',
                                                background: r._days >= LONG_STAY_DAYS ? TONES.red.bg : TONES.amber.bg,
                                                color: r._days >= LONG_STAY_DAYS ? TONES.red.text : TONES.amber.text,
                                            }}>
                                                {formatDuration(r._days)}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StorageAging;
