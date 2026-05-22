import { useContext, useEffect, useState } from 'react'
import { ExpensesContext } from "../../../../contexts/useExpensesContext";
import { ContractsContext } from "../../../../contexts/useContractsContext";
import Datepicker from "react-tailwindcss-datepicker";
import { Selector } from '../../../../components/selectors/selectShad.js'
import { SettingsContext } from "../../../../contexts/useSettingsContext";
import { InvoiceContext } from "../../../../contexts/useInvoiceContext";
import { IoAddCircleOutline } from 'react-icons/io5';
import { AiOutlineClear } from 'react-icons/ai';
import { MdDeleteOutline } from 'react-icons/md';
import { validate, ErrDiv } from '../../../../utils/utils'
import { UserAuth } from "../../../../contexts/useAuthContext";
import { getTtl } from '../../../../utils/languages';
import Tltip from '../../../../components/tlTip';
import { Loader2, Sparkles, CheckCircle2, FileText } from 'lucide-react';
import { authedFetch } from '../../../../utils/aiClient';
import DocumentImportOverlay from '../../../../components/DocumentImportOverlay';

const Expenses = () => {

    const { valueExp, setValueExp, blankExpense, saveData_ExpenseExpenses,
        deleteExpenseFromExpPage, errorsExp, setErrorsExp } = useContext(ExpensesContext);
    const { valueInv, setValueInv, } = useContext(InvoiceContext);
    const { contractsData } = useContext(ContractsContext);
    const { settings, ln, setToast } = useContext(SettingsContext);
    const { uidCollection } = UserAuth();

    const [categorizing, setCategorizing] = useState(false);
    const [catResult, setCatResult] = useState(null); // null | 'high' | 'medium' | 'low' | 'error'
    const [showDocImport, setShowDocImport] = useState(false);

    const handleAutoCategory = async () => {
        // The "Expense Invoice" field is a reference NUMBER (e.g. "9") — useless for
        // categorisation. The real signals are the Vendor (e.g. a freight forwarder
        // → Freight) and the Comments. Resolve the supplier id to its name.
        const sup = (settings.Supplier?.Supplier || []).find(s => s.id === valueExp.supplier);
        const vendorName = [sup?.supplier, sup?.nname].filter(Boolean).join(' / ');
        const comments = (valueExp.comments || '').trim();
        const description = [
            vendorName ? `Vendor: ${vendorName}` : '',
            comments ? `Notes: ${comments}` : '',
        ].filter(Boolean).join('. ');

        if (description.trim().length < 3) {
            setCatResult('error');
            setToast?.({ show: true, text: 'Add a Vendor or Comments first so AI has something to categorise.', clr: 'fail' });
            setTimeout(() => setCatResult(null), 3000);
            return;
        }

        const categories = (settings.Expenses?.Expenses || []).map(e => ({ id: e.id, label: e.expType }));
        if (!categories.length) return;

        setCategorizing(true);
        setCatResult(null);
        try {
            const res = await authedFetch('/api/ai/categorize-expense', {
                method: 'POST',
                body: JSON.stringify({ description, categories }),
            });
            const data = await res.json();
            if (!res.ok || data.error) throw new Error(data.error || 'Categorisation failed');
            handleChange(data.categoryId, 'expType');
            setCatResult(data.confidence);
            setTimeout(() => setCatResult(null), 3000);
        } catch (e) {
            setCatResult('error');
            setToast?.({ show: true, text: e.message || 'AI categorisation failed. Try again.', clr: 'fail' });
            setTimeout(() => setCatResult(null), 3000);
        } finally {
            setCategorizing(false);
        }
    };

    const sups = settings.Supplier.Supplier;

    useEffect(() => {
        if (Object.values(errorsExp).includes(true)) {
            setErrorsExp(validate(valueExp, ['expense', 'cur', 'supplier', 'expType', 'amount', 'date']))
        }
    }, [valueExp])


    const handleValue = (e) => {
        setValueExp({ ...valueExp, [e.target.name]: e.target.value })
    }

    const handleChange = (e, name) => {
        setValueExp(prev => ({ ...prev, [name]: e }))
    }

    const clear = (name) => {
        setValueExp(prev => ({ ...prev, [name]: '' }))
    }

    const handleDateChangeDate = (newValue) => {
        setValueExp({ ...valueExp, dateRange: newValue, date: newValue.startDate })
    }

    // Build a compact contract index (just the fields the AI needs to auto-link).
    // Sending the full contracts array would balloon the request payload.
    const buildContractIndex = () => {
        const supList = settings?.Supplier?.Supplier || [];
        const curList = settings?.Currency?.Currency || [];
        return (contractsData || [])
            .filter(c => !c.deleted && c.order)
            .map(c => {
                const sup = supList.find(s => s.id === c.supplier);
                const curObj = curList.find(x => x.id === c.cur);
                return {
                    id: c.id,
                    order: c.order,
                    supplier: c.supplier,
                    supplierName: sup?.nname || sup?.supplier || '',
                    currency: curObj?.cur || '',
                    date: c.date || c.dateRange?.startDate || '',
                    products: (c.productsData || []).map(p => ({
                        description: p.description || '',
                        qnty: parseFloat(p.qnty) || 0,
                        unitPrc: parseFloat(p.unitPrc) || 0,
                    })),
                };
            });
    };

    return (
        <div>
            {/* Action bar — AI-powered supplier invoice import */}
            <div className='flex items-center justify-end gap-2 mx-2 mt-2'>
                <Tltip direction='top' tltpText='Drop a supplier invoice/proforma PDF — AI extracts amount, vendor, date, currency and auto-links to the contract by PO number.'>
                    <button
                        type='button'
                        onClick={() => setShowDocImport(true)}
                        className='flex items-center gap-1 px-3 py-1 rounded-full text-white transition-all'
                        style={{ fontSize: '0.62rem', background: 'var(--endeavour)' }}
                    >
                        <FileText className='w-3 h-3' />
                        Autofill from supplier invoice
                    </button>
                </Tltip>
            </div>

            {showDocImport && (
                <DocumentImportOverlay
                    documentType='expense'
                    suppliers={settings?.Supplier?.Supplier || []}
                    clients={[]}
                    currencies={settings?.Currency?.Currency || []}
                    expenseTypes={settings?.Expenses?.Expenses || []}
                    contractIndex={buildContractIndex()}
                    onApply={(fields) => setValueExp(prev => ({ ...prev, ...fields }))}
                    onClose={() => setShowDocImport(false)}
                />
            )}

            <div className='z-10 relative mt-2 rounded-2xl flex m-2 pb-4' style={{ border: '1px solid #b8ddf8', background: '#f4f9ff' }}>

                <div className='grid grid-cols-1 md:grid-cols-12 gap-3 w-full p-2'>
                    <div className='md:col-span-4 px-2'>
                        <div>
                            <p className='flex text-sm font-medium whitespace-nowrap mb-0.5' style={{color:'var(--chathams-blue)'}}>{getTtl('Expense Invoice', ln)}</p>
                            <div className='w-full '>
                                <input className="input h-7 text-xs rounded-full border-[#b8ddf8] bg-white" name='expense' value={valueExp.expense} onChange={handleValue} />
                                <ErrDiv field='expense' errors={errorsExp} />
                            </div>
                        </div>
                        <div className='pt-2'>
                            <p className='flex text-sm font-medium whitespace-nowrap mb-0.5' style={{color:'var(--chathams-blue)'}}>{getTtl('Date', ln)}:</p>
                            <Datepicker useRange={false}
                                asSingle={true}
                                value={valueExp.dateRange}
                                popoverDirection='down'
                                onChange={handleDateChangeDate}
                                displayFormat={"DD-MMM-YYYY"}
                                inputClassName='input w-full shadow-lg h-7 text-xs z-20'
                            />
                            <ErrDiv field='date' errors={errorsExp} />
                        </div>
                        <div className='pt-2'>
                            <p className='flex text-sm font-medium whitespace-nowrap mb-0.5' style={{color:'var(--chathams-blue)'}}>{getTtl('Amount', ln)}:</p>
                            <div className='w-full '>
                                <input type='number' className="input h-7 text-xs rounded-full border-[#b8ddf8] bg-white" name='amount' value={valueExp.amount} onChange={handleValue} />
                                <ErrDiv field='amount' errors={errorsExp} />
                            </div>
                        </div>
                    </div>
                    <div className='md:col-span-4 px-2'>
                        <div>
                            <p className='flex text-sm font-medium whitespace-nowrap mb-0.5' style={{color:'var(--chathams-blue)'}}>{getTtl('Vendor', ln)}:</p>
                            <div className='w-full '>
                                <Selector arr={sups} value={valueExp} onChange={(e) => handleChange(e, 'supplier')} name='supplier' clear={clear} />
                                <ErrDiv field='supplier' errors={errorsExp} />
                            </div>
                        </div>
                        <div className='pt-1'>
                            <div className='flex items-center justify-between mb-0.5'>
                                <p className='text-sm font-medium whitespace-nowrap' style={{color:'var(--chathams-blue)'}}>{getTtl('Expense Type', ln)}:</p>
                                <Tltip direction='top' tltpText={(valueExp.supplier || valueExp.comments?.trim()) ? 'Auto-categorize from Vendor + Comments' : 'Select a Vendor or add Comments first'}>
                                    <button
                                        type='button'
                                        onClick={handleAutoCategory}
                                        disabled={categorizing || !(valueExp.supplier || valueExp.comments?.trim())}
                                        aria-label={categorizing ? 'AI is detecting expense category' : 'Auto-detect expense category using AI'}
                                        aria-busy={categorizing}
                                        className='flex items-center gap-1 px-2 py-0.5 rounded-full text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[var(--endeavour)]/30'
                                        style={{
                                            fontSize: '0.6rem',
                                            backgroundColor: catResult === 'error' ? '#ef4444' : catResult ? '#16a34a' : 'var(--endeavour)'
                                        }}
                                    >
                                        {categorizing
                                            ? <Loader2 className='w-2.5 h-2.5 animate-spin' />
                                            : catResult && catResult !== 'error'
                                                ? <CheckCircle2 className='w-2.5 h-2.5' />
                                                : <Sparkles className='w-2.5 h-2.5' />
                                        }
                                        {categorizing ? 'Detecting…' : catResult === 'error' ? 'Failed' : catResult ? 'Done' : 'AI Detect'}
                                    </button>
                                </Tltip>
                            </div>
                            <div className='w-full'>
                                <Selector arr={settings.Expenses.Expenses} value={valueExp} onChange={(e) => handleChange(e, 'expType')} name='expType' clear={clear} />
                                <ErrDiv field='expType' errors={errorsExp} />
                                {catResult === 'low' && (
                                    <p className='text-xs mt-0.5 px-2 py-0.5 rounded-full inline-block' style={{ backgroundColor: '#fff3cd', color: '#92400e', fontSize: '0.6rem' }}>
                                        Low confidence — please verify
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className='pt-1 gap-3 flex'>
                            <div className='flex-1 min-w-0'>
                                <p className='flex text-sm font-medium whitespace-nowrap mb-0.5' style={{color:'var(--chathams-blue)'}}>{getTtl('Currency', ln)}:</p>
                                <div className='w-full'>
                                    <Selector arr={settings.Currency.Currency} value={valueExp} onChange={(e) => handleChange(e, 'cur')} name='cur' clear={clear} />
                                    <ErrDiv field='cur' errors={errorsExp} />
                                </div>
                            </div>
                            <div className='flex-1 min-w-0'>
                                <p className='flex text-sm font-medium whitespace-nowrap mb-0.5' style={{color:'var(--chathams-blue)'}}>{getTtl('Payment', ln)}:</p>
                                <div className='w-full'>
                                    <Selector arr={settings.ExpPmnt.ExpPmnt} value={valueExp} onChange={(e) => handleChange(e, 'paid')} name='paid' clear={clear} />
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className='md:col-span-4 px-2'>
                        <p className='flex text-sm font-medium whitespace-nowrap mb-0.5' style={{color:'var(--chathams-blue)'}}>{getTtl('Comments', ln)}:</p>
                        <div>
                            <textarea rows="5" name="comments"
                                className="input h-32 p-1 rounded-xl border-[#b8ddf8] bg-white w-full"
                                style={{ fontSize: '0.75rem', fontFamily: 'inherit' }}
                                value={valueExp.comments} onChange={handleValue} />
                        </div>

                    </div>
                </div>
            </div>
            <div className='flex gap-4 m-2'>
            <Tltip direction='top' tltpText='Save/Update form'>
                <button
                    className=" blackButton py-1 font-light"
                    onClick={() => saveData_ExpenseExpenses(uidCollection, valueInv, setValueInv)}
                >
                    <IoAddCircleOutline className='scale-110' />
                    {getTtl('save', ln)}
                </button>
                </Tltip>
                <Tltip direction='top' tltpText='Clear form'>
                <button
                    className="whiteButton py-1"
                    onClick={blankExpense}
                >
                    <AiOutlineClear className='scale-110' />
                    {getTtl('Clear', ln)}
                </button>
                </Tltip>
                {valueExp?.id && (
                <Tltip direction='top' tltpText='Delete expense'>
                <button
                    className="whiteButton py-1"
                    style={{ color: '#c0392b', borderColor: '#c0392b' }}
                    onClick={() => deleteExpenseFromExpPage(uidCollection)}
                >
                    <MdDeleteOutline className='scale-110' />
                    {getTtl('Delete', ln)}
                </button>
                </Tltip>
                )}
            </div>

        </div >


    )
}

export default Expenses
