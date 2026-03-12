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
        className="cursor-pointer"
      >
        {columns.map((col, index) => {
          if (index === 0) {
            return (
              <td
                key={`${currency}-${index}`}
                className="px-2 py-2 transition-colors duration-150 group/cell relative"
                style={{
                  color: 'var(--chathams-blue)',
                  minWidth: '60px',
                  maxWidth: '110px',
                  fontSize: 'clamp(11px, 1.0vw, 13px)',
                  fontWeight: '600',
                  zIndex: 1,
                  willChange: 'background-color, color',
                  background: 'linear-gradient(90deg, rgba(255,255,255,0.95), rgba(250,250,250,0.98))'
                }}
              >
                <div className="px-2 py-1 text-[11px] font-semibold flex items-center justify-center min-w-[70px] text-center whitespace-nowrap border rounded-xl transition-all duration-200 ease-in-out bg-[#e3f3ff] border-transparent"
                  style={{ border: '1px solid #b8ddf8' }}>
                  {config.label}
                </div>
              </td>
            )
          } else if (index === 1) {
            return (
              <td
                key={`${currency}-${index}`}
                className="px-2 py-2 transition-colors duration-150 group/cell relative"
                style={{
                  color: '#1F2937',
                  minWidth: '60px',
                  maxWidth: '110px',
                  fontSize: 'clamp(11px, 1.0vw, 13px)',
                  fontWeight: '500',
                  zIndex: 1,
                  willChange: 'background-color, color',
                  background: 'linear-gradient(90deg, rgba(255,255,255,0.95), rgba(250,250,250,0.98))'
                }}
              >
                <div className="px-2 py-1 text-[11px] font-semibold flex items-center justify-center min-w-[70px] text-center whitespace-nowrap border rounded-xl border-transparent transition-all duration-200 ease-in-out bg-[#f9f9f9]"
                  style={{ border: '1px solid #e0e0e0' }}>
                  {/* Empty cell */}
                </div>
              </td>
            )
          } else if (index === 2) {
            return (
              <td
                key={`${currency}-${index}`}
                className="px-2 py-2 transition-colors duration-150 group/cell relative"
                style={{
                  color: '#1F2937',
                  minWidth: '60px',
                  maxWidth: '110px',
                  fontSize: 'clamp(11px, 1.0vw, 13px)',
                  fontWeight: '500',
                  zIndex: 1,
                  willChange: 'background-color, color',
                  background: 'linear-gradient(90deg, rgba(255,255,255,0.95), rgba(250,250,250,0.98))'
                }}
              >
                <div className="px-2 py-1 text-[11px] font-semibold flex items-center justify-center min-w-[70px] text-center whitespace-nowrap border rounded-xl border-transparent transition-all duration-200 ease-in-out bg-[#f9f9f9] hover:shadow-[inset_0_0_0_1px_#d1d1d1]"
                  style={{ border: '1px solid #e0e0e0' }}>
                  {formatNumber(quantity)}
                </div>
              </td>
            )
          } else if (index === 3) {
            return (
              <td
                key={`${currency}-${index}`}
                className="px-2 py-2 transition-colors duration-150 group/cell relative"
                style={{
                  color: '#1F2937',
                  minWidth: '60px',
                  maxWidth: '110px',
                  fontSize: 'clamp(11px, 1.0vw, 13px)',
                  fontWeight: '500',
                  zIndex: 1,
                  willChange: 'background-color, color',
                  background: 'linear-gradient(90deg, rgba(255,255,255,0.95), rgba(250,250,250,0.98))'
                }}
              >
                <div className="px-2 py-1 text-[11px] font-semibold flex items-center justify-center min-w-[70px] text-center whitespace-nowrap border rounded-xl border-transparent transition-all duration-200 ease-in-out bg-[#f9f9f9] hover:shadow-[inset_0_0_0_1px_#d1d1d1]"
                  style={{ border: '1px solid #e0e0e0' }}>
                  {formatCurrency(total, config.code)}
                </div>
              </td>
            )
          }
          return (
            <td
              key={`${currency}-${index}`}
              className="px-2 py-2 transition-colors duration-150 group/cell relative"
              style={{
                background: 'linear-gradient(90deg, rgba(255,255,255,0.95), rgba(250,250,250,0.98))'
              }}
            >
              <div className="px-2 py-1 text-[11px] font-semibold flex items-center justify-center min-w-[70px] text-center whitespace-nowrap border rounded-xl border-transparent transition-all duration-200 ease-in-out bg-[#f9f9f9]"
                style={{ border: '1px solid #e0e0e0' }} />
            </td>
          )
        })}
      </tr>
    )
  }, [totals, columns, formatNumber, formatCurrency])

  return (
    <div className="w-full">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600&display=swap');
        
        .stocks-table, .stocks-table * {
          font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial;
          font-size: 10px !important;
          transition-duration: 150ms !important;
          transition-timing-function: ease-in-out !important;
        }

        /* Add border, background, and text alignment styles for table cells */
        .stocks-table th, .stocks-table td {
          background-color: #f9f9f9;
          text-align: center;
          vertical-align: middle;
          padding: 6px;
          border-radius: 4px;
        }

        .stocks-table th {
          background-color: #d4eafc;
        }

        .stocks-table td {
          background-color: #fff;
          border: 1px solid #e0e0e0;
        }
        
        .dashboard-scroll::-webkit-scrollbar { width: 10px; height: 10px; }
        .dashboard-scroll::-webkit-scrollbar-track { background: linear-gradient(180deg, #F8F8F8, #F0F0F0); border-radius: 6px; }
        .dashboard-scroll::-webkit-scrollbar-thumb { background: linear-gradient(180deg, #E0E0E0, #CCCCCC); border-radius: 6px; border: 2px solid #F8F8F8; }
        .dashboard-scroll::-webkit-scrollbar-thumb:hover { background: linear-gradient(180deg, #CCCCCC, #B0B0B0); border-color: #F0F0F0; }
      `}</style>
      <div
        className="w-full"
        style={{
          borderRadius: '24px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.08), 0 0 1px rgba(99, 102, 241, 0.1) inset',
          overflow: 'hidden'
        }}
      >
        {/* Title */}
        <div
          style={{
            background: '#d4eafc',
            borderTopLeftRadius: '24px',
            borderTopRightRadius: '24px',
            padding: '10px 16px',
            borderBottom: '1px solid #b8ddf8',
            textAlign: 'center',
            fontWeight: '600',
            fontSize: '13px',
            color: 'var(--chathams-blue)',
            letterSpacing: '0.03em'
          }}
        >
          Summary - Stocks
        </div>
        {/* Header section matching newTable */}
        <div
          className="flex-shrink-0"
          style={{
            borderBottom: '2px solid #E5E7EB',
            background: '#d4eafc',
          }}
        >
          <div className="overflow-x-auto dashboard-scroll">
            <table className="stocks-table w-full rounded-xl" style={{ tableLayout: 'auto', borderSpacing: '6px' }}>
            <thead className="sticky top-0 z-10">
              {table.getHeaderGroups().map(hdGroup => (
                <tr key={hdGroup.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
                  {hdGroup.headers.map((header, idx) => (
                    <th
                      key={header.id}
                      className="px-2 py-2 uppercase text-center"
                      style={{
                        color: 'var(--chathams-blue)',
                        minWidth: '60px',
                        fontSize: 'clamp(10px, 1.0vw, 13px)',
                        letterSpacing: '0.05em',
                        textAlign: 'center',
                        borderRadius: '12px',
                        border: '1px solid #b8ddf8'
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
                        className="px-2 py-2 transition-colors duration-150 group/cell relative"
                        style={{
                          color: '#1F2937',
                          minWidth: '60px',
                          maxWidth: '110px',
                          fontSize: 'clamp(11px, 1.0vw, 13px)',
                          fontWeight: '400',
                          zIndex: 1,
                          willChange: 'background-color, color',
                        }}
                      >
                        <Tltip
                          direction='right'
                          tltpText={detailsToolTip(row, data, settings, dataTable, rmrk)}
                        >
                          <div className="px-2 py-1 text-[11px] font-normal flex items-center justify-center min-w-[70px] text-center whitespace-nowrap border rounded-xl border-transparent transition-all duration-200 ease-in-out bg-[#f9f9f9] hover:shadow-[inset_0_0_0_1px_#d1d1d1] fade-in">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </div>
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
    </div>
  )
}

export default Customtable;