import { useContext, useEffect } from 'react'
import { ExpensesContext } from "../../../../contexts/useExpensesContext";
import Datepicker from "react-tailwindcss-datepicker";
import { Selector } from '../../../../components/selectors/selectShad.js'
import { SettingsContext } from "../../../../contexts/useSettingsContext";
import { InvoiceContext } from "../../../../contexts/useInvoiceContext";
import { IoAddCircleOutline } from 'react-icons/io5';
import { AiOutlineClear } from 'react-icons/ai';
import { validate, ErrDiv } from '../../../../utils/utils'
import { UserAuth } from "../../../../contexts/useAuthContext";
import { getTtl } from '../../../../utils/languages';
import Tltip from '../../../../components/tlTip';

const Expenses = () => {

    const { valueExp, setValueExp, blankExpense, saveData_ExpenseExpenses,
        errorsExp, setErrorsExp } = useContext(ExpensesContext);
    const { valueInv, setValueInv, } = useContext(InvoiceContext);
    const { settings, ln } = useContext(SettingsContext);
    const { uidCollection } = UserAuth();

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

    return (
        <div>
            <div className='z-10 relative mt-2 rounded-2xl flex m-2 pb-4' style={{ border: '1px solid #b8ddf8', background: '#f4f9ff' }}>

                <div className='grid grid-cols-12 gap-3 w-full p-2'>
                    <div className='col-span-12 md:col-span-4  px-2'>
                        <div>
                            <p className='flex text-sm font-medium whitespace-nowrap mb-0.5' style={{color:'var(--chathams-blue)'}}>{getTtl('Expense Invoice', ln)}</p>
                            <div className='w-full '>
                                <input className="input h-7 text-xs rounded-xl border-[#b8ddf8] bg-white" name='expense' value={valueExp.expense} onChange={handleValue} />
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
                                <input type='number' className="input h-7 text-xs rounded-xl border-[#b8ddf8] bg-white" name='amount' value={valueExp.amount} onChange={handleValue} />
                                <ErrDiv field='amount' errors={errorsExp} />
                            </div>
                        </div>
                    </div>
                    <div className='col-span-12 md:col-span-4  px-2'>
                        <div>
                            <p className='flex text-sm font-medium whitespace-nowrap mb-0.5' style={{color:'var(--chathams-blue)'}}>{getTtl('Vendor', ln)}:</p>
                            <div className='w-full '>
                                <Selector arr={sups} value={valueExp} onChange={(e) => handleChange(e, 'supplier')} name='supplier' clear={clear} />
                                <ErrDiv field='supplier' errors={errorsExp} />
                            </div>
                        </div>
                        <div className='pt-1'>
                            <p className='flex text-sm font-medium whitespace-nowrap mb-0.5' style={{color:'var(--chathams-blue)'}}>{getTtl('Expense Type', ln)}:</p>
                            <div className='w-full '>
                                <Selector arr={settings.Expenses.Expenses} value={valueExp} onChange={(e) => handleChange(e, 'expType')} name='expType' clear={clear} />
                                <ErrDiv field='expType' errors={errorsExp} />
                            </div>
                        </div>
                        <div className='pt-1 gap-3 flex'>
                            <div className='max-w-xs '>
                                <p className='flex text-sm font-medium whitespace-nowrap mb-0.5' style={{color:'var(--chathams-blue)'}}>{getTtl('Currency', ln)}:</p>
                                <div className='w-full'>
                                    <Selector arr={settings.Currency.Currency} value={valueExp} onChange={(e) => handleChange(e, 'cur')} name='cur' clear={clear} />
                                    <ErrDiv field='cur' errors={errorsExp} />
                                </div>
                            </div>
                            <div className='max-w-xs '>
                                <p className='flex text-sm font-medium whitespace-nowrap mb-0.5' style={{color:'var(--chathams-blue)'}}>{getTtl('Payment', ln)}:</p>
                                <div className='w-full'>
                                    <Selector arr={settings.ExpPmnt.ExpPmnt} value={valueExp} onChange={(e) => handleChange(e, 'paid')} name='paid' clear={clear} />
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className='col-span-12 md:col-span-4  px-2'>
                        <p className='flex text-sm font-medium whitespace-nowrap mb-0.5' style={{color:'var(--chathams-blue)'}}>{getTtl('Comments', ln)}:</p>
                        <div>
                            <textarea rows="5" cols="60" name="comments"
                                className="input h-32 text-xs p-1 rounded-xl border-[#b8ddf8] bg-white"
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
            </div>

        </div >


    )
}

export default Expenses
