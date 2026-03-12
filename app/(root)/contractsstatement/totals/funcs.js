import { NumericFormat } from "react-number-format";
import dateFormat from "dateformat";


export const expensesToolTip = (row, expensesData, settings) => {

    let filteredArr = expensesData.filter(z => (z.supplier === row.original.supplier && z.cur === row.original.cur))

    const thStyle = { textAlign: 'center', padding: '6px 10px', color: 'var(--chathams-blue)', fontWeight: 600, fontSize: '11px', border: '1px solid #b8ddf8', background: '#dbeeff', whiteSpace: 'nowrap' }
    const tdStyle = { textAlign: 'center', padding: '5px 10px', border: '1px solid #e8f0f8', fontSize: '11px', color: 'var(--chathams-blue)', whiteSpace: 'nowrap' }

    return (
        <div style={{
            background: '#fff',
            borderRadius: '16px',
            overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(3,102,174,0.13)',
            border: '1px solid #b8ddf8',
            fontFamily: "'Inter', system-ui, sans-serif",
            minWidth: '400px',
        }}>
            <div style={{ background: '#dbeeff', padding: '7px 14px', fontWeight: 600, fontSize: '12px', color: 'var(--endeavour)', borderBottom: '1px solid #b8ddf8', letterSpacing: '0.03em' }}>
                Contract Details
            </div>
            <table style={{ fontFamily: 'inherit', fontSize: '11px', width: '100%', borderCollapse: 'collapse', tableLayout: 'auto' }}>
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
                        <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#f4f9ff' }}>
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
