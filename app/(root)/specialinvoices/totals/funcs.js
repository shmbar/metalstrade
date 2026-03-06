import { NumericFormat } from "react-number-format";
import dateFormat from "dateformat";


export const expensesToolTip = (row, expensesData, settings, filt) => {

    let filteredArr = filt === 'reduced' ?
        expensesData.filter(z => (z.paidNotPaid === 'Not Paid' && z.supplier === row.original.supplier && z.cur === row.original.cur)) :
        expensesData.filter(z => (z.supplier === row.original.supplier && z.cur === row.original.cur))

    return (
        <div style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.85) 0%, rgba(250,250,250,0.90) 50%, rgba(255,255,255,0.85) 100%)',
            backdropFilter: 'blur(16px) saturate(180%)',
            WebkitBackdropFilter: 'blur(16px) saturate(180%)',
            borderRadius: '16px',
            maxHeight: '32rem',
            overflowY: 'auto',
            width: '100%',
            minWidth: 0,
            boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.10)',
            fontFamily: "'Poppins', system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial",
            overflowX: 'hidden',
        }}>
            <table style={{
                fontFamily: 'inherit',
                fontSize: '13px',
                borderCollapse: 'separate',
                borderSpacing: 0,
                width: '100%',
                minWidth: 0,
                tableLayout: 'auto',
                wordBreak: 'break-word',
            }}>
                <thead>
                    <tr style={{
                        border: 'none',
                        background: 'linear-gradient(90deg, #bce1ff 0%, #d4eafc 100%)',
                        color: 'var(--chathams-blue)',
                        fontWeight: 600,
                        fontSize: 'clamp(13px, 1vw, 15px)'
                    }}>
                        <th style={{ textAlign: 'center', padding: '8px', color: 'var(--chathams-blue)', fontWeight: 600, border: '1px solid #e0e0e0', borderTopLeftRadius: '12px', whiteSpace: 'normal' }}>PO#</th>
                        {/* <th style={{ textAlign: 'center', padding: '8px', color: 'var(--chathams-blue)', fontWeight: 600, border: '1px solid #e0e0e0' }}>Supplier</th> */}
                        <th style={{ textAlign: 'center', padding: '8px', color: 'var(--chathams-blue)', fontWeight: 600, border: '1px solid #e0e0e0', whiteSpace: 'normal' }}>Invoice</th>
                        <th style={{ textAlign: 'center', padding: '8px', color: 'var(--chathams-blue)', fontWeight: 600, border: '1px solid #e0e0e0', whiteSpace: 'normal' }}>Description</th>
                        <th style={{ textAlign: 'center', padding: '8px', color: 'var(--chathams-blue)', fontWeight: 600, border: '1px solid #e0e0e0', whiteSpace: 'normal' }}>Amount</th>
                        <th style={{ textAlign: 'center', padding: '8px', color: 'var(--chathams-blue)', fontWeight: 600, border: '1px solid #e0e0e0', whiteSpace: 'normal' }}>Date</th>
                        <th style={{ textAlign: 'center', padding: '8px', color: 'var(--chathams-blue)', fontWeight: 600, border: '1px solid #e0e0e0', borderTopRightRadius: '12px', whiteSpace: 'normal' }}>Payment</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredArr.map((z, i) => (
                        <tr key={i} style={{
                            borderBottom: '1px solid #e0e0e0',
                            background: i % 2 === 0 ? '#fff' : '#f9f9f9',
                            color: '#1a3353',
                            fontSize: 'clamp(12px, 1vw, 14px)',
                            fontWeight: 400,
                            transition: 'background 0.15s, color 0.15s',
                        }}>
                            <td style={{ textAlign: 'center', padding: '8px', border: '1px solid #e0e0e0', whiteSpace: 'normal' }}>{z?.order}</td>
                            {/* <td style={{ textAlign: 'center', padding: '8px', border: '1px solid #e0e0e0', whiteSpace: 'normal' }}>{settings.Supplier.Supplier.find(q => q.id === z.supplier)?.nname}</td> */}
                            <td style={{ textAlign: 'center', padding: '8px', border: '1px solid #e0e0e0', whiteSpace: 'normal' }}>{z.invoice}</td>
                            <td style={{ textAlign: 'center', padding: '8px', border: '1px solid #e0e0e0', whiteSpace: 'normal' }}>{z.description}</td>
                            <td style={{ textAlign: 'center', padding: '8px', border: '1px solid #e0e0e0', whiteSpace: 'normal' }}>
                                <NumericFormat
                                    value={z.total}
                                    displayType="text"
                                    thousandSeparator
                                    allowNegative={true}
                                    prefix={z.cur === 'us' ? '$' : '€'}
                                    decimalScale='3'
                                    fixedDecimalScale
                                    className='text-[13px]'
                                />
                            </td>
                            <td style={{ textAlign: 'center', padding: '8px', border: '1px solid #e0e0e0', whiteSpace: 'normal' }}>
                                {dateFormat(z.date, 'dd-mmm-yy')}
                            </td>
                            <td style={{ textAlign: 'center', padding: '8px', border: '1px solid #e0e0e0', whiteSpace: 'normal' }}>
                                {z.paidNotPaid}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}
