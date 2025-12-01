import { sortArr } from "@utils/utils"
import { NumericFormat } from "react-number-format";
import dateFormat from "dateformat";



export const detailsToolTip = (row, data, settings, dataTable,) => {
 
    let id = settings.Stocks.Stocks.find(z => z.nname === row.original.stock)?.id
    let filteredArr = dataTable.filter(z => z.stock === id)

    return (
        <div className="bg-customBlue max-h-[28rem] overflow-y-auto">
            <table>
                <thead>
                    <tr className="border border-slate-300 p-2">
                        <th className="text-left p-2">PO#</th>
                        <th className="text-left p-2">Supplier</th>
                        <th className="text-left p-2">Description</th>
                        <th className="text-left p-2">Quantity</th>
                        <th className="text-left p-2">Unit Price</th>
                        <th className="text-left p-2">Total</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredArr.map((z, i) => {
                        return (
                            <tr className="border border-slate-300 p-2" key={i}>
                                <td className="text-left p-2">{z.order}</td>
                                <td className="text-left p-2">{settings.Supplier.Supplier.find(q => q.id === z.supplier)?.nname}</td>
                                <td className="text-left p-2" >{z.descriptionName}</td>
                                <td className="text-left p-2">{
                                    <NumericFormat
                                        value={z.qnty}
                                        displayType="text"
                                        thousandSeparator
                                        allowNegative={true}
                                        //  prefix={z.cur === 'us' ? '$' : '€'}
                                        decimalScale='3'
                                        fixedDecimalScale
                                        className='text-[0.8rem]'
                                    />
                                }</td>
                                <td className="text-left p-2">{
                                    <NumericFormat
                                        value={z.unitPrc}
                                        displayType="text"
                                        thousandSeparator
                                        allowNegative={true}
                                        prefix={z.cur === 'us' ? '$' : '€'}
                                        decimalScale='2'
                                        fixedDecimalScale
                                        className='text-[0.8rem]'
                                    />
                                }</td>
                                <td className="text-left p-2">{
                                    <NumericFormat
                                        value={z.total}
                                        displayType="text"
                                        thousandSeparator
                                        allowNegative={true}
                                        prefix={z.cur === 'us' ? '$' : '€'}
                                        decimalScale='2'
                                        fixedDecimalScale
                                        className='text-[0.8rem]'
                                    />
                                }</td>
                            </tr>
                        )
                    })}

                </tbody>
            </table>
        </div>
    )//stock; 
}