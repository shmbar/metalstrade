import { NumericFormat } from "react-number-format";
import dateFormat from "dateformat";

export const expensesToolTip = (row, expensesData, settings, filt) => {

    let filteredArr = filt === 'reduced' ? expensesData.filter(z => z.paid === '222') : expensesData;
    filteredArr = filteredArr.filter(z => (z.supplier === row.original.supplier && z.cur === row.original.cur))

    return (
        <div
            style={{
                fontFamily: "'Poppins', system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial",
                fontSize: '9px', // Smaller font size
                background: 'linear-gradient(135deg, #f9f9f9 0%, #eaf6ff 100%)',
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(99,102,241,0.08)',
                maxHeight: 'none', // Remove scroll limit
                overflow: 'visible', // No scrollbars
                padding: '0',
                minWidth: '400px', // Optional: ensure table fits
            }}
        >
            <table style={{
                width: '100%',
                tableLayout: 'fixed',
                borderCollapse: 'collapse',
                border: '1px solid #e0e0e0',
                borderRadius: '4px',
                margin: 0,
            }}>
                <thead>
                    <tr style={{
                        background: 'linear-gradient(90deg, #d4eafc, #bce1fe)',
                    }}>
                        {['PO#', 'Expense Invoice', 'Expense Type', 'Amount', 'Date', 'Payment'].map((header, idx) => (
                            <th
                                key={idx}
                                style={{
                                    textAlign: 'center',
                                    padding: '3px 2px', // Compact padding
                                    color: '#183d79',
                                    fontWeight: 600,
                                    fontSize: '9px', // Smaller font
                                    letterSpacing: '0.05em',
                                    textTransform: 'uppercase',
                                    wordBreak: 'break-word',
                                    border: '1px solid #ccc',
                                    minWidth: '60px',
                                    maxWidth: '120px',
                                }}
                            >
                                {header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {filteredArr.map((z, i) => (
                        <tr
                            key={i}
                            style={{
                                borderBottom: '1px solid #e0e0e0',
                                background: i % 2 === 0 ? '#fff' : '#f9f9f9',
                                color: '#1F2937',
                                transition: 'background 150ms ease-in-out'
                            }}
                        >
                            <td style={{
                                textAlign: 'center',
                                padding: '3px 2px',
                                color: '#1F2937',
                                fontWeight: 400,
                                wordBreak: 'break-word',
                                fontSize: '9px',
                            }}>
                                {z.poSupplier?.order ?? 'Comp. Exp.'}
                            </td>
                            <td style={{
                                textAlign: 'center',
                                padding: '3px 2px',
                                color: '#1F2937',
                                fontWeight: 400,
                                wordBreak: 'break-word',
                                fontSize: '9px',
                            }}>
                                {z.expense}
                            </td>
                            <td style={{
                                textAlign: 'center',
                                padding: '3px 2px',
                                color: '#1F2937',
                                fontWeight: 400,
                                wordBreak: 'break-word',
                                fontSize: '9px',
                            }}>
                                {settings.Expenses.Expenses.find(q => q.id === z.expType)?.expType}
                            </td>
                            <td style={{
                                textAlign: 'center',
                                padding: '3px 2px',
                                color: '#183d79',
                                fontWeight: 500,
                                wordBreak: 'break-word',
                                fontSize: '9px',
                            }}>
                                <NumericFormat
                                    value={z.amount}
                                    displayType="text"
                                    thousandSeparator
                                    allowNegative={true}
                                    prefix={z.cur === 'us' ? '$' : '€'}
                                    decimalScale={3}
                                    fixedDecimalScale
                                    style={{
                                        fontSize: '9px',
                                        color: '#183d79',
                                        fontWeight: 500,
                                        wordBreak: 'break-word',
                                    }}
                                />
                            </td>
                            <td style={{
                                textAlign: 'center',
                                padding: '3px 2px',
                                color: '#1F2937',
                                fontWeight: 400,
                                wordBreak: 'break-word',
                                fontSize: '9px',
                            }}>
                                {dateFormat(z.date, 'dd-mmm-yy')}
                            </td>
                            <td style={{
                                textAlign: 'center',
                                padding: '3px 2px',
                                color: '#1F2937',
                                fontWeight: 400,
                                wordBreak: 'break-word',
                                fontSize: '9px',
                            }}>
                                {z.paid === '111' ? 'Paid' : 'Unpaid'}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}
