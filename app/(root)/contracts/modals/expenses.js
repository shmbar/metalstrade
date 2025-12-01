'use client'

import { useContext, useState, useEffect } from 'react'
import { ExpensesContext } from "@contexts/useExpensesContext";
import Datepicker from "react-tailwindcss-datepicker";
import CBox from '@components/combobox.js'
import { SettingsContext } from "@contexts/useSettingsContext";
import { InvoiceContext } from "@contexts/useInvoiceContext";
import { IoAddCircleOutline } from 'react-icons/io5';
import { MdDelete } from 'react-icons/md';
import ModalToDelete from '@components/modalToProceed';
import { validate, ErrDiv, loadInvoice } from '@utils/utils'
import { UserAuth } from "@contexts/useAuthContext";
import { MdOutlineWidgets } from 'react-icons/md'
import { ContractsContext } from "@contexts/useContractsContext";
import { usePathname } from 'next/navigation'
import { getTtl } from '@utils/languages';
import Tltip from '@components/tlTip';


const Expenses = ({ showExpenses }) => {

    const { valueExp, setValueExp, blankExpense, saveData_ExpenseInInvoice,
        delExpense, errorsExp, setErrorsExp } = useContext(ExpensesContext);
    const { valueInv, setValueInv, invoicesData, setInvoicesData } = useContext(InvoiceContext);
    const { settings, setLoading, setDateYr, ln } = useContext(SettingsContext);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false)
    const { uidCollection } = UserAuth();
    const { valueCon, contractsData, setContractsData, setValueCon } = useContext(ContractsContext);

    const sups = settings.Supplier.Supplier;
    const pathname = usePathname();

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

    const selectRow = async (i) => {
        setLoading(true)
        let exp = await loadInvoice(uidCollection, 'expenses', valueInv.expenses[i]) //Load Espense
        setDateYr(valueInv.expenses[i].date.substring(0, 4));
        setValueExp(exp)
        setLoading(false)
    }


    useEffect(() => {
        const loadCon = async () => {
            let tmp = await loadInvoice(uidCollection, 'contracts', valueInv.poSupplier) //load contract
            setValueCon(tmp)
        }

        if (valueCon?.id !== valueInv.poSupplier.id && pathname === '/invoices') {
            loadCon()
        }
    }, [])


    return valueExp && (
        <div className={`z-10 relative mt-2 border border-slate-300 rounded-lg 
        ${showExpenses ? 'flex animated-div' : 'hidden'}`}>
            <div className='grid grid-cols-4  gap-3 p-2 w-full'>
                <div className='col-span-12 md:col-span-1 border border-slate-300 rounded-lg p-2 h-fit'>
                    <p className='text-sm text-slate-600 font-medium'>{getTtl('Expenses', ln)}:</p>
                    {valueInv.expenses.length > 0 &&
                        <ul className="flex flex-col mt-1 overflow-auto ring-1 ring-black/5 rounded-lg divide-y" >
                            {valueInv.expenses.map((x, i) => {
                                return (
                                    <li key={i} onClick={() => selectRow(i)}
                                        className={`items-center py-1 px-1.5 text-[0.75rem] text-slate-700
									truncate cursor-pointer 
									${valueInv.expenses[i]['id'] === valueExp.id && 'font-medium bg-slate-100 '}`}>
                                        {x.expense}
                                    </li>
                                )
                            })}
                        </ul>}</div>
                <div className='col-span-12 md:col-span-3'>
                    <div className='grid grid-cols-3  gap-3 w-full'>
                        <div className='col-span-12 md:col-span-1  px-2'>
                            <div>
                                <p className='flex text-xs text-slate-600 font-medium whitespace-nowrap'>{getTtl('Expense Invoice', ln)}:</p>
                                <div className='w-full '>
                                    <input className="input text-[15px] shadow-lg h-7 text-xs" name='expense' value={valueExp.expense} onChange={handleValue} />
                                    <ErrDiv field='expense' errors={errorsExp} />
                                </div>
                            </div>
                            <div className='pt-2'>
                                <p className='flex text-xs text-slate-600 font-medium whitespace-nowrap'>{getTtl('Date', ln)}:</p>
                                <Datepicker useRange={false}
                                    asSingle={true}
                                    value={valueExp.dateRange}
                                    popoverDirection='up'
                                    onChange={handleDateChangeDate}
                                    displayFormat={"DD-MMM-YYYY"}
                                    inputClassName='input w-full text-[15px] shadow-lg h-7 text-xs z-20'
                                />
                                <ErrDiv field='date' errors={errorsExp} />
                            </div>
                            <div className='pt-2'>
                                <p className='flex text-xs text-slate-600 font-medium whitespace-nowrap'>{getTtl('Amount', ln)}:</p>
                                <div className='w-full '>
                                    <input type='number' className="input text-[15px] shadow-lg h-7 text-xs" name='amount' value={valueExp.amount} onChange={handleValue} />
                                    <ErrDiv field='amount' errors={errorsExp} />
                                </div>
                            </div>
                        </div>
                        <div className='col-span-12 md:col-span-1  px-2'>
                            <div>
                                <p className='flex text-xs text-slate-600 font-medium whitespace-nowrap'>{getTtl('Vendor', ln)}:</p>
                                <div className='w-full '>
                                    <CBox data={sups} setValue={setValueExp} value={valueExp} name='supplier' classes='shadow-md -mt-1 h-7' classes1='max-h-48' />
                                    <ErrDiv field='supplier' errors={errorsExp} />
                                </div>
                            </div>
                            <div className='pt-1'>
                                <p className='flex text-xs text-slate-600 font-medium whitespace-nowrap'>{getTtl('Expense Type', ln)}:</p>
                                <div className='w-full '>
                                    <CBox data={settings.Expenses.Expenses} setValue={setValueExp} value={valueExp} name='expType' classes='shadow-md  -mt-1 h-7' classes1='max-h-24' />
                                    <ErrDiv field='expType' errors={errorsExp} />
                                </div>
                            </div>
                            <div className='pt-1 gap-3 flex'>
                                <div className='max-w-xs '>
                                    <p className='flex text-xs text-slate-600 font-medium whitespace-nowrap'>{getTtl('Currency', ln)}:</p>
                                    <div className='w-full'>
                                        <CBox data={settings.Currency.Currency} setValue={setValueExp} value={valueExp} name='cur' classes='shadow-md -mt-1' />
                                        <ErrDiv field='cur' errors={errorsExp} />
                                    </div>
                                </div>
                                <div className='max-w-xs '>
                                    <p className='flex text-xs text-slate-600 font-medium whitespace-nowrap'>{getTtl('Payment', ln)}:</p>
                                    <div className='w-full'>
                                        <CBox data={settings.ExpPmnt.ExpPmnt} setValue={setValueExp} value={valueExp} name='paid' classes='shadow-md -mt-1' />
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className='col-span-12 md:col-span-1  px-2'>
                            <p className='flex text-xs text-slate-600 font-medium whitespace-nowrap'>{getTtl('Comments', ln)}:</p>
                            <div>
                                <textarea rows="5" cols="60" name="comments"
                                    className="input text-[15px] shadow-lg h-24 text-xs p-1"
                                    value={valueExp.comments} onChange={handleValue} />
                            </div>
                            <div className='flex gap-3 m-2 flex-wrap'>
                                <Tltip direction='top' tltpText='Save/Update form'>
                                    <button
                                        className="blackButton py-1 font-light"
                                        onClick={() => saveData_ExpenseInInvoice(uidCollection, valueInv, setValueInv, invoicesData, setInvoicesData, contractsData,
                                            setContractsData, valueCon)}
                                    >
                                        <IoAddCircleOutline className='scale-110' />
                                        {getTtl('save', ln)}
                                    </button>
                                </Tltip>
                                <Tltip direction='top' tltpText='Set New Expense'>
                                    <button
                                        className=" whiteButton py-1 "
                                        onClick={blankExpense}
                                    >
                                        <MdOutlineWidgets className='scale-110' />
                                        {getTtl('New', ln)}
                                    </button>
                                </Tltip>
                                {valueExp.id !== '' &&
                                    <Tltip direction='top' tltpText='Delete Expense'>
                                        <button
                                            className="whiteButton py-1"
                                            onClick={() => setIsDeleteOpen(true)}
                                        >
                                            <MdDelete className='scale-110' />
                                            {getTtl('Delete', ln)}
                                        </button>
                                    </Tltip>
                                }
                                <ModalToDelete isDeleteOpen={isDeleteOpen} setIsDeleteOpen={setIsDeleteOpen}
                                    ttl='Delete Confirmation' txt='Deleting this expense is irreversible. Please confirm to proceed.'
                                    doAction={() => delExpense(uidCollection, valueInv, setValueInv, invoicesData, setInvoicesData, setContractsData,
                                        contractsData)} />

                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div >


    )
}

export default Expenses