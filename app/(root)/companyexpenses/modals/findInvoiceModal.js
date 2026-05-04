import Modal from "@components/modal"
import { ContractsContext } from "@contexts/useContractsContext"
import { delCompExp, getInvoices, loadInvoice, saveData } from "@utils/utils"
import { useContext, useState } from "react"
import { CircleX, Search } from 'lucide-react';
import { SettingsContext } from "@contexts/useSettingsContext";
import { ExpensesContext } from "@contexts/useExpensesContext";

const FindInvoiceModal = ({ open, setOpen, uidCollection, value, setValue }) => {

    const [invoice, setInvoice] = useState('')
    const [year, setYear] = useState('')
    const [foundInvoice, setFoundInvoice] = useState(true)
    const { setToast, } = useContext(SettingsContext);
    const { expensesData, setExpensesData, setIsOpen } = useContext(ExpensesContext);

    const findInvoice = async () => {

        //Find Invoice
        let inv = await getInvoices(uidCollection, 'invoices', [{ arrInv: [Number(invoice)], yr: year }])
        inv = inv[0]
        if (inv == null) {
            setFoundInvoice(false)
            return;
        } else {
            setFoundInvoice(true)
        }

        //Find Contract
        let con = await loadInvoice(uidCollection, 'contracts', inv.poSupplier)

        //Prepare data for saving
        inv.expenses = [...inv.expenses, {
            amount: value.amount,
            cur: value.cur, date: value.date, expense: value.expense, id: value.id
        }]

        con.expenses = [...con.expenses, {
            amount: value.amount,
            cur: value.cur, date: value.date, expense: value.expense, id: value.id
        }]


        const date = value.date;
        const month = date.split("-")[1];

        let newExpInvoice = {
            ...value, invData: { date: inv.date, id: inv.id }, m: month,
            poSupplier: inv.poSupplier, salesInv: inv.invoice
        }

        await saveData(uidCollection, 'contracts', con)
        await saveData(uidCollection, 'invoices', inv)
        await saveData(uidCollection, 'expenses', newExpInvoice)

        //Delete Expense invoice
        await delCompExp(uidCollection, 'companyExpenses', value)


        setValue({
            id: '', lstSaved: '', supplier: '', dateRange: { startDate: null, endDate: null },
            cur: '', amount: '', date: '',
            expense: '', expType: '', paid: '', comments: ''
        });

        setToast({ show: true, text: 'Expense is successfully moved!', clr: 'success' })
        setOpen(false)
        setIsOpen(false)

        let newData = expensesData.filter(x => x.id !== newExpInvoice.id)
        setExpensesData(newData)
    }


    return (
        <Modal isOpen={open} setIsOpen={setOpen} title="Find Invoice" w="max-w-sm">
            <div className="flex flex-col gap-3 p-3">
                <div className="flex flex-col gap-1">
                    <p className="text-xs font-medium text-[var(--chathams-blue)]">Invoice Number:</p>
                    <input
                        className="input h-7 text-xs rounded-full border-[#b8ddf8] bg-white w-40"
                        value={invoice}
                        onChange={(e) => setInvoice(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && findInvoice()}
                    />
                </div>
                <div className="flex flex-col gap-1">
                    <p className="text-xs font-medium text-[var(--chathams-blue)]">Year:</p>
                    <input
                        className="input h-7 text-xs rounded-full border-[#b8ddf8] bg-white w-20"
                        value={year}
                        onChange={(e) => setYear(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && findInvoice()}
                    />
                </div>
                {!foundInvoice &&
                    <span className="text-xs text-red-600 pl-1">Invoice not found</span>
                }
                <div className="flex gap-2 pt-1">
                    <button
                        type="button"
                        className="blackButton py-1 text-xs"
                        onClick={findInvoice}
                    >
                        <Search size={14} className="" />     Find
                    </button>
                    <button
                        type="button"
                        className="whiteButton py-1 text-xs"
                        onClick={() => setOpen(false)}
                    >
                        <CircleX size={14} className="text-[var(--chathams-blue)]" />  Close
                    </button>
                </div>
            </div>
        </Modal>
    )
}


export default FindInvoiceModal;
