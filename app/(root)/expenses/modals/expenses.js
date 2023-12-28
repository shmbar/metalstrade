import { useContext, useState, useEffect } from 'react'
import { ExpensesContext } from "@contexts/useExpensesContext";
import Datepicker from "react-tailwindcss-datepicker";
import CBox from '@components/combobox.js'
import { SettingsContext } from "@contexts/useSettingsContext";
import { InvoiceContext } from "@contexts/useInvoiceContext";
import { IoAddCircleOutline } from 'react-icons/io5';
import { AiOutlineClear } from 'react-icons/ai';
import { validate, ErrDiv } from '@utils/utils'
import { UserAuth } from "@contexts/useAuthContext";

const Expenses = () => {

    const { valueExp, setValueExp, blankExpense, saveData_ExpenseExpenses,
        errorsExp, setErrorsExp } = useContext(ExpensesContext);
    const { valueInv, setValueInv, invoicesData, setInvoicesData } = useContext(InvoiceContext);
    const { settings } = useContext(SettingsContext);
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
        setValueExp({ ...valueExp, date: newValue })
    }

    return (
        <div>
            <div className='z-10 relative mt-2 border border-slate-300 rounded-lg 
       flex m-2 pb-6'>

                <div className='grid grid-cols-12 flex gap-3 w-full p-2'>
                    <div className='col-span-12 md:col-span-4  px-2'>
                        <div>
                            <p className='flex text-xs text-slate-600 font-medium whitespace-nowrap'>Expense Invoice:</p>
                            <div className='w-full '>
                                <input className="input text-[15px] shadow-lg h-7 text-xs" name='expense' value={valueExp.expense} onChange={handleValue} />
                                <ErrDiv field='expense' errors={errorsExp} />
                            </div>
                        </div>
                        <div className='pt-2'>
                            <p className='flex text-xs text-slate-600 font-medium whitespace-nowrap'>Date:</p>
                            <Datepicker useRange={false}
                                asSingle={true}
                                value={valueExp.date}
                                popoverDirection='down'
                                onChange={handleDateChangeDate}
                                displayFormat={"DD-MMM-YYYY"}
                                inputClassName='input w-full text-[15px] shadow-lg h-7 text-xs z-20'
                            />
                            <ErrDiv field='date' errors={errorsExp} />
                        </div>
                        <div className='pt-2'>
                            <p className='flex text-xs text-slate-600 font-medium whitespace-nowrap'>Amount:</p>
                            <div className='w-full '>
                                <input type='number' className="input text-[15px] shadow-lg h-7 text-xs" name='amount' value={valueExp.amount} onChange={handleValue} />
                                <ErrDiv field='amount' errors={errorsExp} />
                            </div>
                        </div>
                    </div>
                    <div className='col-span-12 md:col-span-4  px-2'>
                        <div>
                            <p className='flex text-xs text-slate-600 font-medium whitespace-nowrap'>Vendor:</p>
                            <div className='w-full '>
                                <CBox data={sups} setValue={setValueExp} value={valueExp} name='supplier' classes='shadow-md -mt-1 h-7' classes1='max-h-48' />
                                <ErrDiv field='supplier' errors={errorsExp} />
                            </div>
                        </div>
                        <div className='pt-1'>
                            <p className='flex text-xs text-slate-600 font-medium whitespace-nowrap'>Expense Type:</p>
                            <div className='w-full '>
                                <CBox data={settings.Expenses.Expenses} setValue={setValueExp} value={valueExp} name='expType' classes='shadow-md  -mt-1 h-7' classes1='max-h-24' />
                                <ErrDiv field='expType' errors={errorsExp} />
                            </div>
                        </div>
                        <div className='pt-1 gap-3 flex'>
                            <div className='max-w-xs '>
                                <p className='flex text-xs text-slate-600 font-medium whitespace-nowrap'>Currency:</p>
                                <div className='w-full'>
                                    <CBox data={settings.Currency.Currency} setValue={setValueExp} value={valueExp} name='cur' classes='shadow-md -mt-1' />
                                    <ErrDiv field='cur' errors={errorsExp} />
                                </div>
                            </div>
                            <div className='max-w-xs '>
                                <p className='flex text-xs text-slate-600 font-medium whitespace-nowrap'>Payment:</p>
                                <div className='w-full'>
                                    <CBox data={settings.ExpPmnt.ExpPmnt} setValue={setValueExp} value={valueExp} name='paid' classes='shadow-md -mt-1' />
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className='col-span-12 md:col-span-4  px-2'>
                        <p className='flex text-xs text-slate-600 font-medium whitespace-nowrap'>Comments:</p>
                        <div>
                            <textarea rows="5" cols="60" name="comments"
                                className="input text-[15px] shadow-lg h-32 text-xs p-1"
                                value={valueExp.comments} onChange={handleValue} />
                        </div>

                    </div>
                </div>
            </div>
            <div className='flex gap-4 m-2'>
                <button
                    className=" flex items-center justify-center text-white gap-1.5 py-1 px-2  border
                             border-slate-400 bg-neutral-400 rounded-md text-xs text-white hover:bg-neutral-500 shadow-lg"
                    onClick={() => saveData_ExpenseExpenses(uidCollection, valueInv, setValueInv)}
                >
                    <IoAddCircleOutline className='scale-110' />
                    Save
                </button>

                <button
                    className=" flex items-center justify-center text-white gap-1.5 py-1 px-2  border
                            border-slate-400 bg-neutral-400 rounded-md text-xs text-white hover:bg-neutral-500 shadow-lg"
                    onClick={blankExpense}
                >
                    <AiOutlineClear className='scale-110' />
                    Clear
                </button>

            </div>

        </div >


    )
}

export default Expenses