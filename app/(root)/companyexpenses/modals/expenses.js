import { useContext, useState, useEffect, useTransition } from 'react'
import { ExpensesContext } from "@contexts/useExpensesContext";
import Datepicker from "react-tailwindcss-datepicker";
import { SettingsContext } from "@contexts/useSettingsContext";
import { validate, ErrDiv } from '@utils/utils'
import { UserAuth } from "@contexts/useAuthContext";
import { getTtl } from '@utils/languages';
import Tltip from '@components/tlTip';
import { Selector } from '@components/selectors/selectShad.js';
import { Save, Eraser, Trash, Copy, Truck, FileText } from "lucide-react"
import FindInvoiceModal from './findInvoiceModal';
import DocumentImportOverlay from '@components/DocumentImportOverlay';

const Expenses = ({setIsOpen}) => {

    const { valueExp, setValueExp, blankExpense, saveData_CompanyExpenses,
        errorsExp, setErrorsExp, deleteCompExp, copyTomisc } = useContext(ExpensesContext);
    const { settings, ln } = useContext(SettingsContext);
    const { uidCollection } = UserAuth();
    const [isPending, startTransition] = useTransition();
    const sups = settings.Supplier.Supplier;
    const [opendialogShipment, setDialogShipment] = useState(false)
    const [showDocImport, setShowDocImport] = useState(false)

    const saveExpense = () => {
        startTransition(() => {
            saveData_CompanyExpenses(uidCollection)
        })
    }

    useEffect(() => {
        if (Object.values(errorsExp).includes(true)) {
            setErrorsExp(validate(valueExp, ['expense', 'cur', 'supplier', 'expType', 'amount', 'date']))
        }
    }, [valueExp])


    const handleValue = (e) => {
        setValueExp({ ...valueExp, [e.target.name]: e.target.value })
    }

    const handleDateChangeDate = (newValue) => {
        setValueExp({ ...valueExp, dateRange: newValue, date: newValue.startDate })
    }

    const handleChange = (e, name) => {
        setValueExp(prev => {
            const updated = { ...prev, [name]: e }
            return updated
        })
    }


    const clear = (name) => {
        setValueExp(prev => ({
            ...prev, [name]: '',
        }))
    }

    return (
        <div>
            {/* AI invoice reading — extract vendor, amount, date, currency & category from a PDF */}
            <div className='flex items-center justify-end gap-2 mx-2 mt-2'>
                <Tltip direction='top' tltpText='Drop an invoice/proforma PDF — AI fills the vendor, amount, date, currency and category.'>
                    <button
                        type='button'
                        onClick={() => setShowDocImport(true)}
                        className='blackButton'
                    >
                        <FileText className='w-3 h-3' />
                        Autofill from PDF
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
                    onApply={(fields) => setValueExp(prev => ({ ...prev, ...fields }))}
                    onClose={() => setShowDocImport(false)}
                />
            )}

            <div className='z-10 relative mt-2 rounded-2xl flex m-2 pb-4' style={{ border: '1px solid var(--line)', background: "var(--bg-card)" }}>

                <div className='grid grid-cols-1 md:grid-cols-12 gap-3 w-full p-2'>
                    <div className='md:col-span-4 px-2'>
                        <div>
                            <p className='responsiveText font-medium text-[var(--ink-muted)] mb-1'>{getTtl('Expense Invoice', ln)}</p>
                            <div className='w-full '>
                                <input className="input" name='expense' value={valueExp.expense} onChange={handleValue} />
                                <ErrDiv field='expense' errors={errorsExp} ln={ln} />
                            </div>
                        </div>
                        <div className='pt-1'>
                            <p className='responsiveText font-medium text-[var(--ink-muted)] mb-1'>{getTtl('Date', ln)}</p>
                            <Datepicker useRange={false}
                                asSingle={true}
                                value={valueExp.dateRange}
                                popoverDirection='down'
                                onChange={handleDateChangeDate}
                                displayFormat={"DD-MMM-YYYY"}
                                inputClassName='input w-full z-20'
                            />
                            <ErrDiv field='date' errors={errorsExp} ln={ln} />
                        </div>
                        <div className='pt-1'>
                            <p className='responsiveText font-medium text-[var(--ink-muted)] mb-1'>{getTtl('Amount', ln)}</p>
                            <div className='w-full '>
                                <input type='number' className="input" name='amount' value={valueExp.amount} onChange={handleValue} />
                                <ErrDiv field='amount' errors={errorsExp} ln={ln} />
                            </div>
                        </div>
                    </div>
                    <div className='md:col-span-4 px-2'>
                        <div>
                            <p className='responsiveText font-medium text-[var(--ink-muted)] mb-1'>{getTtl('Vendor', ln)}</p>
                            <div className='w-full '>
                                <Selector arr={sups} value={valueExp}
                                    onChange={(e) => handleChange(e, 'supplier')}
                                    name='supplier'
                                    clear={clear} />
                                <ErrDiv field='supplier' errors={errorsExp} ln={ln} />
                            </div>
                        </div>
                        <div className='pt-1'>
                            <p className='responsiveText font-medium text-[var(--ink-muted)] mb-1'>{getTtl('Expense Type', ln)}</p>
                            <div className='w-full '>
                                <Selector arr={settings.Expenses.Expenses} value={valueExp}
                                    onChange={(e) => handleChange(e, 'expType')}
                                    name='expType'
                                    clear={clear} />
                                <ErrDiv field='expType' errors={errorsExp} ln={ln} />
                            </div>
                        </div>
                        <div className='pt-1 gap-3 flex'>
                            <div className='flex-1'>
                                <p className='responsiveText font-medium text-[var(--ink-muted)] mb-1'>{getTtl('Currency', ln)}</p>
                                <div className='w-full'>
                                    <Selector arr={settings.Currency.Currency} value={valueExp}
                                        onChange={(e) => handleChange(e, 'cur')}
                                        name='cur'
                                        clear={clear} />
                                    <ErrDiv field='cur' errors={errorsExp} ln={ln} />
                                </div>
                            </div>
                            <div className='flex-1'>
                                <p className='responsiveText font-medium text-[var(--ink-muted)] mb-1'>{getTtl('Payment', ln)}</p>
                                <div className='w-full'>
                                    <Selector arr={settings.ExpPmnt.ExpPmnt} value={valueExp}
                                        onChange={(e) => handleChange(e, 'paid')}
                                        name='paid'
                                        clear={clear} />
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className='md:col-span-4 px-2'>
                        <p className='responsiveText font-medium text-[var(--ink-muted)] mb-1'>{getTtl('Comments', ln)}</p>
                        <div>
                            <textarea rows="5" name="comments"
                                className="w-full h-28 px-3 py-2 rounded-control border border-[var(--line-strong)] bg-[var(--bg-card)] text-[var(--ink)] responsiveTextTitle outline-none transition-colors focus:border-[var(--brand)] focus:ring-[3px] focus:ring-[var(--brand-soft)] resize-y"
                                style={{ fontSize: 'var(--fs-input)', fontFamily: 'inherit' }}
                                value={valueExp.comments} onChange={handleValue} />
                        </div>

                    </div>
                </div>
            </div>
            <div className='flex items-center gap-2 m-2 pt-3 border-t border-[var(--line)] justify-end flex-wrap'>
                <Tltip direction='top' tltpText='Save/Update form'>
                    <button
                        className='blackButton'
                        onClick={saveExpense}
                        disabled={isPending}
                    >
                        <Save className='size-4' />
                        {getTtl('save', ln)}
                    </button>
                </Tltip>
                <Tltip direction='top' tltpText='Clear form'>
                    <button
                        className="whiteButton"
                        onClick={blankExpense}
                    >
                        <Eraser className='size-4' />
                        {getTtl('Clear', ln)}
                    </button>
                </Tltip>
                <Tltip direction='top' tltpText='Delete Expense'>
                    <button
                        className="whiteButton"
                        onClick={() => deleteCompExp(uidCollection)}
                    >
                        <Trash className='size-4' />
                        {getTtl('Delete', ln)}
                    </button>
                </Tltip>
                {valueExp.id !== '' &&
                    <Tltip direction='top' tltpText='Copy to misc invoices'>
                        <button
                            className="whiteButton"
                            onClick={() => copyTomisc(uidCollection)}
                        >
                            <Copy className='size-4' />
                            Copy to misc invoices
                        </button>
                    </Tltip>
                }

                <Tltip direction='top' tltpText='Move expense to shipment invoice'>
                    <button
                        className="whiteButton"
                        onClick={() => setDialogShipment(true)}
                    >
                        <Truck className='size-4' />
                        Move to shipment
                    </button>
                </Tltip>



                {
                    opendialogShipment &&
                    <FindInvoiceModal
                        open={opendialogShipment}
                        setOpen={setDialogShipment}
                        uidCollection={uidCollection}
                        value={valueExp}
                        setValue={setValueExp}
                    />
                }


            </div>
        </div >


    )
}

export default Expenses
