import { useContext, useState, useEffect, useTransition } from 'react'
import { ExpensesContext } from "@contexts/useExpensesContext";
import Datepicker from "react-tailwindcss-datepicker";
import { SettingsContext } from "@contexts/useSettingsContext";
import { validate, ErrDiv } from '@utils/utils'
import { UserAuth } from "@contexts/useAuthContext";
import { getTtl } from '@utils/languages';
import Tltip from '@components/tlTip';
import { Selector } from '@components/selectors/selectShad.js';
import { Save, Eraser, Trash, Copy, Truck } from "lucide-react"
import FindInvoiceModal from './findInvoiceModal';

const Expenses = ({setIsOpen}) => {

    const { valueExp, setValueExp, blankExpense, saveData_CompanyExpenses,
        errorsExp, setErrorsExp, deleteCompExp, copyTomisc } = useContext(ExpensesContext);
    const { settings, ln } = useContext(SettingsContext);
    const { uidCollection } = UserAuth();
    const [isPending, startTransition] = useTransition();
    const sups = settings.Supplier.Supplier;
    const [opendialogShipment, setDialogShipment] = useState(false)

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
            <div className='z-10 relative mt-2 rounded-2xl flex m-2 pb-4' style={{ border: '1px solid #b8ddf8', background: '#f4f9ff' }}>

                <div className='grid grid-cols-1 md:grid-cols-12 gap-3 w-full p-2'>
                    <div className='md:col-span-4 px-2'>
                        <div>
                            <p className='flex text-xs font-medium whitespace-nowrap mb-0.5' style={{ color: 'var(--chathams-blue)' }}>{getTtl('Expense Invoice', ln)}</p>
                            <div className='w-full '>
                                <input className="input h-8 text-xs !rounded-full border-[#b8ddf8] bg-white" name='expense' value={valueExp.expense} onChange={handleValue} />
                                <ErrDiv field='expense' errors={errorsExp} ln={ln} />
                            </div>
                        </div>
                        <div className='pt-1'>
                            <p className='flex text-xs font-medium whitespace-nowrap mb-0.5' style={{ color: 'var(--chathams-blue)' }}>{getTtl('Date', ln)}:</p>
                            <Datepicker useRange={false}
                                asSingle={true}
                                value={valueExp.dateRange}
                                popoverDirection='down'
                                onChange={handleDateChangeDate}
                                displayFormat={"DD-MMM-YYYY"}
                                inputClassName='input w-full shadow-lg h-8 text-xs z-20 !rounded-full'
                            />
                            <ErrDiv field='date' errors={errorsExp} ln={ln} />
                        </div>
                        <div className='pt-1'>
                            <p className='flex text-xs font-medium whitespace-nowrap mb-0.5' style={{ color: 'var(--chathams-blue)' }}>{getTtl('Amount', ln)}:</p>
                            <div className='w-full '>
                                <input type='number' className="input h-8 text-xs !rounded-full border-[#b8ddf8] bg-white" name='amount' value={valueExp.amount} onChange={handleValue} />
                                <ErrDiv field='amount' errors={errorsExp} ln={ln} />
                            </div>
                        </div>
                    </div>
                    <div className='md:col-span-4 px-2'>
                        <div>
                            <p className='flex text-xs font-medium whitespace-nowrap mb-0.5' style={{ color: 'var(--chathams-blue)' }}>{getTtl('Vendor', ln)}:</p>
                            <div className='w-full '>
                                <Selector arr={sups} value={valueExp}
                                    onChange={(e) => handleChange(e, 'supplier')}
                                    name='supplier'
                                    clear={clear} />
                                <ErrDiv field='supplier' errors={errorsExp} ln={ln} />
                            </div>
                        </div>
                        <div className='pt-1'>
                            <p className='flex text-xs font-medium whitespace-nowrap mb-0.5' style={{ color: 'var(--chathams-blue)' }}>{getTtl('Expense Type', ln)}:</p>
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
                                <p className='flex text-xs font-medium whitespace-nowrap mb-0.5' style={{ color: 'var(--chathams-blue)' }}>{getTtl('Currency', ln)}:</p>
                                <div className='w-full'>
                                    <Selector arr={settings.Currency.Currency} value={valueExp}
                                        onChange={(e) => handleChange(e, 'cur')}
                                        name='cur'
                                        clear={clear} />
                                    <ErrDiv field='cur' errors={errorsExp} ln={ln} />
                                </div>
                            </div>
                            <div className='flex-1'>
                                <p className='flex text-xs font-medium whitespace-nowrap mb-0.5' style={{ color: 'var(--chathams-blue)' }}>{getTtl('Payment', ln)}:</p>
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
                        <p className='flex text-xs font-medium whitespace-nowrap mb-0.5' style={{ color: 'var(--chathams-blue)' }}>{getTtl('Comments', ln)}:</p>
                        <div>
                            <textarea rows="5" name="comments"
                                className="input h-32 p-1 rounded-full border-[#b8ddf8] bg-white w-full"
                                style={{ fontSize: '0.75rem', fontFamily: 'inherit' }}
                                value={valueExp.comments} onChange={handleValue} />
                        </div>

                    </div>
                </div>
            </div>
            <div className='flex gap-4 m-2'>
                <Tltip direction='top' tltpText='Save/Update form'>
                    <button
                        className='blackButton py-1'
                        onClick={saveExpense}
                        disabled={isPending}
                    >
                        <Save className='size-4' />
                        {getTtl('save', ln)}
                    </button>
                </Tltip>
                <Tltip direction='top' tltpText='Clear form'>
                    <button
                        className="whiteButton py-1"
                        onClick={blankExpense}
                    >
                        <Eraser className='size-4' />
                        {getTtl('Clear', ln)}
                    </button>
                </Tltip>
                <Tltip direction='top' tltpText='Delete Expense'>
                    <button
                        className="whiteButton py-1"
                        onClick={() => deleteCompExp(uidCollection)}
                    >
                        <Trash className='size-4' />
                        {getTtl('Delete', ln)}
                    </button>
                </Tltip>
                {valueExp.id !== '' &&
                    <Tltip direction='top' tltpText='Copy to misc invoices'>
                        <button
                            className="whiteButton py-1"
                            onClick={() => copyTomisc(uidCollection)}
                        >
                            <Copy className='size-4' />
                            Copy to misc invoices
                        </button>
                    </Tltip>
                }

                <Tltip direction='top' tltpText='Move expense to shipment invoice'>
                    <button
                        className="whiteButton py-1"
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