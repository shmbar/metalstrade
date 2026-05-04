'use client'

import { useContext, useState, useEffect } from 'react'
import { ExpensesContext } from "@contexts/useExpensesContext";
import Datepicker from "react-tailwindcss-datepicker";
import { SettingsContext } from "@contexts/useSettingsContext";
import { InvoiceContext } from "@contexts/useInvoiceContext";
import ModalToDelete from '@components/modalToProceed';
import { validate, ErrDiv, loadInvoice } from '@utils/utils'
import { UserAuth } from "@contexts/useAuthContext";
import { ContractsContext } from "@contexts/useContractsContext";
import { usePathname } from 'next/navigation'
import { getTtl } from '@utils/languages';
import Tltip from '@components/tlTip';
import { Selector } from '@components/selectors/selectShad';
import { Save, Eraser, Trash } from "lucide-react"
import { Button } from '@components/ui/button';

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


    return valueExp && (
        <div className={`z-10 relative mt-2 border border-[#b8ddf8] rounded-2xl
        ${showExpenses ? 'flex animated-div' : 'hidden'}`} style={{background:'#f4f9ff'}}>
            <div className='grid grid-cols-1 md:grid-cols-4 gap-3 p-2 w-full'>
                <div className='md:col-span-1 border border-[#b8ddf8] rounded-2xl p-2 h-fit'>
                    <p className='responsiveText font-medium' style={{color:'var(--chathams-blue)'}}>{getTtl('Expenses', ln)}:</p>
                    {valueInv.expenses.length > 0 &&
                        <ul className="flex flex-col mt-1 overflow-auto rounded-2xl divide-y" style={{border:'1px solid #b8ddf8'}}>
                            {valueInv.expenses.map((x, i) => {
                                return (
                                    <li key={i} onClick={() => selectRow(i)}
                                        className={`items-center py-1 px-1.5 responsiveTextTable text-[var(--port-gore)]
									truncate cursor-pointer
									${valueInv.expenses[i]['id'] === valueExp.id && 'font-medium bg-slate-100 '}`}>
                                        {x.expense}
                                        {x.amount !== '' && x.amount != null &&
                                            <span className='ml-1 text-[var(--chathams-blue)]'>
                                                {settings.Currency.Currency.find(c => c.id === x.cur)?.symbol}{Number(x.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </span>
                                        }
                                    </li>
                                )
                            })}
                        </ul>}</div>
                <div className='md:col-span-3'>
                    <div className='grid grid-cols-1 md:grid-cols-3 gap-3 w-full'>
                        <div className='px-2'>
                            <div>
                                <p className='flex responsiveText font-medium whitespace-nowrap' style={{color:'var(--chathams-blue)'}}>{getTtl('Expense Invoice', ln)}:</p>
                                <div className='w-full '>
                                    <input className="input shadow-lg h-8 w-full" style={{ fontFamily: 'inherit' }} name='expense' value={valueExp.expense} onChange={handleValue} />
                                    <ErrDiv field='expense' errors={errorsExp} />
                                </div>
                            </div>
                            <div className='pt-1'>
                                <p className='flex responsiveText font-medium whitespace-nowrap' style={{color:'var(--chathams-blue)'}}>{getTtl('Date', ln)}:</p>
                                <Datepicker useRange={false}
                                    asSingle={true}
                                    value={valueExp.dateRange}
                                    popoverDirection='up'
                                    onChange={handleDateChangeDate}
                                    displayFormat={"DD-MMM-YYYY"}
                                    inputClassName='input w-full shadow-lg h-8 z-20'
                                />
                                <ErrDiv field='date' errors={errorsExp} />
                            </div>
                            <div className='pt-1'>
                                <p className='flex responsiveText font-medium whitespace-nowrap' style={{color:'var(--chathams-blue)'}}>{getTtl('Amount', ln)}:</p>
                                <div className='w-full '>
                                    <input type='number' className="input shadow-lg h-8 w-full" style={{ fontFamily: 'inherit' }} name='amount' value={valueExp.amount} onChange={handleValue} />
                                    <ErrDiv field='amount' errors={errorsExp} />
                                </div>
                            </div>
                        </div>
                        <div className='px-2'>
                            <div>
                                <p className='flex responsiveText font-medium whitespace-nowrap' style={{color:'var(--chathams-blue)'}}>{getTtl('Vendor', ln)}:</p>
                                <div className='w-full '>
                                    <Selector arr={sups} value={valueExp}
                                        onChange={(e) => handleChange(e, 'supplier')}
                                        name='supplier'
                                        clear={clear} />

                                    <ErrDiv field='supplier' errors={errorsExp} />
                                </div>
                            </div>
                            <div className='pt-1'>
                                <p className='flex responsiveText font-medium whitespace-nowrap' style={{color:'var(--chathams-blue)'}}>{getTtl('Expense Type', ln)}:</p>
                                <div className='w-full '>
                                    <Selector arr={settings.Expenses.Expenses} value={valueExp}
                                        onChange={(e) => handleChange(e, 'expType')}
                                        name='expType'
                                        clear={clear} />
                                    <ErrDiv field='expType' errors={errorsExp} />
                                </div>
                            </div>
                            <div className='pt-1 gap-3 flex'>
                                <div className='flex-1'>
                                    <p className='flex responsiveText font-medium whitespace-nowrap' style={{color:'var(--chathams-blue)'}}>{getTtl('Currency', ln)}:</p>
                                    <div className='w-full'>
                                        <Selector arr={settings.Currency.Currency} value={valueExp}
                                            onChange={(e) => handleChange(e, 'cur')}
                                            name='cur'
                                            clear={clear} />
                                        <ErrDiv field='cur' errors={errorsExp} />
                                    </div>
                                </div>
                                <div className='flex-1'>
                                    <p className='flex responsiveText font-medium whitespace-nowrap' style={{color:'var(--chathams-blue)'}}>{getTtl('Payment', ln)}:</p>
                                    <div className='w-full'>
                                        <Selector arr={settings.ExpPmnt.ExpPmnt} value={valueExp}
                                            onChange={(e) => handleChange(e, 'paid')}
                                            name='paid'
                                            clear={clear} />
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className='px-2'>
                            <p className='flex responsiveText font-medium whitespace-nowrap' style={{color:'var(--chathams-blue)'}}>{getTtl('Comments', ln)}:</p>
                            <div>
                                <textarea rows="5" name="comments"
                                    className="input shadow-lg h-24 p-1 !rounded-full w-full"
                                    style={{ fontSize: '0.75rem', fontFamily: 'inherit' }}
                                    value={valueExp.comments} onChange={handleValue} />
                            </div>
                            <div className='flex gap-3 m-2 flex-wrap'>
                                <Tltip direction='top' tltpText='Save/Update form'>
                                    <Button
                                        className="h-7 px-2"
                                        onClick={() => saveData_ExpenseInInvoice(uidCollection, valueInv, setValueInv, invoicesData, setInvoicesData, contractsData,
                                            setContractsData, valueCon)}
                                    >
                                        <Save />
                                        {getTtl('save', ln)}
                                    </Button>
                                </Tltip>
                                <Tltip direction='top' tltpText='Set New Expense'>
                                    <Button
                                        className="h-7 px-2"
                                        variant='outline'
                                        onClick={blankExpense}
                                    >
                                        <Eraser />
                                        {getTtl('Clear', ln)}
                                    </Button>
                                </Tltip>
                                {valueExp.id !== '' &&
                                    <Tltip direction='top' tltpText='Delete Expense'>
                                        <Button
                                            className="h-7 px-2"
                                            variant='outline'
                                            onClick={() => setIsDeleteOpen(true)}
                                        >
                                            <Trash />
                                            {getTtl('Delete', ln)}
                                        </Button>
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