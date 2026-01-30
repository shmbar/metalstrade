import { sortArr } from "@utils/utils"
import { NumericFormat } from "react-number-format";
import dateFormat from "dateformat";



export const detailsToolTip = (row, data, settings, dataTable,) => {
 
    let id = settings.Stocks.Stocks.find(z => z.nname === row.original.stock)?.id
    let filteredArr = dataTable.filter(z => z.stock === id)

    return (
        <div style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.85) 0%, rgba(250,250,250,0.90) 50%, rgba(255,255,255,0.85) 100%)',
            backdropFilter: 'blur(16px) saturate(180%)',
            WebkitBackdropFilter: 'blur(16px) saturate(180%)',
            borderRadius: '16px',
            maxHeight: '28rem',
            overflowY: 'auto',
            width: '100%',
            minWidth: 0,
            boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.10)',
            fontFamily: "'Poppins', system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial"
        }}>
            <table style={{
                fontFamily: 'inherit',
                fontSize: '11px',
                width: '100%',
                borderCollapse: 'separate',
                borderSpacing: 0,
                tableLayout: 'auto',
                minWidth: 0,
                wordBreak: 'break-word',
            }}>
                <thead>
                    <tr style={{
                        border: 'none',
                        background: 'linear-gradient(90deg, #bce1ff 0%, #d4eafc 100%)',
                        color: '#183d79',
                        fontWeight: 500,
                        fontSize: 'clamp(10px, 1vw, 13px)'
                    }}>
                        <th style={{ textAlign: 'center', padding: '8px', color: '#183d79', fontWeight: 600, border: '1px solid #e0e0e0', borderTopLeftRadius: '12px' }}>PO#</th>
                        <th style={{ textAlign: 'center', padding: '8px', color: '#183d79', fontWeight: 600, border: '1px solid #e0e0e0' }}>Supplier</th>
                        <th style={{ textAlign: 'center', padding: '8px', color: '#183d79', fontWeight: 600, border: '1px solid #e0e0e0' }}>Description</th>
                        <th style={{ textAlign: 'center', padding: '8px', color: '#183d79', fontWeight: 600, border: '1px solid #e0e0e0' }}>Quantity</th>
                        <th style={{ textAlign: 'center', padding: '8px', color: '#183d79', fontWeight: 600, border: '1px solid #e0e0e0' }}>Unit Price</th>
                        <th style={{ textAlign: 'center', padding: '8px', color: '#183d79', fontWeight: 600, border: '1px solid #e0e0e0', borderTopRightRadius: '12px' }}>Total</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredArr.map((z, i) => (
                        <tr key={i} style={{
                            borderBottom: '1px solid #e0e0e0',
                            background: i % 2 === 0 ? '#fff' : '#f9f9f9',
                            color: '#1F2937',
                            fontSize: 'clamp(11px, 1vw, 13px)',
                            fontWeight: 400,
                            transition: 'background 0.15s, color 0.15s',
                        }}
                        >
                            <td style={{ textAlign: 'center', padding: '8px', border: '1px solid #e0e0e0' }}>{z.order}</td>
                            <td style={{ textAlign: 'center', padding: '8px', border: '1px solid #e0e0e0' }}>{settings.Supplier.Supplier.find(q => q.id === z.supplier)?.nname}</td>
                            <td style={{ textAlign: 'center', padding: '8px', border: '1px solid #e0e0e0' }}>{z.descriptionName}</td>
                            <td style={{ textAlign: 'center', padding: '8px', border: '1px solid #e0e0e0' }}>
                                <NumericFormat
                                    value={z.qnty}
                                    displayType="text"
                                    thousandSeparator
                                    allowNegative={true}
                                    decimalScale='3'
                                    fixedDecimalScale
                                    className='text-[11px]'
                                />
                            </td>
                            <td style={{ textAlign: 'center', padding: '8px', border: '1px solid #e0e0e0' }}>
                                <NumericFormat
                                    value={z.unitPrc}
                                    displayType="text"
                                    thousandSeparator
                                    allowNegative={true}
                                    prefix={z.cur === 'us' ? '$' : '€'}
                                    decimalScale='2'
                                    fixedDecimalScale
                                    className='text-[11px]'
                                />
                            </td>
                            <td style={{ textAlign: 'center', padding: '8px', border: '1px solid #e0e0e0' }}>
                                <NumericFormat
                                    value={z.total}
                                    displayType="text"
                                    thousandSeparator
                                    allowNegative={true}
                                    prefix={z.cur === 'us' ? '$' : '€'}
                                    decimalScale='2'
                                    fixedDecimalScale
                                    className='text-[11px]'
                                />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )//stock; 
}
