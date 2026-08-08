import { NumericFormat } from "react-number-format";
import dateFormat from "dateformat";


export const expensesToolTip = (row, expensesData, settings, filt) => {

    let filteredArr = filt === 'reduced' ?
        expensesData.filter(z => (z.paidNotPaid === 'Not Paid' && z.supplier === row.original.supplier && z.cur === row.original.cur)) :
        expensesData.filter(z => (z.supplier === row.original.supplier && z.cur === row.original.cur))

    const thStyle = { textAlign: 'center', padding: '6px 10px', color: 'var(--ink-secondary)', fontWeight: 600, fontSize: 'var(--fs-body)', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid var(--line)', background: 'var(--bg-subtle)', whiteSpace: 'nowrap' }
    const tdStyle = { textAlign: 'center', padding: '5px 10px', borderBottom: '1px solid var(--line)', fontSize: 'var(--fs-input)', color: 'var(--ink)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }

    return (
        <div style={{
            background: "var(--bg-card)",
            borderRadius: '16px',
            overflow: 'hidden',
            boxShadow: 'var(--shadow-md)',
            border: '1px solid var(--line)',
            fontFamily: "var(--font-poppins), 'Poppins', sans-serif",
            minWidth: '400px',
        }}>
            <div style={{ background: 'var(--bg-subtle)', padding: '7px 14px', fontWeight: 500, fontSize: 'var(--fs-body)', color: 'var(--chathams-blue)', borderBottom: '1px solid var(--line)' }}>
                Invoice Details
            </div>
            <table style={{ fontFamily: 'inherit', fontSize: 'var(--fs-table)', width: '100%', borderCollapse: 'collapse', tableLayout: 'auto' }}>
                <thead>
                    <tr>
                        <th style={thStyle}>PO#</th>
                        <th style={thStyle}>Invoice</th>
                        <th style={thStyle}>Description</th>
                        <th style={thStyle}>Amount</th>
                        <th style={thStyle}>Date</th>
                        <th style={thStyle}>Payment</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredArr.map((z, i) => (
                        <tr key={i} style={{ background: i % 2 === 0 ? 'var(--bg-card)' : 'var(--bg-subtle)' }}>
                            <td style={tdStyle}>{z?.order}</td>
                            <td style={tdStyle}>{z.invoice}</td>
                            <td style={tdStyle}>{z.description}</td>
                            <td style={tdStyle}>
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
                            <td style={tdStyle}>{dateFormat(z.date, 'dd.mm.yy')}</td>
                            <td style={tdStyle}>{z.paidNotPaid}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}
