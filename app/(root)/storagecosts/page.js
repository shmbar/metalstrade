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
import { useContext, useEffect, useMemo, useState } from 'react'
import { SettingsContext } from "../../../contexts/useSettingsContext";
import { UserAuth } from "../../../contexts/useAuthContext";
import { loadData, loadAllStockData, updateExpenseField } from '../../../utils/utils';
import { UNIT, ym, toUsd, mtInWh, isStorageType, computeStorageMetric } from './storageUtils';
import { NumericFormat } from 'react-number-format';
import { Warehouse, Save, Boxes, AlertTriangle, Check, Receipt } from 'lucide-react';
import VideoLoader from '../../../components/videoLoader';

const fmtUsd = (v) => `$${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v || 0)}`;
const fmtMt = (v) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(v || 0);

const StorageCosts = () => {
    const { settings, dateSelect } = useContext(SettingsContext);
    const { uidCollection } = UserAuth();

    const [expenses, setExpenses] = useState([]);   // storage-type expenses in the period
    const [lots, setLots] = useState([]);           // all stock lots
    const [loading, setLoading] = useState(true);
    const [unit, setUnit] = useState('month');
    const [edits, setEdits] = useState({});         // id -> { storageWh, storageMonth } (triage drafts)
    const [savingId, setSavingId] = useState(null);

    const expTypes = settings?.Expenses?.Expenses || [];
    const warehouses = settings?.Stocks?.Stocks || [];
    const whName = (id) => { const w = warehouses.find(k => k.id === id); return w?.stock || w?.nname || ''; };

    useEffect(() => {
        const Load = async () => {
            if (!uidCollection || Object.keys(settings).length === 0) return;
            setLoading(true);
            const [exp, allLots] = await Promise.all([
                loadData(uidCollection, 'expenses', dateSelect),
                loadAllStockData(uidCollection),
            ]);
            setExpenses((exp || []).filter(e => isStorageType(e, expTypes)));
            setLots((allLots || []).filter(Boolean));
            setLoading(false);
        };
        Load();
    }, [uidCollection, dateSelect, settings]);

    const tagged = useMemo(() => expenses.filter(e => e.storageWh && e.storageMonth), [expenses]);
    const untagged = useMemo(() => expenses.filter(e => !(e.storageWh && e.storageMonth)), [expenses]);

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

    const draftOf = (e) => edits[e.id] || { storageWh: e.storageWh || '', storageMonth: e.storageMonth || ym(e.date) };
    const setDraft = (id, patch) => setEdits(prev => {
        const e = expenses.find(x => x.id === id) || {};
        const base = prev[id] || { storageWh: e.storageWh || '', storageMonth: e.storageMonth || ym(e.date) };
        return { ...prev, [id]: { ...base, ...patch } };
    });

    const saveTag = async (e) => {
        const d = draftOf(e);
        if (!d.storageWh || !d.storageMonth) return;
        setSavingId(e.id);
        try {
            await updateExpenseField(uidCollection, e.id, e.date, { storageWh: d.storageWh, storageMonth: d.storageMonth });
            setExpenses(prev => prev.map(x => x.id === e.id ? { ...x, storageWh: d.storageWh, storageMonth: d.storageMonth } : x));
            setEdits(prev => { const n = { ...prev }; delete n[e.id]; return n; });
        } finally { setSavingId(null); }
    };

    if (loading || Object.keys(settings).length === 0) {
        return <div className="mt-[72px] p-5"><VideoLoader loading={true} fullScreen={true} /></div>;
    }

    return (
        <div className="mx-auto w-full max-w-full px-1 md:px-2 pb-4 mt-[72px]" style={{ background: '#f8fbff' }}>
            <div className="rounded-2xl p-3 sm:p-5 mt-8 border border-[#b8ddf8] shadow-xl w-full bg-[#f8fbff]">
                {/* Header + unit toggle */}
                <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
                    <div>
                        <h1 className="text-[var(--chathams-blue)] responsiveTextTitle font-medium border-l-4 border-[var(--chathams-blue)] pl-2">
                            Storage Costs
                        </h1>
                        <p className="responsiveTextTable text-[var(--regent-gray)] pl-3 mt-1">
                            Average storage cost per MT. Tag each storage invoice to a warehouse + month below; the rate updates automatically.
                        </p>
                    </div>
                    <div className="flex items-center gap-1">
                        {UNIT.map(u => (
                            <button key={u.key} type="button" onClick={() => setUnit(u.key)}
                                className="rounded-full font-medium transition-colors"
                                style={{
                                    fontSize: '0.68rem', padding: '5px 12px',
                                    background: unit === u.key ? 'var(--endeavour)' : 'white',
                                    color: unit === u.key ? 'white' : 'var(--chathams-blue)',
                                    border: `1px solid ${unit === u.key ? 'var(--endeavour)' : '#d8e8f5'}`,
                                }}>
                                {u.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Real actuals — exact figures from your expenses & stock, shown even before tagging */}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 mb-3">
                    <div className="rounded-2xl p-4 bg-white border border-[#b8ddf8] shadow-sm">
                        <div className="flex items-center gap-1.5 text-[var(--regent-gray)]" style={{ fontSize: '0.62rem' }}><Receipt className="w-3.5 h-3.5" /> Storage spend · this period</div>
                        <div className="font-bold mt-1 text-[var(--chathams-blue)]" style={{ fontSize: '1.35rem' }}>{fmtUsd(actuals.totalSpend)}</div>
                        <div className="text-[var(--regent-gray)] mt-0.5" style={{ fontSize: '0.6rem' }}>
                            {actuals.count} invoice{actuals.count === 1 ? '' : 's'} · {actuals.taggedCount} tagged · {actuals.count - actuals.taggedCount} to tag
                        </div>
                    </div>
                    <div className="rounded-2xl p-4 bg-white border border-[#b8ddf8] shadow-sm">
                        <div className="flex items-center gap-1.5 text-[var(--regent-gray)]" style={{ fontSize: '0.62rem' }}><Boxes className="w-3.5 h-3.5" /> In storage now</div>
                        <div className="font-bold mt-1 text-[var(--chathams-blue)]" style={{ fontSize: '1.35rem' }}>{fmtMt(actuals.totalMt)} MT</div>
                        <div className="text-[var(--regent-gray)] mt-0.5" style={{ fontSize: '0.6rem' }}>{actuals.whMt.length} warehouse{actuals.whMt.length === 1 ? '' : 's'} with stock</div>
                    </div>
                    <div className="rounded-2xl p-4 bg-white border border-[#b8ddf8] shadow-sm">
                        <div className="flex items-center gap-1.5 text-[var(--regent-gray)] mb-1" style={{ fontSize: '0.62rem' }}><Warehouse className="w-3.5 h-3.5" /> By warehouse (MT now)</div>
                        <div className="flex flex-col gap-0.5 max-h-[4.5rem] overflow-y-auto pr-1">
                            {actuals.whMt.length === 0
                                ? <span className="responsiveTextTable text-[var(--regent-gray)]">No stock on hand</span>
                                : actuals.whMt.map(w => (
                                    <div key={w.id} className="flex items-center justify-between" style={{ fontSize: '0.66rem' }}>
                                        <span className="text-[var(--port-gore)] truncate pr-2">{w.name || '—'}</span>
                                        <span className="font-medium text-[var(--chathams-blue)] whitespace-nowrap">{fmtMt(w.mt)} MT</span>
                                    </div>
                                ))}
                        </div>
                    </div>
                </div>

                {/* Overall + per-warehouse rate cards (require warehouse+month tagging) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-5">
                    <div className="rounded-2xl p-4 text-white" style={{ background: 'linear-gradient(135deg, var(--endeavour), var(--chathams-blue))' }}>
                        <div className="flex items-center gap-1.5 opacity-90" style={{ fontSize: '0.62rem' }}><Boxes className="w-3.5 h-3.5" /> Avg storage cost {UNIT.find(u => u.key === unit).label}</div>
                        <div className="font-bold mt-1" style={{ fontSize: '1.35rem' }}>{rateStr(metric.overall)}</div>
                        <div className="opacity-80 mt-0.5" style={{ fontSize: '0.6rem' }}>
                            {fmtUsd(metric.totalCost)} tagged · {new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(metric.totalMt)} MT-months
                        </div>
                    </div>
                    {metric.rows.map(r => (
                        <div key={r.wh} className="rounded-2xl p-4 bg-white border border-[#b8ddf8] shadow-sm">
                            <div className="flex items-center gap-1.5 text-[var(--regent-gray)]" style={{ fontSize: '0.62rem' }}><Warehouse className="w-3.5 h-3.5" /> {r.name}</div>
                            <div className="font-bold mt-1 text-[var(--chathams-blue)]" style={{ fontSize: '1.2rem' }}>{rateStr(r.rate)}</div>
                            <div className="text-[var(--regent-gray)] mt-0.5" style={{ fontSize: '0.6rem' }}>{fmtUsd(r.cost)} · {new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(r.mt)} MT-months</div>
                        </div>
                    ))}
                    {metric.rows.length === 0 && (
                        <div className="sm:col-span-2 xl:col-span-3 rounded-2xl p-4 bg-white border border-dashed border-[#b8ddf8] flex items-center text-[var(--regent-gray)] responsiveTextTable">
                            No storage invoices tagged yet for this period — tag some below to see the rate.
                        </div>
                    )}
                </div>

                {/* Triage: untagged storage invoices */}
                <div className="rounded-2xl border border-[#b8ddf8] bg-white overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-2.5" style={{ background: '#dbeeff' }}>
                        {untagged.length > 0 ? <AlertTriangle className="w-4 h-4" style={{ color: '#b45309' }} /> : <Check className="w-4 h-4" style={{ color: '#15803d' }} />}
                        <span className="responsiveText font-semibold text-[var(--chathams-blue)]">
                            Storage invoices needing a warehouse + month
                        </span>
                        <span className="rounded-full px-2 py-0.5 font-semibold" style={{ fontSize: '0.6rem', background: untagged.length ? '#fffbeb' : '#f0fdf4', color: untagged.length ? '#b45309' : '#15803d', boxShadow: `inset 0 0 0 1px ${untagged.length ? '#fde68a' : '#bbf7d0'}` }}>
                            {untagged.length}
                        </span>
                    </div>

                    {untagged.length === 0 ? (
                        <div className="px-4 py-8 text-center responsiveTextTable text-[var(--regent-gray)]">
                            All storage invoices in this period are tagged. 🎉
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full" style={{ fontSize: '0.7rem' }}>
                                <thead>
                                    <tr className="text-left text-[var(--regent-gray)]" style={{ background: '#f8fbff' }}>
                                        <th className="px-3 py-2 font-medium">Date</th>
                                        <th className="px-3 py-2 font-medium">Invoice</th>
                                        <th className="px-3 py-2 font-medium">Supplier</th>
                                        <th className="px-3 py-2 font-medium text-right">Amount</th>
                                        <th className="px-3 py-2 font-medium">Warehouse</th>
                                        <th className="px-3 py-2 font-medium">Month covered</th>
                                        <th className="px-3 py-2"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {untagged.map(e => {
                                        const d = draftOf(e);
                                        const ready = d.storageWh && d.storageMonth;
                                        return (
                                            <tr key={e.id} className="border-t border-[#eef5fc]">
                                                <td className="px-3 py-2 whitespace-nowrap text-[var(--port-gore)]">{(e.date || '').substring(0, 10)}</td>
                                                <td className="px-3 py-2 text-[var(--port-gore)] max-w-[12rem] truncate">{e.expense || '—'}</td>
                                                <td className="px-3 py-2 text-[var(--port-gore)]">{settings.Supplier?.Supplier?.find(s => s.id === e.supplier)?.nname || '—'}</td>
                                                <td className="px-3 py-2 text-right whitespace-nowrap text-[var(--port-gore)]">
                                                    <NumericFormat value={parseFloat(e.amount) || 0} displayType="text" thousandSeparator prefix={e.cur === 'us' ? '$' : '€'} decimalScale={2} fixedDecimalScale />
                                                </td>
                                                <td className="px-3 py-2">
                                                    <select value={d.storageWh} onChange={ev => setDraft(e.id, { storageWh: ev.target.value })}
                                                        className="rounded-lg bg-[#f8fbff] border border-[#d8e8f5] px-2 h-7 outline-none focus:border-[var(--endeavour)]"
                                                        style={{ fontSize: '0.7rem', fontFamily: 'inherit' }}>
                                                        <option value="">Select…</option>
                                                        {warehouses.map(w => <option key={w.id} value={w.id}>{w.stock || w.nname}</option>)}
                                                    </select>
                                                </td>
                                                <td className="px-3 py-2">
                                                    <input type="month" value={d.storageMonth} onChange={ev => setDraft(e.id, { storageMonth: ev.target.value })}
                                                        className="rounded-lg bg-[#f8fbff] border border-[#d8e8f5] px-2 h-7 outline-none focus:border-[var(--endeavour)]"
                                                        style={{ fontSize: '0.7rem', fontFamily: 'inherit' }} />
                                                </td>
                                                <td className="px-3 py-2">
                                                    <button type="button" disabled={!ready || savingId === e.id} onClick={() => saveTag(e)}
                                                        className="inline-flex items-center gap-1 rounded-full px-3 h-7 text-white font-medium disabled:opacity-40"
                                                        style={{ fontSize: '0.66rem', background: 'var(--endeavour)' }}>
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
