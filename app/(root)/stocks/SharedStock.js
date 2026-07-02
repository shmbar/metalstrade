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
import Modal from '@components/modal';
import { Selector } from '@components/selectors/selectShad';
import { SettingsContext } from '@contexts/useSettingsContext';
import { UserAuth } from '@contexts/useAuthContext';
import { loadSharedStock, saveSharedStock, deleteSharedStock } from '@utils/utils';
import { getTtl } from '@utils/languages';
import VideoLoader from '@components/videoLoader';

const OWNERS = ['IMS', 'GIS'];
const blankLot = () => ({ id: '', descriptionText: '', qnty: '', unitPrc: '', stock: '', supplier: '', cur: 'us', status: '', owners: ['IMS', 'GIS'] });

const SharedStock = () => {
    const { settings, ln, setToast } = useContext(SettingsContext);
    const { gisAccount } = UserAuth();
    const accountName = gisAccount ? 'GIS' : 'IMS';

    const [rows, setRows] = useState([]);
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
        const data = (await loadSharedStock() || []).filter(Boolean);
        setRows(data.map(x => ({
            ...x,
            descriptionName: x.descriptionText || x.description || '—',
            stockName: whName(x.stock),
            supplierName: supName(x.supplier),
            ownersLabel: Array.isArray(x.owners) && x.owners.length ? x.owners.join(' + ') : 'IMS + GIS',
        })));
        setLoading(false);
    };
    useEffect(() => { if (settings && Object.keys(settings).length) load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [settings]);

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
    const openEdit = (row) => { setLot({ ...blankLot(), ...row, owners: Array.isArray(row.owners) && row.owners.length ? row.owners : ['IMS', 'GIS'] }); setOpen(true); };

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
    const inputCls = 'w-full rounded-lg bg-[#f8fbff] border border-[#d8e8f5] px-2 h-8 text-xs text-[var(--chathams-blue)] focus:outline-none focus:border-[var(--endeavour)]';
    const labelCls = 'text-[11px] font-medium text-[var(--chathams-blue)] mb-0.5 block';

    if (loading) return <div className='p-6'><VideoLoader loading={true} fullScreen={false} /></div>;

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
                <Customtable data={rows} columns={columns} invisible={{}} SelectRow={openEdit} type='sharedStock' ln={ln} />
            )}

            <Modal isOpen={open} setIsOpen={setOpen} title={lot.id ? 'Edit shared stock' : 'Add shared stock'} w='max-w-2xl'>
                <div className='p-3'>
                    <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
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
