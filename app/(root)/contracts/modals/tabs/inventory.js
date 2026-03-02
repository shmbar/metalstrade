import React, { useContext, useEffect, useState } from 'react'
import { ContractsContext } from "@contexts/useContractsContext";
import { SettingsContext } from "@contexts/useSettingsContext";
import { getD, getInvoices, loadStockData, sortArr } from '@utils/utils'
import { UserAuth } from "@contexts/useAuthContext";
import dateFormat from "dateformat";
import { getTtl } from '@utils/languages';

const frm = (val) => {

    return new Intl.NumberFormat('en-US', {
        maximumFractionDigits: 3
    }).format(val);
}



const setNum = (value, valueCon, settings) => {

    const qUnit = getD(settings.Quantity.Quantity, valueCon, 'qTypeTable')

    let val = qUnit === 'KGS' ? value / 1000 :
        qUnit === 'LB' ? value / 2000 : value;

    return val;

}


const sumTotalsCon = (value, name) => {
    let totalSum = 0;
    for (const obj of value[name]) {

        const qnty = parseFloat(obj.qnty);
        const unitPrc = parseFloat(obj.unitPrc);


        if (!isNaN(qnty) && !isNaN(unitPrc)) {
            let subtotal = qnty * 1// unitPrc;
            totalSum += subtotal;
        }
    }

    return totalSum;

}


const getReduced = (dt) => {
    let arr = []

    for (const obj of dt) {

        let q = dt.filter(x => x.invoice === obj.invoice)

        if (q.length === 1 || (q.length > 1 && (obj.invType !== '1111' && obj.invType !== 'Invoice'))) {
            arr = [...arr, obj];
        }
    }
    arr = arr.map(x => ({ ...x, d: x.final ? x.date : x.date.startDate })).sort((a, b) => {
        const dateA = new Date(a.d);
        const dateB = new Date(b.d);
        return dateA - dateB;
    });

    arr = sortArr(arr, 'invoice')
    return arr;
}

const Total = (data, name, name1) => {
    let accumulatedTotalAmount = 0;

    data.forEach(innerObj => {
        innerObj[name].forEach(obj => {
            if (obj && obj[name1] !== '' && !innerObj.canceled) {
                accumulatedTotalAmount += parseFloat(obj[name1]);
            }
        });
    });

    return accumulatedTotalAmount;
}


const Inventory = () => {

    const { valueCon } = useContext(ContractsContext);
    const { settings, loading, setLoading, ln } = useContext(SettingsContext);
    const [data, setData] = useState([])
    const [totalInvWeight, setTotalInvWeight] = useState()
    const { uidCollection } = UserAuth();


    let cols = [
        { field: 'client', header: getTtl('Consignee', ln) },
        { field: 'invoice', header: getTtl('Invoice', ln) },
        { field: 'd', header: getTtl('Date', ln) },
        { field: 'shipped', header: getTtl('Shipped Net', ln) + ' WT / MT' },
        { field: 'remaining', header: getTtl('Remaining QTY', ln) + ' / MT' },
    ];

    useEffect(() => {
        setLoading(true)
        const loadInvoices = async () => {
            let yrs = [...new Set(valueCon.invoices.map(x => x.date.substring(0, 4)))]
            let arrTmp = [];
            for (let i = 0; i < yrs.length; i++) {
                let yr = yrs[i]
                let tmpDt = [...new Set(valueCon.invoices.filter(x => x.date.substring(0, 4) === yr).map(y => y.invoice))]
                let obj = { yr: yr, arrInv: tmpDt }
                arrTmp.push(obj)
            }

            let tmpInv = await getInvoices(uidCollection, 'invoices', arrTmp)
            let dt = getReduced(tmpInv)

            setData(dt)

            let stockData = valueCon.stock.length > 0 ? await loadStockData(uidCollection, 'id', valueCon.stock) : []
            let ttl = 0
            stockData.forEach(z => {
                ttl += parseFloat(z.qnty)
            })

            setTotalInvWeight(ttl)
            setLoading(false)
        }

        loadInvoices()

    }, [])

    const getprefixInv = (x) => {
        return (x.invType === '1111' || x.invType === 'Invoice') ? '' :
            (x.invType === '2222' || x.invType === 'Credit Note') ? 'CN' : 'FN'
    }



    const showDetail = (obj, x, i) => {

        return x === 'client' ? obj.final ? obj.client.nname :
            settings.Client.Client.find(z => z.id === obj.client).nname :
            x === 'invoice' ? obj[x] + getprefixInv(obj) :
                x === 'd' ? dateFormat(obj.d, 'dd-mmm-yyyy') :
                    x === 'shipped' ? obj.canceled ? 0 : frm(obj.productsDataInvoice.map(x => x.qnty)
                        .reduce((accumulator, currentValue) => accumulator + currentValue * 1, 0)) :
                        x === 'remaining' ?
                            loading ? '' : frm(setNum(totalInvWeight, valueCon, settings) - Total(data.slice(0, i + 1),
                                'productsDataInvoice', 'qnty'))
                            :
                            ''

    }


    return (
        <div className='p-1'>

            <div className='mt-3 border border-slate-300 p-2 rounded-lg max-w-72 ]'>

                <div className='flex justify-between'>
                    <p className='text-[0.8rem]'>{getTtl('Purchase QTY', ln)} / MT</p>
                    <p className='text-[0.8rem]'>{loading ? '' : frm(setNum(totalInvWeight, valueCon, settings))}</p>
                </div>

                <div className='w-full text-right h-4 -mt-2'>-</div>
                <div className='flex justify-between'>
                    <p className='text-[0.8rem] w-full'>{getTtl('Invoices summary', ln)}:</p>
                    <p className='text-[0.8rem]'>{frm(Total(data, 'productsDataInvoice', 'qnty'))}</p>
                </div>
                <div className='pt-1.5 border-t border-slate-500'></div>
                <div className='flex justify-between font-bold'>
                    <p className='text-[0.8rem] full'>{getTtl('Remaining QTY', ln)} / MT:</p>
                    <p className='text-[0.8rem]'>{loading ? '' : frm(setNum(totalInvWeight, valueCon, settings) -
                        Total(data, 'productsDataInvoice', 'qnty'))}</p>
                </div>
            </div>


            <div className='mt-4 border border-slate-300 p-2 rounded-lg flex md:w-fit' >
                <div className="w-full overflow-x-auto border-slate-300 border rounded-lg ">
                    <table className='w-full'>
                        <thead className="bg-slate-500 divide-y divide-gray-200 ">
                            <tr className='border-b '>
                                {cols.map(x => x.header)
                                    .map((y, k) => (
                                        <th
                                            scope="col"
                                            key={k}
                                            className="px-3 py-1 text-left text-[0.75rem] font-medium uppercase text-white text-wrap max-w-40"
                                        >
                                            {y}
                                        </th>

                                    ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 ">
                            {data.map((obj, i) => (
                                <tr key={i}>
                                    {cols.map(y => (
                                        <td key={y.field} data-label={y.header} className={`table_cell px-3 py-0.5 text-[0.7rem] items-center`} >
                                            <div className='py-1'>
                                                {showDetail(obj, y.field, i)}
                                            </div>
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>

                </div>
            </div>


        </div>
    )
}

export default Inventory