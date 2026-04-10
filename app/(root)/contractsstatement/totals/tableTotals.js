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
                }
                .custom-table, .custom-table *, .glass-table, .glass-table * {
                  font-family: var(--font-poppins), 'Geist', sans-serif;
                  transition-property: color, background-color, border-color, box-shadow !important;
                  transition-duration: 150ms !important;
                  transition-timing-function: ease-in-out !important;
                }
                .custom-table th, .custom-table td {
                  border: 1px solid var(--selago);
                  background-color: #f8fbff;
                  text-align: center;
                  vertical-align: middle;
                  padding: 6px;
                }
                .custom-table th {
                  background-color: #dbeeff;
                }
                .custom-table td {
                  background-color: #fff;
                  border: 1px solid var(--selago);
                }
                .dashboard-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
                .dashboard-scroll::-webkit-scrollbar-track { background: #ebf2fc; border-radius: 6px; }
                .dashboard-scroll::-webkit-scrollbar-thumb { background: #9fb8d4; border-radius: 6px; }
                .dashboard-scroll::-webkit-scrollbar-thumb:hover { background: #0366ae; }
            `}</style>
            <div className="glass-table rounded-2xl shadow-lg border border-[var(--selago)] overflow-hidden">
                {/* Header */}
                <div className="flex justify-between items-center px-4 py-2 rounded-t-2xl" style={{
                    background: '#dbeeff',
                    borderBottom: '1px solid var(--rock-blue)'
                }}>
                    <h3 className="responsiveTextTable text-[var(--chathams-blue)] font-medium font-poppins text-center w-full"
                        style={{
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
                                            className="responsiveTextTable px-2 py-2 uppercase text-center font-medium font-poppins"
                                            style={{
                                                color: 'var(--chathams-blue)',
                                                minWidth: '60px',
                                                letterSpacing: '0.05em',
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
                            <tr style={{ borderTop: '1px solid var(--rock-blue)', background: '#dbeeff' }}>
                                <th className="responsiveTextTable px-2 py-2 font-semibold text-[var(--chathams-blue)] text-center">Total</th>
                                <th className="responsiveTextTable px-2 py-2 font-semibold text-[var(--chathams-blue)] text-center">{showAmount(data.reduce((sum, item) => sum + item.poWeight * 1, 0))}</th>
                                <th className="responsiveTextTable px-2 py-2 font-semibold text-[var(--chathams-blue)] text-center">{showAmount(data.reduce((sum, item) => sum + item.shiipedWeight * 1, 0))}</th>
                                <th className="responsiveTextTable px-2 py-2 font-semibold text-[var(--chathams-blue)] text-center">{showAmount(data.reduce((sum, item) => sum + item.remaining * 1, 0))}</th>
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
                                <span className="font-normal" style={{ fontSize: '0.62rem', textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)' }}>
                                    {getTtl('Row', settings?.ln || 'en')} {rowIndex + 1}
                                </span>
                            </div>
                            {/* Card Content */}
                            <div className="p-4 space-y-2.5">
                                {row.getVisibleCells().map(cell => (
                                    <div key={cell.id} className="flex flex-col space-y-1.5 pb-2.5 last:pb-0" style={{ borderBottom: '1px solid #E5E7EB' }}>
                                        <div className="uppercase tracking-wider font-normal" style={{ color: 'var(--regent-gray)', fontSize: '0.58rem' }}>
                                            {cell.column.columnDef.header}
                                        </div>
                                        <div className="font-normal break-words px-2 py-1 rounded-xl leading-relaxed min-h-[28px] flex items-center shadow-sm" style={{ color: 'var(--port-gore)', background: 'linear-gradient(135deg, #FAFAFA, #F5F5F5)', fontSize: '0.62rem', border: '1px solid #E5E7EB' }}>
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                    {/* Mobile Total Row */}
                    <div className="rounded-2xl border-t border-[var(--rock-blue)] px-3 py-2 flex flex-col gap-1" style={{ background: '#dbeeff' }}>
                        <div className="flex justify-between items-center">
                            <span className="responsiveTextTable font-semibold text-[var(--chathams-blue)]">Total Quantity</span>
                            <span className="responsiveTextTable font-semibold text-[var(--chathams-blue)]">{showAmount(data.reduce((sum, item) => sum + item.poWeight * 1, 0))}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="responsiveTextTable font-semibold text-[var(--chathams-blue)]">Total Shipped</span>
                            <span className="responsiveTextTable font-semibold text-[var(--chathams-blue)]">{showAmount(data.reduce((sum, item) => sum + item.shiipedWeight * 1, 0))}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="responsiveTextTable font-semibold text-[var(--chathams-blue)]">Total Remaining</span>
                            <span className="responsiveTextTable font-semibold text-[var(--chathams-blue)]">{showAmount(data.reduce((sum, item) => sum + item.remaining * 1, 0))}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}


export default Customtable;
