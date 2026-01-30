'use client'

import { flexRender, getCoreRowModel, getFilteredRowModel, getSortedRowModel, useReactTable } from "@tanstack/react-table"
import { TbSortDescending, TbSortAscending } from "react-icons/tb"
import { usePathname } from 'next/navigation'
import { useMemo, useCallback } from 'react'
import '../../contracts/style.css'
import { getTtl } from "@utils/languages"
import Tltip from "@components/tlTip"
import { detailsToolTip } from "./tablesFuncs"

const CURRENCIES = {
  USD: { symbol: '$', code: 'usd', label: 'Total $' },
  EUR: { symbol: '€', code: 'eur', label: 'Total €' }
}

const Customtable = ({ data, columns, ln, ttl, settings, dataTable, rmrk }) => {
  const pathname = usePathname()

  const table = useReactTable({
    columns,
    data,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  // Memoized formatters
  const formatCurrency = useCallback((amount, currency) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2
    }).format(amount)
  }, [])

  const formatNumber = useCallback((amount) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 3
    }).format(amount)
  }, [])

  // Memoized totals calculation
  const totals = useMemo(() => {
    const result = {}
    Object.keys(CURRENCIES).forEach(cur => {
      const filtered = data.filter(item => item.cur === cur)
      result[cur] = {
        quantity: filtered.reduce((sum, item) => sum + (item.qnty || 0), 0),
        total: filtered.reduce((sum, item) => sum + (item.total || 0), 0)
      }
    })
    return result
  }, [data])

  const renderTotalRow = useCallback((currency) => {
    const config = CURRENCIES[currency]
    const { quantity, total } = totals[currency]

    return (
      <tr 
        key={currency}
        className="border-t border-[var(--selako)] bg-gradient-to-r from-[var(--endeavour)] via-[var(--chathams-blue)] to-[var(--endeavour)]"
      >
        {columns.map((col, index) => {
          if (index === 0) {
            return (
              <td key={`${currency}-${index}`} className="px-2 py-2 md:px-3 md:py-2">
                <span className="text-[0.7rem] md:text-[0.75rem] font-medium text-[#1F2937] uppercase whitespace-nowrap">
                  {config.label}
                </span>
              </td>
            )
          } else if (index === 1) {
            return (
              <td key={`${currency}-${index}`} className="px-2 py-2 md:px-3 md:py-2">
                <span className="text-[0.7rem] md:text-[0.75rem] font-medium text-[#1F2937] uppercase" />
              </td>
            )
          } else if (index === 2) {
            return (
              <td key={`${currency}-${index}`} className="px-2 py-2 md:px-3 md:py-2 text-left">
                <span className="text-[0.7rem] md:text-[0.75rem] font-medium text-[#1F2937] uppercase whitespace-nowrap">
                  {formatNumber(quantity)}
                </span>
              </td>
            )
          } else if (index === 3) {
            return (
              <td key={`${currency}-${index}`} className="px-2 py-2 md:px-3 md:py-2 text-right">
                <span className="text-[0.7rem] md:text-[0.75rem] font-medium text-[#1F2937] uppercase whitespace-nowrap">
                  {formatCurrency(total, config.code)}
                </span>
              </td>
            )
          }
          return <td key={`${currency}-${index}`} className="px-2 py-2 md:px-3 md:py-2" />
        })}
      </tr>
    )
  }, [totals, columns, formatNumber, formatCurrency])

  return (
    <div className="w-full">
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
          background-color: #d4eafc;
        }
        .custom-table td {
          background-color: #fff;
          border: 1px solid #e0e0e0;
        }
        .dashboard-scroll::-webkit-scrollbar { width: 10px; height: 10px; }
        .dashboard-scroll::-webkit-scrollbar-track { background: linear-gradient(180deg, #F5F5F5, #FAFAFA); border-radius: 6px; }
        .dashboard-scroll::-webkit-scrollbar-thumb { background: linear-gradient(180deg, #6366F1, #4338CA); border-radius: 6px; border: 2px solid #F5F5F5; }
        .dashboard-scroll::-webkit-scrollbar-thumb:hover { background: linear-gradient(180deg, #A855F7, #7E22CE); border-color: #FAFAFA; }
      `}</style>
      <div className="glass-table rounded-2xl shadow-lg border border-[#e0e0e0]">
        <div className="overflow-x-auto dashboard-scroll" style={{ borderLeft: '8px solid #1D3D79', borderTopLeftRadius: '24px', borderBottomLeftRadius: '24px' }}>
          <table className="custom-table w-full" style={{ tableLayout: 'auto' }}>
            <thead className="sticky top-0 z-10">
              {table.getHeaderGroups().map(hdGroup => (
                <tr key={hdGroup.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
                  {hdGroup.headers.map((header, idx) => (
                    <th
                      key={header.id}
                      className="px-2 py-2 uppercase text-center"
                      style={{
                        color: '#183d79',
                        minWidth: '60px',
                        fontSize: 'clamp(10px, 1.0vw, 13px)',
                        letterSpacing: '0.05em',
                        textAlign: 'center',
                      }}
                    >
                      {header.column.getCanSort() ? (
                        <div
                          onClick={header.column.getToggleSortingHandler()}
                          className="text-xs flex cursor-pointer items-center gap-1 justify-center"
                        >
                          {header.column.columnDef.header}
                          {header.column.getIsSorted() === 'asc' && (
                            <TbSortAscending className="text-[#6366F1] scale-110 md:scale-125" />
                          )}
                          {header.column.getIsSorted() === 'desc' && (
                            <TbSortDescending className="text-[#6366F1] scale-110 md:scale-125" />
                          )}
                        </div>
                      ) : (
                        <span className="text-xs">{header.column.columnDef.header}</span>
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.length > 0 ? (
                table.getRowModel().rows.map(row => (
                  <tr
                    key={row.id}
                    className="cursor-pointer transition-colors"
                  >
                    {row.getVisibleCells().map((cell, idx) => (
                      <td
                        key={cell.id}
                        data-label={cell.column.columnDef.header}
                        className="px-2 py-2 text-center"
                        style={{
                          color: '#1F2937',
                          fontSize: 'clamp(11px, 1.0vw, 13px)',
                          fontWeight: '400',
                          zIndex: 1,
                          willChange: 'background-color, color',
                          textAlign: 'center',
                        }}
                      >
                        <Tltip
                          direction='right'
                          tltpText={detailsToolTip(row, data, settings, dataTable, rmrk)}
                        >
                          <span className="text-[11px] items-center flex w-full justify-center outline-none truncate cursor-default">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </span>
                        </Tltip>
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="text-center py-8 text-gray-500"
                  >
                    No data available
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              {Object.keys(CURRENCIES).map(currency => renderTotalRow(currency))}
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  )
}

export default Customtable;