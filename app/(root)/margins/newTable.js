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

// Percentage-based widths so table fills available space responsively
const COLUMN_CONFIGS = {
    'drag-handle': { pct: '3%',  align: 'center' },
    'date':        { pct: '5%',  align: 'center' },
    'purchase':    { pct: '6%',  align: 'right'  },
    'description': { pct: '16%', align: 'left'   },
    'supplier':    { pct: '12%', align: 'left'   },
    'client':      { pct: '10%', align: 'left'   },
    'margin':      { pct: '8%',  align: 'right'  },
    'totalMargin': { pct: '9%',  align: 'right'  },
    'shipped':     { pct: '5%',  align: 'right'  },
    'openShip':    { pct: '7%',  align: 'right'  },
    'remaining':   { pct: '8%',  align: 'right'  },
    'gis':         { pct: '4%',  align: 'center' },
    'del':         { pct: '3%',  align: 'center' },
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

  const style = isDragging ? {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: 0.8,
    zIndex: 1,
    position: "relative",
  } : {};

  const inputs = ["purchase", "description", "margin", "shipped"];
  const currs = ["margin", "totalMargin", "remaining"];

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      className="hover:bg-gray-50/50"
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
              padding: "3px 1px",
              verticalAlign: "middle",
              width: columnConfig.pct || 'auto',
              overflow: cell.column.id === "date" ? "visible" : "hidden",
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
              cell.column.id === "margin" && row.original.gis ? (
                <Tltip
                  direction="top"
                  tltpText={
                    (cName === "ims" ? "IMS: " : "GIS: ") +
                    addComma(cell.getValue() / 2)
                  }
                >
                  <div className="flex items-center w-full">
                    <Input
                      props={cell}
                      handleChange={handleChange}
                      month={month}
                      name={cell.column.id}
                      styles="text-center"
                      addCur={currs.includes(cell.column.id)}
                    />
                  </div>
                </Tltip>
              ) : (
                <div className="flex items-center w-full">
                  <Input
                    props={cell}
                    handleChange={handleChange}
                    month={month}
                    name={cell.column.id}
                    styles="text-center"
                    addCur={currs.includes(cell.column.id)}
                  />
                </div>
              )
            ) : cell.column.id === "supplier" ||
              cell.column.id === "client" ? (
              <div className="w-full">
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
            ) : cell.column.id === "del" ? (
              <div className="flex items-center justify-center">
                <button
                  className="p-0 bg-transparent border-0 outline-none text-[var(--endeavour)] hover:text-red-500 transition-colors"
                  onClick={(e) => deleteRow(e, cell.row.index, month)}
                >
                  <MdDeleteOutline className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <NumericFormat
                value={cell.getValue()}
                displayType="input"
                readOnly
                thousandSeparator
                allowNegative
                prefix={currs.includes(cell.column.id) ? "$" : ""}
                decimalScale={currs.includes(cell.column.id) ? 2 : 3}
                fixedDecimalScale
                className="w-full bg-transparent border-none outline-none px-1 text-[var(--port-gore)] text-center text-[0.68rem] xl:text-[0.72rem] 2xl:text-[0.75rem] 3xl:text-[0.8125rem]"
                style={{ fontFamily: "var(--font-poppins), 'Poppins', sans-serif" }}
              />
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
                size: 30,
            },
            { 
                accessorKey: 'date', 
                header: 'Date',
            },
            {
                accessorKey: 'purchase',
                header: 'Qty (MT)',
                cell: (props) => <p>{props.getValue()}</p>,
            },
            {
                accessorKey: 'description',
                header: 'Description',
            },
            {
                accessorKey: 'supplier',
                header: 'Supplier',
            },
            {
                accessorKey: 'client',
                header: 'Client',
            },
            {
                accessorKey: 'margin',
                header: 'Margin',
            },
            {
                accessorKey: 'totalMargin',
                header: 'Total Margin',
            },
            {
                accessorKey: 'shipped',
                header: 'Shipped',
            },
            {
                accessorKey: 'openShip',
                header: 'Open Ship',
            },
            {
                accessorKey: 'remaining',
                header: 'Remaining',
            },
            {
                accessorKey: 'gis',
                header: cName === 'ims' ? 'GIS' : 'IMS',
            },
            {
                accessorKey: 'del',
                header: '',
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
                <div className="rounded-lg border border-[var(--selago)] overflow-x-auto relative shadow-sm">
                    {/* Desktop Table - Compact Heights */}
                    <div className="hidden sm:block w-full min-w-[900px]">
                        <Table className="w-full" style={{ borderSpacing: '0 1px', tableLayout: 'fixed' }}>
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
    width: (COLUMN_CONFIGS[header.column.id] || {}).pct || 'auto',
  }}
  className={cn(
    'bg-[#dbeeff] text-[var(--chathams-blue)] border-b border-[var(--chathams-blue)]',
    idx === 0 ? 'rounded-tl-lg' : '',
    idx === arr.length - 1 ? 'rounded-tr-lg' : ''
  )}
>
  <div className="w-full flex items-center justify-center responsiveTextTable font-medium font-poppins">
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
                                                    className="responsiveText text-center text-[var(--regent-gray)]"
                                                    style={{
                                                        height: '60px',
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
                                                            ''
                                                        )}
                                                    >
                                                        {["totalMargin", "remaining", "purchase", "openShip"].includes(accessorKey) && (
                                                            <div className="flex items-center justify-center px-2 h-full">
                                                                <NumericFormat
                                                                    value={total}
                                                                    displayType="text"
                                                                    thousandSeparator
                                                                    allowNegative={true}
                                                                    prefix={currs.includes(accessorKey) ? '$' : ''}
                                                                    decimalScale={currs.includes(accessorKey) ? 2 : 3}
                                                                    fixedDecimalScale
                                                                    style={{
                                                                        fontSize: 'inherit',
                                                                        color: 'var(--chathams-blue)',
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
                                            className="font-bold text-[var(--chathams-blue)]"
                                            style={{ fontSize: '0.65rem', lineHeight: '1.2' }}
                                        >
                                            Entry #{rowIdx + 1}
                                        </span>
                                        <button 
                                            className="text-[var(--endeavour)] hover:text-red-600 transition-colors flex items-center justify-center" 
                                            onClick={e => props.deleteRow(e, rowIdx, row.month)}
                                            style={{ width: '20px', height: '20px' }}
                                        >
                                            <MdDeleteOutline className="w-4 h-4" />
                                        </button>
                                    </div>
                                    
                                    {/* Compact Card Body */}
                                    <div className="p-2 flex flex-col gap-1">
                                        {columns
                                            .filter(col => col.accessorKey && col.accessorKey !== 'del')
                                            .map((col, colIdx) => (
                                                <div
                                                    key={col.accessorKey || colIdx}
                                                    className="flex justify-between items-center gap-2 py-1.5 border-b border-gray-100 last:border-b-0 min-h-[28px]"
                                                >
                                                    <span
                                                        className="font-bold text-[var(--chathams-blue)] min-w-[80px] flex-shrink-0"
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
                                                                            color: 'var(--chathams-blue)',
                                                                            fontWeight: '700',
                                                                            lineHeight: '1.2'
                                                                        }}
                                                                    />
                                                                );
                                                            }
                                                            return (
                                                                <span
                                                                    className='text-[var(--port-gore)]'
                                                                    style={{
                                                                        fontSize: '0.68rem',
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
                            <div className="responsiveText text-center py-6 text-[var(--regent-gray)]">
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