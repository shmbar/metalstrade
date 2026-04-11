'use client'

import { flexRender, getCoreRowModel, getFilteredRowModel, getSortedRowModel, useReactTable } from "@tanstack/react-table"
import { TbSortDescending, TbSortAscending } from "react-icons/tb"
import '../../contracts/style.css'
import Tltip from "../../../../components/tlTip"
import { expensesToolTip } from "./funcs"

const Customtable = ({ data, columns, expensesData, settings, title, filt, heading, totalsOnly }) => {
    const table1 = useReactTable({
        columns, 
        data,
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getSortedRowModel: getSortedRowModel(),
    })

    let showAmount = (x, y) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: y,
            minimumFractionDigits: 2
        }).format(x)
    }

    return (
        <div className="w-full max-w-full flex flex-col items-stretch px-2 sm:px-0 h-full">
            <style jsx global>{`
                @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600&display=swap');
                .glass-table, .glass-table * {
                    font-family: var(--font-poppins), 'Geist', sans-serif !important;
                    color: var(--chathams-blue);
                }
                .glass-table th, .glass-table td {
                    text-align: center !important;
                    vertical-align: middle !important;
                    padding: 8px 6px !important;
                    border: none;
                    border-bottom: 1px solid #E5E7EB;
                    background: #fff;
                }
                .glass-table th > *, .glass-table td > * {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    width: 100%;
                    height: 100%;
                    text-align: center;
                }
                .glass-table th {
                    color: var(--chathams-blue) !important;
                    font-weight: 500;
                    letter-spacing: 0.05em;
                }
                .glass-table tfoot th, .glass-table tfoot td {
                    background: #dbeeff;
                    color: var(--chathams-blue) !important;
                    font-weight: 500;
                    text-align: center !important;
                    vertical-align: middle !important;
                }
                .glass-table tbody tr:hover td {
                    background: var(--selago) !important;
                    color: var(--chathams-blue) !important;
                    transition: background 0.15s, color 0.15s;
                }
                    .glass-table th,
.glass-table td {
    border-bottom: 1px solid #E5E7EB;
}

.glass-table th {
    border-top: 1px solid #E5E7EB;
}

.glass-table tr:last-child td {
    border-bottom: none;
}
            `}</style>
           
            <div className="glass-table rounded-2xl shadow-lg border border-[var(--selago)] p-2 sm:p-4 mb-6 w-full flex flex-col h-full"
                style={{
                    borderRadius: '16px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                }}>
                {heading && (
                    <div className="font-normal font-poppins text-[var(--chathams-blue)] mb-3 sm:mb-4 pl-1 pt-1">
                        {heading}
                    </div>
                )}
                {/* LEFT ACCENT BORDER */}
                <div className="" style={{
                    
                }}>
                    {/* Desktop Table View */}
                 <div className="hidden sm:block flex-1 rounded-2xl ">

                        <div
                        className="rounded-2xl overflow-hidden border border-[var(--selago)]"
                        style={{
                            borderRadius: '16px',
                            boxShadow: '0 3px 8px rgba(0,0,0,0.06)',
                            background: '#ffffff'
                        }}
                        >

                        <div
                        className="responsiveTextTable px-6 py-4 text-center font-medium font-poppins"
                        style={{
                            background: '#dbeeff',
                            color: 'var(--endeavour)'
                        }}
                        >
                        {title}
                        </div>
                        <table className="w-full glass-table" style={{ borderCollapse: 'collapse' }}>
                            {!totalsOnly && (
                                <thead>
                                    {table1.getHeaderGroups().map(hdGroup => (
                                        <tr key={hdGroup.id}>
                                            {hdGroup.headers.map(header => (
                                                <th key={header.id}>
                                                    {header.column.getCanSort() ? (
                                                        <div onClick={header.column.getToggleSortingHandler()} className="responsiveTextTable flex cursor-pointer items-center gap-1 justify-center text-[var(--endeavour)]">
                                                            {header.column.columnDef.header}
                                                            {{
                                                                asc: <TbSortAscending className="text-[var(--endeavour)] scale-125" />,
                                                                desc: <TbSortDescending className="text-[var(--endeavour)] scale-125" />
                                                            }[header.column.getIsSorted()]}
                                                        </div>
                                                    ) : (
                                                        <span className="responsiveTextTable" style={{color:'var(--endeavour)'}}>{header.column.columnDef.header}</span>
                                                    )}
                                                </th>
                                            ))}
                                        </tr>
                                    ))}
                                </thead>
                            )}
                            {!totalsOnly && (
                                <tbody>
                                    {table1.getRowModel().rows.map(row => (
                                        <tr key={row.id} className='cursor-pointer'>
                                            {row.getVisibleCells().map(cell => (
                                                <td key={cell.id}>
                                                    <Tltip direction='right' tltpText={expensesToolTip(row, expensesData, settings, filt)}>
                                                        <span className="responsiveTextTable items-center flex outline-none whitespace-normal break-words cursor-default" style={{color:'var(--endeavour)'}}>
                                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                        </span>
                                                    </Tltip>
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            )}
                            <tfoot>
                                <tr>
                                    <th>
                                        Total $
                                    </th>
                                    <th>
                                        {showAmount(
                                            data.filter(item => item.cur === "us").reduce((sum, item) => sum * 1 + item.total * 1, 0),
                                            'usd'
                                        )}
                                    </th>
                                </tr>
                                <tr>
                                    <th>
                                        Total €
                                    </th>
                                    <th>
                                        {showAmount(
                                            data.filter(item => item.cur === "eu").reduce((sum, item) => sum + item.total, 0),
                                            'eur'
                                        )}
                                    </th>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                    </div>

                    {/* Mobile Card View */}
                    <div className="block sm:hidden space-y-3 glass-table">
                        {table1.getRowModel().rows.map(row => (
                            <div key={row.id} className="bg-white border border-[var(--selago)] rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow">
                                {row.getVisibleCells().map(cell => (
                                    <div key={cell.id} className="flex justify-between items-start py-2 border-b border-[var(--selago)] last:border-b-0">
                                        <span className="responsiveTextTable font-semibold uppercase w-2/5 flex-shrink-0" style={{color:'var(--chathams-blue)'}}>
                                            {cell.column.columnDef.header}
                                        </span>
                                        <Tltip direction='left' tltpText={expensesToolTip(row, expensesData, settings, filt)}>
                                            <span className="responsiveTextTable text-right w-3/5 break-words" style={{color:'var(--chathams-blue)'}}>
                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                            </span>
                                        </Tltip>
                                    </div>
                                ))}
                            </div>
                        ))}
                        
                        {/* Mobile Totals */}
                        <div className="rounded-lg p-4 mt-4 space-y-3 glass-table" style={{background:'var(--selago)', border: '1px solid var(--selago)'}}>
                            <div className="flex justify-between items-center">
                                <span className="responsiveTextTable font-medium uppercase" style={{color:'var(--chathams-blue)'}}>Total $</span>
                                <span className="responsiveTextTable font-medium" style={{color:'var(--chathams-blue)'}}>
                                    {showAmount(
                                        data.filter(item => item.cur === "us").reduce((sum, item) => sum * 1 + item.total * 1, 0),
                                        'usd'
                                    )}
                                </span>
                            </div>
                            <div className="flex justify-between items-center border-t border-[var(--selago)] pt-3">
                                <span className="responsiveTextTable font-medium uppercase" style={{color:'var(--chathams-blue)'}}>Total €</span>
                                <span className="responsiveTextTable font-medium" style={{color:'var(--chathams-blue)'}}>
                                    {showAmount(
                                        data.filter(item => item.cur === "eu").reduce((sum, item) => sum + item.total, 0),
                                        'eur'
                                    )}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Customtable;