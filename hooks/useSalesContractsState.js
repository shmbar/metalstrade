'use client'
import { useState, useContext, useMemo } from 'react';
import dateFormat from "dateformat";
import { v4 as uuidv4 } from 'uuid';
import { validate, saveData, delDoc } from '@utils/utils'
import { SettingsContext } from "@contexts/useSettingsContext";
import { getCur } from '@components/exchangeApi'
import { getTtl } from '@utils/languages';

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

    // Memoized: identity changes only when exposed/captured state changes (see
    // useContractsState for the rationale).
    return useMemo(() => ({
        valueSC, setValueSC,
        salesContractsData, setSalesContractsData,
        isOpenSC, setIsOpenSC,
        errors, setErrors,
        isButtonDisabled, setIsButtonDisabled,
        blankSalesContract: () => setValueSC(undefined),
        addSalesContract: async () => {
            // Contract # is entered manually by the user — no auto-generated number.
            setValueSC({ ...newSalesContract });
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
                contractNo: '',
                productsData: valueSC.productsData.map(x => ({ ...x, id: uuidv4() }))
            };
            setValueSC(newObj);
        },
    }), [valueSC, salesContractsData, isOpenSC, errors, isButtonDisabled,
        dateYr, ln, setToast, setLoading]);
};

export default useSalesContractsState;
