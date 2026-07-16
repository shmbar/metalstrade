'use client'
import { useState, useContext, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import dateFormat from "dateformat";
import { SettingsContext } from '../contexts/useSettingsContext'
import {
    validate, saveData, delDoc, loadInvoice,
    updateExpenseInContracts, delExpenseInContracts, updateDocument,
    saveCompanyExpense,
    delCompExp,
    speciaInvoices,
    syncMiscInvoiceIfExists
} from '../utils/utils'
import { getTtl } from '../utils/languages';

const newExpense = {
    id: '', lstSaved: '', supplier: '', dateRange: { startDate: null, endDate: null }, salesInv: '',
    poSupplier: '', cur: '', amount: '', date: '',
    expense: '', expType: '', paid: '', comments: ''

}

const getprefixInv = (x) => {
    return (x.invType === '1111' || x.invType === 'Invoice') ? '' :
        (x.invType === '2222' || x.invType === 'Credit Note') ? 'CN' : 'FN'
}

// The Misc Invoice (specialInvoices) snapshot derived from a company expense —
// used both by "Copy to misc invoices" and by the save-time re-sync of an
// existing copy, so the two can never drift apart.
const buildMiscFromExpense = (v, settings) => {
    const gQ = (z, y, x) => settings[y][y].find(q => q.id === z)?.[x] || ''
    return {
        compName: gQ(v.supplier, 'Supplier', 'nname'),
        supplier: '-', order: '-',
        invoice: v?.expense, id: v.id,
        salesInvoice: '-',
        description: gQ(v.expType, 'Expenses', 'expType'),
        cur: v.cur,
        qnty: '-', unitPrc: 0, total: v.amount,
        paidNotPaid: v.paid === '111' ? 'Paid' : 'Not Paid',
        date: v.dateRange.startDate,
    }
}


const useSettingsState = (props) => {
    const [valueExp, setValueExp] = useState();
    const [expensesData, setExpensesData] = useState([]);
    const { setToast, dateYr, ln, settings } = useContext(SettingsContext);
    const [errorsExp, setErrorsExp] = useState({})
    const [isOpen, setIsOpen] = useState(false)

    // Memoized: identity changes only when exposed/captured state changes (see
    // useContractsState for the rationale). Closures read valueExp, expensesData,
    // settings, dateYr, ln — all deps below.
    return useMemo(() => ({
        valueExp, setValueExp,
        expensesData, setExpensesData,
        errorsExp, setErrorsExp,
        isOpen, setIsOpen,
        blankExpense: () => {
            setValueExp(newExpense); //new Empty valueExp
            setErrorsExp({})
        },
        saveData_ExpenseInInvoice: async (uidCollection, valueInv, setValueInv, invoicesData, setInvoicesData,
            contractsData, setContractsData, valueCon) => {

            //validation
            let errs = validate(valueExp, ['expense', 'cur', 'supplier', 'expType', 'amount', 'date'])
            setErrorsExp(errs)
            const isNotFilled = Object.values(errs).includes(true); //all filled

            if (isNotFilled) {
                setToast({ show: true, text: getTtl('Some fields are missing!', ln), clr: 'fail' })
                return;
            }


            let indx = valueInv.expenses.findIndex((x) => x.id === valueExp.id); //new expense or existing
            let valueExpObj = valueExp;
            let tmpObj = null;
            let tmpArr = null;
            let tmpArr1 = null;

            if (indx !== -1) { //update
                tmpArr = valueInv.expenses.map((k) => (k.id === valueExp.id ?
                    {
                        ...k, expense: valueExp.expense, date: valueExp.dateRange.startDate,
                        amount: valueExp.amount, cur: valueExp.cur, expType: valueExp.expType
                    } : k));

                tmpObj = { ...valueInv, expenses: tmpArr }

                let tmpValExp = {
                    id: valueExp.id, expense: valueExp.expense,
                    date: valueExp.dateRange.startDate, amount: valueExp.amount,
                    cur: valueExp.cur, expType: valueExp.expType
                }

                const tmpExpArr = await loadInvoice(uidCollection, 'contracts', valueInv.poSupplier)
                let updatedExpArr = tmpExpArr.expenses.map(x => x.id === tmpValExp.id ? tmpValExp : x)

                tmpArr1 = contractsData.map((k) => (k.id === valueCon.id ?
                    { ...k, expenses: updatedExpArr } : k));

                //update existig expense object in contracts
                await updateDocument(uidCollection, 'contracts', 'expenses', valueInv.poSupplier, updatedExpArr)

                //check is a date was changed
                if (dateYr !== valueExp.dateRange.startDate.substring(0, 4) && dateYr != null) {
                    let dateTmp = { startDate: dateYr }
                    let valueExpTmp = ({ id: valueExp.id, date: dateTmp })
                    await delDoc(uidCollection, 'expenses', valueExpTmp)
                }

            } else { //new Expense
                valueExpObj = {
                    ...valueExp, id: uuidv4(), salesInv: valueInv.invoice + getprefixInv(valueInv),
                    poSupplier: valueInv.poSupplier, invData: {
                        id: valueInv.id,
                        date: valueInv.final ? valueInv.date : valueInv.dateRange.startDate
                    }
                }

                tmpArr = [...valueInv.expenses,
                {
                    id: valueExpObj.id, expense: valueExpObj.expense, date: valueExpObj.dateRange.startDate,
                    amount: valueExpObj.amount, cur: valueExpObj.cur, expType: valueExpObj.expType
                }]
                tmpObj = { ...valueInv, expenses: tmpArr }


                //update Contract => expenses
                let tmpValExp = {
                    id: valueExpObj.id, expense: valueExpObj.expense,
                    date: valueExpObj.dateRange.startDate, amount: valueExpObj.amount,
                    cur: valueExpObj.cur, expType: valueExpObj.expType
                }

                //save to server in Contracts
                let newExpArr = [...valueCon.expenses, tmpValExp]
                tmpArr1 = contractsData.map((k) => (k.id === valueCon.id ?
                    { ...k, expenses: newExpArr } : k));

                //update existig expense object in contracts
                await updateExpenseInContracts(uidCollection, tmpValExp, valueInv.poSupplier)
            }

            setValueInv(tmpObj)

            if (!tmpObj.final) {

                await saveData(uidCollection, 'invoices', tmpObj)
            } else {
                //  await saveDataFinalCancel(uidCollection, 'invoices', tmpObj)
            }

            tmpArr = invoicesData.map((k) => (k.id === tmpObj.id ? tmpObj : k));
            setInvoicesData(tmpArr)

            setContractsData(tmpArr1)
            //save to DataExpenses

            tmpObj = { ...valueExpObj, lstSaved: dateFormat(new Date(), "dd-mmm-yyyy, HH:MM") }

            let success = await saveData(uidCollection, 'expenses', tmpObj)

            setValueExp(newExpense); //new Empty valueInv
            success && setToast({ show: true, text: getTtl('Expense successfully saved!', ln), clr: 'success' })
        },
        delExpense: async (uidCollection, valueInv, setValueInv, invoicesData, setInvoicesData, setContractsData,
            contractsData) => {
            const tmpArr = valueInv.expenses.filter((k) => k.id !== valueExp.id);
            let val = { ...valueInv, expenses: tmpArr }
            setValueInv(val)

            if (!val.final) {
                await saveData(uidCollection, 'invoices', val)
            } else {
                // await saveDataFinalCancel(uidCollection, 'invoices', val)
            }
            setInvoicesData(invoicesData.map((k) => (k.id === val.id ? val : k)))

            setExpensesData(expensesData.filter((k) => k.id !== valueExp.id))
            setValueExp(newExpense); //new Empty valueInv


            //update Contract => expenses
            let tmpValExp = {
                id: valueExp.id, expense: valueExp.expense, amount: valueExp.amount,
                date: valueExp.dateRange.startDate, cur: valueExp.cur
            }
            //save to server in Contracts
            await delExpenseInContracts(uidCollection, tmpValExp, valueInv.poSupplier)

            let tmpArr1 = contractsData.map((x) => {
                return { ...x, expenses: x.expenses.filter(x => x.id !== tmpValExp.id) }
            });

            setContractsData(tmpArr1)


            let success = await delDoc(uidCollection, 'expenses', valueExp)
            success && setToast({ show: true, text: getTtl('Expense successfully deleted!', ln), clr: 'success' })
        },
        saveData_ExpenseExpenses: async (uidCollection, valueInv, setValueInv) => {

            //validation
            let errs = validate(valueExp, ['expense', 'cur', 'supplier', 'expType', 'amount', 'date'])
            setErrorsExp(errs)
            const isNotFilled = Object.values(errs).includes(true); //all filled

            if (isNotFilled) {
                setToast({ show: true, text: getTtl('Some fields are missing!', ln), clr: 'fail' })
                return;
            }


            let tmpValue = { ...valueExp, 'lstSaved': dateFormat(new Date(), "dd-mmm-yyyy, HH:MM") }
            delete tmpValue['poSupplierOrder']; //was added for table only
            let tmpArr = expensesData.map((k) => (k.id === valueExp.id ? tmpValue : k));
            setExpensesData(tmpArr)

            let success = await saveData(uidCollection, 'expenses', tmpValue)

            //Update Invoice
            const inv = await loadInvoice(uidCollection, 'invoices', valueExp.invData)

            let tmpArrExp = inv.expenses.map((k) => (k.id === valueExp.id ?
                {
                    ...k, expense: valueExp.expense, date: valueExp.dateRange.startDate, cur: valueExp.cur,
                    amount: valueExp.amount
                } : k));

            await saveData(uidCollection, 'invoices', { ...inv, expenses: tmpArrExp })

            //update expense in contract
            let tmpValExp = {
                id: valueExp.id, expense: valueExp.expense,
                date: valueExp.dateRange.startDate, amount: valueExp.amount,
                cur: valueExp.cur
            }
            const tmpExpArr = await loadInvoice(uidCollection, 'contracts', valueExp.poSupplier)
            let updatedExpArr = tmpExpArr.expenses.map(x => x.id === tmpValExp.id ? tmpValExp : x)
            await updateDocument(uidCollection, 'contracts', 'expenses', valueExp.poSupplier, updatedExpArr)

            if (dateYr !== valueExp.dateRange.startDate.substring(0, 4) && dateYr != null) {
                let dateTmp = { startDate: dateYr }
                let valueExpTmp = ({ id: valueExp.id, date: dateTmp })
                await delDoc(uidCollection, 'expenses', valueExpTmp)
            }

            setIsOpen(false)
            setValueExp(newExpense); //new Empty valueInv
            success && setToast({ show: true, text: getTtl('Expense successfully saved!', ln), clr: 'success' })
        },
        deleteExpenseFromExpPage: async (uidCollection) => {
            if (!valueExp?.id) return;

            const success = await delDoc(uidCollection, 'expenses', valueExp);
            if (!success) return;

            setExpensesData(prev => prev.filter(k => k.id !== valueExp.id));

            if (valueExp.invData?.id && valueExp.invData?.date) {
                try {
                    const inv = await loadInvoice(uidCollection, 'invoices', valueExp.invData);
                    if (inv?.id) {
                        const updatedExps = (inv.expenses || []).filter(e => e.id !== valueExp.id);
                        await saveData(uidCollection, 'invoices', { ...inv, expenses: updatedExps });
                    }
                } catch (e) {}
            }

            if (valueExp.poSupplier?.id && valueExp.poSupplier?.date) {
                try {
                    const contract = await loadInvoice(uidCollection, 'contracts', valueExp.poSupplier);
                    if (contract?.id) {
                        const updatedExps = (contract.expenses || []).filter(e => e.id !== valueExp.id);
                        await updateDocument(uidCollection, 'contracts', 'expenses', valueExp.poSupplier, updatedExps);
                    }
                } catch (e) {}
            }

            setValueExp(newExpense);
            setIsOpen(false);
            setToast({ show: true, text: getTtl('Expense successfully deleted!', ln), clr: 'success' });
        },
        saveData_CompanyExpenses: async (uidCollection) => {

            //validation
            let errs = validate(valueExp, ['expense', 'cur', 'supplier', 'expType', 'amount', 'date'])
            setErrorsExp(errs)
            const isNotFilled = Object.values(errs).includes(true); //all filled

            if (isNotFilled) {
                setToast({ show: true, text: getTtl('Some fields are missing!', ln), clr: 'fail' })
                return;
            }


            let tmpValue = {
                ...valueExp, 'lstSaved': dateFormat(new Date(), "dd-mmm-yyyy, HH:MM"),
                amount: valueExp.amount * 1,
            }

            let newObj = { ...tmpValue, id: tmpValue.id === '' ? uuidv4() : tmpValue.id }
            let tmpArr = []
            if (expensesData.findIndex(k => k.id === valueExp.id) !== -1) { //update
                tmpArr = expensesData.map((k) => (k.id === valueExp.id ? tmpValue : k));
            } else { //add
                tmpArr = [...expensesData, newObj]
            }

            setExpensesData(tmpArr)

            let success = await saveCompanyExpense(uidCollection, newObj)

            // If this expense was ever copied to Misc Invoices, refresh that copy so a
            // later edit (e.g. replacing a "draft …" placeholder with the real invoice
            // number) shows up there too instead of the stale snapshot.
            await syncMiscInvoiceIfExists(uidCollection, buildMiscFromExpense(newObj, settings))

            success && setToast({ show: true, text: getTtl('Expense successfully saved!', ln), clr: 'success' })
            setValueExp({
                id: '', lstSaved: '', supplier: '', dateRange: { startDate: null, endDate: null },
                cur: '', amount: '', date: '',
                expense: '', expType: '', paid: '', comments: ''

            }); //new Empty valueInv
            setIsOpen(false)
        },
        deleteCompExp: async (uidCollection) => {
            if (valueExp.id === '') return;

            setExpensesData(expensesData.filter((k) => k.id !== valueExp.id))
            let success = await delCompExp(uidCollection, 'companyExpenses', valueExp)

            setValueExp({
                id: '', lstSaved: '', supplier: '', dateRange: { startDate: null, endDate: null },
                cur: '', amount: '', date: '',
                expense: '', expType: '', paid: '', comments: ''
            });

            success && setToast({ show: true, text: getTtl('Expense successfully deleted!', ln), clr: 'success' })
            setIsOpen(false)
        },
        copyTomisc: async (uidCollection) => {
            if (valueExp.id === '') return;

            await speciaInvoices(uidCollection, [buildMiscFromExpense(valueExp, settings)])
            setToast({ show: true, text: 'Expense is successfully copied!', clr: 'success' })
        }
    }), [valueExp, expensesData, errorsExp, isOpen, settings, dateYr, ln, setToast]);
};


export default useSettingsState;
