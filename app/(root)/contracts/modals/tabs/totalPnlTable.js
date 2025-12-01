import { useContext } from 'react';
import { SettingsContext } from "@contexts/useSettingsContext";
import { getD } from '@utils/utils'
import { getTtl } from '@utils/languages';

const Total = (data, name, val, mult, settings) => {
    let accumulatedTotalAmount = 0;
    data.forEach(innerArray => {
        innerArray.forEach(obj => {
            if (obj && !isNaN(obj[name])) {

                const currentCur = !obj.final ? obj.cur : settings.Currency.Currency.find(x => x.cur === obj.cur.cur)['id']
                let mltTmp = currentCur === val.cur ? 1 :
                    currentCur === 'us' && val.cur === 'eu' ? 1 / mult : mult

                let num = obj.canceled ? 0 : obj[name] * 1 * mltTmp
                accumulatedTotalAmount += innerArray.length === 1 ? num :
                    obj.invType !== '1111' ? num : 0;
            }
        });
    });

    return accumulatedTotalAmount;
}

const TotalInvoice = (data, name, val, mult, settings) => {
    let accumulatedTotalAmount = 0;

    data.forEach(innerArray => {
        innerArray.forEach(obj => {
            if (obj && !isNaN(obj[name])) {
                const currentCur = !obj.final ? obj.cur : settings.Currency.Currency.find(x => x.cur === obj.cur.cur)['id']
                let mltTmp = currentCur === val.cur ? 1 :
                    currentCur === 'us' && val.cur === 'eu' ? 1 / mult : mult

                let num = obj.canceled ? 0 : obj[name] * 1 * mltTmp
                accumulatedTotalAmount += innerArray.length === 1 ? num :
                    obj.invType === '1111' ? num : 0;
            }
        });
    });

    return accumulatedTotalAmount;
}

const TotalArrsPmnt = (data, val, mult) => {
    let accumulatedPmnt = 0;

    data.forEach(innerArray => {
        innerArray.forEach(obj => {
            if (obj && Array.isArray(obj.payments)) {
                obj.payments.forEach(payment => {
                    let mltTmp = obj.cur === val.cur ? 1 :
                        obj.cur === 'us' && val.cur === 'eu' ? 1 / mult : mult

                    if (payment && !isNaN(parseFloat(payment.pmnt))) {
                        accumulatedPmnt += parseFloat(payment.pmnt * 1 * mltTmp);
                    }
                });
            }
        });
    });

    return accumulatedPmnt;
}

const TotalArrsExp = (data, val, mult) => {
    let accumulatedExp = 0;

    data.forEach(innerArray => {
        innerArray.forEach(obj => {
            if (obj && Array.isArray(obj.expenses)) {
                obj.expenses.forEach(exp => {

                    let mltTmp = exp.cur === val.cur ? 1 :
                        exp.cur === 'us' && val.cur === 'eu' ? 1 / mult : mult

                    if (exp && !isNaN(parseFloat(exp.amount))) {
                        accumulatedExp += parseFloat(exp.amount * 1 * mltTmp);
                    }
                });
            }
        });
    });

    return accumulatedExp;
}

const frmNum = (value, val, settings) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: val.cure !== '' ? getD(settings.Currency.Currency, val, 'cur') : 'USD',
        minimumFractionDigits: 2
    }).format(value)
}

const TotalPnlTable = ({ data, val, mult }) => {

    const { settings, ln } = useContext(SettingsContext);

    let cols = [
        { field: 'totalAmount', header: getTtl('invValueSale', ln)},
        { field: 'deviation', header:  getTtl('Deviation', ln) },
        { field: 'prepaidPer', header:  getTtl('Prepaid', ln)+' %' },
        { field: 'totalPrepayment', header: getTtl('Prepaid Amount', ln) },
        { field: 'inDebt', header:  getTtl('Initial Debt', ln) },
        { field: 'payments', header: getTtl('Actual Payment', ln) },
        { field: 'debtaftr', header: getTtl('debtAfterPrepPmnt', ln) },
        { field: 'debtBlnc', header: getTtl('Debt Balance', ln) }, 
        { field: 'expenses', header: getTtl('Expenses', ln) },

    ];


    const showDetail = (data, x) => {


        return x === 'totalAmount' || x === 'totalPrepayment' ? frmNum(Total(data, x, val, mult, settings), val, settings) :
            x === 'inDebt' ? frmNum(Total(data, 'totalAmount', val, mult, settings) - Total(data, 'totalPrepayment', val, mult, settings), val, settings) :
                x === 'payments' ? frmNum(TotalArrsPmnt(data, val, mult), val, settings) :
                    x === 'expenses' ? frmNum(TotalArrsExp(data, val, mult), val, settings) :
                        x === 'prepaidPer' ? isNaN(Total(data, 'totalPrepayment', val, mult, settings) * 1 / Total(data, 'totalAmount', val, mult, settings) * 1) ? '-' :
                            (((Total(data, 'totalPrepayment', val, mult, settings) * 1 / Total(data, 'totalAmount', val, mult, settings) * 1) * 100)).toFixed(2) + '%' :
                            x === 'debtaftr' ? frmNum(Total(data, 'totalPrepayment', val, mult, settings) - TotalArrsPmnt(data, val, mult), val, settings) :
                                x === 'debtBlnc' ? frmNum(Total(data, 'totalAmount', val, mult, settings) - TotalArrsPmnt(data, val, mult), val, settings) :
                                    x === 'deviation' ? frmNum(Total(data, 'totalAmount', val, mult, settings) - TotalInvoice(data, 'totalAmount', val, mult, settings), val, settings) :
                                        ''
    }

    return (


        <div className='border border-slate-300 p-2 rounded-lg' >
            <div className="overflow-x-auto border-slate-300 border rounded-lg">
                <table className="w-full ">
                    <thead className="bg-slate-500 divide-y divide-gray-200 ">
                        <tr className='border-b '>
                            {cols.map(x => x.header)
                                .map((y, k) => (
                                    <th
                                        scope="col"
                                        key={k}
                                        className="px-3 py-1 text-left text-[0.6rem] font-medium text-white uppercase"
                                    >
                                        {y}
                                    </th>

                                ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 ">
                        <tr>
                            {cols.map(x => (
                                <td key={x.field} data-label={x.header} className='table_cell px-3 py-0.5 
                                        text-[0.6rem] items-center' >
                                    <div className='py-1'>
                                        {showDetail(data, x.field)}
                                    </div>
                                </td>
                            ))}
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>






    )
}

export default TotalPnlTable