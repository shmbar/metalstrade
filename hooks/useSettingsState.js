'use client'
import { useState } from 'react';
/*import {
    suppliers, shipmentType, origin, deliveryTerms, polList, podList,
    packingList, contrainerTypeList, sizeList, delTimeList, currency, quantityTable,
    termsOfPayment, clients, bankAccounts, invTypes, expenses, hs, remarks, stocks
} from '@components/const'; */
import { saveDataSettings } from '@utils/utils';
import { getTtl } from '@utils/languages';
import dateFormat from 'dateformat';

/*
//will be taken from the server
const arrFromServer = {
    Client: { Client: clients, ttl: 'Clients', name: 'client' },
    Supplier: { Supplier: suppliers, ttl: 'Suppliers', name: 'supplier' },
    Shipment: { Shipment: shipmentType, ttl: 'Shipment', name: 'shpType' },
    Origin: { Origin: origin, ttl: 'Origin', name: 'origin' },
    'Delivery Terms': { 'Delivery Terms': deliveryTerms, ttl: 'Delivery Terms', name: 'delTerm' },
    POL: { POL: polList, ttl: 'POL', name: 'pol' },
    POD: { POD: podList, ttl: 'POD', name: 'pod' },
    Packing: { Packing: packingList, ttl: 'Packing', name: 'packing' },
    'Container Type': { 'Container Type': contrainerTypeList, ttl: 'Packing', name: 'contType' },
    Size: { Size: sizeList, ttl: 'Size', name: 'size' },
    'Delivery Time': { 'Delivery Time': delTimeList, ttl: 'Delivery Time', name: 'deltime' },
    Currency: { Currency: currency, ttl: 'Currency', name: 'cur' },
    Quantity: { Quantity: quantityTable, ttl: 'Quantity', name: 'qTypeTable' },
    'Payment Terms': { 'Payment Terms': termsOfPayment, ttl: 'Payment Terms', name: 'termPmnt' },
    'Bank Account': { 'Bank Account': bankAccounts, ttl: 'Bank Account', name: 'bankName' },
    'InvTypes': { InvTypes: invTypes, ttl: null, name: 'invType' },
    Expenses: { 'Expenses': expenses, ttl: 'Expenses', name: 'expType' },
    ExpPmnt: { ExpPmnt: [{ id: '111', paid: 'Paid' }, { id: '222', paid: 'Unpaid' }], ttl: null, name: null },
    Hs: { 'Hs': hs, ttl: 'HS Code', name: 'hs' },
    Remarks: { 'Remarks': remarks, ttl: 'Remarks', name: 'rmrk' },
    Stocks: { 'Stocks': stocks, ttl: 'null', name: 'stock' },
}


//will be taken from the server
const companyData = {
    name: 'IMS Stainless and Alloys OU', street: 'Narva Mnt 13a', city: 'Tallinn', country: 'Estonia',
    zip: '10151', reg: '14976408', vat: 'EE102320620', eori: 'EE14976408', lng: 'English',
    email: 'sbashan@ims-stainless.com', website: 'www.ims-stainless.com', phone: '3124342', mobile: '23443223'
} 
*/


let fstDay = new Date();
fstDay.setMonth(fstDay.getMonth() - 3);
fstDay.setDate(1);
fstDay = dateFormat(fstDay, 'yyyy-mm-dd')

let lstDay = new Date();
lstDay.setMonth(lstDay.getMonth() + 1);
lstDay.setDate(0);
lstDay = dateFormat(lstDay, 'yyyy-mm-dd')

const useSettingsState = (props) => {

    const [settings, setSettings] = useState({});
    const [compData, setCompData] = useState({});
    const [loading, setLoading] = useState(false);
    // const [dateSelect, setDateSelect] = useState({ month: [(date11.getMonth() + 1).toString().padStart(2, '0')], year: date11.getFullYear() })
    const [dateSelect, setDateSelect] = useState({ start: fstDay, end: lstDay })
    const [toast, setToast] = useState({ show: false, text: '', clr: '' })
    const [dateYr, setDateYr] = useState(null);
    //setDateSelect({ month: [(date11.getMonth() + 1).toString().padStart(2, '0')], year: date11.getFullYear() })

    return {
        settings,
        setSettings,
        compData,
        setCompData,
        dateSelect,
        setDateSelect,
        toast, setToast,
        loading, setLoading,
        dateYr, setDateYr,
        ln: compData.lng,
        updateSettings: async (uidCollection, obj, keyName, updateServer) => {
            const newSettings = { ...settings, [keyName]: obj }
            setSettings(newSettings)
            let tmpSet = updateServer && await saveDataSettings(uidCollection, 'settings', newSettings);
            tmpSet && setToast({ show: true, text: getTtl('Data successfully saved!', compData.lng), clr: 'success' })
        },
        updateCompanyData: async (uidCollection) => {
            console.log('Update company data')
            let tmpSet = await saveDataSettings(uidCollection, 'cmpnyData', compData);
            tmpSet && setToast({ show: true, text: getTtl('Company data successfully saved!', compData.lng), clr: 'success' })
        },
        setDates: async () => {
            let fstDay = new Date();
            fstDay.setMonth(fstDay.getMonth() - 3);
            fstDay.setDate(1);
            fstDay = dateFormat(fstDay, 'yyyy-mm-dd')

            let lstDay = new Date();
            lstDay.setMonth(lstDay.getMonth() + 1);
            lstDay.setDate(0);
            lstDay = dateFormat(lstDay, 'yyyy-mm-dd')

            setDateSelect({ start: fstDay, end: lstDay })
        },
        updateCompanyData1: async (uidCollection, obj) => {
            console.log('Update company data')
            let tmpSet = await saveDataSettings(uidCollection, 'cmpnyData', obj);
            tmpSet && setToast({ show: true, text: getTtl('Company data successfully saved!', obj.lng), clr: 'success' })
        },
    };
};


export default useSettingsState;
