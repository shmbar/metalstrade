import { NumericFormat } from "react-number-format";
import dateFormat from "dateformat";


export const expensesToolTip = (row, expensesData, settings, filt) => {

    let filteredArr = filt === 'reduced' ? expensesData.filter(z => z.paid === '222') : expensesData;
    filteredArr = filteredArr.filter(z => (z.supplier === row.original.supplier && z.cur === row.original.cur))

    return (

        <div className="bg-customBlue max-h-[32rem] overflow-y-auto w-fit">
            <table>
                <thead>
                    <tr className="border border-slate-300 p-2">
                        <th className="text-left p-2">PO#</th>
                        {/* <th className="text-left p-2">Supplier</th> */}
                        <th className="text-left p-2">Expense Invoice</th>
                        <th className="text-left p-2">Expense Type</th>
                        <th className="text-left p-2">Amount</th>
                        <th className="text-left p-2">Date</th>
                        <th className="text-left p-2">Payment</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredArr.map((z, i) => {
                        return (
                            <tr className="border border-slate-300 p-2" key={i}>
                                <td className="text-left p-2">{z.poSupplier?.order ?? 'Comp. Exp.'}</td>
                                {/* <td className="text-left p-2">{settings.Supplier.Supplier.find(q => q.id === z.supplier)?.nname}</td> */}
                                <td className="text-left p-2" >{z.expense}</td>
                                <td className="text-left p-2" >{settings.Expenses.Expenses.find(q => q.id === z.expType)?.expType}</td>
                                <td className="text-left p-2">{
                                    <NumericFormat
                                        value={z.amount}
                                        displayType="text"
                                        thousandSeparator
                                        allowNegative={true}
                                        prefix={z.cur === 'us' ? '$' : '€'}
                                        decimalScale='3'
                                        fixedDecimalScale
                                        className='text-[0.8rem]'
                                    />
                                }</td>
                                <td className="text-left p-2">
                                    {dateFormat(z.date, 'dd-mmm-yy')}
                                </td>
                                <td className="text-left p-2">
                                    {z.paid === '111' ? 'Paid' : 'Unpaid'}
                                </td>
                            </tr>
                        )
                    })}

                </tbody>
            </table>
        </div>
    )
}