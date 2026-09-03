'use client'
import { useState, useContext, useMemo } from 'react';
import dateFormat from "dateformat";
import { v4 as uuidv4 } from 'uuid';
import {
    validate, saveData, delDoc, updatePoSupplierInv, updatePoSupplierExp,
    updateDocumentContract, saveStockIn, delStock,
    speciaInvoices,
    syncSpecialInvoicesPaidStatus,
    loadStockData,
    updateStockProductsData,
} from '@utils/utils'
import { deleteContractCascade } from '@utils/contractCascade'
import { SettingsContext } from "@contexts/useSettingsContext";
import { getCur } from '@components/exchangeApi'
import { getTtl } from '@utils/languages';
//import { revalidatePath } from 'next/cache';

const buildAutoOrder = (contractsData, supplierName) => {
    const now = new Date();
    const datePart = dateFormat(now, 'ddmmyy');
    const usedNumbers = contractsData
        .map(c => c.order ?? '')
        .filter(o => o.startsWith(datePart + '-'))
        .map(o => parseInt(o.split('-')[1]))
        .filter(n => !isNaN(n));
    const nextN = usedNumbers.length > 0 ? Math.max(...usedNumbers) + 1 : 1;
    const supCode = supplierName ? supplierName.substring(0, 3).toUpperCase() : '';
    return `${datePart}-${nextN}-${supCode}`;
};

const newContract = {
    id: '', opDate: dateFormat(new Date(), "dd-mmm-yyyy, HH:MM"), lstSaved: '', order: '',
    dateRange: { startDate: null, endDate: null }, date: '', supplier: '',
    shpType: '', origin: '', delTerm: '', pol: '', pod: '', packing: '', contType: '',
    size: '', deltime: '', cur: '', qTypeTable: '', remarks: [], priceRemarks: [], invoices: [], expenses: [],
    productsData: [], termPmnt: '', priceMode: 'unit',
    conStatus: '', poInvoices: [], comments: '', stock: []
}

const useContractsState = (props) => {

    const [valueCon, setValueCon] = useState();
    const [contractsData, setContractsData] = useState([]);
    const [isOpenCon, setIsOpenCon] = useState(false);
    const [errors, setErrors] = useState({})
    const { setToast, setLastAction, dateYr, setLoading, ln, settings } = useContext(SettingsContext);
    const [isButtonDisabled, setIsButtonDisabled] = useState(false);
    /* Deep link into one INVOICE of the contract about to open. Shipment Tracking lists
       every invoice under a PO, and clicking one used to open the contract on its first
       tab with whichever invoice happened to be loaded — so picking the second shipment
       still landed you on the first. The Invoices tab consumes this once and clears it. */
    const [openInvoiceId, setOpenInvoiceId] = useState(null);

    // Memoized so the context value only changes when state this object exposes (or
    // its closures read) actually changes — unrelated Settings churn (toast, loading)
    // no longer re-renders every consumer. Every value the closures capture MUST be a
    // dep, or saves would write stale data.
    return useMemo(() => ({
        valueCon, setValueCon,
        contractsData, setContractsData,
        isOpenCon, setIsOpenCon,
        errors, setErrors,
        isButtonDisabled, setIsButtonDisabled,
        openInvoiceId, setOpenInvoiceId,
        addContract: async () => {
            setValueCon({ ...newContract, order: buildAutoOrder(contractsData, null) });
            setIsOpenCon(true)
        },
        // Deletes the contract AND everything it holds — sales invoices, expense
        // invoices, stock lots, and the purchase invoices stored inside it. This
        // used to refuse whenever any of those existed, which meant emptying a
        // contract by hand before it could go. The confirmation dialog now names
        // exactly what is about to be removed, so the safety lives where the user
        // can act on it instead of in three dead ends.
        delContract: async (uidCollection) => {

            // try/finally, always: a throw from the delete (a rejected batch —
            // offline, or rules refusing a write) left the global spinner running
            // forever with no way back, which is exactly what a caught error should
            // never look like.
            let ok, plan, skipped, notOurs
            setLoading(true)
            try {
                ({ ok, plan, skipped, notOurs = [] } = await deleteContractCascade(uidCollection, valueCon))
            } catch (error) {
                console.error(error)
                setToast({
                    show: true, clr: 'fail',
                    text: `Contract could not be deleted: ${error?.message || error}. Nothing was removed.`,
                })
                return;
            } finally {
                setLoading(false)
            }

            if (!ok) {
                setToast({
                    show: true, clr: 'fail',
                    text: `Contract could not be deleted${skipped.length ? ` (${skipped.join(', ')})` : ''} — nothing was removed`,
                })
                return;
            }

            setContractsData(contractsData.filter((k) => k.id !== valueCon.id))
            setIsOpenCon(false)

            // Say what went, and never claim a clean sweep when something was left
            // behind — a silent partial delete is how orphans go unnoticed.
            const parts = [
                plan.invoices.length && `${plan.invoices.length} sales invoice${plan.invoices.length > 1 ? 's' : ''}`,
                plan.expenses.length && `${plan.expenses.length} expense${plan.expenses.length > 1 ? 's' : ''}`,
                plan.poInvoices.length && `${plan.poInvoices.length} purchase invoice${plan.poInvoices.length > 1 ? 's' : ''}`,
                plan.stockIds.length && `${plan.stockIds.length} stock lot${plan.stockIds.length > 1 ? 's' : ''}`,
            ].filter(Boolean)

            // A record kept because it belongs to ANOTHER contract is good news, not a
            // failure — but it must be said out loud, or a duplicated contract looks
            // like it deleted more than it did.
            const kept = notOurs.length
                ? ` Kept ${notOurs.join(', ')} — ${notOurs.length > 1 ? 'they belong' : 'it belongs'} to another contract.`
                : ''

            setToast({
                show: true,
                clr: skipped.length ? 'fail' : 'success',
                text: skipped.length
                    ? `Contract deleted, but these could not be removed: ${skipped.join(', ')}.${kept}`
                    : `Contract deleted${parts.length ? `, with ${parts.join(', ')}` : ''}.${kept}`,
            })

        },
        saveData: async (uidCollection, gisAccount) => {
            setLoading(true)
            let errs = validate(valueCon, ['supplier', 'cur', 'order', 'shpType', 'date'])
            setErrors(errs)
            const isNotFilled = Object.values(errs).includes(true); //all filled

            if (isNotFilled) {
                setToast({ show: true, text: getTtl('Some fields are missing!', ln), clr: 'fail' })
                setLoading(false)
                return false;
            }

            let indx = contractsData.findIndex((x) => x.id === valueCon.id);
            // New vs existing is decided by the record's OWN id — a blank id is the
            // only thing that means "new" (see newContract above). It must NOT be
            // decided by membership of contractsData: that list is filled in only by
            // the pages that LIST contracts, so opening this same modal from Cashflow
            // (clicking a PO#) leaves it empty, and every existing contract saved from
            // there took the "new object" branch below and was written under a fresh
            // uuid. The result was a second document carrying the same PO number and
            // the same purchase invoices, diverging from the original with each edit —
            // which is how one invoice came to sit on two rows of the supplier balances.
            const isExisting = !!valueCon.id;
            let tmpValue = {}

            // getCur returns null when the currency API is unreachable. Keep the
            // rate the contract already carries rather than stamping a blank (or,
            // as it used to, a fabricated 1) over a real one.
            let tmpEuToUs = (await getCur(valueCon.dateRange.startDate)) ?? valueCon.euroToUSD ?? null


            if (isExisting) { //update
                tmpValue = {
                    ...valueCon, lstSaved: dateFormat(new Date(), "dd-mmm-yyyy, HH:MM"),
                    euroToUSD: tmpEuToUs
                }
                // Only the listing pages hold a list to keep in sync; from Cashflow
                // there is none, and appending would fake a row the page never loaded.
                if (indx !== -1) {
                    setContractsData(contractsData.map((k) => (k.id === valueCon.id ? tmpValue : k)))
                }

                //update order number in invoices
                let invcs = valueCon.invoices;
                await updatePoSupplierInv(uidCollection, valueCon, invcs)

                let exps = valueCon.expenses;
                await updatePoSupplierExp(uidCollection, valueCon, exps)

                // Date moved to another year → the document is written into that
                // year's collection, so the copy in the old year's collection has to
                // go or the contract exists twice. Compare against the year this
                // record was LOADED with (dateYr is merely the year being viewed, so
                // it said "unchanged" for exactly the edits that moved a contract into
                // the viewed year), and pass the year as the string delDoc parses —
                // it was being handed an object, so the delete threw and silently
                // never ran.
                const prevYear = contractsData[indx]?.dateRange?.startDate?.substring(0, 4) || dateYr;
                const newYear = valueCon.dateRange.startDate.substring(0, 4);
                if (prevYear && newYear && prevYear !== newYear) {
                    await delDoc(uidCollection, 'contracts', { id: valueCon.id, date: prevYear })
                }

            } else { //new object
                tmpValue = {
                    ...valueCon, id: uuidv4(),
                    'lstSaved': dateFormat(new Date(), "dd-mmm-yyyy, HH:MM"), euroToUSD: tmpEuToUs
                }
                //     revalidatePath('/contracts')
                setContractsData([...contractsData, tmpValue])

                //  //Check if supplier is IMS or GIS
                //  if(tmpValue.supplier==='f891ad09-aa67-4ba4-83f0-abe7040e0dd2' && !gisAccount){
                //     let gisCon = {...tmpValue, id: uuidv4(), poInvoices: []} //Who is supplier here?
                  
                //  }
              
            }

            setValueCon(tmpValue)

            let success = await saveData(uidCollection, 'contracts', tmpValue)

            // Keep the stock docs' denormalized materials list in sync, so editing a material
            // description here also updates what the stock/warehouse view shows for this contract.
            if (success) {
                await updateStockProductsData(uidCollection, tmpValue.stock, tmpValue.productsData)
            }

            //   setIsOpenCon(false)
            setLoading(false)
            if (success) return true;
        },
        duplicate: async (uidCollection) => {
            const sups = settings?.Supplier?.Supplier ?? [];
            const supplierObj = valueCon.supplier && sups.find(z => z.id === valueCon.supplier);
            let newObj = {
                ...valueCon, invoices: [], id: '',
                lstSaved: dateFormat(new Date(), "dd-mmm-yyyy, HH:MM"),
                order: buildAutoOrder(contractsData, supplierObj?.supplier ?? null),
                poInvoices: [], stock: [], expenses: [],
                productsData: valueCon.productsData.map(x => ({ ...x, id: uuidv4() }))
            }

            setValueCon(newObj)
            //    setContractsData([...contractsData, newObj])
            //   setLastAction('+')
            //    let success = await saveData(uidCollection, 'contracts', newObj)
            //    success && setToast({ show: true, text: 'Contract successfully duplicated!', clr: 'success' })
        },
        saveContractStatus: async (uidCollection) => {

            setContractsData(contractsData.map((k) => (k.id === valueCon.id ? valueCon : k)))

            let success = await updateDocumentContract(uidCollection, 'contracts', 'conStatus', valueCon, valueCon.conStatus)
            success && setToast({ show: true, text: getTtl('Data successfully saved!', ln), clr: 'success' })
        },
        saveData_payments: async (uidCollection) => {

            let findEmpty = valueCon.poInvoices.find(x => x.pmnt === '')
            if (findEmpty) {
                setToast({ show: true, text: getTtl('Please fill payments table correctly', ln), clr: 'fail' })
                return;
            }

            if (valueCon.id === '') {
                setToast({ show: true, text: getTtl('Contract must be saved first!', ln), clr: 'fail' })
                return;
            }

            setContractsData(contractsData.map((k) => (k.id === valueCon.id ? valueCon : k)))

            let success = await saveData(uidCollection, 'contracts', valueCon)
            success && setToast({ show: true, text: getTtl('Payments successfully saved!', ln), clr: 'success' })

            let stockData = valueCon.stock.length > 0 ? await loadStockData(uidCollection, 'id', valueCon.stock) : []
            if (stockData.length > 0) {
                let tmpdata = stockData.map(x => ({
                    ...x, poInvoices: valueCon.poInvoices
                }))

                await saveStockIn(uidCollection, tmpdata)
            }

            await syncSpecialInvoicesPaidStatus(uidCollection, valueCon)

        },
        saveData_PoInvoices: async (uidCollection, newValCon) => {

            setContractsData(contractsData.map((k) => (k.id === newValCon.id ? newValCon : k)))

            let success = await updateDocumentContract(uidCollection, 'contracts', 'poInvoices', newValCon, newValCon.poInvoices)
            success && setToast({ show: true, text: getTtl('Payments successfully saved!', ln), clr: 'success' })
        },
        saveData_stocks: async (uidCollection, data, poInvoicesOverride = null) => {
            if (data.length === 0 && valueCon.stock.length === 0) return;

            // A confirmed final settlement passes recomputed supplier-invoice values
            // (poInvoicesOverride); for any other save the contract's existing ones are kept.
            const finalPoInvoices = poInvoicesOverride ?? valueCon.poInvoices;

            // DMT-style ALL-CAPS material names: soften invoice-imported product names
            // (4+ capitals → Title Case; alloy codes like IN/SS/NIM and chemistry keep
            // their casing) on every breakdown save, so legacy imports self-correct with
            // a single Save — no re-import needed. Idempotent; PO's own lines untouched.
            const softenCaps = (s) => String(s || '').replace(/\b[A-Z]{4,}\b/g, w => w[0] + w.slice(1).toLowerCase());
            const productsData = (valueCon.productsData || []).map(p =>
                p.import ? { ...p, description: softenCaps(p.description) } : p);

            //check if item deleted
            let delItems = valueCon.stock.filter((item) => !data.map(x => x.id).includes(item));
            if (delItems.length > 0) {
                await delStock(uidCollection, delItems)
            }


            let tmpdata = data.map(x => ({
                ...x, supplier: valueCon.supplier, productsData,
                order: valueCon.order, cur: valueCon.cur, poInvoices: finalPoInvoices,
                qTypeTable: valueCon.qTypeTable,
                contractData: { id: valueCon.id, date: valueCon.dateRange.startDate }, type: 'in',
                originSupplier: valueCon.originSupplier || null
            }))


            //    await saveStockIn(uidCollection, tmpdata.filter(z => z.qnty !== '0'))
            await saveStockIn(uidCollection, tmpdata)

            let tmp = { ...valueCon, productsData, stock: data.map(x => x.id), poInvoices: finalPoInvoices }
            setValueCon(tmp)
            setContractsData(contractsData.map((k) => (k.id === tmp.id ? tmp : k)))

            let success = await saveData(uidCollection, 'contracts', tmp)


             ///////////////Special Invoices//////////////
            let newData = tmpdata.filter(q => q.spInv).map(z => {
                let aa = z.poInvoices.find(a => a.id === z.poInvoice);
                let bb = z.productsData.find(a => a.id === z.description);
                return (
                    {
                        compName: z.compName, date: z.indDate?.startDate ?? null,
                        supplier: z.supplier, order: z.order,
                        invoice: aa?.inv, id: z.id,
                        salesInvoice: aa?.invRef[0] || '',
                        description: bb?.description,
                        cur: valueCon.cur,
                        qnty: z.qnty, unitPrc: z.unitPrc, total: z.total,
                        paidNotPaid: (aa?.pmnt * 1 / aa?.invValue * 1) > 0.95 ? 'Paid' : 'Not Paid',
                          originSupplier: valueCon.originSupplier
                    })
            })
            await speciaInvoices(uidCollection, newData)

            ///////////////////

            success && setToast({ show: true, text: getTtl('Contract successfully saved!', ln), clr: 'success' })

        },
        update_stock: async (uidCollection, objArr) => {

            let tmp = Array.isArray(objArr) ? objArr : [objArr]
            let success = await saveStockIn(uidCollection, tmp)
            success && setToast({ show: true, text: getTtl('Stock successfully saved!', ln), clr: 'success' })
        }
    }), [valueCon, contractsData, isOpenCon, errors, isButtonDisabled, openInvoiceId,
        settings, dateYr, ln, setToast, setLoading]);
};


export default useContractsState;
