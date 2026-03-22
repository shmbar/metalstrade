'use client';
import { useContext, useEffect, useState, useRef } from 'react';
import { SettingsContext } from "../../../contexts/useSettingsContext";
import { UserAuth } from "../../../contexts/useAuthContext";
import { loadData, updateContractField } from '../../../utils/utils';
import VideoLoader from '../../../components/videoLoader';
import Toast from '../../../components/toast.js';
import DateRangePicker from '../../../components/dateRangePicker';
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

const STATUSES = ['', 'Pending', 'In Transit', 'At Port', 'Delivered', 'On Hold'];

const STATUS_STYLES = {
    'Pending':    { backgroundColor: '#fef9c3', border: '1px solid #fde68a', color: '#92400e' },
    'In Transit': { backgroundColor: '#dbeeff', border: '1px solid #b8ddf8', color: 'var(--chathams-blue)' },
    'At Port':    { backgroundColor: '#ede9fe', border: '1px solid #ddd6fe', color: '#7c3aed' },
    'Delivered':  { backgroundColor: '#dcfce7', border: '1px solid #bbf7d0', color: '#166534' },
    'On Hold':    { backgroundColor: '#fce7f3', border: '1px solid #fbcfe8', color: '#be185d' },
    '':           { backgroundColor: '#f8fbff', border: '1px solid #d8e8f5', color: '#6b7280' },
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
        <div className="px-3 py-1 rounded-xl text-[11px] font-normal" style={{ backgroundColor: '#f8fbff', border: '1px solid #d8e8f5' }}>
            <textarea
                value={local}
                onChange={handleChange}
                rows={1}
                className="w-full min-w-[160px] text-[11px] text-gray-700 bg-transparent resize-none focus:outline-none placeholder:text-gray-400"
                placeholder="Add notes..."
            />
        </div>
    );
}

function StatusSelect({ value, onChange }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    return (
        <div ref={ref} className="relative flex justify-center">
            <button
                onClick={() => setOpen(p => !p)}
                className="flex items-center gap-1.5 rounded-xl px-3 py-1 font-medium text-[11px] cursor-pointer focus:outline-none w-full justify-between min-w-[110px]"
                style={STATUS_STYLES[value]}
            >
                <span>{value || '— Select —'}</span>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>
            </button>
            {open && (
                <div className="absolute z-50 top-full mt-1 left-0 min-w-full rounded-xl overflow-hidden shadow-lg" style={{ border: '1px solid #d8e8f5', backgroundColor: '#fff' }}>
                    {STATUSES.map(s => (
                        <div
                            key={s}
                            onClick={() => { onChange(s); setOpen(false); }}
                            className="px-3 py-1.5 text-[11px] font-medium cursor-pointer mx-1.5 my-1 rounded-lg transition-all"
                            style={{ ...STATUS_STYLES[s], opacity: value === s ? 1 : 0.85 }}
                        >
                            {s || '— Select —'}
                        </div>
                    ))}
                </div>
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

    useEffect(() => {
        if (!uidCollection || !dateSelect?.start) return;
        const load = async () => {
            setLoading(true);
            try {
                const [contractsData, invoicesData] = await Promise.all([
                    loadData(uidCollection, 'contracts', dateSelect),
                    loadData(uidCollection, 'invoices', dateSelect),
                ]);

                const map = {};
                (invoicesData || []).filter(Boolean).forEach(inv => {
                    const cid = inv.poSupplier?.id;
                    if (cid && inv.invType === '1111' && !map[cid]) {
                        map[cid] = { client: inv.client };
                    }
                });

                const sorted = (contractsData || [])
                    .filter(Boolean)
                    .sort((a, b) => (a.date || '').localeCompare(b.date || ''));

                setContracts(sorted);
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
            return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        } catch { return d; }
    };

    // Filter contracts by search + status
    const filtered = contracts.filter(c => {
        const matchStatus = statusFilter === '' || (c.shipmentStatus || '') === statusFilter;
        if (!matchStatus) return false;
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

    // Reset to first page when filters change
    useEffect(() => { setPageIndex(0); }, [search, statusFilter]);

    const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
    const safePageIndex = Math.min(pageIndex, pageCount - 1);
    const paginated = filtered.slice(safePageIndex * pageSize, (safePageIndex + 1) * pageSize);
    const startRow = filtered.length === 0 ? 0 : safePageIndex * pageSize + 1;
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
            { header: 'Contract #',    key: 'order',          width: 20 },
            { header: 'Supplier',      key: 'supplier',       width: 20 },
            { header: 'Invoice #',     key: 'invoice',        width: 15 },
            { header: 'Client',        key: 'client',         width: 20 },
            { header: 'Shipment Date', key: 'shipmentDate',   width: 18 },
            { header: 'Arrival Date',  key: 'arrivalDate',    width: 18 },
            { header: 'Status',        key: 'status',         width: 15 },
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
                shipmentDate: formatDate(c.date),
                arrivalDate:  formatDate(c.dateRange?.endDate),
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
                font-size: 11px !important;
            }
            .custom-table td {
                background-color: #fff;
                border: 1px solid #e0e0e0;
                text-align: center;
                vertical-align: middle;
                padding: 6px;
                border-radius: 4px;
                font-size: 10px !important;
            }
        `}</style>
            <div className="mx-auto w-full max-w-[98%] px-1 sm:px-2 md:px-3 pb-4 mt-[72px]">
                <VideoLoader loading={loading} fullScreen={true} />
                <Toast />

                {/* Outer card — title only */}
                <div className="rounded-2xl p-3 sm:p-5 mt-8 border border-[#b8ddf8] w-full backdrop-blur-[2px] bg-[#f8fbff]">
                    <div className="flex items-center justify-between pb-2 flex-wrap gap-2">
                        <h1 className="text-[14px] text-[var(--chathams-blue)] font-poppins responsiveTextTitle border-l-4 border-[var(--chathams-blue)] pl-2">
                            Shipments Tracking
                        </h1>
                    </div>

                    {/* Inner card — toolbar + table */}
                    <div className="rounded-2xl border border-[#b8ddf8] overflow-hidden" style={{ background: '#f8fbff' }}>

                    {/* Toolbar */}
                    <div
                        className="flex flex-col sm:flex-row sm:justify-between sm:items-center px-2 py-2 gap-2 rounded-t-xl"
                        style={{ borderBottom: '1px solid #b8ddf8', background: '#ffffff' }}
                    >
                        {/* Left: Search + Status filter chips */}
                        <div className="flex flex-wrap items-center gap-2">

                            {/* Search */}
                            <div className="flex items-center relative w-[120px] sm:w-[140px] h-7 border border-[var(--endeavour)] rounded-2xl bg-white focus-within:ring-1 focus-within:ring-blue-200 shadow-sm transition-all duration-200">
                                <input
                                    className="bg-white border-0 shadow-none pr-8 pl-3 focus:outline-none focus:ring-0 w-full text-[var(--endeavour)] placeholder:text-[var(--endeavour)] h-full text-xs rounded-2xl"
                                    placeholder="Search"
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    type="text"
                                />
                                {search === '' ? (
                                    <FaSearch className="text-gray-400 absolute right-3 top-1.5" style={{ fontSize: 14 }} />
                                ) : (
                                    <TiDeleteOutline
                                        className="text-gray-500 absolute right-3 top-2 cursor-pointer hover:text-red-500 transition-colors"
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

                            {/* Status filter chips */}
                            {showFilters && <div className="flex items-center gap-1 flex-wrap">
                                <button
                                    onClick={() => setStatusFilter('')}
                                    className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full border transition-colors ${statusFilter === '' ? 'bg-[var(--endeavour)] text-white border-[var(--endeavour)]' : 'bg-white text-[var(--endeavour)] border-[var(--endeavour)] hover:bg-[var(--selago)]'}`}
                                >
                                    All ({contracts.length})
                                </button>
                                {STATUSES.filter(Boolean).map(s => {
                                    const count = contracts.filter(c => (c.shipmentStatus || '') === s).length;
                                    return (
                                        <button
                                            key={s}
                                            onClick={() => setStatusFilter(prev => prev === s ? '' : s)}
                                            className="text-[11px] font-medium px-2.5 py-0.5 rounded-full transition-all"
                                            style={{ ...STATUS_STYLES[s], opacity: statusFilter === s ? 1 : 0.75, outline: statusFilter === s ? `2px solid ${STATUS_STYLES[s].color}` : 'none', outlineOffset: '1px' }}
                                        >
                                            {s}: {count}
                                        </button>
                                    );
                                })}
                            </div>}

                        </div>

                        {/* Right: DateRangePicker */}
                        <div className="flex-shrink-0">
                            <DateRangePicker />
                        </div>
                    </div>

                    {/* Table — Desktop */}
                    <div className="custom-table hidden md:block">
                    <div className="overflow-y-auto dashboard-scroll rounded-3xl border border-[#cecece]" style={{ borderLeft: '8px solid var(--chathams-blue)', borderRadius: '24px', maxHeight: `${Math.min(paginated.length * 53 + 60, 620)}px` }}>
                        <table className="w-full">
                            <thead className="sticky top-0 z-10">
                                <tr>
                                    {['Contract #','Supplier','Invoice #','Client','Shipment Date','Arrival Date','Status','Notes'].map(h => (
                                        <th key={h} className="font-poppins text-xs font-medium py-2" style={{ color: 'var(--chathams-blue)', letterSpacing: '0.05em', textAlign: 'center' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.length === 0 && !loading && (
                                    <tr>
                                        <td colSpan={8} style={{ textAlign: 'center', padding: '32px', color: '#9ca3af' }}>
                                            No shipments found.
                                        </td>
                                    </tr>
                                )}
                                {paginated.map((contract) => {
                                    const mainInv = getMainInvoice(contract);
                                    const status = contract.shipmentStatus || '';
                                    return (
                                        <tr key={contract.id} className="hover-row cursor-pointer transition-colors">
                                            <td>
                                                <div className="flex justify-center">
                                                    <div className="px-3 py-1 rounded-xl text-[11px] font-normal min-w-[70px] text-center" style={{ backgroundColor: '#f8fbff', border: '1px solid #d8e8f5' }}>
                                                        <button onClick={() => navigateTo(contract.id)} className="text-[var(--endeavour)] hover:underline">
                                                            {contract.order || '—'}
                                                        </button>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="flex justify-center">
                                                    <div className="px-3 py-1 rounded-xl text-[11px] font-normal min-w-[70px] text-center" style={{ backgroundColor: '#f8fbff', border: '1px solid #d8e8f5' }}>
                                                        {getSupplierName(contract)}
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="flex justify-center">
                                                    <div className="px-3 py-1 rounded-xl text-[11px] font-normal min-w-[70px] text-center" style={{ backgroundColor: '#f8fbff', border: '1px solid #d8e8f5' }}>
                                                        {mainInv ? (
                                                            <button onClick={() => navigateTo(contract.id)} className="text-[var(--endeavour)] hover:underline">
                                                                {mainInv.invoice}
                                                            </button>
                                                        ) : '—'}
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="flex justify-center">
                                                    <div className="px-3 py-1 rounded-xl text-[11px] font-normal min-w-[70px] text-center" style={{ backgroundColor: '#f8fbff', border: '1px solid #d8e8f5' }}>
                                                        {getClientName(contract.id)}
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="flex justify-center">
                                                    <div className="px-3 py-1 rounded-xl text-[11px] font-normal min-w-[70px] text-center" style={{ backgroundColor: '#f8fbff', border: '1px solid #d8e8f5' }}>
                                                        {formatDate(contract.date)}
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="flex justify-center">
                                                    <div className="px-3 py-1 rounded-xl text-[11px] font-normal min-w-[70px] text-center" style={{ backgroundColor: '#f8fbff', border: '1px solid #d8e8f5' }}>
                                                        {formatDate(contract.dateRange?.endDate)}
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="flex justify-center">
                                                    <StatusSelect
                                                        value={status}
                                                        onChange={s => handleStatusChange(contract, s)}
                                                    />
                                                </div>
                                            </td>
                                            <td>
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
                            <div className="text-center py-8 text-gray-400 text-sm">No shipments found.</div>
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
                                            className="font-medium text-[var(--endeavour)] text-xs hover:underline"
                                        >
                                            {contract.order || '—'}
                                        </button>
                                        <span
                                            className="text-[11px] font-medium px-2.5 py-0.5 rounded-full"
                                            style={status ? STATUS_STYLES[status] : { backgroundColor: '#f3f4f6', color: '#6b7280', border: '1px solid #d1d5db' }}
                                        >
                                            {status || 'No Status'}
                                        </span>
                                    </div>

                                    {/* Card body */}
                                    <div className="p-3 space-y-2">
                                        {[
                                            { label: 'Supplier',       value: getSupplierName(contract) },
                                            { label: 'Invoice #',      value: mainInv ? String(mainInv.invoice) : '—' },
                                            { label: 'Client',         value: getClientName(contract.id) },
                                            { label: 'Shipment Date',  value: formatDate(contract.date) },
                                            { label: 'Arrival Date',   value: formatDate(contract.dateRange?.endDate) },
                                        ].map(({ label, value }) => (
                                            <div key={label} className="flex flex-col space-y-1 pb-2" style={{ borderBottom: '1px solid #f0f4f8' }}>
                                                <span className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">{label}</span>
                                                <div className="px-2 py-1 rounded-xl text-[11px] text-gray-700" style={{ backgroundColor: '#f8fbff', border: '1px solid #d8e8f5' }}>
                                                    {value || '—'}
                                                </div>
                                            </div>
                                        ))}

                                        {/* Status */}
                                        <div className="flex flex-col space-y-1 pb-2" style={{ borderBottom: '1px solid #f0f4f8' }}>
                                            <span className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">Status</span>
                                            <StatusSelect
                                                value={status}
                                                onChange={s => handleStatusChange(contract, s)}
                                            />
                                        </div>

                                        {/* Notes */}
                                        <div className="flex flex-col space-y-1">
                                            <span className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">Notes</span>
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
                                <div className="text-sm font-medium" style={{ color: '#6B7280' }}>
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
