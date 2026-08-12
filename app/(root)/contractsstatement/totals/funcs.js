import { NumericFormat } from "react-number-format";


export const expensesToolTip = (row, expensesData, settings) => {

    let filteredArr = expensesData.filter(z => (z.supplier === row.original.supplier && z.cur === row.original.cur))

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
                Contract Details
            </div>
            <table className="detail-popup-table" style={{ fontFamily: 'inherit' }}>
                <thead>
                    <tr>
                        <th>PO#</th>
                        <th>Description</th>
                        <th>Quantity</th>
                        <th>Shipped Weight</th>
                        <th>Remaining Weight</th>
                        <th>Amount</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredArr.map((z, i) => (
                        <tr key={i}>
                            <td>{z.order}</td>
                            <td>{z.description}</td>
                            <td>{z.poWeight}</td>
                            <td>
                                {z.shiipedWeight === 0 ? 0 :
                                    <NumericFormat value={z.shiipedWeight} displayType="text" thousandSeparator allowNegative={true} decimalScale={3} fixedDecimalScale />
                                }
                            </td>
                            <td>
                                {z.remaining === 0 ? 0 :
                                    <NumericFormat value={z.remaining} displayType="text" thousandSeparator allowNegative={true} decimalScale={3} fixedDecimalScale />
                                }
                            </td>
                            <td>
                                <NumericFormat value={z.amount} displayType="text" thousandSeparator allowNegative={true} prefix={z.cur === 'us' ? '$' : '€'} decimalScale={2} fixedDecimalScale />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
