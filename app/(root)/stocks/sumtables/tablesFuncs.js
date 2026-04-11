import { sortArr } from "@utils/utils"
import { NumericFormat } from "react-number-format";
import dateFormat from "dateformat";



export const detailsToolTip = (row, data, settings, dataTable,) => {
 
    let id = settings.Stocks.Stocks.find(z => z.nname === row.original.stock)?.id
    let filteredArr = dataTable.filter(z => z.stock === id)

    const thStyle = { textAlign: 'center', padding: '6px 10px', color: 'var(--chathams-blue)', fontWeight: 500, fontSize: '0.68rem', border: '1px solid #b8ddf8', background: '#dbeeff', whiteSpace: 'nowrap' }
    const tdStyle = { textAlign: 'center', padding: '5px 10px', border: '1px solid #e8f0f8', fontSize: '0.68rem', color: 'var(--chathams-blue)', whiteSpace: 'nowrap' }

    return (
        <div style={{
            background: '#fff',
            borderRadius: '16px',
            overflow: 'hidden',
            maxHeight: '28rem',
            overflowY: 'auto',
            boxShadow: '0 8px 32px rgba(3,102,174,0.13)',
            border: '1px solid #b8ddf8',
            fontFamily: "var(--font-poppins), 'Geist Sans', sans-serif",
            minWidth: '400px',
        }}>
            {/* Title bar */}
            <div style={{ background: '#dbeeff', padding: '7px 14px', fontWeight: 500, fontSize: '0.68rem', color: 'var(--chathams-blue)', borderBottom: '1px solid #b8ddf8' }}>
                Stock Details
            </div>
            <table style={{ fontFamily: 'inherit', fontSize: '0.72rem', width: '100%', borderCollapse: 'collapse', tableLayout: 'auto' }}>
                <thead>
                    <tr>
                        <th style={thStyle}>PO#</th>
                        <th style={thStyle}>Supplier</th>
                        <th style={thStyle}>Description</th>
                        <th style={thStyle}>Quantity</th>
                        <th style={thStyle}>Unit Price</th>
                        <th style={thStyle}>Total</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredArr.map((z, i) => (
                        <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#f4f9ff' }}>
                            <td style={tdStyle}>{z.order}</td>
                            <td style={tdStyle}>{settings.Supplier.Supplier.find(q => q.id === z.supplier)?.nname}</td>
                            <td style={tdStyle}>{z.descriptionName}</td>
                            <td style={tdStyle}>
                                <NumericFormat value={z.qnty} displayType="text" thousandSeparator allowNegative decimalScale='3' fixedDecimalScale />
                            </td>
                            <td style={tdStyle}>
                                <NumericFormat value={z.unitPrc} displayType="text" thousandSeparator allowNegative prefix={z.cur === 'us' ? '$' : '€'} decimalScale='2' fixedDecimalScale />
                            </td>
                            <td style={tdStyle}>
                                <NumericFormat value={z.total} displayType="text" thousandSeparator allowNegative prefix={z.cur === 'us' ? '$' : '€'} decimalScale='2' fixedDecimalScale />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )//stock;
}
