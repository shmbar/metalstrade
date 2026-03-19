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

const TABLE_WIDTH = "100%"

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
        borderColor: 'var(--selago)',
        borderWidth: 1,
        borderRadius: '16px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
      }}
    >
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600&display=swap');
        .custom-table-totals, .custom-table-totals * {
          font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial;
          font-size: 10px;
          transition-property: color, background-color, border-color, box-shadow !important;
          transition-duration: 150ms !important;
          transition-timing-function: ease-in-out !important;
        }
      `}</style>

    <div className="custom-table-totals">

        {/* TITLE */}
        <div
          style={{
            borderBottom: '1px solid #b8ddf8',
            padding: '12px 16px',
            background: '#dbeeff'
          }}
        >
          <p
            className="text-[var(--endeavour)] font-bold text-center"
            style={{
              fontSize: 'clamp(11px, 1vw, 11px)',
              letterSpacing: '0.05em'
            }}
          >
            {title}
          </p>
        </div>

        {/* Vendor / Amount Header Row */}
        <div
          className="grid grid-cols-[1fr_auto] px-4 py-2"
          style={{
            background: '#ffffff',
            borderTop: '1px solid var(--selago)',
            borderBottom: '1px solid var(--selago)'
          }}
        >
          <div
            style={{
              fontWeight: 600,
              color: 'var(--endeavour)'
            }}
                      className="!text-[10px]"

          >
            Vendor
          </div>

          <div
            className="!text-[10px]"
            style={{
              fontWeight: 600,
              color: 'var(--endeavour)'
            }}
          >
            Amount
          </div>
        </div>

        {/* BODY */}
        <div>
          {rows.map((row) => (
            <Tltip
              key={row.id}
              direction="right"
              tltpText={expensesToolTip(row, expensesData, settings, filt)}
            >
              <div
                className="grid grid-cols-[1fr_auto] px-4 py-1 items-center hover:bg-[#f8fbff] transition text-[10px]"
                style={{
                  borderBottom: '1px solid var(--selago)'
                }}
              >
                {row.getVisibleCells().map((cell) => (
                  <div
                    key={cell.id}
                    className={
                      cell.column.id === 'amount'
                        ? 'font-medium text-right text-[10px]'
                        : 'truncate text-[10px]'
                    }
                    style={{
                      color: cell.column.id === 'amount' ? 'var(--chathams-blue)' : '#1F2937',
                      fontWeight: cell.column.id === 'amount' ? 500 : 400
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
        <div
          className="px-4 py-3"
          style={{
            borderTop: '1px solid var(--selago)',
            background: '#dbeeff'
          }}
        >
          <div
            className="flex justify-between font-semibold"
            style={{ color: 'var(--chathams-blue)' }}
          >
            <span>Total $</span>
            <span>
              {showAmount(
                data.filter(i => i.cur === 'us').reduce((s, i) => s + i.amount, 0),
                'USD'
              )}
            </span>
          </div>

          <div
            className="flex justify-between font-semibold mt-1"
            style={{ color: 'var(--chathams-blue)' }}
          >
            <span>Total €</span>
            <span>
              {showAmount(
                data.filter(i => i.cur === 'eu').reduce((s, i) => s + i.amount, 0),
                'EUR'
              )}
            </span>
          </div>
        </div>

      </div>
    </div>
  )
}

export default Customtable