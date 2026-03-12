
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
//             style={{ accentColor: '#BCE1FE' }}
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
//             style={{ accentColor: '#BCE1FE' }}
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
//               fontSize: '12px',
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
//                 fontSize: '11px',
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
//                 fontSize: '11px',
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
//           border: 1px solid #d7d7d7;
//           text-align: center;
//           font-size: 12px !important;
//           font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial;
//           padding: 10px 8px !important;
//           vertical-align: middle;
//           white-space: nowrap;
//         }

//         /* ── Data cells ── */
//         .custom-table td {
//           border: 1px solid #d7d7d7;
//           text-align: center;
//           font-size: 10px !important;
//           font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial;
//           padding: 8px 6px !important;
//           vertical-align: middle;
//           height: 40px;
//         }

//         /* ── Summary td — no border, no padding, flat color bar ── */
//         .custom-table thead tr.summary-row td {
//           border: none !important;
//           padding: 0 !important;
//         }

//         /* ── Blue header row ── */
//         .header-blue {
//           background-color: #d9e6f2;
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
//         .page-active { background-color: var(--chathams-blue); color: white; }
//         .page-normal { color: var(--chathams-blue); }
//       `}</style>

//       <div className="custom-table">
//         <div className="flex flex-col">

//           {/* ── TOOLBAR ── */}
//           <div className="flex-shrink-0"
//             style={{
//               borderBottom: '2px solid #E5E7EB',
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
//                 border: '1px solid #d7d7d7',
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
//                         backgroundColor: '#b7d1b5',
//                         border: 'none',
//                         padding: 0,
//                         height: '34px',
//                         position: 'relative',
//                       }}
//                     >
//                       <div style={{ position: 'relative', width: '100%', height: '34px', display: 'flex', alignItems: 'center' }}>
//                         <span style={{ position: 'absolute', left: '14px', fontSize: '12px', fontWeight: '600', color: 'var(--chathams-blue)', whiteSpace: 'nowrap' }}>
//                           Total $:
//                         </span>
//                         {colPositions.currency && (
//                           <span style={{
//                             position: 'absolute',
//                             left: `${colPositions.currency.left + colPositions.currency.width / 2}px`,
//                             transform: 'translateX(-50%)',
//                             fontSize: '11px', fontWeight: '600', color: 'var(--chathams-blue)', whiteSpace: 'nowrap',
//                           }}>
//                             {summaryUSD.currency}
//                           </span>
//                         )}
//                         {colPositions.amount && (
//                           <span style={{
//                             position: 'absolute',
//                             left: `${colPositions.amount.left + colPositions.amount.width / 2}px`,
//                             transform: 'translateX(-50%)',
//                             fontSize: '11px', fontWeight: '700', color: 'var(--chathams-blue)', whiteSpace: 'nowrap',
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
//                         backgroundColor: '#8db6d8',
//                         border: 'none',
//                         padding: 0,
//                         height: '34px',
//                         position: 'relative',
//                       }}
//                     >
//                       <div style={{ position: 'relative', width: '100%', height: '34px', display: 'flex', alignItems: 'center' }}>
//                         <span style={{ position: 'absolute', left: '14px', fontSize: '12px', fontWeight: '600', color: 'var(--chathams-blue)', whiteSpace: 'nowrap' }}>
//                           Total €:
//                         </span>
//                         {colPositions.currency && (
//                           <span style={{
//                             position: 'absolute',
//                             left: `${colPositions.currency.left + colPositions.currency.width / 2}px`,
//                             transform: 'translateX(-50%)',
//                             fontSize: '11px', fontWeight: '600', color: 'var(--chathams-blue)', whiteSpace: 'nowrap',
//                           }}>
//                             {summaryEUR.currency}
//                           </span>
//                         )}
//                         {colPositions.amount && (
//                           <span style={{
//                             position: 'absolute',
//                             left: `${colPositions.amount.left + colPositions.amount.width / 2}px`,
//                             transform: 'translateX(-50%)',
//                             fontSize: '11px', fontWeight: '700', color: 'var(--chathams-blue)', whiteSpace: 'nowrap',
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
//                       className="cursor-pointer hover:bg-[#dbeeff] transition-colors"
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
//                                 <div className="px-3 py-1.5 rounded-xl text-[11px] font-normal"
//                                   style={{
//                                     backgroundColor: value ? '#00bf63' : '#eb3636',
//                                     color: '#FFFFFF', border: '1px solid #cecece'
//                                   }}>
//                                   {value ? 'Completed' : 'Incompleted'}
//                                 </div>
//                               </div>
//                             ) : isStatus ? (
//                               <div className="flex justify-center">
//                                 <div className="px-3 py-1.5 rounded-xl text-[11px] font-normal"
//                                   style={{
//                                     backgroundColor: value === 'Completed' ? '#00bf63' : '#eb3636',
//                                     color: '#FFFFFF', border: '1px solid #cecece'
//                                   }}>
//                                   {value}
//                                 </div>
//                               </div>
//                             ) : isPaid && hasValue ? (
//                               <div className="flex justify-center">
//                                 <div className="px-3 py-1.5 rounded-xl text-[11px] font-normal min-w-[70px] text-center"
//                                   style={{
//                                     backgroundColor:
//                                       value === 'Paid'   ? '#ceb8ff' :
//                                       value === 'Unpaid' ? '#c387b4' : '#f9f9f9',
//                                     color: value === 'Paid' || value === 'Unpaid' ? 'var(--chathams-blue)' : '#1F2937',
//                                     border: '1px solid #cecece',
//                                     fontWeight: value === 'Paid' || value === 'Unpaid' ? '600' : '400'
//                                   }}>
//                                   {flexRender(cell.column.columnDef.cell, cell.getContext())}
//                                 </div>
//                               </div>
//                             ) : (
//                               <div className="flex justify-center">
//                                 {hasValue ? (
//                                   <div className="px-3 py-1.5 rounded-xl text-[11px] font-normal min-w-[70px] text-center transition-all duration-200 ease-in-out"
//                                     style={{
//                                       backgroundColor: '#f9f9f9',
//                                       border: '1px solid #cecece',
//                                       ...(isEditMode && { boxShadow: 'inset 0 0 0 1px #d1d1d1' })
//                                     }}>
//                                     {flexRender(cell.column.columnDef.cell, cell.getContext())}
//                                   </div>
//                                 ) : (
//                                   <div className="text-[11px] text-[#6B7280]">
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
//                             style={{ background: 'linear-gradient(135deg, #6366F1, #A855F7)' }}>
//                             <svg className="w-12 h-12" style={{ color: '#FFFFFF' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
//                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
//                                 d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
//                             </svg>
//                           </div>
//                           <p className="font-normal mb-2"
//                             style={{ color: '#1F2937', fontSize: 'clamp(12px, 1.0vw, 14px)' }}>
//                             {getTtl('No data available', ln)}
//                           </p>
//                           <p style={{ color: '#6B7280', fontSize: 'clamp(10px, 0.9vw, 12px)' }}>
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
//                 style={{ backgroundColor: '#b7d1b5' }}>
//                 <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--chathams-blue)' }}>Total $:</span>
//                 <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--chathams-blue)' }}>{summaryUSD.currency}</span>
//                 <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--chathams-blue)' }}>{summaryUSD.amount}</span>
//               </div>
//               <div className="flex items-center justify-between px-4 py-2"
//                 style={{ backgroundColor: '#8db6d8' }}>
//                 <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--chathams-blue)' }}>Total €:</span>
//                 <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--chathams-blue)' }}>{summaryEUR.currency}</span>
//                 <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--chathams-blue)' }}>{summaryEUR.amount}</span>
//               </div>
//             </div>

//             <div className="overflow-y-auto dashboard-scroll px-2 py-2 space-y-2"
//               style={{ maxHeight: dynamicMaxHeight }}>
//               {table.getRowModel().rows.map((row, rowIndex) => (
//                 <div key={row.id}
//                   onClick={() => SelectRow(row.original)}
//                   className="rounded-2xl overflow-hidden shadow-lg transition-colors duration-200"
//                   style={{
//                     backgroundColor: '#FFFFFF',
//                     border: highlightId === row.original.id ? '2px solid #F97316' : '1px solid #E5E7EB',
//                     boxShadow: highlightId === row.original.id
//                       ? '0 12px 28px rgba(249,115,22,0.2)'
//                       : '0 4px 12px rgba(0,0,0,0.06)'
//                   }}>
//                   <div className="px-3 py-2 flex items-center justify-between"
//                     style={{ background: '#bce1ff' }}>
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
//                         style={{ accentColor: '#FFFFFF' }}
//                       />
//                     )}
//                   </div>
//                   <div className="p-4 space-y-2.5">
//                     {row.getVisibleCells().map((cell) => {
//                       if (cell.column.id === 'select') return null
//                       return (
//                         <div key={cell.id} className="flex flex-col space-y-1.5 pb-2.5 last:pb-0"
//                           style={{ borderBottom: '1px solid #E5E7EB' }}>
//                           <div className="uppercase tracking-wider font-normal"
//                             style={{ color: '#6B7280', fontSize: 'clamp(6px, 0.6vw, 7px)' }}>
//                             {cell.column.columnDef.header}
//                           </div>
//                           <div className="font-normal break-words px-2 py-1 rounded-xl leading-relaxed min-h-[28px] flex items-center shadow-sm"
//                             style={{
//                               color: '#1F2937',
//                               background: 'linear-gradient(135deg, #FAFAFA, #F5F5F5)',
//                               fontSize: 'clamp(8px, 0.7vw, 10px)',
//                               border: '1px solid #E5E7EB'
//                             }}>
//                             {cell.column.id === 'completed' ? (
//                               cell.getValue() ? (
//                                 <div className="w-full px-2 py-2 rounded-md text-[11px] font-normal flex items-center gap-2 justify-center shadow-md"
//                                   style={{ backgroundColor: '#00bf63', color: '#FFFFFF' }}>Completed</div>
//                               ) : (
//                                 <div className="w-full px-2 py-2 rounded-md text-[11px] font-normal flex items-center gap-2 justify-center shadow-sm"
//                                   style={{ backgroundColor: '#eb3636', color: '#FFFFFF' }}>Pending</div>
//                               )
//                             ) : cell.column.id === 'paid' && cell.getValue() ? (
//                               <div className="w-full px-2 py-2 rounded-md text-[11px] font-semibold flex items-center gap-2 justify-center shadow-sm"
//                                 style={{
//                                   backgroundColor:
//                                     cell.getValue() === 'Paid'   ? '#ceb8ff' :
//                                     cell.getValue() === 'Unpaid' ? '#c387b4' : '#f9f9f9',
//                                   color: 'var(--chathams-blue)', border: '1px solid #cecece'
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
//                     style={{ background: 'linear-gradient(135deg, #6366F1, #A855F7)' }}>
//                     <svg className="w-12 h-12" style={{ color: '#FFFFFF' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
//                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
//                         d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
//                     </svg>
//                   </div>
//                   <p className="font-normal mb-2 text-center"
//                     style={{ color: '#1F2937', fontSize: 'clamp(9px, 0.8vw, 10px)' }}>
//                     {getTtl('No data available', ln)}
//                   </p>
//                   <p className="text-center" style={{ color: '#6B7280', fontSize: 'clamp(7px, 0.6vw, 9px)' }}>
//                     Try adjusting your filters or date range
//                   </p>
//                 </div>
//               )}
//             </div>
//           </div>

//           {/* ── PAGINATION FOOTER ── */}
//           <div className="flex-shrink-0"
//             style={{
//               borderTop: '2px solid #E5E7EB',
//               background: 'linear-gradient(90deg, rgba(255,255,255,0.95), rgba(250,250,250,0.98))'
//             }}>
//             <div className="px-4 py-3">
//               <div className="grid grid-cols-3 items-center">
//                 <div className="flex justify-start">
//                   <div className="whitespace-nowrap font-normal"
//                     style={{ color: '#6B7280', fontSize: 'clamp(7px, 0.6vw, 9px)' }}>
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
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable
} from "@tanstack/react-table"

import { useEffect, useLayoutEffect, useMemo, useState, useContext, useRef } from "react"

import { Paginator } from "../../../components/table/Paginator";
import RowsIndicator from "../../../components/table/RowsIndicator";

import { SettingsContext } from "../../../contexts/useSettingsContext";
import { usePathname } from "next/navigation";
import { getTtl } from "../../../utils/languages";

import FiltersIcon from '../../../components/table/filters/filters';
import ResetFilterTableIcon from '../../../components/table/filters/resetTabe';
import dateBetweenFilterFn from '../../../components/table/filters/date-between-filter';

const EMPTY_STATE_VIDEO_SRC = '/logo/no-data.mp4';

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
  const [quickSumEnabled, setQuickSumEnabled]   = useState(false)
  const [quickSumColumns, setQuickSumColumns]   = useState([])
  const [isEditMode, setIsEditMode]             = useState(false)
  const [rowSelection, setRowSelection]         = useState({})
  const [selectedRowId, setSelectedRowId]       = useState(null)
  const [currencyColCenter, setCurrencyColCenter] = useState(null) // px from left of table
  const [amountColCenter, setAmountColCenter]   = useState(null) // px from left of table
  const [isEmptyStateVideoError, setIsEmptyStateVideoError] = useState(false)

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
        <div className="flex items-center justify-start w-full h-full ml-2">
          <input
            type="checkbox"
            checked={table.getIsAllPageRowsSelected()}
            ref={el => { if (el) el.indeterminate = table.getIsSomePageRowsSelected() }}
            onChange={table.getToggleAllPageRowsSelectedHandler()}
            className="w-4 h-4 cursor-pointer rounded"
            style={{ accentColor: '#BCE1FE' }}
          />
        </div>
      ),
      cell: ({ row }) => (
        <div className="flex items-center w-full h-full">
          <input
            type="checkbox"
            checked={row.getIsSelected()}
            disabled={!row.getCanSelect()}
            onChange={row.getToggleSelectedHandler()}
            className="w-4 h-4 cursor-pointer rounded"
            style={{ accentColor: '#BCE1FE' }}
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
    state: { globalFilter, columnVisibility, pagination, columnFilters, rowSelection },
    onRowSelectionChange: setRowSelection,
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setColumnVisibility,
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

  const renderEmptyStateMedia = () => {
    if (!isEmptyStateVideoError) {
      return (
        <video
          className="w-24 h-24 mb-5 rounded-2xl object-cover"
          autoPlay
          loop
          muted
          playsInline
          onError={() => setIsEmptyStateVideoError(true)}
        >
          <source src={EMPTY_STATE_VIDEO_SRC} type="video/mp4" />
        </video>
      );
    }

    return <div className="w-24 h-24 mb-5" />;
  }

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
        <span style={{
          position: 'absolute',
          left: '14px',
          top: '50%',
          transform: 'translateY(-50%)',
          fontSize: '12px',
          fontWeight: '600',
          color: 'var(--chathams-blue)',
          whiteSpace: 'nowrap',
        }}>
          {label}
        </span>

        {/* Amount — centred exactly over the Amount column */}
        {amountColCenter !== null && (
          <span style={{
            position: 'absolute',
            left: `${amountColCenter}px`,
            top: '50%',
            transform: 'translate(-50%, -50%)',
            fontSize: '12px',
            fontWeight: '700',
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
        /* ── Column header cells ── */
        .custom-table th {
          border: 1px solid #d7d7d7;
          text-align: center;
          font-size: 12px !important;
          font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial;
          padding: 10px 8px !important;
          vertical-align: middle;
          white-space: nowrap;
          font-weight: 700;
        }

        /* ── Data cells ── */
        .custom-table td {
          border: 1px solid #d7d7d7;
          text-align: center;
          font-size: 10px !important;
          font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial;
          padding: 8px 6px !important;
          vertical-align: middle;
          height: 40px;
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
          background-color: #dbeeff;
          color: var(--chathams-blue);
        }

        /* Paid/Unpaid never wraps */
        .custom-table th:last-child {
          min-width: 100px;
        }

        .pagination-center { display:flex; justify-content:center; align-items:center; gap:10px; }
        .page-btn   { padding:6px 12px; border-radius:8px; font-weight:500; }
        .page-active { background-color:var(--chathams-blue); color:white; }
        .page-normal { color:var(--chathams-blue); }
      `}</style>

      <div className="custom-table">
        <div className="flex flex-col">

          {/* ── TOOLBAR ── */}
          <div className="flex-shrink-0"
            style={{
              borderBottom: '2px solid #E5E7EB',
              background: 'linear-gradient(90deg,rgba(255,255,255,0.95),rgba(250,250,250,0.98))'
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
          <div className="hidden md:block">
            <div
              ref={tableWrapRef}
              className="overflow-auto dashboard-scroll"
              style={{
                maxHeight: dynamicMaxHeight,
                borderLeft: '8px solid var(--chathams-blue)',
                borderRadius: '20px',
                border: '1px solid #d7d7d7',
                position: 'relative',
              }}
            >
              <table
                className="w-full"
                style={{ tableLayout: 'auto', borderCollapse: 'collapse' }}
              >
                <thead>
                  {/* Summary green — Total $ */}
                  <tr className="summary-bar-row">
                    <td
                      colSpan={totalCols}
                      style={{
                        backgroundColor: '#b7d1b5',
                        border: 'none',
                        padding: 0,
                        height: '36px',
                        position: 'relative',
                        overflow: 'visible',
                      }}
                    >
                      <span style={{
                        position: 'absolute', left: '14px', top: '50%',
                        transform: 'translateY(-50%)',
                        fontSize: '12px', fontWeight: '600', color: 'var(--chathams-blue)', whiteSpace: 'nowrap',
                      }}>
                        Total $:
                      </span>
                      {currencyColCenter !== null && (
                        <span style={{
                          position: 'absolute',
                          left: `${currencyColCenter}px`,
                          top: '50%',
                          transform: 'translate(-50%, -50%)',
                          fontSize: '12px', fontWeight: '600', color: 'var(--chathams-blue)', whiteSpace: 'nowrap',
                        }}>
                          USD
                        </span>
                      )}
                      {amountColCenter !== null && (
                        <span style={{
                          position: 'absolute',
                          left: `${amountColCenter}px`,
                          top: '50%',
                          transform: 'translate(-50%, -50%)',
                          fontSize: '12px', fontWeight: '700', color: 'var(--chathams-blue)', whiteSpace: 'nowrap',
                        }}>
                          {summaryUSD.amount}
                        </span>
                      )}
                    </td>
                  </tr>

                  {/* Summary blue — Total € */}
                  <tr className="summary-bar-row">
                    <td
                      colSpan={totalCols}
                      style={{
                        backgroundColor: '#8db6d8',
                        border: 'none',
                        padding: 0,
                        height: '36px',
                        position: 'relative',
                        overflow: 'visible',
                      }}
                    >
                      <span style={{
                        position: 'absolute', left: '14px', top: '50%',
                        transform: 'translateY(-50%)',
                        fontSize: '12px', fontWeight: '600', color: 'var(--chathams-blue)', whiteSpace: 'nowrap',
                      }}>
                        Total €:
                      </span>
                      {currencyColCenter !== null && (
                        <span style={{
                          position: 'absolute',
                          left: `${currencyColCenter}px`,
                          top: '50%',
                          transform: 'translate(-50%, -50%)',
                          fontSize: '12px', fontWeight: '600', color: 'var(--chathams-blue)', whiteSpace: 'nowrap',
                        }}>
                          EUR
                        </span>
                      )}
                      {amountColCenter !== null && (
                        <span style={{
                          position: 'absolute',
                          left: `${amountColCenter}px`,
                          top: '50%',
                          transform: 'translate(-50%, -50%)',
                          fontSize: '12px', fontWeight: '700', color: 'var(--chathams-blue)', whiteSpace: 'nowrap',
                        }}>
                          {summaryEUR.amount}
                        </span>
                      )}
                    </td>
                  </tr>

                  {/* ── Column headers — ref here for measurement ── */}
                  {table.getHeaderGroups().map(hdGroup => (
                    <tr key={hdGroup.id} ref={theadRowRef}>
                      {hdGroup.headers.map(header => (
                        <th
                          key={header.id}
                          className="header-blue"
                          style={{
                            minWidth:
                              header.column.id === 'paid'   ? '110px' :
                              header.column.id === 'select' ? '50px'  : '80px',
                          }}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>

                <tbody>
                  {table.getRowModel().rows.map((row) => (
                    <tr
                      key={row.id}
                      onClick={() => setSelectedRowId(row.id)}
                      onDoubleClick={() => SelectRow(row.original)}
                      tabIndex={0}
                      className={`cursor-pointer transition-colors${selectedRowId === row.id ? ' selected-row' : ' hover:bg-[#dbeeff]'}`}
                    >
                      {row.getVisibleCells().map((cell) => {
                        const value       = cell.getValue()
                        const options = cell.column.columnDef?.meta?.options || []
                        const resolvedLabel = options.find((opt) => String(opt.value) === String(value))?.label ?? value
                        const normalizedValue = String(resolvedLabel ?? '').trim().toLowerCase()
                        const isPaidValue = normalizedValue === 'paid'
                        const isUnpaidValue = normalizedValue === 'unpaid'
                        const isUSDValue = ['us', 'usd', '$'].includes(normalizedValue)
                        const isEURValue = ['eu', 'eur', '€'].includes(normalizedValue)
                        const isCompleted = cell.column.id === 'completed'
                        const isStatus    = cell.column.id === 'status' && value
                        const isPaid      = cell.column.id === 'paid'
                        const isCurrency  = cell.column.id === 'cur'
                        const hasValue    = value !== null && value !== undefined && value !== ''

                        return (
                          <td key={cell.id} className="px-2 py-2 text-center">
                            {isCompleted ? (
                              <div className="flex justify-center">
                                <div className="px-3 py-1.5 rounded-xl text-[11px] font-normal"
                                  style={{
                                    backgroundColor: value ? '#dcfce7' : '#fee2e2',
                                    color: value ? '#16a34a' : '#dc2626',
                                    border: `1px solid ${value ? '#bbf7d0' : '#fecaca'}`
                                  }}>
                                  {value ? 'Completed' : 'Incompleted'}
                                </div>
                              </div>
                            ) : isStatus ? (
                              <div className="flex justify-center">
                                <div className="px-3 py-1.5 rounded-xl text-[11px] font-normal"
                                  style={{
                                    backgroundColor: value === 'Completed' ? '#dcfce7' : '#fee2e2',
                                    color: value === 'Completed' ? '#16a34a' : '#dc2626',
                                    border: '1px solid #cecece'
                                  }}>
                                  {value}
                                </div>
                              </div>
                            ) : isPaid && hasValue ? (
                              <div className="flex justify-center">
                                <div className="px-3 py-1.5 rounded-xl text-[11px] font-normal min-w-[70px] text-center"
                                  style={{
                                    backgroundColor:
                                      isUnpaidValue ? '#fce7f3' :
                                      isPaidValue ? '#ede9fe' : '#f9f9f9',
                                    color: isPaidValue ? '#7c3aed' : isUnpaidValue ? '#be185d' : '#1F2937',
                                    border: '1px solid #cecece',
                                    fontWeight: isPaidValue || isUnpaidValue ? '600' : '400'
                                  }}>
                                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                </div>
                              </div>
                            ) : isCurrency && hasValue ? (
                              <div className="flex justify-center">
                                <div className="px-3 py-1.5 rounded-xl text-[11px] font-normal min-w-[62px] text-center"
                                  style={{
                                    backgroundColor:
                                      isUSDValue ? '#b6dfb7' :
                                      isEURValue ? '#bce1fe' : '#e5e7eb',
                                    color: 'var(--chathams-blue)',
                                    border: '1px solid #cecece',
                                    fontWeight: 600,
                                  }}>
                                  {isUSDValue ? '$' :
                                   isEURValue ? '€' :
                                   flexRender(cell.column.columnDef.cell, cell.getContext())}
                                </div>
                              </div>
                            ) : (
                              <div className="flex justify-center">
                                {hasValue ? (
                                  <div className="px-3 py-1.5 rounded-xl text-[11px] font-normal min-w-[70px] text-center transition-all duration-200 ease-in-out"
                                    style={{
                                      backgroundColor: '#f9f9f9',
                                      border: '1px solid #cecece',
                                      ...(isEditMode && { boxShadow: 'inset 0 0 0 1px #d1d1d1' })
                                    }}>
                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                  </div>
                                ) : (
                                  <div className="text-[11px] text-[#6B7280]">
                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                  </div>
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
                        <div className="flex flex-col items-center justify-center">
                          {renderEmptyStateMedia()}
                          <p className="font-normal mb-2"
                            style={{ color: '#1F2937', fontSize: 'clamp(12px,1.0vw,14px)' }}>
                            {getTtl('No data available', ln)}
                          </p>
                          <p style={{ color: '#6B7280', fontSize: 'clamp(10px,0.9vw,12px)' }}>
                            Try adjusting your filters or date range
                          </p>
                        </div>
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
                style={{ backgroundColor: '#b7d1b5' }}>
                <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--chathams-blue)' }}>Total $:</span>
                <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--chathams-blue)' }}>USD</span>
                <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--chathams-blue)' }}>{summaryUSD.amount}</span>
              </div>
              <div className="flex items-center justify-between px-4 py-2"
                style={{ backgroundColor: '#8db6d8' }}>
                <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--chathams-blue)' }}>Total €:</span>
                <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--chathams-blue)' }}>EUR</span>
                <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--chathams-blue)' }}>{summaryEUR.amount}</span>
              </div>
            </div>

            <div className="overflow-y-auto dashboard-scroll px-2 py-2 space-y-2"
              style={{ maxHeight: dynamicMaxHeight }}>
              {table.getRowModel().rows.map((row, rowIndex) => (
                <div key={row.id}
                  onClick={() => SelectRow(row.original)}
                  className="rounded-2xl overflow-hidden shadow-lg transition-colors duration-200"
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: highlightId === row.original.id ? '2px solid #F97316' : '1px solid #E5E7EB',
                    boxShadow: highlightId === row.original.id
                      ? '0 12px 28px rgba(249,115,22,0.2)'
                      : '0 4px 12px rgba(0,0,0,0.06)'
                  }}>
                  <div className="px-3 py-2 flex items-center justify-between"
                    style={{ background: '#bce1ff' }}>
                    <span className="font-normal" style={{ fontSize: 'clamp(9px,0.8vw,10px)' }}>
                      {getTtl('Row', ln)} {rowIndex + 1}
                    </span>
                    {quickSumEnabled && (
                      <input type="checkbox"
                        checked={row.getIsSelected()}
                        disabled={!row.getCanSelect()}
                        onChange={row.getToggleSelectedHandler()}
                        onClick={(e) => e.stopPropagation()}
                        className="w-4 h-4 cursor-pointer rounded"
                        style={{ accentColor: '#FFFFFF' }}
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
                          style={{ borderBottom: '1px solid #E5E7EB' }}>
                          <div className="uppercase tracking-wider font-normal"
                            style={{ color: '#6B7280', fontSize: 'clamp(6px,0.6vw,7px)' }}>
                            {cell.column.columnDef.header}
                          </div>
                          <div className="font-normal break-words px-2 py-1 rounded-xl leading-relaxed min-h-[28px] flex items-center shadow-sm"
                            style={{
                              color: '#1F2937',
                              background: 'linear-gradient(135deg,#FAFAFA,#F5F5F5)',
                              fontSize: 'clamp(8px,0.7vw,10px)',
                              border: '1px solid #E5E7EB'
                            }}>
                            {cell.column.id === 'completed' ? (
                              cell.getValue() ? (
                                <div className="w-full px-2 py-2 rounded-md text-[11px] font-normal flex items-center gap-2 justify-center shadow-md"
                                  style={{ backgroundColor: '#dcfce7', color: '#16a34a' }}>Completed</div>
                              ) : (
                                <div className="w-full px-2 py-2 rounded-md text-[11px] font-normal flex items-center gap-2 justify-center shadow-sm"
                                  style={{ backgroundColor: '#fee2e2', color: '#dc2626' }}>Pending</div>
                              )
                            ) : cell.column.id === 'paid' && cell.getValue() ? (
                              <div className="w-full px-2 py-2 rounded-md text-[11px] font-semibold flex items-center gap-2 justify-center shadow-sm"
                                style={{
                                  backgroundColor:
                                    isUnpaidValue ? '#fce7f3' :
                                    isPaidValue ? '#ede9fe' : '#f9f9f9',
                                  color: isPaidValue ? '#7c3aed' : isUnpaidValue ? '#be185d' : 'var(--chathams-blue)',
                                  border: '1px solid #cecece'
                                }}>
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                              </div>
                            ) : cell.column.id === 'cur' && cell.getValue() ? (
                              <div className="w-full px-2 py-2 rounded-md text-[11px] font-semibold flex items-center gap-2 justify-center shadow-sm"
                                style={{
                                  backgroundColor:
                                    isUSDValue ? '#b6dfb7' :
                                    isEURValue ? '#bce1fe' : '#e5e7eb',
                                  color: 'var(--chathams-blue)',
                                  border: '1px solid #cecece'
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
                  {renderEmptyStateMedia()}
                  <p className="font-normal mb-2 text-center"
                    style={{ color: '#1F2937', fontSize: 'clamp(9px,0.8vw,10px)' }}>
                    {getTtl('No data available', ln)}
                  </p>
                  <p className="text-center" style={{ color: '#6B7280', fontSize: 'clamp(7px,0.6vw,9px)' }}>
                    Try adjusting your filters or date range
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ── PAGINATION FOOTER ── */}
          <div className="flex-shrink-0"
            style={{
              borderTop: '2px solid #E5E7EB',
              background: 'linear-gradient(90deg,rgba(255,255,255,0.95),rgba(250,250,250,0.98))'
            }}>
            <div className="px-4 py-3">
              <div className="grid grid-cols-3 items-center">
                <div className="flex justify-start">
                  <div className="whitespace-nowrap font-normal"
                    style={{ color: '#6B7280', fontSize: 'clamp(7px,0.6vw,9px)' }}>
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