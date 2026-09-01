'use client';
import { useEffect, useMemo, useState, useCallback } from 'react';
import { UserAuth } from '../contexts/useAuthContext';
import { loadActivity } from '../utils/utils';
import { Selector } from './selectors/selectShad';
import { FileText, Receipt, Banknote, Package, Settings as SettingsIcon, Activity, RefreshCw, Loader2, Search, LogIn } from 'lucide-react';
import { TONES } from './statusUtils';
import { NameCell } from './Avatar';

// Visual identity per entity type (aligns with the status-color system in statusUtils).
const ENTITY_META = {
    contract: { label: 'Contract', icon: FileText, color: 'var(--brand)', bg: 'var(--brand-soft)' },
    invoice: { label: 'Invoice', icon: Receipt, color: TONES.green.text, bg: TONES.green.bg },
    expense: { label: 'Expense', icon: Banknote, color: TONES.amber.text, bg: TONES.amber.bg },
    stock: { label: 'Stock', icon: Package, color: 'var(--violet-text)', bg: 'var(--violet-soft)' },
    settings: { label: 'Settings', icon: SettingsIcon, color: TONES.gray.text, bg: TONES.gray.bg },
    // Sign-in / sign-out. Blue rather than a status family: logging in is neither
    // good news nor bad, and the type filter above is built from these keys, so this
    // is also what lets someone show only the sign-ins.
    auth: { label: 'Sign-in', icon: LogIn, color: TONES.blue.text, bg: TONES.blue.bg },
};
const FALLBACK_META = { label: 'Activity', icon: Activity, color: TONES.gray.text, bg: TONES.gray.bg };
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

    // How many entries are RENDERED. The cap used to live in loadActivity's default
    // (200) — which meant the filters below searched a list that had already been
    // truncated. Filtering to one person showed only whatever they had done inside
    // the newest 200 events overall: on 2026-09-01 that turned Sergey's 120 IMS
    // entries into 12, and hid anyone whose last activity predated the cut-off.
    //
    // loadActivity reads the whole collection either way (getDocs, then sort), so
    // asking for everything costs nothing extra — the slice was pure loss. Filter
    // first, cap for rendering afterwards, and let the reader ask for more.
    const PAGE = 200;
    const [visible, setVisible] = useState(PAGE);

    const load = useCallback(async () => {
        if (!uidCollection) return;
        setLoading(true);
        const rows = await loadActivity(uidCollection, { entityType, entityId, max: Infinity });
        setItems(rows);
        setVisible(PAGE);
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

    // The render cap, applied AFTER the filters — so "show me Sergey" pages through
    // Sergey's entries, not through whatever fraction of them fell inside a global
    // cut-off. Reset whenever the filters change, or "show more" would carry over.
    const shown = useMemo(() => filtered.slice(0, visible), [filtered, visible]);
    useEffect(() => { setVisible(PAGE); }, [typeFilter, actorFilter, q]);

    // Day buckets, with runs of the identical event collapsed into one row + a ×N badge.
    // Saving a record four times in a row is one fact, not four feed entries.
    const groups = useMemo(() => {
        const out = [];
        let key = null;
        let group = null;
        shown.forEach(r => {
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
    }, [shown]);

    return (
        <div className='p-3'>
            {/* Filters (global mode only) */}
            {showFilters && (
                <div className='flex flex-wrap items-center gap-2 mb-3'>
                    {/* Shell carries the border AND the focus state, so they are classes
                        rather than an inline style — focus-within cannot be written inline.
                        Content-sized, not `flex-1`: as a flex-1 field this search box grew
                        to ~850px on a wide monitor and the three controls beside it got
                        pushed into the far corner (Zak, 2026-08-26). */}
                    <div className='flex items-center gap-1.5 h-8 px-2.5 w-64 max-w-full rounded-control border border-[var(--line-strong)] bg-[var(--bg-card)] focus-within:border-[var(--brand)] transition-colors'>
                        <Search className='w-3.5 h-3.5 shrink-0' style={{ color: 'var(--ink-muted)' }} />
                        <input
                            value={q}
                            onChange={e => setQ(e.target.value)}
                            placeholder='Search activity…'
                            /* focus-visible:outline-none, not plain outline-none: the global
                               `input:focus-visible` rule in globals.css draws a 2px brand
                               outline, and being (0,1,1) it beats the (0,1,0) utility. On a
                               bare input that ring IS the focus indicator, but this input sits
                               inside a bordered shell, so it drew a second, square outline
                               INSIDE the rounded shell — the doubled edge. The shell's
                               focus-within border above announces focus instead; same trade
                               globals.css already makes for the cmdk search box. */
                            className='flex-1 min-w-0 bg-transparent focus-visible:outline-none'
                            style={{ fontSize: 'var(--fs-input)', color: 'var(--ink)' }}
                        />
                    </div>
                    {/* The app's own select, not a native <select>. A browser draws the
                        open list itself — square corners, system font, blue OS highlight —
                        and no CSS can reach it, which is why these two were the only
                        dropdowns in the app that did not look like the app. */}
                    <div className='w-32'>
                        <Selector
                            arr={typeOptions} value={{ id: typeFilter }} name='id' secondaryName='label'
                            onChange={setTypeFilter} sizeVar='var(--fs-input)' classes='!h-8'
                        />
                    </div>
                    <div className='w-32'>
                        <Selector
                            arr={actorOptions} value={{ id: actorFilter }} name='id' secondaryName='label'
                            onChange={setActorFilter} sizeVar='var(--fs-input)' classes='!h-8'
                        />
                    </div>
                    <button
                        onClick={load}
                        aria-label='Refresh activity'
                        className='flex items-center gap-1 h-8 px-2.5 rounded-control border border-[var(--line-strong)] bg-[var(--bg-card)] text-[var(--ink-secondary)] hover:border-[var(--brand)] hover:text-[var(--brand)] transition-colors'
                        style={{ fontSize: 'var(--fs-input)' }}
                    >
                        <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /> Refresh
                    </button>
                    {!loading && items.length > 0 && (
                        <span className='ml-auto pr-1 tabular-nums' style={{ fontSize: 'var(--fs-table)', color: 'var(--ink-muted)' }}>
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
                    <Loader2 className='w-4 h-4 animate-spin' style={{ color: 'var(--brand)' }} />
                    <span style={{ fontSize: 'var(--fs-input)', color: 'var(--ink-secondary)' }}>Loading activity…</span>
                </div>
            ) : filtered.length === 0 ? (
                <div className='flex flex-col items-center justify-center py-8 gap-1'>
                    <Activity className='w-5 h-5' style={{ color: 'var(--ink-muted)' }} />
                    <span style={{ fontSize: 'var(--fs-input)', color: 'var(--ink-muted)' }}>
                        {items.length === 0 ? 'No activity recorded yet.' : 'No activity matches your filters.'}
                    </span>
                </div>
            ) : (
                // Scoped mode sits inside a modal, so it keeps its own scrollbox. The full-page
                // feed scrolls with the page instead — an inner 60vh box left the card floating
                // in dead space with a second scrollbar.
                <div className={showFilters ? '' : 'max-h-[60vh] overflow-y-auto pr-1'}>
                    {groups.map(group => (
                        <section key={group.key} className='mb-2 last:mb-0'>
                            <div className='flex items-center gap-2 mb-1'>
                                {/* Title Case, matching every other header band since
                                    2026-08-25 — this one was still shouting YESTERDAY. */}
                                <span className='font-semibold' style={{ fontSize: 'var(--fs-table)', color: 'var(--ink-secondary)' }}>
                                    {group.label}
                                </span>
                                <span className='flex-1 h-px bg-[var(--line)]' />
                            </div>
                            {/* A hairline per row, not a card per row. The message sits on the
                                left and the record/person/time columns on the right, so on a wide
                                monitor the eye has ~600px of white to cross — the rule is what
                                carries it across. A vertical timeline rail was tried first and
                                dropped: at a 32px row with a 24px dot it shows 8px of line
                                between dots, which reads as nothing. */}
                            <ul className='flex flex-col divide-y divide-[var(--line)] border-y border-[var(--line)]'>
                                {group.rows.map(r => {
                                    const meta = metaFor(r.entityType);
                                    const Icon = meta.icon;
                                    return (
                                        /* One feed, not a stack of cards. Every row used to be its
                                           own bordered rounded-2xl box with a gap under it — twelve
                                           boxes where the eye wanted one list, at a 44px pitch for a
                                           single line of text. */
                                        <li
                                            key={r.id}
                                            className='flex items-center gap-2.5 px-1 py-1 transition-colors hover:bg-[var(--bg-subtle)]'
                                        >
                                            <span
                                                className='inline-flex items-center justify-center rounded-full shrink-0'
                                                style={{ width: 24, height: 24, background: meta.bg }}
                                                title={meta.label}
                                            >
                                                <Icon className='w-3 h-3' style={{ color: meta.color }} />
                                            </span>

                                            {/* The ×N belongs to the sentence, so it travels with it
                                                rather than floating out by the right-hand columns. */}
                                            <span className='flex-1 min-w-0 flex items-center gap-1.5' style={{ fontSize: 'var(--fs-input)', color: 'var(--ink)' }}>
                                                <span className='truncate'>{r.message || `${meta.label} ${r.action || 'updated'}`}</span>
                                                {r.repeat > 1 && (
                                                    <span
                                                        className='shrink-0 px-1.5 rounded-full font-medium tabular-nums'
                                                        title={`${r.repeat} identical entries`}
                                                        style={{ fontSize: 'var(--fs-table)', background: meta.bg, color: meta.color }}
                                                    >
                                                        ×{r.repeat}
                                                    </span>
                                                )}
                                            </span>

                                            {/* Fixed widths so the record, the person and the time
                                                read down the page as three columns. With everything
                                                right-aligned and auto-width, a long PO number shunted
                                                the name and the time out of line on every other row. */}
                                            <span className='hidden md:block w-32 shrink-0 text-right truncate' style={{ fontSize: 'var(--fs-table)' }}>
                                                {r.entityLabel && (
                                                    <span className='px-1.5 py-0.5 rounded-lg' style={{ background: meta.bg, color: meta.color }}>
                                                        {r.entityLabel}
                                                    </span>
                                                )}
                                            </span>

                                            {/* The shared chip: one colour per PERSON. This row used
                                                to tint the avatar with the ENTITY colour, so Olga was
                                                violet on a contract and green on an invoice. */}
                                            <span className='hidden sm:flex w-28 shrink-0 items-center' style={{ fontSize: 'var(--fs-table)', color: 'var(--ink-muted)' }}>
                                                <NameCell name={r.actorName || 'Unknown'} size={16} maxWidth={96} />
                                            </span>

                                            <span
                                                className='w-14 shrink-0 text-right tabular-nums'
                                                style={{ fontSize: 'var(--fs-table)', color: 'var(--ink-muted)' }}
                                                title={r.createdAt}
                                            >
                                                {relativeTime(r.createdAtMs)}
                                            </span>
                                        </li>
                                    );
                                })}
                            </ul>
                        </section>
                    ))}

                    {/* Says so when there is more, rather than ending the list and
                        letting it read as "that is everything this person did". */}
                    {filtered.length > shown.length && (
                        <div className='flex items-center justify-center gap-3 pt-2'>
                            <span style={{ fontSize: 'var(--fs-table)', color: 'var(--ink-muted)' }}>
                                Showing {shown.length} of {filtered.length}
                            </span>
                            <button
                                type='button'
                                onClick={() => setVisible(v => v + PAGE)}
                                className='whiteButton whitespace-nowrap'
                            >
                                Show more
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ActivityLog;
