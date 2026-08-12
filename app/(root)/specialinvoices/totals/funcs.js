import { NumericFormat } from "react-number-format";
import dateFormat from "dateformat";


export const expensesToolTip = (row, expensesData, settings, filt) => {

    let filteredArr = filt === 'reduced' ?
        expensesData.filter(z => (z.paidNotPaid === 'Not Paid' && z.supplier === row.original.supplier && z.cur === row.original.cur)) :
        expensesData.filter(z => (z.supplier === row.original.supplier && z.cur === row.original.cur))

    return (
        <div style={{
            background: "var(--bg-card)",
            borderRadius: '16px',
            overflow: 'hidden',
            boxShadow: 'var(--shadow-md)',
            border: '1px solid var(--line)',
            fontFamily: "var(--font-jakarta), 'Plus Jakarta Sans', sans-serif",
            minWidth: '400px',
        }}>
            {/* Type, weight, padding and the header band all come from
                .detail-popup-* in globals.css — the same band .custom-table uses,
                so this popup matches the summary table it opens from. */}
            <div className="detail-popup-title">
                Invoice Details
            </div>
            <table className="detail-popup-table" style={{ fontFamily: 'inherit' }}>
                <thead>
                    <tr>
                        <th>PO#</th>
                        <th>Invoice</th>
                        <th>Description</th>
                        <th>Amount</th>
                        <th>Date</th>
                        <th>Payment</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredArr.map((z, i) => (
                        <tr key={i}>
                            <td>{z?.order}</td>
                            <td>{z.invoice}</td>
                            <td>{z.description}</td>
                            <td>
                                <NumericFormat
                                    value={z.total}
                                    displayType="text"
                                    thousandSeparator
                                    allowNegative={true}
                                    prefix={z.cur === 'us' ? '$' : '€'}
                                    decimalScale={2}
                                    fixedDecimalScale
                                />
                            </td>
                            <td>{dateFormat(z.date, 'dd.mm.yy')}</td>
                            <td>{z.paidNotPaid}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}
