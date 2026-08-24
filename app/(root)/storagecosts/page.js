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
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom';
import { SettingsContext } from "../../../contexts/useSettingsContext";
import { ExpensesContext } from "../../../contexts/useExpensesContext";
import { UserAuth } from "../../../contexts/useAuthContext";
import { loadData, loadAllStockData, updateExpenseField } from '../../../utils/utils';
import { UNIT, ym, toUsd, mtInWh, isStorageType, computeStorageMetric } from './storageUtils';
import { NumericFormat } from 'react-number-format';
import dateFormat from 'dateformat';
import { Warehouse, Save, Boxes, AlertTriangle, Check, Receipt, Calendar, ChevronDown, ChevronLeft, ChevronRight, Loader2, Undo2 } from 'lucide-react';
import { TableSkeleton } from "../../../components/skeletons";
import Tltip from '../../../components/tlTip';
import { Selector } from '../../../components/selectors/selectShad';
import { NameCell } from '../../../components/Avatar';
import { SortTh, sortRows, useSortState } from '@components/table/sorting';
import ExpenseModal from '../expenses/modals/dataModal.js';

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
    const { settings, setDateYr } = useContext(SettingsContext);
    const { uidCollection } = UserAuth();
    // An invoice number opens the real expense record in the app's own expense modal
    // — the same one /expenses uses — rather than a second, divergent copy of it.
    // ExpensesProvider wraps the whole app, so all this page supplies is the row to
    // open and a reload for when the modal closes.
    const { valueExp, setValueExp, isOpen: expOpen, setIsOpen: setExpOpen } = useContext(ExpensesContext);

    const [allExpenses, setAllExpenses] = useState([]); // storage-type expenses across recent years
    const [lots, setLots] = useState([]);           // all stock lots
    const [loading, setLoading] = useState(true);
    const [unit, setUnit] = useState('month');
    const [year, setYear] = useState('all');        // 'all' or 'YYYY' — page-local period filter
    const [edits, setEdits] = useState({});         // id -> { storageWh, storageMonth } (triage drafts)
    const [savingId, setSavingId] = useState(null);
    // id -> the warehouse/month the invoice had BEFORE you saved. Saving used to be
    // final the instant you clicked: the row met the "tagged" test, dropped straight
    // out of the list, and a mis-click was gone with nowhere to click back. So a saved
    // row now stays exactly where it was, showing what it saved and an Undo, and this
    // holds the values Undo puts back. It is not a timed toast on purpose — you keep
    // your place in the list and there is no countdown to lose.
    const [justSaved, setJustSaved] = useState({});
    // Triage-table filters. The year filter above scopes the whole page; these narrow
    // the "needs tagging" list, which is the part you actually work through row by row.
    const [triageSupplier, setTriageSupplier] = useState('');
    const [triageQ, setTriageQ] = useState('');
    const [showIdleWh, setShowIdleWh] = useState(false); // warehouses with no spend and no stock
    // Both tables sort on click. Separate state per table so sorting one doesn't
    // reorder the other, and neither starts sorted — each opens in its natural
    // order (years newest-first, invoices as loaded).
    const yearSort = useSortState();
    const triageSort = useSortState();
    const whSort = useSortState();

    const expTypes = settings?.Expenses?.Expenses || [];
    const warehouses = settings?.Stocks?.Stocks || [];
    const whName = (id) => { const w = warehouses.find(k => k.id === id); return w?.stock || w?.nname || ''; };
    // Warehouse options for the app-styled Selector (uniform display label = stock || nname).
    const whOptions = useMemo(() => warehouses.map(w => ({ ...w, _label: w.stock || w.nname || '' })), [warehouses]);

    // Load storage expenses across recent years (this page has its own year filter, independent of
    // the global date range) plus all stock, so we can show per-year figures and a summary table.
    const load = useCallback(async () => {
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [uidCollection, settings]);

    useEffect(() => { load(); }, [load]);

    // Reload once the expense modal closes: it can edit or delete the record, and
    // every Firestore write busts the shared load cache, so a plain re-read is fresh.
    const expWasOpen = useRef(false);
    useEffect(() => {
        if (expWasOpen.current && !expOpen) load();
        expWasOpen.current = expOpen;
    }, [expOpen, load]);

    const openExpense = (e) => {
        setValueExp(e);
        setDateYr((e.dateRange?.startDate || (typeof e.date === 'string' ? e.date : '')).substring(0, 4));
        setExpOpen(true);
    };

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
    // What the table lists: everything still untagged, PLUS anything saved in this
    // sitting. `untagged` stays the true count, so the badge and the progress bar go on
    // measuring work left rather than rows on screen.
    const triageList = useMemo(
        () => expenses.filter(e => !(e.storageWh && e.storageMonth) || justSaved[e.id]),
        [expenses, justSaved]
    );

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
        return triageList.filter(e => {
            if (triageSupplier && e.supplier !== triageSupplier) return false;
            if (!q) return true;
            const sup = settings.Supplier?.Supplier?.find(sp => sp.id === e.supplier)?.nname || '';
            return `${e.expense || ''} ${sup}`.toLowerCase().includes(q);
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [triageList, triageSupplier, triageQ, settings]);

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

    // One row per warehouse — EVERY warehouse, not only the ones that happen to have a
    // tagged invoice. The four cards this replaced could only ever show warehouses that
    // already had a rate, so a warehouse you were looking for simply wasn't on the page,
    // and the ones that were showed a bare "—" with no way to tell what was missing.
    const whRows = useMemo(() => {
        const tagged = Object.fromEntries(metric.rows.map(r => [r.wh, r]));
        return warehouses
            .filter(w => w && w.id && !w.deleted)
            .map(w => {
                const m = tagged[w.id];
                return {
                    id: w.id,
                    _name: whName(w.id),
                    _cost: m?.cost || 0,
                    _mtMonths: m?.mt || 0,
                    _mtNow: mtInWh(lots, w.id, ''),
                    rate: m?.rate ?? null,
                    // -1 so sortRows orders "no rate" as a value instead of comparing null
                    // as the string "null".
                    _rate: m?.rate ?? -1,
                    months: m?.months || [],
                };
            })
            .sort((a, b) => (b._cost - a._cost) || (b._mtNow - a._mtNow) || a._name.localeCompare(b._name));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [warehouses, metric, lots]);

    // 52 warehouses are configured and only a handful are ever in play, so the table
    // opens on the ones that have something to say — storage spend, or stock standing
    // in them right now — and the all-zero rest fold away behind one line. Showing all
    // 52 by default buried the four rows the page is actually about.
    const whActive = useMemo(() => whRows.filter(r => r._cost > 0 || r._mtNow > 0.01), [whRows]);
    const whIdle = whRows.length - whActive.length;
    const whBase = showIdleWh ? whRows : whActive;
    const whShown = whSort.sortKey ? sortRows(whBase, whSort.sortKey, whSort.sortDir) : whBase;

    // Why a warehouse shows no $/MT. The two gaps are not the same problem and the fix
    // differs: an untagged warehouse is something you finish in the table below, whereas
    // cost with no MT-months means the stock records show nothing standing in that
    // warehouse for the months the terminal billed — a data question, not a tagging one.
    const whyNoRate = (r) => {
        if (r._cost <= 0) return 'No storage invoice tagged here yet';
        if (r._mtMonths > 0) return '';
        const ms = r.months.map(fmtMonth).filter(Boolean);
        const when = ms.length ? ms.slice(0, 3).join(', ') + (ms.length > 3 ? `, +${ms.length - 3} more` : '') : 'the months billed';
        return `Billed for ${when} — no stock recorded here ${ms.length === 1 ? 'that month' : 'in those months'}`;
    };

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
        // Captured before the write, from the RECORD rather than the draft — the draft
        // is pre-filled with a suggested warehouse and the invoice's own month, so
        // undoing to it would put back a guess instead of the blank you started from.
        const before = { storageWh: e.storageWh || '', storageMonth: e.storageMonth || '' };
        setSavingId(e.id);
        try {
            await updateExpenseField(uidCollection, e.id, e.date, { storageWh: d.storageWh, storageMonth: d.storageMonth });
            setAllExpenses(prev => prev.map(x => x.id === e.id ? { ...x, storageWh: d.storageWh, storageMonth: d.storageMonth } : x));
            setEdits(prev => { const n = { ...prev }; delete n[e.id]; return n; });
            setJustSaved(prev => ({ ...prev, [e.id]: before }));
        } finally { setSavingId(null); }
    };

    const undoTag = async (e) => {
        const before = justSaved[e.id];
        if (!before) return;
        setSavingId(e.id);
        try {
            await updateExpenseField(uidCollection, e.id, e.date, before);
            setAllExpenses(prev => prev.map(x => x.id === e.id ? { ...x, ...before } : x));
            // Put the choice back in the draft rather than discarding it: you undid a
            // save, not the twenty seconds of picking that led to it.
            setEdits(prev => ({ ...prev, [e.id]: { storageWh: e.storageWh || '', storageMonth: e.storageMonth || '' } }));
            setJustSaved(prev => { const n = { ...prev }; delete n[e.id]; return n; });
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

                {/* Three figures, all real: the rate the page exists to produce, and the two
                    actuals behind it that need no tagging at all. */}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 mb-3">
                    <div className="rounded-2xl p-4 text-[var(--on-brand)]" style={{ background: 'linear-gradient(135deg, var(--endeavour), var(--chathams-blue))' }}>
                        <div className="flex items-center gap-1.5 opacity-90" style={{ fontSize: 'var(--fs-table)' }}><Boxes className="w-3.5 h-3.5" /> Avg storage cost {UNIT.find(u => u.key === unit).label}</div>
                        <div className="font-bold mt-1" style={{ fontSize: 'var(--fs-display)' }}>{rateStr(metric.overall)}</div>
                        <div className="opacity-80 mt-0.5" style={{ fontSize: 'var(--fs-table)' }}>
                            {fmtUsd(metric.totalCost)} tagged · {new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(metric.totalMt)} MT-months
                        </div>
                    </div>
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
                </div>

                {/* The breakdown behind the headline card, so it sits directly under it.

                    This spent a version below the tagging table, on the reasoning that work
                    outranks reference. Wrong way round: tagging is a chore that is MEANT to
                    run out — finish it and that table collapses to one "all tagged" line —
                    whereas this is what the page is for, and it is here permanently. Laying
                    the page out around the temporary half put the answer below the errand.

                    What made it feel wrong at the top was 52 rows of dashes, and the idle
                    fold below fixes that directly; moving the section was treating the
                    symptom. */}
                <div className="rounded-2xl border border-[var(--line)] bg-[var(--bg-card)] overflow-hidden mb-5">
                    <div className="flex items-center gap-2 px-4 py-2.5" style={{ background: 'var(--bg-subtle)' }}>
                        <Warehouse className="w-4 h-4 text-[var(--endeavour)]" />
                        <span className="responsiveText font-semibold text-[var(--chathams-blue)]">By warehouse</span>
                        <span className="responsiveTextTable text-[var(--regent-gray)] ml-1 hidden sm:inline">
                            — {whActive.length} with spend or stock{whIdle > 0 ? `, ${whIdle} idle` : ''}
                        </span>
                    </div>
                    {whRows.length === 0 ? (
                        <div className="px-4 py-6 text-center responsiveTextTable text-[var(--regent-gray)]">No warehouses set up yet — add them under Settings → Stocks.</div>
                    ) : whShown.length === 0 ? (
                        <div className="px-4 py-6 text-center responsiveTextTable text-[var(--regent-gray)]">No warehouse has storage spend or stock in this period.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            {/* Fixed px for the five bounded columns; the reason is the one free-text
                                column and takes the slack. */}
                            <table className="w-full table-fixed" style={{ fontSize: 'var(--fs-table)', minWidth: 912 }}>
                                <colgroup>
                                    <col style={{ width: 200 }} />
                                    <col style={{ width: 132 }} />
                                    <col style={{ width: 116 }} />
                                    <col style={{ width: 108 }} />
                                    <col style={{ width: 172 }} />
                                    <col />
                                </colgroup>
                                <thead>
                                    <tr className="text-left uppercase text-[var(--ink-muted)]" style={{ background: "var(--bg-subtle)", fontSize: "var(--fs-table)", letterSpacing: "0.04em" }}>
                                        <SortTh colKey="_name" label="Warehouse" sort={whSort} idle className="px-2 py-1 font-medium whitespace-nowrap" />
                                        <SortTh colKey="_cost" label="Tagged spend" sort={whSort} idle className="px-2 py-1 font-medium text-right whitespace-nowrap" />
                                        <SortTh colKey="_mtMonths" label="MT-months" sort={whSort} idle className="px-2 py-1 font-medium text-right whitespace-nowrap" />
                                        <SortTh colKey="_mtNow" label="MT now" sort={whSort} idle className="px-2 py-1 font-medium text-right whitespace-nowrap" />
                                        <SortTh colKey="_rate" label={`Avg cost ${UNIT.find(u => u.key === unit).label}`} sort={whSort} idle className="px-2 py-1 font-medium text-right whitespace-nowrap" />
                                        <th className="px-2 py-1 font-medium whitespace-nowrap">Why blank</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {whShown.map(r => {
                                        const why = whyNoRate(r);
                                        return (
                                            <tr key={r.id} className="border-t border-[var(--bg-subtle)]">
                                                <td className="px-2 py-1.5 text-[var(--port-gore)]"><NameCell name={r._name} size={16} fallback="—" maxWidth={182} /></td>
                                                <td className="px-2 py-1.5 text-right text-[var(--port-gore)] numeric">{r._cost > 0 ? fmtUsd(r._cost) : '—'}</td>
                                                <td className="px-2 py-1.5 text-right text-[var(--port-gore)] numeric">{fmtMt(r._mtMonths)}</td>
                                                <td className="px-2 py-1.5 text-right text-[var(--port-gore)] numeric">{fmtMt(r._mtNow)}</td>
                                                <td className="px-2 py-1.5 text-right font-medium text-[var(--chathams-blue)] numeric">{rateStr(r.rate)}</td>
                                                <td className="px-2 py-1.5" style={{ color: 'var(--regent-gray)' }}>
                                                    {why && (
                                                        <Tltip direction='top' tltpText={why}>
                                                            <span className="block truncate">{why}</span>
                                                        </Tltip>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                    {whIdle > 0 && (
                        <button type="button" onClick={() => setShowIdleWh(v => !v)}
                            className="w-full flex items-center justify-center gap-1.5 px-4 py-2 border-t border-[var(--bg-subtle)] hover:bg-[var(--bg-subtle)] transition-colors"
                            style={{ fontSize: 'var(--fs-table)', color: 'var(--regent-gray)' }}>
                            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showIdleWh ? 'rotate-180' : ''}`} />
                            {showIdleWh ? 'Hide' : 'Show'} {whIdle} warehouse{whIdle === 1 ? '' : 's'} with no spend and no stock
                        </button>
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

                                Invoice used to be the auto column, and on a wide monitor it took
                                every spare pixel: ~800px of white space holding "20232492", which
                                is what made the table read as sparse and pushed Warehouse off the
                                right edge. An invoice number is short and bounded like everything
                                else here, so it is fixed too and a trailing spacer takes the slack
                                — the same shape the per-year table already uses. */}
                            <table className="w-full table-fixed" style={{ fontSize: 'var(--fs-table)', minWidth: 900 }}>
                                <colgroup>
                                    <col style={{ width: 84 }} />
                                    <col style={{ width: 140 }} />
                                    <col style={{ width: 184 }} />
                                    <col style={{ width: 112 }} />
                                    <col style={{ width: 176 }} />
                                    <col style={{ width: 144 }} />
                                    <col style={{ width: 48 }} />
                                    <col />
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
                                        <th className="px-2 py-1"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {triageRows.map(({ row: e, draft: d, _dateStr }) => {
                                        const ready = d.storageWh && d.storageMonth;
                                        const saved = justSaved[e.id];
                                        const busy = savingId === e.id;
                                        return (
                                            <tr key={e.id} className="border-t border-[var(--bg-subtle)]"
                                                style={saved ? { background: 'var(--ok-bg)' } : undefined}>
                                                {/* dd.mm.yy — what expenses, company expenses and global search
                                                    all print. This cell held the app's only ISO date. */}
                                                <td className="px-2 py-1.5 whitespace-nowrap text-[var(--port-gore)] numeric">{_dateStr ? dateFormat(_dateStr, 'dd.mm.yy') : '—'}</td>
                                                <td className="px-2 py-1.5">
                                                    {/* A single click opens the expense itself, in the same modal
                                                        /expenses uses. Deliberately a control rather than a row
                                                        handler: the row already holds two dropdowns and a button,
                                                        and a click target that overlaps them is how the sales-
                                                        contracts double-click bug happened. */}
                                                    {e.expense
                                                        ? <Tltip direction='top' tltpText={`Open expense ${e.expense}`}>
                                                            <button type="button" onClick={() => openExpense(e)}
                                                                className="block w-full truncate text-left underline underline-offset-2 hover:opacity-70 transition-opacity"
                                                                aria-label={`Open expense ${e.expense}`}
                                                                style={{ color: 'var(--chathams-blue)', fontWeight: 500 }}>
                                                                {e.expense}
                                                            </button>
                                                        </Tltip>
                                                        : <span style={{ color: 'var(--regent-gray)' }}>—</span>}
                                                </td>
                                                <td className="px-2 py-1.5 text-[var(--port-gore)]">
                                                    <NameCell name={settings.Supplier?.Supplier?.find(s => s.id === e.supplier)?.nname} fallback="—" maxWidth={166} />
                                                </td>
                                                <td className="px-2 py-1.5 text-right whitespace-nowrap text-[var(--port-gore)] numeric">
                                                    <NumericFormat value={parseFloat(e.amount) || 0} displayType="text" thousandSeparator prefix={e.cur === 'us' ? '$' : '€'} decimalScale={2} fixedDecimalScale />
                                                </td>
                                                <td className="px-2 py-1.5">
                                                    {/* Once saved the two fields stop being editable and simply
                                                        state what was written — an inert row is what makes it
                                                        obvious the click landed, without it vanishing. */}
                                                    {saved ? (
                                                        <span className="inline-flex items-center gap-1.5 min-w-0" style={{ color: 'var(--ok-text)' }}>
                                                            <Check className="w-3.5 h-3.5 shrink-0" />
                                                            <span className="truncate">{whName(e.storageWh) || '—'}</span>
                                                        </span>
                                                    ) : (
                                                        <Selector
                                                            arr={whOptions}
                                                            value={{ storageWh: d.storageWh }}
                                                            onChange={(id) => setDraft(e.id, { storageWh: id })}
                                                            name='storageWh'
                                                            secondaryName='_label'
                                                            clear={() => setDraft(e.id, { storageWh: '' })}
                                                            classes="h-7"
                                                        />
                                                    )}
                                                </td>
                                                <td className="px-2 py-1.5">
                                                    {saved
                                                        ? <span style={{ color: 'var(--ok-text)' }}>{fmtMonth(e.storageMonth) || '—'}</span>
                                                        : <MonthPickerPill value={d.storageMonth} onChange={(v) => setDraft(e.id, { storageMonth: v })} />}
                                                </td>
                                                <td className="px-2 py-1.5">
                                                    {/* Icon only. The word "Save" repeated down twenty rows is a
                                                        label on a button whose icon already says it, and it cost
                                                        60px of every row's width. The tooltip carries the words
                                                        for anyone who wants them; aria-label carries them always. */}
                                                    {saved ? (
                                                        <Tltip direction='top' tltpText='Undo — put this invoice back to untagged'>
                                                            <button type="button" disabled={busy} onClick={() => undoTag(e)} aria-label="Undo this save"
                                                                className="inline-flex items-center justify-center rounded-lg w-7 h-7 border transition-colors disabled:opacity-40 hover:bg-[var(--bg-card)]"
                                                                style={{ borderColor: 'var(--ok-border)', color: 'var(--ok-text)' }}>
                                                                {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Undo2 className="w-3.5 h-3.5" />}
                                                            </button>
                                                        </Tltip>
                                                    ) : (
                                                        <Tltip direction='top' tltpText={ready ? 'Save this warehouse and month' : 'Pick a warehouse and a month first'}>
                                                            <button type="button" disabled={!ready || busy} onClick={() => saveTag(e)} aria-label="Save"
                                                                className="inline-flex items-center justify-center rounded-lg w-7 h-7 text-[var(--on-brand)] disabled:opacity-40"
                                                                style={{ background: 'var(--endeavour)' }}>
                                                                {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                                            </button>
                                                        </Tltip>
                                                    )}
                                                </td>
                                                <td className="px-2 py-1.5" />
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {valueExp && (
                    <ExpenseModal isOpen={expOpen} setIsOpen={setExpOpen} title={`Expense: ${valueExp.expense || ''}`} />
                )}

                <p className="responsiveTextTable text-[var(--regent-gray)] mt-4 pl-1">
                    Note: MT stored is estimated from each lot&apos;s arrival date and current sold status (exit dates aren&apos;t tracked yet), so the rate is a close approximation. Only <b>storage</b> and <b>warehouse</b> expense types are counted.
                </p>
            </div>
        </div>
    );
};

export default StorageCosts;
