import Header from "../../../components/table/header";
import { flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable } from "@tanstack/react-table"
import { useMemo, useState } from "react"
import '../contracts/style.css';
import { useContext } from 'react';
import { SettingsContext } from "../../../contexts/useSettingsContext";
import { usePathname } from "next/navigation";

import { NumericFormat } from "react-number-format";

import DatePicker from "./components/dtpicker";
import Input from "./components/input";
import { MdDeleteOutline } from "react-icons/md";
import SelectEnt from "./components/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
    TableFooter
} from "../../..//components/ui/table"
import { addComma } from '../../../app/(root)/cashflow/funcs';

// needed for table body level scope DnD setup
import {
    DndContext,
    closestCenter,
} from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import {
    SortableContext,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';

// needed for row & cell level scope DnD setup
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { cn } from "@lib/utils";
import { dataIds } from "./funcs";
import CheckBox from "../../../components/checkbox";
import Tltip from "../../../components/tlTip";

// COMPACT: Keep current column widths but focus on height reduction
const COLUMN_CONFIGS = {
    'drag-handle': { width: 50, align: 'center', minWidth: 40 },
    'date': { width: 120, align: 'center', minWidth: 100 },
    'purchase': { width: 110, align: 'right', minWidth: 80 },
    'description': { width: 200, align: 'left', minWidth: 150 },
    'supplier': { width: 150, align: 'left', minWidth: 150 },
    'client': { width: 150, align: 'left', minWidth: 150 },
    'margin': { width: 110, align: 'right', minWidth: 90 },
    'totalMargin': { width: 130, align: 'right', minWidth: 110 },
    'shipped': { width: 100, align: 'right', minWidth: 80 },
    'openShip': { width: 110, align: 'right', minWidth: 90 },
    'remaining': { width: 120, align: 'right', minWidth: 100 },
    'gis': { width: 70, align: 'center', minWidth: 60 },
    'del': { width: 50, align: 'center', minWidth: 40 },
};


const DraggableRow = ({ row, props, cName }) => {
  let {
    handleChangeDate,
    handleCancelDate,
    month,
    handleChange,
    deleteRow,
    handleChangeSelect,
    settings,
    handleCheckBox
  } = props;

  const { transform, transition, setNodeRef, isDragging } = useSortable({
    id: row.original.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.8 : 1,
    zIndex: isDragging ? 1 : 0,
    position: "relative",
  };

  const inputs = ["purchase", "description", "margin", "shipped"];
  const currs = ["margin", "totalMargin", "remaining"];

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      className="hover:bg-gray-50/50 transition-colors"
    >
      {row.getVisibleCells().map((cell) => {
        const columnConfig = COLUMN_CONFIGS[cell.column.id] || {};
        const cellWidth = columnConfig.width || "auto";
        const cellAlign = columnConfig.align || "left";

        return (
          <TableCell
            key={cell.id}
            style={{
              height: "32px",
              padding: "4px 6px",
              verticalAlign: "middle",
            }}
            className={cn(
              cellAlign === "right" && "text-center",
              cellAlign === "center" && "text-center",
              "border-r border-r-[#e8f0f8] last:border-r-0"
            )}
          >
            {cell.column.id === "drag-handle" ? (
              <div className="flex items-center justify-center">
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </div>
            ) : cell.column.id === "date" ? (
              <div className="flex items-center justify-center">
                <DatePicker
                  props={cell}
                  handleChangeDate={handleChangeDate}
                  month={month}
                  handleCancelDate={handleCancelDate}
                />
              </div>
            ) : inputs.includes(cell.column.id) ? (
              <Tltip
                direction="top"
                tltpText={
                  (cName === "ims" ? "IMS: " : "GIS: ") +
                  addComma(cell.getValue() / 2)
                }
                show={
                  cell.column.id === "margin" && row.original.gis
                }
              >
                <div className="flex items-center justify-end w-full">
                  <Input
                    props={cell}
                    handleChange={handleChange}
                    month={month}
                    name={cell.column.id}
                    styles={
                      cell.column.id === "description"
                        ? "text-center"
                        : "text-center"
                    }
                    addCur={currs.includes(cell.column.id)}
                  />
                </div>
              </Tltip>
            ) : cell.column.id === "supplier" ||
              cell.column.id === "client" ? (
              <div className="flex items-center w-full">
                <SelectEnt
                  props={cell}
                  data={
                    cell.column.id === "supplier"
                      ? settings.Supplier.Supplier
                      : settings.Client.Client
                  }
                  handleChangeSelect={handleChangeSelect}
                  month={month}
                  name={
                    cell.column.id === "supplier"
                      ? "supplier"
                      : "client"
                  }
                  plHolder={
                    cell.column.id === "supplier"
                      ? "Select Supplier"
                      : "Select Client"
                  }
                />
              </div>
            ) : cell.column.id === "gis" ? (
              <div className="flex items-center justify-center">
                <CheckBox
                  size="size-4"
                  checked={cell.getValue() ?? false}
                  onChange={() =>
                    handleCheckBox(
                      !cell.getValue(),
                      cell.row.index,
                      month
                    )
                  }
                />
              </div>
            ) : (
              <div className="flex items-center justify-end">
                <NumericFormat
                  value={cell.getValue()}
                  displayType="text"
                  thousandSeparator
                  allowNegative
                  prefix={
                    currs.includes(cell.column.id) ? "$" : ""
                  }
                  decimalScale={
                    currs.includes(cell.column.id) ? 2 : 3
                  }
                  fixedDecimalScale
                  style={{
                    fontSize: "12px",
                    color: "var(--endeavour)",
                  }}
                />
              </div>
            )}
          </TableCell>
        );
      })}
    </TableRow>
  );
};


const Customtable = (props) => {

    let { items, handleDragEnd, sensors, RowDragHandleCell } = props
    let data = items;

    const [globalFilter, setGlobalFilter] = useState('')
    const [{ pageIndex, pageSize }, setPagination] = useState({ pageIndex: 0, pageSize: 100, })
    const pagination = useMemo(() => ({ pageIndex, pageSize, }), [pageIndex, pageSize])
    const pathName = usePathname()
    const { ln, compData } = useContext(SettingsContext);
    let cName = compData?.name.slice(0, 3).toLowerCase()

    const columns = useMemo(
        () => [
            {
                id: 'drag-handle',
                header: '',
                cell: ({ row }) => <RowDragHandleCell rowId={row.original.id} />,
                size: COLUMN_CONFIGS['drag-handle'].width,
            },
            { 
                accessorKey: 'date', 
                header: 'Date',
                size: COLUMN_CONFIGS['date'].width,
            },
            { 
                accessorKey: 'purchase', 
                header: 'Qty (MT)', 
                cell: (props) => <p>{props.getValue()}</p>,
                size: COLUMN_CONFIGS['purchase'].width,
            },
            { 
                accessorKey: 'description', 
                header: 'Description',
                size: COLUMN_CONFIGS['description'].width,
            },
            { 
                accessorKey: 'supplier', 
                header: 'Supplier',
                size: COLUMN_CONFIGS['supplier'].width,
            },
            { 
                accessorKey: 'client', 
                header: 'Client',
                size: COLUMN_CONFIGS['client'].width,
            },
            { 
                accessorKey: 'margin', 
                header: 'Margin',
                size: COLUMN_CONFIGS['margin'].width,
            },
            { 
                accessorKey: 'totalMargin', 
                header: 'Total Margin',
                size: COLUMN_CONFIGS['totalMargin'].width,
            },
            { 
                accessorKey: 'shipped', 
                header: 'Shipped',
                size: COLUMN_CONFIGS['shipped'].width,
            },
            { 
                accessorKey: 'openShip', 
                header: 'Open Ship',
                size: COLUMN_CONFIGS['openShip'].width,
            },
            { 
                accessorKey: 'remaining', 
                header: 'Remaining',
                size: COLUMN_CONFIGS['remaining'].width,
            },
            { 
                accessorKey: 'gis', 
                header: cName === 'ims' ? 'GIS' : 'IMS',
                size: COLUMN_CONFIGS['gis'].width,
            },
            { 
                accessorKey: 'del', 
                header: '',
                size: COLUMN_CONFIGS['del'].width,
            },
        ],
        [cName]
    );

    const table = useReactTable({
        columns,
        data,
        getCoreRowModel: getCoreRowModel(),
        state: { globalFilter, pagination },
        getFilteredRowModel: getFilteredRowModel(),
        onGlobalFilterChange: setGlobalFilter,
        getSortedRowModel: getSortedRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        onPaginationChange: setPagination,
        manualPagination: true,
        getRowId: (row) => row.id,
        debugTable: true,
        debugHeaders: true,
        debugColumns: true,
    });

    const currs = ['margin', 'totalMargin', 'remaining'];

    return (
        <DndContext
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis]}
            onDragEnd={handleDragEnd}
            sensors={sensors}
        >
            <div className="flex flex-col relative w-full">
                <div className="rounded-lg border border-[var(--selago)] overflow-visible relative shadow-sm">
                    {/* Desktop Table - Compact Heights */}
                    <div className="hidden sm:block">
                        <Table className="relative w-full" style={{ borderSpacing: '0 1px', tableLayout: 'auto' }}>
                            <TableHeader>
                                <TableRow>
                                    {table.getHeaderGroups().map((headerGroup) =>
                                        headerGroup.headers.map((header, idx, arr) => {
                                            const columnConfig = COLUMN_CONFIGS[header.column.id] || {};
                                            return (
                                              <TableHead
  key={header.id}
  style={{
    height: '36px',
    padding: '4px 6px',
  }}
  className={cn(
    'bg-[#dbeeff] text-[var(--endeavour)] border-b border-[var(--endeavour)]',
    idx === 0 ? 'rounded-tl-lg' : '',
    idx === arr.length - 1 ? 'rounded-tr-lg' : 'border-r border-r-[#b8ddf8]'
  )}
>
  <div className="w-full flex items-center justify-center text-[0.75rem] font-medium">
    {header.isPlaceholder
      ? null
      : flexRender(header.column.columnDef.header, header.getContext())}
  </div>
</TableHead>
                                            );
                                        })
                                    )}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                <SortableContext
                                    items={dataIds(data)}
                                    strategy={verticalListSortingStrategy}
                                >
                                    {table.getRowModel().rows.length > 0 ? (
                                        table.getRowModel().rows.map((row) => (
                                            <DraggableRow key={row.id} row={row} props={props} cName={cName} />
                                        ))) :
                                        (
                                            <TableRow>
                                                <TableCell 
                                                    colSpan={columns.length} 
                                                    className="text-center text-gray-500"
                                                    style={{ 
                                                        height: '60px',
                                                        fontSize: '0.875rem',
                                                        padding: '16px'
                                                    }}
                                                >
                                                    No results found.
                                                </TableCell>
                                            </TableRow>
                                        )
                                    }
                                </SortableContext>
                            </TableBody>
                            {data.length > 0 && (
                                <TableFooter>
                                    {table.getFooterGroups().map((footerGroup) => (
                                        <TableRow key={footerGroup.id} className='bg-[var(--selago)]/50'>
                                            {footerGroup.headers.map((footer) => {
                                                const accessorKey = footer.column.columnDef.accessorKey;
                                                const columnConfig = COLUMN_CONFIGS[accessorKey] || {};
                                                
                                                // Calculate the total only for numeric columns
                                                const total = data.reduce((sum, row) => {
                                                    const value = (accessorKey === 'totalMargin' || accessorKey === 'remaining') && row?.gis ?
                                                        row[accessorKey] / 2 : row[accessorKey];
                                                    return sum + (value * 1 || 0)
                                                }, 0);
                                                
                                                return (
                                                    <TableCell
                                                        key={`footer-${footer.id}`}
                                                        style={{
                                                            height: '36px',
                                                            padding: '4px 6px',
                                                            verticalAlign: 'middle'
                                                        }}
                                                        className={cn(
                                                            columnConfig.align === 'right' && 'text-right',
                                                            columnConfig.align === 'center' && 'text-center',
                                                            ["totalMargin", "remaining", "purchase", "openShip"].includes(accessorKey) ?
                                                                'border-t border-t-[var(--endeavour)]' : '',
                                                            'border-r border-r-[#e8f0f8] last:border-r-0'
                                                        )}
                                                    >
                                                        {["totalMargin", "remaining", "purchase", "openShip"].includes(accessorKey) && (
                                                            <div className="flex items-center justify-end px-2 h-full">
                                                                <NumericFormat
                                                                    value={total}
                                                                    displayType="text"
                                                                    thousandSeparator
                                                                    allowNegative={true}
                                                                    prefix={currs.includes(accessorKey) ? '$' : ''}
                                                                    decimalScale={currs.includes(accessorKey) ? 2 : 3}
                                                                    fixedDecimalScale
                                                                    style={{ 
                                                                        fontSize: '11px',
                                                                        color: 'var(--endeavour)',
                                                                        fontWeight: '600',
                                                                        lineHeight: '1.2'
                                                                    }}
                                                                />
                                                            </div>
                                                        )}
                                                    </TableCell>
                                                );
                                            })}
                                        </TableRow>
                                    ))}
                                </TableFooter>
                            )}
                        </Table>
                    </div>
                    
                    {/* Mobile stacked card layout - Compact Heights */}
                    <div className="sm:hidden flex flex-col gap-2 p-2">
                        {data.length > 0 ? (
                            data.map((row, rowIdx) => (
                                <div 
                                    key={row.id || rowIdx} 
                                    className="rounded-lg border border-[var(--selago)] bg-white shadow-sm overflow-hidden"
                                >
                                    {/* Compact Card Header */}
                                    <div className="bg-[#dbeeff] px-3 py-2 border-b border-[#dbeeff] flex justify-between items-center min-h-[32px]">
                                        <span 
                                            className="font-medium text-[var(--chathams-blue)]"
                                            style={{ fontSize: '0.75rem', lineHeight: '1.2' }}
                                        >
                                            Entry #{rowIdx + 1}
                                        </span>
                                        <button 
                                            className="text-[var(--endeavour)] hover:text-red-600 transition-colors flex items-center justify-center" 
                                            onClick={e => props.deleteRow(e, rowIdx, row.month)}
                                            style={{ width: '20px', height: '20px' }}
                                        >
                                            <MdDeleteOutline style={{ fontSize: '16px' }} />
                                        </button>
                                    </div>
                                    
                                    {/* Compact Card Body */}
                                    <div className="p-2 flex flex-col gap-1">
                                        {columns
                                            .filter(col => col.accessorKey && col.accessorKey !== 'del')
                                            .map((col, colIdx) => (
                                                <div 
                                                    key={col.accessorKey || colIdx} 
                                                    className="flex justify-between items-center gap-2 py-1 border-b border-gray-100 last:border-b-0 min-h-[24px]"
                                                >
                                                    <span 
                                                        className="font-medium text-[var(--port-gore)] min-w-[80px] flex-shrink-0"
                                                        style={{ fontSize: '0.65rem', lineHeight: '1.2' }}
                                                    >
                                                        {typeof col.header === 'string' ? col.header : ''}
                                                    </span>
                                                    
                                                    <div className="flex-1 flex justify-end items-center">
                                                        {(() => {
                                                            if (col.accessorKey === 'date') {
                                                                return (
                                                                    <DatePicker 
                                                                        props={{ row: { original: row } }} 
                                                                        handleChangeDate={props.handleChangeDate} 
                                                                        month={row.month} 
                                                                        handleCancelDate={props.handleCancelDate} 
                                                                    />
                                                                );
                                                            }
if (col.accessorKey === 'supplier' || col.accessorKey === 'client') {
  return (
    <div className="w-full flex justify-center items-center">
      <div className="w-full ">
        <SelectEnt
          props={{ row: { original: row } }}
          data={
            col.accessorKey === 'supplier'
              ? props.settings.Supplier.Supplier
              : props.settings.Client.Client
          }
          handleChangeSelect={props.handleChangeSelect}
          month={row.month}
          name={col.accessorKey}
          plHolder={
            col.accessorKey === 'supplier'
              ? 'Select Supplier'
              : 'Select Client'
          }
        />
      </div>
    </div>
  );
}
                                                           if (col.accessorKey === 'gis') {
  return (
    <div className="flex items-center justify-center h-5">
      <CheckBox
        size="size-3"
        checked={row.gis ?? false}
        onChange={() =>
          props.handleCheckBox(!row.gis, rowIdx, row.month)
        }
      />
    </div>
  );
}
                                                            if (['purchase', 'description', 'margin', 'shipped'].includes(col.accessorKey)) {
                                                                return (
                                                                    <div className="w-full max-w-[100px] bg-[#fafafa]">
                                                                        <Input 
                                                                            props={{ 
                                                                                row: { original: row }, 
                                                                                column: { id: col.accessorKey }, 
                                                                                getValue: () => row[col.accessorKey] 
                                                                            }} 
                                                                            handleChange={props.handleChange} 
                                                                            month={row.month} 
                                                                            name={col.accessorKey} 
                                                                            styles={cn(
                                                                                '',
                                                                                col.accessorKey === 'description' && 'text-left'
                                                                            )}
                                                                            addCur={currs.includes(col.accessorKey)} 
                                                                        />
                                                                    </div>
                                                                );
                                                            }
                                                            if (['totalMargin', 'remaining', 'openShip'].includes(col.accessorKey)) {
                                                                return (
                                                                    <NumericFormat 
                                                                        value={row[col.accessorKey]} 
                                                                        displayType="text" 
                                                                        thousandSeparator 
                                                                        allowNegative={true} 
                                                                        prefix={currs.includes(col.accessorKey) ? '$' : ''} 
                                                                        decimalScale={currs.includes(col.accessorKey) ? 2 : 3} 
                                                                        fixedDecimalScale 
                                                                        style={{ 
                                                                            fontSize: '0.65rem',
                                                                            color: 'var(--port-gore)',
                                                                            fontWeight: '500',
                                                                            lineHeight: '1.2'
                                                                        }}
                                                                    />
                                                                );
                                                            }
                                                            return (
                                                                <span 
                                                                    className='text-gray-600'
                                                                    style={{ 
                                                                        fontSize: '0.65rem',
                                                                        lineHeight: '1.2'
                                                                    }}
                                                                >
                                                                    {row[col.accessorKey]}
                                                                </span>
                                                            )
                                                        })()}
                                                    </div>
                                                </div>
                                            ))}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div 
                                className="text-center py-6 text-gray-500"
                                style={{ fontSize: '0.875rem' }}
                            >
                                No results found.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </DndContext>
    );
}

export default Customtable;