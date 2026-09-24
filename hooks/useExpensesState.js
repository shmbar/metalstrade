'use client'
import { useState, useContext, useMemo, useRef } from 'react';
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

    /* One save at a time, with something on screen at every exit.
     *
     * The client (2026-09-18): "sometimes the system does not react, and it is not
     * clear whether the data was saved or not — press a second time and you get two
     * saved (same) invoices." Each save is three to five Firestore round trips with
     * nothing changing on screen until the last one, and a Firestore write on a poor
     * connection does not fail — it waits. Meanwhile the button stayed live, and a
     * new record was given a NEW id on every click, so the second click made a second
     * record. `savingRef` is the lock (state alone lags a click behind), `saving` is
     * what the buttons show, and a record's id is now minted once per form so a retry
     * after a failure writes the same document again instead of a twin. */
    const [saving, setSaving] = useState(false)
    const savingRef = useRef(false)
    const runSave = async (work) => {
        if (savingRef.current) return false;
        savingRef.current = true;
        setSaving(true);
        const slow = setTimeout(() => setToast({
            show: true, clr: 'fail',
            text: 'Still saving — slow connection. Please wait; do not press Save again.',
        }), 8000);
        try {
            await work();
            return true;
        } catch (e) {
            console.error('expense save failed', e);
            setToast({ show: true, clr: 'fail', text: 'The expense was NOT saved — check your connection and press Save again.' });
            return false;
        } finally {
            clearTimeout(slow);
            savingRef.current = false;
            setSaving(false);
        }
    };
    // A new record's id, fixed on the form the first time it is needed. Kept in a
    // private field rather than `id`: the dialogs read `id` as "this record exists"
    // (title, Delete / Copy / Move buttons), and a form mid-save is not that yet.
    // Stripped from what is written, and gone with the form when it is blanked.
    const settledId = () => {
        if (valueExp?.id) return valueExp.id;
        if (valueExp?._pendingId) return valueExp._pendingId;
        const id = uuidv4();
        setValueExp((v) => ({ ...(v || {}), _pendingId: id }));
        return id;
    };
    const stripPending = (obj) => { const o = { ...obj }; delete o._pendingId; return o; };

    // Memoized: identity changes only when exposed/captured state changes (see
    // useContractsState for the rationale). Closures read valueExp, expensesData,
    // settings, dateYr, ln — all deps below.
    return useMemo(() => ({
        valueExp, setValueExp,
        expensesData, setExpensesData,
        errorsExp, setErrorsExp,
        isOpen, setIsOpen,
        saving,
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

            const ok = await runSave(async () => {
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
                // The id is settled on the form, not minted here: a retry after a
                // failed attempt must write the same record, never a second one.
                valueExpObj = {
                    ...stripPending(valueExp), id: settledId(), salesInv: valueInv.invoice + getprefixInv(valueInv),
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

            await saveData(uidCollection, 'expenses', tmpObj)
            });
            if (!ok) return; // the form keeps its values (and its id) for another try

            setValueExp(newExpense); //new Empty valueInv
            setToast({ show: true, text: getTtl('Expense successfully saved!', ln), clr: 'success' })
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


            let tmpValue = { ...stripPending(valueExp), 'lstSaved': dateFormat(new Date(), "dd-mmm-yyyy, HH:MM") }
            delete tmpValue['poSupplierOrder']; //was added for table only
            let tmpArr = expensesData.map((k) => (k.id === valueExp.id ? tmpValue : k));

            const ok = await runSave(async () => {
            await saveData(uidCollection, 'expenses', tmpValue)

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
            });
            if (!ok) return;

            // The table follows the save, not the click: a row that read as updated
            // while the write had failed was the "not clear whether it was saved".
            setExpensesData(tmpArr)
            setIsOpen(false)
            setValueExp(newExpense); //new Empty valueInv
            setToast({ show: true, text: getTtl('Expense successfully saved!', ln), clr: 'success' })
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

            // Settled on the form once, so a second attempt updates rather than adds.
            let newObj = { ...stripPending(tmpValue), id: settledId() }
            let tmpArr = []
            if (expensesData.findIndex(k => k.id === newObj.id) !== -1) { //update
                tmpArr = expensesData.map((k) => (k.id === newObj.id ? newObj : k));
            } else { //add
                tmpArr = [...expensesData, newObj]
            }

            const ok = await runSave(async () => {
                if (!(await saveCompanyExpense(uidCollection, newObj))) throw new Error('saveCompanyExpense failed');

                // If this expense was ever copied to Misc Invoices, refresh that copy so a
                // later edit (e.g. replacing a "draft …" placeholder with the real invoice
                // number) shows up there too instead of the stale snapshot.
                await syncMiscInvoiceIfExists(uidCollection, buildMiscFromExpense(newObj, settings))
            });
            if (!ok) return;

            setExpensesData(tmpArr)
            setToast({ show: true, text: getTtl('Expense successfully saved!', ln), clr: 'success' })
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
        /* The storage folder this expense's files belong in: its id — and for an expense
           not saved yet, the id it WILL be saved under (settled on the form now; both
           saves that create an expense write exactly this id). Files dropped on a new
           expense used to go to one shared "generalExpenses" folder, or — through
           "Autofill from PDF" — nowhere at all, so an invoice loaded while entering an
           expense was never attached to it (2026-09-24). */
        expenseFolderId: () => settledId(),
        copyTomisc: async (uidCollection) => {
            if (valueExp.id === '') return;

            await speciaInvoices(uidCollection, [buildMiscFromExpense(valueExp, settings)])
            setToast({ show: true, text: 'Expense is successfully copied!', clr: 'success' })
        }
    // runSave/settledId close over setters and refs only; listing them would rebuild
    // the memo every render for nothing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }), [valueExp, expensesData, errorsExp, isOpen, saving, settings, dateYr, ln, setToast]);
};


export default useSettingsState;
