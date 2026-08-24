'use client'

// Storage Costs — average storage cost per MT, expressed per week / month / year.
//
// Model (agreed with the client, grounded in what the data supports today):
//  • Only `storage` and `warehouse` expense types count toward the per-MT storage rate
//    (demurrage = delay penalty, stuffing/freight = one-time handling → excluded).
//  • A storage invoice is tagged to a WAREHOUSE + MONTH (terminals bill monthly per
//    warehouse), not to individual lots.
//  • Cost per MT for a (warehouse, month) = tagged cost ÷ MT stored in that warehouse that
//    month, where "MT stored" = unsold inbound lots that had arrived by month-end. Exit
//    dates aren't reliably tracked yet, so this uses current sold status as a proxy — an
//    honest v1 that improves once out-dates are captured.
//  • The week/month/year toggle just re-expresses the monthly rate (×1, ÷4.345, ×12).
import { useContext, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom';
import { SettingsContext } from "../../../contexts/useSettingsContext";
import { UserAuth } from "../../../contexts/useAuthContext";
import { loadData, loadAllStockData, updateExpenseField } from '../../../utils/utils';
import { UNIT, ym, toUsd, mtInWh, isStorageType, computeStorageMetric } from './storageUtils';
import { NumericFormat } from 'react-number-format';
import dateFormat from 'dateformat';
import { Warehouse, Save, Boxes, AlertTriangle, Check, Receipt, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { TableSkeleton } from "../../../components/skeletons";
import { Selector } from '../../../components/selectors/selectShad';
import { NameCell } from '../../../components/Avatar';
import { SortTh, sortRows, useSortState } from '@components/table/sorting';

const fmtUsd = (v) => `$${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v || 0)}`;
const fmtMt = (v) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(v || 0);

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// 'YYYY-MM' -> 'Dec 2023'. Every other date in the app is written dd.mm.yy
// (expenses, company expenses, global search), so a full "December 2023" here
// read as a different app. An abbreviated month is as close as a month-only
// value gets to that, and it costs ~50px of column width.
const fmtMonth = (v) => (typeof v === 'string' && v.length >= 7)
    ? `${MONTHS[parseInt(v.slice(5, 7), 10) - 1] || '?'} ${v.slice(0, 4)}`
    : '';

// App-styled month picker (no native browser picker). value: 'YYYY-MM' | '' ; onChange('YYYY-MM').
// Rendered through a portal so the triage table's horizontal scroll container can't clip it.
function MonthPickerPill({ value, onChange }) {
    const btnRef = useRef(null);
    const [open, setOpen] = useState(false);
    const [pos, setPos] = useState({ top: 0, left: 0 });
    const now = new Date();
    const selYear = value ? parseInt(value.slice(0, 4), 10) : now.getFullYear();
    const selMonth = value ? parseInt(value.slice(5, 7), 10) : null; // 1-12
    const [viewYear, setViewYear] = useState(selYear);

    const openPicker = () => {
        const r = btnRef.current?.getBoundingClientRect();
        if (r) {
            const estH = 290, width = 224;
            const left = Math.max(8, Math.min(r.left, window.innerWidth - width - 8));
            // Open below when there's room; otherwise anchor the popover's BOTTOM just above
            // the field so it grows upward with no gap (a fixed popover can't be scrolled to).
            if (window.innerHeight - r.bottom >= estH + 8) {
                setPos({ left, top: r.bottom + 4, bottom: undefined });
            } else {
                setPos({ left, top: undefined, bottom: window.innerHeight - r.top + 4 });
            }
        }
        setViewYear(selYear);
        setOpen(true);
    };
    const pick = (mIdx) => { onChange(`${viewYear}-${String(mIdx + 1).padStart(2, '0')}`); setOpen(false); };
    const thisMonth = () => { const d = new Date(); onChange(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`); setOpen(false); };

    return (
        <>
            <button ref={btnRef} type="button" onClick={openPicker}
                className="flex w-full items-center gap-1.5 rounded-lg bg-[var(--bg-subtle)] border border-[var(--line-strong)] px-2 h-7 hover:border-[var(--endeavour)] transition-colors"
                style={{ fontSize: 'var(--fs-body)', color: value ? 'var(--chathams-blue)' : 'var(--regent-gray)' }}>
                <Calendar className="w-3.5 h-3.5 text-[var(--endeavour)] shrink-0" />
                <span className="flex-1 text-left whitespace-nowrap">{value ? fmtMonth(value) : 'Pick month'}</span>
            </button>
            {open && typeof document !== 'undefined' && createPortal(
                <>
                    <div className="fixed inset-0 z-page-popover" onClick={() => setOpen(false)} />
                    <div className="fixed z-dropdown rounded-2xl shadow-xl bg-[var(--bg-card)] border border-[var(--bg-subtle)] overflow-hidden" style={{ top: pos.top, bottom: pos.bottom, left: pos.left, width: 224 }}>
                        <div className="flex items-center justify-between py-1.5 px-2" style={{ background: 'var(--bg-subtle)' }}>
                            <button type="button" onClick={() => setViewYear(y => y - 1)} className="p-1 rounded hover:bg-[var(--bg-subtle)]"><ChevronLeft className="w-4 h-4 text-[var(--endeavour)]" /></button>
                            <span className="font-semibold" style={{ fontSize: 'var(--fs-title)', color: 'var(--chathams-blue)' }}>{viewYear}</span>
                            <button type="button" onClick={() => setViewYear(y => y + 1)} className="p-1 rounded hover:bg-[var(--bg-subtle)]"><ChevronRight className="w-4 h-4 text-[var(--endeavour)]" /></button>
                        </div>
                        <div className="grid grid-cols-3 gap-1 p-2">
                            {MONTHS.map((m, i) => {
                                const isSel = selMonth === i + 1 && selYear === viewYear;
                                return (
                                    <button key={m} type="button" onClick={() => pick(i)}
                                        className={`rounded-lg py-1.5 font-medium transition-colors ${isSel ? '' : 'hover:bg-[var(--bg-subtle)]'}`}
                                        style={{ fontSize: 'var(--fs-input)', background: isSel ? 'var(--endeavour)' : 'transparent', color: isSel ? 'var(--on-brand)' : 'var(--chathams-blue)' }}>
                                        {m}
                                    </button>
                                );
                            })}
                        </div>
                        <div className="flex items-center justify-between px-2 py-1.5 border-t border-[var(--bg-subtle)]">
                            <button type="button" onClick={() => { onChange(''); setOpen(false); }} className="hover:underline" style={{ fontSize: 'var(--fs-body)', color: 'var(--regent-gray)' }}>Clear</button>
                            <button type="button" onClick={thisMonth} className="font-medium hover:underline" style={{ fontSize: 'var(--fs-body)', color: 'var(--endeavour)' }}>This month</button>
                        </div>
                    </div>
                </>,
                document.body
            )}
        </>
    );
}

const StorageCosts = () => {
    const { settings } = useContext(SettingsContext);
    const { uidCollection } = UserAuth();

    const [allExpenses, setAllExpenses] = useState([]); // storage-type expenses across recent years
    const [lots, setLots] = useState([]);           // all stock lots
    const [loading, setLoading] = useState(true);
    const [unit, setUnit] = useState('month');
    const [year, setYear] = useState('all');        // 'all' or 'YYYY' — page-local period filter
    const [edits, setEdits] = useState({});         // id -> { storageWh, storageMonth } (triage drafts)
    const [savingId, setSavingId] = useState(null);
    // Triage-table filters. The year filter above scopes the whole page; these narrow
    // the "needs tagging" list, which is the part you actually work through row by row.
    const [triageSupplier, setTriageSupplier] = useState('');
    const [triageQ, setTriageQ] = useState('');
    // Both tables sort on click. Separate state per table so sorting one doesn't
    // reorder the other, and neither starts sorted — each opens in its natural
    // order (years newest-first, invoices as loaded).
    const yearSort = useSortState();
    const triageSort = useSortState();

    const expTypes = settings?.Expenses?.Expenses || [];
    const warehouses = settings?.Stocks?.Stocks || [];
    const whName = (id) => { const w = warehouses.find(k => k.id === id); return w?.stock || w?.nname || ''; };
    // Warehouse options for the app-styled Selector (uniform display label = stock || nname).
    const whOptions = useMemo(() => warehouses.map(w => ({ ...w, _label: w.stock || w.nname || '' })), [warehouses]);

    // Load storage expenses across recent years (this page has its own year filter, independent of
    // the global date range) plus all stock, so we can show per-year figures and a summary table.
    useEffect(() => {
        const Load = async () => {
            if (!uidCollection || Object.keys(settings).length === 0) return;
            setLoading(true);
            const thisYr = new Date().getFullYear();
            const [exp, allLots] = await Promise.all([
                loadData(uidCollection, 'expenses', { start: `${thisYr - 9}-01-01`, end: `${thisYr}-12-31` }),
                loadAllStockData(uidCollection),
            ]);
            setAllExpenses((exp || []).filter(e => isStorageType(e, expTypes)));
            setLots((allLots || []).filter(Boolean));
            setLoading(false);
        };
        Load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [uidCollection, settings]);

    // The year a storage invoice belongs to = its covered month if tagged, else its date.
    // (storageMonth/date are string-safe here; ym already coerces non-strings.)
    const expYear = (e) => ((typeof e?.storageMonth === 'string' ? e.storageMonth : '') || ym(e?.date) || '').slice(0, 4);

    // Years present in the data (newest first) for the period selector + summary table.
    const years = useMemo(
        () => [...new Set(allExpenses.map(expYear).filter(Boolean))].sort((a, b) => b.localeCompare(a)),
        [allExpenses]
    );

    // Expenses scoped to the chosen year ('all' = every year loaded).
    const expenses = useMemo(
        () => (year === 'all' ? allExpenses : allExpenses.filter(e => expYear(e) === year)),
        [allExpenses, year]
    );

    // Per-year roll-up: storage spend, MT-months and the average $/MT rate for each year.
    const perYear = useMemo(() => {
        const map = {};
        allExpenses.forEach(e => { const y = expYear(e); if (y) (map[y] ??= []).push(e); });
        return Object.entries(map)
            .sort((a, b) => b[0].localeCompare(a[0]))
            .map(([y, list]) => {
                const taggedY = list.filter(e => e.storageWh && e.storageMonth);
                const m = computeStorageMetric({ tagged: taggedY, lots, whName });
                const spend = list.reduce((s, e) => s + toUsd(parseFloat(e.amount) || 0, e.cur), 0);
                // _rate mirrors rate but writes -1 for null: sortRows would otherwise
                // compare an untagged year's null as the string "null".
                return { year: y, spend, count: list.length, taggedCount: taggedY.length, mtMonths: m.totalMt, rate: m.overall, _rate: m.overall ?? -1 };
            });
    }, [allExpenses, lots, warehouses]); // eslint-disable-line react-hooks/exhaustive-deps

    const tagged = useMemo(() => expenses.filter(e => e.storageWh && e.storageMonth), [expenses]);
    const untagged = useMemo(() => expenses.filter(e => !(e.storageWh && e.storageMonth)), [expenses]);

    // Only offer suppliers that appear in the untagged list, so the dropdown can never
    // select its way to an empty table.
    const triageSuppliers = useMemo(() => {
        const ids = [...new Set(untagged.map(e => e.supplier).filter(Boolean))];
        return ids
            .map(id => ({ id, _label: settings.Supplier?.Supplier?.find(sp => sp.id === id)?.nname || '' }))
            .filter(o => o._label)
            .sort((a, b) => a._label.localeCompare(b._label));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [untagged, settings]);

    const untaggedShown = useMemo(() => {
        const q = triageQ.trim().toLowerCase();
        return untagged.filter(e => {
            if (triageSupplier && e.supplier !== triageSupplier) return false;
            if (!q) return true;
            const sup = settings.Supplier?.Supplier?.find(sp => sp.id === e.supplier)?.nname || '';
            return `${e.expense || ''} ${sup}`.toLowerCase().includes(q);
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [untagged, triageSupplier, triageQ, settings]);

    // Aggregate tagged cost & MT per warehouse, plus an overall monthly $/MT rate.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const metric = useMemo(() => computeStorageMetric({ tagged, lots, whName }), [tagged, lots, warehouses]);

    // Real actuals — straight from the loaded expenses & stock, no tagging required:
    // total storage spend this period and the MT physically in each warehouse right now.
    const actuals = useMemo(() => {
        const totalSpend = expenses.reduce((s, e) => s + toUsd(parseFloat(e.amount) || 0, e.cur), 0);
        const whMt = warehouses
            .map(w => ({ id: w.id, name: whName(w.id), mt: mtInWh(lots, w.id, '') }))
            .filter(x => x.mt > 0.01)
            .sort((a, b) => b.mt - a.mt);
        const totalMt = whMt.reduce((s, x) => s + x.mt, 0);
        return { totalSpend, count: expenses.length, taggedCount: tagged.length, whMt, totalMt };
    }, [expenses, lots, warehouses, tagged]); // eslint-disable-line react-hooks/exhaustive-deps

    const factor = UNIT.find(u => u.key === unit).factor;
    const rateStr = (monthlyRate) => monthlyRate == null ? '—' : `${fmtUsd(monthlyRate * factor)}/MT`;

    // Suggest a warehouse for an untagged invoice by reusing the one already chosen for
    // another storage invoice from the same supplier (a terminal maps to one warehouse).
    const suggestWh = (e) => expenses.find(x => x.id !== e.id && x.supplier && x.supplier === e.supplier && x.storageWh)?.storageWh || '';

    const draftOf = (e) => edits[e.id] || { storageWh: e.storageWh || suggestWh(e), storageMonth: e.storageMonth || ym(e.date) };
    const setDraft = (id, patch) => setEdits(prev => {
        const e = expenses.find(x => x.id === id) || {};
        const base = prev[id] || { storageWh: e.storageWh || suggestWh(e), storageMonth: e.storageMonth || ym(e.date) };
        return { ...prev, [id]: { ...base, ...patch } };
    });

    // Decorated rows for the triage table. Sorting runs on these resolved fields
    // rather than the raw record: the record holds supplier and warehouse as ids,
    // and the amount can be in either currency, so sorting it raw would order by
    // uuid and compare EUR against USD. Dates become plain integers (20231205)
    // because sortRows reads '2023-12-05' as the number 2023, which ties every
    // date in a year.
    const triageRows = useMemo(() => {
        const rows = untaggedShown.map(e => {
            const d = draftOf(e);
            const dateStr = typeof e.date === 'string' ? e.date.substring(0, 10) : '';
            return {
                row: e,
                draft: d,
                _date: Number(dateStr.replace(/-/g, '')) || 0,
                _dateStr: dateStr,
                _invoice: e.expense || '',
                _supplier: settings.Supplier?.Supplier?.find(sp => sp.id === e.supplier)?.nname || '',
                _amount: toUsd(parseFloat(e.amount) || 0, e.cur),
                _wh: whName(d.storageWh),
                _month: Number((d.storageMonth || '').replace(/-/g, '')) || 0,
            };
        });
        return triageSort.sortKey ? sortRows(rows, triageSort.sortKey, triageSort.sortDir) : rows;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [untaggedShown, edits, expenses, warehouses, settings, triageSort.sortKey, triageSort.sortDir]);

    const yearRows = useMemo(
        () => (yearSort.sortKey ? sortRows(perYear, yearSort.sortKey, yearSort.sortDir) : perYear),
        [perYear, yearSort.sortKey, yearSort.sortDir]
    );

    const saveTag = async (e) => {
        const d = draftOf(e);
        if (!d.storageWh || !d.storageMonth) return;
        setSavingId(e.id);
        try {
            await updateExpenseField(uidCollection, e.id, e.date, { storageWh: d.storageWh, storageMonth: d.storageMonth });
            setAllExpenses(prev => prev.map(x => x.id === e.id ? { ...x, storageWh: d.storageWh, storageMonth: d.storageMonth } : x));
            setEdits(prev => { const n = { ...prev }; delete n[e.id]; return n; });
        } finally { setSavingId(null); }
    };

    if (loading || Object.keys(settings).length === 0) {
        return <div className="mt-[72px] p-5"><TableSkeleton /></div>;
    }

    return (
        <div className="mx-auto w-full max-w-full px-1 md:px-2 pb-24 mt-[72px]" style={{ background: 'var(--bg-subtle)' }}>
            <div className="page-card rounded-2xl p-3 sm:p-5 mt-8 border border-[var(--line)] shadow-card w-full bg-[var(--bg-card)]">
                {/* Header + unit toggle */}
                <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
                    <div>
                        <h1 className="text-display">
                            Storage Costs
                        </h1>
                        <p className="responsiveTextTable text-[var(--regent-gray)] pl-3 mt-1">
                            Average storage cost per MT. Tag each storage invoice to a warehouse + month below; the rate updates automatically.
                        </p>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex items-center gap-2">
                            <span className="responsiveTextTable text-[var(--regent-gray)] whitespace-nowrap hidden sm:inline">Year:</span>
                            <div style={{ minWidth: 132 }}>
                                <Selector
                                    arr={[{ id: 'all', _label: 'All years' }, ...years.map(y => ({ id: y, _label: y }))]}
                                    value={{ year }}
                                    onChange={(v) => setYear(v || 'all')}
                                    name='year'
                                    secondaryName='_label'
                                />
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                        <span className="responsiveTextTable text-[var(--regent-gray)] whitespace-nowrap hidden sm:inline">Show rate as:</span>
                        <div className="flex items-center gap-1">
                            {UNIT.map(u => (
                                <button key={u.key} type="button" onClick={() => setUnit(u.key)}
                                    className="rounded-lg font-medium transition-colors"
                                    style={{
                                        fontSize: 'var(--fs-body)', padding: '5px 12px',
                                        background: unit === u.key ? 'var(--endeavour)' : 'var(--bg-card)',
                                        color: unit === u.key ? 'var(--on-brand)' : 'var(--chathams-blue)',
                                        border: `1px solid ${unit === u.key ? 'var(--endeavour)' : 'var(--line-strong)'}`,
                                    }}>
                                    {u.label}
                                </button>
                            ))}
                        </div>
                        </div>
                    </div>
                </div>

                {/* Real actuals — exact figures from your expenses & stock, shown even before tagging */}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 mb-3">
                    <div className="rounded-2xl p-4 bg-[var(--bg-card)] border border-[var(--line)] shadow-sm">
                        <div className="flex items-center gap-1.5 text-[var(--regent-gray)]" style={{ fontSize: 'var(--fs-table)' }}><Receipt className="w-3.5 h-3.5" /> Storage spend · {year === 'all' ? 'all years' : year}</div>
                        <div className="font-bold mt-1 text-[var(--chathams-blue)]" style={{ fontSize: 'var(--fs-display)' }}>{fmtUsd(actuals.totalSpend)}</div>
                        <div className="text-[var(--regent-gray)] mt-0.5" style={{ fontSize: 'var(--fs-table)' }}>
                            {actuals.count} invoice{actuals.count === 1 ? '' : 's'} · {actuals.taggedCount} tagged · {actuals.count - actuals.taggedCount} to tag
                        </div>
                    </div>
                    <div className="rounded-2xl p-4 bg-[var(--bg-card)] border border-[var(--line)] shadow-sm">
                        <div className="flex items-center gap-1.5 text-[var(--regent-gray)]" style={{ fontSize: 'var(--fs-table)' }}><Boxes className="w-3.5 h-3.5" /> In storage now</div>
                        <div className="font-bold mt-1 text-[var(--chathams-blue)]" style={{ fontSize: 'var(--fs-display)' }}>{fmtMt(actuals.totalMt)} MT</div>
                        <div className="text-[var(--regent-gray)] mt-0.5" style={{ fontSize: 'var(--fs-table)' }}>{actuals.whMt.length} warehouse{actuals.whMt.length === 1 ? '' : 's'} with stock</div>
                    </div>
                    <div className="rounded-2xl p-4 bg-[var(--bg-card)] border border-[var(--line)] shadow-sm">
                        <div className="flex items-center gap-1.5 text-[var(--regent-gray)] mb-1" style={{ fontSize: 'var(--fs-table)' }}><Warehouse className="w-3.5 h-3.5" /> By warehouse (MT now)</div>
                        <div className="flex flex-col gap-0.5 max-h-[4.5rem] overflow-y-auto pr-1">
                            {actuals.whMt.length === 0
                                ? <span className="responsiveTextTable text-[var(--regent-gray)]">No stock on hand</span>
                                : actuals.whMt.map(w => (
                                    <div key={w.id} className="flex items-center justify-between" style={{ fontSize: 'var(--fs-body)' }}>
                                        <span className="text-[var(--port-gore)] truncate pr-2">
                                            <NameCell name={w.name} size={16} fallback="—" />
                                        </span>
                                        <span className="font-medium text-[var(--chathams-blue)] whitespace-nowrap">{fmtMt(w.mt)} MT</span>
                                    </div>
                                ))}
                        </div>
                    </div>
                </div>

                {/* Overall + per-warehouse rate cards (require warehouse+month tagging) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-5">
                    <div className="rounded-2xl p-4 text-[var(--on-brand)]" style={{ background: 'linear-gradient(135deg, var(--endeavour), var(--chathams-blue))' }}>
                        <div className="flex items-center gap-1.5 opacity-90" style={{ fontSize: 'var(--fs-table)' }}><Boxes className="w-3.5 h-3.5" /> Avg storage cost {UNIT.find(u => u.key === unit).label}</div>
                        <div className="font-bold mt-1" style={{ fontSize: 'var(--fs-stat)' }}>{rateStr(metric.overall)}</div>
                        <div className="opacity-80 mt-0.5" style={{ fontSize: 'var(--fs-table)' }}>
                            {fmtUsd(metric.totalCost)} tagged · {new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(metric.totalMt)} MT-months
                        </div>
                    </div>
                    {metric.rows.map(r => (
                        <div key={r.wh} className="rounded-2xl p-4 bg-[var(--bg-card)] border border-[var(--line)] shadow-sm">
                            <div className="flex items-center gap-1.5 text-[var(--regent-gray)]" style={{ fontSize: 'var(--fs-table)' }}><Warehouse className="w-3.5 h-3.5" /> {r.name}</div>
                            <div className="font-bold mt-1 text-[var(--chathams-blue)]" style={{ fontSize: 'var(--fs-stat)' }}>{rateStr(r.rate)}</div>
                            <div className="text-[var(--regent-gray)] mt-0.5" style={{ fontSize: 'var(--fs-table)' }}>{fmtUsd(r.cost)} · {new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(r.mt)} MT-months</div>
                        </div>
                    ))}
                    {metric.rows.length === 0 && (
                        <div className="sm:col-span-2 xl:col-span-3 rounded-2xl p-4 bg-[var(--bg-card)] border border-dashed border-[var(--line)] flex items-center text-[var(--regent-gray)] responsiveTextTable">
                            No storage invoices tagged yet for this period — tag some below to see the rate.
                        </div>
                    )}
                </div>

                {/* Per-year summary — storage spend, MT-months and the average rate for each year */}
                <div className="rounded-2xl border border-[var(--line)] bg-[var(--bg-card)] overflow-hidden mb-5">
                    <div className="flex items-center gap-2 px-4 py-2.5" style={{ background: 'var(--bg-subtle)' }}>
                        <Calendar className="w-4 h-4 text-[var(--endeavour)]" />
                        <span className="responsiveText font-semibold text-[var(--chathams-blue)]">Per-year summary</span>
                        <span className="responsiveTextTable text-[var(--regent-gray)] ml-1 hidden sm:inline">— click a year to filter</span>
                    </div>
                    {perYear.length === 0 ? (
                        <div className="px-4 py-6 text-center responsiveTextTable text-[var(--regent-gray)]">No storage invoices yet.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            {/* Every column here has a bounded maximum, so every column is a
                                fixed px width sized to its own header and figures — a year is
                                a year on a 13" screen and on a 27" one. The trailing spacer
                                column takes the slack a percentage width used to hand to the
                                data columns. */}
                            <table className="w-full table-fixed" style={{ fontSize: 'var(--fs-table)', minWidth: 680 }}>
                                <colgroup>
                                    <col style={{ width: 72 }} />
                                    <col style={{ width: 140 }} />
                                    <col style={{ width: 116 }} />
                                    <col style={{ width: 172 }} />
                                    <col style={{ width: 152 }} />
                                    <col />
                                </colgroup>
                                <thead>
                                    <tr className="text-left uppercase text-[var(--ink-muted)]" style={{ background: "var(--bg-subtle)", fontSize: "var(--fs-table)", letterSpacing: "0.04em" }}>
                                        <SortTh colKey="year" label="Year" sort={yearSort} idle className="px-2 py-1 font-medium whitespace-nowrap" />
                                        <SortTh colKey="spend" label="Storage spend" sort={yearSort} idle className="px-2 py-1 font-medium text-right whitespace-nowrap" />
                                        <SortTh colKey="mtMonths" label="MT-months" sort={yearSort} idle className="px-2 py-1 font-medium text-right whitespace-nowrap" />
                                        <SortTh colKey="_rate" label={`Avg cost ${UNIT.find(u => u.key === unit).label}`} sort={yearSort} idle className="px-2 py-1 font-medium text-right whitespace-nowrap" />
                                        <SortTh colKey="count" label="Invoices (tagged)" sort={yearSort} idle className="px-2 py-1 font-medium text-right whitespace-nowrap" />
                                        <th className="px-2 py-1" />
                                    </tr>
                                </thead>
                                <tbody>
                                    {yearRows.map(r => (
                                        <tr key={r.year}
                                            onClick={() => setYear(year === r.year ? 'all' : r.year)}
                                            className={`border-t border-[var(--bg-subtle)] cursor-pointer transition-colors ${year === r.year ? 'bg-[var(--bg-subtle)]' : 'hover:bg-[var(--bg-subtle)]'}`}>
                                            <td className="px-2 py-1.5 text-[var(--chathams-blue)]">{r.year}</td>
                                            <td className="px-2 py-1.5 text-right text-[var(--port-gore)] numeric">{fmtUsd(r.spend)}</td>
                                            <td className="px-2 py-1.5 text-right text-[var(--port-gore)] numeric">{new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(r.mtMonths)}</td>
                                            <td className="px-2 py-1.5 text-right text-[var(--chathams-blue)] numeric">{rateStr(r.rate)}</td>
                                            <td className="px-2 py-1.5 text-right text-[var(--port-gore)] numeric">{r.count} ({r.taggedCount})</td>
                                            <td className="px-2 py-1.5" />
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Triage: untagged storage invoices */}
                <div className="rounded-2xl border border-[var(--line)] bg-[var(--bg-card)] overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-2.5" style={{ background: 'var(--bg-subtle)' }}>
                        {untagged.length > 0 ? <AlertTriangle className="w-4 h-4" style={{ color: 'var(--warn-text)' }} /> : <Check className="w-4 h-4" style={{ color: 'var(--ok-text)' }} />}
                        <span className="responsiveText font-semibold text-[var(--chathams-blue)]">
                            Storage invoices needing a warehouse + month
                        </span>
                        <span className="rounded-lg px-2 py-0.5 font-semibold" style={{ fontSize: 'var(--fs-table)', background: untagged.length ? 'var(--warn-bg)' : 'var(--ok-bg)', color: untagged.length ? 'var(--warn-text)' : 'var(--ok-text)', boxShadow: `inset 0 0 0 1px ${untagged.length ? 'var(--warn-border)' : 'var(--ok-border)'}` }}>
                            {untagged.length}
                        </span>
                        {untagged.length > 1 && (
                            <div className="flex items-center gap-2">
                                <input
                                    value={triageQ}
                                    onChange={(e) => setTriageQ(e.target.value)}
                                    placeholder="Search invoice or supplier"
                                    className="input h-7"
                                    style={{ width: 190 }}
                                />
                                {triageSuppliers.length > 1 && (
                                    <div style={{ minWidth: 150 }}>
                                        <Selector
                                            arr={[{ id: '', _label: 'All suppliers' }, ...triageSuppliers]}
                                            value={{ triageSupplier }}
                                            onChange={(v) => setTriageSupplier(v || '')}
                                            name='triageSupplier'
                                            secondaryName='_label'
                                            classes="h-7"
                                        />
                                    </div>
                                )}
                            </div>
                        )}
                        {actuals.count > 0 && (
                            <div className="ml-auto flex items-center gap-2 flex-1 justify-end">
                                <div className="h-1.5 rounded-full overflow-hidden bg-[var(--bg-sunken)] w-full" style={{ boxShadow: 'inset 0 0 0 1px var(--line)', maxWidth: 160 }}>
                                    <div className="h-full rounded-full transition-all" style={{ width: `${Math.round((actuals.taggedCount / actuals.count) * 100)}%`, background: 'var(--ok-text)' }} />
                                </div>
                                <span className="whitespace-nowrap font-medium" style={{ fontSize: 'var(--fs-table)', color: 'var(--chathams-blue)' }}>{actuals.taggedCount}/{actuals.count} tagged</span>
                            </div>
                        )}
                    </div>

                    {triageRows.length === 0 ? (
                        <div className="px-4 py-8 text-center responsiveTextTable text-[var(--regent-gray)]">
                            {untagged.length === 0
                                ? 'All storage invoices in this period are tagged. 🎉'
                                : 'No untagged invoice matches this filter.'}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            {/* Fixed px per column, each sized to its own content plus its own
                                header — a date is eight characters wide whatever the monitor is.
                                Only the invoice number is genuinely free text, so it is the one
                                auto column and absorbs all the slack; minWidth is the six fixed
                                widths (808) plus a floor for it, so the table scrolls at a narrow
                                viewport rather than crushing the one column that can't take it. */}
                            <table className="w-full table-fixed" style={{ fontSize: 'var(--fs-table)', minWidth: 980 }}>
                                <colgroup>
                                    <col style={{ width: 84 }} />
                                    <col />
                                    <col style={{ width: 184 }} />
                                    <col style={{ width: 112 }} />
                                    <col style={{ width: 176 }} />
                                    <col style={{ width: 144 }} />
                                    <col style={{ width: 108 }} />
                                </colgroup>
                                <thead>
                                    <tr className="text-left uppercase text-[var(--ink-muted)]" style={{ background: "var(--bg-subtle)", fontSize: "var(--fs-table)", letterSpacing: "0.04em" }}>
                                        <SortTh colKey="_date" label="Date" sort={triageSort} idle className="px-2 py-1 font-medium whitespace-nowrap" />
                                        <SortTh colKey="_invoice" label="Invoice" sort={triageSort} idle className="px-2 py-1 font-medium whitespace-nowrap" />
                                        {/* "Billed by", not "Supplier". This column is the vendor on the
                                            expense, and the vendor of a storage invoice is itself a
                                            terminal — so it prints the same company as the warehouse
                                            beside it and reads as one fact duplicated. Billed by = who
                                            sent the invoice; Warehouse = where the material sits. */}
                                        <SortTh colKey="_supplier" label="Billed by" sort={triageSort} idle className="px-2 py-1 font-medium whitespace-nowrap" />
                                        <SortTh colKey="_amount" label="Amount" sort={triageSort} idle className="px-2 py-1 font-medium text-right whitespace-nowrap" />
                                        <SortTh colKey="_wh" label="Warehouse" sort={triageSort} idle className="px-2 py-1 font-medium whitespace-nowrap" />
                                        <SortTh colKey="_month" label="Month covered" sort={triageSort} idle className="px-2 py-1 font-medium whitespace-nowrap" />
                                        <th className="px-2 py-1"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {triageRows.map(({ row: e, draft: d, _dateStr }) => {
                                        const ready = d.storageWh && d.storageMonth;
                                        return (
                                            <tr key={e.id} className="border-t border-[var(--bg-subtle)]">
                                                {/* dd.mm.yy — what expenses, company expenses and global search
                                                    all print. This cell held the app's only ISO date. */}
                                                <td className="px-2 py-1.5 whitespace-nowrap text-[var(--port-gore)] numeric">{_dateStr ? dateFormat(_dateStr, 'dd.mm.yy') : '—'}</td>
                                                <td className="px-2 py-1.5 text-[var(--port-gore)] truncate" title={e.expense || ''}>{e.expense || '—'}</td>
                                                <td className="px-2 py-1.5 text-[var(--port-gore)]">
                                                    <NameCell name={settings.Supplier?.Supplier?.find(s => s.id === e.supplier)?.nname} fallback="—" maxWidth={166} />
                                                </td>
                                                <td className="px-2 py-1.5 text-right whitespace-nowrap text-[var(--port-gore)] numeric">
                                                    <NumericFormat value={parseFloat(e.amount) || 0} displayType="text" thousandSeparator prefix={e.cur === 'us' ? '$' : '€'} decimalScale={2} fixedDecimalScale />
                                                </td>
                                                <td className="px-2 py-1.5">
                                                    <Selector
                                                        arr={whOptions}
                                                        value={{ storageWh: d.storageWh }}
                                                        onChange={(id) => setDraft(e.id, { storageWh: id })}
                                                        name='storageWh'
                                                        secondaryName='_label'
                                                        clear={() => setDraft(e.id, { storageWh: '' })}
                                                        classes="h-7"
                                                    />
                                                </td>
                                                <td className="px-2 py-1.5">
                                                    <MonthPickerPill value={d.storageMonth} onChange={(v) => setDraft(e.id, { storageMonth: v })} />
                                                </td>
                                                <td className="px-2 py-1.5">
                                                    <button type="button" disabled={!ready || savingId === e.id} onClick={() => saveTag(e)}
                                                        className="inline-flex items-center gap-1 rounded-lg px-2 h-7 text-[var(--on-brand)] font-medium disabled:opacity-40"
                                                        style={{ fontSize: 'var(--fs-body)', background: 'var(--endeavour)' }}>
                                                        <Save className="w-3 h-3" /> {savingId === e.id ? 'Saving…' : 'Save'}
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <p className="responsiveTextTable text-[var(--regent-gray)] mt-4 pl-1">
                    Note: MT stored is estimated from each lot&apos;s arrival date and current sold status (exit dates aren&apos;t tracked yet), so the rate is a close approximation. Only <b>storage</b> and <b>warehouse</b> expense types are counted.
                </p>
            </div>
        </div>
    );
};

export default StorageCosts;
