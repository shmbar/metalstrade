import React, { useEffect, useState } from 'react'
import Customtable from '@components/tablePnl';
import { useContext } from 'react';
import { SettingsContext } from "@contexts/useSettingsContext";
import Datepicker from "react-tailwindcss-datepicker";
import { InvoiceContext } from "@contexts/useInvoiceContext";
import { UserAuth } from "@contexts/useAuthContext";
import { OutTurn, Finalizing, relStts } from '@components/const'
import { getTtl } from '@utils/languages';
import { Selector } from '@components/selectors/selectShad.js';
import { Button } from '@components/ui/button.jsx';
import { Save } from "lucide-react";



const PnlTables = ({ data, setPnlData, val, mult }) => {

    const { settings, ln } = useContext(SettingsContext);
    const [dataValue, setDataValue] = useState([{ id: '', rcvd: '', outrnamnt: '', fnlzing: '', status: '', eta: '', etd: '' }])

    const [runData, setRunData] = useState(false)
    const { saveData_shipPnl } = useContext(InvoiceContext);
    const { uidCollection } = UserAuth();

    let propDefaults = [
        { field: 'client', header: getTtl('Consignee', ln), arr: settings.Client.Client },
        { field: 'invoice', header: getTtl('Invoice', ln) },
        { field: 'totalAmount', header: getTtl('invValueSale', ln) },
        { field: 'deviation', header: getTtl('Deviation', ln) },
        { field: 'prepaidPer', header: getTtl('Prepaid', ln) + ' %' },
        { field: 'totalPrepayment', header: getTtl('Prepaid Amount', ln) },
        { field: 'inDebt', header: getTtl('Initial Debt', ln) },
        { field: 'payments', header: getTtl('Actual Payment', ln) },
        { field: 'debtaftr', header: getTtl('debtAfterPrepPmnt', ln) },
        { field: 'debtBlnc', header: getTtl('Debt Balance', ln) },
        { field: 'expenses', header: getTtl('Expenses', ln) },

    ];

    const handleDate = (val, name, i) => {
        let item = dataValue[i]
        item = { ...item, [name]: val }

        let newObj = [...dataValue]
        newObj[i] = item;
        setDataValue(newObj)
    }


    useEffect(() => {
        let arr = []
        for (let i = 0; i < data.length; i++) {
            let tmp = data[i].find(x => x.invType === '1111' || x.invType === 'Invoice')
            tmp = { ...tmp.shipData, id: tmp.id, date: tmp.dateRange }
            arr = [...arr, tmp]
        }

        setDataValue(arr)
        setRunData(true)
    }, [])

    const SaveData = (i) => {

        let pnlDataTmp = [...data]
        let invTmp = pnlDataTmp[i].find(k => k.id === dataValue[i].id && (k.invType === '1111' || k.invType === 'Invoice'))
        invTmp = { ...invTmp, shipData: dataValue[i] }
        pnlDataTmp[i] = pnlDataTmp[i].map(z => z.id === invTmp.id ? invTmp : z)

        setPnlData(pnlDataTmp)
        saveData_shipPnl(uidCollection, dataValue[i])

    }

    const removeNonNumeric = (num) => num.toString().replace(/[^0-9.]/g, "");

    function countDecimalDigits(inputString) {
        const match = inputString.match(/(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/);
        if (!match) return 0;

        const decimalPart = match[1] || '';
        const exponentPart = match[2] || '';

        // Combine the decimal and exponent parts
        const combinedPart = decimalPart + exponentPart;

        // Remove leading zeros
        const trimmedPart = combinedPart.replace(/^0+/, '');

        return trimmedPart.length;
    }

    const handleValue = (e, i) => {

        if (countDecimalDigits(e.target.value) > 2) return;

        let itm = dataValue[i]
        itm = { ...itm, [e.target.name]: removeNonNumeric(e.target.value) }
        let newObj = [...dataValue]
        newObj[i] = itm;
        setDataValue(newObj)
    }

    const addComma = (nStr, i) => {

        if (!nStr) return '';
        nStr += '';
        var x = nStr.split('.');
        var x1 = x[0];
        var x2 = x.length > 1 ? '.' + x[1] : '';
        var rgx = /(\d+)(\d{3})/;
        while (rgx.test(x1)) {
            x1 = x1.replace(rgx, '$1,$2');
        }

        let obj = data[i][0];

        const symbol = obj.final ? obj.cur.sym :
            obj.cur !== '' ? settings.Currency.Currency.find(x => x.id === obj.cur).symbol : ''
        x2 = x2.length > 3 ? x2.substring(0, 3) : x2
        return (symbol + x1 + x2);
    }

    const handleChange = (e, name, indx) => {
        setDataValue(prev =>
            prev.map((item, i) =>
                i === indx ? { ...item, [name]: e } : item
            )
        );
    }


    const clear = (name) => {
        setValueInv(prev => ({
            ...prev, [name]: '',
        }))
    }

    return runData && (
        <div>
            {data.map((x, i) => {
                return <div className='mt-4 border border-[#b8ddf8] p-2 rounded-2xl flex flex-wrap gap-2' key={i}>
                    <Customtable data={data[i]} propDefaults={propDefaults} val={val} mult={mult} />

                    <div className='bg-[#f0f8ff] mt-2 lg:mt-0 flex flex-wrap items-center border border-[#b8ddf8] rounded-lg max-w-6xl'>
                        <div className='p-1 gap-2 h-fit flex justify-normal w-full'>
                            <div className='responsiveTextTable text-[var(--chathams-blue)] items-center flex'>Outturn:</div>
                            <Selector
                                arr={OutTurn}
                                value={dataValue[i]}
                                onChange={(e) => handleChange(e, 'rcvd', i)}
                                name='rcvd'
                                classes='h-6 w-28'
                            />
                        </div>
                        {dataValue[i].rcvd === '1234' &&
                            <div className='p-1 space-x-2 h-fit flex justify-normal w-full'>
                                <div className='responsiveTextTable text-[var(--chathams-blue)] items-center flex text-nowrap'>Outturn Amount:</div>
                                <input type='text' className="number-separator input shadow-lg h-6 max-w-44" style={{ fontSize: 'inherit', fontFamily: 'inherit' }}
                                    name='outrnamnt' value={addComma(dataValue[i].outrnamnt, i)} onChange={e => handleValue(e, i)} />
                            </div>
                        }
                        <div className='p-1 gap-2 h-fit flex justify-normal w-full'>
                            <div className='responsiveTextTable text-[var(--chathams-blue)] items-center flex'>{getTtl('Finalizing', ln)}:</div>
                            <Selector
                                arr={Finalizing}
                                value={dataValue[i]}
                                onChange={(e) => handleChange(e, 'fnlzing', i)}
                                name='fnlzing'
                                classes='h-6 w-20'
                            />
                        </div>
                        <div className='p-1 gap-2 h-fit flex justify-normal w-full'>
                            <div className='responsiveTextTable text-[var(--chathams-blue)] items-center flex whitespace-nowrap'>{getTtl('Release Status', ln)}:</div>
                            <Selector
                                arr={relStts}
                                value={dataValue[i]}
                                onChange={(e) => handleChange(e, 'status', i)}
                                name='status'
                                classes='h-6 w-40'
                            />
                        </div>

                        <div className='p-1 gap-2 h-fit flex justify-normal w-full'>
                            <div className='responsiveText text-[var(--chathams-blue)] items-center flex'>ETD:</div>
                            <Datepicker useRange={false}
                                asSingle={true}
                                value={dataValue[i].etd}
                                popoverDirection='up'
                                onChange={(e) => handleDate(e, 'etd', i)}
                                displayFormat={"DD-MMM-YYYY"}
                                inputClassName='input w-full shadow-lg h-6'
                            />
                        </div>
                        <div className='p-1 gap-2 h-fit flex justify-normal w-full'>
                            <div className='responsiveText text-[var(--chathams-blue)] items-center flex'>ETA:</div>
                            <Datepicker useRange={false}
                                asSingle={true}
                                value={dataValue[i].eta}
                                popoverDirection='up'
                                onChange={(e) => handleDate(e, 'eta', i)}
                                displayFormat={"DD-MMM-YYYY"}
                                inputClassName='input w-full shadow-lg h-6'
                            />
                        </div>



                    </div>
                    <Button
                        className='h-7 mt-1 px-3'
                        onClick={() => SaveData(i)}
                    >
                        <Save />
                        <p className='responsiveText'> {getTtl('save', ln)}</p>
                    </Button>

                </div>

            })}


        </div>
    )
}

export default PnlTables