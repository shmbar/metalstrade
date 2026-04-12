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
        borderColor: '#b8ddf8',
        borderWidth: 1,
        borderRadius: '16px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
      }}
    >
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600&display=swap');
        .custom-table-totals, .custom-table-totals * {
          font-family: var(--font-poppins), 'Poppins', sans-serif;
          transition-property: color, background-color, border-color, box-shadow !important;
          transition-duration: 150ms !important;
          transition-timing-function: ease-in-out !important;
        }
      `}</style>

      <div className="custom-table-totals">
        {/* HEADER */}
        <div
          style={{
            background: '#dbeeff',
            padding: '12px 16px',
            borderBottom: '1px solid var(--rock-blue)'
          }}
        >
          <h3 className="responsiveTextTable text-[var(--chathams-blue)] font-medium text-center"
            style={{
              letterSpacing: '0.02em'
            }}>
            {title}
          </h3>
        </div>

        {/* LEFT ACCENT BORDER */}
        <div style={{
          
          
         
          borderTopRightRadius: '0px',
          
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
                <div className="grid grid-cols-[1fr_auto] px-4 py-1 items-center hover:bg-[#f8fbff] transition"
                  style={{
                    borderBottom: '1px solid var(--selago)',
                    borderRight: '1px solid var(--selago)',
                    borderLeft: '1px solid var(--selago)',
                    background: '#ffffff'
                  }}>
                  {row.getVisibleCells().map((cell, idx) => (
                    <div
                      key={cell.id}
                      className={
                        cell.column.id === 'amount'
                          ? 'responsiveTextTable font-medium text-right'
                          : 'responsiveTextTable truncate'
                      }
                      style={{
                        color: cell.column.id === 'amount' ? 'var(--chathams-blue)' : 'var(--port-gore)',
                        fontWeight: cell.column.id === 'amount' ? 500 : 400,
                        borderRight: idx === 0 ? '1px solid var(--selago)' : undefined // right border for first col
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
          <div className="px-4 py-2.5"
            style={{
              borderTop: '1px solid var(--rock-blue)',
              background: '#dbeeff',
              borderLeft: '1px solid var(--selago)',
              borderRight: '1px solid var(--selago)',
              borderBottom: '1px solid var(--selago)'
            }}>
            <div className="responsiveTextTable flex justify-between font-semibold"
              style={{ color: 'var(--chathams-blue)' }}>
              <span>Total $:</span>
              <span>
                {showAmount(
                  data.filter(i => i.cur === 'us').reduce((s, i) => s + i.amount, 0),
                  'usd'
                )}
              </span>
            </div>
            <div className="responsiveTextTable flex justify-between font-semibold mt-2"
              style={{ color: 'var(--chathams-blue)' }}>
              <span>Total €:</span>
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