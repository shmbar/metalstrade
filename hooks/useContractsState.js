'use client'
import { useState, useContext } from 'react';
import dateFormat from "dateformat";
import { v4 as uuidv4 } from 'uuid';
import {
    validate, saveData, delDoc, updatePoSupplierInv, updatePoSupplierExp,
    updateDocumentContract, saveStockIn, delStock
} from '@utils/utils'
import { SettingsContext } from "@contexts/useSettingsContext";
import { getCur } from '@components/exchangeApi'

const newContract = {
    id: '', opDate: dateFormat(new Date(), "dd-mmm-yyyy, HH:MM"), lstSaved: '', order: '',
    date: { startDate: null, endDate: null }, supplier: '',
    shpType: '', origin: '', delTerm: '', pol: '', pod: '', packing: '', contType: '',
    size: '', deltime: '', cur: '', qTypeTable: '', remarks: [], priceRemarks: [], invoices: [], expenses: [],
    productsData: [], termPmnt: '',
    conStatus: '', poInvoices: [], comments: '', stock: []
}

const useContractsState = (props) => {

    const [valueCon, setValueCon] = useState();
    const [contractsData, setContractsData] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [errors, setErrors] = useState({})
    const { setToast, setLastAction, dateYr, setLoading, } = useContext(SettingsContext);

    return {
        valueCon, setValueCon,
        contractsData, setContractsData,
        isOpen, setIsOpen,
        errors, setErrors,
        addContract: async () => {
            setValueCon(newContract);
            setIsOpen(true)
        },
        delContract: async (uidCollection) => {



            if (valueCon.invoices.length > 0) {
                setToast({
                    show: true,
                    text: 'This contract contains customer invoices; therefore, it cannot be deleted!', clr: 'fail'
                })
                return;
            }

            if (valueCon.stock.length > 0) {
                setToast({
                    show: true,
                    text: 'This contract contains stocks; therefore, it cannot be deleted!', clr: 'fail'
                })
                return;
            }

            if (valueCon.poInvoices.length > 0) {
                setToast({
                    show: true,
                    text: 'This contract contains vendor invoices; therefore, it cannot be deleted!', clr: 'fail'
                })
                return;
            }

            const tmpArr = contractsData.filter((k) => k.id !== valueCon.id);
            setLastAction('-');
            setContractsData(tmpArr)
            setIsOpen(false)
            let success = await delDoc(uidCollection, 'contracts', valueCon)
            success && setToast({ show: true, text: 'Contract successfully deleted!', clr: 'success' })

        },
        saveData: async (uidCollection) => {
            setLoading(true)
            let errs = validate(valueCon, ['supplier', 'cur', 'order', 'shpType', 'date'])
            setErrors(errs)
            const isNotFilled = Object.values(errs).includes(true); //all filled

            if (isNotFilled) {
                setToast({ show: true, text: 'Some fields are missing!', clr: 'fail' })
                setLoading(false)
                return;
            }

            let indx = contractsData.findIndex((x) => x.id === valueCon.id); //new or existing
            let tmpValue = {}

            let tmpEuToUs = await getCur(valueCon.date.startDate)


            if (indx !== -1) { //update
                tmpValue = {
                    ...valueCon, lstSaved: dateFormat(new Date(), "dd-mmm-yyyy, HH:MM"),
                    euroToUSD: tmpEuToUs
                }
                const tmpArr = contractsData.map((k) => (k.id === valueCon.id ? tmpValue : k));
                setContractsData(tmpArr)
                setLastAction('=')

                //update order number in invoices
                let invcs = valueCon.invoices;
                await updatePoSupplierInv(uidCollection, valueCon, invcs)

                let exps = valueCon.expenses;
                await updatePoSupplierExp(uidCollection, valueCon, exps)

                //check is a date was changed
                if (dateYr !== valueCon.date.startDate.substring(0, 4)) {
                    let dateTmp = { startDate: dateYr }
                    let valueConTmp = ({ id: valueCon.id, date: dateTmp })
                    await delDoc(uidCollection, 'contracts', valueConTmp)
                }

            } else { //new object
                tmpValue = {
                    ...valueCon, id: uuidv4(),
                    'lstSaved': dateFormat(new Date(), "dd-mmm-yyyy, HH:MM"), euroToUSD: tmpEuToUs
                }
                setContractsData([...contractsData, tmpValue])
                setLastAction('+')
            }

            setValueCon(tmpValue)

            let success = await saveData(uidCollection, 'contracts', tmpValue)
            setIsOpen(false)
            success && setToast({ show: true, text: 'Contract successfully saved!', clr: 'success' })
            setLoading(false)
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
            setLastAction('=')

            let success = await updateDocumentContract(uidCollection, 'contracts', 'conStatus', valueCon, valueCon.conStatus)
            success && setToast({ show: true, text: 'Data successfully saved!', clr: 'success' })
        },
        saveData_payments: async (uidCollection) => {

            let findEmpty = valueCon.poInvoices.find(x => x.pmnt === '')
            if (findEmpty) {
                setToast({ show: true, text: 'Please fill payments table correctly', clr: 'fail' })
                return;
            }

            if (valueCon.id === '') {
                setToast({ show: true, text: 'Contract must be saved first!', clr: 'fail' })
                return;
            }

            setContractsData(contractsData.map((k) => (k.id === valueCon.id ? valueCon : k)))

            let success = await saveData(uidCollection, 'contracts', valueCon)
            setLastAction('=')
            success && setToast({ show: true, text: 'Payments successfully saved!', clr: 'success' })
        },
        saveData_PoInvoices: async (uidCollection, newValCon) => {

            setContractsData(contractsData.map((k) => (k.id === newValCon.id ? newValCon : k)))

            let success = await updateDocumentContract(uidCollection, 'contracts', 'poInvoices', newValCon, newValCon.poInvoices)
            setLastAction('=')
            success && setToast({ show: true, text: 'Payments successfully saved!', clr: 'success' })
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
                contractData: { id: valueCon.id, date: valueCon.date.startDate }, type: 'in',
            }))
            await saveStockIn(uidCollection, tmpdata)

            let tmp = { ...valueCon, stock: data.map(x => x.id) }
            setValueCon(tmp)
            setContractsData(contractsData.map((k) => (k.id === tmp.id ? tmp : k)))

            let success = await saveData(uidCollection, 'contracts', tmp)
            success && setToast({ show: true, text: 'Contract successfully saved!', clr: 'success' })

        },
        update_stock: async (uidCollection, objArr) => {

            let tmp = Array.isArray(objArr) ? objArr : [objArr]
            let success = await saveStockIn(uidCollection, tmp)
            success && setToast({ show: true, text: 'Stock successfully saved!', clr: 'success' })
        }
    };
};


export default useContractsState;
