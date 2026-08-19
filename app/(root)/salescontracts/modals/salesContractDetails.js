'use client'
import { useContext, useEffect, useMemo, useState } from 'react'
import Datepicker from "react-tailwindcss-datepicker";
import dateFormat from 'dateformat';
import { VscSaveAs, VscClose } from 'react-icons/vsc';
import { FileText, Copy, Trash2, Link2 } from 'lucide-react';
import { RiRefreshLine } from "react-icons/ri";
import { SettingsContext } from "@contexts/useSettingsContext";
import { SalesContractsContext } from "@contexts/useSalesContractsContext";
import { UserAuth } from "@contexts/useAuthContext";
import { validate, ErrDiv, loadData } from '@utils/utils';
import { getTtl } from '@utils/languages';
import { Selector } from '@components/selectors/selectShad';
import Tltip from '@components/tlTip';
import Spinner from '@components/spinner';
import ModalToAction from '@components/modalToProceed';
import DocumentImportOverlay from '@components/DocumentImportOverlay';
import SalesProductsTable from '../components/productsTable';

const SalesContractDetails = () => {

    const { settings, loading, setToast, ln } = useContext(SettingsContext);
    const { valueSC, setValueSC, setIsOpenSC, saveData, delSalesContract, duplicate,
        errors, setErrors, isButtonDisabled, setIsButtonDisabled } = useContext(SalesContractsContext);
    const { uidCollection } = UserAuth();

    const [showDocImport, setShowDocImport] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    // Purchase contracts offered for linking, loaded for the sales contract's year ±1 —
    // the cargo is often bought a season before it is sold on.
    const [purchaseContracts, setPurchaseContracts] = useState([]);
    // The PO this contract already shipped under, read off its sales invoices. Only used
    // as a suggestion: it exists once the cargo path is complete, which is exactly the
    // case the manual link is here to cover before it is.
    const [poFromInvoice, setPoFromInvoice] = useState(null);

    const clts = settings.Client.Client;
    const client = valueSC.client && clts.find(z => z.id === valueSC.client);

    const sups = settings.Supplier?.Supplier || [];
    const poId = valueSC.poSupplier?.id || '';
    const linkedPo = poId && purchaseContracts.find(c => c.id === poId);
    // Live from the PO when it is in range, otherwise from what was stored at link time.
    const supplierId = linkedPo ? linkedPo.supplier : (valueSC.poSupplier?.supplier || '');
    const supplier = supplierId && sups.find(s => s.id === supplierId);
    const supName = (id) => { const s = sups.find(z => z.id === id); return s ? (s.nname || s.supplier || '') : ''; };

    useEffect(() => {
        const load = async () => {
            if (!uidCollection) return;
            const yr = parseInt((valueSC.dateRange?.startDate || valueSC.date || '').substring(0, 4));
            const y = isNaN(yr) ? new Date().getFullYear() : yr;
            const range = { start: `${y - 1}-01-01`, end: `${y + 1}-12-31` };
            const [cons, invs] = await Promise.all([
                loadData(uidCollection, 'contracts', range),
                valueSC.id ? loadData(uidCollection, 'invoices', range) : Promise.resolve([]),
            ]);
            setPurchaseContracts(cons || []);
            const hit = (invs || []).find(i =>
                i && i.salesContractId === valueSC.id && !i.canceled && i.poSupplier?.id);
            setPoFromInvoice(hit ? { ...hit.poSupplier, invoice: hit.invoice } : null);
        };
        load();
    }, [uidCollection, valueSC.id, valueSC.dateRange?.startDate, valueSC.date]);

    // Label carries the supplier too: the PO number alone ('280426-1-ELG') is not something
    // anyone recognizes at a glance. Radix throws on a blank value, so ids are required.
    const poOptions = useMemo(() => {
        const list = (purchaseContracts || [])
            .filter(c => c && c.id)
            .map(c => ({
                id: c.id,
                poLabel: [c.order || '(no number)', supName(c.supplier)].filter(Boolean).join('  ·  '),
            }));
        // A PO linked outside the loaded window must stay visible, or opening the form
        // would silently show an empty selector over a link that is actually set.
        if (poId && !list.some(x => x.id === poId)) {
            list.unshift({
                id: poId,
                poLabel: [valueSC.poSupplier?.order || '(linked PO)', supName(valueSC.poSupplier?.supplier)]
                    .filter(Boolean).join('  ·  '),
            });
        }
        return list;
    }, [purchaseContracts, poId, valueSC.poSupplier, sups]);

    // `fallback` covers a PO outside the loaded window (the invoice suggestion can point at
    // one): keep whatever the caller already knows rather than storing a bare id.
    const linkPo = (id, fallback) => {
        const c = (purchaseContracts || []).find(x => x.id === id);
        setValueSC(prev => ({
            ...prev,
            poSupplier: c
                ? { id: c.id, order: c.order || '', date: c.dateRange?.startDate || c.date || '', supplier: c.supplier || '' }
                : { id, order: fallback?.order || '', date: fallback?.date || '', supplier: fallback?.supplier || '' },
        }));
    };
    const unlinkPo = () => setValueSC(prev => ({ ...prev, poSupplier: { id: '', order: '', date: '', supplier: '' } }));

    useEffect(() => {
        if (Object.values(errors).includes(true)) {
            setErrors(validate(valueSC, ['client', 'cur', 'contractNo', 'date']));
        }
    }, [valueSC]);

    const handleChange = (e, name) => setValueSC(prev => ({ ...prev, [name]: e }));
    const clear = (name) => setValueSC(prev => ({ ...prev, [name]: '' }));
    const handleValue = (e) => setValueSC({ ...valueSC, [e.target.name]: e.target.value });
    const handleDate = (newValue) => setValueSC({ ...valueSC, dateRange: newValue, date: newValue.startDate });

    const save = async () => {
        if (!isButtonDisabled) {
            setIsButtonDisabled(true);
            let result = await saveData(uidCollection);
            if (!result) setIsButtonDisabled(false);
            setTimeout(() => {
                setIsButtonDisabled(false);
                result && setToast({ show: true, text: getTtl('Sales contract successfully saved!', ln) || 'Sales contract successfully saved!', clr: 'success' });
            }, 2000);
        }
    };

    return (
        <div className="px-2 pb-2">
            {loading && <Spinner />}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-1.5 pt-2">
                {/* Client */}
                <div className="lg:col-span-2 border border-[var(--line)] p-2 rounded-2xl">
                    <p className="responsiveText text-[var(--ink-muted)] font-medium">{getTtl('Consignee', ln)}</p>
                    <Selector arr={clts} value={valueSC} onChange={(e) => handleChange(e, 'client')}
                        name='client' clear={clear} />
                    <ErrDiv field='client' errors={errors} />
                    {client && (
                        <>
                            <p className="pl-1 responsiveText text-[var(--regent-gray)]">{client.street}</p>
                            <p className="pl-1 responsiveText text-[var(--regent-gray)]">{client.city}</p>
                            <p className="pl-1 responsiveText text-[var(--regent-gray)]">{client.country}</p>
                        </>
                    )}
                </div>

                {/* Contract # */}
                <div className="border border-[var(--line)] p-2 rounded-2xl flex flex-col">
                    <p className="responsiveText text-[var(--ink-muted)] font-medium indent-1">Sales Contract #</p>
                    <input className="input shadow-sm h-8 responsiveTextInput w-full mt-1" name='contractNo'
                        value={valueSC.contractNo} onChange={handleValue} />
                    <ErrDiv field='contractNo' errors={errors} />
                </div>

                {/* Date */}
                <div className="border border-[var(--line)] p-2 rounded-2xl flex flex-col">
                    <p className="responsiveText text-[var(--ink-muted)] font-medium indent-1">{getTtl('Date', ln)}</p>
                    <div className="mt-1">
                        <Datepicker useRange={false} asSingle={true} value={valueSC.dateRange}
                            popoverDirection='down' onChange={handleDate} displayFormat={"DD-MMM-YYYY"}
                            inputClassName='input w-full shadow-sm h-8' />
                    </div>
                    <ErrDiv field='date' errors={errors} />
                </div>
            </div>

            {/* Purchase contract → supplier. Linked by hand because the cargo path
                (sales invoice → PO → supplier) only closes once the supplier's documents
                arrive, which is often weeks after both contracts are agreed. */}
            <div className="border border-[var(--line)] p-2 rounded-2xl mt-1.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    <div className="flex flex-col">
                        <p className="responsiveText text-[var(--ink-muted)] font-medium indent-1">Purchase Contract</p>
                        <div className="mt-1">
                            <Selector arr={poOptions} value={{ poId }} onChange={linkPo}
                                name='poId' secondaryName='poLabel' clear={unlinkPo} />
                        </div>
                        {poId && linkedPo?.dateRange?.startDate && (
                            <p className="pl-1 pt-0.5 responsiveText text-[var(--regent-gray)]">
                                PO dated {dateFormat(linkedPo.dateRange.startDate, 'dd-mmm-yyyy')}
                            </p>
                        )}
                        {!poId && poFromInvoice && (
                            <button type="button"
                                onClick={() => linkPo(poFromInvoice.id, poFromInvoice)}
                                className="mt-1 self-start inline-flex items-center gap-1 responsiveText font-medium"
                                style={{ color: 'var(--brand-strong)' }}>
                                <Link2 className="size-3.5" />
                                Shipped under PO {poFromInvoice.order} — link it
                            </button>
                        )}
                        {poId && poFromInvoice && poFromInvoice.id !== poId && (
                            <p className="pl-1 pt-0.5 responsiveText" style={{ color: 'var(--warn-text)' }}>
                                Invoice {poFromInvoice.invoice} shipped this contract under PO {poFromInvoice.order}.
                            </p>
                        )}
                    </div>
                    <div className="flex flex-col">
                        <p className="responsiveText text-[var(--ink-muted)] font-medium indent-1">{getTtl('Supplier', ln)}</p>
                        {supplier ? (
                            <>
                                <p className="pl-1 mt-1 responsiveText font-medium text-[var(--ink)]">{supplier.nname || supplier.supplier}</p>
                                <p className="pl-1 responsiveText text-[var(--regent-gray)]">{supplier.street}</p>
                                <p className="pl-1 responsiveText text-[var(--regent-gray)]">{supplier.city}</p>
                                <p className="pl-1 responsiveText text-[var(--regent-gray)]">{supplier.country}</p>
                            </>
                        ) : (
                            <p className="pl-1 mt-1 responsiveText text-[var(--regent-gray)]">
                                {poId ? 'No supplier on the linked purchase contract.' : 'Link a purchase contract to see the supplier.'}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mt-1.5">
                {/* Currency */}
                <div className="border border-[var(--line)] p-2 rounded-2xl flex items-center gap-3">
                    <p className="responsiveText text-[var(--ink-muted)] font-medium whitespace-nowrap">{getTtl('Currency', ln)}</p>
                    <div className="flex-1 min-w-0 max-w-[12rem]">
                        <Selector arr={settings.Currency.Currency} value={valueSC}
                            onChange={(e) => handleChange(e, 'cur')} name='cur' clear={clear} />
                    </div>
                    <ErrDiv field='cur' errors={errors} />
                </div>

                {/* Quantity unit */}
                <div className="border border-[var(--line)] p-2 rounded-2xl flex items-center gap-3">
                    <p className="responsiveText text-[var(--ink-muted)] font-medium whitespace-nowrap">{getTtl('QTY', ln)}</p>
                    <div className="flex-1 min-w-0 max-w-[12rem]">
                        <Selector arr={settings.Quantity?.Quantity || []} value={valueSC}
                            onChange={(e) => handleChange(e, 'qTypeTable')} name='qTypeTable' clear={clear} />
                    </div>
                </div>
            </div>

            {/* Materials */}
            <div className="border border-[var(--line)] p-2 rounded-2xl mt-1.5">
                <p className="responsiveText text-[var(--ink-muted)] font-medium mb-2 indent-1">Materials</p>
                <SalesProductsTable value={valueSC} setValue={setValueSC} />
            </div>

            {/* Comments */}
            <div className="border border-[var(--line)] p-2 rounded-2xl mt-1.5">
                <p className="responsiveText text-[var(--ink-muted)] font-medium">{getTtl('Comments', ln)}</p>
                <textarea rows="2" name="comments"
                    className="input w-full p-1.5 !rounded-2xl mt-1"
                    style={{ fontSize: 'var(--fs-input)', fontFamily: 'inherit' }}
                    value={valueSC.comments} onChange={handleValue} />
            </div>

            {/* Actions */}
            <div className="sticky bottom-0 z-sticky bg-[var(--bg-card)] mt-3 flex flex-wrap justify-end gap-2 pt-3 pb-2 border-t border-[var(--line)]">
                <Tltip direction='top' tltpText='Save / update sales contract'>
                    <button type="button" className="blackButton py-1 disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={save} disabled={isButtonDisabled}>
                        <VscSaveAs className='size-4' />
                        {isButtonDisabled ? getTtl('saving', ln) : getTtl('save', ln)}
                        {isButtonDisabled && <RiRefreshLine className='animate-spin' />}
                    </button>
                </Tltip>
                <Tltip direction='top' tltpText='Read materials, weights & prices from an uploaded contract'>
                    <button type="button" className="whiteButton py-1" onClick={() => setShowDocImport(true)}>
                        <FileText className='size-4' /> Read from contract
                    </button>
                </Tltip>
                {valueSC.id !== '' && (
                    <Tltip direction='top' tltpText='Duplicate this sales contract'>
                        <button type="button" className="whiteButton py-1" onClick={duplicate}>
                            <Copy className='size-4' /> {getTtl('Duplicate', ln) || 'Duplicate'}
                        </button>
                    </Tltip>
                )}
                {valueSC.id !== '' && (
                    <Tltip direction='top' tltpText='Delete this sales contract'>
                        <button type="button" className="whiteButton py-1" onClick={() => setIsDeleteOpen(true)}>
                            <Trash2 className='size-4' /> {getTtl('Delete', ln)}
                        </button>
                    </Tltip>
                )}
                <Tltip direction='top' tltpText='Close form'>
                    <button type="button" className="whiteButton py-1" onClick={() => setIsOpenSC(false)}>
                        <VscClose className='size-4' /> {getTtl('Close', ln)}
                    </button>
                </Tltip>
            </div>

            {showDocImport && (
                <DocumentImportOverlay
                    documentType='salescontract'
                    suppliers={[]}
                    clients={settings.Client?.Client || []}
                    currencies={settings.Currency?.Currency || []}
                    onApply={(fields) => {
                        setValueSC(prev => ({ ...prev, ...fields }));
                        const labels = Object.keys(fields || {}).map(k => ({
                            contractNo: 'Contract No', client: 'Client', cur: 'Currency',
                            productsData: 'Materials', comments: 'Comments', date: 'Date', dateRange: 'Date',
                        }[k])).filter(Boolean);
                        const uniq = [...new Set(labels)];
                        setToast({
                            show: true,
                            text: uniq.length
                                ? `Applied to the form: ${uniq.join(', ')}. Review the fields, then click Save.`
                                : 'Nothing applied — no fields matched. Pick client/currency manually if they showed "no match".',
                            clr: uniq.length ? 'success' : 'fail',
                        });
                    }}
                    onClose={() => setShowDocImport(false)}
                />
            )}

            <ModalToAction isDeleteOpen={isDeleteOpen} setIsDeleteOpen={setIsDeleteOpen}
                ttl='Delete sales contract' txt='To delete this sales contract please confirm to proceed.'
                doAction={() => delSalesContract(uidCollection)} />
        </div>
    );
};

export default SalesContractDetails;
