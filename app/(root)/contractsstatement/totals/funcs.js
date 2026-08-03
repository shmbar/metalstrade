import { NumericFormat } from "react-number-format";
import dateFormat from "dateformat";


export const expensesToolTip = (row, expensesData, settings) => {

    let filteredArr = expensesData.filter(z => (z.supplier === row.original.supplier && z.cur === row.original.cur))

    const thStyle = { textAlign: 'center', padding: '6px 10px', color: 'var(--chathams-blue)', fontWeight: 500, fontSize: 'var(--fs-body)', border: '1px solid var(--border-divider)', background: 'var(--surface-header)', whiteSpace: 'nowrap' }
    const tdStyle = { textAlign: 'center', padding: '5px 10px', border: '1px solid var(--selago)', fontSize: 'var(--fs-body)', color: 'var(--chathams-blue)', whiteSpace: 'nowrap' }

    return (
        <div style={{
            background: 'var(--surface-card)',
            borderRadius: '16px',
            overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(var(--endeavour-rgb),0.13)',
            border: '1px solid var(--border-divider)',
            fontFamily: "var(--font-poppins), 'Poppins', sans-serif",
            minWidth: '400px',
        }}>
            <div style={{ background: 'var(--surface-header)', padding: '7px 14px', fontWeight: 500, fontSize: 'var(--fs-body)', color: 'var(--chathams-blue)', borderBottom: '1px solid var(--border-divider)' }}>
                Contract Details
            </div>
            <table style={{ fontFamily: 'inherit', fontSize: 'var(--fs-input)', width: '100%', borderCollapse: 'collapse', tableLayout: 'auto' }}>
                <thead>
                    <tr>
                        <th style={thStyle}>PO#</th>
                        <th style={thStyle}>Description</th>
                        <th style={thStyle}>Quantity</th>
                        <th style={thStyle}>Shipped Weight</th>
                        <th style={thStyle}>Remaining Weight</th>
                        <th style={thStyle}>Amount</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredArr.map((z, i) => (
                        <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : 'var(--surface-pill)' }}>
                            <td style={tdStyle}>{z.order}</td>
                            <td style={tdStyle}>{z.description}</td>
                            <td style={tdStyle}>{z.poWeight}</td>
                            <td style={tdStyle}>
                                {z.shiipedWeight === 0 ? 0 :
                                    <NumericFormat value={z.shiipedWeight} displayType="text" thousandSeparator allowNegative={true} decimalScale={3} fixedDecimalScale />
                                }
                            </td>
                            <td style={tdStyle}>
                                {z.remaining === 0 ? 0 :
                                    <NumericFormat value={z.remaining} displayType="text" thousandSeparator allowNegative={true} decimalScale={3} fixedDecimalScale />
                                }
                            </td>
                            <td style={tdStyle}>
                                <NumericFormat value={z.amount} displayType="text" thousandSeparator allowNegative={true} prefix={z.cur === 'us' ? '$' : '€'} decimalScale={2} fixedDecimalScale />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
