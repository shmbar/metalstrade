'use client'

import { flexRender, getCoreRowModel, getFilteredRowModel, getSortedRowModel, useReactTable } from "@tanstack/react-table"
import { TbSortDescending, TbSortAscending } from "react-icons/tb"
import { usePathname } from 'next/navigation'
import '../../contracts/style.css'
import Tltip from "../../../../components/tlTip"
import { expensesToolTip } from "./funcs"

const Customtable = ({ data, columns, expensesData, settings, title, filt, heading }) => {
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
                    font-family: 'Poppins', system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial !important;
                    font-size: 10px !important; /* Lowered font size */
                    color: #1a3353;
                }
                .glass-table th, .glass-table td {
                    text-align: center !important;
                    vertical-align: middle !important;
                    padding: 8px 6px !important;
                    border: 1px solid #e0e0e0;
                    background: #fff;
                    font-size: clamp(10px, 1vw, 12px); /* Lowered font size */
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
                    color: #183d79 !important;
                    font-weight: 600;
                    font-size: clamp(10px, 1vw, 12px); /* Lowered font size */
                    letter-spacing: 0.05em;
                }
                .glass-table tfoot th, .glass-table tfoot td {
                    background: #eaf4ff;
                    color: #183d79 !important;
                    font-weight: 600;
                    font-size: clamp(10px, 1vw, 12px); /* Lowered font size */
                    text-align: center !important;
                    vertical-align: middle !important;
                }
                .glass-table tbody tr:hover td {
                    background: #e3eafc !important;
                    color: #1a3353 !important;
                    transition: background 0.15s, color 0.15s;
                }
                    .glass-table th,
.glass-table td {
    border-bottom: 1px solid #e0e0e0;
}

.glass-table th {
    border-top: 1px solid #e0e0e0;
}

.glass-table tr:last-child td {
    border-bottom: none;
}
            `}</style>
            {title && (
                <div className="text-base font-bold text-[#1a3353] mb-3 pl-1 pt-2" style={{fontSize: 'clamp(10px, 1vw, 12px)'}}>
                    {title}
                </div>
            )}
            <div className="glass-table rounded-2xl shadow-lg border border-[#e0e0e0] p-2 sm:p-4 mb-6 w-full flex flex-col h-full"
                style={{
                    borderRadius: '16px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                }}>
                {heading && (
                    <div className="text-sm font-semibold text-[#1a3353] mb-3 sm:mb-4 pl-1 pt-1" style={{fontSize: 'clamp(10px, 1vw, 12px)'}}>
                        {heading}
                    </div>
                )}
                {/* LEFT ACCENT BORDER */}
                <div className="" style={{
                    
                }}>
                    {/* Desktop Table View */}
     <div className="hidden sm:block flex-1 rounded-2xl ">

  <div
    className="rounded-2xl"
    style={{
      boxShadow: '0 3px 8px rgba(0,0,0,0.06)'
    }}
  >

    {/* TITLE HEADER (BLUE SECTION) */}
    <div
      className="px-6 py-4 text-center font-semibold"
      style={{
        background: '#e3f3ff',
        color: '#1d3d79',
        fontSize: 'clamp(14px, 1vw, 16px)'
      }}
    >
      {title}
    </div>
                        <table className="w-full glass-table">
                            <thead>
                                {table1.getHeaderGroups().map(hdGroup => (
                                    <tr key={hdGroup.id}>
                                        {hdGroup.headers.map(header => (
                                            <th key={header.id}>
                                                {header.column.getCanSort() ? (
                                                    <div onClick={header.column.getToggleSortingHandler()} className="text-xs flex cursor-pointer items-center gap-1 justify-center">
                                                        {header.column.columnDef.header}
                                                        {{
                                                            asc: <TbSortAscending className="text-[#6366F1] scale-125" />, 
                                                            desc: <TbSortDescending className="text-[#6366F1] scale-125" />
                                                        }[header.column.getIsSorted()]}
                                                    </div>
                                                ) : (
                                                    <span className="text-xs" style={{color:'#183d79'}}>{header.column.columnDef.header}</span>
                                                )}
                                            </th>
                                        ))}
                                    </tr>
                                ))}
                            </thead>
                            <tbody>
                                {table1.getRowModel().rows.map(row => (
                                    <tr key={row.id} className='cursor-pointer'>
                                        {row.getVisibleCells().map(cell => (
                                            <td key={cell.id}>
                                                <Tltip direction='right' tltpText={expensesToolTip(row, expensesData, settings, filt)}>
                                                    <span className="items-center flex outline-none whitespace-normal break-words cursor-default" style={{color:'#005b9f', fontSize:'clamp(12px,1vw,14px)'}}>
                                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                    </span>
                                                </Tltip>
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
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
                            <div key={row.id} className="bg-white border border-[#e0e0e0] rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow">
                                {row.getVisibleCells().map(cell => (
                                    <div key={cell.id} className="flex justify-between items-start py-2 border-b border-[#e0e0e0] last:border-b-0">
                                        <span className="font-semibold uppercase w-2/5 flex-shrink-0"
                                            style={{color:'#183d79', fontSize:'clamp(10px,0.9vw,12px)'}}>
                                            {cell.column.columnDef.header}
                                        </span>
                                        <Tltip direction='left' tltpText={expensesToolTip(row, expensesData, settings, filt)}>
                                            <span className="text-right w-3/5 break-words"
                                                style={{color:'#1a3353', fontSize:'clamp(10px,1vw,12px)'}}>
                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                            </span>
                                        </Tltip>
                                    </div>
                                ))}
                            </div>
                        ))}
                        
                        {/* Mobile Totals */}
                        <div className="rounded-lg p-4 mt-4 space-y-3 glass-table" style={{background:'#eaf4ff', border: '1px solid #e0e0e0'}}>
                            <div className="flex justify-between items-center">
                                <span className="font-bold uppercase"
                                    style={{color:'#183d79', fontSize:'clamp(10px,1vw,12px)'}}>Total $</span>
                                <span className="font-bold"
                                    style={{color:'#183d79', fontSize:'clamp(10px,1vw,12px)'}}>
                                    {showAmount(
                                        data.filter(item => item.cur === "us").reduce((sum, item) => sum * 1 + item.total * 1, 0),
                                        'usd'
                                    )}
                                </span>
                            </div>
                            <div className="flex justify-between items-center border-t border-[#e0e0e0] pt-3">
                                <span className="font-bold uppercase"
                                    style={{color:'#183d79', fontSize:'clamp(10px,1vw,12px)'}}>Total €</span>
                                <span className="font-bold"
                                    style={{color:'#183d79', fontSize:'clamp(10px,1vw,12px)'}}>
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