import { useContext, useState, useEffect, useTransition } from 'react'
import { ExpensesContext } from "@contexts/useExpensesContext";
import Datepicker from "react-tailwindcss-datepicker";
import { SettingsContext } from "@contexts/useSettingsContext";
import { validate, ErrDiv } from '@utils/utils'
import { UserAuth } from "@contexts/useAuthContext";
import { getTtl } from '@utils/languages';
import Tltip from '@components/tlTip';
import { Selector } from '@components/selectors/selectShad.js';
import {Save, Eraser, Trash, Copy } from "lucide-react"
import { Button } from '@components/ui/button';

const Expenses = () => {

    const { valueExp, setValueExp, blankExpense, saveData_CompanyExpenses,
        errorsExp, setErrorsExp, deleteCompExp, copyTomisc } = useContext(ExpensesContext);
    const { settings, ln } = useContext(SettingsContext);
    const { uidCollection } = UserAuth();
    const [isPending, startTransition] = useTransition();
    const sups = settings.Supplier.Supplier;


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
            <div className='z-10 relative mt-2 border border-slate-300 rounded-lg 
       flex m-2 pb-6'>

                <div className='grid grid-cols-12 gap-3 w-full p-2'>
                    <div className='col-span-12 md:col-span-4  px-2'>
                        <div>
                            <p className='flex text-xs text-slate-600 font-medium whitespace-nowrap'>{getTtl('Expense Invoice', ln)}</p>
                            <div className='w-full '>
                                <input className="input shadow-lg h-8 text-xs" name='expense' value={valueExp.expense} onChange={handleValue} />
                                <ErrDiv field='expense' errors={errorsExp} ln={ln} />
                            </div>
                        </div>
                        <div className='pt-1'>
                            <p className='flex text-xs text-slate-600 font-medium whitespace-nowrap'>{getTtl('Date', ln)}:</p>
                            <Datepicker useRange={false}
                                asSingle={true}
                                value={valueExp.dateRange}
                                popoverDirection='down'
                                onChange={handleDateChangeDate}
                                displayFormat={"DD-MMM-YYYY"}
                                inputClassName='input w-full shadow-lg h-8 text-xs z-20'
                            />
                            <ErrDiv field='date' errors={errorsExp} ln={ln} />
                        </div>
                        <div className='pt-1'>
                            <p className='flex text-xs text-slate-600 font-medium whitespace-nowrap'>{getTtl('Amount', ln)}:</p>
                            <div className='w-full '>
                                <input type='number' className="input shadow-lg h-8 text-xs" name='amount' value={valueExp.amount} onChange={handleValue} />
                                <ErrDiv field='amount' errors={errorsExp} ln={ln} />
                            </div>
                        </div>
                    </div>
                    <div className='col-span-12 md:col-span-4  px-2'>
                        <div>
                            <p className='flex text-xs text-slate-600 font-medium whitespace-nowrap'>{getTtl('Vendor', ln)}:</p>
                            <div className='w-full '>
                                <Selector arr={sups} value={valueExp}
                                    onChange={(e) => handleChange(e, 'supplier')}
                                    name='supplier'
                                    clear={clear} />
                                <ErrDiv field='supplier' errors={errorsExp} ln={ln} />
                            </div>
                        </div>
                        <div className='pt-1'>
                            <p className='flex text-xs text-slate-600 font-medium whitespace-nowrap'>{getTtl('Expense Type', ln)}:</p>
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
                                <p className='flex text-xs text-slate-600 font-medium whitespace-nowrap'>{getTtl('Currency', ln)}:</p>
                                <div className='w-full'>
                                    <Selector arr={settings.Currency.Currency} value={valueExp}
                                        onChange={(e) => handleChange(e, 'cur')}
                                        name='cur'
                                        clear={clear} />
                                    <ErrDiv field='cur' errors={errorsExp} ln={ln} />
                                </div>
                            </div>
                            <div className='flex-1'>
                                <p className='flex text-xs text-slate-600 font-medium whitespace-nowrap'>{getTtl('Payment', ln)}:</p>
                                <div className='w-full'>
                                    <Selector arr={settings.ExpPmnt.ExpPmnt} value={valueExp}
                                        onChange={(e) => handleChange(e, 'paid')}
                                        name='paid'
                                        clear={clear} />
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className='col-span-12 md:col-span-4  px-2'>
                        <p className='flex text-xs text-slate-600 font-medium whitespace-nowrap'>{getTtl('Comments', ln)}:</p>
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
                    <Button
                        className='h-9'
                        onClick={saveExpense}
                        disabled={isPending}
                    >
                        <Save />
                        {getTtl('save', ln)}
                    </Button>
                </Tltip>
                <Tltip direction='top' tltpText='Clear form'>
                    <Button
                        className="h-9"
                        variant='outline'
                        onClick={blankExpense}
                    >
                        <Eraser />
                        {getTtl('Clear', ln)}
                    </Button>
                </Tltip>
                <Tltip direction='top' tltpText='Delete Expense'>
                    <Button
                        className="h-9"
                        variant='outline'
                        onClick={() => deleteCompExp(uidCollection)}
                    >
                        <Trash />
                        {getTtl('Delete', ln)}
                    </Button>
                </Tltip>
                {valueExp.id !== '' &&
                    <Tltip direction='top' tltpText='Copy to misc invoices'>
                        <Button
                            className="h-9"
                            variant='outline'
                            onClick={() => copyTomisc(uidCollection)}
                        >
                            <Copy/>
                            Copy to misc invoices
                        </Button>
                    </Tltip>
                }

            </div>
        </div >


    )
}

export default Expenses