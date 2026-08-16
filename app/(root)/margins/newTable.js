import Header from "../../../components/table/header";
import { flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable } from "@tanstack/react-table"
import { useMemo, useState, memo } from "react"
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

// Percentage-based widths so table fills available space responsively.
// They sum to exactly 100, so under `tableLayout: fixed` each column gets the
// width written here — nothing left over for the browser to redistribute.
//
// The budget follows the widest string a column can hold — INCLUDING its header,
// which the first pass overlooked. Money columns run to 13 characters
// ("$1,931,250.00") and the width to hold them came out of Qty and Open Ship,
// which left neither able to fit its own label: "QTY (MT)" and "OPEN SHIP" broke
// across two lines while every other header sat on one, and Open Ship's figures
// lost their last digit ("20.000" read "20.00").
//
// The money columns were over-provisioned for it. At these widths each still
// clears its widest value with room to spare — Total Margin holds 13 characters
// in 11%, Margin 10 in 9% — so a point each from Supplier, Margin, Total Margin
// and Remaining buys Qty and Open Ship a point each and Description two.
const COLUMN_CONFIGS = {
    'drag-handle': { pct: '2%',  align: 'center' },
    // 9%, not 6%: at 6% the cell was ~75px, and once the cell padding and the
    // clear button's gutter came off it the date input had ~55px of content box
    // for a "DD.MM.YY" that measures ~58px on a wide viewport — so the year was
    // clipped. Wide enough that the date never meets the button, with margin for
    // the narrower table box a 14" laptop gives it.
    'date':        { pct: '9%',  align: 'center' },
    'purchase':    { pct: '7%',  align: 'right'  },
    // Free text, so it overflows at any width the table can afford and the input
    // scrolls — but it is the column users actually read, so it takes the points
    // nobody else needed rather than staying the tightest fit that works. It is
    // also the column those points come back OUT of, for the same reason: free
    // text that runs on still reads as text and scrolls in its input, whereas a
    // clipped entity name reads as the wrong entity and a clipped date loses its
    // year outright. One point to Client, one to Date.
    'description': { pct: '15%', align: 'left'   },
    'supplier':    { pct: '11%', align: 'left'   },
    // Now that neither entity column truncates, this has to hold its longest
    // name outright rather than the "SJM" / "Oryx" short ones — "Iberinox" was
    // rendering as "Iberi…" at 7%. The point comes from Description.
    'client':      { pct: '8%',  align: 'left'   },
    'margin':      { pct: '9%',  align: 'right'  },
    'totalMargin': { pct: '11%', align: 'right'  },
    'shipped':     { pct: '5%',  align: 'right'  },
    // 8%: a figure must never truncate. "190.000" is seven characters and was
    // losing its last one at 7% — and a cut number is worse than cut text,
    // because "190.00" is itself a valid reading and nothing signals the loss.
    'openShip':    { pct: '8%',  align: 'right'  },
    'remaining':   { pct: '8%',  align: 'right'  },
    'gis':         { pct: '4%',  align: 'center' },
    'del':         { pct: '3%',  align: 'center' },
};

// Cells whose content is a figure inside a full-width <input>. The input brings
// its own gutters, so the cell's 1px of side padding is width the number can't
// use — and an <input> clips its text to the content box instead of overflowing
// it, which turns "slightly too narrow" into a silently missing digit.
const FIGURE_COLUMNS = new Set([
    'date', 'purchase', 'margin', 'totalMargin', 'shipped', 'openShip', 'remaining',
]);


const DraggableRow = memo(function DraggableRow({ row, props, cName }) {
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
      className="hover:bg-[var(--bg-subtle)] border-b border-b-[var(--line)]"
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
              padding: FIGURE_COLUMNS.has(cell.column.id) ? "3px 0" : "3px 1px",
              verticalAlign: "middle",
              width: columnConfig.pct || 'auto',
              overflow: cell.column.id === "date" ? "visible" : "hidden",
            }}
            className={cn(
              cellAlign === "right" && "text-center",
              cellAlign === "center" && "text-center"
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
                      cell.row.original.id,
                      month
                    )
                  }
                />
              </div>
            ) : cell.column.id === "del" ? (
              <div className="flex items-center justify-center">
                <button
                  className="p-0 bg-transparent border-0 outline-none text-[var(--ink-muted)] hover:text-[var(--bad-text)] transition-colors"
                  onClick={(e) => deleteRow(e, cell.row.original.id, month)}
                >
                  <MdDeleteOutline className="w-4 h-4" />
                </button>
              </div>
            ) : (cell.column.id === "totalMargin" || cell.column.id === "remaining") && row.original.gis ? (
              <Tltip
                direction="top"
                tltpText={"Total: " + addComma(cell.getValue())}
              >
                <div className="flex items-center justify-center w-full">
                  <NumericFormat
                    value={cell.getValue() / 2}
                    displayType="input"
                    readOnly
                    thousandSeparator
                    allowNegative
                    prefix="$"
                    decimalScale={2}
                    fixedDecimalScale
                    className={cn(
                      // px-0: read-only, so there is no hover/focus box for the
                      // padding to clear, and the figure needs every pixel.
                      "w-full min-w-0 bg-transparent border-none outline-none px-0 text-center responsiveTextTableTitle ",
                      cell.column.id === "remaining" && Number(cell.getValue()) > 0
                        ? "text-[var(--bad-text)]"
                        : "text-[var(--ink)]"
                    )}
                    style={{ fontFamily: "var(--font-jakarta), 'Plus Jakarta Sans', sans-serif" }}
                  />
                </div>
              </Tltip>
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
                className={cn(
                  "w-full min-w-0 bg-transparent border-none outline-none px-0 text-center responsiveTextTableTitle ",
                  ["openShip", "remaining"].includes(cell.column.id) && Number(cell.getValue()) > 0
                    ? "text-[var(--bad-text)]"
                    : "text-[var(--ink)]"
                )}
                style={{ fontFamily: "var(--font-jakarta), 'Plus Jakarta Sans', sans-serif" }}
              />
            )}
          </TableCell>
        );
      })}
    </TableRow>
  );
}, (prev, next) =>
  prev.row.original === next.row.original &&
  prev.cName === next.cName &&
  prev.props.settings === next.props.settings
);


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
                {/* The one size that reaches cell content carrying no ladder class
                    of its own. It was a hardcoded 0.75rem, which pinned those cells
                    at 12px on every screen while everything around them ramped; it
                    reads the caption rung now so the whole body band agrees. */}
                <style jsx global>{`
                    .margins-data-table tbody td { font-size: var(--fs-caption); }
                `}</style>
                {/* margins-table-scroll: globals.css lifts this clip while a date
                    picker is open, so the calendar is not cut off at the bottom edge. */}
                <div className="margins-table-scroll rounded-lg border border-[var(--line)] overflow-x-auto relative shadow-card">
                    {/* Desktop Table - Compact Heights */}
                    <div className="hidden sm:block w-full min-w-[900px]">
                        <Table className="w-full margins-data-table" style={{ borderSpacing: '0 1px', tableLayout: 'fixed' }}>
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
    /* No side padding: under `tableLayout: fixed` a column gets exactly its
       percentage, so 6px a side was 12px the label could not use — enough to
       wrap "QTY (MT)" and "OPEN SHIP" onto a second line. The labels are
       centred, so they need no padding to sit off the column edge. */
    padding: '4px 0',
    width: (COLUMN_CONFIGS[header.column.id] || {}).pct || 'auto',
  }}
  className={cn(
    'bg-[var(--bg-subtle)] text-[var(--ink-muted)] border-b border-b-[var(--line)]',
    idx === 0 ? 'rounded-tl-lg' : '',
    idx === arr.length - 1 ? 'rounded-tr-lg' : ''
  )}
>
  <div className="w-full flex items-center justify-center whitespace-nowrap font-medium uppercase tracking-[0.04em] responsiveTextTable">
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
                                                    className="responsiveText text-center text-[var(--ink-muted)] py-10"
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
                                        <TableRow key={footerGroup.id} className='bg-[var(--bg-subtle)]'>
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
                                                            // Same deal as the body: a totals figure is the
                                                            // widest string in its column, so the figure
                                                            // columns keep their side padding at 0.
                                                            padding: FIGURE_COLUMNS.has(accessorKey) ? '4px 0' : '4px 6px',
                                                            verticalAlign: 'middle'
                                                        }}
                                                        className={cn(
                                                            columnConfig.align === 'right' && 'text-right',
                                                            columnConfig.align === 'center' && 'text-center',
                                                            'border-t border-t-[var(--line-strong)]',
                                                            'responsiveTextTable'
                                                        )}
                                                    >
                                                        {["totalMargin", "remaining", "purchase", "openShip"].includes(accessorKey) && (
                                                            <div className="flex items-center justify-center h-full">
                                                                <NumericFormat
                                                                    value={total}
                                                                    displayType="text"
                                                                    thousandSeparator
                                                                    allowNegative={true}
                                                                    prefix={currs.includes(accessorKey) ? '$' : ''}
                                                                    decimalScale={currs.includes(accessorKey) ? 2 : 3}
                                                                    fixedDecimalScale
                                                                    className="responsiveTextTable "
                                                                    style={{
                                                                        color: ['openShip', 'remaining'].includes(accessorKey) && total > 0 ? 'var(--bad-text)' : 'var(--ink)',
                                                                        fontWeight: '500',
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
                                    className="rounded-lg border border-[var(--line)] bg-[var(--bg-card)] shadow-card overflow-hidden"
                                >
                                    {/* Compact Card Header */}
                                    <div className="bg-[var(--bg-subtle)] px-3 py-2 border-b border-[var(--line)] flex justify-between items-center min-h-8">
                                        <span
                                            className="responsiveTextTable font-medium text-[var(--ink)]"
                                            style={{ lineHeight: '1.2' }}
                                        >
                                            Entry #{rowIdx + 1}
                                        </span>
                                        <button
                                            className="text-[var(--ink-muted)] hover:text-[var(--bad-text)] transition-colors flex items-center justify-center"
                                            onClick={e => props.deleteRow(e, row.id, row.month)}
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
                                                    className="flex justify-between items-center gap-2 py-1.5 border-b border-gray-100 last:border-b-0 min-h-7"
                                                >
                                                    <span
                                                        className="responsiveTextTable font-medium text-[var(--ink)] min-w-[80px] flex-shrink-0"
                                                        style={{ lineHeight: '1.2' }}
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
          props.handleCheckBox(!row.gis, row.id, row.month)
        }
      />
    </div>
  );
}
                                                            if (['purchase', 'description', 'margin', 'shipped'].includes(col.accessorKey)) {
                                                                // The 100px cap suits the numeric columns, but Description sits
                                                                // in a 16%-wide column and was squeezed into the same 100px,
                                                                // clipping anything longer than a short code.
                                                                return (
                                                                    <div className={cn('w-full', col.accessorKey !== 'description' && 'max-w-[100px]')}>
                                                                        <Input
                                                                            props={{
                                                                                row: { original: row },
                                                                                column: { id: col.accessorKey },
                                                                                getValue: () => row[col.accessorKey]
                                                                            }}
                                                                            handleChange={props.handleChange}
                                                                            month={row.month}
                                                                            name={col.accessorKey}
                                                                            placeholder={col.accessorKey === 'description' ? 'Description' : undefined}
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
                                                                const displayVal = (['totalMargin', 'remaining'].includes(col.accessorKey) && row.gis)
                                                                    ? row[col.accessorKey] / 2
                                                                    : row[col.accessorKey];
                                                                return (
                                                                    <NumericFormat
                                                                        value={displayVal}
                                                                        displayType="text"
                                                                        thousandSeparator
                                                                        allowNegative={true}
                                                                        prefix={currs.includes(col.accessorKey) ? '$' : ''}
                                                                        decimalScale={currs.includes(col.accessorKey) ? 2 : 3}
                                                                        fixedDecimalScale
                                                                        className="responsiveTextTable"
                                                                        style={{
                                                                            color: ['openShip', 'remaining'].includes(col.accessorKey) && Number(displayVal) > 0 ? 'var(--bad-text)' : 'var(--ink)',
                                                                            fontWeight: '400',
                                                                            lineHeight: '1.2'
                                                                        }}
                                                                    />
                                                                );
                                                            }
                                                            return (
                                                                <span
                                                                    className='responsiveTextTable text-[var(--ink)]'
                                                                    style={{
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
                            <div className="responsiveText text-center py-10 text-[var(--ink-muted)]">
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
