import { NumericFormat } from "react-number-format";
import dateFormat from "dateformat";


export const expensesToolTip = (row, expensesData, settings) => {

    let filteredArr = expensesData.filter(z => (z.supplier === row.original.supplier && z.cur === row.original.cur))
    return (

        <div className="bg-customBlue max-h-[32rem] overflow-y-auto w-fit">
            <table>
                <thead>
                    <tr className="border border-slate-300 p-2">
                        <th className="text-left p-2">PO#</th>
                        <th className="text-left p-2">Description</th>
                        <th className="text-left p-2">Quantity</th>
                        <th className="text-left p-2">Shipped Weight</th>
                        <th className="text-left p-2">Remaining Weight</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredArr.map((z, i) => {
                        return (
                            <tr className="border border-slate-300 p-2" key={i}>
                                <td className="text-left p-2">{z.order}</td>
                                <td className="text-left p-2" >{z.description}</td>
                                <td className="text-left p-2" >{z.poWeight}</td>
                                <td className="text-left p-2" >{
                                    z.shiipedWeight === 0 ? 0 :
                                        <NumericFormat
                                            value={z.shiipedWeight}
                                            displayType="text"
                                            thousandSeparator
                                            allowNegative={true}
                                            //  prefix={z.cur === 'us' ? '$' : '€'}
                                            decimalScale='3'
                                            fixedDecimalScale
                                            className='text-[0.8rem]'
                                        />
                                }</td>
                                <td className="text-left p-2" >{
                                    z.remaining === 0 ? 0 :
                                        <NumericFormat
                                            value={z.remaining}
                                            displayType="text"
                                            thousandSeparator
                                            allowNegative={true}
                                            //  prefix={z.cur === 'us' ? '$' : '€'}
                                            decimalScale='3'
                                            fixedDecimalScale
                                            className='text-[0.8rem]'
                                        />
                                }</td>
                                <td className="text-left p-2">
                                    {
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
                                    }
                                </td>
                            </tr>
                        )
                    })}

                </tbody>
            </table>
        </div>
    )
}