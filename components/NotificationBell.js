'use client';
import { useState, useRef, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useNotifications } from '../contexts/useNotificationContext';
import {
    Bell, BellOff, Check, CheckCheck, Clock, Activity, FileText, Receipt, Banknote, Package, Settings as SettingsIcon,
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
    const { notifications = [], unread = [], unreadCount = 0, markRead, markAllRead, snooze, muted, toggleMute } = ctx;
    const unreadIds = useMemo(() => new Set(unread.map(n => n.id)), [unread]);
    const [open, setOpen] = useState(false);
    const [snoozeFor, setSnoozeFor] = useState(null);
    const [catFilter, setCatFilter] = useState('all');
    const ref = useRef(null);

    useEffect(() => {
        const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setSnoozeFor(null); } };
        document.addEventListener('mousedown', onDown);
        return () => document.removeEventListener('mousedown', onDown);
    }, []);

    const onOpenItem = (n) => {
        markRead?.(n.id);
        setOpen(false);
        const route = metaFor(n.entityType).route(n.entityId);
        if (route) router.push(route);
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

    // Grouped sections (only for the "All" view).
    const groups = useMemo(() => {
        if (catFilter !== 'all') return [];
        const map = {};
        notifications.forEach(n => { (map[categoryOf(n)] = map[categoryOf(n)] || []).push(n); });
        return CATEGORY_ORDER.filter(k => map[k]).map(k => [k, map[k]]);
    }, [notifications, catFilter]);

    const renderRow = (n) => {
        const meta = metaFor(n.entityType);
        const Icon = meta.icon;
        const unreadFlag = unreadIds.has(n.id);
        const receipts = Object.values(n.readReceipts || {}); // [{ name, at }]
        const seenTitle = receipts.map(r => `${r.name} — ${relativeTime(new Date(r.at).getTime())}`).join('\n');
        const seenSummary = receipts.length === 1 ? receipts[0].name : `${receipts[0]?.name} +${receipts.length - 1}`;
        return (
            <div
                key={n.id}
                className='relative flex items-start gap-2.5 px-3 py-2.5 border-b border-[#eef5fc] hover:bg-[#f8fbff] transition-colors'
                style={{ background: unreadFlag ? '#f8fbff' : 'white' }}
            >
                <span className='inline-flex items-center justify-center rounded-full flex-shrink-0 mt-0.5' style={{ width: 26, height: 26, background: meta.bg }}>
                    <Icon className='w-3.5 h-3.5' style={{ color: meta.color }} />
                </span>
                <button onClick={() => onOpenItem(n)} className='min-w-0 flex-1 text-left'>
                    <p className='break-words' style={{ fontSize: '0.72rem', color: 'var(--port-gore)' }}>
                        {n.message || `${n.entityType || 'Item'} ${n.action || 'updated'}`}
                    </p>
                    <div className='flex flex-wrap items-center gap-x-2 mt-0.5' style={{ fontSize: '0.6rem', color: 'var(--regent-gray)' }}>
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
                <div className='flex flex-col items-center gap-1 flex-shrink-0'>
                    <button onClick={() => markRead?.(n.id)} title='Mark as read' className='p-0.5 rounded hover:bg-[#dbeeff]'>
                        <Check className='w-3.5 h-3.5' style={{ color: 'var(--endeavour)' }} />
                    </button>
                    <button onClick={() => setSnoozeFor(snoozeFor === n.id ? null : n.id)} title='Snooze' className='p-0.5 rounded hover:bg-[#dbeeff]'>
                        <Clock className='w-3.5 h-3.5' style={{ color: 'var(--regent-gray)' }} />
                    </button>
                </div>
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
                        {unreadCount > 9 ? '9+' : unreadCount}
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
                            <button onClick={() => markAllRead?.()} disabled={unreadCount === 0} title='Mark all as read' className='p-1 rounded-full hover:bg-white/60 disabled:opacity-40'>
                                <CheckCheck className='w-3.5 h-3.5' style={{ color: 'var(--endeavour)' }} />
                            </button>
                        </div>
                    </div>

                    {/* Subject filter chips */}
                    {chips.length > 1 && (
                        <div className='flex gap-1 px-2 py-1.5 overflow-x-auto' style={{ borderBottom: '1px solid #eef5fc' }}>
                            <Chip active={catFilter === 'all'} onClick={() => setCatFilter('all')} label='All' count={notifications.length} unread={unreadCount} />
                            {chips.map(c => (
                                <Chip key={c.key} active={catFilter === c.key} onClick={() => setCatFilter(c.key)} label={categoryLabel(c.key)} count={c.total} unread={c.unread} />
                            ))}
                        </div>
                    )}

                    {/* List */}
                    <div className='max-h-[60vh] overflow-y-auto'>
                        {visible.length === 0 ? (
                            <div className='flex flex-col items-center justify-center py-8 gap-1'>
                                <Bell className='w-5 h-5' style={{ color: '#b8ddf8' }} />
                                <span style={{ fontSize: '0.7rem', color: 'var(--regent-gray)' }}>You&apos;re all caught up.</span>
                            </div>
                        ) : catFilter === 'all' ? (
                            groups.map(([key, items]) => (
                                <div key={key}>
                                    <div
                                        className='sticky top-0 flex items-center justify-between px-3 py-1'
                                        style={{ background: '#f8fbff', borderBottom: '1px solid #eef5fc', fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.04em', color: 'var(--regent-gray)', textTransform: 'uppercase', zIndex: 5 }}
                                    >
                                        <span>{categoryLabel(key)}</span>
                                        <span>{items.length}</span>
                                    </div>
                                    {items.map(renderRow)}
                                </div>
                            ))
                        ) : (
                            visible.map(renderRow)
                        )}
                    </div>

                    {/* Footer */}
                    <button
                        onClick={() => { setOpen(false); router.push('/activity'); }}
                        className='w-full flex items-center justify-center gap-1.5 py-2 hover:bg-[var(--selago)] transition-colors'
                        style={{ fontSize: '0.68rem', color: 'var(--chathams-blue)', borderTop: '1px solid #eef5fc' }}
                    >
                        <Activity className='w-3.5 h-3.5' /> View all activity
                    </button>
                </div>
            )}
        </div>
    );
};

export default NotificationBell;
