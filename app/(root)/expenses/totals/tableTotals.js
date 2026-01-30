'use client'

import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable
} from "@tanstack/react-table"

import Tltip from "../../../../components/tlTip"
import { expensesToolTip } from "./funcs"

const TABLE_WIDTH = "340px"

const Customtable = ({ data, columns, expensesData, settings, title, filt }) => {

  const table1 = useReactTable({
    columns,
    data,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  const showAmount = (x, y) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: y,
      minimumFractionDigits: 2
    }).format(x)

  const rows = table1.getRowModel().rows
  const isMulti = rows.length > 1

  return (
    <div
      className="bg-white rounded-xl shadow border overflow-hidden"
      style={{
        width: TABLE_WIDTH,
        borderColor: '#e0e0e0',
        borderWidth: 1,
        borderRadius: '16px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
      }}
    >
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600&display=swap');
        .custom-table-totals, .custom-table-totals * {
          font-family: 'Poppins', system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial;
          font-size: 10px !important;
          transition-property: color, background-color, border-color, box-shadow !important;
          transition-duration: 150ms !important;
          transition-timing-function: ease-in-out !important;
        }
      `}</style>

      <div className="custom-table-totals">
        {/* HEADER */}
        <div
          style={{
            // background: '#eaf4ff',
            borderBottom: '1px solid #e0e0e0',
            // borderTopLeftRadius: '32px',
            // borderTopRightRadius: '12px',
            padding: '12px 16px',
            borderLeft: '1px solid #e0e0e0',
            borderRight: '1px solid #e0e0e0'
          }}
        >
          <p className="text-[#183d79] font-semibold uppercase"
            style={{
              fontSize: 'clamp(12px, 1vw, 15px)',
              letterSpacing: '0.05em'
            }}>
            {title}
          </p>
        </div>

        {/* LEFT ACCENT BORDER */}
        <div style={{
          borderLeft: '8px solid #1D3D79',
          borderTopLeftRadius: '32px',
          borderBottomLeftRadius: '32px',
          borderTopRightRadius: '0px',
          borderBottomRightRadius: '0px',
          overflow: 'hidden'
        }}>
          {/* BODY */}
          <div className={isMulti ? 'divide-y' : ''}>
            {rows.map(row => (
              <Tltip
                key={row.id}
                direction="right"
                tltpText={expensesToolTip(row, expensesData, settings, filt)}
              >
                <div className="grid grid-cols-[1fr_auto] px-4 py-2.5 items-center hover:bg-[#f9f9f9] transition"
                  style={{
                    borderBottom: '1px solid #e0e0e0',
                    borderRight: '1px solid #e0e0e0',
                    borderLeft: '1px solid #e0e0e0'
                  }}>
                  {row.getVisibleCells().map((cell, idx) => (
                    <div
                      key={cell.id}
                      className={
                        cell.column.id === 'amount'
                          ? 'font-medium text-right'
                          : 'truncate'
                      }
                      style={{
                        color: cell.column.id === 'amount' ? '#183d79' : '#1F2937',
                        fontSize: 'clamp(10px, 1vw, 13px)',
                        fontWeight: cell.column.id === 'amount' ? 500 : 400,
                        borderRight: idx === 0 ? '1px solid #e0e0e0' : undefined // right border for first col
                      }}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </div>
                  ))}
                </div>
              </Tltip>
            ))}
          </div>

          {/* TOTALS */}
          <div className="px-4 py-3"
            style={{
              borderTop: '1px solid #e0e0e0',
              background: '#eaf4ff',
              borderLeft: '1px solid #e0e0e0',
              borderRight: '1px solid #e0e0e0',
              borderBottom: '1px solid #e0e0e0'
            }}>
            <div className="flex justify-between font-semibold"
              style={{ color: '#183d79', fontSize: 'clamp(10px, 1vw, 13px)' }}>
              <span>Total $</span>
              <span>
                {showAmount(
                  data.filter(i => i.cur === 'us').reduce((s, i) => s + i.amount, 0),
                  'usd'
                )}
              </span>
            </div>
            <div className="flex justify-between font-semibold mt-1"
              style={{ color: '#183d79', fontSize: 'clamp(10px, 1vw, 13px)' }}>
              <span>Total €</span>
              <span>
                {showAmount(
                  data.filter(i => i.cur === 'eu').reduce((s, i) => s + i.amount, 0),
                  'eur'
                )}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Customtable