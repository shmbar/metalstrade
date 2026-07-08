'use client';
import { useState, useRef, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useNotifications } from '../contexts/useNotificationContext';
import { PRIORITY, PRIORITY_ORDER, priorityOf } from '../utils/notificationPriority';
import {
    Bell, BellOff, Check, CheckCheck, Clock, Activity, FileText, Receipt, Banknote, Package, Settings as SettingsIcon,
    AlertTriangle, ArrowUp, Minus, Circle, CheckCircle2, ChevronLeft, ExternalLink,
} from 'lucide-react';

const ENTITY = {
    contract: { icon: FileText, color: '#0366ae', bg: '#dbeeff', route: (id) => `/contracts?openId=${id}` },
    invoice: { icon: Receipt, color: '#15803d', bg: '#f0fdf4', route: (id) => `/invoices?openId=${id}` },
    expense: { icon: Banknote, color: '#b45309', bg: '#fffbeb', route: (id) => `/expenses?openId=${id}` },
    companyexpense: { icon: Banknote, color: '#b45309', bg: '#fffbeb', route: () => `/companyexpenses` },
    stock: { icon: Package, color: '#7c3aed', bg: '#f5f3ff', route: () => `/stocks` },
    settings: { icon: SettingsIcon, color: '#475569', bg: '#f1f5f9', route: () => `/settings` },
};
const FALLBACK = { icon: Activity, color: '#475569', bg: '#f1f5f9', route: () => `/activity` };
const metaFor = (t) => ENTITY[t] || FALLBACK;

const SEVERITY_DOT = { success: '#16a34a', warning: '#d97706', error: '#dc2626', info: 'var(--endeavour)' };
const PRIORITY_ICON = { high: AlertTriangle, medium: ArrowUp, low: Minus };

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
    return new Date(ms).toLocaleDateString();
}

const SNOOZE_OPTS = [
    { label: '1 hour', ms: 60 * 60 * 1000 },
    { label: '4 hours', ms: 4 * 60 * 60 * 1000 },
    { label: 'Tomorrow', ms: 24 * 60 * 60 * 1000 },
];

function Chip({ active, onClick, label, count, unread }) {
    return (
        <button
            onClick={onClick}
            className='flex items-center gap-1 px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0 transition-colors'
            style={{
                fontSize: '0.58rem',
                border: `1px solid ${active ? 'var(--endeavour)' : '#dbeeff'}`,
                background: active ? 'var(--endeavour)' : 'white',
                color: active ? 'white' : 'var(--chathams-blue)',
            }}
        >
            {label}
            <span className='px-1 rounded-full' style={{ fontSize: '0.5rem', background: active ? 'rgba(255,255,255,0.25)' : '#eef5fc', color: active ? 'white' : 'var(--regent-gray)' }}>
                {unread > 0 ? unread : count}
            </span>
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

    const visible = catFilter === 'all'
        ? notifications
        : notifications.filter(n => categoryOf(n) === catFilter);

    // "All" view is grouped into High / Medium / Low sections (each already newest-first
    // from the context sort). Category chips above still filter by subject.
    const groups = useMemo(() => {
        if (catFilter !== 'all') return [];
        const map = { high: [], medium: [], low: [] };
        notifications.forEach(n => { map[priorityOf(n)].push(n); });
        return PRIORITY_ORDER.filter(k => map[k].length).map(k => [k, map[k]]);
    }, [notifications, catFilter]);

    const renderRow = (n) => {
        const meta = metaFor(n.entityType);
        const Icon = meta.icon;
        const pr = PRIORITY[priorityOf(n)] || PRIORITY.medium;
        const PriIcon = PRIORITY_ICON[pr.key];
        const unreadFlag = unreadIds.has(n.id);
        const receipts = Object.values(n.readReceipts || {}); // [{ name, at }]
        const seenTitle = receipts.map(r => `${r.name} — ${relativeTime(new Date(r.at).getTime())}`).join('\n');
        const seenSummary = receipts.length === 1 ? receipts[0].name : `${receipts[0]?.name} +${receipts.length - 1}`;
        const isSelected = selected.has(n.id);
        return (
            <div
                key={n.id}
                className='relative flex items-start gap-2.5 px-3 py-2.5 border-b border-[#eef5fc] hover:bg-[#f8fbff] transition-colors'
                style={{
                    background: isSelected ? '#dbeeff' : unreadFlag ? '#f8fbff' : 'white',
                    borderLeft: `3px solid ${pr.color}`,
                    cursor: selectMode ? 'pointer' : undefined,
                }}
                onClick={selectMode ? () => toggleSelect(n.id) : undefined}
            >
                {selectMode && (
                    <span className='flex-shrink-0 mt-1'>
                        {isSelected
                            ? <CheckCircle2 className='w-4 h-4' style={{ color: 'var(--endeavour)' }} />
                            : <Circle className='w-4 h-4' style={{ color: '#b8ddf8' }} />}
                    </span>
                )}
                <span className='inline-flex items-center justify-center rounded-full flex-shrink-0 mt-0.5' style={{ width: 26, height: 26, background: meta.bg }}>
                    <Icon className='w-3.5 h-3.5' style={{ color: meta.color }} />
                </span>
                <button onClick={() => onOpenItem(n)} className='min-w-0 flex-1 text-left'>
                    <p className='break-words' style={{ fontSize: '0.72rem', color: 'var(--port-gore)' }}>
                        {n.message || `${n.entityType || 'Item'} ${n.action || 'updated'}`}
                    </p>
                    <div className='flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5' style={{ fontSize: '0.6rem', color: 'var(--regent-gray)' }}>
                        <span className='inline-flex items-center gap-0.5 px-1.5 rounded-full font-semibold'
                            style={{ fontSize: '0.52rem', color: pr.color, background: pr.bg, border: `1px solid ${pr.border}` }}>
                            <PriIcon className='w-2 h-2' /> {pr.label}
                        </span>
                        <span style={{ color: SEVERITY_DOT[n.severity] || 'var(--regent-gray)' }}>●</span>
                        <span>{n.actorName || 'Unknown'}</span>
                        <span>·</span>
                        <span title={n.createdAt}>{relativeTime(n.createdAtMs)}</span>
                    </div>
                    {receipts.length > 0 && (
                        <div className='flex items-center gap-1 mt-0.5' style={{ fontSize: '0.55rem', color: '#16a34a' }} title={seenTitle}>
                            <CheckCheck className='w-2.5 h-2.5' /> Seen by {seenSummary}
                        </div>
                    )}
                </button>
                {!selectMode && (
                    <div className='flex flex-col items-center gap-1 flex-shrink-0'>
                        <button onClick={() => markRead?.(n.id)} title='Mark as read' className='p-0.5 rounded hover:bg-[#dbeeff]'>
                            <Check className='w-3.5 h-3.5' style={{ color: 'var(--endeavour)' }} />
                        </button>
                        <button onClick={() => setSnoozeFor(snoozeFor === n.id ? null : n.id)} title='Snooze' className='p-0.5 rounded hover:bg-[#dbeeff]'>
                            <Clock className='w-3.5 h-3.5' style={{ color: 'var(--regent-gray)' }} />
                        </button>
                    </div>
                )}
                {snoozeFor === n.id && (
                    <div className='absolute right-2 top-9 z-10 bg-white rounded-lg shadow-lg border border-[var(--selago)] py-1'>
                        {SNOOZE_OPTS.map(opt => (
                            <button
                                key={opt.label}
                                onClick={() => { snooze?.(n.id, opt.ms); setSnoozeFor(null); }}
                                className='block w-full text-left px-3 py-1 hover:bg-[var(--selago)] whitespace-nowrap'
                                style={{ fontSize: '0.65rem', color: 'var(--port-gore)' }}
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
                className='relative flex items-center justify-center w-10 h-10'
                onClick={() => setOpen(v => !v)}
                aria-label='Notifications'
            >
                <Bell className='w-5 h-5' style={{ color: 'var(--chathams-blue)' }} />
                {unreadCount > 0 && (
                    <span
                        className='absolute top-1 right-1 min-w-[15px] h-[15px] px-1 rounded-full text-white flex items-center justify-center'
                        style={{ background: '#dc2626', fontSize: '0.55rem', fontWeight: 700, lineHeight: 1 }}
                    >
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {open && (
                <div className='absolute right-0 top-full mt-2 w-[360px] bg-white rounded-xl shadow-lg border border-[var(--selago)] z-[9999] overflow-hidden'>
                    {/* Header */}
                    <div className='flex items-center justify-between px-3 py-2' style={{ background: '#dbeeff', borderBottom: '1px solid #b8ddf8' }}>
                        <span className='font-semibold' style={{ fontSize: '0.72rem', color: 'var(--chathams-blue)' }}>
                            Notifications{unreadCount > 0 ? ` · ${unreadCount} new` : ''}
                        </span>
                        <div className='flex items-center gap-1'>
                            <button onClick={toggleMute} title={muted ? 'Unmute sound' : 'Mute sound'} className='p-1 rounded-full hover:bg-white/60'>
                                {muted
                                    ? <BellOff className='w-3.5 h-3.5' style={{ color: 'var(--regent-gray)' }} />
                                    : <Bell className='w-3.5 h-3.5' style={{ color: 'var(--chathams-blue)' }} />}
                            </button>
                            <button
                                onClick={() => { setSelectMode(v => !v); setSelected(new Set()); setDetail(null); }}
                                className='px-2 py-0.5 rounded-full font-medium transition-colors'
                                style={{
                                    fontSize: '0.6rem',
                                    background: selectMode ? 'var(--chathams-blue)' : 'white',
                                    color: selectMode ? 'white' : 'var(--chathams-blue)',
                                    border: '1px solid #b8ddf8',
                                }}
                            >
                                {selectMode ? 'Cancel' : 'Select'}
                            </button>
                            <button
                                onClick={() => markAllRead?.()}
                                disabled={unreadCount === 0}
                                title='Mark every notification as read'
                                className='flex items-center gap-1 px-2 py-0.5 rounded-full font-medium disabled:opacity-40 transition-colors hover:opacity-90'
                                style={{ fontSize: '0.6rem', background: 'var(--endeavour)', color: 'white' }}
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
                                <div className='flex items-center gap-1.5 px-2 py-1.5' style={{ borderBottom: '1px solid #eef5fc' }}>
                                    <button onClick={() => setDetail(null)} className='p-1 rounded-full hover:bg-[#dbeeff]' aria-label='Back to list'>
                                        <ChevronLeft className='w-4 h-4' style={{ color: 'var(--chathams-blue)' }} />
                                    </button>
                                    <span style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--chathams-blue)' }}>Notification</span>
                                </div>
                                <div className='p-4'>
                                    <div className='flex items-center gap-2.5'>
                                        <span className='inline-flex items-center justify-center rounded-xl flex-shrink-0' style={{ width: 36, height: 36, background: meta.bg }}>
                                            <DIcon className='w-4.5 h-4.5 w-[18px] h-[18px]' style={{ color: meta.color }} />
                                        </span>
                                        <div className='min-w-0'>
                                            <p className='font-semibold truncate' style={{ fontSize: '0.78rem', color: 'var(--chathams-blue)' }}>
                                                {detail.entityLabel || detail.entityType || 'Notification'}
                                            </p>
                                            <span className='inline-flex items-center gap-1 px-1.5 rounded-full font-semibold mt-0.5'
                                                style={{ fontSize: '0.54rem', color: pr.color, background: pr.bg, border: `1px solid ${pr.border}` }}>
                                                {pr.label} priority
                                            </span>
                                        </div>
                                    </div>
                                    <p className='mt-3 break-words' style={{ fontSize: '0.74rem', color: 'var(--port-gore)', lineHeight: 1.55 }}>
                                        {detail.message || `${detail.entityType || 'Item'} ${detail.action || 'updated'}`}
                                    </p>
                                    <div className='mt-3 rounded-xl p-2.5' style={{ background: '#f8fbff', border: '1px solid #eef5fc' }}>
                                        <p style={{ fontSize: '0.62rem', color: 'var(--regent-gray)' }}>
                                            From: <span style={{ color: 'var(--port-gore)' }}>{detail.actorName || 'System'}</span>
                                        </p>
                                        <p className='mt-0.5' style={{ fontSize: '0.62rem', color: 'var(--regent-gray)' }}>
                                            When: <span style={{ color: 'var(--port-gore)' }}>{detail.createdAtMs ? new Date(detail.createdAtMs).toLocaleString() : detail.createdAt || '—'}</span>
                                        </p>
                                        {receipts.length > 0 && (
                                            <p className='mt-0.5 flex items-center gap-1' style={{ fontSize: '0.62rem', color: '#16a34a' }}>
                                                <CheckCheck className='w-3 h-3' /> Seen by {receipts.map(r => r.name).join(', ')}
                                            </p>
                                        )}
                                    </div>
                                    <div className='flex gap-2 mt-4'>
                                        <button
                                            onClick={() => openRecord(detail)}
                                            className='flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-full font-medium text-white hover:opacity-90 transition-opacity'
                                            style={{ fontSize: '0.68rem', background: 'var(--endeavour)' }}
                                        >
                                            <ExternalLink className='w-3.5 h-3.5' /> Open record
                                        </button>
                                        <button
                                            onClick={() => setDetail(null)}
                                            className='px-4 py-1.5 rounded-full font-medium transition-colors hover:bg-[#dbeeff]'
                                            style={{ fontSize: '0.68rem', color: 'var(--chathams-blue)', border: '1px solid #b8ddf8' }}
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
                        <div className='flex gap-1 px-2 py-1.5 overflow-x-auto' style={{ borderBottom: '1px solid #eef5fc' }}>
                            <Chip active={catFilter === 'all'} onClick={() => setCatFilter('all')} label='All' count={notifications.length} unread={unreadCount} />
                            {chips.map(c => (
                                <Chip key={c.key} active={catFilter === c.key} onClick={() => setCatFilter(c.key)} label={categoryLabel(c.key)} count={c.total} unread={c.unread} />
                            ))}
                        </div>
                    )}

                    {/* List */}
                    {!detail && (
                    <div className='max-h-[60vh] overflow-y-auto'>
                        {visible.length === 0 ? (
                            <div className='flex flex-col items-center justify-center py-8 gap-1'>
                                <Bell className='w-5 h-5' style={{ color: '#b8ddf8' }} />
                                <span style={{ fontSize: '0.7rem', color: 'var(--regent-gray)' }}>You&apos;re all caught up.</span>
                            </div>
                        ) : catFilter === 'all' ? (
                            groups.map(([key, items]) => {
                                const pr = PRIORITY[key];
                                const PriIcon = PRIORITY_ICON[key];
                                return (
                                    <div key={key}>
                                        <div
                                            className='sticky top-0 flex items-center justify-between px-3 py-1'
                                            style={{ background: pr.bg, borderBottom: `1px solid ${pr.border}`, fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.04em', color: pr.color, textTransform: 'uppercase', zIndex: 5 }}
                                        >
                                            <span className='inline-flex items-center gap-1'><PriIcon className='w-2.5 h-2.5' /> {pr.label} priority</span>
                                            <span>{items.length}</span>
                                        </div>
                                        {items.map(renderRow)}
                                    </div>
                                );
                            })
                        ) : (
                            visible.map(renderRow)
                        )}
                    </div>
                    )}

                    {/* Footer: selection action bar while selecting, otherwise activity link */}
                    {!detail && (selectMode ? (
                        <div className='flex items-center justify-between px-3 py-2' style={{ borderTop: '1px solid #eef5fc', background: '#f8fbff' }}>
                            <span style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--chathams-blue)' }}>
                                {selected.size} selected
                            </span>
                            <button
                                onClick={readSelected}
                                disabled={selected.size === 0}
                                className='flex items-center gap-1.5 px-3 py-1 rounded-full font-medium text-white disabled:opacity-40 hover:opacity-90 transition-opacity'
                                style={{ fontSize: '0.66rem', background: 'var(--endeavour)' }}
                            >
                                <CheckCheck className='w-3.5 h-3.5' /> Mark {selected.size > 0 ? selected.size + ' ' : ''}as read
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => { setOpen(false); router.push('/activity'); }}
                            className='w-full flex items-center justify-center gap-1.5 py-2 hover:bg-[var(--selago)] transition-colors'
                            style={{ fontSize: '0.68rem', color: 'var(--chathams-blue)', borderTop: '1px solid #eef5fc' }}
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
