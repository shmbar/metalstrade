import { sortArr } from "@utils/utils"
import { NumericFormat } from "react-number-format";
import dateFormat from "dateformat";



export const detailsToolTip = (row, data, settings, dataTable,) => {

    let id = settings.Stocks.Stocks.find(z => z.nname === row.original.stock)?.id
    let filteredArr = dataTable.filter(z => z.stock === id)

    return (
        <div style={{
            background: "var(--bg-card)",
            borderRadius: '16px',
            overflow: 'hidden',
            maxHeight: '28rem',
            overflowY: 'auto',
            boxShadow: 'var(--shadow-md)',
            border: '1px solid var(--line)',
            fontFamily: "var(--font-jakarta), 'Plus Jakarta Sans', sans-serif",
            minWidth: '400px',
        }}>
            {/* Type, weight, padding and the header band all come from
                .detail-popup-* in globals.css — the same band .custom-table uses,
                so this popup matches the summary table it opens from. */}
            <div className="detail-popup-title">
                Stock Details
            </div>
            <table className="detail-popup-table" style={{ fontFamily: 'inherit' }}>
                <thead>
                    <tr>
                        <th>PO#</th>
                        <th>Supplier</th>
                        <th>Description</th>
                        <th>Quantity</th>
                        <th>Unit Price</th>
                        <th>Total</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredArr.map((z, i) => (
                        <tr key={i}>
                            <td>{z.order}</td>
                            <td>{settings.Supplier.Supplier.find(q => q.id === z.supplier)?.nname}</td>
                            <td>{z.descriptionName}</td>
                            <td>
                                <NumericFormat value={z.qnty} displayType="text" thousandSeparator allowNegative decimalScale='3' fixedDecimalScale />
                            </td>
                            <td>
                                <NumericFormat value={z.unitPrc} displayType="text" thousandSeparator allowNegative prefix={z.cur === 'us' ? '$' : '€'} decimalScale='2' fixedDecimalScale />
                            </td>
                            <td>
                                <NumericFormat value={z.total} displayType="text" thousandSeparator allowNegative prefix={z.cur === 'us' ? '$' : '€'} decimalScale='2' fixedDecimalScale />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )//stock;
}
