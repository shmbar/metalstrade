import { useContext, useState, useEffect } from 'react'
import { ExpensesContext } from "../../../../contexts/useExpensesContext";
import Datepicker from "react-tailwindcss-datepicker";
import CBox from '../../../../components/combobox.js'
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

    const handleDateChangeDate = (newValue) => {
        setValueExp({ ...valueExp, dateRange: newValue, date: newValue.startDate })
    }

    return (
        <div>
            <div className='z-10 relative mt-2 border border-[var(--rock-blue)] rounded-lg 
       flex m-2 pb-6 bg-[var(--selago)]/30'>

                <div className='grid grid-cols-12 gap-3 w-full p-2'>
                    <div className='col-span-12 md:col-span-4  px-2'>
                        <div>
                            <p className='flex text-xs text-[var(--port-gore)] font-medium whitespace-nowrap'>{getTtl('Expense Invoice', ln)}</p>
                            <div className='w-full '>
                                <input className="input text-[15px] shadow-lg h-7 text-xs" name='expense' value={valueExp.expense} onChange={handleValue} />
                                <ErrDiv field='expense' errors={errorsExp} />
                            </div>
                        </div>
                        <div className='pt-2'>
                            <p className='flex text-xs text-[var(--port-gore)] font-medium whitespace-nowrap'>{getTtl('Date', ln)}:</p>
                            <Datepicker useRange={false}
                                asSingle={true}
                                value={valueExp.dateRange}
                                popoverDirection='down'
                                onChange={handleDateChangeDate}
                                displayFormat={"DD-MMM-YYYY"}
                                inputClassName='input w-full text-[15px] shadow-lg h-7 text-xs z-20'
                            />
                            <ErrDiv field='date' errors={errorsExp} />
                        </div>
                        <div className='pt-2'>
                            <p className='flex text-xs text-[var(--port-gore)] font-medium whitespace-nowrap'>{getTtl('Amount', ln)}:</p>
                            <div className='w-full '>
                                <input type='number' className="input text-[15px] shadow-lg h-7 text-xs" name='amount' value={valueExp.amount} onChange={handleValue} />
                                <ErrDiv field='amount' errors={errorsExp} />
                            </div>
                        </div>
                    </div>
                    <div className='col-span-12 md:col-span-4  px-2'>
                        <div>
                            <p className='flex text-xs text-[var(--port-gore)] font-medium whitespace-nowrap'>{getTtl('Vendor', ln)}:</p>
                            <div className='w-full '>
                                <CBox data={sups} setValue={setValueExp} value={valueExp} name='supplier' classes='shadow-md -mt-1 h-7' classes1='max-h-48' />
                                <ErrDiv field='supplier' errors={errorsExp} />
                            </div>
                        </div>
                        <div className='pt-1'>
                            <p className='flex text-xs text-[var(--port-gore)] font-medium whitespace-nowrap'>{getTtl('Expense Type', ln)}:</p>
                            <div className='w-full '>
                                <CBox data={settings.Expenses.Expenses} setValue={setValueExp} value={valueExp} name='expType' classes='shadow-md  -mt-1 h-7' classes1='max-h-24' />
                                <ErrDiv field='expType' errors={errorsExp} />
                            </div>
                        </div>
                        <div className='pt-1 gap-3 flex'>
                            <div className='max-w-xs '>
                                <p className='flex text-xs text-[var(--port-gore)] font-medium whitespace-nowrap'>{getTtl('Currency', ln)}:</p>
                                <div className='w-full'>
                                    <CBox data={settings.Currency.Currency} setValue={setValueExp} value={valueExp} name='cur' classes='shadow-md -mt-1' />
                                    <ErrDiv field='cur' errors={errorsExp} />
                                </div>
                            </div>
                            <div className='max-w-xs '>
                                <p className='flex text-xs text-[var(--port-gore)] font-medium whitespace-nowrap'>{getTtl('Payment', ln)}:</p>
                                <div className='w-full'>
                                    <CBox data={settings.ExpPmnt.ExpPmnt} setValue={setValueExp} value={valueExp} name='paid' classes='shadow-md -mt-1' />
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className='col-span-12 md:col-span-4  px-2'>
                        <p className='flex text-xs text-[var(--port-gore)] font-medium whitespace-nowrap'>{getTtl('Comments', ln)}:</p>
                        <div>
                            <textarea rows="5" cols="60" name="comments"
                                className="input text-[15px] shadow-lg h-32 text-xs p-1"
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
