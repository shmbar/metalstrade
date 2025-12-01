'use client'
import { useState, useContext } from 'react';
import dateFormat from "dateformat";
import { v4 as uuidv4 } from 'uuid';
import {
    validate, saveData, delDoc, updatePoSupplierInv, updatePoSupplierExp,
    updateDocumentContract, saveStockIn, delStock,
    speciaInvoices,
} from '@utils/utils'
import { SettingsContext } from "@contexts/useSettingsContext";
import { getCur } from '@components/exchangeApi'
import { getTtl } from '@utils/languages';
//import { revalidatePath } from 'next/cache';

const newContract = {
    id: '', opDate: dateFormat(new Date(), "dd-mmm-yyyy, HH:MM"), lstSaved: '', order: '',
    dateRange: { startDate: null, endDate: null }, date: '', supplier: '',
    shpType: '', origin: '', delTerm: '', pol: '', pod: '', packing: '', contType: '',
    size: '', deltime: '', cur: '', qTypeTable: '', remarks: [], priceRemarks: [], invoices: [], expenses: [],
    productsData: [], termPmnt: '',
    conStatus: '', poInvoices: [], comments: '', stock: []
}

const useContractsState = (props) => {

    const [valueCon, setValueCon] = useState();
    const [contractsData, setContractsData] = useState([]);
    const [isOpenCon, setIsOpenCon] = useState(false);
    const [errors, setErrors] = useState({})
    const { setToast, setLastAction, dateYr, setLoading, ln } = useContext(SettingsContext);
    const [isButtonDisabled, setIsButtonDisabled] = useState(false);

    return {
        valueCon, setValueCon,
        contractsData, setContractsData,
        isOpenCon, setIsOpenCon,
        errors, setErrors,
        isButtonDisabled, setIsButtonDisabled,
        addContract: async () => {
            setValueCon(newContract);
            setIsOpenCon(true)
        },
        delContract: async (uidCollection) => {



            if (valueCon.invoices.length > 0) {
                setToast({
                    show: true,
                    text: getTtl('contractCantbeDeleted1', ln), clr: 'fail'
                })
                return;
            }

            if (valueCon.stock.length > 0) {
                setToast({
                    show: true,
                    text: getTtl('contractCantbeDeleted2', ln), clr: 'fail'
                })
                return;
            }

            if (valueCon.poInvoices.length > 0) {
                setToast({
                    show: true,
                    text: getTtl('contractCantbeDeleted3', ln), clr: 'fail'
                })
                return;
            }

            const tmpArr = contractsData.filter((k) => k.id !== valueCon.id);

            setContractsData(tmpArr)
            setIsOpenCon(false)
            let success = await delDoc(uidCollection, 'contracts', valueCon)
            success && setToast({ show: true, text: getTtl('Contract successfully deleted!', ln), clr: 'success' })

        },
        saveData: async (uidCollection) => {
            setLoading(true)
            let errs = validate(valueCon, ['supplier', 'cur', 'order', 'shpType', 'date'])
            setErrors(errs)
            const isNotFilled = Object.values(errs).includes(true); //all filled

            if (isNotFilled) {
                setToast({ show: true, text: getTtl('Some fields are missing!', ln), clr: 'fail' })
                setLoading(false)
                return false;
            }

            let indx = contractsData.findIndex((x) => x.id === valueCon.id); //new or existing
            let tmpValue = {}

            let tmpEuToUs = await getCur(valueCon.dateRange.startDate)


            if (indx !== -1) { //update
                tmpValue = {
                    ...valueCon, lstSaved: dateFormat(new Date(), "dd-mmm-yyyy, HH:MM"),
                    euroToUSD: tmpEuToUs
                }
                const tmpArr = contractsData.map((k) => (k.id === valueCon.id ? tmpValue : k));
                setContractsData(tmpArr)

                //update order number in invoices
                let invcs = valueCon.invoices;
                await updatePoSupplierInv(uidCollection, valueCon, invcs)

                let exps = valueCon.expenses;
                await updatePoSupplierExp(uidCollection, valueCon, exps)

                //check if a date was changed
                if (dateYr !== valueCon.dateRange.startDate.substring(0, 4) && dateYr != null) {
                    let dateTmp = { startDate: dateYr }
                    let valueConTmp = ({ id: valueCon.id, date: dateTmp })
                    await delDoc(uidCollection, 'contracts', valueConTmp)

                }

            } else { //new object
                tmpValue = {
                    ...valueCon, id: uuidv4(),
                    'lstSaved': dateFormat(new Date(), "dd-mmm-yyyy, HH:MM"), euroToUSD: tmpEuToUs
                }
                //     revalidatePath('/contracts')
                setContractsData([...contractsData, tmpValue])
            }

            setValueCon(tmpValue)

            let success = await saveData(uidCollection, 'contracts', tmpValue)

            //   setIsOpenCon(false)
            setLoading(false)
            if (success) return true;
        },
        duplicate: async (uidCollection) => {

            let newObj = {
                ...valueCon, invoices: [], id: '',
                lstSaved: dateFormat(new Date(), "dd-mmm-yyyy, HH:MM"), order: '',
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
        },
        saveData_PoInvoices: async (uidCollection, newValCon) => {

            setContractsData(contractsData.map((k) => (k.id === newValCon.id ? newValCon : k)))

            let success = await updateDocumentContract(uidCollection, 'contracts', 'poInvoices', newValCon, newValCon.poInvoices)
            success && setToast({ show: true, text: getTtl('Payments successfully saved!', ln), clr: 'success' })
        },
        saveData_stocks: async (uidCollection, data) => {
            if (data.length === 0 && valueCon.stock.length === 0) return;

            //check if item deleted
            let delItems = valueCon.stock.filter((item) => !data.map(x => x.id).includes(item));
            if (delItems.length > 0) {
                await delStock(uidCollection, delItems)
            }


            let tmpdata = data.map(x => ({
                ...x, supplier: valueCon.supplier, productsData: valueCon.productsData,
                order: valueCon.order, cur: valueCon.cur, poInvoices: valueCon.poInvoices,
                qTypeTable: valueCon.qTypeTable,
                contractData: { id: valueCon.id, date: valueCon.dateRange.startDate }, type: 'in',
            }))


            //    await saveStockIn(uidCollection, tmpdata.filter(z => z.qnty !== '0'))
            await saveStockIn(uidCollection, tmpdata)

            let tmp = { ...valueCon, stock: data.map(x => x.id) }
            setValueCon(tmp)
            setContractsData(contractsData.map((k) => (k.id === tmp.id ? tmp : k)))

            let success = await saveData(uidCollection, 'contracts', tmp)

            /////////////////////////////
            let newData = tmpdata.filter(q => q.spInv).map(z => {
                let aa = z.poInvoices.find(a => a.id === z.poInvoice);
                let bb = z.productsData.find(a => a.id === z.description);
                return (
                    {
                        compName: z.compName, date: z.indDate.startDate,
                        supplier: z.supplier, order: z.order,
                        invoice: aa?.inv, id: z.id,
                        salesInvoice: aa?.invRef[0] || '',
                        description: bb?.description,
                        cur:valueCon.cur,
                        qnty: z.qnty, unitPrc: z.unitPrc, total: z.total,
                        paidNotPaid: (aa?.pmnt * 1 / aa?.invValue * 1) > 0.95 ? 'Paid' : 'Not Paid',
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
    };
};


export default useContractsState;
