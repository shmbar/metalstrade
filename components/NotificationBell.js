'use client';
import { useState, useRef, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useNotifications } from '../contexts/useNotificationContext';
import { PRIORITY, PRIORITY_ORDER, priorityOf } from '../utils/notificationPriority';
import {
    Bell, BellOff, Check, CheckCheck, Clock, Activity, FileText, Receipt, Banknote, Package, Settings as SettingsIcon,
    Circle, CheckCircle2, ChevronLeft, ExternalLink,
} from 'lucide-react';
import { TONES } from './statusUtils';

const ENTITY = {
    contract: { icon: FileText, color: 'var(--brand)', bg: 'var(--brand-soft)', route: (id) => `/contracts?openId=${id}` },
    invoice: { icon: Receipt, color: TONES.green.text, bg: TONES.green.bg, route: (id) => `/invoices?openId=${id}` },
    expense: { icon: Banknote, color: TONES.amber.text, bg: TONES.amber.bg, route: (id) => `/expenses?openId=${id}` },
    companyexpense: { icon: Banknote, color: TONES.amber.text, bg: TONES.amber.bg, route: () => `/companyexpenses` },
    stock: { icon: Package, color: 'var(--violet-text)', bg: 'var(--violet-soft)', route: () => `/stocks` },
    settings: { icon: SettingsIcon, color: TONES.gray.text, bg: TONES.gray.bg, route: () => `/settings` },
};
const FALLBACK = { icon: Activity, color: TONES.gray.text, bg: TONES.gray.bg, route: () => `/activity` };
const metaFor = (t) => ENTITY[t] || FALLBACK;

const SEVERITY_DOT = { success: TONES.green.text, warning: TONES.amber.text, error: TONES.red.text, info: 'var(--brand)' };

// Group notifications by subject so the stream stays organized rather than mixed.
const CATEGORIES = [
    // Must precede 'invoices'/'contracts' — 'invoice.splitPending' would otherwise be
    // grabbed by the startsWith('invoice') rule. First match wins in categoryOf().
    { key: 'splits', label: 'IMS/GIS Split', match: (n) => /\.splitPending$/.test(n.type || '') },
    { key: 'warehouse', label: 'Warehouse', match: (n) => (n.type || '').startsWith('stock') || n.entityType === 'stock' },
    { key: 'payments', label: 'Payments', match: (n) => /^(payment|settlement)/.test(n.type || '') },
    { key: 'shipments', label: 'Shipments', match: (n) => (n.type || '').startsWith('shipment') },
    { key: 'contracts', label: 'Contracts', match: (n) => (n.type || '').startsWith('contract') },
    { key: 'invoices', label: 'Invoices', match: (n) => (n.type || '').startsWith('invoice') },
    { key: 'comments', label: 'Comments', match: (n) => (n.type || '').startsWith('comment') },
];
const categoryOf = (n) => CATEGORIES.find(c => c.match(n))?.key || 'other';
const categoryLabel = (key) => CATEGORIES.find(c => c.key === key)?.label || 'Other';
const CATEGORY_ORDER = [...CATEGORIES.map(c => c.key), 'other'];

function relativeTime(ms) {
    if (!ms) return '';
    const s = Math.floor((Date.now() - ms) / 1000);
    if (s < 60) return 'just now';
    const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24); if (d < 7) return `${d}d ago`;
    const w = Math.floor(d / 7); if (w < 5) return `${w}w ago`;
    // Older items: short date, same compact voice as the relative labels
    return new Date(ms).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

// Day buckets for the "All" view — time is the axis people scan a feed by;
// priority is preserved as the sort order inside each day.
const DAY_GROUPS = [
    ['today', 'Today'],
    ['yesterday', 'Yesterday'],
    ['week', 'This week'],
    ['earlier', 'Earlier'],
];
function dayKeyOf(ms) {
    if (!ms) return 'earlier';
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    if (ms >= startOfToday) return 'today';
    if (ms >= startOfToday - 86400000) return 'yesterday';
    if (ms >= startOfToday - 6 * 86400000) return 'week';
    return 'earlier';
}

const SNOOZE_OPTS = [
    { label: '1 hour', ms: 60 * 60 * 1000 },
    { label: '4 hours', ms: 4 * 60 * 60 * 1000 },
    { label: 'Tomorrow', ms: 24 * 60 * 60 * 1000 },
];

function Chip({ active, onClick, label, count, unread, muted, onToggleMute }) {
    return (
        <button
            onClick={onClick}
            className='group/chip flex items-center gap-1.5 px-2.5 py-1 rounded-full whitespace-nowrap flex-shrink-0 transition-colors font-medium'
            style={{
                fontSize: 'var(--fs-body)',
                border: `1px solid ${active ? 'var(--brand)' : 'transparent'}`,
                background: active ? 'var(--brand)' : 'var(--bg-subtle)',
                color: active ? 'var(--on-brand)' : muted ? 'var(--ink-muted)' : 'var(--ink-secondary)',
                opacity: muted && !active ? 0.65 : 1,
            }}
        >
            {label}
            <span className='px-1.5 rounded-full font-semibold' style={{ fontSize: 'var(--fs-caption)', minWidth: 16, textAlign: 'center', background: active ? 'var(--on-brand-soft-strong)' : 'var(--bg-card)', color: active ? 'var(--on-brand)' : 'var(--ink-muted)' }}>
                {unread > 0 ? unread : count}
            </span>
            {onToggleMute && (
                // Muted: BellOff always shown. Unmuted: mute affordance fades in on hover.
                <span
                    role='button'
                    tabIndex={-1}
                    title={muted ? `Unmute ${label}` : `Mute ${label} (hide from feed & badge)`}
                    onClick={(e) => { e.stopPropagation(); onToggleMute(); }}
                    className={`inline-flex items-center justify-center rounded-full transition-opacity ${muted ? 'opacity-100' : 'opacity-0 group-hover/chip:opacity-60 hover:!opacity-100'}`}
                    style={{ width: 14, height: 14 }}
                >
                    {muted ? <BellOff size={10} strokeWidth={2} /> : <Bell size={10} strokeWidth={2} />}
                </span>
            )}
        </button>
    );
}

const NotificationBell = () => {
    const router = useRouter();
    const ctx = useNotifications() || {};
    const { notifications = [], unread = [], unreadCount = 0, markRead, markAllRead, markManyRead, snooze, muted, toggleMute } = ctx;
    const unreadIds = useMemo(() => new Set(unread.map(n => n.id)), [unread]);
    const [open, setOpen] = useState(false);
    const [snoozeFor, setSnoozeFor] = useState(null);
    const [catFilter, setCatFilter] = useState('all');
    // Per-category mute: muted categories are hidden from the "All" feed and the
    // badge count, but stay reachable via their (dimmed) chip. Persisted locally.
    const [mutedCats, setMutedCats] = useState(() => {
        if (typeof window === 'undefined') return new Set();
        try { return new Set(JSON.parse(localStorage.getItem('ims:mutedNotifCats') || '[]')); } catch { return new Set(); }
    });
    const toggleCatMute = (key) => setMutedCats(prev => {
        const next = new Set(prev);
        if (next.has(key)) next.delete(key); else next.add(key);
        try { localStorage.setItem('ims:mutedNotifCats', JSON.stringify([...next])); } catch { }
        return next;
    });
    // WhatsApp-style selection mode + the in-panel detail view for a clicked item.
    const [selectMode, setSelectMode] = useState(false);
    const [selected, setSelected] = useState(() => new Set());
    const [detail, setDetail] = useState(null);
    const ref = useRef(null);

    useEffect(() => {
        const onDown = (e) => {
            if (ref.current && !ref.current.contains(e.target)) {
                setOpen(false); setSnoozeFor(null); setDetail(null);
                setSelectMode(false); setSelected(new Set());
            }
        };
        document.addEventListener('mousedown', onDown);
        return () => document.removeEventListener('mousedown', onDown);
    }, []);

    // Clicking an item opens its detail pop-up and — like reading a chat message —
    // marks it read, so working through notifications drains the badge to zero.
    // In select mode this is a no-op: the ROW's own onClick handles the toggle
    // (handling it here too would double-toggle via event bubbling).
    const onOpenItem = (n) => {
        if (selectMode) return;
        if (unreadIds.has(n.id)) markRead?.(n.id);
        setDetail(n);
    };

    const openRecord = (n) => {
        setOpen(false); setDetail(null);
        const route = metaFor(n.entityType).route(n.entityId);
        if (route) router.push(route);
    };

    const toggleSelect = (id) => {
        setSelected(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const readSelected = () => {
        const ids = [...selected];
        if (ids.length) markManyRead?.(ids);
        setSelectMode(false); setSelected(new Set());
    };

    // Per-category counts (total + unread) for the filter chips.
    const chips = useMemo(() => {
        const counts = {};
        notifications.forEach(n => {
            const k = categoryOf(n);
            if (!counts[k]) counts[k] = { key: k, total: 0, unread: 0 };
            counts[k].total += 1;
            if (unreadIds.has(n.id)) counts[k].unread += 1;
        });
        return CATEGORY_ORDER.filter(k => counts[k]).map(k => counts[k]);
    }, [notifications, unreadIds]);

    // The "All" feed hides muted categories; opening a muted category's chip
    // directly still shows its items (that's how you review before unmuting).
    const visible = catFilter === 'all'
        ? notifications.filter(n => !mutedCats.has(categoryOf(n)))
        : notifications.filter(n => categoryOf(n) === catFilter);

    // Badge/header count ignores muted categories — that's the point of muting.
    const effectiveUnreadCount = useMemo(
        () => unread.filter(n => !mutedCats.has(categoryOf(n))).length,
        [unread, mutedCats]
    );

    // "All" view grouped by day (Today / Yesterday / This week / Earlier);
    // inside each day, high-priority items float to the top (stable sort keeps
    // newest-first within the same priority).
    const groups = useMemo(() => {
        if (catFilter !== 'all') return [];
        const prIdx = (n) => PRIORITY_ORDER.indexOf(priorityOf(n));
        const map = {};
        visible.forEach(n => {
            const k = dayKeyOf(n.createdAtMs);
            (map[k] = map[k] || []).push(n);
        });
        return DAY_GROUPS
            .filter(([k]) => map[k]?.length)
            .map(([k, label]) => [label, [...map[k]].sort((a, b) => prIdx(a) - prIdx(b))]);
    }, [visible, catFilter]);

    const renderRow = (n) => {
        const meta = metaFor(n.entityType);
        const Icon = meta.icon;
        const pr = PRIORITY[priorityOf(n)] || PRIORITY.medium;
        const unreadFlag = unreadIds.has(n.id);
        const receipts = Object.values(n.readReceipts || {}); // [{ name, at }]
        const seenTitle = receipts.map(r => `${r.name} — ${relativeTime(new Date(r.at).getTime())}`).join('\n');
        const seenSummary = receipts.length === 1 ? receipts[0].name : `${receipts[0]?.name} +${receipts.length - 1}`;
        const isSelected = selected.has(n.id);
        return (
            <div
                key={n.id}
                className='group relative flex items-start gap-2.5 px-3 py-2.5 border-b border-[var(--line)] hover:bg-[var(--bg-subtle)] transition-colors'
                style={{
                    background: isSelected ? 'var(--brand-soft)' : 'var(--bg-card)',
                    cursor: selectMode ? 'pointer' : undefined,
                }}
                onClick={selectMode ? () => toggleSelect(n.id) : undefined}
            >
                {selectMode && (
                    <span className='flex-shrink-0 mt-1'>
                        {isSelected
                            ? <CheckCircle2 className='w-4 h-4' style={{ color: 'var(--brand)' }} />
                            : <Circle className='w-4 h-4' style={{ color: 'var(--line-strong)' }} />}
                    </span>
                )}
                {unreadFlag && !selectMode && (
                    <span className='absolute rounded-full' style={{ right: 10, top: 12, width: 6, height: 6, background: 'var(--brand)' }} />
                )}
                <span className='inline-flex items-center justify-center rounded-control flex-shrink-0 mt-0.5' style={{ width: 32, height: 32, background: meta.bg }}>
                    <Icon className='w-4 h-4' style={{ color: meta.color }} />
                </span>
                <button onClick={() => onOpenItem(n)} className='min-w-0 flex-1 text-left'>
                    <p className='break-words' style={{ fontSize: 'var(--fs-input)', color: 'var(--ink)', fontWeight: unreadFlag ? 600 : 400 }}>
                        {n.message || `${n.entityType || 'Item'} ${n.action || 'updated'}`}
                    </p>
                    {/* Calm meta line — priority is already carried by the section header
                        and the row's left accent; repeating a red pill on every row made
                        the whole panel read as one long alarm. */}
                    <div className='flex items-center gap-1.5 mt-0.5' style={{ fontSize: 'var(--fs-table)', color: 'var(--ink-muted)' }}>
                        <span className='rounded-full shrink-0' style={{ width: 5, height: 5, background: SEVERITY_DOT[n.severity] || 'var(--line-strong)' }} />
                        <span className='truncate'>{n.actorName || 'System'}</span>
                        <span>·</span>
                        <span className='whitespace-nowrap' title={n.createdAt}>{relativeTime(n.createdAtMs)}</span>
                    </div>
                    {receipts.length > 0 && (
                        <div className='flex items-center gap-1 mt-0.5' style={{ fontSize: 'var(--fs-caption)', color: TONES.green.text }} title={seenTitle}>
                            <CheckCheck className='w-2.5 h-2.5' /> Seen by {seenSummary}
                        </div>
                    )}
                </button>
                {!selectMode && (
                    /* Actions reveal on hover (always visible on touch screens) — keeps
                       rows clean without hiding functionality. */
                    <div className='flex flex-col items-center gap-1 flex-shrink-0 md:opacity-0 md:group-hover:opacity-100 transition-opacity'>
                        <button onClick={() => markRead?.(n.id)} title='Mark as read' className='p-0.5 rounded hover:bg-[var(--bg-sunken)]'>
                            <Check className='w-3.5 h-3.5' style={{ color: 'var(--brand)' }} />
                        </button>
                        <button onClick={() => setSnoozeFor(snoozeFor === n.id ? null : n.id)} title='Snooze' className='p-0.5 rounded hover:bg-[var(--bg-sunken)]'>
                            <Clock className='w-3.5 h-3.5' style={{ color: 'var(--ink-muted)' }} />
                        </button>
                    </div>
                )}
                {snoozeFor === n.id && (
                    <div className='absolute right-2 top-9 z-10 bg-[var(--bg-card)] rounded-lg border border-[var(--line)] py-1' style={{ boxShadow: 'var(--shadow-md)' }}>
                        {SNOOZE_OPTS.map(opt => (
                            <button
                                key={opt.label}
                                onClick={() => { snooze?.(n.id, opt.ms); setSnoozeFor(null); }}
                                className='block w-full text-left px-3 py-1 hover:bg-[var(--bg-subtle)] whitespace-nowrap'
                                style={{ fontSize: 'var(--fs-table)', color: 'var(--ink)' }}
                            >
                                Remind me in {opt.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className='relative' ref={ref}>
            <button
                className='relative flex items-center justify-center w-9 h-9 rounded-control text-[var(--ink-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--ink)] transition-colors'
                onClick={() => setOpen(v => !v)}
                aria-label='Notifications'
            >
                <Bell className='w-[18px] h-[18px]' strokeWidth={1.75} />
                {effectiveUnreadCount > 0 && (
                    <span
                        className='absolute top-0.5 right-0.5 min-w-[15px] h-[15px] px-1 rounded-full text-[var(--on-brand)] flex items-center justify-center'
                        style={{ background: 'var(--bad-text)', fontSize: 'var(--fs-caption)', fontWeight: 700, lineHeight: 1, boxShadow: '0 0 0 2px var(--bg-card)' }}
                    >
                        {effectiveUnreadCount > 99 ? "99+" : effectiveUnreadCount}
                    </span>
                )}
            </button>

            {open && (
                <div className='absolute right-0 top-full mt-2 w-[380px] bg-[var(--bg-card)] rounded-2xl border border-[var(--line)] z-dropdown overflow-hidden' style={{ boxShadow: 'var(--shadow-md)', animation: 'rise-in 0.25s cubic-bezier(0.16,1,0.3,1) both' }}>
                    {/* Header */}
                    <div className='flex items-center justify-between px-4 py-3' style={{ background: "var(--bg-card)", borderBottom: '1px solid var(--line)' }}>
                        <span className='font-semibold font-display inline-flex items-center gap-1.5' style={{ fontSize: 'var(--fs-title)', color: 'var(--ink)' }}>
                            Notifications
                            {effectiveUnreadCount > 0 && (
                                <span className='px-1.5 py-0.5 rounded-full font-semibold' style={{ fontSize: 'var(--fs-table)', background: 'var(--brand-soft)', color: 'var(--brand)' }}>
                                    {effectiveUnreadCount} new
                                </span>
                            )}
                        </span>
                        <div className='flex items-center gap-1.5'>
                            <button onClick={toggleMute} title={muted ? 'Unmute sound' : 'Mute sound'} className='w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[var(--bg-subtle)] transition-colors'>
                                {muted
                                    ? <BellOff className='w-3.5 h-3.5' style={{ color: 'var(--ink-muted)' }} />
                                    : <Bell className='w-3.5 h-3.5' style={{ color: 'var(--ink-secondary)' }} />}
                            </button>
                            <button
                                onClick={() => { setSelectMode(v => !v); setSelected(new Set()); setDetail(null); }}
                                className='px-2.5 py-1 rounded-lg font-medium transition-colors hover:bg-[var(--bg-subtle)]'
                                style={{
                                    fontSize: 'var(--fs-body)',
                                    background: selectMode ? 'var(--brand-soft)' : 'transparent',
                                    color: selectMode ? 'var(--brand)' : 'var(--ink-secondary)',
                                }}
                            >
                                {selectMode ? 'Cancel' : 'Select'}
                            </button>
                            <button
                                onClick={() => markAllRead?.()}
                                disabled={unreadCount === 0}
                                title='Mark every notification as read'
                                className='flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium disabled:opacity-40 transition-colors hover:bg-[var(--brand-strong)]'
                                style={{ fontSize: 'var(--fs-body)', background: 'var(--brand)', color: 'var(--on-brand)' }}
                            >
                                <CheckCheck className='w-3 h-3' /> Read all
                            </button>
                        </div>
                    </div>

                    {/* Detail pop-up for a clicked notification — full message, no truncation */}
                    {detail && (() => {
                        const meta = metaFor(detail.entityType);
                        const DIcon = meta.icon;
                        const pr = PRIORITY[priorityOf(detail)] || PRIORITY.medium;
                        const receipts = Object.values(detail.readReceipts || {});
                        return (
                            <div>
                                <div className='flex items-center gap-1.5 px-2 py-1.5' style={{ borderBottom: '1px solid var(--line)' }}>
                                    <button onClick={() => setDetail(null)} className='p-1 rounded-full hover:bg-[var(--bg-subtle)]' aria-label='Back to list'>
                                        <ChevronLeft className='w-4 h-4' style={{ color: 'var(--ink-secondary)' }} />
                                    </button>
                                    <span style={{ fontSize: 'var(--fs-body)', fontWeight: 600, color: 'var(--ink)' }}>Notification</span>
                                </div>
                                <div className='p-4'>
                                    <div className='flex items-center gap-2.5'>
                                        <span className='inline-flex items-center justify-center rounded-2xl flex-shrink-0' style={{ width: 36, height: 36, background: meta.bg }}>
                                            <DIcon className='w-4.5 h-4.5 w-[18px] h-[18px]' style={{ color: meta.color }} />
                                        </span>
                                        <div className='min-w-0'>
                                            <p className='font-semibold truncate' style={{ fontSize: 'var(--fs-input)', color: 'var(--ink)' }}>
                                                {detail.entityLabel || detail.entityType || 'Notification'}
                                            </p>
                                            <span className='inline-flex items-center gap-1 px-1.5 rounded-full font-semibold mt-0.5'
                                                style={{ fontSize: 'var(--fs-caption)', color: pr.color, background: pr.bg, border: `1px solid ${pr.border}` }}>
                                                {pr.label} priority
                                            </span>
                                        </div>
                                    </div>
                                    <p className='mt-3 break-words' style={{ fontSize: 'var(--fs-input)', color: 'var(--ink)', lineHeight: 1.55 }}>
                                        {detail.message || `${detail.entityType || 'Item'} ${detail.action || 'updated'}`}
                                    </p>
                                    <div className='mt-3 rounded-2xl p-2.5' style={{ background: 'var(--bg-subtle)', border: '1px solid var(--line)' }}>
                                        <p style={{ fontSize: 'var(--fs-table)', color: 'var(--ink-muted)' }}>
                                            From: <span style={{ color: 'var(--ink)' }}>{detail.actorName || 'System'}</span>
                                        </p>
                                        <p className='mt-0.5' style={{ fontSize: 'var(--fs-table)', color: 'var(--ink-muted)' }}>
                                            When: <span style={{ color: 'var(--ink)' }}>{detail.createdAtMs ? new Date(detail.createdAtMs).toLocaleString() : detail.createdAt || '—'}</span>
                                        </p>
                                        {receipts.length > 0 && (
                                            <p className='mt-0.5 flex items-center gap-1' style={{ fontSize: 'var(--fs-table)', color: TONES.green.text }}>
                                                <CheckCheck className='w-3 h-3' /> Seen by {receipts.map(r => r.name).join(', ')}
                                            </p>
                                        )}
                                    </div>
                                    <div className='flex gap-2 mt-4'>
                                        <button
                                            onClick={() => openRecord(detail)}
                                            className='flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-full font-medium text-[var(--on-brand)] hover:opacity-90 transition-opacity'
                                            style={{ fontSize: 'var(--fs-body)', background: 'var(--brand)' }}
                                        >
                                            <ExternalLink className='w-3.5 h-3.5' /> Open record
                                        </button>
                                        <button
                                            onClick={() => setDetail(null)}
                                            className='px-4 py-1.5 rounded-full font-medium transition-colors hover:bg-[var(--bg-subtle)]'
                                            style={{ fontSize: 'var(--fs-body)', color: 'var(--ink-secondary)', border: '1px solid var(--line-strong)' }}
                                        >
                                            Close
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })()}

                    {/* Subject filter chips */}
                    {!detail && chips.length > 1 && (
                        <div className='flex gap-1.5 px-3 py-2 overflow-x-auto scrollbar-none' style={{ borderBottom: '1px solid var(--line)' }}>
                            <Chip active={catFilter === 'all'} onClick={() => setCatFilter('all')} label='All' count={notifications.length} unread={effectiveUnreadCount} />
                            {chips.map(c => (
                                <Chip key={c.key} active={catFilter === c.key} onClick={() => setCatFilter(c.key)} label={categoryLabel(c.key)} count={c.total} unread={c.unread}
                                    muted={mutedCats.has(c.key)} onToggleMute={() => toggleCatMute(c.key)} />
                            ))}
                        </div>
                    )}

                    {/* List */}
                    {!detail && (
                    <div className='max-h-[60vh] overflow-y-auto custom-scroll'>
                        {visible.length === 0 ? (
                            <div className='flex flex-col items-center justify-center py-10 gap-2.5'>
                                <span className='flex items-center justify-center rounded-full' style={{ width: 44, height: 44, background: 'var(--bg-subtle)' }}>
                                    <Bell className='w-5 h-5' strokeWidth={1.75} style={{ color: 'var(--ink-muted)' }} />
                                </span>
                                <span className='font-medium' style={{ fontSize: 'var(--fs-input)', color: 'var(--ink-secondary)' }}>You&apos;re all caught up</span>
                            </div>
                        ) : catFilter === 'all' ? (
                            groups.map(([label, items]) => (
                                <div key={label}>
                                    <div
                                        className='sticky top-0 flex items-center justify-between px-4 pt-2.5 pb-1 bg-[var(--bg-card)]'
                                        style={{ fontSize: 'var(--fs-table)', fontWeight: 600, letterSpacing: '0.05em', color: 'var(--ink-muted)', textTransform: 'uppercase', zIndex: 5 }}
                                    >
                                        <span>{label}</span>
                                        <span>{items.length}</span>
                                    </div>
                                    {items.map(renderRow)}
                                </div>
                            ))
                        ) : (
                            visible.map(renderRow)
                        )}
                    </div>
                    )}

                    {/* Footer: selection action bar while selecting, otherwise activity link */}
                    {!detail && (selectMode ? (
                        <div className='flex items-center justify-between px-3 py-2' style={{ borderTop: '1px solid var(--line)', background: 'var(--bg-subtle)' }}>
                            <span style={{ fontSize: 'var(--fs-body)', fontWeight: 600, color: 'var(--ink)' }}>
                                {selected.size} selected
                            </span>
                            <button
                                onClick={readSelected}
                                disabled={selected.size === 0}
                                className='flex items-center gap-1.5 px-3 py-1 rounded-full font-medium text-[var(--on-brand)] disabled:opacity-40 hover:opacity-90 transition-opacity'
                                style={{ fontSize: 'var(--fs-body)', background: 'var(--brand)' }}
                            >
                                <CheckCheck className='w-3.5 h-3.5' /> Mark {selected.size > 0 ? selected.size + ' ' : ''}as read
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => { setOpen(false); router.push('/activity'); }}
                            className='w-full flex items-center justify-center gap-1.5 py-2 hover:bg-[var(--bg-subtle)] transition-colors'
                            style={{ fontSize: 'var(--fs-body)', color: 'var(--brand-strong)', borderTop: '1px solid var(--line)' }}
                        >
                            <Activity className='w-3.5 h-3.5' /> View all activity
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default NotificationBell;
