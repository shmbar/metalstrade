import { NumericFormat } from "react-number-format";
import dateFormat from "dateformat";


export const expensesToolTip = (row, expensesData, settings) => {

    let filteredArr = expensesData.filter(z => (z.supplier === row.original.supplier && z.cur === row.original.cur))
    return (
        <div style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.85) 0%, rgba(250,250,250,0.90) 50%, rgba(255,255,255,0.85) 100%)',
            backdropFilter: 'blur(16px) saturate(180%)',
            WebkitBackdropFilter: 'blur(16px) saturate(180%)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '100%',
            boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.10)',
            fontFamily: "'Poppins', system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial",
            padding: '0.5rem',
        }}>
            <table style={{ fontFamily: 'inherit', fontSize: 'clamp(6px, 0.5vw, 9px)', borderCollapse: 'separate', borderSpacing: 0, width: '100%', tableLayout: 'auto' }}>
                <thead>
                    <tr style={{
                        border: 'none',
                        background: 'linear-gradient(90deg, #bce1ff 0%, #d4eafc 100%)',
                        color: 'var(--chathams-blue)',
                        fontWeight: 500,
                        fontSize: 'clamp(7px, 0.7vw, 10px)'
                    }}>
                        <th style={{ textAlign: 'center', padding: '4px', color: 'var(--chathams-blue)', fontWeight: 600, border: '1px solid #e0e0e0', borderTopLeftRadius: '12px', overflow: 'hidden', textOverflow: 'ellipsis', wordBreak: 'break-word', whiteSpace: 'normal' }}>PO#</th>
                        <th style={{ textAlign: 'center', padding: '4px', color: 'var(--chathams-blue)', fontWeight: 600, border: '1px solid #e0e0e0', overflow: 'hidden', textOverflow: 'ellipsis', wordBreak: 'break-word', whiteSpace: 'normal' }}>Description</th>
                        <th style={{ textAlign: 'center', padding: '4px', color: 'var(--chathams-blue)', fontWeight: 600, border: '1px solid #e0e0e0', overflow: 'hidden', textOverflow: 'ellipsis', wordBreak: 'break-word', whiteSpace: 'normal' }}>Quantity</th>
                        <th style={{ textAlign: 'center', padding: '4px', color: 'var(--chathams-blue)', fontWeight: 600, border: '1px solid #e0e0e0', overflow: 'hidden', textOverflow: 'ellipsis', wordBreak: 'break-word', whiteSpace: 'normal' }}>Shipped Weight</th>
                        <th style={{ textAlign: 'center', padding: '4px', color: 'var(--chathams-blue)', fontWeight: 600, border: '1px solid #e0e0e0', overflow: 'hidden', textOverflow: 'ellipsis', wordBreak: 'break-word', whiteSpace: 'normal' }}>Remaining Weight</th>
                        <th style={{ textAlign: 'center', padding: '4px', color: 'var(--chathams-blue)', fontWeight: 600, border: '1px solid #e0e0e0', borderTopRightRadius: '12px', overflow: 'hidden', textOverflow: 'ellipsis', wordBreak: 'break-word', whiteSpace: 'normal' }}>Amount</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredArr.map((z, i) => (
                        <tr key={i} style={{
                            borderBottom: '1px solid #e0e0e0',
                            background: i % 2 === 0 ? '#fff' : '#f9f9f9',
                            color: '#1F2937',
                            fontSize: 'clamp(7px, 0.7vw, 10px)',
                            fontWeight: 400,
                            transition: 'background 0.15s, color 0.15s',
                        }}
                        >
                            <td style={{ textAlign: 'center', padding: '4px', border: '1px solid #e0e0e0', overflow: 'hidden', textOverflow: 'ellipsis', wordBreak: 'break-word', whiteSpace: 'normal' }}>{z.order}</td>
                            <td style={{ textAlign: 'center', padding: '4px', border: '1px solid #e0e0e0', overflow: 'hidden', textOverflow: 'ellipsis', wordBreak: 'break-word', whiteSpace: 'normal' }}>{z.description}</td>
                            <td style={{ textAlign: 'center', padding: '4px', border: '1px solid #e0e0e0', overflow: 'hidden', textOverflow: 'ellipsis', wordBreak: 'break-word', whiteSpace: 'normal' }}>{z.poWeight}</td>
                            <td style={{ textAlign: 'center', padding: '8px', border: '1px solid #e0e0e0' }}>
                                {z.shiipedWeight === 0 ? 0 :
                                    <NumericFormat
                                        value={z.shiipedWeight}
                                        displayType="text"
                                        thousandSeparator
                                        allowNegative={true}
                                        decimalScale='3'
                                        fixedDecimalScale
                                        className='text-[11px]'
                                    />
                                }
                            </td>
                            <td style={{ textAlign: 'center', padding: '8px', border: '1px solid #e0e0e0' }}>
                                {z.remaining === 0 ? 0 :
                                    <NumericFormat
                                        value={z.remaining}
                                        displayType="text"
                                        thousandSeparator
                                        allowNegative={true}
                                        decimalScale='3'
                                        fixedDecimalScale
                                        className='text-[11px]'
                                    />
                                }
                            </td>
                            <td style={{ textAlign: 'center', padding: '8px', border: '1px solid #e0e0e0' }}>
                                <NumericFormat
                                    value={z.amount}
                                    displayType="text"
                                    thousandSeparator
                                    allowNegative={true}
                                    prefix={z.cur === 'us' ? '$' : '€'}
                                    decimalScale='3'
                                    fixedDecimalScale
                                    className='text-[11px]'
                                />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
