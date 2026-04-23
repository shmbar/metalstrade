'use client';
import { useContext, useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { SettingsContext } from "../../../contexts/useSettingsContext";
import { UserAuth } from "../../../contexts/useAuthContext";
import { loadData, updateContractField } from '../../../utils/utils';
import VideoLoader from '../../../components/videoLoader';
import Toast from '../../../components/toast.js';
import DateRangePicker from '../../../components/dateRangePicker';
import Datepicker from "react-tailwindcss-datepicker";
import { useRouter } from 'next/navigation';
import { FaSearch } from 'react-icons/fa';
import { TiDeleteOutline } from 'react-icons/ti';
import { HiMiniChevronUpDown } from 'react-icons/hi2';
import Image from 'next/image';
import Tltip from '../../../components/tlTip';
import { FileSpreadsheet } from 'lucide-react';
import { Workbook } from 'exceljs';
import { saveAs } from 'file-saver';
import { Menu, Transition, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { Fragment } from 'react';
import { TbSortAscending, TbSortDescending } from 'react-icons/tb';

const STATUSES = ['', 'Pending', 'In Transit', 'At Port', 'Delivered', 'On Hold'];

const STATUS_STYLES = {
    'Pending':    { backgroundColor: '#fef9c3', border: '1px solid #fde68a', color: '#92400e' },
    'In Transit': { backgroundColor: '#dbeeff', border: '1px solid #b8ddf8', color: 'var(--chathams-blue)' },
    'At Port':    { backgroundColor: '#ede9fe', border: '1px solid #ddd6fe', color: '#7c3aed' },
    'Delivered':  { backgroundColor: '#dcfce7', border: '1px solid #bbf7d0', color: '#166534' },
    'On Hold':    { backgroundColor: '#fce7f3', border: '1px solid #fbcfe8', color: '#be185d' },
    '':           { backgroundColor: '#f8fbff', border: '1px solid #d8e8f5', color: 'var(--regent-gray)' },
};

function NotesCell({ value, contractId, contractDate, uidCollection, onChange }) {
    const [local, setLocal] = useState(value || '');
    const timerRef = useRef(null);

    useEffect(() => { setLocal(value || ''); }, [value]);

    const handleChange = (e) => {
        const v = e.target.value;
        setLocal(v);
        onChange(v);
        clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
            updateContractField(uidCollection, contractId, contractDate, { shipmentNotes: v });
        }, 800);
    };

    return (
        <div className="px-3 py-1 rounded-xl responsiveTextTable font-normal" style={{ backgroundColor: '#f8fbff', border: '1px solid #d8e8f5' }}>
            <textarea
                value={local}
                onChange={handleChange}
                rows={1}
                className="w-full min-w-[160px] responsiveTextTable text-[var(--port-gore)] bg-transparent resize-none focus:outline-none placeholder:text-[var(--regent-gray)]"
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

function DateCell({ rawDate, onOpen, onClear }) {
    const ref = useRef(null);
    const display = fmtDate(rawDate);

    const handleClick = (e) => {
        e.stopPropagation();
        if (!ref.current) return;
        const r = ref.current.getBoundingClientRect();
        // Library renders its arrow at ~19px (ml-[1.2rem]) + ~8px (half of w-4) from the
        // popover's left edge. Shift the popover left by that offset so the arrow — not
        // the popover center — points at the cell center. Then clamp to viewport.
        const POPOVER_W = 320;
        const ARROW_OFFSET = 27;
        const desired = r.left + r.width / 2 - ARROW_OFFSET;
        const left = Math.max(8, Math.min(desired, window.innerWidth - POPOVER_W - 8));
        const top = Math.min(r.bottom + 2, window.innerHeight - 360);
        onOpen({ top, left });
    };

    return (
        <div
            ref={ref}
            className="h-7 responsiveTextTable flex items-center justify-center px-2 rounded-lg cursor-pointer select-none w-full relative"
            style={{ backgroundColor: '#f8fbff', border: '1px solid #d8e8f5', minWidth: '72px' }}
            onClick={handleClick}
        >
            <span className={display ? 'text-[var(--port-gore)]' : 'text-[var(--regent-gray)]'}>
                {display || '—'}
            </span>
            {display && (
                <button
                    onClick={(e) => { e.stopPropagation(); onClear(); }}
                    className="absolute right-1 top-1/2 -translate-y-1/2 text-[var(--regent-gray)] hover:text-red-400 transition-colors leading-none"
                    style={{ fontSize: '13px' }}
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
                className="flex items-center gap-1.5 font-medium px-2.5 py-0.5 rounded-full border cursor-pointer focus:outline-none transition-colors whitespace-nowrap"
                style={{
                    fontSize: '0.68rem',
                    borderColor: active ? 'var(--endeavour)' : '#b8ddf8',
                    color: active ? '#fff' : 'var(--chathams-blue)',
                    backgroundColor: active ? 'var(--endeavour)' : '#fff',
                }}
            >
                <span>{label}</span>
                <svg width="8" height="8" viewBox="0 0 10 10" fill="currentColor"><path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>
            </button>
            {open && (
                <div className="absolute z-[200] top-full mt-1 left-0 rounded-2xl shadow-lg overflow-hidden" style={{ border: '1px solid #d8e8f5', backgroundColor: '#fff', minWidth: '140px', maxHeight: '220px', overflowY: 'auto' }}>
                    <div
                        onClick={() => { onChange(''); setOpen(false); }}
                        className="px-3 py-1.5 cursor-pointer transition-colors"
                        style={{ fontSize: '0.68rem', color: value === '' ? 'var(--endeavour)' : 'var(--chathams-blue)', fontWeight: value === '' ? 600 : 400, backgroundColor: value === '' ? 'var(--selago)' : '#fff' }}
                        onMouseEnter={e => { if (value !== '') e.currentTarget.style.backgroundColor = '#f0f7ff'; }}
                        onMouseLeave={e => { if (value !== '') e.currentTarget.style.backgroundColor = '#fff'; }}
                    >
                        {placeholder}
                    </div>
                    {options.map(o => (
                        <div
                            key={o.id}
                            onClick={() => { onChange(o.id); setOpen(false); }}
                            className="px-3 py-1.5 cursor-pointer transition-colors"
                            style={{ fontSize: '0.68rem', color: value === o.id ? 'var(--endeavour)' : 'var(--port-gore)', fontWeight: value === o.id ? 600 : 400, backgroundColor: value === o.id ? 'var(--selago)' : '#fff' }}
                            onMouseEnter={e => { if (value !== o.id) e.currentTarget.style.backgroundColor = '#f0f7ff'; }}
                            onMouseLeave={e => { if (value !== o.id) e.currentTarget.style.backgroundColor = '#fff'; }}
                        >
                            {o.label}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function StatusSelect({ value, onChange }) {
    const [open, setOpen] = useState(false);
    const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
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

    const handleToggle = () => {
        if (!open && btnRef.current) {
            const r = btnRef.current.getBoundingClientRect();
            setPos({ top: r.bottom + 2, left: r.left, width: r.width });
        }
        setOpen(p => !p);
    };

    return (
        <div className="flex justify-center">
            <button
                ref={btnRef}
                onClick={handleToggle}
                className="flex items-center gap-1.5 rounded-xl px-3 py-1 font-medium responsiveTextTable cursor-pointer focus:outline-none w-full justify-between min-w-[110px]"
                style={STATUS_STYLES[value]}
            >
                <span>{value || '— Select —'}</span>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>
            </button>
            {open && typeof document !== 'undefined' && createPortal(
                <div
                    ref={dropRef}
                    className="rounded-xl overflow-hidden shadow-lg"
                    style={{ position: 'fixed', top: pos.top, left: pos.left, minWidth: pos.width, zIndex: 99999, border: '1px solid #d8e8f5', backgroundColor: '#fff' }}
                >
                    {STATUSES.map(s => (
                        <div
                            key={s}
                            onClick={() => { onChange(s); setOpen(false); }}
                            className="px-3 py-1.5 responsiveTextTable font-medium cursor-pointer mx-1.5 my-1 rounded-lg transition-all"
                            style={{ ...STATUS_STYLES[s], opacity: value === s ? 1 : 0.85 }}
                        >
                            {s || '— Select —'}
                        </div>
                    ))}
                </div>,
                document.body
            )}
        </div>
    );
}

const ShipmentPage = () => {
    const { settings, dateSelect, loading, setLoading } = useContext(SettingsContext);
    const { uidCollection } = UserAuth();
    const router = useRouter();

    const [contracts, setContracts] = useState([]);
    const [invoiceMap, setInvoiceMap] = useState({});
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [showFilters, setShowFilters] = useState(true);
    const [pageIndex, setPageIndex] = useState(0);
    const [pageSize, setPageSize] = useState(25);
    const [sortCol, setSortCol] = useState(null);
    const [sortDir, setSortDir] = useState('asc');
    const [supplierFilter, setSupplierFilter] = useState('');
    const [clientFilter, setClientFilter] = useState('');
    const [shipTypeFilter, setShipTypeFilter] = useState('');

    // Shared floating datepicker (always mounted, repositioned on cell click)
    const [floatingPicker, setFloatingPicker] = useState(null);
    // { contractId, field, contractDate, pos: { top, left } }
    const [floatingValue, setFloatingValue] = useState({ startDate: null, endDate: null });
    const floatingPickerRef = useRef(null);

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

                const sortedContracts = (contractsData || []).filter(Boolean)
                    .sort((a, b) => (a.date || '').localeCompare(b.date || ''));
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

    const handleDateFieldChange = (contractId, field, value) => {
        setContracts(prev => prev.map(c => c.id === contractId ? { ...c, [field]: value } : c));
    };

    const openFloatingPicker = (pos, contract, field) => {
        if (!pos) return;
        const rawDate = field === 'shipmentEtd' ? getRawETD(contract) : getRawETA(contract);
        setFloatingValue({ startDate: rawDate || null, endDate: rawDate || null });
        setFloatingPicker({ contractId: contract.id, field, contractDate: contract.date, pos });
    };

    // Click the datepicker input after it mounts (conditional render = always fresh/closed state)
    useEffect(() => {
        if (!floatingPicker) return;
        const timer = setTimeout(() => {
            floatingPickerRef.current?.querySelector('input')?.focus();
        }, 0);
        return () => clearTimeout(timer);
    }, [floatingPicker]);

    const handleFloatingPickerChange = (val) => {
        const d = val?.startDate || '';
        if (floatingPicker) {
            handleDateFieldChange(floatingPicker.contractId, floatingPicker.field, d);
            updateContractField(uidCollection, floatingPicker.contractId, floatingPicker.contractDate, { [floatingPicker.field]: d });
        }
        setFloatingPicker(null);
    };

    // Close floating picker on outside click
    useEffect(() => {
        if (!floatingPicker) return;
        const handler = (e) => {
            if (!floatingPickerRef.current?.contains(e.target)) setFloatingPicker(null);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [floatingPicker]);

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
        setContracts(prev =>
            prev.map(c => c.id === contract.id ? { ...c, shipmentStatus: status } : c)
        );
        await updateContractField(uidCollection, contract.id, contract.date, { shipmentStatus: status });
    };

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
    useEffect(() => { setPageIndex(0); }, [search, statusFilter, supplierFilter, clientFilter, shipTypeFilter]);

    const pageCount = Math.max(1, Math.ceil(sortedFiltered.length / pageSize));
    const safePageIndex = Math.min(pageIndex, pageCount - 1);
    const paginated = sortedFiltered.slice(safePageIndex * pageSize, (safePageIndex + 1) * pageSize);
    const startRow = sortedFiltered.length === 0 ? 0 : safePageIndex * pageSize + 1;
    const endRow = safePageIndex * pageSize + paginated.length;

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
            { header: 'Notes',         key: 'notes',          width: 40 },
        ];
        sheet.getRow(1).font = { bold: true };
        filtered.forEach(c => {
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
                notes:        c.shipmentNotes || '',
            });
        });
        const buf = await wb.xlsx.writeBuffer();
        saveAs(new Blob([buf]), 'Shipments_Tracking.xlsx');
    };

    if (Object.keys(settings).length === 0) {
        return <VideoLoader loading={true} fullScreen={true} />;
    }

    return (
        <div className="w-full" style={{ background: '#f8fbff' }}>
        <style jsx global>{`
            .custom-table th {
                border: 1px solid #d8e8f5;
                background-color: #dbeeff;
                text-align: center;
                vertical-align: middle;
                padding: 6px;
                border-radius: 4px;
        }
            .custom-table td {
                background-color: #fff;
                border: 1px solid #e0e0e0;
                text-align: center;
                vertical-align: middle;
                padding: 6px;
                border-radius: 4px;
                font-size: 10px !important;
                overflow: visible;
            }
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
                        popoverDirection="down"
                        inputClassName="opacity-0 h-0 w-0 p-0 border-0 absolute overflow-hidden"
                    />
                </div>,
                document.body
            )}

            <div className="mx-auto w-full max-w-full px-1 md:px-2 pb-4 mt-[72px]">
                <VideoLoader loading={loading} fullScreen={true} />
                <Toast />

                {/* Outer card — title only */}
                <div className="rounded-2xl p-2 sm:p-3 lg:p-5 mt-4 sm:mt-6 lg:mt-8 border border-[#b8ddf8] w-full bg-[#f8fbff] overflow-x-auto">
                    <div className="flex items-center justify-between pb-2 flex-wrap gap-2">
                        <h1 className="text-[var(--chathams-blue)] font-poppins responsiveTextTitle font-medium border-l-4 border-[var(--chathams-blue)] pl-2">
                            Shipments Tracking
                        </h1>
                    </div>

                    {/* Inner card — toolbar + table */}
                    <div className="relative rounded-2xl" style={{ background: '#f8fbff' }}>
                      <div className="absolute inset-0 rounded-2xl border border-[#b8ddf8] pointer-events-none z-[25]" />

                    {/* Toolbar */}
                    <div
                        className="flex flex-col sm:flex-row sm:justify-between sm:items-center px-2 py-2 gap-2 rounded-t-2xl"
                        style={{ borderBottom: '1px solid #b8ddf8', background: '#ffffff' }}
                    >
                        {/* Left: Search + Status filter chips */}
                        <div className="flex flex-wrap items-center gap-2">

                            {/* Search */}
                            <div className="flex items-center relative w-[120px] sm:w-[140px] h-7 border border-[#b8ddf8] rounded-2xl bg-white focus-within:ring-1 focus-within:ring-blue-200 shadow-sm transition-all duration-200">
                                <input
                                    className="bg-white border-0 shadow-none pr-8 pl-3 focus:outline-none focus:ring-0 w-full text-[var(--chathams-blue)] placeholder:text-[var(--chathams-blue)] h-full rounded-2xl"
                                    style={{ fontSize: '0.68rem' }}
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
                                    <Image src="/logo/chat.svg" alt="Chat" width={16} height={16} className="w-4 h-4 object-cover" priority />
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
                                    <Image src="/logo/filter.svg" alt="Filter" width={16} height={16} className="w-4 h-4 object-cover" priority />
                                </button>
                            </Tltip>

                            {/* Status filter chips + Supplier / Client dropdowns */}
                            {showFilters && <div className="flex items-center gap-1 flex-wrap">
                                <button
                                    onClick={() => setStatusFilter('')}
                                    className={`font-medium px-2.5 py-0.5 rounded-full border transition-colors ${statusFilter === '' ? 'bg-[var(--endeavour)] text-white border-[var(--endeavour)]' : 'bg-white text-[var(--endeavour)] border-[var(--endeavour)] hover:bg-[var(--selago)]'}`}
                                    style={{ fontSize: '0.68rem' }}
                                >
                                    All ({contracts.length})
                                </button>
                                {STATUSES.filter(Boolean).map(s => {
                                    const count = contracts.filter(c => (c.shipmentStatus || '') === s).length;
                                    return (
                                        <button
                                            key={s}
                                            onClick={() => setStatusFilter(prev => prev === s ? '' : s)}
                                            className="font-medium px-2.5 py-0.5 rounded-full transition-all"
                                            style={{ ...STATUS_STYLES[s], fontSize: '0.68rem', opacity: statusFilter === s ? 1 : 0.75, outline: statusFilter === s ? `2px solid ${STATUS_STYLES[s].color}` : 'none', outlineOffset: '1px' }}
                                        >
                                            {s}: {count}
                                        </button>
                                    );
                                })}

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

                    {/* Table — Desktop */}
                    <div className="custom-table hidden md:block flex-1">
                    <div>
                        <table className="w-full" style={{ minWidth: '1200px', tableLayout: 'fixed' }}>
                            <thead>
                                <tr>
                                    {[
                                        { label: 'Contract #',    width: '8%',  col: 'order'    },
                                        { label: 'Supplier',      width: '9%',  col: 'supplier' },
                                        { label: 'Invoice #',     width: '7%',  col: 'invoice'  },
                                        { label: 'Client',        width: '9%',  col: 'client'   },
                                        { label: 'Shipment Date', width: '9%',  col: 'etd'      },
                                        { label: 'Arrival Date',  width: '9%',  col: 'eta'      },
                                        { label: 'POL',           width: '8%',  col: 'pol'      },
                                        { label: 'POD',           width: '8%',  col: 'pod'      },
                                        { label: 'Ship Type',     width: '8%',  col: 'shpType'  },
                                        { label: 'Status',        width: '9%',  col: 'status'   },
                                        { label: 'Notes',         width: '16%', col: null       },
                                    ].map(({ label, width, col }) => (
                                        <th key={label} className="font-poppins responsiveTextTable font-medium py-2"
                                            onClick={col ? () => handleSort(col) : undefined}
                                            style={{ color: 'var(--chathams-blue)', letterSpacing: '0.05em', textAlign: 'center', width, cursor: col ? 'pointer' : 'default', userSelect: 'none' }}>
                                            <span className="inline-flex items-center justify-center gap-1">
                                                {label}
                                                {col && sortCol === col && sortDir === 'asc' && <TbSortAscending style={{ fontSize: '0.85rem', color: 'var(--endeavour)' }} />}
                                                {col && sortCol === col && sortDir === 'desc' && <TbSortDescending style={{ fontSize: '0.85rem', color: 'var(--endeavour)' }} />}
                                            </span>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.length === 0 && !loading && (
                                    <tr>
                                        <td colSpan={11} style={{ textAlign: 'center', padding: '32px', color: 'var(--regent-gray)' }}>
                                            No shipments found.
                                        </td>
                                    </tr>
                                )}
                                {paginated.map((contract) => {
                                    const mainInv = getMainInvoice(contract);
                                    const status = contract.shipmentStatus || '';
                                    return (
                                        <tr key={contract.id} className="hover-row cursor-pointer transition-colors">
                                            <td className="td-truncate">
                                                <Tltip direction="bottom" tltpText={contract.order || '—'}>
                                                    <div className="px-2 py-1 rounded-xl responsiveTextTable font-normal text-center pill-inner" style={{ backgroundColor: "#f8fbff", border: "1px solid #d8e8f5" }}>
                                                        <button onClick={() => navigateTo(contract.id)} className="text-[var(--endeavour)] hover:underline w-full overflow-hidden text-ellipsis whitespace-nowrap block">
                                                            {contract.order || '—'}
                                                        </button>
                                                    </div>
                                                </Tltip>
                                            </td>
                                            <td className="td-truncate">
                                                <Tltip direction="bottom" tltpText={getSupplierName(contract)}>
                                                    <div className="px-2 py-1 rounded-xl responsiveTextTable font-normal text-center pill-inner" style={{ backgroundColor: "#f8fbff", border: "1px solid #d8e8f5" }}>
                                                        {getSupplierName(contract)}
                                                    </div>
                                                </Tltip>
                                            </td>
                                            <td>
                                                <div className="flex justify-center">
                                                    <div className="px-3 py-1 rounded-xl responsiveTextTable font-normal text-center whitespace-nowrap" style={{ backgroundColor: "#f8fbff", border: "1px solid #d8e8f5" }}>
                                                        {mainInv ? (
                                                            <button onClick={() => navigateTo(contract.id)} className="text-[var(--endeavour)] hover:underline">
                                                                {mainInv.invoice}
                                                            </button>
                                                        ) : '—'}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="td-truncate">
                                                <Tltip direction="bottom" tltpText={getClientName(contract.id)}>
                                                    <div className="px-2 py-1 rounded-xl responsiveTextTable font-normal text-center pill-inner" style={{ backgroundColor: "#f8fbff", border: "1px solid #d8e8f5" }}>
                                                        {getClientName(contract.id)}
                                                    </div>
                                                </Tltip>
                                            </td>
                                            <td>
                                                <div className="flex justify-center">
                                                    <DateCell
                                                        rawDate={getRawETD(contract)}
                                                        onOpen={(pos) => openFloatingPicker(pos, contract, 'shipmentEtd')}
                                                        onClear={() => { handleDateFieldChange(contract.id, 'shipmentEtd', ''); updateContractField(uidCollection, contract.id, contract.date, { shipmentEtd: '' }); }}
                                                    />
                                                </div>
                                            </td>
                                            <td>
                                                <div className="flex justify-center">
                                                    <DateCell
                                                        rawDate={getRawETA(contract)}
                                                        onOpen={(pos) => openFloatingPicker(pos, contract, 'shipmentEta')}
                                                        onClear={() => { handleDateFieldChange(contract.id, 'shipmentEta', ''); updateContractField(uidCollection, contract.id, contract.date, { shipmentEta: '' }); }}
                                                    />
                                                </div>
                                            </td>
                                            <td className="td-truncate">
                                                <Tltip direction="bottom" tltpText={getPOL(contract)}>
                                                    <div className="px-2 py-1 rounded-xl responsiveTextTable font-normal text-center pill-inner" style={{ backgroundColor: "#f8fbff", border: "1px solid #d8e8f5" }}>
                                                        {getPOL(contract)}
                                                    </div>
                                                </Tltip>
                                            </td>
                                            <td className="td-truncate">
                                                <Tltip direction="bottom" tltpText={getPOD(contract)}>
                                                    <div className="px-2 py-1 rounded-xl responsiveTextTable font-normal text-center pill-inner" style={{ backgroundColor: "#f8fbff", border: "1px solid #d8e8f5" }}>
                                                        {getPOD(contract)}
                                                    </div>
                                                </Tltip>
                                            </td>
                                            <td>
                                                <div className="flex justify-center">
                                                    <div className="px-3 py-1 rounded-xl responsiveTextTable font-normal text-center whitespace-nowrap" style={{ backgroundColor: "#f8fbff", border: "1px solid #d8e8f5" }}>
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
                                            <td style={{ overflow: 'visible' }}>
                                                <NotesCell
                                                    value={contract.shipmentNotes}
                                                    contractId={contract.id}
                                                    contractDate={contract.date}
                                                    uidCollection={uidCollection}
                                                    onChange={(v) => handleNotesChange(contract.id, v)}
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
                            <div className="text-center py-8 text-[var(--regent-gray)] text-sm">No shipments found.</div>
                        )}
                        {paginated.map((contract) => {
                            const mainInv = getMainInvoice(contract);
                            const status = contract.shipmentStatus || '';
                            return (
                                <div
                                    key={contract.id}
                                    className="rounded-2xl overflow-hidden"
                                    style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}
                                >
                                    {/* Card header */}
                                    <div className="px-3 py-2 flex items-center justify-between bg-[#9ad4ff]">
                                        <button
                                            onClick={() => navigateTo(contract.id)}
                                            className="font-medium text-[var(--endeavour)] responsiveText hover:underline"
                                        >
                                            {contract.order || '—'}
                                        </button>
                                        <span
                                            className="responsiveTextTable font-medium px-2.5 py-0.5 rounded-full"
                                            style={status ? STATUS_STYLES[status] : { backgroundColor: '#f3f4f6', color: 'var(--regent-gray)', border: '1px solid #d1d5db' }}
                                        >
                                            {status || 'No Status'}
                                        </span>
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
                                        ].map(({ label, value }) => (
                                            <div key={label} className="flex flex-col space-y-1 pb-2" style={{ borderBottom: '1px solid #f0f4f8' }}>
                                                <span className="responsiveTextTable uppercase tracking-wider text-[var(--regent-gray)] font-medium">{label}</span>
                                                <div className="px-2 py-1 rounded-xl responsiveTextTable text-[var(--port-gore)]" style={{ backgroundColor: '#f8fbff', border: '1px solid #d8e8f5' }}>
                                                    {value || '—'}
                                                </div>
                                            </div>
                                        ))}

                                        {/* Status */}
                                        <div className="flex flex-col space-y-1 pb-2" style={{ borderBottom: '1px solid #f0f4f8' }}>
                                            <span className="responsiveTextTable uppercase tracking-wider text-[var(--regent-gray)] font-medium">Status</span>
                                            <StatusSelect
                                                value={status}
                                                onChange={s => handleStatusChange(contract, s)}
                                            />
                                        </div>

                                        {/* Notes */}
                                        <div className="flex flex-col space-y-1">
                                            <span className="responsiveTextTable uppercase tracking-wider text-[var(--regent-gray)] font-medium">Notes</span>
                                            <NotesCell
                                                value={contract.shipmentNotes}
                                                contractId={contract.id}
                                                contractDate={contract.date}
                                                uidCollection={uidCollection}
                                                onChange={(v) => handleNotesChange(contract.id, v)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Pagination footer */}
                    <div className="flex-shrink-0 rounded-b-2xl" style={{ borderTop: '1px solid #b8ddf8', background: '#ffffff' }}>
                        <div className="w-full px-6 py-4">
                            <div className="flex items-center justify-between">

                                {/* Left — count */}
                                <div className="text-sm font-medium" style={{ color: 'var(--regent-gray)' }}>
                                    {startRow}–{endRow} of {filtered.length}
                                </div>

                                {/* Center — page numbers */}
                                <nav className="flex items-center gap-4">
                                    <button
                                        onClick={() => setPageIndex(p => Math.max(0, p - 1))}
                                        disabled={safePageIndex === 0}
                                        className="text-[0.75rem] font-medium transition-colors"
                                        style={{ color: safePageIndex > 0 ? 'var(--endeavour)' : 'var(--rock-blue)', cursor: safePageIndex > 0 ? 'pointer' : 'not-allowed' }}
                                    >
                                        Previous
                                    </button>
                                    <div className="flex items-center gap-2">
                                        {getPageNumbers().map(pi => (
                                            <button
                                                key={pi}
                                                onClick={() => setPageIndex(pi)}
                                                className="min-w-[2rem] h-8 text-[0.75rem] font-medium rounded-full border transition-all duration-200"
                                                style={{
                                                    backgroundColor: safePageIndex === pi ? 'var(--endeavour)' : '#FFFFFF',
                                                    color: safePageIndex === pi ? '#FFFFFF' : 'var(--endeavour)',
                                                    borderColor: safePageIndex === pi ? 'var(--endeavour)' : '#E5E7EB',
                                                }}
                                            >
                                                {pi + 1}
                                            </button>
                                        ))}
                                    </div>
                                    <button
                                        onClick={() => setPageIndex(p => Math.min(pageCount - 1, p + 1))}
                                        disabled={safePageIndex >= pageCount - 1}
                                        className="text-[0.75rem] font-medium transition-colors"
                                        style={{ color: safePageIndex < pageCount - 1 ? 'var(--endeavour)' : 'var(--rock-blue)', cursor: safePageIndex < pageCount - 1 ? 'pointer' : 'not-allowed' }}
                                    >
                                        Next
                                    </button>
                                </nav>

                                {/* Right — rows per page */}
                                <div className="py-1 px-1 md:px-4 self-center flex items-center space-x-2">
                                    <span className="text-[var(--endeavour)] text-[0.72rem]">Rows:</span>
                                    <Menu as="div" className="relative inline-block">
                                        <MenuButton className="inline-flex w-full justify-center border border-[var(--endeavour)]/50 rounded-lg px-4 py-1 text-[0.72rem] font-medium hover:border-[var(--endeavour)] transition-colors">
                                            <span className="items-center flex pt-[2px] text-[var(--endeavour)]">{pageSize}</span>
                                            <HiMiniChevronUpDown className="ml-2 -mr-1 mt-0.5 h-4 w-4 text-[var(--endeavour)]" />
                                        </MenuButton>
                                        <Transition as={Fragment} enter="transition ease-out duration-100" enterFrom="transform opacity-0 scale-95" enterTo="transform opacity-100 scale-100" leave="transition ease-in duration-75" leaveFrom="transform opacity-100 scale-100" leaveTo="transform opacity-0 scale-95">
                                            <MenuItems className="absolute right-0 bottom-10 w-[4.2rem] origin-top-right rounded-lg bg-white shadow-lg ring-1 ring-[var(--selago)] focus:outline-none z-50">
                                                <div className="px-1 py-1">
                                                    {[5, 10, 20, 25, 50, 100].map(x => (
                                                        <MenuItem key={x}>
                                                            <button
                                                                onClick={() => { setPageSize(x); setPageIndex(0); }}
                                                                className={`${pageSize === x ? 'bg-[#dbeeff] text-[var(--endeavour)] font-semibold' : 'text-[var(--port-gore)]'} flex w-full items-center rounded-lg px-2 py-1.5 text-[0.72rem] mt-0.5 justify-center ${pageSize !== x ? 'hover:bg-[var(--selago)]' : ''}`}
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
                </div> {/* end outer card */}
            </div>
        </div>
    );
};

export default ShipmentPage;
