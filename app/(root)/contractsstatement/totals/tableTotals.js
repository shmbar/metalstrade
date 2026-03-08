'use client'


import { flexRender, getCoreRowModel, getFilteredRowModel, getSortedRowModel, useReactTable } from "@tanstack/react-table";
import { TbSortDescending, TbSortAscending } from "react-icons/tb";
import { usePathname } from 'next/navigation';
import { getTtl } from "../../../../utils/languages";
import Tltip from "../../../../components/tlTip";
import { expensesToolTip } from "./funcs";

const Customtable = ({ data, columns, expensesData, settings }) => {

    const pathname = usePathname()

    const table1 = useReactTable({
        columns, data,
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getSortedRowModel: getSortedRowModel(),

    })

    let showAmount = (x) => {

        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 3
        }).format(x)
    }

    return (
        <div className="w-full max-w-[540px]">
            <style jsx global>{`
                @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600&display=swap');
                .glass-table {
                  background: linear-gradient(135deg, rgba(255,255,255,0.85) 0%, rgba(250,250,250,0.90) 50%, rgba(255,255,255,0.85) 100%);
                  backdrop-filter: blur(16px) saturate(180%);
                  -webkit-backdrop-filter: blur(16px) saturate(180%);
                }
                .custom-table, .custom-table *, .glass-table, .glass-table * {
                  font-family: 'Poppins', system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial;
                  font-size: 10px !important;
                  transition-property: color, background-color, border-color, box-shadow !important;
                  transition-duration: 150ms !important;
                  transition-timing-function: ease-in-out !important;
                }
                .custom-table th, .custom-table td {
                  border: 1px solid #ccc;
                  background-color: #f9f9f9;
                  text-align: center;
                  vertical-align: middle;
                  padding: 6px;
                  border-radius: 4px;
                }
                .custom-table th {
                  background-color: var(--selago);
                }
                .custom-table td {
                  background-color: #fff;
                  border: 1px solid var(--selago);
                }
                .dashboard-scroll::-webkit-scrollbar { width: 10px; height: 10px; }
                .dashboard-scroll::-webkit-scrollbar-track { background: linear-gradient(180deg, #F5F5F5, #FAFAFA); border-radius: 6px; }
                .dashboard-scroll::-webkit-scrollbar-thumb { background: linear-gradient(180deg, #6366F1, #4338CA); border-radius: 6px; border: 2px solid #F5F5F5; }
                .dashboard-scroll::-webkit-scrollbar-thumb:hover { background: linear-gradient(180deg, #A855F7, #7E22CE); border-color: #FAFAFA; }
            `}</style>
            <div className="glass-table rounded-2xl shadow-lg border border-[var(--selago)]">
                {/* Header */}
                <div className="flex justify-between items-center px-4 py-2 rounded-t-2xl" style={{
                    background: 'var(--selago)',
                    borderBottom: '1px solid var(--rock-blue)'
                }}>
                    <h3 className="text-[var(--chathams-blue)] font-semibold text-center w-full"
                        style={{
                            fontSize: 'clamp(11px, 1vw, 13px)',
                            letterSpacing: '0.02em'
                        }}>
                        Summary
                    </h3>
                </div>
                {/* Desktop Table */}
                <div className="overflow-x-auto dashboard-scroll hidden md:block">
                    <table className="custom-table w-full" style={{ tableLayout: 'auto' }}>
                        <thead className="sticky top-0 z-10">
                            {table1.getHeaderGroups().map(hdGroup =>
                                <tr key={hdGroup.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
                                    {hdGroup.headers.map(header => (
                                        <th key={header.id}
                                            className="px-2 py-2 uppercase text-center"
                                            style={{
                                                color: 'var(--chathams-blue)',
                                                minWidth: '60px',
                                                fontSize: 'clamp(10px, 1.0vw, 13px)',
                                                letterSpacing: '0.05em',
                                                textAlign: 'center',
                                            }}
                                        >
                                            {header.column.getCanSort() ?
                                                <div onClick={header.column.getToggleSortingHandler()} className="text-xs flex cursor-pointer items-center gap-1 justify-center">
                                                    {header.column.columnDef.header}
                                                    {{
                                                        asc: <TbSortAscending className="text-[#6366F1] scale-125" />,
                                                        desc: <TbSortDescending className="text-[#6366F1] scale-125" />
                                                    }[header.column.getIsSorted()]}
                                                </div>
                                                :
                                                <span className="text-xs">{header.column.columnDef.header}</span>
                                            }
                                        </th>
                                    ))}
                                </tr>
                            )}
                        </thead>
                        <tbody>
                            {table1.getRowModel().rows.map(row => (
                                <tr key={row.id} className="cursor-pointer">
                                    {row.getVisibleCells().map(cell => (
                                        <td key={cell.id} data-label={cell.column.columnDef.header}
                                            className="px-2 py-2 transition-colors duration-150 group/cell relative cell-hover-effect text-center"
                                            style={{
                                                color: '#1F2937',
                                                fontSize: 'clamp(11px, 1.0vw, 13px)',
                                                fontWeight: '400',
                                                zIndex: 1,
                                                willChange: 'background-color, color',
                                                textAlign: 'center',
                                            }}
                                        >
                                            <Tltip direction='right' tltpText={expensesToolTip(row, expensesData, settings)}>
                                                <span className="text-[11px] items-center flex w-full justify-center outline-none truncate cursor-default">
                                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                </span>
                                            </Tltip>
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr style={{ borderTop: '1px solid var(--rock-blue)', background: 'var(--rock-blue)' }}>
                                <th className="px-2 py-2 font-semibold text-[var(--chathams-blue)] text-center" style={{textAlign:'center', fontSize: 'clamp(11px, 1vw, 13px)'}}>Total</th>
                                <th className="px-2 py-2 font-semibold text-[var(--chathams-blue)] text-center" style={{textAlign:'center', fontSize: 'clamp(11px, 1vw, 13px)'}}>{showAmount(data.reduce((sum, item) => sum + item.poWeight * 1, 0))}</th>
                                <th className="px-2 py-2 font-semibold text-[var(--chathams-blue)] text-center" style={{textAlign:'center', fontSize: 'clamp(11px, 1vw, 13px)'}}>{showAmount(data.reduce((sum, item) => sum + item.shiipedWeight * 1, 0))}</th>
                                <th className="px-2 py-2 font-semibold text-[var(--chathams-blue)] text-center" style={{textAlign:'center', fontSize: 'clamp(11px, 1vw, 13px)'}}>{showAmount(data.reduce((sum, item) => sum + item.remaining * 1, 0))}</th>
                            </tr>
                        </tfoot>
                    </table>
                </div>
                {/* Mobile Card View */}
                <div className="block md:hidden px-2 py-2 space-y-2 dashboard-scroll" style={{ maxHeight: '600px' }}>
                    {table1.getRowModel().rows.map((row, rowIndex) => (
                        <div key={row.id}
                            className="rounded-2xl overflow-hidden shadow-lg transition-colors duration-200"
                            style={{
                                backgroundColor: '#FFFFFF',
                                border: '1px solid #E5E7EB',
                                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.06)'
                            }}
                        >
                            {/* Card Header */}
                            <div className="px-3 py-2 flex items-center justify-between" style={{ background: '#bce1ff' }}>
                                <span className="font-normal" style={{ fontSize: 'clamp(9px, 0.8vw, 10px)', textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)' }}>
                                    {getTtl('Row', settings?.ln || 'en')} {rowIndex + 1}
                                </span>
                            </div>
                            {/* Card Content */}
                            <div className="p-4 space-y-2.5">
                                {row.getVisibleCells().map(cell => (
                                    <div key={cell.id} className="flex flex-col space-y-1.5 pb-2.5 last:pb-0" style={{ borderBottom: '1px solid #E5E7EB' }}>
                                        <div className="uppercase tracking-wider font-normal" style={{ color: '#6B7280', fontSize: 'clamp(6px, 0.6vw, 7px)' }}>
                                            {cell.column.columnDef.header}
                                        </div>
                                        <div className="font-normal break-words px-2 py-1 rounded-xl leading-relaxed min-h-[28px] flex items-center shadow-sm" style={{ color: '#1F2937', background: 'linear-gradient(135deg, #FAFAFA, #F5F5F5)', fontSize: 'clamp(8px, 0.7vw, 10px)', border: '1px solid #E5E7EB' }}>
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                    {/* Mobile Total Row */}
                    <div className="rounded-2xl border-t border-[var(--rock-blue)] bg-[var(--rock-blue)] px-3 py-2 flex flex-col gap-1">
                        <div className="flex justify-between items-center">
                            <span className="font-semibold text-[var(--chathams-blue)] text-xs">Total Quantity</span>
                            <span className="font-semibold text-[var(--chathams-blue)] text-xs">{showAmount(data.reduce((sum, item) => sum + item.poWeight * 1, 0))}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="font-semibold text-[var(--chathams-blue)] text-xs">Total Shipped</span>
                            <span className="font-semibold text-[var(--chathams-blue)] text-xs">{showAmount(data.reduce((sum, item) => sum + item.shiipedWeight * 1, 0))}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="font-semibold text-[var(--chathams-blue)] text-xs">Total Remaining</span>
                            <span className="font-semibold text-[var(--chathams-blue)] text-xs">{showAmount(data.reduce((sum, item) => sum + item.remaining * 1, 0))}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}


export default Customtable;