'use client';
import { useContext, useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { SettingsContext } from "../../../contexts/useSettingsContext";
import { UserAuth } from "../../../contexts/useAuthContext";
import { loadData, updateContractField, ensureNotificationsBatch, deleteNotification, loadActivityByTypePrefix } from '../../../utils/utils';
import VideoLoader from '../../../components/videoLoader';
import { TableSkeleton } from "../../../components/skeletons";
import Toast from '../../../components/toast.js';
import DateRangePicker from '../../../components/dateRangePicker';
import Datepicker from "react-tailwindcss-datepicker";
import { useRouter } from 'next/navigation';
import { FaSearch } from 'react-icons/fa';
import { TiDeleteOutline } from 'react-icons/ti';
import { HiMiniChevronUpDown } from 'react-icons/hi2';
import Image from 'next/image';
import Tltip from '../../../components/tlTip';
/* Icons must be COMPONENTS, not <Image src="/logo/*.svg">. An <img> cannot
   inherit currentColor, so a file-based icon keeps one baked-in colour and stops
   following the theme — which is exactly how the chat and filter icons here
   ended up off-theme while the PDF icon beside them was fine. */
import { FileSpreadsheet, MessageSquare, Filter, Check } from 'lucide-react';
import ProgressBar from '../../../components/ProgressBar';
import Avatar from '../../../components/Avatar';
// exceljs is imported dynamically inside exportExcel so it stays off the
// first-load bundle (same pattern as the other excel exporters).
import { saveAs } from 'file-saver';
import { Menu, Transition, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { Fragment } from 'react';
import { SHIPMENT_STATUSES, SHIPMENT_STATUS_STYLES, normalizeStatus } from '../contractsstatement/shipmentStatus';
import SortIcon from "@components/table/SortIcon";

// Shipment lifecycle vocabulary/colors live in a shared module so the Contracts Statement
// follows the exact same statuses (see ../contractsstatement/shipmentStatus).
const STATUSES = SHIPMENT_STATUSES;
const STATUS_STYLES = SHIPMENT_STATUS_STYLES;

function NotesCell({ value, contractId, contractDate, uidCollection, onChange, onCommit }) {
    const [local, setLocal] = useState(value || '');
    const timerRef = useRef(null);

    useEffect(() => { setLocal(value || ''); }, [value]);

    const handleChange = (e) => {
        const v = e.target.value;
        setLocal(v);
        onChange(v);
        clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
            const ts = Date.now();
            updateContractField(uidCollection, contractId, contractDate, { shipmentNotes: v, shipmentUpdatedAt: ts });
            onCommit?.(ts);
        }, 800);
    };

    // Flat at rest (matches read-only tables); the input box only appears on
    // hover/focus so editability stays discoverable without the boxed-grid look.
    return (
        <div className="px-2 py-0.5 rounded-control responsiveTextTable font-medium border border-transparent hover:border-[var(--line-strong)] hover:bg-[var(--bg-card)] focus-within:border-[var(--brand)] focus-within:bg-[var(--bg-card)] transition-colors">
            <textarea
                value={local}
                onChange={handleChange}
                rows={1}
                className="w-full min-w-[160px] responsiveTextTable text-[var(--ink)] bg-transparent resize-none focus:outline-none placeholder:text-[var(--ink-muted)]"
                placeholder="Add notes..."
            />
        </div>
    );
}

const fmtDate = (d) => {
    if (!d) return null;
    try {
        const [y, m, day] = d.split('-');
        if (!y || !m || !day) return null;
        return `${day}.${m}.${y.slice(2)}`;
    } catch { return null; }
};

/* Where the floating datepicker sits for a given cell.

   Anchored to the cell on BOTH axes. When there isn't room below, it flips to sit
   above the cell rather than being clamped to a fixed viewport offset — the old
   `Math.min(r.bottom + 2, innerHeight - 360)` did the latter, so clicking a row
   near the bottom of the screen parked the calendar mid-table, floating over
   unrelated rows and looking like it belonged to a different shipment. */
const PICKER_W = 320;
const PICKER_H = 360;
const PICKER_ARROW = 27; // library draws its arrow ~27px in from the popover's left edge

const pickerPos = (el, keepFlip) => {
    const r = el.getBoundingClientRect();
    // Shift left so the arrow — not the popover centre — points at the cell centre.
    const desired = r.left + r.width / 2 - PICKER_ARROW;
    const left = Math.max(8, Math.min(desired, window.innerWidth - PICKER_W - 8));

    /* Which side to open on is decided once, at open, and then carried through
       scrolling (keepFlip) — a calendar that hops from under the row to over it
       while you scroll is worse than one that runs a little off-screen. */
    const roomBelow = window.innerHeight - r.bottom - 8;
    const roomAbove = r.top - 8;
    const flip = keepFlip ?? (roomBelow < PICKER_H && roomAbove > roomBelow);

    /* The popover places itself relative to this wrapper, so the wrapper goes on
       the cell edge the popover grows AWAY from: `down` hangs it below, `up` pins
       its bottom edge to the wrapper top (bottom-full) and moves the arrow to its
       underside. The library's own mt-2.5/mb-2.5 supplies the gap either way. */
    return { top: flip ? r.top - 2 : r.bottom + 2, left, flip };
};

function DateCell({ rawDate, onOpen, onClear, urgency }) {
    const ref = useRef(null);
    const display = fmtDate(rawDate);

    // Countdown suffix for near/overdue arrivals: "in 3d" / "today" / "5d late".
    let countdown = null;
    if (urgency && rawDate) {
        const t = new Date(rawDate).getTime();
        if (!isNaN(t)) {
            const days = Math.floor((Date.now() - t) / 86400000);
            countdown = days > 0 ? `${days}d late` : days === 0 ? 'today' : `in ${-days}d`;
        }
    }

    // Arrival cells tint when cargo is overdue (red) or due within 7 days (amber);
    // neutral dates are flat like read-only cells, with a hover affordance only.
    const tint = urgency === 'overdue'
        ? { backgroundColor: 'var(--bad-bg)', border: '1px solid var(--bad-border)' }
        : urgency === 'soon'
        ? { backgroundColor: 'var(--warn-bg)', border: '1px solid var(--warn-border)' }
        : { backgroundColor: 'transparent', border: '1px solid transparent' };
    const textColor = urgency === 'overdue' ? 'var(--bad-text)'
        : urgency === 'soon' ? 'var(--warn-text)'
        : (display ? 'var(--ink)' : 'var(--ink-muted)');

    // Hands the cell itself up, not just coordinates: the picker has to be able to
    // re-measure this element on scroll to stay attached to it.
    const handleClick = (e) => {
        e.stopPropagation();
        if (ref.current) onOpen(ref.current);
    };

    return (
        <div
            ref={ref}
            className="h-7 responsiveTextTable flex items-center justify-center px-2 rounded-control cursor-pointer select-none w-full relative hover:!border-[var(--line-strong)] hover:!bg-[var(--bg-card)] transition-colors"
            style={{ ...tint, minWidth: '72px' }}
            onClick={handleClick}
        >
            <span style={{ color: textColor }}>
                {display || '—'}
            </span>
            {/* 500, not 600. This was the one genuinely bold thing inside a data row
                anywhere in the app, and it does not need to be: it already carries the
                danger colour, which is what marks it. */}
            {countdown && (
                <span className='font-medium whitespace-nowrap' style={{ color: textColor, fontSize: 'var(--fs-table)', marginLeft: 5, opacity: 0.85 }}>
                    · {countdown}
                </span>
            )}
            {display && (
                <button
                    onClick={(e) => { e.stopPropagation(); onClear(); }}
                    className="absolute right-1 top-1/2 -translate-y-1/2 text-[var(--regent-gray)] hover:text-red-400 transition-colors leading-none"
                    style={{ fontSize: 'var(--fs-title)' }}
                >×</button>
            )}
        </div>
    );
}

function FilterSelect({ value, onChange, placeholder, options }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const active = value !== '';
    const label = active ? options.find(o => o.id === value)?.label || placeholder : placeholder;

    return (
        <div ref={ref} className="relative">
            <button
                onClick={() => setOpen(p => !p)}
                className="flex items-center gap-1.5 font-normal px-2.5 py-0.5 rounded-lg border cursor-pointer focus:outline-none transition-colors whitespace-nowrap"
                style={{
                    fontSize: 'var(--fs-table)',
                    borderColor: active ? 'var(--endeavour)' : 'var(--line)',
                    color: active ? 'var(--on-brand)' : 'var(--chathams-blue)',
                    backgroundColor: active ? 'var(--endeavour)' : 'var(--bg-card)',
                }}
            >
                <span>{label}</span>
                <svg width="8" height="8" viewBox="0 0 10 10" fill="currentColor"><path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>
            </button>
            {open && (
                <div className="absolute z-dropdown top-full mt-1 left-0 rounded-2xl shadow-lg overflow-hidden" style={{ border: '1px solid var(--line-strong)', backgroundColor: "var(--bg-card)", minWidth: '140px', maxHeight: '220px', overflowY: 'auto' }}>
                    <div
                        onClick={() => { onChange(''); setOpen(false); }}
                        className="px-3 py-1.5 cursor-pointer transition-colors"
                        style={{ fontSize: 'var(--fs-table)', color: value === '' ? 'var(--endeavour)' : 'var(--chathams-blue)', fontWeight: value === '' ? 500 : 400, backgroundColor: value === '' ? 'var(--selago)' : 'var(--bg-card)' }}
                        onMouseEnter={e => { if (value !== '') e.currentTarget.style.backgroundColor = 'var(--bg-subtle)'; }}
                        onMouseLeave={e => { if (value !== '') e.currentTarget.style.backgroundColor = 'var(--bg-card)'; }}
                    >
                        {placeholder}
                    </div>
                    {options.map(o => (
                        <div
                            key={o.id}
                            onClick={() => { onChange(o.id); setOpen(false); }}
                            className="px-3 py-1.5 cursor-pointer transition-colors"
                            style={{ fontSize: 'var(--fs-table)', color: value === o.id ? 'var(--endeavour)' : 'var(--port-gore)', fontWeight: value === o.id ? 500 : 400, backgroundColor: value === o.id ? 'var(--selago)' : 'var(--bg-card)' }}
                            onMouseEnter={e => { if (value !== o.id) e.currentTarget.style.backgroundColor = 'var(--bg-subtle)'; }}
                            onMouseLeave={e => { if (value !== o.id) e.currentTarget.style.backgroundColor = 'var(--bg-card)'; }}
                        >
                            {o.label}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

/* Menu geometry. Rows are a fixed height, so the panel's height is known before it
   renders — that's what lets it choose a side to open on without measuring first
   and then jumping. Row height is the app's 28px control step. */
const STATUS_ROW_H = 28;
const STATUS_MENU_W = 176;
const STATUS_MENU_H = STATUSES.length * STATUS_ROW_H + 10 + 9; // + panel padding + divider

const statusMenuPos = (el, keepFlip) => {
    const r = el.getBoundingClientRect();
    const roomBelow = window.innerHeight - r.bottom - 8;
    // Decided once and carried through scrolling, so the panel can't hop sides
    // under the cursor. Same rule as the datepicker above.
    const flip = keepFlip ?? (roomBelow < STATUS_MENU_H && r.top - 8 > roomBelow);
    return {
        top: flip ? Math.max(8, r.top - STATUS_MENU_H - 4) : r.bottom + 4,
        left: Math.max(8, Math.min(r.left, window.innerWidth - STATUS_MENU_W - 8)),
        width: r.width,
        flip,
    };
};

function StatusSelect({ value, onChange }) {
    const [open, setOpen] = useState(false);
    const [pos, setPos] = useState({ top: 0, left: 0, width: 0, flip: false });
    // Which row the keyboard is on. Separate from `value`: you can walk the list
    // without committing, which is the whole point of arrow keys.
    const [activeIdx, setActiveIdx] = useState(0);
    const btnRef = useRef(null);
    const dropRef = useRef(null);

    useEffect(() => {
        const handler = (e) => {
            if (
                btnRef.current && !btnRef.current.contains(e.target) &&
                dropRef.current && !dropRef.current.contains(e.target)
            ) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    /* Follow the chip. The panel is position:fixed off a one-time measurement, so
       without this it hangs in the viewport while the row scrolls away under it —
       and in a table this long, that happens constantly. Capture phase: scroll
       doesn't bubble and the table scrolls in its own container. */
    useEffect(() => {
        if (!open) return;
        const sync = () => {
            const el = btnRef.current;
            if (!el) return;
            const r = el.getBoundingClientRect();
            if (r.bottom < 0 || r.top > window.innerHeight) { setOpen(false); return; }
            setPos(p => statusMenuPos(el, p.flip));
        };
        window.addEventListener('scroll', sync, true);
        window.addEventListener('resize', sync);
        return () => {
            window.removeEventListener('scroll', sync, true);
            window.removeEventListener('resize', sync);
        };
    }, [open]);

    // Move focus into the panel so the arrow keys have somewhere to land.
    useEffect(() => { if (open) dropRef.current?.focus(); }, [open]);

    const commit = (s) => {
        onChange(s);
        setOpen(false);
        btnRef.current?.focus();
    };

    const handleToggle = () => {
        if (!open && btnRef.current) {
            setPos(statusMenuPos(btnRef.current));
            setActiveIdx(Math.max(0, STATUSES.indexOf(value)));
        }
        setOpen(p => !p);
    };

    const handleMenuKeys = (e) => {
        const last = STATUSES.length - 1;
        if (e.key === 'Escape') { setOpen(false); btnRef.current?.focus(); }
        else if (e.key === 'ArrowDown') setActiveIdx(i => (i >= last ? 0 : i + 1));
        else if (e.key === 'ArrowUp') setActiveIdx(i => (i <= 0 ? last : i - 1));
        else if (e.key === 'Home') setActiveIdx(0);
        else if (e.key === 'End') setActiveIdx(last);
        else if (e.key === 'Enter' || e.key === ' ') commit(STATUSES[activeIdx]);
        else return;
        e.preventDefault();
    };

    // Lifecycle progress under the chip: Pending→Shipped→In Transit→Arrived→Completed.
    const LIFECYCLE = ['Pending', 'Shipped', 'In Transit', 'Arrived', 'Completed'];
    const stageIdx = LIFECYCLE.indexOf(value);
    const progress = value === 'On Hold' ? 0.5 : stageIdx >= 0 ? (stageIdx + 1) / LIFECYCLE.length : 0;
    const progressTone = value === 'On Hold' ? 'amber' : value === 'Completed' ? 'green' : 'brand';

    return (
        <div className="flex flex-col items-center gap-1">
            <div
                ref={btnRef}
                onClick={handleToggle}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleToggle(); } }}
                aria-haspopup="listbox"
                aria-expanded={open}
                className="px-2.5 py-0.5 rounded-lg font-medium responsiveTextTable text-center whitespace-nowrap cursor-pointer"
                style={STATUS_STYLES[value]}
            >
                {value || '— Select —'}
                <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" style={{ display: 'inline-block', marginLeft: 6, verticalAlign: 'middle', marginTop: -1, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 120ms ease-out' }}><path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>
            </div>
            {progress > 0 && <ProgressBar value={progress} tone={progressTone} width="76px" />}

            {/* The menu is a list of choices, not a stack of chips. Filling every row
                with its own status colour made six coloured bars in which Pending and
                On Hold (both warn) and Shipped and Arrived (both brand) were literally
                indistinguishable, and left nothing to show hover or the current value.
                A colour dot carries the same association, and frees the row itself to
                do what a menu row does: highlight under the cursor, tick what's set. */}
            {open && typeof document !== 'undefined' && createPortal(
                <div
                    ref={dropRef}
                    role="listbox"
                    tabIndex={-1}
                    onKeyDown={handleMenuKeys}
                    className="shadow-lg menu-pop"
                    style={{
                        position: 'fixed', top: pos.top, left: pos.left,
                        minWidth: Math.max(pos.width, STATUS_MENU_W), zIndex: 99999,
                        border: '1px solid var(--line)', borderRadius: 'var(--radius-card)',
                        backgroundColor: 'var(--bg-card)', padding: '5px', outline: 'none',
                        transformOrigin: pos.flip ? 'bottom center' : 'top center',
                    }}
                >
                    {STATUSES.map((s, i) => {
                        const selected = s === value;
                        const active = i === activeIdx;
                        return (
                            /* Fragment, not a wrapper div: an option has to be a direct
                               child of the listbox for screen readers to count the list. */
                            <Fragment key={s || 'none'}>
                                <div
                                    role="option"
                                    aria-selected={selected}
                                    onMouseEnter={() => setActiveIdx(i)}
                                    onClick={() => commit(s)}
                                    className="flex items-center gap-2 px-2 cursor-pointer responsiveTextTable transition-colors"
                                    style={{
                                        height: `${STATUS_ROW_H - 2}px`,
                                        borderRadius: 'var(--radius-control)',
                                        background: active ? 'var(--bg-subtle)' : 'transparent',
                                        color: selected ? 'var(--ink)' : 'var(--ink-secondary)',
                                        fontWeight: selected ? '500' : '400',
                                    }}
                                >
                                    {/* Hollow for "No status" — an absence shouldn't read as a state. */}
                                    <span style={{
                                        width: '7px', height: '7px', borderRadius: '50%', flexShrink: 0,
                                        backgroundColor: s ? STATUS_STYLES[s]?.color : 'transparent',
                                        border: s ? 'none' : '1px solid var(--line-strong)',
                                    }} />
                                    <span className="flex-1 whitespace-nowrap">{s || 'No status'}</span>
                                    {selected && <Check size={13} strokeWidth={2.5} style={{ color: 'var(--brand)', flexShrink: 0 }} />}
                                </div>
                                {/* Clearing the status is a different kind of act from setting one. */}
                                {i === 0 && <div aria-hidden="true" style={{ height: '1px', backgroundColor: 'var(--line)', margin: '4px 6px' }} />}
                            </Fragment>
                        );
                    })}
                </div>,
                document.body
            )}
        </div>
    );
}

const ShipmentPage = () => {
    const { settings, dateSelect, loading, setLoading } = useContext(SettingsContext);
    const { uidCollection, logActivity } = UserAuth();
    const router = useRouter();

    const [contracts, setContracts] = useState([]);
    const [invoiceMap, setInvoiceMap] = useState({});
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    // Group rows into collapsible lifecycle sections (persisted; set in an effect
    // rather than the initializer so SSR and first client render agree).
    const [groupByStatus, setGroupByStatus] = useState(true);
    const [collapsedGroups, setCollapsedGroups] = useState(() => new Set());
    useEffect(() => {
        try { setGroupByStatus(localStorage.getItem('ims:shipGroupByStatus') !== '0'); } catch { }
    }, []);
    const toggleGroupByStatus = () => setGroupByStatus(v => {
        const nv = !v;
        try { localStorage.setItem('ims:shipGroupByStatus', nv ? '1' : '0'); } catch { }
        return nv;
    });
    const toggleGroup = (s) => setCollapsedGroups(prev => {
        const next = new Set(prev);
        if (next.has(s)) next.delete(s); else next.add(s);
        return next;
    });
    const [showFilters, setShowFilters] = useState(true);
    const [pageIndex, setPageIndex] = useState(0);
    const [pageSize, setPageSize] = useState(25);
    const [sortCol, setSortCol] = useState('updated');
    const [sortDir, setSortDir] = useState('desc');
    const [supplierFilter, setSupplierFilter] = useState('');
    const [clientFilter, setClientFilter] = useState('');
    const [shipTypeFilter, setShipTypeFilter] = useState('');
    const [urgencyFilter, setUrgencyFilter] = useState('');

    // Shared floating datepicker (always mounted, repositioned on cell click)
    const [floatingPicker, setFloatingPicker] = useState(null);
    // { contractId, field, contractDate, anchor: <the cell el>, pos: { top, left } }
    const [floatingValue, setFloatingValue] = useState({ startDate: null, endDate: null });
    const floatingPickerRef = useRef(null);
    /* The open cell, pulled out because the effects below key off *which* cell is
       open, not off the position — which changes on every scroll frame. Depending
       on the whole floatingPicker object would re-subscribe them each frame and
       re-focus the input mid-scroll. */
    const pickerAnchor = floatingPicker?.anchor ?? null;

    const handleSort = (col) => {
        if (sortCol === col) {
            if (sortDir === 'asc') setSortDir('desc');
            else if (sortDir === 'desc') { setSortCol(null); setSortDir('asc'); }
        } else {
            setSortCol(col);
            setSortDir('asc');
        }
        setPageIndex(0);
    };

    useEffect(() => {
        if (!uidCollection || !dateSelect?.start) return;
        const load = async () => {
            setLoading(true);
            try {
                const contractsData = await loadData(uidCollection, 'contracts', dateSelect);

                const baseContracts = (contractsData || []).filter(Boolean)
                    .map(c => ({ ...c, shipmentStatus: normalizeStatus(c.shipmentStatus) }))
                    .sort((a, b) => (a.date || '').localeCompare(b.date || ''));

                // Seed "last update" from the activity feed so the Recently-Updated sort is
                // useful immediately — status/ETD/ETA edits are logged with ms timestamps even
                // for contracts touched before the shipmentUpdatedAt field existed. Best-effort.
                const actMap = {};
                try {
                    // Server-side type-prefix query fetches only 'shipment.*' events instead of
                    // the whole activity log. The explicit entityType check below keeps the old
                    // pipeline's contract-only filter (e.g. 'shipment.updated' invoice events
                    // from the PnL tab were excluded before and stay excluded).
                    const acts = await loadActivityByTypePrefix(uidCollection, 'shipment.', { max: 5000 });
                    acts.forEach(r => {
                        if (r.entityType === 'contract' && typeof r.type === 'string' && r.type.startsWith('shipment.') && r.entityId && r.createdAtMs
                            && (!actMap[r.entityId] || r.createdAtMs > actMap[r.entityId])) {
                            actMap[r.entityId] = r.createdAtMs;
                        }
                    });
                } catch { /* activity feed is optional; fall back to stored timestamps only */ }

                const sortedContracts = baseContracts.map(c => {
                    const eff = Math.max(c.shipmentUpdatedAt || 0, actMap[c.id] || 0);
                    return eff ? { ...c, shipmentUpdatedAt: eff } : c;
                });
                setContracts(sortedContracts);

                // Load invoices spanning all years found in contract invoice dates
                // so delivered contracts with older invoices still show data
                const invYears = sortedContracts.flatMap(c =>
                    (c.invoices || []).map(inv => (inv.date || '').substring(0, 4)).filter(Boolean)
                );
                let invoicesData = [];
                if (invYears.length > 0) {
                    const minYr = invYears.reduce((a, b) => a < b ? a : b);
                    const maxYr = invYears.reduce((a, b) => a > b ? a : b);
                    invoicesData = await loadData(uidCollection, 'invoices', {
                        start: minYr + '-01-01',
                        end: maxYr + '-12-31',
                    });
                } else {
                    invoicesData = await loadData(uidCollection, 'invoices', dateSelect);
                }

                const map = {};
                (invoicesData || []).filter(Boolean).forEach(inv => {
                    const cid = inv.poSupplier?.id;
                    if (cid && inv.invType === '1111' && !map[cid]) {
                        map[cid] = {
                            client: inv.client,
                            etd: inv.shipData?.etd?.startDate || null,
                            eta: inv.shipData?.eta?.startDate || null,
                            pol: inv.pol || null,
                            pod: inv.pod || null,
                            shpType: inv.shpType || null,
                        };
                    }
                });

                setInvoiceMap(map);
            } finally {
                setLoading(false);
            }
        };

        if (!uidCollection) return;
        load();
        
    }, [uidCollection, dateSelect]);

    const getSupplierName = (contract) => {
        const sups = settings?.Supplier?.Supplier;
        if (!sups) return '—';
        return sups.find(s => s.id === contract.supplier)?.nname ||
               sups.find(s => s.id === contract.supplier)?.supplier || '—';
    };

    const getClientName = (contractId) => {
        const clts = settings?.Client?.Client;
        const inv = invoiceMap[contractId];
        if (!clts || !inv) return '—';
        return clts.find(c => c.id === inv.client)?.nname ||
               clts.find(c => c.id === inv.client)?.client || '—';
    };

    // Direct contract date overrides invoice date; falls back to invoice date if not set
    const getRawETD = (contract) => contract.shipmentEtd || invoiceMap[contract.id]?.etd || '';
    const getRawETA = (contract) => contract.shipmentEta || invoiceMap[contract.id]?.eta || '';

    // Stamp the "last update" clock locally (Firestore is written alongside by each
    // caller). Drives the Recently-Updated sort + the Last Update column.
    const touchContract = (contractId, ts) =>
        setContracts(prev => prev.map(c => c.id === contractId ? { ...c, shipmentUpdatedAt: ts } : c));

    const relTime = (ms) => {
        if (!ms) return '—';
        const diff = Date.now() - ms;
        const min = Math.floor(diff / 60000);
        if (min < 1) return 'just now';
        if (min < 60) return `${min}m ago`;
        const hr = Math.floor(min / 60);
        if (hr < 24) return `${hr}h ago`;
        const day = Math.floor(hr / 24);
        if (day < 30) return `${day}d ago`;
        const mo = Math.floor(day / 30);
        if (mo < 12) return `${mo}mo ago`;
        return `${Math.floor(mo / 12)}y ago`;
    };
    const isRecent = (ms) => !!ms && (Date.now() - ms) < 48 * 3600 * 1000;

    // Arrival urgency for at-a-glance triage (mirrors the bell reminders): cargo past
    // its ETA is "overdue"; due within the next 7 days is "soon". Completed cargo is calm.
    const getUrgency = (contract) => {
        if ((contract.shipmentStatus || '') === 'Completed') return null;
        const etaStr = getRawETA(contract);
        if (!etaStr) return null;
        const eta = new Date(etaStr);
        if (isNaN(eta.getTime())) return null;
        const days = Math.floor((Date.now() - eta.getTime()) / 86400000);
        if (days > 0) return 'overdue';
        if (days >= -7) return 'soon';
        return null;
    };

    const handleDateFieldChange = (contractId, field, value) => {
        setContracts(prev => prev.map(c => c.id === contractId ? { ...c, [field]: value } : c));
    };

    const openFloatingPicker = (anchor, contract, field) => {
        if (!anchor) return;
        const rawDate = field === 'shipmentEtd' ? getRawETD(contract) : getRawETA(contract);
        setFloatingValue({ startDate: rawDate || null, endDate: rawDate || null });
        setFloatingPicker({ contractId: contract.id, field, contractDate: contract.date, anchor, pos: pickerPos(anchor) });
    };

    // Click the datepicker input after it mounts (conditional render = always fresh/closed state)
    useEffect(() => {
        if (!pickerAnchor) return;
        const timer = setTimeout(() => {
            floatingPickerRef.current?.querySelector('input')?.focus();
        }, 0);
        return () => clearTimeout(timer);
    }, [pickerAnchor]);

    /* Keep the picker attached to the cell it was opened from. It's position:fixed
       with coordinates measured once at click time, so without this it hung in the
       viewport while the table scrolled away underneath — pointing at whichever row
       happened to slide under it. Re-measure instead, and close once the cell is
       scrolled out of sight, since there's nothing left to point at.

       Capture phase: scroll events don't bubble, and the table scrolls in its own
       container, so a listener bound to window in the bubble phase never hears it. */
    useEffect(() => {
        if (!pickerAnchor) return;
        const sync = () => {
            const r = pickerAnchor.getBoundingClientRect();
            if (!pickerAnchor.isConnected || r.bottom < 0 || r.top > window.innerHeight) {
                setFloatingPicker(null);
                return;
            }
            setFloatingPicker(p => p ? { ...p, pos: pickerPos(pickerAnchor, p.pos.flip) } : p);
        };
        window.addEventListener('scroll', sync, true);
        window.addEventListener('resize', sync);
        return () => {
            window.removeEventListener('scroll', sync, true);
            window.removeEventListener('resize', sync);
        };
    }, [pickerAnchor]);

    const handleFloatingPickerChange = (val) => {
        const d = val?.startDate || '';
        if (floatingPicker) {
            const ts = Date.now();
            handleDateFieldChange(floatingPicker.contractId, floatingPicker.field, d);
            touchContract(floatingPicker.contractId, ts);
            updateContractField(uidCollection, floatingPicker.contractId, floatingPicker.contractDate, { [floatingPicker.field]: d, shipmentUpdatedAt: ts });
            // Track who set ETD/ETA + when in the activity log (no bell ping — the
            // proactive date-reached reminders below are the notifications).
            if (d) {
                const order = contracts.find(c => c.id === floatingPicker.contractId)?.order ?? '';
                const isEtd = floatingPicker.field === 'shipmentEtd';
                logActivity?.({
                    type: isEtd ? 'shipment.etd' : 'shipment.eta', entityType: 'contract',
                    entityId: floatingPicker.contractId || '', entityLabel: `PO ${order}`, action: 'date',
                    message: `${isEtd ? 'ETD' : 'ETA'} set for PO ${order}: ${d}`,
                    notify: false,
                });
            }
        }
        setFloatingPicker(null);
    };

    // Close floating picker on outside click
    useEffect(() => {
        if (!pickerAnchor) return;
        const handler = (e) => {
            if (!floatingPickerRef.current?.contains(e.target)) setFloatingPicker(null);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [pickerAnchor]);

    const getPOL = (contract) => {
        const list = settings?.POL?.POL;
        const polId = invoiceMap[contract.id]?.pol || contract.pol;
        if (!list || !polId) return '—';
        return list.find(p => p.id === polId)?.pol || '—';
    };

    const getPOD = (contract) => {
        const list = settings?.POD?.POD;
        const podId = invoiceMap[contract.id]?.pod || contract.pod;
        if (!list || !podId) return '—';
        return list.find(p => p.id === podId)?.pod || '—';
    };

    const SHP_TYPE_MAP = { '323': 'Container', '434': 'Truck', '565': 'Container+', '787': 'Flight' };
    const getShpType = (contract) => {
        const shpType = invoiceMap[contract.id]?.shpType || contract.shpType;
        if (!shpType) return '—';
        return SHP_TYPE_MAP[shpType] || shpType;
    };

    const getMainInvoice = (contract) => {
        if (!contract.invoices?.length) return null;
        return contract.invoices.find(i => i.invType === '1111') || contract.invoices[0];
    };

    const handleStatusChange = async (contract, status) => {
        const ts = Date.now();
        setContracts(prev =>
            prev.map(c => c.id === contract.id ? { ...c, shipmentStatus: status, shipmentUpdatedAt: ts } : c)
        );
        await updateContractField(uidCollection, contract.id, contract.date, { shipmentStatus: status, shipmentUpdatedAt: ts });
        // Notify the team when cargo moves through the pipeline (skip when cleared).
        if (status) {
            logActivity?.({
                type: 'shipment.status', entityType: 'contract', entityId: contract.id || '',
                entityLabel: `PO ${contract.order ?? ''}`, action: 'status',
                message: `Cargo (PO ${contract.order ?? ''}) marked "${status}"`,
                notify: true,
                severity: status === 'Completed' ? 'success' : status === 'On Hold' ? 'warning' : 'info',
            });
        }
    };

    // Proactive shipment reminders (date-derived). One per shipment, idempotent
    // (keyed by the date) so repeated visits don't duplicate. Priority: 14-days-
    // past-ETA > ETA reached > ETD reached. Delivered cargo is skipped.
    const shipScanRef = useRef(false);
    useEffect(() => {
        if (!uidCollection || shipScanRef.current || !contracts.length) return;
        shipScanRef.current = true;
        const now = Date.now();
        // Collected per contract, then created in ONE batched existence-check +
        // create-only write pass — instead of one getDoc per reminder per visit.
        const reminders = [];
        contracts.forEach(c => {
            const status = c.shipmentStatus || '';
            const order = c.order ?? '';
            const etaStr = c.shipmentEta || invoiceMap[c.id]?.eta;
            const etdStr = c.shipmentEtd || invoiceMap[c.id]?.etd;
            // Cleared/arrived cargo: drop any standing ETA/ETD reminders so they leave the bell.
            if (status === 'Completed') {
                if (etaStr) { deleteNotification(uidCollection, `eta14:${c.id}:${etaStr}`); deleteNotification(uidCollection, `etadue:${c.id}:${etaStr}`); }
                if (etdStr) deleteNotification(uidCollection, `etddue:${c.id}:${etdStr}`);
                return;
            }
            const eta = etaStr ? new Date(etaStr) : null;
            if (eta && !isNaN(eta.getTime())) {
                const days = Math.floor((now - eta.getTime()) / 86400000);
                if (days >= 14) {
                    reminders.push({
                        id: `eta14:${c.id}:${etaStr}`,
                        payload: {
                            type: 'shipment.eta14', entityType: 'contract', entityId: c.id || '',
                            entityLabel: `PO ${order}`, action: 'reminder', severity: 'warning',
                            message: `PO ${order}: ${days} days since ETA (${etaStr})${status ? ` — "${status}"` : ''}, follow up`,
                        },
                    });
                    return;
                }
                if (days >= 0) {
                    reminders.push({
                        id: `etadue:${c.id}:${etaStr}`,
                        payload: {
                            type: 'shipment.eta', entityType: 'contract', entityId: c.id || '',
                            entityLabel: `PO ${order}`, action: 'reminder', severity: 'info',
                            message: `PO ${order}: arrival due (ETA ${etaStr})${status ? ` — "${status}"` : ''}`,
                        },
                    });
                    return;
                }
            }
            const etd = etdStr ? new Date(etdStr) : null;
            if (etd && !isNaN(etd.getTime()) && now >= etd.getTime() && (!status || status === 'Pending')) {
                reminders.push({
                    id: `etddue:${c.id}:${etdStr}`,
                    payload: {
                        type: 'shipment.etd', entityType: 'contract', entityId: c.id || '',
                        entityLabel: `PO ${order}`, action: 'reminder', severity: 'info',
                        message: `PO ${order}: departure due (ETD ${etdStr})`,
                    },
                });
            }
        });
        ensureNotificationsBatch(uidCollection, reminders);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [contracts, uidCollection]);

    const handleNotesChange = (contractId, value) => {
        setContracts(prev =>
            prev.map(c => c.id === contractId ? { ...c, shipmentNotes: value } : c)
        );
    };

    const navigateTo = (contractId) => {
        router.push(`/contracts?openId=${contractId}`);
    };

    const formatDate = (d) => {
        if (!d) return '—';
        try {
            return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }).replace(/\//g, '.');
        } catch { return d; }
    };

    // Unique suppliers/clients/shiptypes present in the loaded contracts (for filter dropdowns)
    const uniqueSupplierIds = [...new Set(contracts.map(c => c.supplier).filter(Boolean))];
    const uniqueClientIds = [...new Set(contracts.map(c => invoiceMap[c.id]?.client).filter(Boolean))];
    const uniqueShipTypeIds = [...new Set(contracts.map(c => invoiceMap[c.id]?.shpType || c.shpType).filter(Boolean))];

    // Triage counts for the attention strip (computed over everything loaded, like the status chips)
    const overdueCount = contracts.filter(c => getUrgency(c) === 'overdue').length;
    const soonCount = contracts.filter(c => getUrgency(c) === 'soon').length;
    const inTransitCount = contracts.filter(c => (c.shipmentStatus || '') === 'In Transit').length;

    // Filter contracts by search + status + supplier + client + ship type
    const filtered = contracts.filter(c => {
        const matchStatus = statusFilter === '' || (c.shipmentStatus || '') === statusFilter;
        if (!matchStatus) return false;
        const matchSupplier = supplierFilter === '' || c.supplier === supplierFilter;
        if (!matchSupplier) return false;
        const matchClient = clientFilter === '' || invoiceMap[c.id]?.client === clientFilter;
        if (!matchClient) return false;
        const matchShipType = shipTypeFilter === '' || (invoiceMap[c.id]?.shpType || c.shpType) === shipTypeFilter;
        if (!matchShipType) return false;
        if (urgencyFilter !== '' && getUrgency(c) !== urgencyFilter) return false;
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        const inv = getMainInvoice(c);
        return (
            (c.order || '').toLowerCase().includes(q) ||
            getSupplierName(c).toLowerCase().includes(q) ||
            getClientName(c.id).toLowerCase().includes(q) ||
            (inv?.invoice?.toString() || '').includes(q)
        );
    });

    const getSortValue = (c, col) => {
        const inv = getMainInvoice(c);
        switch (col) {
            case 'order':        return (c.order || '').toLowerCase();
            case 'supplier':     return getSupplierName(c).toLowerCase();
            case 'invoice':      return inv?.invoice?.toString().toLowerCase() || '';
            case 'client':       return getClientName(c.id).toLowerCase();
            case 'etd':          return getRawETD(c);
            case 'eta':          return getRawETA(c);
            case 'pol':          return getPOL(c).toLowerCase();
            case 'pod':          return getPOD(c).toLowerCase();
            case 'shpType':      return getShpType(c).toLowerCase();
            case 'status':       return (c.shipmentStatus || '').toLowerCase();
            case 'updated':      return c.shipmentUpdatedAt || 0;
            default:             return '';
        }
    };

    const sortedFiltered = sortCol
        ? [...filtered].sort((a, b) => {
            const av = getSortValue(a, sortCol);
            const bv = getSortValue(b, sortCol);
            const cmp = av < bv ? -1 : av > bv ? 1 : 0;
            return sortDir === 'asc' ? cmp : -cmp;
          })
        : filtered;

    // Reset to first page when filters change
    useEffect(() => { setPageIndex(0); }, [search, statusFilter, supplierFilter, clientFilter, shipTypeFilter, urgencyFilter]);

    const pageCount = Math.max(1, Math.ceil(sortedFiltered.length / pageSize));
    const safePageIndex = Math.min(pageIndex, pageCount - 1);
    const paginated = sortedFiltered.slice(safePageIndex * pageSize, (safePageIndex + 1) * pageSize);
    const startRow = sortedFiltered.length === 0 ? 0 : safePageIndex * pageSize + 1;
    const endRow = safePageIndex * pageSize + paginated.length;

    // Collapsible status sections (current page only — pagination stays intact).
    // Grouping is skipped while a specific status filter is active (pointless then).
    const GROUP_ORDER = ['Pending', 'Shipped', 'In Transit', 'Arrived', 'Completed', 'On Hold', ''];
    const groupingActive = groupByStatus && statusFilter === '';
    const displayRows = !groupingActive
        ? paginated.map(c => ({ type: 'row', contract: c }))
        : GROUP_ORDER.flatMap(s => {
            const items = paginated.filter(c => normalizeStatus(c.shipmentStatus || '') === s);
            if (!items.length) return [];
            const collapsed = collapsedGroups.has(s);
            return [
                { type: 'header', status: s, count: items.length, collapsed },
                ...(collapsed ? [] : items.map(c => ({ type: 'row', contract: c }))),
            ];
        });

    /* The table's own scroll box, same as every other main table in the app.
       This page had none: the table ran at its natural height and the page itself
       scrolled, so a sticky header had nothing to stick to — it would have pinned
       to the layout's scroller and slid under the fixed MainNav. With a box of its
       own the header pins to the box, the toolbar and pagination footer stay put
       either side of it, and the horizontal scroll the auto layout relies on lives
       on the same element.

       44 per row, not 40: a row here carries a Notes <textarea>, and grouping adds
       section header rows to the same list, which is why this measures displayRows
       rather than the page slice. */
    const dynamicMaxHeight = displayRows.length > 0
        ? `${Math.min(displayRows.length * 44 + 120, 700)}px`
        : '320px';

    const getPageNumbers = () => {
        const pages = [];
        const maxVisible = 5;
        let start = Math.max(0, safePageIndex - Math.floor(maxVisible / 2));
        let end = Math.min(pageCount, start + maxVisible);
        if (end - start < maxVisible) start = Math.max(0, end - maxVisible);
        for (let i = start; i < end; i++) pages.push(i);
        return pages;
    };

    const exportExcel = async () => {
        const { Workbook } = await import('exceljs');
        const wb = new Workbook();
        wb.creator = 'IMS';
        const sheet = wb.addWorksheet('Shipments Tracking');
        sheet.columns = [
            { header: 'Contract #',    key: 'order',          width: 18 },
            { header: 'Supplier',      key: 'supplier',       width: 20 },
            { header: 'Invoice #',     key: 'invoice',        width: 14 },
            { header: 'Client',        key: 'client',         width: 20 },
            { header: 'Shipment Date', key: 'shipmentDate',   width: 16 },
            { header: 'Arrival Date',  key: 'arrivalDate',    width: 16 },
            { header: 'POL',           key: 'pol',            width: 16 },
            { header: 'POD',           key: 'pod',            width: 16 },
            { header: 'Ship Type',     key: 'shpType',        width: 14 },
            { header: 'Status',        key: 'status',         width: 14 },
            { header: 'Last Update',   key: 'lastUpdate',     width: 20 },
            { header: 'Notes',         key: 'notes',          width: 40 },
        ];
        sheet.getRow(1).font = { bold: true };
        sortedFiltered.forEach(c => {
            const inv = getMainInvoice(c);
            sheet.addRow({
                order:        c.order || '',
                supplier:     getSupplierName(c),
                invoice:      inv?.invoice || '',
                client:       getClientName(c.id),
                shipmentDate: formatDate(getRawETD(c)),
                arrivalDate:  formatDate(getRawETA(c)),
                pol:          getPOL(c),
                pod:          getPOD(c),
                shpType:      getShpType(c),
                status:       c.shipmentStatus || '',
                lastUpdate:   c.shipmentUpdatedAt ? new Date(c.shipmentUpdatedAt).toLocaleString('en-GB') : '',
                notes:        c.shipmentNotes || '',
            });
        });
        const buf = await wb.xlsx.writeBuffer();
        saveAs(new Blob([buf]), 'Shipments_Tracking.xlsx');
    };

    if (Object.keys(settings).length === 0) {
        return <div className="mx-auto w-full max-w-full px-2 md:px-4 pb-4 mt-[72px]"><TableSkeleton /></div>;
    }

    return (
        <div className="w-full" style={{ background: 'var(--bg-page)' }}>
        <style jsx global>{`
            /* .custom-table th/td now live in globals.css — one definition for
               every table in the app. */
            .td-truncate {
                overflow: hidden !important;
            }
            .td-truncate .pill-inner {
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }
            .date-cell-clean button.absolute {
                display: none !important;
            }
            .date-cell-clean {
                position: relative;
                z-index: 20;
            }
        `}</style>

            {/* Floating datepicker — portal to body so position:absolute is doc-relative, immune to transforms */}
            {floatingPicker && typeof document !== 'undefined' && createPortal(
                <div
                    ref={floatingPickerRef}
                    className="date-cell-clean"
                    style={{ position: 'fixed', top: floatingPicker.pos.top, left: floatingPicker.pos.left, zIndex: 99999 }}
                >
                    <Datepicker
                        useRange={false}
                        asSingle={true}
                        value={floatingValue}
                        onChange={handleFloatingPickerChange}
                        displayFormat="DD.MM.YY"
                        popoverDirection={floatingPicker.pos.flip ? 'up' : 'down'}
                        inputClassName="opacity-0 h-0 w-0 p-0 border-0 absolute overflow-hidden"
                    />
                </div>,
                document.body
            )}

            <div className="mx-auto w-full max-w-full px-1 md:px-2 pb-4 mt-[72px]">
                <VideoLoader loading={loading} fullScreen={true} />
                <Toast />

                {/* This used to be an outer card — border, --bg-subtle and its own
                    padding — wrapping BOTH the title and the table card below. No other
                    page does that, which is the extra border this page had and contracts
                    does not, and it is why the heading looked different: same
                    .text-display, but on a tinted bordered panel instead of the page.

                    The element stays as a plain grouping div so the table card keeps its
                    place in the tree and the diff stays small. The header inside is now
                    the contracts markup verbatim, .page-header included — that class
                    carries the rise-in entrance the other pages' headers have. */}
                <div className="w-full">
                    <div className="page-header flex items-end justify-between flex-wrap gap-2 mt-6 mb-3 px-1">
                        <div>
                            <h1 className="text-display">Shipments Tracking</h1>
                            <p className="responsiveTextInput text-[var(--ink-muted)] mt-0.5">Live shipment statuses</p>
                        </div>
                    </div>

                    {/* Inner card — toolbar + table */}
                    <div className="relative rounded-2xl" style={{ background: 'var(--bg-subtle)' }}>
                      <div className="absolute inset-0 rounded-2xl border border-[var(--line)] pointer-events-none z-sticky" />

                    {/* Toolbar */}
                    <div
                        className="flex flex-col sm:flex-row sm:justify-between sm:items-center px-2 py-2 gap-2 rounded-t-2xl"
                        style={{ borderBottom: '1px solid var(--line)', background: "var(--bg-card)" }}
                    >
                        {/* Left: Search + Status filter chips */}
                        <div className="flex flex-wrap items-center gap-2">

                            {/* Search */}
                            <div className="flex items-center relative w-[120px] sm:w-[140px] h-7 border border-[var(--line)] rounded-2xl bg-[var(--bg-card)] focus-within:ring-1 focus-within:ring-blue-200 shadow-sm transition-all duration-200">
                                <input
                                    className="bg-[var(--bg-card)] border-0 shadow-none pr-8 pl-3 focus:outline-none focus:ring-0 w-full text-[var(--chathams-blue)] placeholder:text-[var(--chathams-blue)] h-full responsiveTextTableTitle font-medium rounded-2xl"
                                    placeholder="Search"
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    type="text"
                                />
                                {search === '' ? (
                                    <FaSearch className="text-[var(--regent-gray)] absolute right-3 top-1.5" style={{ fontSize: 14 }} />
                                ) : (
                                    <TiDeleteOutline
                                        className="text-[var(--regent-gray)] absolute right-3 top-2 cursor-pointer hover:text-red-500 transition-colors"
                                        onClick={() => setSearch('')}
                                        style={{ fontSize: 16 }}
                                    />
                                )}
                            </div>

                            {/* Chat */}
                            <Tltip direction="bottom" tltpText="Ask question">
                                <div
                                    onClick={() => { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('ims:openChat')); }}
                                    className="w-8 h-8 inline-flex items-center justify-center rounded hover:bg-[var(--selago)] cursor-pointer text-[var(--endeavour)] transition-colors"
                                >
                                    <MessageSquare className="w-4 h-4" strokeWidth={2} />
                                </div>
                            </Tltip>

                            {/* Excel export */}
                            <Tltip direction="bottom" tltpText="Export to Excel">
                                <div
                                    onClick={exportExcel}
                                    className="w-8 h-8 inline-flex items-center justify-center rounded hover:bg-[var(--selago)] cursor-pointer text-[var(--endeavour)] transition-colors"
                                >
                                    <FileSpreadsheet size={16} />
                                </div>
                            </Tltip>

                            {/* Filter icon — toggles status chips */}
                            <Tltip direction="bottom" tltpText="Filters">
                                <button
                                    onClick={() => setShowFilters(p => !p)}
                                    className={`w-8 h-8 inline-flex items-center justify-center rounded hover:bg-[var(--selago)] cursor-pointer text-[var(--endeavour)] transition-colors ${showFilters ? 'bg-[var(--selago)]' : ''}`}
                                >
                                    <Filter className="w-4 h-4" strokeWidth={2} />
                                </button>
                            </Tltip>

                            {/* Status filter chips + Supplier / Client dropdowns */}
                            {showFilters && <div className="flex items-center gap-1 flex-wrap">
                                <button
                                    onClick={() => setStatusFilter('')}
                                    className={`font-normal px-2.5 py-0.5 rounded-lg border transition-colors ${statusFilter === '' ? 'bg-[var(--endeavour)] text-[var(--on-brand)] border-[var(--endeavour)]' : 'bg-[var(--bg-card)] text-[var(--endeavour)] border-[var(--endeavour)] hover:bg-[var(--selago)]'}`}
                                    style={{ fontSize: 'var(--fs-table)' }}
                                >
                                    All ({contracts.length})
                                </button>
                                {STATUSES.filter(Boolean).map(s => {
                                    const count = contracts.filter(c => (c.shipmentStatus || '') === s).length;
                                    return (
                                        <button
                                            key={s}
                                            onClick={() => setStatusFilter(prev => prev === s ? '' : s)}
                                            className="font-normal px-2.5 py-0.5 rounded-lg transition-all"
                                            style={{ ...STATUS_STYLES[s], fontSize: 'var(--fs-table)', opacity: statusFilter === s ? 1 : 0.75, outline: statusFilter === s ? `2px solid ${STATUS_STYLES[s].color}` : 'none', outlineOffset: '1px' }}
                                        >
                                            {s}: {count}
                                        </button>
                                    );
                                })}

                                <span className='h-4 w-px bg-[var(--line-strong)] mx-0.5' aria-hidden='true' />
                                <button
                                    onClick={toggleGroupByStatus}
                                    title='Collapse the table into per-status sections'
                                    className='font-normal px-2.5 py-0.5 rounded-lg border transition-colors'
                                    style={{
                                        fontSize: 'var(--fs-table)',
                                        background: groupByStatus ? 'var(--brand-soft)' : 'var(--bg-card)',
                                        color: groupByStatus ? 'var(--brand)' : 'var(--ink-secondary)',
                                        borderColor: groupByStatus ? 'var(--brand-border)' : 'var(--line)',
                                    }}
                                >
                                    Group by status
                                </button>

                                {/* Supplier filter */}
                                <FilterSelect
                                    value={supplierFilter}
                                    onChange={setSupplierFilter}
                                    placeholder="All Suppliers"
                                    options={uniqueSupplierIds.flatMap(id => {
                                        const s = settings?.Supplier?.Supplier?.find(x => x.id === id);
                                        return s ? [{ id, label: s.nname || s.supplier }] : [];
                                    })}
                                />

                                {/* Client filter */}
                                <FilterSelect
                                    value={clientFilter}
                                    onChange={setClientFilter}
                                    placeholder="All Clients"
                                    options={uniqueClientIds.flatMap(id => {
                                        const c = settings?.Client?.Client?.find(x => x.id === id);
                                        return c ? [{ id, label: c.nname || c.client }] : [];
                                    })}
                                />

                                {/* Ship Type filter */}
                                <FilterSelect
                                    value={shipTypeFilter}
                                    onChange={setShipTypeFilter}
                                    placeholder="All Ship Types"
                                    options={uniqueShipTypeIds.map(id => ({ id, label: SHP_TYPE_MAP[id] || id }))}
                                />
                            </div>}

                        </div>

                        {/* Right: DateRangePicker */}
                        <div className="flex-shrink-0">
                            <DateRangePicker />
                        </div>
                    </div>

                    {/* Attention strip — fastest path to what needs action; chips filter the table */}
                    {(overdueCount + soonCount + inTransitCount) > 0 && (
                        <div className="flex items-center gap-2 px-3 py-1.5 flex-wrap" style={{ background: "var(--bg-card)", borderBottom: '1px solid var(--line)' }}>
                            <span className="responsiveTextTable font-medium tracking-wider" style={{ color: 'var(--regent-gray)' }}>NEEDS ATTENTION</span>
                            {overdueCount > 0 && (
                                <button
                                    onClick={() => setUrgencyFilter(prev => prev === 'overdue' ? '' : 'overdue')}
                                    className="font-normal px-2.5 py-0.5 rounded-lg transition-all"
                                    style={{ fontSize: 'var(--fs-table)', backgroundColor: 'var(--bad-bg)', border: '1px solid var(--bad-border)', color: 'var(--bad-text)', outline: urgencyFilter === 'overdue' ? '2px solid var(--bad-text)' : 'none', outlineOffset: '1px' }}
                                >
                                    {overdueCount} overdue
                                </button>
                            )}
                            {soonCount > 0 && (
                                <button
                                    onClick={() => setUrgencyFilter(prev => prev === 'soon' ? '' : 'soon')}
                                    className="font-normal px-2.5 py-0.5 rounded-lg transition-all"
                                    style={{ fontSize: 'var(--fs-table)', backgroundColor: 'var(--warn-bg)', border: '1px solid var(--warn-border)', color: 'var(--warn-text)', outline: urgencyFilter === 'soon' ? '2px solid var(--warn-text)' : 'none', outlineOffset: '1px' }}
                                >
                                    {soonCount} arriving ≤7d
                                </button>
                            )}
                            {inTransitCount > 0 && (
                                <button
                                    onClick={() => setStatusFilter(prev => prev === 'In Transit' ? '' : 'In Transit')}
                                    className="font-normal px-2.5 py-0.5 rounded-lg transition-all"
                                    style={{ fontSize: 'var(--fs-table)', ...STATUS_STYLES['In Transit'], outline: statusFilter === 'In Transit' ? `2px solid ${STATUS_STYLES['In Transit'].color}` : 'none', outlineOffset: '1px' }}
                                >
                                    {inTransitCount} in transit
                                </button>
                            )}
                            {urgencyFilter !== '' && (
                                <button onClick={() => setUrgencyFilter('')} className="responsiveTextTable underline" style={{ color: 'var(--endeavour)' }}>
                                    clear
                                </button>
                            )}
                        </div>
                    )}

                    {/* Table — Desktop */}
                    <div className="custom-table hidden md:block flex-1">
                    {/* overflow-auto, not overflow-x-auto, and the maxHeight with it.
                        overflow-x alone still made this a scroll container (a non-visible
                        overflow on one axis forces the other to `auto`), but one that
                        never scrolled vertically — so it swallowed the sticky header
                        while the page scrolled behind it. */}
                    <div
                        className="overflow-auto dashboard-scroll"
                        style={{ maxHeight: dynamicMaxHeight }}
                    >
                        {/* tableLayout: auto, like every other main table in the app.
                            This was `fixed` with a hardcoded percentage per column and a
                            1300px floor, so each column got its share whether it needed it
                            or not: POD and Delivery Time were clipped to "IWH Seagul…"
                            while POL and Ship Type sat half empty, and the 1300px floor
                            forced a horizontal scrollbar even on a screen with room.
                            Auto sizes each column to its content instead.

                            Safe for the Notes column, which is the one free-text field
                            here: it is a <textarea>, so it wraps rather than growing, and
                            its own min-w-[160px] is its floor. */}
                        <table className="w-full" style={{ tableLayout: 'auto' }}>
                            <thead className="sticky top-0 z-sticky">
                                <tr>
                                    {[
                                        { label: 'Contract #',    col: 'order'    },
                                        { label: 'Supplier',      col: 'supplier' },
                                        { label: 'Invoice #',     col: 'invoice'  },
                                        { label: 'Client',        col: 'client'   },
                                        { label: 'Shipment Date', col: 'etd'      },
                                        { label: 'Arrival Date',  col: 'eta'      },
                                        { label: 'POL',           col: 'pol'      },
                                        { label: 'POD',           col: 'pod'      },
                                        { label: 'Ship Type',     col: 'shpType'  },
                                        { label: 'Status',        col: 'status'   },
                                        { label: 'Last Update',   col: 'updated'  },
                                        { label: 'Notes',         col: null       },
                                    ].map(({ label, col }) => (
                                        /* Everything about the header band — size, weight,
                                           colour, case, tracking, padding, alignment —
                                           comes from .custom-table th in globals.css.

                                           Nothing here may restate it. This header used to
                                           carry colour:--chathams-blue inline, which is full
                                           ink; once the shared rule moved every other table to
                                           --ink-secondary, the inline value still won here and
                                           shipment alone rendered a shade darker. Same weight,
                                           but darker reads as heavier, so this table looked
                                           bolder than the rest of the app. */
                                        <th key={label}
                                            onClick={col ? () => handleSort(col) : undefined}
                                            /* nowrap: under auto layout the browser narrows a column
                                               by wrapping its header, and six of these are two words.
                                               Without this, "Shipment Date" and "Last Update" would be
                                               the only labels on two lines — the margins bug in
                                               1304bea1, which read as mis-alignment rather than as
                                               wrapping. The table scrolls if it genuinely cannot fit. */
                                            style={{ whiteSpace: 'nowrap', cursor: col ? 'pointer' : 'default', userSelect: 'none' }}>
                                            <span className="inline-flex items-center justify-center gap-1">
                                                {label}
                                                <SortIcon direction={col && sortCol === col ? sortDir : null} />
                                            </span>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.length === 0 && !loading && (
                                    <tr>
                                        <td colSpan={12} style={{ textAlign: 'center', padding: '32px', color: 'var(--regent-gray)' }}>
                                            No shipments found.
                                        </td>
                                    </tr>
                                )}
                                {displayRows.map((entry) => {
                                    if (entry.type === 'header') {
                                        const dotColor = STATUS_STYLES[entry.status]?.color || 'var(--ink-muted)';
                                        return (
                                            <tr key={`grp-${entry.status || 'none'}`} onClick={() => toggleGroup(entry.status)} className='cursor-pointer select-none'>
                                                <td colSpan={12} style={{ background: 'var(--bg-subtle)', borderBottom: '1px solid var(--line)', padding: '5px 12px', textAlign: 'left' }}>
                                                    <span className='inline-flex items-center gap-2'>
                                                        <svg width='11' height='11' viewBox='0 0 10 10' fill='none' style={{ transition: 'transform 0.15s', transform: entry.collapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}>
                                                            <path d='M2 3.5L5 6.5L8 3.5' stroke='var(--ink-muted)' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round' />
                                                        </svg>
                                                        <span className='rounded-full' style={{ width: 7, height: 7, background: dotColor, display: 'inline-block' }} />
                                                        {/* --fs-table, matching the header and the rows.
                                                            It was --fs-body, a rung above both, so the
                                                            group label was the largest text in the table. */}
                                                        <span className='font-semibold' style={{ fontSize: 'var(--fs-table)', color: 'var(--ink-secondary)' }}>
                                                            {entry.status || 'No status'}
                                                        </span>
                                                        <span className='rounded-full font-semibold px-1.5' style={{ fontSize: 'var(--fs-table)', background: "var(--bg-card)", color: 'var(--ink-muted)', border: '1px solid var(--line)' }}>
                                                            {entry.count}
                                                        </span>
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    }
                                    const contract = entry.contract;
                                    const mainInv = getMainInvoice(contract);
                                    const status = contract.shipmentStatus || '';
                                    return (
                                        <tr key={contract.id} className="hover-row cursor-pointer transition-colors">
                                            <td className="td-truncate">
                                                <Tltip direction="bottom" tltpText={contract.order || '—'}>
                                                    <button onClick={() => navigateTo(contract.id)} className="responsiveTextTable font-medium text-[var(--brand)] hover:underline w-full overflow-hidden text-ellipsis whitespace-nowrap block text-center">
                                                        {contract.order || '—'}
                                                    </button>
                                                </Tltip>
                                            </td>
                                            <td className="td-truncate">
                                                <Tltip direction="bottom" tltpText={getSupplierName(contract)}>
                                                    <span className="inline-flex items-center justify-center gap-1.5 responsiveTextTable text-[var(--ink)] max-w-full">
                                                        {getSupplierName(contract) !== '—' && <Avatar name={getSupplierName(contract)} size={18} />}
                                                        <span className="truncate">{getSupplierName(contract)}</span>
                                                    </span>
                                                </Tltip>
                                            </td>
                                            <td>
                                                <div className="flex justify-center responsiveTextTable">
                                                    {mainInv ? (
                                                        <button onClick={() => navigateTo(contract.id)} className="font-medium text-[var(--brand)] hover:underline">
                                                            {mainInv.invoice}
                                                        </button>
                                                    ) : <span className="text-[var(--ink-muted)]">—</span>}
                                                </div>
                                            </td>
                                            <td className="td-truncate">
                                                <Tltip direction="bottom" tltpText={getClientName(contract.id)}>
                                                    <span className="inline-flex items-center justify-center gap-1.5 responsiveTextTable text-[var(--ink)] max-w-full">
                                                        {getClientName(contract.id) !== '—' && <Avatar name={getClientName(contract.id)} size={18} />}
                                                        <span className="truncate">{getClientName(contract.id)}</span>
                                                    </span>
                                                </Tltip>
                                            </td>
                                            <td>
                                                <div className="flex justify-center">
                                                    <DateCell
                                                        rawDate={getRawETD(contract)}
                                                        onOpen={(el) => openFloatingPicker(el, contract, 'shipmentEtd')}
                                                        onClear={() => { const ts = Date.now(); handleDateFieldChange(contract.id, 'shipmentEtd', ''); touchContract(contract.id, ts); updateContractField(uidCollection, contract.id, contract.date, { shipmentEtd: '', shipmentUpdatedAt: ts }); }}
                                                    />
                                                </div>
                                            </td>
                                            <td>
                                                <div className="flex justify-center">
                                                    <DateCell
                                                        rawDate={getRawETA(contract)}
                                                        urgency={getUrgency(contract)}
                                                        onOpen={(el) => openFloatingPicker(el, contract, 'shipmentEta')}
                                                        onClear={() => { const ts = Date.now(); handleDateFieldChange(contract.id, 'shipmentEta', ''); touchContract(contract.id, ts); updateContractField(uidCollection, contract.id, contract.date, { shipmentEta: '', shipmentUpdatedAt: ts }); }}
                                                    />
                                                </div>
                                            </td>
                                            <td className="td-truncate">
                                                <Tltip direction="bottom" tltpText={getPOL(contract)}>
                                                    <div className="responsiveTextTable text-center text-[var(--ink)] overflow-hidden text-ellipsis whitespace-nowrap">
                                                        {getPOL(contract)}
                                                    </div>
                                                </Tltip>
                                            </td>
                                            <td className="td-truncate">
                                                <Tltip direction="bottom" tltpText={getPOD(contract)}>
                                                    <div className="responsiveTextTable text-center text-[var(--ink)] overflow-hidden text-ellipsis whitespace-nowrap">
                                                        {getPOD(contract)}
                                                    </div>
                                                </Tltip>
                                            </td>
                                            <td>
                                                <div className="flex justify-center">
                                                    <div className="responsiveTextTable text-center whitespace-nowrap text-[var(--ink)]">
                                                        {getShpType(contract)}
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{ overflow: 'visible', position: 'relative', zIndex: 15 }}>
                                                <div className="flex justify-center">
                                                    <StatusSelect
                                                        value={status}
                                                        onChange={s => handleStatusChange(contract, s)}
                                                    />
                                                </div>
                                            </td>
                                            <td>
                                                <div className="flex justify-center">
                                                    {(() => {
                                                        const ts = contract.shipmentUpdatedAt;
                                                        const recent = isRecent(ts);
                                                        return recent ? (
                                                            <div
                                                                className="px-2 py-0.5 rounded-lg responsiveTextTable font-medium text-center whitespace-nowrap inline-flex items-center gap-1"
                                                                style={{ backgroundColor: 'var(--ok-bg)', border: '1px solid var(--ok-border)', color: 'var(--ok-text)' }}
                                                            >
                                                                <span style={{ width: 6, height: 6, borderRadius: 9999, backgroundColor: 'var(--ok-text)', display: 'inline-block' }} />
                                                                {relTime(ts)}
                                                            </div>
                                                        ) : (
                                                            <span className="responsiveTextTable whitespace-nowrap" style={{ color: ts ? 'var(--ink-secondary)' : 'var(--ink-muted)' }}>
                                                                {relTime(ts)}
                                                            </span>
                                                        );
                                                    })()}
                                                </div>
                                            </td>
                                            <td style={{ overflow: 'visible' }}>
                                                <NotesCell
                                                    value={contract.shipmentNotes}
                                                    contractId={contract.id}
                                                    contractDate={contract.date}
                                                    uidCollection={uidCollection}
                                                    onChange={(v) => handleNotesChange(contract.id, v)}
                                                    onCommit={(ts) => touchContract(contract.id, ts)}
                                                />
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    </div>

                    {/* Cards — Mobile */}
                    <div className="block md:hidden px-2 py-2 space-y-3">
                        {filtered.length === 0 && !loading && (
                            <div className="text-center py-8 text-[var(--regent-gray)] responsiveTextTitle">No shipments found.</div>
                        )}
                        {paginated.map((contract) => {
                            const mainInv = getMainInvoice(contract);
                            const status = contract.shipmentStatus || '';
                            return (
                                <div
                                    key={contract.id}
                                    className="rounded-2xl overflow-hidden"
                                    style={{ backgroundColor: "var(--bg-card)", border: '1px solid var(--line)', boxShadow: 'var(--shadow-sm)' }}
                                >
                                    {/* Card header */}
                                    <div className="px-3 py-2 flex items-center justify-between bg-[var(--bg-subtle)]">
                                        <button
                                            onClick={() => navigateTo(contract.id)}
                                            className="font-medium text-[var(--endeavour)] responsiveText hover:underline"
                                        >
                                            {contract.order || '—'}
                                        </button>
                                        <div className="flex items-center gap-1.5">
                                            {(() => {
                                                const u = getUrgency(contract);
                                                if (!u) return null;
                                                const s = u === 'overdue'
                                                    ? { backgroundColor: 'var(--bad-bg)', border: '1px solid var(--bad-border)', color: 'var(--bad-text)', t: 'Overdue' }
                                                    : { backgroundColor: 'var(--warn-bg)', border: '1px solid var(--warn-border)', color: 'var(--warn-text)', t: '≤7d' };
                                                return (
                                                    <span className="responsiveTextTable font-medium px-2 py-0.5 rounded-lg" style={{ backgroundColor: s.backgroundColor, border: s.border, color: s.color }}>
                                                        {s.t}
                                                    </span>
                                                );
                                            })()}
                                            <span
                                                className="responsiveTextTable font-medium px-2.5 py-0.5 rounded-lg"
                                                style={status ? STATUS_STYLES[status] : { backgroundColor: 'var(--neutral-bg)', color: 'var(--regent-gray)', border: '1px solid var(--neutral-border)' }}
                                            >
                                                {status || 'No Status'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Card body */}
                                    <div className="p-3 space-y-2">
                                        {[
                                            { label: 'Supplier',      value: getSupplierName(contract) },
                                            { label: 'Invoice #',     value: mainInv ? String(mainInv.invoice) : '—' },
                                            { label: 'Client',        value: getClientName(contract.id) },
                                            { label: 'Shipment Date', value: formatDate(getRawETD(contract)) },
                                            { label: 'Arrival Date',  value: formatDate(getRawETA(contract)) },
                                            { label: 'POL',           value: getPOL(contract) },
                                            { label: 'POD',           value: getPOD(contract) },
                                            { label: 'Ship Type',     value: getShpType(contract) },
                                            { label: 'Last Update',   value: relTime(contract.shipmentUpdatedAt) },
                                        ].map(({ label, value }) => (
                                            <div key={label} className="flex flex-col space-y-1 pb-2" style={{ borderBottom: '1px solid var(--bg-subtle)' }}>
                                                <span className="responsiveTextTable text-[var(--regent-gray)] font-semibold">{label}</span>
                                                <div className="px-1 py-1 responsiveTextTable text-[var(--ink)]">
                                                    {value || '—'}
                                                </div>
                                            </div>
                                        ))}

                                        {/* Status */}
                                        <div className="flex flex-col space-y-1 pb-2" style={{ borderBottom: '1px solid var(--bg-subtle)' }}>
                                            <span className="responsiveTextTable text-[var(--regent-gray)] font-semibold">Status</span>
                                            <StatusSelect
                                                value={status}
                                                onChange={s => handleStatusChange(contract, s)}
                                            />
                                        </div>

                                        {/* Notes */}
                                        <div className="flex flex-col space-y-1">
                                            <span className="responsiveTextTable text-[var(--regent-gray)] font-semibold">Notes</span>
                                            <NotesCell
                                                value={contract.shipmentNotes}
                                                contractId={contract.id}
                                                contractDate={contract.date}
                                                uidCollection={uidCollection}
                                                onChange={(v) => handleNotesChange(contract.id, v)}
                                                onCommit={(ts) => touchContract(contract.id, ts)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Pagination footer */}
                    <div className="flex-shrink-0 rounded-b-2xl" style={{ borderTop: '1px solid var(--line)', background: "var(--bg-card)" }}>
                        <div className="w-full px-6 py-4">
                            <div className="flex items-center justify-between">

                                {/* Left — count */}
                                <div className="responsiveTextTitle font-medium" style={{ color: 'var(--regent-gray)' }}>
                                    {startRow}–{endRow} of {filtered.length}
                                </div>

                                {/* Center — page numbers */}
                                <nav className="flex items-center gap-4">
                                    <button
                                        onClick={() => setPageIndex(p => Math.max(0, p - 1))}
                                        disabled={safePageIndex === 0}
                                        className="responsiveTextInput font-medium transition-colors"
                                        style={{ color: safePageIndex > 0 ? 'var(--endeavour)' : 'var(--rock-blue)', cursor: safePageIndex > 0 ? 'pointer' : 'not-allowed' }}
                                    >
                                        Previous
                                    </button>
                                    <div className="flex items-center gap-2">
                                        {getPageNumbers().map(pi => (
                                            <button
                                                key={pi}
                                                onClick={() => setPageIndex(pi)}
                                                className="min-w-[2rem] h-8 responsiveTextInput font-medium rounded-lg border transition-all duration-200"
                                                style={{
                                                    backgroundColor: safePageIndex === pi ? 'var(--endeavour)' : 'var(--bg-card)',
                                                    color: safePageIndex === pi ? 'var(--on-brand)' : 'var(--endeavour)',
                                                    borderColor: safePageIndex === pi ? 'var(--endeavour)' : 'var(--line)',
                                                }}
                                            >
                                                {pi + 1}
                                            </button>
                                        ))}
                                    </div>
                                    <button
                                        onClick={() => setPageIndex(p => Math.min(pageCount - 1, p + 1))}
                                        disabled={safePageIndex >= pageCount - 1}
                                        className="responsiveTextInput font-medium transition-colors"
                                        style={{ color: safePageIndex < pageCount - 1 ? 'var(--endeavour)' : 'var(--rock-blue)', cursor: safePageIndex < pageCount - 1 ? 'pointer' : 'not-allowed' }}
                                    >
                                        Next
                                    </button>
                                </nav>

                                {/* Right — rows per page */}
                                <div className="py-1 px-1 md:px-4 self-center flex items-center space-x-2">
                                    <span className="text-[var(--endeavour)] responsiveTextInput">Rows:</span>
                                    <Menu as="div" className="relative inline-block">
                                        <MenuButton className="inline-flex w-full justify-center border border-[var(--endeavour)]/50 rounded-lg px-4 py-1 responsiveTextInput font-medium hover:border-[var(--endeavour)] transition-colors">
                                            <span className="items-center flex pt-[2px] text-[var(--endeavour)]">{pageSize}</span>
                                            <HiMiniChevronUpDown className="ml-2 -mr-1 mt-0.5 h-4 w-4 text-[var(--endeavour)]" />
                                        </MenuButton>
                                        <Transition as={Fragment} enter="transition ease-out duration-100" enterFrom="transform opacity-0 scale-95" enterTo="transform opacity-100 scale-100" leave="transition ease-in duration-75" leaveFrom="transform opacity-100 scale-100" leaveTo="transform opacity-0 scale-95">
                                            <MenuItems className="absolute right-0 bottom-10 w-[4.2rem] origin-top-right rounded-lg bg-[var(--bg-card)] shadow-lg ring-1 ring-[var(--selago)] focus:outline-none z-50">
                                                <div className="px-1 py-1">
                                                    {[5, 10, 20, 25, 50, 100].map(x => (
                                                        <MenuItem key={x}>
                                                            <button
                                                                onClick={() => { setPageSize(x); setPageIndex(0); }}
                                                                className={`${pageSize === x ? 'bg-[var(--bg-subtle)] text-[var(--endeavour)] font-semibold' : 'text-[var(--port-gore)]'} flex w-full items-center rounded-lg px-2 py-1.5 responsiveTextInput mt-0.5 justify-center ${pageSize !== x ? 'hover:bg-[var(--selago)]' : ''}`}
                                                            >
                                                                {x}
                                                            </button>
                                                        </MenuItem>
                                                    ))}
                                                </div>
                                            </MenuItems>
                                        </Transition>
                                    </Menu>
                                </div>

                            </div>
                        </div>
                    </div>
                    </div> {/* end inner card */}
                </div> {/* end page wrapper (was the outer card) */}
            </div>
        </div>
    );
};

export default ShipmentPage;
