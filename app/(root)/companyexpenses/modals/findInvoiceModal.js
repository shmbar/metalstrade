import Modal from "@components/modal"
import { ContractsContext } from "@contexts/useContractsContext"
import { delCompExp, getInvoices, loadInvoice, saveData } from "@utils/utils"
import { useContext, useState } from "react"
import { SettingsContext } from "@contexts/useSettingsContext";
import { ExpensesContext } from "@contexts/useExpensesContext";
import { BtnIcon } from '@components/buttonIcons';

const FindInvoiceModal = ({ open, setOpen, uidCollection, value, setValue }) => {

    const [invoice, setInvoice] = useState('')
    const [year, setYear] = useState('')
    const [foundInvoice, setFoundInvoice] = useState(true)
    const [busy, setBusy] = useState(false)
    const { setToast, } = useContext(SettingsContext);
    const { expensesData, setExpensesData, setIsOpen } = useContext(ExpensesContext);

    const findInvoice = async () => {
        // Enter in either box and the Find button all start a move; one at a time.
        if (busy) return;
        // Only a saved expense can move. A blank one was written onto invoice 1447 and
        // PO 050626 as an entry with no id, and that PO could no longer be saved.
        if (!value?.id || !value?.date) {
            setToast({ show: true, text: 'Save the expense first, then move it to a shipment.', clr: 'fail' })
            return;
        }
        setBusy(true)
        try {

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
            if (!con?.id) {
                setToast({ show: true, text: `Invoice ${invoice} has no PO to move this expense onto.`, clr: 'fail' })
                return;
            }

            //Prepare data for saving — listed once, however many times the move is run
            const ref = {
                amount: value.amount,
                cur: value.cur, date: value.date, expense: value.expense, id: value.id, expType: value.expType
            }
            inv.expenses = [...(inv.expenses || []).filter(e => e?.id !== value.id), ref]

            con.expenses = [...(con.expenses || []).filter(e => e?.id !== value.id), ref]


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

        } catch (err) {
            console.error('Move to shipment failed:', err)
            setToast({ show: true, text: `The expense was not moved: ${err?.message || err}`, clr: 'fail' })
        } finally {
            setBusy(false)
        }
    }


    return (
        <Modal isOpen={open} setIsOpen={setOpen} title="Find Invoice" size="sm">
            <div className="flex flex-col gap-3 p-3">
                <div className="flex flex-col gap-1">
                    <p className="responsiveTextInput font-medium text-[var(--chathams-blue)]">Invoice Number</p>
                    <input
                        className="input responsiveTextInput border-[var(--line)] bg-[var(--bg-card)] w-40"
                        value={invoice}
                        onChange={(e) => setInvoice(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && findInvoice()}
                    />
                </div>
                <div className="flex flex-col gap-1">
                    <p className="responsiveTextInput font-medium text-[var(--chathams-blue)]">Year</p>
                    <input
                        className="input responsiveTextInput border-[var(--line)] bg-[var(--bg-card)] w-20"
                        value={year}
                        onChange={(e) => setYear(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && findInvoice()}
                    />
                </div>
                {!foundInvoice &&
                    <span className="responsiveTextInput text-red-600 pl-1">Invoice not found</span>
                }
                <div className="flex gap-2 pt-1">
                    <button
                        type="button"
                        className="blackButton py-1 responsiveTextInput"
                        onClick={findInvoice}
                    >
                        <BtnIcon action="find" />     Find
                    </button>
                    <button
                        type="button"
                        className="whiteButton py-1 responsiveTextInput"
                        onClick={() => setOpen(false)}
                    >
                        <BtnIcon action="close" />  Close
                    </button>
                </div>
            </div>
        </Modal>
    )
}


export default FindInvoiceModal;
