
// 'use client'
// // Fade-in animation for badges
// if (typeof window !== 'undefined') {
//   const style = document.createElement('style');
//   style.innerHTML = `@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }`;
//   document.head.appendChild(style);
// }

// import Header from "../../../components/table/header";
// import {
//   flexRender,
//   getCoreRowModel,
//   getFilteredRowModel,
//   getPaginationRowModel,
//   getSortedRowModel,
//   useReactTable
// } from "@tanstack/react-table"

// import { useEffect, useMemo, useState, useContext, useRef, useCallback } from "react"

// import { Paginator } from "../../../components/table/Paginator";
// import RowsIndicator from "../../../components/table/RowsIndicator";

// import { SettingsContext } from "../../../contexts/useSettingsContext";
// import { usePathname } from "next/navigation";
// import { getTtl } from "../../../utils/languages";

// import FiltersIcon from '../../../components/table/filters/filters';
// import ResetFilterTableIcon from '../../../components/table/filters/resetTabe';
// import dateBetweenFilterFn from '../../../components/table/filters/date-between-filter';

// const Customtable = ({
//   data,
//   columns,
//   invisible,
//   SelectRow,
//   excellReport,
//   setFilteredId,
//   highlightId,
//   onCellUpdate,
//   summaryUSD = { currency: 'USD', amount: '$ 0.00' },
//   summaryEUR = { currency: 'EUR', amount: '€ 1,580.00' },
//   // Pass the column IDs that correspond to the $/€ badge column and Amount column
//   currencyColumnId = 'currency',
//   amountColumnId   = 'amount',
// }) => {

//   const [globalFilter, setGlobalFilter]         = useState('')
//   const [columnVisibility, setColumnVisibility] = useState(invisible)
//   const [filterOn, setFilterOn]                 = useState(false)
//   const [columnFilters, setColumnFilters]       = useState([])
//   const [quickSumEnabled, setQuickSumEnabled]   = useState(false)
//   const [quickSumColumns, setQuickSumColumns]   = useState([])
//   const [isEditMode, setIsEditMode]             = useState(false)
//   const [rowSelection, setRowSelection]         = useState({})

//   const [{ pageIndex, pageSize }, setPagination] = useState({ pageIndex: 0, pageSize: 25 })
//   const pagination = useMemo(() => ({ pageIndex, pageSize }), [pageIndex, pageSize])

//   const { ln } = useContext(SettingsContext)

//   // Measure header th positions so summary bars align with real columns
//   const theadRowRef = useRef(null)
//   const tableWrapRef = useRef(null)
//   const [colPositions, setColPositions] = useState({ currency: null, amount: null })

//   /* ---------- Selection Column ---------- */
//   const columnsWithSelection = useMemo(() => {
//     if (!quickSumEnabled) return columns
//     const selectCol = {
//       id: "select",
//       header: ({ table }) => (
//         <div className="flex items-center justify-start w-full h-full ml-2">
//           <input
//             type="checkbox"
//             checked={table.getIsAllPageRowsSelected()}
//             ref={el => { if (el) el.indeterminate = table.getIsSomePageRowsSelected() }}
//             onChange={table.getToggleAllPageRowsSelectedHandler()}
//             className="w-4 h-4 cursor-pointer rounded"
//             style={{ accentColor: 'var(--brand-soft)' }}
//           />
//         </div>
//       ),
//       cell: ({ row }) => (
//         <div className="flex items-center w-full h-full">
//           <input
//             type="checkbox"
//             checked={row.getIsSelected()}
//             disabled={!row.getCanSelect()}
//             onChange={row.getToggleSelectedHandler()}
//             className="w-4 h-4 cursor-pointer rounded"
//             style={{ accentColor: 'var(--brand-soft)' }}
//           />
//         </div>
//       ),
//       enableSorting: false,
//       enableColumnFilter: false,
//       size: 50, minSize: 50, maxSize: 50,
//     }
//     return [selectCol, ...(columns || [])]
//   }, [columns, quickSumEnabled])

//   /* ---------- TABLE ---------- */
//   const table = useReactTable({
//     meta: {
//       isEditMode,
//       updateData: (rowIndex, columnId, value) => {
//         if (!isEditMode) return
//         onCellUpdate?.({ rowIndex, columnId, value })
//       },
//     },
//     columns: columnsWithSelection,
//     data,
//     enableRowSelection: quickSumEnabled,
//     getCoreRowModel: getCoreRowModel(),
//     filterFns: { dateBetweenFilterFn },
//     state: { globalFilter, columnVisibility, pagination, columnFilters, rowSelection },
//     onRowSelectionChange: setRowSelection,
//     onColumnFiltersChange: setColumnFilters,
//     getFilteredRowModel: getFilteredRowModel(),
//     onGlobalFilterChange: setGlobalFilter,
//     onColumnVisibilityChange: setColumnVisibility,
//     getSortedRowModel: getSortedRowModel(),
//     getPaginationRowModel: getPaginationRowModel(),
//     onPaginationChange: setPagination,
//   })

//   const resetTable = () => table.resetColumnFilters()
//   useEffect(() => resetTable(), [])

//   useEffect(() => {
//     setFilteredId(table.getFilteredRowModel().rows.map(r => r.original.id))
//   }, [columnFilters, globalFilter])

//   /* ---- Measure real th positions for summary overlay alignment ---- */
//   const measureColumns = useCallback(() => {
//     if (!theadRowRef.current || !tableWrapRef.current) return
//     const ths = Array.from(theadRowRef.current.querySelectorAll('th'))
//     const wrapRect = tableWrapRef.current.getBoundingClientRect()
//     const visible = table.getVisibleLeafColumns()

//     let currencyPos = null
//     let amountPos   = null

//     visible.forEach((col, idx) => {
//       const th = ths[idx]
//       if (!th) return
//       const rect  = th.getBoundingClientRect()
//       const left  = rect.left - wrapRect.left + tableWrapRef.current.scrollLeft
//       const width = rect.width
//       if (col.id === currencyColumnId) currencyPos = { left, width }
//       if (col.id === amountColumnId)   amountPos   = { left, width }
//     })

//     setColPositions({ currency: currencyPos, amount: amountPos })
//   }, [table, currencyColumnId, amountColumnId])

//   useEffect(() => {
//     // Small delay so browser has finished layout before measuring
//     const id = setTimeout(measureColumns, 50)
//     window.addEventListener('resize', measureColumns)
//     return () => { clearTimeout(id); window.removeEventListener('resize', measureColumns) }
//   }, [measureColumns, columnVisibility, data, quickSumEnabled])

//   const currentRows = table.getRowModel().rows.length
//   const dynamicMaxHeight = currentRows > 0
//     ? `${Math.min(currentRows * 40 + 220, 700)}px`
//     : '320px'

//   /* ---- Summary bar component ----
//    * Single colSpan row — no cell borders.
//    * Uses absolute positioned spans over the measured column centers.
//    */
//   const SummaryBar = ({ bgColor, label, currency, amount }) => {
//     const { currency: cPos, amount: aPos } = colPositions
//     return (
//       <tr>
//         <td
//           colSpan={columnsWithSelection.length}
//           style={{
//             backgroundColor: bgColor,
//             border: 'none',
//             padding: 0,
//             height: '34px',
//             position: 'relative',
//             overflow: 'visible',
//           }}
//         >
//           <div style={{
//             position: 'relative',
//             width: '100%',
//             height: '34px',
//             display: 'flex',
//             alignItems: 'center',
//           }}>
//             {/* LEFT — label */}
//             <span style={{
//               position: 'absolute',
//               left: '14px',
//               fontSize: 'var(--fs-input)',
//               fontWeight: '600',
//               color: 'var(--chathams-blue)',
//               whiteSpace: 'nowrap',
//             }}>
//               {label}
//             </span>

//             {/* MIDDLE — currency badge, centred over the $/€ column */}
//             {cPos && (
//               <span style={{
//                 position: 'absolute',
//                 left: `${cPos.left + cPos.width / 2}px`,
//                 transform: 'translateX(-50%)',
//                 fontSize: 'var(--fs-input)',
//                 fontWeight: '600',
//                 color: 'var(--chathams-blue)',
//                 whiteSpace: 'nowrap',
//               }}>
//                 {currency}
//               </span>
//             )}

//             {/* RIGHT — amount, centred over the Amount column */}
//             {aPos && (
//               <span style={{
//                 position: 'absolute',
//                 left: `${aPos.left + aPos.width / 2}px`,
//                 transform: 'translateX(-50%)',
//                 fontSize: 'var(--fs-input)',
//                 fontWeight: '700',
//                 color: 'var(--chathams-blue)',
//                 whiteSpace: 'nowrap',
//               }}>
//                 {amount}
//               </span>
//             )}
//           </div>
//         </td>
//       </tr>
//     )
//   }

//   return (
//     <div className="w-full">
//       <style jsx global>{`
//         /* ── Column header cells ── */
//         .custom-table th {
//           background-color: var(--bg-subtle);
//         }

//         /* ── Data cells ── */
//         .custom-table td {
//           background-color: var(--bg-card);
//         }

//         /* ── Summary td — no border, no padding, flat color bar ── */
//         .custom-table thead tr.summary-row td {
//           border: none !important;
//           padding: 0 !important;
//         }

//         /* ── Blue header row ── */
//         .header-blue {
//           background-color: var(--border-cell);
//           color: var(--chathams-blue);
//         }

//         /* ── Empty tbody rows — invisible ── */
//         .custom-table tbody tr.empty-spacer td {
//           border: none !important;
//           background: transparent !important;
//           height: 40px;
//           pointer-events: none;
//         }

//         /* ── Pagination ── */
//         .pagination-center { display: flex; justify-content: center; align-items: center; gap: 10px; }
//         .page-btn   { padding: 6px 12px; border-radius: 8px; font-weight: 500; }
//         .page-active { background-color: var(--brand-deep); color: white; }
//         .page-normal { color: var(--chathams-blue); }
//       `}</style>

//       <div className="custom-table">
//         <div className="flex flex-col">

//           {/* ── TOOLBAR ── */}
//           <div className="flex-shrink-0"
//             style={{
//               borderBottom: '2px solid var(--line)',
//               background: 'linear-gradient(90deg, rgba(255,255,255,0.95), rgba(250,250,250,0.98))'
//             }}>
//             <Header
//               globalFilter={globalFilter}
//               setGlobalFilter={setGlobalFilter}
//               table={table}
//               excellReport={excellReport}
//               filterIcon={FiltersIcon(ln, filterOn, setFilterOn)}
//               isEditMode={isEditMode}
//               setIsEditMode={setIsEditMode}
//               resetFilterTable={ResetFilterTableIcon(ln, resetTable, filterOn)}
//               quickSumEnabled={quickSumEnabled}
//               setQuickSumEnabled={setQuickSumEnabled}
//               quickSumColumns={quickSumColumns}
//               setQuickSumColumns={setQuickSumColumns}
//             />
//           </div>

//           {/* ── DESKTOP ── */}
//           <div className="hidden md:block">
//             <div
//               ref={tableWrapRef}
//               className="overflow-auto dashboard-scroll"
//               style={{
//                 maxHeight: dynamicMaxHeight,
//                 borderLeft: '8px solid var(--chathams-blue)',
//                 borderRadius: '20px',
//                 border: '1px solid var(--line-strong)',
//                 position: 'relative',
//               }}
//             >
//               <table className="w-full"
//                 style={{ tableLayout: 'auto', borderCollapse: 'collapse', borderSpacing: 0 }}>

//                 <thead>
//                   {/* ── Summary green bar (Total $) ── */}
//                   <tr className="summary-row">
//                     <td
//                       colSpan={columnsWithSelection.length}
//                       style={{
//                         backgroundColor: 'var(--ok-border)',
//                         border: 'none',
//                         padding: 0,
//                         height: '34px',
//                         position: 'relative',
//                       }}
//                     >
//                       <div style={{ position: 'relative', width: '100%', height: '34px', display: 'flex', alignItems: 'center' }}>
//                         <span style={{ position: 'absolute', left: '14px', fontSize: 'var(--fs-input)', fontWeight: '600', color: 'var(--chathams-blue)', whiteSpace: 'nowrap' }}>
//                           Total $:
//                         </span>
//                         {colPositions.currency && (
//                           <span style={{
//                             position: 'absolute',
//                             left: `${colPositions.currency.left + colPositions.currency.width / 2}px`,
//                             transform: 'translateX(-50%)',
//                             fontSize: 'var(--fs-input)', fontWeight: '600', color: 'var(--chathams-blue)', whiteSpace: 'nowrap',
//                           }}>
//                             {summaryUSD.currency}
//                           </span>
//                         )}
//                         {colPositions.amount && (
//                           <span style={{
//                             position: 'absolute',
//                             left: `${colPositions.amount.left + colPositions.amount.width / 2}px`,
//                             transform: 'translateX(-50%)',
//                             fontSize: 'var(--fs-input)', fontWeight: '600', color: 'var(--chathams-blue)', whiteSpace: 'nowrap',
//                           }}>
//                             {summaryUSD.amount}
//                           </span>
//                         )}
//                       </div>
//                     </td>
//                   </tr>

//                   {/* ── Summary blue bar (Total €) ── */}
//                   <tr className="summary-row">
//                     <td
//                       colSpan={columnsWithSelection.length}
//                       style={{
//                         backgroundColor: 'var(--line-strong)',
//                         border: 'none',
//                         padding: 0,
//                         height: '34px',
//                         position: 'relative',
//                       }}
//                     >
//                       <div style={{ position: 'relative', width: '100%', height: '34px', display: 'flex', alignItems: 'center' }}>
//                         <span style={{ position: 'absolute', left: '14px', fontSize: 'var(--fs-input)', fontWeight: '600', color: 'var(--chathams-blue)', whiteSpace: 'nowrap' }}>
//                           Total €:
//                         </span>
//                         {colPositions.currency && (
//                           <span style={{
//                             position: 'absolute',
//                             left: `${colPositions.currency.left + colPositions.currency.width / 2}px`,
//                             transform: 'translateX(-50%)',
//                             fontSize: 'var(--fs-input)', fontWeight: '600', color: 'var(--chathams-blue)', whiteSpace: 'nowrap',
//                           }}>
//                             {summaryEUR.currency}
//                           </span>
//                         )}
//                         {colPositions.amount && (
//                           <span style={{
//                             position: 'absolute',
//                             left: `${colPositions.amount.left + colPositions.amount.width / 2}px`,
//                             transform: 'translateX(-50%)',
//                             fontSize: 'var(--fs-input)', fontWeight: '600', color: 'var(--chathams-blue)', whiteSpace: 'nowrap',
//                           }}>
//                             {summaryEUR.amount}
//                           </span>
//                         )}
//                       </div>
//                     </td>
//                   </tr>

//                   {/* ── Column headers — measured via ref ── */}
//                   {table.getHeaderGroups().map(hdGroup => (
//                     <tr key={hdGroup.id} ref={theadRowRef}>
//                       {hdGroup.headers.map(header => (
//                         <th
//                           key={header.id}
//                           className="header-blue font-bold"
//                           style={{
//                             minWidth:
//                               header.column.id === 'paid'   ? '100px' :
//                               header.column.id === 'select' ? '50px'  : '80px',
//                           }}
//                         >
//                           {flexRender(header.column.columnDef.header, header.getContext())}
//                         </th>
//                       ))}
//                     </tr>
//                   ))}
//                 </thead>

//                 <tbody>
//                   {table.getRowModel().rows.map((row) => (
//                     <tr
//                       key={row.id}
//                       onDoubleClick={() => SelectRow(row.original)}
//                       tabIndex={0}
//                       className="cursor-pointer transition-colors"
//                     >
//                       {row.getVisibleCells().map((cell) => {
//                         const value       = cell.getValue()
//                         const isCompleted = cell.column.id === 'completed'
//                         const isStatus    = cell.column.id === 'status' && value
//                         const isPaid      = cell.column.id === 'paid'
//                         const hasValue    = value !== null && value !== undefined && value !== ''

//                         return (
//                           <td key={cell.id} className="px-2 py-2 text-center">
//                             {isCompleted ? (
//                               <div className="flex justify-center">
//                                 <div className="px-3 py-1.5 rounded-2xl responsiveTextTable font-medium"
//                                   style={{
//                                     backgroundColor: value ? 'var(--ok-text)' : 'var(--bad-text)',
//                                     color: 'var(--bg-card)', border: '1px solid var(--line-strong)'
//                                   }}>
//                                   {value ? 'Completed' : 'Incompleted'}
//                                 </div>
//                               </div>
//                             ) : isStatus ? (
//                               <div className="flex justify-center">
//                                 <div className="px-3 py-1.5 rounded-2xl responsiveTextTable font-medium"
//                                   style={{
//                                     backgroundColor: value === 'Completed' ? 'var(--ok-text)' : 'var(--bad-text)',
//                                     color: 'var(--bg-card)', border: '1px solid var(--line-strong)'
//                                   }}>
//                                   {value}
//                                 </div>
//                               </div>
//                             ) : isPaid && hasValue ? (
//                               <div className="flex justify-center">
//                                 <div className="px-3 py-1.5 rounded-2xl responsiveTextTable font-medium min-w-[70px] text-center"
//                                   style={{
//                                     backgroundColor:
//                                       value === 'Paid'   ? '#ceb8ff' :
//                                       value === 'Unpaid' ? '#c387b4' : 'var(--bg-subtle)',
//                                     color: value === 'Paid' || value === 'Unpaid' ? 'var(--chathams-blue)' : 'var(--ink)',
//                                     border: '1px solid var(--line-strong)',
//                                     fontWeight: value === 'Paid' || value === 'Unpaid' ? '600' : '400'
//                                   }}>
//                                   {flexRender(cell.column.columnDef.cell, cell.getContext())}
//                                 </div>
//                               </div>
//                             ) : (
//                               <div className="flex justify-center">
//                                 {hasValue ? (
//                                   <div className="px-3 py-1.5 rounded-2xl responsiveTextTable font-medium min-w-[70px] text-center transition-all duration-200 ease-in-out"
//                                     style={{
//                                       backgroundColor: 'var(--bg-subtle)',
//                                       border: '1px solid var(--line-strong)',
//                                       ...(isEditMode && { boxShadow: 'inset 0 0 0 1px var(--line-strong)' })
//                                     }}>
//                                     {flexRender(cell.column.columnDef.cell, cell.getContext())}
//                                   </div>
//                                 ) : (
//                                   <div className="responsiveText text-[var(--ink-secondary)]">
//                                     {flexRender(cell.column.columnDef.cell, cell.getContext())}
//                                   </div>
//                                 )}
//                               </div>
//                             )}
//                           </td>
//                         )
//                       })}
//                     </tr>
//                   ))}

//                   {/* Empty state */}
//                   {table.getRowModel().rows.length === 0 && (
//                     <tr>
//                       <td colSpan={columnsWithSelection.length} className="py-24 text-center"
//                         style={{ border: 'none' }}>
//                         <div className="flex flex-col items-center justify-center">
//                           <div className="w-24 h-24 mb-5 rounded-full flex items-center justify-center shadow-lg"
//                             style={{ background: 'linear-gradient(135deg, #7A6FE3, #7A6FE3)' }}>
//                             <svg className="w-12 h-12" style={{ color: 'var(--bg-card)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
//                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
//                                 d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
//                             </svg>
//                           </div>
//                           <p className="font-normal mb-2"
//                             style={{ color: 'var(--ink)', fontSize: 'clamp(12px, 1.0vw, 14px)' }}>
//                             {getTtl('No data available', ln)}
//                           </p>
//                           <p style={{ color: 'var(--ink-secondary)', fontSize: 'clamp(10px, 0.9vw, 12px)' }}>
//                             Try adjusting your filters or date range
//                           </p>
//                         </div>
//                       </td>
//                     </tr>
//                   )}
//                 </tbody>
//               </table>
//             </div>
//           </div>

//           {/* ── MOBILE CARDS ── */}
//           <div className="block md:hidden">
//             {/* Mobile summary */}
//             <div className="mb-2">
//               <div className="flex items-center justify-between px-4 py-2"
//                 style={{ backgroundColor: 'var(--ok-border)' }}>
//                 <span className="responsiveTextTable" style={{ fontWeight: '400', color: 'var(--chathams-blue)' }}>Total $:</span>
//                 <span style={{ fontSize: 'var(--fs-input)', fontWeight: '600', color: 'var(--chathams-blue)' }}>{summaryUSD.currency}</span>
//                 <span style={{ fontSize: 'var(--fs-input)', fontWeight: '600', color: 'var(--chathams-blue)' }}>{summaryUSD.amount}</span>
//               </div>
//               <div className="flex items-center justify-between px-4 py-2"
//                 style={{ backgroundColor: 'var(--line-strong)' }}>
//                 <span className="responsiveTextTable" style={{ fontWeight: '400', color: 'var(--chathams-blue)' }}>Total €:</span>
//                 <span style={{ fontSize: 'var(--fs-input)', fontWeight: '600', color: 'var(--chathams-blue)' }}>{summaryEUR.currency}</span>
//                 <span style={{ fontSize: 'var(--fs-input)', fontWeight: '600', color: 'var(--chathams-blue)' }}>{summaryEUR.amount}</span>
//               </div>
//             </div>

//             <div className="overflow-y-auto dashboard-scroll px-2 py-2 space-y-2"
//               style={{ maxHeight: dynamicMaxHeight }}>
//               {table.getRowModel().rows.map((row, rowIndex) => (
//                 <div key={row.id}
//                   onClick={() => SelectRow(row.original)}
//                   className="rounded-2xl overflow-hidden shadow-lg transition-colors duration-200"
//                   style={{
//                     backgroundColor: "var(--bg-card)",
//                     border: highlightId === row.original.id ? '2px solid var(--warn-text)' : '1px solid var(--line)',
//                     boxShadow: highlightId === row.original.id
//                       ? 'var(--shadow-lg)'
//                       : '0 4px 12px rgba(var(--shadow-rgb), 0.06)'
//                   }}>
//                   <div className="px-3 py-2 flex items-center justify-between"
//                     style={{ background: 'var(--bg-subtle)' }}>
//                     <span className="font-normal" style={{ fontSize: 'clamp(9px, 0.8vw, 10px)' }}>
//                       {getTtl('Row', ln)} {rowIndex + 1}
//                     </span>
//                     {quickSumEnabled && (
//                       <input type="checkbox"
//                         checked={row.getIsSelected()}
//                         disabled={!row.getCanSelect()}
//                         onChange={row.getToggleSelectedHandler()}
//                         onClick={(e) => e.stopPropagation()}
//                         className="w-4 h-4 cursor-pointer rounded"
//                         style={{ accentColor: 'var(--on-brand)' }}
//                       />
//                     )}
//                   </div>
//                   <div className="p-4 space-y-2.5">
//                     {row.getVisibleCells().map((cell) => {
//                       if (cell.column.id === 'select') return null
//                       return (
//                         <div key={cell.id} className="flex flex-col space-y-1.5 pb-2.5 last:pb-0"
//                           style={{ borderBottom: '1px solid var(--line)' }}>
//                           <div className="uppercase tracking-wider font-normal"
//                             style={{ color: 'var(--ink-secondary)', fontSize: 'clamp(6px, 0.6vw, 7px)' }}>
//                             {cell.column.columnDef.header}
//                           </div>
//                           <div className="font-normal break-words px-2 py-1 rounded-2xl leading-relaxed min-h-7 flex items-center shadow-sm"
//                             style={{
//                               color: 'var(--ink)',
//                               background: 'linear-gradient(135deg, var(--bg-subtle), var(--bg-subtle))',
//                               fontSize: 'clamp(8px, 0.7vw, 10px)',
//                               border: '1px solid var(--line)'
//                             }}>
//                             {cell.column.id === 'completed' ? (
//                               cell.getValue() ? (
//                                 <div className="w-full px-2 py-2 rounded-lg responsiveTextTable font-medium flex items-center gap-2 justify-center shadow-md"
//                                   style={{ backgroundColor: 'var(--ok-text)', color: 'var(--bg-card)' }}>Completed</div>
//                               ) : (
//                                 <div className="w-full px-2 py-2 rounded-lg responsiveTextTable font-medium flex items-center gap-2 justify-center shadow-sm"
//                                   style={{ backgroundColor: 'var(--bad-text)', color: 'var(--bg-card)' }}>Pending</div>
//                               )
//                             ) : cell.column.id === 'paid' && cell.getValue() ? (
//                               <div className="w-full px-2 py-2 rounded-lg responsiveTextTable font-medium flex items-center gap-2 justify-center shadow-sm"
//                                 style={{
//                                   backgroundColor:
//                                     cell.getValue() === 'Paid'   ? '#ceb8ff' :
//                                     cell.getValue() === 'Unpaid' ? '#c387b4' : 'var(--bg-subtle)',
//                                   color: 'var(--chathams-blue)', border: '1px solid var(--line-strong)'
//                                 }}>
//                                 {flexRender(cell.column.columnDef.cell, cell.getContext())}
//                               </div>
//                             ) : (
//                               flexRender(cell.column.columnDef.cell, cell.getContext())
//                             )}
//                           </div>
//                         </div>
//                       )
//                     })}
//                   </div>
//                 </div>
//               ))}

//               {table.getRowModel().rows.length === 0 && (
//                 <div className="flex flex-col items-center justify-center py-24 px-3">
//                   <div className="w-24 h-24 mb-5 rounded-full flex items-center justify-center shadow-lg"
//                     style={{ background: 'linear-gradient(135deg, #7A6FE3, #7A6FE3)' }}>
//                     <svg className="w-12 h-12" style={{ color: 'var(--bg-card)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
//                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
//                         d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
//                     </svg>
//                   </div>
//                   <p className="font-normal mb-2 text-center"
//                     style={{ color: 'var(--ink)', fontSize: 'clamp(9px, 0.8vw, 10px)' }}>
//                     {getTtl('No data available', ln)}
//                   </p>
//                   <p className="text-center" style={{ color: 'var(--ink-secondary)', fontSize: 'clamp(7px, 0.6vw, 9px)' }}>
//                     Try adjusting your filters or date range
//                   </p>
//                 </div>
//               )}
//             </div>
//           </div>

//           {/* ── PAGINATION FOOTER ── */}
//           <div className="flex-shrink-0"
//             style={{
//               borderTop: '2px solid var(--line)',
//               background: 'linear-gradient(90deg, rgba(255,255,255,0.95), rgba(250,250,250,0.98))'
//             }}>
//             <div className="px-4 py-3">
//               <div className="grid grid-cols-3 items-center">
//                 <div className="flex justify-start">
//                   <div className="whitespace-nowrap font-normal"
//                     style={{ color: 'var(--ink-secondary)', fontSize: 'clamp(7px, 0.6vw, 9px)' }}>
//                     {`${
//                       table.getState().pagination.pageIndex * table.getState().pagination.pageSize +
//                       (table.getFilteredRowModel().rows.length ? 1 : 0)
//                     } - ${
//                       table.getRowModel().rows.length +
//                       table.getState().pagination.pageIndex * table.getState().pagination.pageSize
//                     } ${getTtl('of', ln)} ${table.getFilteredRowModel().rows.length}`}
//                   </div>
//                 </div>
//                 <div className="flex justify-center">
//                   <Paginator table={table} />
//                 </div>
//                 <div className="flex justify-end">
//                   <RowsIndicator table={table} />
//                 </div>
//               </div>
//             </div>
//           </div>

//         </div>
//       </div>
//     </div>
//   )
// }

// export default Customtable
'use client'

// Fade-in animation for badges
if (typeof window !== 'undefined') {
  const style = document.createElement('style');
  style.innerHTML = `@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }`;
  document.head.appendChild(style);
}

import Header from "../../../components/table/header";
import SortIcon from "@components/table/SortIcon";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable
} from "@tanstack/react-table"

import { Fragment, useEffect, useLayoutEffect, useMemo, useState, useContext, useRef } from "react"


import { Paginator } from "../../../components/table/Paginator";
import RowsIndicator from "../../../components/table/RowsIndicator";

import { SettingsContext } from "../../../contexts/useSettingsContext";
import { usePathname } from "next/navigation";
import { getTtl } from "../../../utils/languages";

import FiltersIcon from '../../../components/table/filters/filters';
import ResetFilterTableIcon from '../../../components/table/filters/resetTabe';
import dateBetweenFilterFn from '../../../components/table/filters/date-between-filter';
import { Filter } from '../../../components/table/filters/filterFunc';
import { labelAwareGlobalFilter } from '../../../components/table/filters/labelAwareGlobalFilter';
import { TONES } from '../../../components/statusUtils';
import EmptyState from '../../../components/EmptyState';

const Customtable = ({
  data,
  columns,
  invisible,
  SelectRow,
  excellReport,
  setFilteredId,
  highlightId,
  onCellUpdate,
  summaryUSD = { amount: '$ 0.00' },
  summaryEUR = { amount: '€ 1,580.00' },
  // The column ID whose center the currency label should sit under (default: 'cur')
  currencyColumnId = 'cur',
  // The column ID whose center the amount value should sit under (default: 'amount')
  amountColumnId = 'amount',
}) => {

  const [globalFilter, setGlobalFilter]         = useState('')
  const [columnVisibility, setColumnVisibility] = useState(invisible)
  const [filterOn, setFilterOn]                 = useState(false)
  const [columnFilters, setColumnFilters]       = useState([])
  const [sorting, setSorting]                   = useState([])
  const [quickSumEnabled, setQuickSumEnabled]   = useState(false)
  const [quickSumColumns, setQuickSumColumns]   = useState([])
  const [isEditMode, setIsEditMode]             = useState(false)
  const [rowSelection, setRowSelection]         = useState({})
  const [selectedRowId, setSelectedRowId]       = useState(null)
  const [currencyColCenter, setCurrencyColCenter] = useState(null) // px from left of table
  const [amountColCenter, setAmountColCenter]   = useState(null) // px from left of table

  const [{ pageIndex, pageSize }, setPagination] = useState({ pageIndex: 0, pageSize: 25 })
  const pagination = useMemo(() => ({ pageIndex, pageSize }), [pageIndex, pageSize])

  const { ln } = useContext(SettingsContext)

  // Refs for measurement
  const theadRowRef  = useRef(null)   // the <tr> of column headers
  const tableWrapRef = useRef(null)   // the scrollable wrapper div

  /* ---------- Selection Column ---------- */
  const columnsWithSelection = useMemo(() => {
    if (!quickSumEnabled) return columns
    const selectCol = {
      id: "select",
      header: ({ table }) => (
        <div className="flex items-center justify-center w-full h-full">
          <input
            type="checkbox"
            checked={table.getIsAllPageRowsSelected()}
            ref={el => { if (el) el.indeterminate = table.getIsSomePageRowsSelected() }}
            onChange={table.getToggleAllPageRowsSelectedHandler()}
            className="w-4 h-4 cursor-pointer rounded"
            style={{ accentColor: 'var(--brand-soft)' }}
          />
        </div>
      ),
      cell: ({ row }) => (
        <div className="flex items-center justify-center w-full h-full">
          <input
            type="checkbox"
            checked={row.getIsSelected()}
            disabled={!row.getCanSelect()}
            onChange={row.getToggleSelectedHandler()}
            className="w-4 h-4 cursor-pointer rounded"
            style={{ accentColor: 'var(--brand-soft)' }}
          />
        </div>
      ),
      enableSorting: false,
      enableColumnFilter: false,
      size: 50, minSize: 50, maxSize: 50,
    }
    return [selectCol, ...(columns || [])]
  }, [columns, quickSumEnabled])

  /* ---------- TABLE ---------- */
  const table = useReactTable({
    meta: {
      isEditMode,
      updateData: (rowIndex, columnId, value) => {
        if (!isEditMode) return
        onCellUpdate?.({ rowIndex, columnId, value })
      },
    },
    columns: columnsWithSelection,
    data,
    enableRowSelection: quickSumEnabled,
    getCoreRowModel: getCoreRowModel(),
    filterFns: { dateBetweenFilterFn },
    globalFilterFn: labelAwareGlobalFilter,
    state: { globalFilter, columnVisibility, pagination, columnFilters, rowSelection, sorting },
    onRowSelectionChange: setRowSelection,
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setColumnVisibility,
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onPaginationChange: setPagination,
  })

  const resetTable = () => table.resetColumnFilters()
  useEffect(() => resetTable(), [])

  useEffect(() => {
    setFilteredId(table.getFilteredRowModel().rows.map(r => r.original.id))
  }, [columnFilters, globalFilter])

  /* ── Measure the Amount column center after every render ── */
  const measureAmountCol = () => {
    if (!theadRowRef.current || !tableWrapRef.current) return
    const ths       = Array.from(theadRowRef.current.querySelectorAll('th'))
    const wrapRect  = tableWrapRef.current.getBoundingClientRect()
    const visible   = table.getVisibleLeafColumns()

    let nextCurrencyCenter = null
    let nextAmountCenter = null

    visible.forEach((col, idx) => {
      const th = ths[idx]
      if (!th) return
      const rect   = th.getBoundingClientRect()
      // center of this th relative to the wrapper's left edge (account for scroll)
      const center = rect.left - wrapRect.left + tableWrapRef.current.scrollLeft + rect.width / 2
      if (col.id === currencyColumnId) nextCurrencyCenter = center
      if (col.id === amountColumnId) nextAmountCenter = center
    })

    setCurrencyColCenter(nextCurrencyCenter)
    setAmountColCenter(nextAmountCenter)
  }

  // Run after every paint so the header is in the DOM
  useLayoutEffect(() => {
    measureAmountCol()
  })

  // Also re-measure on resize
  useEffect(() => {
    const ro = new ResizeObserver(() => measureAmountCol())
    if (tableWrapRef.current) ro.observe(tableWrapRef.current)
    return () => ro.disconnect()
  }, [table, currencyColumnId, amountColumnId, columnVisibility, quickSumEnabled])

  const currentRows      = table.getRowModel().rows.length
  const dynamicMaxHeight = currentRows > 0
    ? `${Math.min(currentRows * 40 + 220, 700)}px`
    : '320px'

  const totalCols = columnsWithSelection.length


  /* ── Renders one flat summary bar ── */
  const renderSummaryBar = (bgColor, label, amountText) => (
    <tr>
      <td
        colSpan={totalCols}
        style={{
          backgroundColor: bgColor,
          border: 'none',
          padding: 0,
          height: '36px',
          position: 'relative',
          overflow: 'visible',
        }}
      >
        {/* Left label */}
        <span className="responsiveTextTable" style={{
          position: 'absolute',
          left: '14px',
          top: '50%',
          transform: 'translateY(-50%)',
          fontWeight: '400',
          color: 'var(--chathams-blue)',
          whiteSpace: 'nowrap',
        }}>
          {label}
        </span>

        {/* Amount — centred exactly over the Amount column */}
        {amountColCenter !== null && (
          <span className="responsiveTextTable" style={{
            position: 'absolute',
            left: `${amountColCenter}px`,
            top: '50%',
            transform: 'translate(-50%, -50%)',
            fontWeight: '400',
            color: 'var(--chathams-blue)',
            whiteSpace: 'nowrap',
          }}>
            {amountText}
          </span>
        )}
      </td>
    </tr>
  )

  return (
    <div className="w-full">
      <style jsx global>{`
        /* .custom-table th/td now live in globals.css — one definition for every
           table in the app. Two things stay here because they are genuinely
           local, not a restatement of the standard:
             - padding !important: this table sets padding inline on 13 cells,
               and a normal stylesheet rule loses to an inline style. The
               !important is what makes the standard's 4px/6px band actually
               apply here, so it has to outrank them explicitly.
             - white-space on the header: these column labels must not wrap. */
        .custom-table th {
          padding: 4px 8px !important;
          white-space: nowrap;
        }

        .custom-table td {
          padding: 6px 8px !important;
        }

        /* ── Summary td — strip ALL borders so it's a flat bar ── */
        .custom-table thead tr.summary-bar-row > td {
          border-top: none !important;
          border-bottom: none !important;
          border-left: none !important;
          border-right: none !important;
          padding: 0 !important;
        }

        /* ── Header blue ── */
        .header-blue {
          background-color: var(--bg-subtle);
          color: var(--ink-secondary);
        }

        /* Paid/Unpaid never wraps */
        .pagination-center { display:flex; justify-content:center; align-items:center; gap:10px; }
        .page-btn   { padding:6px 12px; border-radius:8px; font-weight:500; }
        .page-active { background-color:var(--brand-deep); color:white; }
        .page-normal { color:var(--chathams-blue); }
      `}</style>

      <div className="custom-table">
        <div className="relative flex flex-col rounded-2xl">
          <div className="absolute inset-0 rounded-2xl border border-[var(--line)] pointer-events-none z-sticky" />

          {/* ── TOOLBAR ── */}
          <div className="flex-shrink-0 rounded-t-2xl"
            style={{
              borderBottom: '1px solid var(--line)',
              background: "var(--bg-card)",
            }}>
            <Header
              globalFilter={globalFilter}
              setGlobalFilter={setGlobalFilter}
              table={table}
              excellReport={excellReport}
              filterIcon={FiltersIcon(ln, filterOn, setFilterOn)}
              isEditMode={isEditMode}
              setIsEditMode={setIsEditMode}
              resetFilterTable={ResetFilterTableIcon(ln, resetTable, filterOn)}
              quickSumEnabled={quickSumEnabled}
              setQuickSumEnabled={setQuickSumEnabled}
              quickSumColumns={quickSumColumns}
              setQuickSumColumns={setQuickSumColumns}
            />
          </div>

          {/* ── DESKTOP TABLE ── */}
          <div className="hidden md:block flex-1">
            <div
              ref={tableWrapRef}
              className="overflow-auto dashboard-scroll isolate"
              style={{
                maxHeight: dynamicMaxHeight,
                position: 'relative',
              }}
            >
              <table
                className="w-full"
                style={{ tableLayout: 'auto', borderCollapse: 'collapse' }}
              >
                {/* sticky: the whole <thead> pins, not just the column labels — the
                    two total bands are the first thing you check a figure against, so
                    they stay in view with the header they sit above. It sticks to the
                    maxHeight box that wraps this table, which is the only scrolling
                    ancestor here. */}
                <thead className="sticky top-0 z-sticky">
                  {/* Total $ band. Was --ok-border green over a --line-strong grey.
                      The green carried no meaning here — a totals row is structure,
                      not a status — and it was the only surface on the page outside
                      the violet base, so both bands moved into the brand family:
                      --violet-border for USD, the lighter --bg-sunken for EUR. They
                      separate by value now, not by hue, which is what keeps them
                      readable as two rows (--line-strong sat too close to
                      --violet-border to do that job). Same pairing on
                      companyexpenses and specialinvoices. */}
                  <tr className="summary-bar-row">
                    <td
                      colSpan={totalCols}
                      style={{
                        backgroundColor: 'var(--violet-border)',
                        border: 'none',
                        padding: 0,
                        height: '26px',
                        position: 'relative',
                        overflow: 'visible',
                      }}
                    >
                      <span className="responsiveTextTable" style={{
                        position: 'absolute', left: '14px', top: '50%',
                        transform: 'translateY(-50%)',
                        fontWeight: '500', color: 'var(--brand-strong)', whiteSpace: 'nowrap',
                      }}>
                        Total $:
                      </span>
                      {currencyColCenter !== null && (
                        <span className="responsiveTextTable" style={{
                          position: 'absolute',
                          left: `${currencyColCenter}px`,
                          top: '50%',
                          transform: 'translate(-50%, -50%)',
                          fontWeight: '500', color: 'var(--brand-strong)', whiteSpace: 'nowrap',
                        }}>
                          USD
                        </span>
                      )}
                      {amountColCenter !== null && (
                        <span className="responsiveTextTable" style={{
                          position: 'absolute',
                          left: `${amountColCenter}px`,
                          top: '50%',
                          transform: 'translate(-50%, -50%)',
                          fontWeight: '500', color: 'var(--brand-strong)', whiteSpace: 'nowrap',
                        }}>
                          {summaryUSD.amount}
                        </span>
                      )}
                    </td>
                  </tr>

                  {/* Total € band — the neutral half of the pair. */}
                  <tr className="summary-bar-row">
                    <td
                      colSpan={totalCols}
                      style={{
                        backgroundColor: 'var(--bg-sunken)',
                        border: 'none',
                        padding: 0,
                        height: '26px',
                        position: 'relative',
                        overflow: 'visible',
                      }}
                    >
                      <span className="responsiveTextTable" style={{
                        position: 'absolute', left: '14px', top: '50%',
                        transform: 'translateY(-50%)',
                        fontWeight: '500', color: 'var(--chathams-blue)', whiteSpace: 'nowrap',
                      }}>
                        Total €:
                      </span>
                      {currencyColCenter !== null && (
                        <span className="responsiveTextTable" style={{
                          position: 'absolute',
                          left: `${currencyColCenter}px`,
                          top: '50%',
                          transform: 'translate(-50%, -50%)',
                          fontWeight: '500', color: 'var(--chathams-blue)', whiteSpace: 'nowrap',
                        }}>
                          EUR
                        </span>
                      )}
                      {amountColCenter !== null && (
                        <span className="responsiveTextTable" style={{
                          position: 'absolute',
                          left: `${amountColCenter}px`,
                          top: '50%',
                          transform: 'translate(-50%, -50%)',
                          fontWeight: '500', color: 'var(--chathams-blue)', whiteSpace: 'nowrap',
                        }}>
                          {summaryEUR.amount}
                        </span>
                      )}
                    </td>
                  </tr>

                  {/* ── Column headers — ref here for measurement ── */}
                  {table.getHeaderGroups().map(hdGroup => (
                    <Fragment key={hdGroup.id}>
                    <tr ref={theadRowRef}>
                      {hdGroup.headers.map(header => (
                        <th
                          key={header.id}
                          className="header-blue font-sans responsiveTextTable font-medium"
                          onClick={header.column.getCanSort() ? header.column.getToggleSortingHandler() : undefined}
                          style={{
                            minWidth:
                              header.column.id === 'paid'   ? '110px' :
                              header.column.id === 'select' ? '50px'  : '80px',
                            cursor: header.column.getCanSort() ? 'pointer' : 'default',
                            userSelect: 'none',
                          }}
                        >
                          <span className="inline-flex items-center justify-center gap-1">
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            <SortIcon column={header.column} />
                          </span>
                        </th>
                      ))}
                    </tr>
                    {filterOn && (
                      <tr style={{ backgroundColor: "var(--bg-card)" }}>
                        {hdGroup.headers.map(header => (
                          <th key={header.id} className="px-2 py-1.5" style={{ backgroundColor: "var(--bg-card)", borderBottom: '2px solid var(--line)' }}>
                            {header.column.getCanFilter() && (
                              <Filter column={header.column} table={table} filterOn={filterOn} />
                            )}
                          </th>
                        ))}
                      </tr>
                    )}
                    </Fragment>
                  ))}
                </thead>

                <tbody>
                  {table.getRowModel().rows.map((row) => (
                    <tr
                      key={row.id}
                      onClick={() => setSelectedRowId(row.id)}
                      onDoubleClick={() => SelectRow(row.original)}
                      tabIndex={0}
                      className={`cursor-pointer transition-colors${selectedRowId === row.id ? ' selected-row' : ' cursor-pointer'}`}
                    >
                      {row.getVisibleCells().map((cell) => {
                        if (cell.column.id === 'select') {
                          return (
                            <td key={cell.id} className="px-2 py-0.5 text-center" style={{ whiteSpace: 'nowrap' }}>
                              <div className="flex justify-center">
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                              </div>
                            </td>
                          )
                        }
                        const value = cell.getValue()
                        const options = cell.column.columnDef?.meta?.options || []
                        const resolvedLabel = options.find((opt) => String(opt.value) === String(value))?.label ?? value
                        const normalizedValue = String(resolvedLabel ?? '').trim().toLowerCase()
                        const isPaidValue = normalizedValue === 'paid'
                        const isUnpaidValue = normalizedValue === 'unpaid'
                        const isUSDValue = ['us', 'usd', '$'].includes(normalizedValue)
                        const isEURValue = ['eu', 'eur', '€'].includes(normalizedValue)
                        const isCompleted = cell.column.id === 'completed'
                        const isPaid      = cell.column.id === 'paid'
                        const isCurrency  = cell.column.id === 'cur'
                        const hasValue    = value !== null && value !== undefined && value !== ''

                        return (
                          <td key={cell.id} className="px-1 py-0.5 text-center" style={{ whiteSpace: 'nowrap' }}>
                            {isCompleted ? (
                              <div className="flex justify-center">
                                <div className="px-1 py-1 responsiveTextTable font-medium"
                                  style={{
                                    backgroundColor: value ? 'var(--ok-bg)' : 'var(--bad-bg)',
                                    color: value ? 'var(--ok-text)' : 'var(--bad-text)',
                                    border: `1px solid ${value ? 'var(--ok-border)' : 'var(--bad-border)'}`
                                  }}>
                                  {value ? 'Completed' : 'Incompleted'}
                                </div>
                              </div>
                            ) : isPaid ? (
                              <div className="flex justify-center">
                                <div className={`px-2.5 py-0.5 responsiveTextTable min-w-[70px] text-center ${(isPaidValue || isUnpaidValue) ? 'rounded-lg font-medium' : 'font-normal'}`}
                                  style={{
                                    backgroundColor: isUnpaidValue ? 'var(--bad-bg)' : isPaidValue ? 'var(--ok-bg)' : 'transparent',
                                    color: isPaidValue ? 'var(--ok-text)' : isUnpaidValue ? 'var(--bad-text)' : 'var(--ink)',
                                    border: `1px solid ${isPaidValue ? 'var(--ok-border)' : isUnpaidValue ? 'var(--bad-border)' : 'transparent'}`,
                                  }}>
                                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                </div>
                              </div>
                            ) : (
                              <div className="flex justify-center">
                                {isCurrency && hasValue ? (
                                  (() => {
                                    const bg = isUSDValue ? 'var(--ok-bg)' : isEURValue ? 'var(--bg-subtle)' : 'var(--line-strong)'
                                    const border = isUSDValue ? '1px solid var(--ok-border)' : isEURValue ? '1px solid var(--line)' : '1px solid var(--neutral-border)'
                                    const color = isUSDValue ? 'var(--ok-text)' : 'var(--chathams-blue)'
                                    return (
                                      <span className="rounded-full responsiveTextTable font-medium"
                                        style={{
                                          backgroundColor: bg,
                                          color: color,
                                          border: border,
                                          borderRadius: '999px',
                                          padding: '2px 12px',
                                          minWidth: '30px',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          whiteSpace: 'nowrap',
                                        }}>
                                        {isUSDValue ? '$' : isEURValue ? '€' : String(value)}
                                      </span>
                                    )
                                  })()
                                ) : hasValue ? (
                                  <div className="px-1 py-1 responsiveTextTable min-w-[70px]">
                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                  </div>
                                ) : (
                                  <div className="px-1 py-1 responsiveTextTable w-full">&nbsp;</div>
                                )}
                              </div>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}

                  {/* Empty state */}
                  {table.getRowModel().rows.length === 0 && (
                    <tr>
                      <td colSpan={totalCols} className="py-24 text-center"
                        style={{ border: 'none' }}>
                        <EmptyState message={getTtl('No data available', ln)} hint="Try adjusting your filters or date range" />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── MOBILE CARDS ── */}
          <div className="block md:hidden">
            {/* Mobile summary bars */}
            <div className="mb-2">
              <div className="flex items-center justify-between px-4 py-2"
                style={{ backgroundColor: 'var(--violet-border)' }}>
                <span className="responsiveTextTable" style={{ fontWeight: '400', color: 'var(--brand-strong)' }}>Total $:</span>
                <span className="responsiveTextTable" style={{ fontWeight: '400', color: 'var(--brand-strong)' }}>USD</span>
                <span className="responsiveTextTable" style={{ fontWeight: '400', color: 'var(--brand-strong)' }}>{summaryUSD.amount}</span>
              </div>
              <div className="flex items-center justify-between px-4 py-2"
                style={{ backgroundColor: 'var(--bg-sunken)' }}>
                <span className="responsiveTextTable" style={{ fontWeight: '400', color: 'var(--chathams-blue)' }}>Total €:</span>
                <span className="responsiveTextTable" style={{ fontWeight: '400', color: 'var(--chathams-blue)' }}>EUR</span>
                <span className="responsiveTextTable" style={{ fontWeight: '400', color: 'var(--chathams-blue)' }}>{summaryEUR.amount}</span>
              </div>
            </div>

            <div className="overflow-y-auto dashboard-scroll px-2 py-2 space-y-2"
              style={{ maxHeight: dynamicMaxHeight }}>
              {table.getRowModel().rows.map((row, rowIndex) => (
                <div key={row.id}
                  onClick={() => SelectRow(row.original)}
                  className="rounded-2xl overflow-hidden shadow-lg transition-colors duration-200"
                  style={{
                    backgroundColor: "var(--bg-card)",
                    border: highlightId === row.original.id ? '2px solid var(--warn-text)' : '1px solid var(--line)',
                    boxShadow: highlightId === row.original.id
                      ? 'var(--shadow-lg)'
                      : '0 4px 12px rgba(var(--shadow-rgb), 0.06)'
                  }}>
                  <div className="px-3 py-2 flex items-center justify-between"
                    style={{ background: 'var(--bg-subtle)' }}>
                    <span className="font-normal" style={{ fontSize: 'var(--fs-table)' }}>
                      {getTtl('Row', ln)} {rowIndex + 1}
                    </span>
                    {quickSumEnabled && (
                      <input type="checkbox"
                        checked={row.getIsSelected()}
                        disabled={!row.getCanSelect()}
                        onChange={row.getToggleSelectedHandler()}
                        onClick={(e) => e.stopPropagation()}
                        className="w-4 h-4 cursor-pointer rounded"
                        style={{ accentColor: 'var(--on-brand)' }}
                      />
                    )}
                  </div>
                  <div className="p-4 space-y-2.5">
                    {row.getVisibleCells().map((cell) => {
                      if (cell.column.id === 'select') return null
                      const rawValue = cell.getValue()
                      const options = cell.column.columnDef?.meta?.options || []
                      const resolvedLabel = options.find((opt) => String(opt.value) === String(rawValue))?.label ?? rawValue
                      const normalizedValue = String(resolvedLabel ?? '').trim().toLowerCase()
                      const isPaidValue = normalizedValue === 'paid'
                      const isUnpaidValue = normalizedValue === 'unpaid'
                      const isUSDValue = ['us', 'usd', '$'].includes(normalizedValue)
                      const isEURValue = ['eu', 'eur', '€'].includes(normalizedValue)
                      return (
                        <div key={cell.id} className="flex flex-col space-y-1.5 pb-2.5 last:pb-0"
                          style={{ borderBottom: '1px solid var(--line)' }}>
                          <div className="uppercase tracking-wider font-normal"
                            style={{ color: 'var(--regent-gray)', fontSize: 'var(--fs-caption)' }}>
                            {cell.column.columnDef.header}
                          </div>
                          <div className="responsiveTextTable break-words px-2 py-1 rounded-2xl leading-relaxed min-h-7 flex items-center shadow-sm"
                            style={{
                              color: 'var(--port-gore)',
                              background: 'linear-gradient(135deg,var(--bg-subtle),var(--bg-subtle))',
                              border: '1px solid var(--line)'
                            }}>
                            {cell.column.id === 'completed' ? (
                              cell.getValue() ? (
                                <div className="w-full px-2 py-2 rounded-lg responsiveTextTable font-medium flex items-center gap-2 justify-center shadow-md"
                                  style={{ backgroundColor: 'var(--ok-bg)', color: 'var(--ok-text)' }}>Completed</div>
                              ) : (
                                <div className="w-full px-2 py-2 rounded-lg responsiveTextTable font-medium flex items-center gap-2 justify-center shadow-sm"
                                  style={{ backgroundColor: 'var(--bad-bg)', color: 'var(--bad-text)' }}>Pending</div>
                              )
                            ) : cell.column.id === 'paid' && cell.getValue() ? (
                              <div className="w-full px-2 py-2 rounded-lg responsiveTextTable font-medium flex items-center gap-2 justify-center shadow-sm"
                                style={{
                                  backgroundColor:
                                    isUnpaidValue ? 'var(--warn-bg)' :
                                    isPaidValue ? 'var(--ok-bg)' : 'var(--bg-subtle)',
                                  color: isPaidValue ? 'var(--ok-text)' : isUnpaidValue ? 'var(--warn-text)' : 'var(--chathams-blue)',
                                  border: isPaidValue ? '1px solid var(--ok-border)' : isUnpaidValue ? '1px solid var(--warn-border)' : '1px solid var(--line-strong)'
                                }}>
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                              </div>
                            ) : cell.column.id === 'cur' && cell.getValue() ? (
                              <div className="w-full px-2 py-2 rounded-lg responsiveTextTable font-medium flex items-center gap-2 justify-center shadow-sm"
                                style={{
                                  backgroundColor:
                                    isUSDValue ? 'var(--ok-bg)' :
                                    isEURValue ? 'var(--bg-subtle)' : 'var(--line-strong)',
                                  color: isUSDValue ? 'var(--ok-text)' : 'var(--chathams-blue)',
                                  border: isUSDValue ? '1px solid var(--ok-border)' : isEURValue ? '1px solid var(--line)' : '1px solid var(--neutral-border)'
                                }}>
                                {isUSDValue ? '$' :
                                 isEURValue ? '€' :
                                 flexRender(cell.column.columnDef.cell, cell.getContext())}
                              </div>
                            ) : (
                              flexRender(cell.column.columnDef.cell, cell.getContext())
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}

              {table.getRowModel().rows.length === 0 && (
                <div className="flex flex-col items-center justify-center py-24 px-3">
                                    <p className="responsiveText font-normal mb-2 text-center" style={{ color: 'var(--port-gore)' }}>
                    {getTtl('No data available', ln)}
                  </p>
                  <p className="responsiveText text-center" style={{ color: 'var(--regent-gray)' }}>
                    Try adjusting your filters or date range
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ── PAGINATION FOOTER ── */}
          <div className="flex-shrink-0 rounded-b-2xl"
            style={{
              borderTop: '1px solid var(--line)',
              background: "var(--bg-card)",
            }}>
            <div className="px-4 py-3">
              <div className="grid grid-cols-3 items-center">
                <div className="flex justify-start">
                  <div className="responsiveText font-normal whitespace-nowrap"
                    style={{ color: 'var(--regent-gray)' }}>
                    {`${
                      table.getState().pagination.pageIndex * table.getState().pagination.pageSize +
                      (table.getFilteredRowModel().rows.length ? 1 : 0)
                    } - ${
                      table.getRowModel().rows.length +
                      table.getState().pagination.pageIndex * table.getState().pagination.pageSize
                    } ${getTtl('of', ln)} ${table.getFilteredRowModel().rows.length}`}
                  </div>
                </div>
                <div className="flex justify-center">
                  <Paginator table={table} />
                </div>
                <div className="flex justify-end">
                  <RowsIndicator table={table} />
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

export default Customtable
