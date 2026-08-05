'use client';
import { useEffect, useMemo, useState, useCallback } from 'react';
import { UserAuth } from '../contexts/useAuthContext';
import { loadActivity } from '../utils/utils';
import { Selector } from './selectors/selectShad';
import { FileText, Receipt, Banknote, Package, Settings as SettingsIcon, Activity, RefreshCw, Loader2, Search } from 'lucide-react';

// Visual identity per entity type (aligns with the future #7 status-color system).
const ENTITY_META = {
    contract: { label: 'Contract', icon: FileText, color: 'var(--endeavour)', bg: 'var(--surface-header)' },
    invoice: { label: 'Invoice', icon: Receipt, color: 'var(--ok-strong)', bg: 'var(--ok-soft)' },
    expense: { label: 'Expense', icon: Banknote, color: 'var(--warn-strong)', bg: 'var(--warn-soft)' },
    stock: { label: 'Stock', icon: Package, color: 'var(--violet-text)', bg: 'var(--violet-soft)' },
    settings: { label: 'Settings', icon: SettingsIcon, color: 'var(--text-mid)', bg: 'var(--surface-muted)' },
};
const FALLBACK_META = { label: 'Activity', icon: Activity, color: 'var(--text-mid)', bg: 'var(--surface-muted)' };
const metaFor = (t) => ENTITY_META[t] || FALLBACK_META;

function relativeTime(ms) {
    if (!ms) return '';
    const diff = Date.now() - ms;
    const s = Math.floor(diff / 1000);
    if (s < 60) return 'just now';
    const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24); if (d < 7) return `${d}d ago`;
    return new Date(ms).toLocaleDateString();
}

function initials(name = '') {
    return name.toString().split(/[\s@.]+/).filter(Boolean).slice(0, 2).map(s => s[0]?.toUpperCase() || '').join('') || '?';
}

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

function dayKey(ms) {
    const d = new Date(ms || Date.now());
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

// "Today" / "Yesterday" / "Mon, 21 Jul" — the year only shows when it isn't this one.
function dayLabel(ms) {
    if (!ms) return 'Earlier';
    const d = new Date(ms);
    const today = new Date();
    const diff = Math.round((startOfDay(today) - startOfDay(d)) / 86400000);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    return d.toLocaleDateString(undefined, {
        weekday: 'short', day: 'numeric', month: 'short',
        ...(d.getFullYear() === today.getFullYear() ? {} : { year: 'numeric' }),
    });
}

/**
 * Activity timeline. Two modes:
 *   - scoped (pass entityType + entityId): per-record History, no filters.
 *   - global (pass showFilters): full feed with search + type/actor filters.
 */
const ActivityLog = ({ entityType, entityId, showFilters = false }) => {
    const { uidCollection } = UserAuth();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [q, setQ] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');
    const [actorFilter, setActorFilter] = useState('all');

    const load = useCallback(async () => {
        if (!uidCollection) return;
        setLoading(true);
        const rows = await loadActivity(uidCollection, { entityType, entityId });
        setItems(rows);
        setLoading(false);
    }, [uidCollection, entityType, entityId]);

    useEffect(() => { load(); }, [load]);

    const actors = useMemo(
        () => [...new Set(items.map(i => i.actorName).filter(Boolean))],
        [items]
    );

    // Shaped for <Selector>: it reads value[name] for the selection and
    // item[secondaryName] for the label. Fresh arrays each time, because the
    // component sorts its options in place.
    const typeOptions = useMemo(() => [
        { id: 'all', label: 'All types' },
        ...Object.entries(ENTITY_META).map(([k, v]) => ({ id: k, label: v.label })),
    ], []);
    const actorOptions = useMemo(
        () => [{ id: 'all', label: 'All users' }, ...actors.map(a => ({ id: a, label: a }))],
        [actors]
    );

    const filtered = useMemo(() => {
        if (!showFilters) return items;
        let rows = items;
        if (typeFilter !== 'all') rows = rows.filter(r => r.entityType === typeFilter);
        if (actorFilter !== 'all') rows = rows.filter(r => r.actorName === actorFilter);
        const term = q.trim().toLowerCase();
        if (term) {
            rows = rows.filter(r =>
                [r.message, r.entityLabel, r.actorName, r.action]
                    .filter(Boolean).join(' ').toLowerCase().includes(term)
            );
        }
        return rows;
    }, [items, showFilters, typeFilter, actorFilter, q]);

    // Day buckets, with runs of the identical event collapsed into one row + a ×N badge.
    // Saving a record four times in a row is one fact, not four feed entries.
    const groups = useMemo(() => {
        const out = [];
        let key = null;
        let group = null;
        filtered.forEach(r => {
            const k = dayKey(r.createdAtMs);
            if (k !== key) {
                key = k;
                group = { key: k, label: dayLabel(r.createdAtMs), rows: [] };
                out.push(group);
            }
            const prev = group.rows[group.rows.length - 1];
            const same = prev
                && prev.actorName === r.actorName
                && prev.entityType === r.entityType
                && (prev.message || '') === (r.message || '')
                && (prev.entityLabel || '') === (r.entityLabel || '');
            if (same) { prev.repeat += 1; return; }
            group.rows.push({ ...r, repeat: 1 });
        });
        return out;
    }, [filtered]);

    const pill = 'rounded-full border border-[var(--border-divider)] bg-[var(--surface-pill)] outline-none focus:border-[var(--endeavour)]';

    return (
        <div className='p-3'>
            {/* Filters (global mode only) */}
            {showFilters && (
                <div className='flex flex-wrap items-center gap-2 mb-3'>
                    <div className='flex items-center gap-1.5 px-3 py-1 flex-1 min-w-[180px]' style={{ borderRadius: 9999, border: '1px solid var(--border-divider)', background: 'var(--surface-pill)' }}>
                        <Search className='w-3.5 h-3.5' style={{ color: 'var(--regent-gray)' }} />
                        <input
                            value={q}
                            onChange={e => setQ(e.target.value)}
                            placeholder='Search activity…'
                            className='flex-1 bg-transparent outline-none'
                            style={{ fontSize: 'var(--fs-input)', color: 'var(--port-gore)' }}
                        />
                    </div>
                    {/* The app's own select, not a native <select>. A browser draws the
                        open list itself — square corners, system font, blue OS highlight —
                        and no CSS can reach it, which is why these two were the only
                        dropdowns in the app that did not look like the app. */}
                    <div className='w-32'>
                        <Selector
                            arr={typeOptions} value={{ id: typeFilter }} name='id' secondaryName='label'
                            onChange={setTypeFilter} sizeVar='var(--fs-input)' classes='!h-7'
                        />
                    </div>
                    <div className='w-32'>
                        <Selector
                            arr={actorOptions} value={{ id: actorFilter }} name='id' secondaryName='label'
                            onChange={setActorFilter} sizeVar='var(--fs-input)' classes='!h-7'
                        />
                    </div>
                    <button onClick={load} aria-label='Refresh activity' className={`${pill} flex items-center gap-1 px-2.5 py-1 hover:border-[var(--endeavour)]`} style={{ fontSize: 'var(--fs-input)', color: 'var(--chathams-blue)' }}>
                        <RefreshCw className='w-3 h-3' /> Refresh
                    </button>
                    {!loading && items.length > 0 && (
                        <span className='ml-auto pr-1' style={{ fontSize: 'var(--fs-table)', color: 'var(--regent-gray)' }}>
                            {filtered.length === items.length
                                ? `${items.length} ${items.length === 1 ? 'entry' : 'entries'}`
                                : `${filtered.length} of ${items.length}`}
                        </span>
                    )}
                </div>
            )}

            {/* States */}
            {loading ? (
                <div className='flex items-center justify-center gap-2 py-8'>
                    <Loader2 className='w-4 h-4 animate-spin' style={{ color: 'var(--endeavour)' }} />
                    <span style={{ fontSize: 'var(--fs-input)', color: 'var(--chathams-blue)' }}>Loading activity…</span>
                </div>
            ) : filtered.length === 0 ? (
                <div className='flex flex-col items-center justify-center py-8 gap-1'>
                    <Activity className='w-5 h-5' style={{ color: 'var(--border-divider)' }} />
                    <span style={{ fontSize: 'var(--fs-input)', color: 'var(--regent-gray)' }}>
                        {items.length === 0 ? 'No activity recorded yet.' : 'No activity matches your filters.'}
                    </span>
                </div>
            ) : (
                // Scoped mode sits inside a modal, so it keeps its own scrollbox. The full-page
                // feed scrolls with the page instead — an inner 60vh box left the card floating
                // in dead space with a second scrollbar.
                <div className={showFilters ? '' : 'max-h-[60vh] overflow-y-auto pr-1'}>
                    {groups.map(group => (
                        <section key={group.key} className='mb-3 last:mb-0'>
                            <div className='flex items-center gap-2 mb-1.5'>
                                <span className='font-medium tracking-wide uppercase' style={{ fontSize: 'var(--fs-table)', color: 'var(--regent-gray)' }}>
                                    {group.label}
                                </span>
                                <span className='flex-1 h-px' style={{ background: 'var(--selago)' }} />
                            </div>
                            <ul className='flex flex-col gap-1.5'>
                                {group.rows.map(r => {
                                    const meta = metaFor(r.entityType);
                                    const Icon = meta.icon;
                                    return (
                                        <li
                                            key={r.id}
                                            className='flex items-start gap-2.5 px-2.5 py-2 rounded-2xl border border-[var(--selago)] bg-[var(--surface-card)] transition-colors hover:border-[var(--border-divider)] hover:bg-[var(--surface-pill)]'
                                        >
                                            <span className='inline-flex items-center justify-center rounded-full flex-shrink-0' style={{ width: 26, height: 26, background: meta.bg }}>
                                                <Icon className='w-3.5 h-3.5' style={{ color: meta.color }} />
                                            </span>
                                            {/* One line on wide screens — metadata right-aligned so the row
                                                uses the full width instead of wrapping under the message. */}
                                            <div className='min-w-0 flex-1 flex flex-col sm:flex-row sm:items-center sm:justify-between sm:gap-3'>
                                                <p className='break-words min-w-0 flex items-center gap-1.5' style={{ fontSize: 'var(--fs-input)', color: 'var(--port-gore)' }}>
                                                    <span className='min-w-0'>{r.message || `${meta.label} ${r.action || 'updated'}`}</span>
                                                    {r.repeat > 1 && (
                                                        <span
                                                            className='flex-shrink-0 px-1.5 rounded-full font-medium'
                                                            title={`${r.repeat} identical entries`}
                                                            style={{ fontSize: 'var(--fs-table)', background: meta.bg, color: meta.color }}
                                                        >
                                                            ×{r.repeat}
                                                        </span>
                                                    )}
                                                </p>
                                                <div className='flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5 sm:mt-0 sm:flex-shrink-0 sm:justify-end' style={{ fontSize: 'var(--fs-table)', color: 'var(--regent-gray)' }}>
                                                    {r.entityLabel && (
                                                        <span className='px-1.5 py-0.5 rounded-full' style={{ background: meta.bg, color: meta.color }}>
                                                            {r.entityLabel}
                                                        </span>
                                                    )}
                                                    <span className='inline-flex items-center gap-1'>
                                                        <span className='inline-flex items-center justify-center rounded-full text-white' style={{ width: 14, height: 14, fontSize: 'var(--fs-caption)', background: meta.color }}>
                                                            {initials(r.actorName)}
                                                        </span>
                                                        {r.actorName || 'Unknown'}
                                                    </span>
                                                    <span>·</span>
                                                    <span className='sm:w-16 sm:text-right' title={r.createdAt}>{relativeTime(r.createdAtMs)}</span>
                                                </div>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        </section>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ActivityLog;
