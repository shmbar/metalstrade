'use client';

// Shared Stock (IMS + GIS) — inventory jointly held by the two companies.
//
// R&D / design: IMS (DQ9…) and GIS (aB3…) are separate account namespaces, but the app
// already reads/writes across them (CopyIMSGIS). Rather than fake a contract/invoice to
// make joint stock visible (the thing the client explicitly does NOT want), shared lots
// live in their own fixed namespace — SHARED_STOCK/data/stocks — that BOTH accounts read.
// Each account still only reads (a) its own private stock and (b) this shared pool, so
// IMS-only and GIS-only inventory is never exposed to the other side. A shared lot carries
// { shared:true, owners:['IMS','GIS'], sharedByAccount } ownership metadata and needs no
// contract, invoice or selling price to exist. Reuses the existing stock table (Customtable).

import { useContext, useEffect, useMemo, useState } from 'react';
import { NumericFormat } from 'react-number-format';
import { v4 as uuidv4 } from 'uuid';
import dateFormat from 'dateformat';
import { Plus, Share2, Save, Trash2 } from 'lucide-react';
import Customtable from './newTable';
import GradeTable from './sumtables/gradeTable';
import Modal from '@components/modal';
import { Selector } from '@components/selectors/selectShad';
import { SettingsContext } from '@contexts/useSettingsContext';
import { UserAuth } from '@contexts/useAuthContext';
import { loadSharedStock, saveSharedStock, deleteSharedStock, loadAllStockData, filteredArray } from '@utils/utils';
import { getTtl } from '@utils/languages';
import { TableSkeleton } from "@components/skeletons";

const OWNERS = ['IMS', 'GIS'];
// financedBy = who PAID for the lot ('IMS' | 'GIS' | 'BOTH') — distinct from
// owners (who holds it). Legacy lots without the field derive it from owners.
const FINANCING = ['IMS', 'GIS', 'BOTH'];
const financedOf = (x) => x?.financedBy && FINANCING.includes(x.financedBy)
    ? x.financedBy
    : (Array.isArray(x?.owners) && x.owners.length === 1 ? x.owners[0] : 'BOTH');
const blankLot = () => ({ id: '', descriptionText: '', qnty: '', unitPrc: '', stock: '', supplier: '', cur: 'us', status: '', owners: ['IMS', 'GIS'], financedBy: 'BOTH', sourceId: '', sourceAccount: '', sourcePo: '' });

const SharedStock = () => {
    const { settings, ln, setToast } = useContext(SettingsContext);
    const { gisAccount, uidCollection } = UserAuth();
    const accountName = gisAccount ? 'GIS' : 'IMS';

    const [rows, setRows] = useState([]);
    const [ownLots, setOwnLots] = useState([]);   // this account's raw stock ledger, for the picker
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const [lot, setLot] = useState(blankLot());
    const [saving, setSaving] = useState(false);

    const warehouses = settings?.Stocks?.Stocks || [];
    const suppliers = settings?.Supplier?.Supplier || [];
    const currencies = settings?.Currency?.Currency || [];
    const whName = (id) => { const w = warehouses.find(x => x.id === id); return w?.stock || w?.nname || '—'; };
    const supName = (id) => suppliers.find(s => s.id === id)?.nname || '—';
    const curSym = (id) => currencies.find(c => c.id === id)?.symbol || '';

    const load = async () => {
        setLoading(true);
        const [data, mine] = await Promise.all([
            loadSharedStock(),
            uidCollection ? loadAllStockData(uidCollection) : Promise.resolve([]),
        ]);
        setOwnLots((mine || []).filter(Boolean));
        setRows((data || []).filter(Boolean).map(x => ({
            ...x,
            descriptionName: x.descriptionText || x.description || '—',
            stockName: whName(x.stock),
            supplierName: supName(x.supplier),
            ownersLabel: Array.isArray(x.owners) && x.owners.length ? x.owners.join(' + ') : 'IMS + GIS',
            financedLabel: financedOf(x) === 'BOTH' ? 'IMS + GIS' : financedOf(x),
        })));
        setLoading(false);
    };
    useEffect(() => { if (settings && Object.keys(settings).length) load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [settings, uidCollection]);

    // The account's CURRENT stock (net in − out per material + warehouse, invoice
    // supersede applied) — the client asked that shared lots be PICKED from this
    // list instead of typed from scratch. One representative in-lot per group
    // supplies the prefill (price / supplier / PO); the quantity is the net left.
    const netRows = useMemo(() => {
        const groups = {};
        ownLots.filter(l => l && l.stock).forEach(l => {
            const k = `${l.description || l.descriptionId || ''}|${l.stock}`;
            (groups[k] ||= []).push(l);
        });
        const out = [];
        Object.values(groups).forEach(g => {
            const dedup = filteredArray(g); // an invoice superseded by its Credit/Final note counts once
            let net = 0, firstIn = null;
            dedup.forEach(l => {
                const q = Math.abs(parseFloat(l.qnty) || 0);
                if (l.type === 'out') net -= q;
                else { net += q; if (!firstIn) firstIn = l; }
            });
            if (net > 0.0005 && firstIn) {
                const name = (firstIn.type === 'in' && firstIn.description
                    ? firstIn.productsData?.find(y => y.id === firstIn.description)?.description
                    : firstIn.descriptionText || firstIn.descriptionName) || '(unnamed)';
                out.push({
                    id: firstIn.id, name, stock: firstIn.stock,
                    net: Math.round(net * 10000) / 10000,
                    unitPrc: firstIn.unitPrc, supplier: firstIn.supplier,
                    cur: firstIn.cur || 'us', order: firstIn.order || '',
                });
            }
        });
        return out.sort((a, b) => a.name.localeCompare(b.name));
    }, [ownLots]);

    const pickOptions = useMemo(() => netRows.map(r => ({
        id: r.id,
        _label: `${r.name} · ${whName(r.stock)} · ${new Intl.NumberFormat('en-US', { maximumFractionDigits: 4 }).format(r.net)} MT${r.order ? ` · PO ${r.order}` : ''}`,
        // eslint-disable-next-line react-hooks/exhaustive-deps
    })), [netRows, warehouses]);

    const pickFromStock = (id) => {
        const r = netRows.find(x => x.id === id);
        if (!r) return;
        setLot(prev => ({
            ...prev,
            sourceId: r.id, sourceAccount: accountName, sourcePo: r.order,
            descriptionText: r.name,
            qnty: String(r.net),
            unitPrc: String(r.unitPrc ?? ''),
            total: (parseFloat(r.net) || 0) * (parseFloat(r.unitPrc) || 0),
            stock: r.stock,
            supplier: r.supplier || '',
            cur: r.cur,
        }));
    };

    const columns = useMemo(() => [
        { accessorKey: 'descriptionName', header: getTtl('Description', ln) || 'Material' },
        {
            accessorKey: 'qnty', header: getTtl('Quantity', ln) || 'Quantity',
            cell: p => <NumericFormat value={p.getValue()} displayType='text' thousandSeparator decimalScale={3} />,
        },
        { accessorKey: 'stockName', header: getTtl('warehouse', ln) || 'Warehouse' },
        {
            accessorKey: 'unitPrc', header: getTtl('UnitPrice', ln) || 'Unit Price',
            cell: p => <NumericFormat value={p.getValue()} displayType='text' thousandSeparator prefix={curSym(p.row.original.cur)} decimalScale={2} />,
        },
        {
            accessorKey: 'total', header: getTtl('Total', ln) || 'Total',
            cell: p => <NumericFormat value={p.getValue()} displayType='text' thousandSeparator prefix={curSym(p.row.original.cur)} decimalScale={2} />,
        },
        { accessorKey: 'supplierName', header: getTtl('Supplier', ln) || 'Supplier' },
        { accessorKey: 'status', header: 'Shipment', cell: p => p.getValue() || '—' },
        {
            accessorKey: 'ownersLabel', header: 'Owners',
            cell: p => (
                <span className='inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold whitespace-nowrap'
                    style={{ fontSize: '0.6rem', background: '#eef2ff', color: '#3730a3', border: '1px solid #c7d2fe' }}>
                    <Share2 className='w-2.5 h-2.5' />{p.getValue()}
                </span>
            ),
        },
        {
            accessorKey: 'financedLabel', header: 'Financed by',
            cell: p => (
                <span className='inline-flex items-center px-2 py-0.5 rounded-full font-semibold whitespace-nowrap'
                    style={{
                        fontSize: '0.6rem',
                        background: p.getValue() === 'IMS' ? '#ecfdf5' : p.getValue() === 'GIS' ? '#fff7ed' : '#f1f5f9',
                        color: p.getValue() === 'IMS' ? '#047857' : p.getValue() === 'GIS' ? '#b45309' : '#475569',
                        border: `1px solid ${p.getValue() === 'IMS' ? '#a7f3d0' : p.getValue() === 'GIS' ? '#fed7aa' : '#cbd5e1'}`,
                    }}>
                    {p.getValue()}
                </span>
            ),
        },
        { accessorKey: 'date', header: getTtl('Date', ln) || 'Date' },
        // eslint-disable-next-line react-hooks/exhaustive-deps
    ], [ln, warehouses, suppliers, currencies]);

    const setF = (k, v) => setLot(prev => {
        const next = { ...prev, [k]: v };
        if (k === 'qnty' || k === 'unitPrc') next.total = (parseFloat(next.qnty) || 0) * (parseFloat(next.unitPrc) || 0);
        return next;
    });
    const toggleOwner = (o) => setLot(prev => ({ ...prev, owners: prev.owners.includes(o) ? prev.owners.filter(x => x !== o) : [...prev.owners, o] }));

    const openAdd = () => { setLot(blankLot()); setOpen(true); };
    const openEdit = (row) => { setLot({ ...blankLot(), ...row, owners: Array.isArray(row.owners) && row.owners.length ? row.owners : ['IMS', 'GIS'], financedBy: financedOf(row) }); setOpen(true); };

    const save = async () => {
        if (!lot.descriptionText || !lot.qnty || !lot.stock) {
            setToast?.({ show: true, text: 'Material, quantity and warehouse are required', clr: 'fail' });
            return;
        }
        setSaving(true);
        const now = new Date();
        const doc = {
            id: lot.id || uuidv4(),
            shared: true,
            owners: lot.owners.length ? lot.owners : ['IMS', 'GIS'],
            financedBy: FINANCING.includes(lot.financedBy) ? lot.financedBy : 'BOTH',
            sharedByAccount: lot.sharedByAccount || accountName,
            type: 'in',
            stock: lot.stock,
            descriptionText: lot.descriptionText,
            qnty: parseFloat(lot.qnty) || 0,
            unitPrc: parseFloat(lot.unitPrc) || 0,
            total: (parseFloat(lot.qnty) || 0) * (parseFloat(lot.unitPrc) || 0),
            supplier: lot.supplier || '',
            cur: lot.cur || 'us',
            status: lot.status || '',
            // Where the lot came from when picked from an account's own inventory —
            // keeps the shared record traceable back to the real stock lot / PO.
            sourceId: lot.sourceId || '',
            sourceAccount: lot.sourceAccount || '',
            sourcePo: lot.sourcePo || '',
            date: lot.date || dateFormat(now, 'dd-mmm-yyyy'),
            createdAtMs: lot.createdAtMs || now.getTime(),
        };
        await saveSharedStock([doc]);
        setSaving(false); setOpen(false);
        setToast?.({ show: true, text: 'Shared stock saved', clr: 'success' });
        load();
    };

    const remove = async () => {
        if (!lot.id) { setOpen(false); return; }
        setSaving(true);
        await deleteSharedStock(lot.id);
        setSaving(false); setOpen(false);
        setToast?.({ show: true, text: 'Shared stock removed', clr: 'success' });
        load();
    };

    const totalMt = rows.reduce((s, r) => s + (parseFloat(r.qnty) || 0), 0);

    // Total stock value and how much each company is financing — driven by the
    // lot's explicit "Financed by" (IMS / GIS / Both 50-50); legacy lots without
    // the field derive it from ownership. Kept per currency.
    const money = useMemo(() => {
        const totals = {};
        const fin = { IMS: {}, GIS: {} };
        rows.forEach(r => {
            const val = (parseFloat(r.qnty) || 0) * (parseFloat(r.unitPrc) || 0);
            if (!val) return;
            const cur = r.cur || 'us';
            totals[cur] = (totals[cur] || 0) + val;
            const f = financedOf(r);
            const payers = f === 'BOTH' ? OWNERS : [f];
            payers.forEach(o => { if (fin[o]) fin[o][cur] = (fin[o][cur] || 0) + val / payers.length; });
        });
        return { totals, fin };
    }, [rows]);

    const fmtMoney = (obj) => {
        const parts = Object.entries(obj)
            .map(([cur, v]) => (curSym(cur) || '$') + new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v));
        return parts.length ? parts.join(' · ') : (curSym('us') || '$') + '0.00';
    };
    const inputCls = 'w-full rounded-lg bg-[#f8fbff] border border-[#d8e8f5] px-2 h-8 text-xs text-[var(--chathams-blue)] focus:outline-none focus:border-[var(--endeavour)]';
    const labelCls = 'text-[11px] font-medium text-[var(--chathams-blue)] mb-0.5 block';

    if (loading) return <div className='p-6'><TableSkeleton rows={6} title={false} /></div>;

    return (
        <div>
            <div className='flex items-center justify-between flex-wrap gap-2 mb-3'>
                <div className='flex items-center gap-2 responsiveTextTable text-[var(--regent-gray)]'>
                    <Share2 className='w-4 h-4 text-[var(--endeavour)]' />
                    <span>Inventory shared between IMS &amp; GIS · {rows.length} lot{rows.length !== 1 ? 's' : ''} · {new Intl.NumberFormat('en-US', { maximumFractionDigits: 3 }).format(totalMt)} MT</span>
                </div>
                <button onClick={openAdd} className='blackButton flex items-center gap-1 text-xs'>
                    <Plus className='w-3.5 h-3.5' /> Add shared stock
                </button>
            </div>

            {rows.length === 0 ? (
                <div className='rounded-2xl border border-dashed border-[#b8ddf8] bg-white p-8 text-center responsiveTextTable text-[var(--regent-gray)]'>
                    No shared stock yet. Use <b>Add shared stock</b> to record inventory jointly held by IMS &amp; GIS —
                    no contract or invoice needed. It appears here for both accounts.
                </div>
            ) : (
                <>
                    <Customtable data={rows} columns={columns} invisible={{}} SelectRow={openEdit} type='sharedStock' ln={ln} />

                    {/* Bottom summary: total value + who finances how much */}
                    <div className='flex flex-wrap items-center gap-x-6 gap-y-1 mt-3 rounded-xl border border-[#b8ddf8] bg-[#f8fbff] px-4 py-2.5 responsiveTextTable'>
                        <span style={{ color: 'var(--regent-gray)' }}>
                            Total:&nbsp;<b style={{ color: 'var(--chathams-blue)' }}>
                                {new Intl.NumberFormat('en-US', { maximumFractionDigits: 3 }).format(totalMt)} MT</b>
                            &nbsp;·&nbsp;<b style={{ color: 'var(--chathams-blue)' }}>{fmtMoney(money.totals)}</b>
                        </span>
                        <span style={{ color: 'var(--regent-gray)' }}>
                            Financing —&nbsp;IMS:&nbsp;<b style={{ color: 'var(--chathams-blue)' }}>{fmtMoney(money.fin.IMS)}</b>
                            &nbsp;·&nbsp;GIS:&nbsp;<b style={{ color: 'var(--chathams-blue)' }}>{fmtMoney(money.fin.GIS)}</b>
                        </span>
                        <span style={{ fontSize: '10px', color: 'var(--regent-gray)' }}>
                            From each lot&apos;s &quot;Financed by&quot; — Both counts half to each company.
                        </span>
                    </div>

                    {/* Same per-grade summary the regular stock tab has */}
                    <GradeTable dataTable={rows} loading={false} settings={settings} />
                </>
            )}

            <Modal isOpen={open} setIsOpen={setOpen} title={lot.id ? 'Edit shared stock' : 'Add shared stock'} w='max-w-2xl'>
                <div className='p-3'>
                    <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                        <div className='sm:col-span-2 rounded-xl border border-[#b8ddf8] bg-[#f4f9ff] p-2.5'>
                            <label className={labelCls}>Pick from my current stock</label>
                            <Selector
                                arr={pickOptions}
                                value={{ pick: lot.sourceId || '' }}
                                onChange={pickFromStock}
                                name='pick'
                                secondaryName='_label'
                                clear={() => setLot(prev => ({ ...prev, sourceId: '', sourceAccount: '', sourcePo: '' }))}
                            />
                            <p className='text-[10px] text-[var(--regent-gray)] mt-1'>
                                Selecting a lot fills everything in from your inventory ({accountName}) — lower the quantity if you&apos;re sharing only part of it. The lot also stays in your own stock list.
                            </p>
                        </div>
                        <div className='sm:col-span-2'>
                            <label className={labelCls}>Material / description *</label>
                            <input className={inputCls} value={lot.descriptionText} onChange={e => setF('descriptionText', e.target.value)} placeholder='e.g. 56Ni 14Cr 13Co Turnings' />
                        </div>
                        <div>
                            <label className={labelCls}>Quantity (MT) *</label>
                            <input className={inputCls} value={lot.qnty} onChange={e => setF('qnty', e.target.value.replace(/[^0-9.]/g, ''))} />
                        </div>
                        <div>
                            <label className={labelCls}>Warehouse / location *</label>
                            <Selector arr={warehouses} value={{ stock: lot.stock }} onChange={id => setF('stock', id)} name='stock' secondaryName='stock' clear={() => setF('stock', '')} />
                        </div>
                        <div>
                            <label className={labelCls}>Unit price</label>
                            <input className={inputCls} value={lot.unitPrc} onChange={e => setF('unitPrc', e.target.value.replace(/[^0-9.]/g, ''))} />
                        </div>
                        <div>
                            <label className={labelCls}>Currency</label>
                            <Selector arr={currencies} value={{ cur: lot.cur }} onChange={id => setF('cur', id)} name='cur' secondaryName='cur' />
                        </div>
                        <div>
                            <label className={labelCls}>Supplier (optional)</label>
                            <Selector arr={suppliers} value={{ supplier: lot.supplier }} onChange={id => setF('supplier', id)} name='supplier' secondaryName='nname' clear={() => setF('supplier', '')} />
                        </div>
                        <div>
                            <label className={labelCls}>Shipment status (optional)</label>
                            <input className={inputCls} value={lot.status} onChange={e => setF('status', e.target.value)} placeholder='e.g. Arrived / In transit' />
                        </div>
                        <div className='sm:col-span-2'>
                            <label className={labelCls}>Owners</label>
                            <div className='flex items-center gap-3'>
                                {OWNERS.map(o => (
                                    <label key={o} className='flex items-center gap-1.5 text-xs text-[var(--port-gore)] cursor-pointer'>
                                        <input type='checkbox' checked={lot.owners.includes(o)} onChange={() => toggleOwner(o)} className='w-3.5 h-3.5 accent-[var(--endeavour)]' />
                                        {o}
                                    </label>
                                ))}
                                <span className='text-[10px] text-[var(--regent-gray)]'>Both accounts see this lot regardless; owners records who holds it.</span>
                            </div>
                        </div>
                        <div className='sm:col-span-2'>
                            <label className={labelCls}>Financed by</label>
                            <div className='flex items-center gap-3'>
                                {FINANCING.map(f => (
                                    <label key={f} className='flex items-center gap-1.5 text-xs text-[var(--port-gore)] cursor-pointer'>
                                        <input type='radio' name='financedBy' checked={(lot.financedBy || 'BOTH') === f}
                                            onChange={() => setF('financedBy', f)} className='w-3.5 h-3.5 accent-[var(--endeavour)]' />
                                        {f === 'BOTH' ? 'Both (50/50)' : f}
                                    </label>
                                ))}
                                <span className='text-[10px] text-[var(--regent-gray)]'>Who paid for this stock — drives the financing totals below the table.</span>
                            </div>
                        </div>
                    </div>

                    <div className='flex items-center justify-between gap-2 mt-4'>
                        {lot.id ? (
                            <button onClick={remove} disabled={saving} className='flex items-center gap-1 text-xs text-red-600 hover:text-red-700 disabled:opacity-50'>
                                <Trash2 className='w-3.5 h-3.5' /> Remove
                            </button>
                        ) : <span />}
                        <div className='flex items-center gap-2'>
                            <button onClick={() => setOpen(false)} className='whiteButton text-xs'>Cancel</button>
                            <button onClick={save} disabled={saving} className='blackButton flex items-center gap-1 text-xs disabled:opacity-50'>
                                <Save className='w-3.5 h-3.5' /> {saving ? 'Saving…' : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default SharedStock;
