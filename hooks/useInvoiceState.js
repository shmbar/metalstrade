'use client'
import { useState, useContext } from 'react';
import dateFormat from "dateformat";
import { v4 as uuidv4 } from 'uuid';
import { getD, setNewInvoiceNum, loadDataSettings, updatePnl, updateDocument, delField, loadInvoice } from '@utils/utils.js';
import { validate, saveData, delDoc, saveDataFinalCancel, saveStockIn, delStock } from '@utils/utils'
import { SettingsContext } from '@contexts/useSettingsContext'
import { getTtl } from '@utils/languages';



const newInvoice = {
    id: '', opDate: dateFormat(new Date(), "dd-mmm-yyyy, HH:MM"), lstSaved: '', invoice: '', date: '',
    dateRange: { startDate: null, endDate: null }, invoiceStatus: '', client: '', shpType: '', origin: '', delTerm: '',
    pol: '', pod: '', packing: '', delDate: { startDate: null, endDate: null }, cur: '', ttlGross: '',
    ttlPackages: '',
    productsDataInvoice: [],
    invType: '1111', totalAmount: '', percentage: '', totalPrepayment: '', bankNname: '',
    final: false, canceled: false, balanceDue: '', expenses: [], poSupplier: { id: '', order: '', date: '' }, remarks: [],
    hs1: '', hs2: '', payments: [], shipData: {
        rcvd: '', outrnamnt: '', fnlzing: '2587', status: '', etd: '', eta: '',
    }, comments: ''
}

const useInvoiceState = () => {

    const [valueInv, setValueInv] = useState();
    const [invoicesData, setInvoicesData] = useState([]);
    const [invoicesAccData, setInvoicesAccData] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [errors, setErrors] = useState({})
    const { setToast, dateYr, setDateYr, setLoading, ln } = useContext(SettingsContext);
    const [copyInvoice, setCopyInvoice] = useState(false)
    const [copyInvValue, setCopyInvValue] = useState()
    const [invNum, setInvNum] = useState('')
    const [isInvCreationCNFL, setIsInvCreationCNFL] = useState(false)
    const [deleteProdcuts, setDeleteProducts] = useState([])

    return {
        valueInv, setValueInv,
        invoicesData, setInvoicesData,
        isOpen, setIsOpen,
        errors, setErrors,
        copyInvoice, copyInvValue,
        invNum, setInvNum,
        isInvCreationCNFL, setIsInvCreationCNFL,
        setCopyInvValue, setCopyInvoice,
        deleteProdcuts, setDeleteProducts,
        invoicesAccData, setInvoicesAccData,
        blankInvoice: () => {
            setValueInv(newInvoice); //new Empty valueInv
            setErrors({})
        },
        delInvoice: async (uidCollection, valueCon, setValueCon, contractsData, setContractsData) => {

            let tmpInvRef = valueCon.poInvoices.map(z => z.invRef).flat().map(x => parseFloat(x))
            if (tmpInvRef.includes(valueInv.invoice)) {
                setToast({
                    show: true,
                    text: getTtl('This invoice is relayed to one of contract invoices!', ln), clr: 'fail'
                })
                return;
            }

            if (valueInv.expenses.length > 0) {
                setToast({
                    show: true,
                    text: getTtl('This invoice contains expenses; therefore, it cannot be deleted!', ln), clr: 'fail'
                })
                return;
            }

            if (valueInv.productsDataInvoice.length > 0) {
                setToast({
                    show: true,
                    text: getTtl('This invoice contains materials; therefore, it cannot be deleted!', ln), clr: 'fail'
                })
                return;
            }

            //Delete Stock
            if (deleteProdcuts.length > 0) delStock(uidCollection, deleteProdcuts)

            const tmpArr = valueCon.invoices.filter((k) => k.id !== valueInv.id);
            let val = { ...valueCon, invoices: tmpArr }
            setValueCon(val)
            await saveData(uidCollection, 'contracts', val)
            setContractsData(contractsData.map((k) => (k.id === val.id ? val : k)))

            //delete cn/fn field from the original if exist
            if (valueInv.invType !== '1111') {
                let originalInv = valueCon.invoices.find(x => x.invoice === valueInv.invoice &&
                    x.invType === "1111")
                await delField(uidCollection, 'invoices', 'cnORfl', originalInv)
            }

            setValueInv(newInvoice);
            let success = await delDoc(uidCollection, 'invoices', valueInv)
            success && setToast({ show: true, text: getTtl('Invoice successfully deleted!', ln), clr: 'success' })

        },
        saveData_InvoiceInContracts: async (valueCon, valueInv, setValueCon, contractsData,
            setContractsData, uidCollection, settings) => {


            //validation
            let errs = validate(valueInv, ['client', 'cur', 'shpType', 'date'])
            setErrors(errs)
            const isNotFilled = Object.values(errs).includes(true); //all filled

            if (isNotFilled) {
                setToast({ show: true, text: getTtl('Some fields are still empty!', ln), clr: 'fail' })
                return false;
            }

            let err = false;
            let arrfields = []

            valueInv.productsDataInvoice.forEach(obj => {
                if (obj.descriptionId === '') arrfields.push('Description')
                if (obj.qnty === '') arrfields.push('Quantity')
                if (obj.unitPrc === '') arrfields.push('Unit Price')
                if (obj.stock === '' && (obj.qnty !== "0" && obj.qnty !== 0)) arrfields.push('Stock')
            })

            arrfields = [...new Set(arrfields)]
            if (arrfields.length >= 1) err = true

            if (err) {
                setToast({ show: true, text: getTtl('The following fields in the materials table are empty:', ln) + ' ' + arrfields.map(x => ' ' + x), clr: 'fail' })
                return false;
            }

            const NetWTKgsTmp = (valueInv.productsDataInvoice.map(x => x.qnty)
                .reduce((accumulator, currentValue) => accumulator + currentValue * 1, 0) * 1000);
            const TotalTarre = (valueInv.ttlGross - NetWTKgsTmp);

            if ((TotalTarre < 0 && valueInv.invType === '1111' &&
                valueInv.packing !== 'P6' && valueInv.packing !== 'P7' && valueInv.packing !== 'P13')) {
                setToast({ show: true, text: getTtl('Total Tarre WT Kgs can not be negative!', ln), clr: 'fail' })
                return false;
            }


            //////////////////////////////////////////
            let indx = valueCon.invoices.findIndex((x) => x.id === valueInv.id); //new invoice or existing
            let valueInvObj = valueInv;
            let tmpObj = null;
            let tmpArr = null;

            if (indx !== -1) { //update
                let tmpArr = valueCon.invoices.map((k) => (k.id === valueInv.id ?
                    {
                        ...k, invoice: valueInv.invoice * 1, date: valueInv.dateRange.startDate,
                        invType: valueInv.invType
                    } : k));
                tmpObj = { ...valueCon, invoices: tmpArr }
                setValueCon(tmpObj)

                //in Case there is a change in a date of the final/credit invoice date - for accounting
                if (valueInv.invType !== '1111' && valueCon.invoices[indx].date !== valueInv.dateRange.startDate) {
                    //update the original invoice

                    let originalInv = valueCon.invoices.find(x => x.invoice * 1 === valueInv.invoice * 1 &&
                        x.invType === "1111")

                    let newFieldData = { id: valueInv.id, date: valueInv.dateRange.startDate }

                    await updateDocument(uidCollection, 'invoices', 'cnORfl', originalInv, newFieldData)
                }

            } else { //new Invoice
                valueInvObj = {
                    ...valueInv, id: uuidv4(), invoice: isInvCreationCNFL ? valueInv.invoice : invNum,
                    poSupplier: { id: valueCon.id, order: valueCon.order, date: valueCon.dateRange.startDate }
                }

              
                if (!isInvCreationCNFL) {
                    await setNewInvoiceNum(uidCollection)
                }

                if (isInvCreationCNFL) {
                    //update the original invoice

                    let originalInv = valueCon.invoices.find(x => x.invoice === valueInv.invoice &&
                        x.invType === "1111")

                    let newFieldData = { id: valueInvObj.id, date: valueInvObj.dateRange.startDate }

                    await updateDocument(uidCollection, 'invoices', 'cnORfl', originalInv, newFieldData)
                }

                setValueInv(valueInvObj);

                tmpArr = [...valueCon.invoices, {
                    id: valueInvObj.id, invoice: valueInvObj.invoice * 1,
                    date: valueInvObj.dateRange.startDate, invType: valueInvObj.invType,
                }]
                tmpObj = { ...valueCon, invoices: tmpArr }
                setValueCon(tmpObj)

            }
            //save to server valueCon
            await saveData(uidCollection, 'contracts', tmpObj)

            tmpArr = contractsData.map((k) => (k.id === tmpObj.id ? tmpObj : k));
            setContractsData(tmpArr)


            //save to the server
            let tmpValue = {
                ...valueInvObj, invoice: valueInvObj.invoice * 1, 'lstSaved': dateFormat(new Date(), "dd-mmm-yyyy, HH:MM")
            }
         
            let success = await saveData(uidCollection, 'invoices', tmpValue)

            //check if a date was changed
            if (dateYr !== tmpValue.dateRange.startDate.substring(0, 4) && dateYr != null) {
                let valueInvTmp = ({ id: tmpValue.id, date: dateYr })
                await delDoc(uidCollection, 'invoices', valueInvTmp)
            }



            //    setValueInv(newInvoice); //new Empty valueInv
            setIsInvCreationCNFL(false)

            //save Stock
            let tmpObj1 = tmpValue.productsDataInvoice.filter(z => z.qnty !== "0").map(x => ({
                ...x, invoice: tmpValue.invoice * 1, invType: tmpValue.invType,
                date: tmpValue.final ? tmpValue.date : tmpValue.dateRange.startDate,
                type: 'out', productsData: valueCon.productsData,
                client: tmpValue.final ? tmpValue.client.nname :
                    settings.Client.Client.find(z => z.id === tmpValue.client)['nname'],
                cur: valueCon.cur
            }))

            await saveStockIn(uidCollection, tmpObj1)
            if (deleteProdcuts.length > 0) delStock(uidCollection, deleteProdcuts)


            setDateYr(tmpValue.dateRange.startDate.substring(0, 4))

            //     setLoading(false)
            if (success) return true;

        },
        saveData_InvoiceInInvoices: async (uidCollection, settings) => {

            //validation
            let errs = validate(valueInv, ['client', 'cur', 'invoice', 'shpType', 'date'])
            setErrors(errs)
            const isNotFilled = Object.values(errs).includes(true); //all filled

            if (isNotFilled) {
                setToast({ show: true, text: getTtl('Some fields are missing!', ln), clr: 'fail' })
                return false;
            }

            let err = false;
            let arrfields = []

            valueInv.productsDataInvoice.forEach(obj => {
                if (obj.descriptionId === '') arrfields.push('Description')
                if (obj.qnty === '') arrfields.push('Quantity')
                if (obj.unitPrc === '') arrfields.push('Unit Price')
                if (obj.stock === '' && (obj.qnty !== "0" && obj.qnty !== 0)) arrfields.push('Stock')
            })

            arrfields = [...new Set(arrfields)]
            if (arrfields.length >= 1) err = true

            if (err) {
                setToast({ show: true, text: getTtl('The following fields in the materials table are empty:', ln) + ' ' + arrfields.map(x => ' ' + x), clr: 'fail' })
                return false;
            }

            const NetWTKgsTmp = (valueInv.productsDataInvoice.map(x => x.qnty)
                .reduce((accumulator, currentValue) => accumulator + currentValue * 1, 0) * 1000);
            const TotalTarre = (valueInv.ttlGross - NetWTKgsTmp);

            if (TotalTarre < 0 && valueInv.invType === '1111' &&
                valueInv.packing !== 'P6' && valueInv.packing !== 'P7' && valueInv.packing !== 'P13') {
                setToast({ show: true, text: getTtl('Total Tarre WT Kgs can not be negative!', ln), clr: 'fail' })
                return false;
            }

            const tmpValue = { ...valueInv, invoice: valueInv.invoice * 1, lstSaved: dateFormat(new Date(), "dd-mmm-yyyy, HH:MM") }
            const tmpArr = invoicesData.map((k) => (k.id === tmpValue.id ? tmpValue : k));
            setInvoicesData(tmpArr)

            //check if a date was changed
            if (dateYr !== tmpValue.dateRange.startDate.substring(0, 4) && dateYr != null) {
                let valueInvTmp = ({ id: tmpValue.id, date: dateYr })
                await delDoc(uidCollection, 'invoices', valueInvTmp)
                setDateYr(tmpValue.dateRange.startDate.substring(0, 4))

                //update valueCon.invoices
                let valCon = await loadInvoice(uidCollection, 'contracts', tmpValue.poSupplier)
                let tmpArr = valCon.invoices.map((k) => (k.id === tmpValue.id ?
                    {
                        ...k, date: tmpValue.dateRange.startDate, invoice: tmpValue.invoice * 1
                    } : k));
                let tmpObj = { ...valCon, invoices: tmpArr }
                await saveData(uidCollection, 'contracts', tmpObj)

                //in Case there is a change in a date of the final/credit invoice date - for accounting
                if (tmpValue.invType !== '1111') {
                    //update the original invoice

                    let newFieldData = { id: tmpValue.id, date: tmpValue.dateRange.startDate }
                    await updateDocument(uidCollection, 'invoices', 'cnORfl', tmpValue.originalInvoice, newFieldData)

                }
            }

            //save data again, to keep invoice integer and not string
            let valCon1 = await loadInvoice(uidCollection, 'contracts', tmpValue.poSupplier)
            let tmpArr1 = valCon1.invoices.map((k) => (k.id === tmpValue.id ?
                {
                    ...k, invoice: k.invoice * 1
                } : k));
            let tmpObj = { ...valCon1, invoices: tmpArr1 }
            await saveData(uidCollection, 'contracts', tmpObj)
            ///////////////////

            //save Stock
            let tmpObj1 = tmpValue.productsDataInvoice.filter(z => z.qnty !== "0").map(x => ({
                ...x, invoice: tmpValue.invoice * 1, invType: tmpValue.invType,
                date: tmpValue.final ? tmpValue.date : tmpValue.dateRange.startDate,
                type: 'out', productsData: tmpValue.productsData,
                client: tmpValue.final ? tmpValue.client.client :
                    settings.Client.Client.find(z => z.id === tmpValue.client)['client'],
                cur: tmpValue.cur
            }))

            await saveStockIn(uidCollection, tmpObj1)
            if (deleteProdcuts.length > 0) delStock(uidCollection, deleteProdcuts)

            let success = await saveData(uidCollection, 'invoices', tmpValue)

            if (success) return true;
        },
        /*
        finilizeInvoice: async (uidCollection, settings) => {
        
            const NetWTKgsTmp = (valueInv.productsDataInvoice.map(x => x.qnty)
                .reduce((accumulator, currentValue) => accumulator + currentValue * 1, 0) * 1000);
            const TotalTarre = (valueInv.ttlGross - NetWTKgsTmp);
        
            if ((TotalTarre < 0 && valueInv.invType === '1111' &&
                valueInv.packing !== 'P6' && valueInv.packing !== 'P7')) {
                setToast({ show: true, text: getTtl('Total Tarre WT Kgs can not be negative!', ln) , clr: 'fail' })
                return;
            }
        
            const tmpValue = { ...valueInv, final: true }
        
            const bnk = settings['Bank Account']['Bank Account'].find(z => z.id === tmpValue.bankNname);
            tmpValue['bankName'] = {
                bankName: bnk.bankName, swiftCode: bnk.swiftCode, bankNname: bnk.bankNname,
                iban: bnk.iban, corrBank: bnk.corrBank, corrBankSwift: bnk.corrBankSwift
            }
            const client = settings.Client.Client.find(z => z.id === tmpValue.client);
            tmpValue['client'] = {
                client: client.client, street: client.street,
                city: client.city, country: client.country, other1: client.other1,
                nname: client.nname
            }
            tmpValue['cur'] = {
                cur: getD(settings.Currency.Currency, tmpValue, 'cur'),
                sym: settings.Currency.Currency.find(x => x.id === tmpValue.cur)['symbol'],
                id: tmpValue.id
            }
            tmpValue['delTerm'] = getD(settings['Delivery Terms']['Delivery Terms'], tmpValue, 'delTerm')
            tmpValue['invType'] = getD(settings.InvTypes.InvTypes, tmpValue, 'invType')
            tmpValue['origin'] = getD(settings.Origin.Origin, tmpValue, 'origin')
            tmpValue['packing'] = getD(settings.Packing.Packing, tmpValue, 'packing')
            tmpValue['percentage'] = tmpValue.percentage === '' ? '' : tmpValue.percentage
            tmpValue['pod'] = getD(settings.POD.POD, tmpValue, 'pod')
            tmpValue['pol'] = getD(settings.POL.POL, tmpValue, 'pol')
            tmpValue['shpType'] = getD(settings.Shipment.Shipment, tmpValue, 'shpType')
            tmpValue['hs1'] = getD(settings.Hs.Hs.map(item => {
                const { hs, ...rest } = item;
                return { hs1: hs, ...rest };
            }), tmpValue, 'hs1')
            tmpValue['hs2'] = getD(settings.Hs.Hs.map(item => {
                const { hs, ...rest } = item;
                return { hs2: hs, ...rest };
            }), tmpValue, 'hs2')
        
            tmpValue['date'] = tmpValue['date'].startDate !== null ?
                dateFormat(tmpValue['date'].startDate, 'dd-mmm-yyyy') : '';
            tmpValue['delDate'] = tmpValue['delDate'].startDate !== null ?
                dateFormat(tmpValue['delDate'].startDate, 'dd-mmm-yyyy') : '';
        
            setValueInv(tmpValue);
            const tmpArr = invoicesData.map((k) => (k.id === tmpValue.id ? tmpValue : k));
            setInvoicesData(tmpArr)
        
            await saveDataFinalCancel(uidCollection, 'invoices', tmpValue)
        
        }, */
        /*cancelInvoice: async (uidCollection) => {
            const tmpValue = { ...valueInv, canceled: true }
        
            setValueInv(tmpValue)
            const tmpArr = invoicesData.map((k) => (k.id === tmpValue.id ? tmpValue : k));
            setInvoicesData(tmpArr)
        
            //save value to the server
            let success = await saveDataFinalCancel(uidCollection, 'invoices', tmpValue)
            success && setToast({ show: true, text: 'Invoice is canceled!', clr: 'success' })
        },*/
        copy_Invoice: async () => {
            setCopyInvoice(true)
            setCopyInvValue(valueInv)
        },
        paste_Invoice: async (uidCollection, valueCon, setValueCon, contractsData, setContractsData) => {

            let tempNum = await loadDataSettings(uidCollection, 'invoiceNum')

            let newValueInvObj = {
                ...copyInvValue, id: uuidv4(), invoice: tempNum.num + 1,
                lstSaved: dateFormat(new Date(), "dd-mmm-yyyy, HH:MM"), expenses: [],
                poSupplier: { id: valueCon.id, order: valueCon.order, date: valueCon.dateRange.startDate },
                productsDataInvoice: [], totalAmount: '', totalPrepayment: '', payments: [], percentage: ''
            }

            await setNewInvoiceNum(uidCollection)

            let tmpArr = [...valueCon.invoices, {
                id: newValueInvObj.id, invoice: newValueInvObj.invoice,
                date: newValueInvObj.dateRange.startDate, invType: newValueInvObj.invType
            }]
            let tmpObj = { ...valueCon, invoices: tmpArr }
            setValueCon(tmpObj)
            saveData(uidCollection, 'contracts', tmpObj)


            setContractsData(contractsData.map((k) => (k.id === tmpObj.id ? tmpObj : k)))

            setInvoicesData([...invoicesData, newValueInvObj])

            let success = await saveData(uidCollection, 'invoices', newValueInvObj)

            success && setToast({ show: true, text: getTtl('Invoice successfully copied!', ln), clr: 'success' })
            setCopyInvValue('')
            setCopyInvoice(false)
        },
        saveData_payments: async (uidCollection) => {

            let findEmpty = valueInv.payments.find(x => x.pmnt === '')
            if (findEmpty) {
                setToast({ show: true, text: getTtl('Please fill payments table correctly', ln), clr: 'fail' })
                return;
            }


            let success = await saveData(uidCollection, 'invoices', valueInv)

            success && setToast({ show: true, text: getTtl('Payments successfully saved!', ln), clr: 'success' })
        },
        saveData_shipPnl: async (uidCollection, shipData) => {
            let success = await updatePnl(uidCollection, 'invoices', 'shipData', shipData)

            success && setToast({ show: true, text: getTtl('Data successfully saved!', ln), clr: 'success' })
        }
    }
};


export default useInvoiceState;
