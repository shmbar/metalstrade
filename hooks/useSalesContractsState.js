'use client'
import { useState, useContext } from 'react';
import dateFormat from "dateformat";
import { v4 as uuidv4 } from 'uuid';
import { validate, saveData, delDoc } from '@utils/utils'
import { SettingsContext } from "@contexts/useSettingsContext";
import { getCur } from '@components/exchangeApi'
import { getTtl } from '@utils/languages';

// Auto contract number: ddmmyy-N-CLI (mirrors the supplier-contract buildAutoOrder,
// but seeds the suffix from the client name instead of the supplier).
const buildAutoContractNo = (salesContractsData, clientName) => {
    const now = new Date();
    const datePart = dateFormat(now, 'ddmmyy');
    const usedNumbers = salesContractsData
        .map(c => c.contractNo ?? '')
        .filter(o => o.startsWith(datePart + '-'))
        .map(o => parseInt(o.split('-')[1]))
        .filter(n => !isNaN(n));
    const nextN = usedNumbers.length > 0 ? Math.max(...usedNumbers) + 1 : 1;
    const cliCode = clientName ? clientName.substring(0, 3).toUpperCase() : '';
    return `${datePart}-${nextN}-${cliCode}`;
};

const newSalesContract = {
    id: '', opDate: dateFormat(new Date(), "dd-mmm-yyyy, HH:MM"), lstSaved: '', contractNo: '',
    dateRange: { startDate: null, endDate: null }, date: '', client: '',
    cur: '', qTypeTable: '', productsData: [], total: 0,
    remarks: [], comments: '', invoices: [], file: null
};

const useSalesContractsState = () => {

    const [valueSC, setValueSC] = useState();
    const [salesContractsData, setSalesContractsData] = useState([]);
    const [isOpenSC, setIsOpenSC] = useState(false);
    const [errors, setErrors] = useState({});
    const { setToast, dateYr, setLoading, ln } = useContext(SettingsContext);
    const [isButtonDisabled, setIsButtonDisabled] = useState(false);

    return {
        valueSC, setValueSC,
        salesContractsData, setSalesContractsData,
        isOpenSC, setIsOpenSC,
        errors, setErrors,
        isButtonDisabled, setIsButtonDisabled,
        blankSalesContract: () => setValueSC(undefined),
        addSalesContract: async () => {
            setValueSC({ ...newSalesContract, contractNo: buildAutoContractNo(salesContractsData, null) });
            setIsOpenSC(true);
        },
        delSalesContract: async (uidCollection) => {

            if ((valueSC.invoices || []).length > 0) {
                setToast({ show: true, text: getTtl('Sales contract has linked invoices and cannot be deleted!', ln) || 'Sales contract has linked invoices and cannot be deleted!', clr: 'fail' });
                return;
            }

            const tmpArr = salesContractsData.filter((k) => k.id !== valueSC.id);
            setSalesContractsData(tmpArr);
            setIsOpenSC(false);
            let success = await delDoc(uidCollection, 'salescontracts', valueSC);
            success && setToast({ show: true, text: getTtl('Sales contract successfully deleted!', ln) || 'Sales contract successfully deleted!', clr: 'success' });
        },
        saveData: async (uidCollection) => {
            setLoading(true);
            let errs = validate(valueSC, ['client', 'cur', 'contractNo', 'date']);
            setErrors(errs);
            const isNotFilled = Object.values(errs).includes(true);

            if (isNotFilled) {
                setToast({ show: true, text: getTtl('Some fields are missing!', ln), clr: 'fail' });
                setLoading(false);
                return false;
            }

            let indx = salesContractsData.findIndex((x) => x.id === valueSC.id);
            let tmpValue = {};

            // Total is always derived from the product lines so it can never drift from them.
            const total = (valueSC.productsData || []).reduce(
                (s, r) => s + (parseFloat(r.qnty) || 0) * (parseFloat(r.unitPrc) || 0), 0);
            const baseValue = { ...valueSC, total };

            let tmpEuToUs = await getCur(baseValue.dateRange.startDate);

            if (indx !== -1) { // update
                tmpValue = {
                    ...baseValue, lstSaved: dateFormat(new Date(), "dd-mmm-yyyy, HH:MM"),
                    euroToUSD: tmpEuToUs
                };
                setSalesContractsData(salesContractsData.map((k) => (k.id === baseValue.id ? tmpValue : k)));

                // Date changed → remove the stale doc from the previous year bucket.
                if (dateYr !== baseValue.dateRange.startDate.substring(0, 4) && dateYr != null) {
                    await delDoc(uidCollection, 'salescontracts', { id: baseValue.id, date: dateYr });
                }
            } else { // new
                tmpValue = {
                    ...baseValue, id: uuidv4(),
                    lstSaved: dateFormat(new Date(), "dd-mmm-yyyy, HH:MM"), euroToUSD: tmpEuToUs
                };
                setSalesContractsData([...salesContractsData, tmpValue]);
            }

            setValueSC(tmpValue);

            let success = await saveData(uidCollection, 'salescontracts', tmpValue);
            setLoading(false);
            if (success) return true;
        },
        duplicate: async () => {
            let newObj = {
                ...valueSC, invoices: [], id: '',
                lstSaved: dateFormat(new Date(), "dd-mmm-yyyy, HH:MM"),
                contractNo: buildAutoContractNo(salesContractsData, null),
                productsData: valueSC.productsData.map(x => ({ ...x, id: uuidv4() }))
            };
            setValueSC(newObj);
        },
    };
};

export default useSalesContractsState;
