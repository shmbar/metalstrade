'use client'

import Header from "../../../components/table/header";
import { flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable } from "@tanstack/react-table"
import { useMemo, useState, useContext } from "react"
import { MdDeleteOutline } from "react-icons/md";
import { SettingsContext } from "../../../contexts/useSettingsContext";
import { usePathname } from "next/navigation";
import { getTtl } from "../../../utils/languages";
import { Filter } from "../../../components/table/filters/filterFunc";

const Customtable = ({ data, columns }) => {
    const [globalFilter, setGlobalFilter] = useState('')
    const [filterOn, setFilterOn] = useState(false)
    const [{ pageIndex, pageSize }, setPagination] = useState({ pageIndex: 0, pageSize: 500, })
    const pagination = useMemo(() => ({ pageIndex, pageSize, }), [pageIndex, pageSize])
    const pathName = usePathname()
    const { ln } = useContext(SettingsContext);
    const [columnFilters, setColumnFilters] = useState([])

    const table = useReactTable({
        columns, data,
        getCoreRowModel: getCoreRowModel(),
        filterFns: {},
        state: {
            globalFilter,
            pagination,
            columnFilters
        },
        onColumnFiltersChange: setColumnFilters,
        getFilteredRowModel: getFilteredRowModel(),
        onGlobalFilterChange: setGlobalFilter,
        getSortedRowModel: getSortedRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        onPaginationChange: setPagination,
    })

    // Fade-in animation for badges (as in contracts table)
    if (typeof window !== 'undefined') {
        const style = document.createElement('style');
        style.innerHTML = `@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }`;
        document.head.appendChild(style);
    }

    return (
        <div className="w-full">
            <style jsx global>{`
                @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600&display=swap');
                .dashboard-scroll::-webkit-scrollbar { width: 10px; height: 10px; }
                .dashboard-scroll::-webkit-scrollbar-track { 
                  background: linear-gradient(180deg, #F8F8F8, #F0F0F0); 
                  border-radius: 6px; 
                }
                .dashboard-scroll::-webkit-scrollbar-thumb { 
                  background: linear-gradient(180deg, #E0E0E0, #CCCCCC); 
                  border-radius: 6px; 
                  border: 2px solid #F8F8F8;
                }
                .dashboard-scroll::-webkit-scrollbar-thumb:hover { 
                  background: linear-gradient(180deg, #CCCCCC, #B0B0B0);
                  border-color: #F0F0F0;
                }
                .glass-table {
                  background: linear-gradient(135deg, 
                    rgba(255, 255, 255, 0.85) 0%, 
                    rgba(250, 250, 250, 0.90) 50%,
                    rgba(255, 255, 255, 0.85) 100%
                  );
                  backdrop-filter: blur(16px) saturate(180%);
                  -webkit-backdrop-filter: blur(16px) saturate(180%);
                }
                .custom-table, .custom-table *, .glass-table, .glass-table * {
                  font-family: 'Poppins', system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial;
                  transition-property: color, background-color, border-color, box-shadow !important;
                  transition-duration: 150ms !important;
                  transition-timing-function: ease-in-out !important;
                }
                .custom-table th {
                  border: 1px solid var(--rock-blue);
                  background-color: var(--selago);
                  text-align: center;
                  vertical-align: middle;
                  padding: 6px;
                  font-size: 12px !important;
                }
                .custom-table td {
                  border: 1px solid var(--rock-blue);
                  background-color: #ede9fe;
                  text-align: center;
                  vertical-align: middle;
                  padding: 6px;
                  font-size: 10px !important;
                }
            `}</style>
            <div className="custom-table">
                <div className="overflow-auto dashboard-scroll rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] bg-white md:max-h-[310px] 2xl:max-h-[550px]">
                    <table className="w-full min-w-[600px] hidden sm:table" style={{ tableLayout: 'auto' }}>
                        <thead className="hidden"></thead>
                        <tbody>
                            {table.getRowModel().rows.map((row, rowIdx) => (
                                <tr key={row.id} className="cursor-pointer">
                                    {row.getVisibleCells().map(cell => {
                                        if (cell.column.id === 'del') return null;
                                        return (
                                        <td
                                            key={cell.id}
                                            data-label={cell.column.columnDef.header}
                                            className="px-2 py-2 transition-colors duration-150"
                                            style={{
                                                color: '#1F2937',
                                                minWidth: cell.column.id === 'material' ? '120px' : '60px',
                                                maxWidth: cell.column.id === 'material' ? '200px' : '90px',
                                                fontWeight: '400',
                                            }}
                                        >
                                            <div
                                                className="px-2 py-1 text-[11px] font-semibold flex items-center justify-center min-w-[70px] text-center whitespace-nowrap rounded-lg"
                                                style={{ color: 'var(--chathams-blue)' }}
                                            >
                                                {cell.column.id === 'material'
                                                    ? 'Total'
                                                    : new Intl.NumberFormat('en-US', { minimumFractionDigits: 2 }).format(cell.getContext().getValue())}
                                            </div>
                                        </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    
                    {/* Mobile stacked table */}
                    <div className="sm:hidden flex flex-col gap-4 p-4">
                        {table.getRowModel().rows.map((row, rowIndex) => (
                            <div
                                key={row.id}
                                className="rounded-2xl overflow-hidden shadow-lg transition-colors duration-200"
                                style={{
                                    backgroundColor: '#FFFFFF',
                                    border: '1px solid #E5E7EB',
                                }}
                            >
                                <div
                                    className="px-3 py-2 flex items-center justify-between"
                                    style={{
                                        background: '#bce1ff',
                                    }}
                                >
                                    <span
                                        className="font-normal"
                                        style={{
                                            fontSize: 'clamp(9px, 0.8vw, 10px)',
                                            textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)'
                                        }}
                                    >
                                        Row {rowIndex + 1}
                                    </span>
                                </div>
                                <div className="p-4 space-y-2.5">
                                    {row.getVisibleCells().map((cell) => {
                                        if (cell.column.id === 'del') return null;
                                        return (
                                            <div
                                                key={cell.id}
                                                className="flex flex-col space-y-1.5 pb-2.5 last:pb-0"
                                                style={{ borderBottom: '1px solid #E5E7EB' }}
                                            >
                                                <div
                                                    className="uppercase tracking-wider font-normal"
                                                    style={{
                                                        color: '#6B7280',
                                                        fontSize: 'clamp(6px, 0.6vw, 7px)'
                                                    }}
                                                >
                                                    {cell.column.columnDef.header}
                                                </div>
                                                <div
                                                    className="font-normal break-words px-2 py-1 rounded-xl leading-relaxed min-h-[28px] flex items-center shadow-sm"
                                                    style={{
                                                        color: '#1F2937',
                                                        background: 'linear-gradient(135deg, #FAFAFA, #F5F5F5)',
                                                        fontSize: 'clamp(8px, 0.7vw, 10px)',
                                                        border: '1px solid #E5E7EB'
                                                    }}
                                                >
                                                    {cell.column.id !== 'material'
                                                        ? new Intl.NumberFormat('en-US', { minimumFractionDigits: 2 }).format(cell.getContext().getValue())
                                                        : cell.getContext().getValue()}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Customtable;