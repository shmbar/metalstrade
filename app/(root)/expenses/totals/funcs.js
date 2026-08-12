import { NumericFormat } from "react-number-format";
import dateFormat from "dateformat";

export const expensesToolTip = (row, expensesData, settings, filt) => {

    let filteredArr = filt === 'reduced' ? expensesData.filter(z => z.paid === '222') : expensesData;
    filteredArr = filteredArr.filter(z => (z.supplier === row.original.supplier && z.cur === row.original.cur))

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
                Expense Details
            </div>
            <table className="detail-popup-table" style={{ fontFamily: 'inherit' }}>
                <thead>
                    <tr>
                        <th>PO#</th>
                        <th>Expense Invoice</th>
                        <th>Expense Type</th>
                        <th>Amount</th>
                        <th>Date</th>
                        <th>Payment</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredArr.map((z, i) => (
                        <tr key={i}>
                            <td>{z.poSupplier?.order ?? 'Comp. Exp.'}</td>
                            <td>{z.expense}</td>
                            <td>{settings.Expenses.Expenses.find(q => q.id === z.expType)?.expType}</td>
                            <td>
                                <NumericFormat value={z.amount} displayType="text" thousandSeparator allowNegative={true} prefix={z.cur === 'us' ? '$' : '€'} decimalScale={2} fixedDecimalScale />
                            </td>
                            <td>{dateFormat(z.date, 'dd.mm.yy')}</td>
                            <td>{z.paid === '111' ? 'Paid' : 'Unpaid'}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}
