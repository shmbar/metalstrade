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
                .glass-table {
                  background: linear-gradient(135deg, rgba(var(--surface-card-rgb),0.85) 0%, rgba(var(--surface-base-rgb),0.90) 50%, rgba(var(--surface-card-rgb),0.85) 100%);
                }
                .custom-table, .custom-table *, .glass-table, .glass-table * {
                  font-family: var(--font-poppins), 'Poppins', sans-serif;
                  transition-property: color, background-color, border-color, box-shadow !important;
                  transition-duration: 150ms !important;
                  transition-timing-function: ease-in-out !important;
                }
                .custom-table th, .custom-table td {
                  border: 1px solid var(--selago);
                  background-color: var(--surface-pill);
                  text-align: center;
                  vertical-align: middle;
                  padding: 6px;
                }
                .custom-table th {
                  background-color: var(--surface-header);
                }
                .custom-table td {
                  font-size: var(--fs-table);   /* dense-cell rung; was a hardcoded 9px */
                  background-color: var(--surface-card);
                  border: 1px solid var(--selago);
                }
                .dashboard-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
                .dashboard-scroll::-webkit-scrollbar-track { background: var(--selago); border-radius: 6px; }
                .dashboard-scroll::-webkit-scrollbar-thumb { background: var(--rock-blue); border-radius: 6px; }
                .dashboard-scroll::-webkit-scrollbar-thumb:hover { background: var(--endeavour); }
            `}</style>
            <div className="glass-table rounded-2xl shadow-lg border border-[var(--border-divider)] overflow-hidden">
                {/* Header */}
                <div className="flex justify-between items-center px-4 py-2 rounded-t-2xl" style={{
                    background: 'var(--surface-header)',
                    borderBottom: '1px solid var(--rock-blue)'
                }}>
                    <h3 className="responsiveTextTableTitle text-[var(--chathams-blue)] font-normal font-poppins text-center w-full"
                        style={{
                            letterSpacing: '0.02em'
                        }}>
                        Summary
                    </h3>
                </div>
                {/* Desktop Table */}
                <div className="overflow-x-auto dashboard-scroll hidden md:block">
                    <table className="custom-table w-full" style={{ tableLayout: 'auto' }}>
                        <thead className="sticky top-0 z-sticky">
                            {table1.getHeaderGroups().map(hdGroup =>
                                <tr key={hdGroup.id} style={{ borderBottom: '1px solid rgba(var(--surface-card-rgb), 0.2)' }}>
                                    {hdGroup.headers.map(header => (
                                        <th key={header.id}
                                            className="responsiveTextTable px-2 py-2 text-center font-normal font-poppins"
                                            style={{
                                                color: 'var(--chathams-blue)',
                                                minWidth: '60px',
                                                textAlign: 'center',
                                            }}
                                        >
                                            {header.column.getCanSort() ?
                                                <div onClick={header.column.getToggleSortingHandler()} className="responsiveTextTable flex cursor-pointer items-center gap-1 justify-center">
                                                    {header.column.columnDef.header}
                                                    {{
                                                        asc: <TbSortAscending className="text-[var(--endeavour)] scale-125" />,
                                                        desc: <TbSortDescending className="text-[var(--endeavour)] scale-125" />
                                                    }[header.column.getIsSorted()]}
                                                </div>
                                                :
                                                <span className="responsiveTextTable">{header.column.columnDef.header}</span>
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
                                            className="responsiveTextTable px-2 py-1 transition-colors duration-150 group/cell relative cell-hover-effect text-center"
                                            style={{
                                                color: 'var(--port-gore)',
                                                fontWeight: '400',
                                                zIndex: 1,
                                                willChange: 'background-color, color',
                                                textAlign: 'center',
                                            }}
                                        >
                                            <Tltip direction='right' tltpText={expensesToolTip(row, expensesData, settings)}>
                                                <span className="responsiveTextTable items-center flex w-full justify-center outline-none truncate cursor-default">
                                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                </span>
                                            </Tltip>
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr style={{ borderTop: '1px solid var(--rock-blue)', background: 'var(--surface-header)' }}>
                                <th className="responsiveTextTable px-2 py-2 font-normal text-[var(--chathams-blue)] text-center">Total</th>
                                <th className="responsiveTextTable px-2 py-2 font-normal text-[var(--chathams-blue)] text-center">{showAmount(data.reduce((sum, item) => sum + item.poWeight * 1, 0))}</th>
                                <th className="responsiveTextTable px-2 py-2 font-normal text-[var(--chathams-blue)] text-center">{showAmount(data.reduce((sum, item) => sum + item.shiipedWeight * 1, 0))}</th>
                                <th className="responsiveTextTable px-2 py-2 font-normal text-[var(--chathams-blue)] text-center">{showAmount(data.reduce((sum, item) => sum + item.remaining * 1, 0))}</th>
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
                                backgroundColor: 'var(--surface-card)',
                                border: '1px solid var(--border-divider)',
                                boxShadow: '0 4px 12px rgba(var(--shadow-rgb), 0.06)'
                            }}
                        >
                            {/* Card Header */}
                            <div className="px-3 py-2 flex items-center justify-between" style={{ background: 'var(--border-divider)' }}>
                                <span className="font-normal" style={{ fontSize: 'var(--fs-table)', textShadow: '0 1px 2px rgba(var(--shadow-rgb), 0.2)' }}>
                                    {getTtl('Row', settings?.ln || 'en')} {rowIndex + 1}
                                </span>
                            </div>
                            {/* Card Content */}
                            <div className="p-4 space-y-2.5">
                                {row.getVisibleCells().map(cell => (
                                    <div key={cell.id} className="flex flex-col space-y-1.5 pb-2.5 last:pb-0" style={{ borderBottom: '1px solid var(--border-divider)' }}>
                                        <div className="uppercase tracking-wider font-normal" style={{ color: 'var(--regent-gray)', fontSize: 'var(--fs-caption)' }}>
                                            {cell.column.columnDef.header}
                                        </div>
                                        <div className="font-normal break-words px-2 py-1 rounded-2xl leading-relaxed min-h-7 flex items-center shadow-sm" style={{ color: 'var(--port-gore)', background: 'linear-gradient(135deg, var(--surface-base), var(--surface-muted))', fontSize: 'var(--fs-table)', border: '1px solid var(--border-divider)' }}>
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                    {/* Mobile Total Row */}
                    <div className="rounded-2xl border-t border-[var(--rock-blue)] px-3 py-2 flex flex-col gap-1" style={{ background: 'var(--surface-header)' }}>
                        <div className="flex justify-between items-center">
                            <span className="responsiveTextTable font-normal text-[var(--chathams-blue)]">Total Quantity</span>
                            <span className="responsiveTextTable font-normal text-[var(--chathams-blue)]">{showAmount(data.reduce((sum, item) => sum + item.poWeight * 1, 0))}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="responsiveTextTable font-normal text-[var(--chathams-blue)]">Total Shipped</span>
                            <span className="responsiveTextTable font-normal text-[var(--chathams-blue)]">{showAmount(data.reduce((sum, item) => sum + item.shiipedWeight * 1, 0))}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="responsiveTextTable font-normal text-[var(--chathams-blue)]">Total Remaining</span>
                            <span className="responsiveTextTable font-normal text-[var(--chathams-blue)]">{showAmount(data.reduce((sum, item) => sum + item.remaining * 1, 0))}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}


export default Customtable;
