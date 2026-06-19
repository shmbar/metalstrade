'use client'
import { useContext, useEffect, useState } from 'react'
import Datepicker from "react-tailwindcss-datepicker";
import { VscSaveAs, VscClose } from 'react-icons/vsc';
import { FileText, Copy, Trash2 } from 'lucide-react';
import { RiRefreshLine } from "react-icons/ri";
import { SettingsContext } from "@contexts/useSettingsContext";
import { SalesContractsContext } from "@contexts/useSalesContractsContext";
import { UserAuth } from "@contexts/useAuthContext";
import { validate, ErrDiv } from '@utils/utils';
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

    const clts = settings.Client.Client;
    const client = valueSC.client && clts.find(z => z.id === valueSC.client);

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
                <div className="lg:col-span-2 border border-[#b8ddf8] p-2 rounded-2xl">
                    <p className="responsiveText text-[var(--port-gore)] font-medium">{getTtl('Consignee', ln)}:</p>
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
                <div className="border border-[#b8ddf8] p-2 rounded-2xl flex flex-col">
                    <p className="responsiveText text-[var(--port-gore)] font-medium indent-1">Sales Contract #:</p>
                    <input className="input shadow-sm h-8 text-[0.75rem] w-full mt-1" name='contractNo'
                        value={valueSC.contractNo} onChange={handleValue} />
                    <ErrDiv field='contractNo' errors={errors} />
                </div>

                {/* Date */}
                <div className="border border-[#b8ddf8] p-2 rounded-2xl flex flex-col">
                    <p className="responsiveText text-[var(--port-gore)] font-medium indent-1">{getTtl('Date', ln)}:</p>
                    <div className="mt-1">
                        <Datepicker useRange={false} asSingle={true} value={valueSC.dateRange}
                            popoverDirection='down' onChange={handleDate} displayFormat={"DD-MMM-YYYY"}
                            inputClassName='input w-full shadow-sm h-8' />
                    </div>
                    <ErrDiv field='date' errors={errors} />
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mt-1.5">
                {/* Currency */}
                <div className="border border-[#b8ddf8] p-2 rounded-2xl flex items-center gap-3">
                    <p className="responsiveText text-[var(--port-gore)] font-medium whitespace-nowrap">{getTtl('Currency', ln)}:</p>
                    <div className="flex-1 min-w-0 max-w-[12rem]">
                        <Selector arr={settings.Currency.Currency} value={valueSC}
                            onChange={(e) => handleChange(e, 'cur')} name='cur' clear={clear} />
                    </div>
                    <ErrDiv field='cur' errors={errors} />
                </div>

                {/* Quantity unit */}
                <div className="border border-[#b8ddf8] p-2 rounded-2xl flex items-center gap-3">
                    <p className="responsiveText text-[var(--port-gore)] font-medium whitespace-nowrap">{getTtl('QTY', ln)}:</p>
                    <div className="flex-1 min-w-0 max-w-[12rem]">
                        <Selector arr={settings.Quantity?.Quantity || []} value={valueSC}
                            onChange={(e) => handleChange(e, 'qTypeTable')} name='qTypeTable' clear={clear} />
                    </div>
                </div>
            </div>

            {/* Materials */}
            <div className="border border-[#b8ddf8] p-2 rounded-2xl mt-1.5">
                <p className="responsiveText text-[var(--port-gore)] font-medium mb-2 indent-1">Materials:</p>
                <SalesProductsTable value={valueSC} setValue={setValueSC} />
            </div>

            {/* Comments */}
            <div className="border border-[#b8ddf8] p-2 rounded-2xl mt-1.5">
                <p className="responsiveText text-[var(--port-gore)] font-medium">{getTtl('Comments', ln)}:</p>
                <textarea rows="2" name="comments"
                    className="input w-full p-1.5 !rounded-xl mt-1"
                    style={{ fontSize: '0.75rem', fontFamily: 'inherit' }}
                    value={valueSC.comments} onChange={handleValue} />
            </div>

            {/* Actions */}
            <div className="p-1.5 pl-2 flex gap-2 flex-wrap justify-center md:justify-start">
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
