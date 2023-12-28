import React, { useEffect, useState } from 'react'
import Customtable from '@components/tablePnl';
import { useContext } from 'react';
import { SettingsContext } from "@contexts/useSettingsContext";
import CBox from '@components/comboboxPNL.js'
import Datepicker from "react-tailwindcss-datepicker";
import { VscSaveAs } from 'react-icons/vsc';
import { InvoiceContext } from "@contexts/useInvoiceContext";
import { UserAuth } from "@contexts/useAuthContext";
import { OutTurn, Finalizing, relStts } from '@components/const'

const PnlTables = ({ data, setPnlData, val, mult }) => {

    const { settings } = useContext(SettingsContext);
    const [dataValue, setDataValue] = useState([{ id: '', rcvd: '', fnlzing: '', status: '', eta: '', etd: '' }])

    const [runData, setRunData] = useState(false)
    const { saveData_shipPnl } = useContext(InvoiceContext);
    const { uidCollection } = UserAuth();

    let propDefaults = [
        { field: 'client', header: 'Consignee', arr: settings.Client.Client },
        { field: 'invoice', header: 'Invoice' },
        { field: 'totalAmount', header: 'Inv Value Sales' },
        { field: 'deviation', header: 'Deviation' },
        { field: 'prepaidPer', header: 'Prepaid %' },
        { field: 'totalPrepayment', header: 'Prepaid Amount' },
        { field: 'inDebt', header: 'Initial Debt' },
        { field: 'payments', header: 'Actual Payment' },
        { field: 'debtaftr', header: 'Debt After Prepayment' },
        { field: 'debtBlnc', header: 'Debt Balance' },
        { field: 'expenses', header: 'Expenses' },

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
            tmp = { ...tmp.shipData, id: tmp.id, date: tmp.date }
            arr = [...arr, tmp]
        }

        setDataValue(arr)
        setRunData(true)
    }, [])

    const Save = (i) => {

        let pnlDataTmp = [...data]
        let invTmp = pnlDataTmp[i].find(k => k.id === dataValue[i].id && (k.invType === '1111' || k.invType === 'Invoice'))
        invTmp = { ...invTmp, shipData: dataValue[i] }
        pnlDataTmp[i] = pnlDataTmp[i].map(z => z.id === invTmp.id ? invTmp : z)

        setPnlData(pnlDataTmp)
        saveData_shipPnl(uidCollection, dataValue[i])
    }

    return runData && (
        <div>
            {data.map((x, i) => {
                return <div className='mt-4 w-full border border-slate-300 p-2 rounded-lg block lg:flex flex-wrap gap-2' key={i}>
                    <Customtable data={data[i]} propDefaults={propDefaults} val={val} mult={mult} />

                    <div className='bg-slate-200 mt-2 lg:mt-0 flex flex-wrap items-center border border-slate-300 rounded-lg'>
                        <div className='p-1 gap-2 h-fit flex'>
                            <div className='text-xs text-gray-800 items-center flex text-[0.7rem]'>Outturn:</div>
                            <CBox data={OutTurn} setValue={setDataValue} value={dataValue[i]} dataValue={dataValue} name='rcvd' classes='shadow-md h-6 items-center flex max-w-[8rem]' classes2='text-[0.6rem]' />
                        </div>
                        <div className='p-1 gap-2 h-fit flex'>
                            <div className='text-xs text-gray-800 items-center flex text-[0.7rem]'>Finalizing:</div>
                            <CBox data={Finalizing} setValue={setDataValue} value={dataValue[i]} dataValue={dataValue} name='fnlzing' classes='shadow-md h-6 items-center flex max-w-[6rem]' classes2='text-[0.6rem]' />
                        </div>
                        <div className='p-1 gap-2 h-fit flex'>
                            <div className='text-xs text-gray-800 items-center flex text-[0.7rem] whitespace-nowrap'>Release Status:</div>
                            <CBox data={relStts} setValue={setDataValue} value={dataValue[i]} dataValue={dataValue} name='status' classes='shadow-md h-6 items-center flex max-w-[11rem]' classes2='text-[0.6rem]' />
                        </div>

                        <div className='p-1 gap-2 h-fit flex'>
                            <div className='text-xs text-gray-800 items-center flex text-[0.8rem]'>ETD:</div>
                            <Datepicker useRange={false}
                                asSingle={true}
                                value={dataValue[i].etd}
                                popoverDirection='up'
                                onChange={(e) => handleDate(e, 'etd', i)}
                                displayFormat={"DD-MMM-YYYY"}
                                inputClassName='input w-full text-[15px] shadow-lg h-6 text-xs'
                            />
                        </div>
                        <div className='p-1 gap-2 h-fit flex'>
                            <div className='text-xs text-gray-800 items-center flex text-[0.8rem]'>ETA:</div>
                            <Datepicker useRange={false}
                                asSingle={true}
                                value={dataValue[i].eta}
                                popoverDirection='up'
                                onChange={(e) => handleDate(e, 'eta', i)}
                                displayFormat={"DD-MMM-YYYY"}
                                inputClassName='input w-full text-[15px] shadow-lg h-6 text-xs'
                            />
                        </div>



                    </div>
                    <button className='m-1 h-fit py-0.5 bg-slate-100  px-3 border border-slate-400 shadow-md rounded-lg text-slate-700
                    flex items-center gap-1 self-center'
                        onClick={() => Save(i)}
                    >
                        <VscSaveAs className='text-slate-700' />
                        <p className='text-sm'> Save</p></button>

                </div>

            })}


        </div>
    )
}

export default PnlTables