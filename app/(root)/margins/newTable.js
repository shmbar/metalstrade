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
import EmptyState from "../../../components/EmptyState";
import { getTtl } from "../../../utils/languages";

// Fixed widths, sized to what each column HOLDS — not to a share of the screen.
//
// These were percentages summing to 100. That guarantees two faults at once: a
// checkbox needs ~46px on a 13" screen and ~46px on a 27" one, so 4% was 48px at
// 1200 and 90px at 2250 — a cell mostly made of air on a large monitor — while
// the same percentages left the text columns short on a 14".
//
// Each width below clears its widest content INCLUDING its own header, which is
// what actually governs the figure columns: "TOTAL MARGIN" is wider than
// "$282,000.00", and "QTY (MT)" and "OPEN SHIP" wrapped onto a second line when
// they were budgeted off their values alone.
//
// Description is the only free-text column, so it alone states no width and
// takes whatever is left — the container minus the 1212px the twelve stated
// columns add up to. Under fixed layout that remainder can go to nearly ZERO,
// so its floor is enforced by the table wrapper's min-w-[1392px] (= 1212 + a
// 180px floor) rather than here. Anything widened below must move that number
// too, or Description is what pays for it.
//
// WHY THIS TABLE IS `table-layout: fixed` WHEN EVERY OTHER TABLE IS `auto`.
// The original reason is gone: ../contracts/style.css used to carry a bare
// `table { table-layout: fixed }` that leaked to every page, and this file was
// working around it. That rule was removed on 2026-08-21. The reason it stays
// fixed HERE is its own: this is the only data table whose cells are form
// CONTROLS rather than text — a date picker, seven <input>s and two select
// triggers per row. Under `auto`, a column's width is driven by the intrinsic
// width of the control inside it, not by the value, and measuring it that way
// (1400px container, this row shape) gives:
//
//   auto   date=136 purchase=136 description=136 margin=136 shipped=136 …
//   fixed  every column an equal 108px share unless it states a width
//
// So `auto` would hand each numeric column ~136px — far more than the ~92px its
// figures need — while starving Description, the one column that should grow,
// down to 136px as well. Neither layout sizes these columns for us, and fixed at
// least lets the widths below say what each column actually holds. That is also
// why min-widths are not an option: under fixed they are ignored outright.
//
// The tableLayout below is stated explicitly rather than inherited, so this
// table keeps working regardless of what the shared stylesheet does.
const COLUMN_CONFIGS = {
    'drag-handle': { w: '30px',  align: 'center' },
    // 110px: the cell padding and the clear button's gutter come off this before
    // the date input sees it, and DD.MM.YY measures ~58px at this rung. Narrower
    // and the year is clipped outright — an <input> cuts its text rather than
    // overflowing it, so nothing on screen signals the loss.

    'date':        { w: '110px', align: 'center' },
    // QUANTITY BAND — see the currency band below for how both bands are sized.
    'purchase':    { w: '104px', align: 'right'  },
    // Free text, so it overflows at any width the table can afford and the input
    // scrolls — but it is the column users actually read, so it takes the points
    // nobody else needed rather than staying the tightest fit that works. It is
    // also the column those points come back OUT of, for the same reason: free
    // text that runs on still reads as text and scrolls in its input, whereas a
    // clipped entity name reads as the wrong entity and a clipped date loses its
    // year outright.
    'description': { w: 'auto',  align: 'left'   },
    // Both entity columns carry the initial-avatar chip every other
    // supplier/client column in the app carries, and both are budgeted the same
    // way: NAME WIDTH + 72px of chrome. The 72px is fixed and none of it is
    // available to the text — 16px cell padding, 16px button padding, 16px for
    // the (always-reserved, hover-revealed) chevron, and 24px for the 18px chip
    // plus its 6px gap.
    //
    // Name widths are measured, not estimated, in Plus Jakarta Sans at
    // --fs-table's largest rung (12px, which is what every breakpoint from 1600
    // up renders): "Metalfund (Igor)" is 91px and the "Select Supplier"
    // placeholder is 87px, so 104px of text budget clears both with slack. At
    // 162px it cleared neither — the text budget came to exactly 90px and the
    // name wrapped mid-token onto a second line.
    'supplier':    { w: '176px', align: 'left'   },
    // Same arithmetic, and deliberately NOT trimmed to the minimum that fits:
    // the 72px chrome figure comes off a rebuilt trigger and measures ~2px
    // optimistic against the real cell, so both columns keep a double-digit
    // slack instead of the 1-3px that "just fits" would leave. 84px of budget
    // here, against a 73px "Select Client" placeholder and a 63px longest name
    // ("Chemetals"). This still has to hold
    // its longest name outright rather than the "SJM" / "Oryx" short ones —
    // "Iberinox" was rendering as "Iberi…" when this was tighter.
    'client':      { w: '156px', align: 'left'   },
    // TWO BANDS, NOT SEVEN INDIVIDUAL FITS. Columns holding the same KIND of
    // value are the same width, so the eye reads one grid instead of six
    // different ones — margin / totalMargin / remaining are currency, purchase /
    // shipped / openShip are MT.
    //
    // Every figure below is MEASURED in a browser at the 12px rung (the cap from
    // 1600px up), WITH ../contracts/style.css loaded — that file is what these
    // cells actually render under, and measuring without it reads ~16px
    // optimistic on the editable columns. Each band takes the LARGEST minimum
    // across its columns, because the binding constraint moves around:
    //
    //   band      column        kind      needs   why
    //   currency  totalMargin   readonly   102    "$1,190,000.00"
    //             margin        editable   102    "$1,200,000" + 16px padding
    //             (header)                 108    "TOTAL MARGIN"      <- binds
    //   quantity  purchase      editable    94    "1,200.000" + 16px padding <-
    //             openShip      readonly    71
    //             (header)                  85    "OPEN SHIP"
    //
    // Currency 116px, quantity 104px — 8px and 19px clear of the headers, 14px
    // and 10px clear of the values.
    //
    // "editable" vs "readonly" is not cosmetic: `table td input` in
    // contracts/style.css forces 8px of side padding on a field the user types
    // in, so an editable column needs 16px more than a read-only one showing the
    // same string. A read-only <input> clips to its content box rather than
    // overflowing, which is why every miss here fails SILENTLY — the old 94px
    // `remaining` rendered "$180,000.00" as "$180,000.", and the old 120px
    // `totalMargin` rendered "$1,190,000.00" as "$1,190,000.0C".
    'margin':      { w: '116px', align: 'right'  },
    'totalMargin': { w: '116px', align: 'right'  },
    'shipped':     { w: '104px', align: 'right'  },
    'openShip':    { w: '104px', align: 'right'  },
    'remaining':   { w: '116px', align: 'right'  },
    'gis':         { w: '46px',  align: 'center' },
    'del':         { w: '34px',  align: 'center' },
};


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
        const cellAlign = columnConfig.align || "left";

        return (
          <TableCell
            key={cell.id}
            style={{
              // padding comes from .custom-table td
              verticalAlign: "middle",
              width: columnConfig.w || 'auto',
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
                      "w-full min-w-0 bg-transparent border-none outline-none px-0 text-center responsiveTextTable ",
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
                  "w-full min-w-0 bg-transparent border-none outline-none px-0 text-center responsiveTextTable ",
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
                {/* No local type rule: .custom-table below sets th and td together,
                    the same definition the other fourteen tables read. */}
                {/* margins-table-scroll: globals.css lifts this clip while a date
                    picker is open, so the calendar is not cut off at the bottom edge. */}
                <div className="margins-table-scroll rounded-lg border border-[var(--line)] overflow-x-auto relative shadow-card">
                    {/* Desktop Table - Compact Heights */}
                    {/* min-w is DERIVED, not chosen: the twelve stated columns in
                        COLUMN_CONFIGS total 1176px, and Description needs a 180px floor
                        (its longest value, "59Ni 12Cr 3.8Mo 11Co Tngs", measures 164px at
                        the 12px rung). 1212 + 180 = 1392.

                        It was 900px, which is BELOW the stated total — and under fixed
                        layout the auto column absorbs the entire shortfall, so Description
                        silently collapsed to ~42px on a 1280 screen and showed one or two
                        characters. Every other column looked right, which is exactly why it
                        read as "the description column is broken" rather than "the table is
                        too wide". Past this floor the parent's overflow-x-auto scrolls, the
                        way every other wide table in the app already behaves.

                        KEEP THIS IN STEP with COLUMN_CONFIGS: widen a column there and this
                        number has to move by the same amount, or Description pays for it. */}
                    <div className="hidden sm:block w-full min-w-[1392px] custom-table">
                        {/* Fixed layout — see the note above COLUMN_CONFIGS for why this
                            table is the one that keeps it. The widths there are what each
                            column holds; Description states none and takes the remainder. */}
                        <Table className="w-full margins-data-table" style={{ tableLayout: 'fixed' }}>
                            <TableHeader>
                                <TableRow>
                                    {table.getHeaderGroups().map((headerGroup) =>
                                        headerGroup.headers.map((header, idx, arr) => {
                                            const columnConfig = COLUMN_CONFIGS[header.column.id] || {};
                                            return (
                                              <TableHead
  key={header.id}
  /* Width only. The 36px height that used to sit here made this the one header
     band in the app sized by a stated height instead of by `.custom-table th`'s
     4px/8px padding, so margins' header row stood ~10px taller than every other
     page's. Row height is the padding's job. */
  style={{
    width: (COLUMN_CONFIGS[header.column.id] || {}).w || 'auto',
  }}
  className={cn(
    /* Background, border, uppercase, tracking, size and weight all come from
       .custom-table th now — only the corner rounding is local. */
    idx === 0 ? 'rounded-tl-lg' : '',
    idx === arr.length - 1 ? 'rounded-tr-lg' : ''
  )}
>
  <div className="w-full flex items-center justify-center whitespace-nowrap">
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
                                                {/* Same empty state as contracts, stocks and the rest —
                                                    icon, message and hint from one component, instead of
                                                    a bare "No results found." at a different type size. */}
                                                <TableCell colSpan={columns.length}>
                                                    <EmptyState
                                                        message={getTtl('No data available', ln)}
                                                        hint="Try adjusting your filters or date range"
                                                    />
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
                                                        /* Padding, size and height all come from `.custom-table td`,
                                                           the same band the body rows read. This used to state its own
                                                           36px height and squeeze the figure columns to `4px 0` to buy
                                                           the totals room they no longer need — the currency band is
                                                           now wide enough to hold "$677,475.00" WITH the standard 8px
                                                           gutters, so the footer can stop being a special case. */
                                                        style={{ verticalAlign: 'middle' }}
                                                        className={cn(
                                                            columnConfig.align === 'right' && 'text-right',
                                                            columnConfig.align === 'center' && 'text-center',
                                                            'border-t border-t-[var(--line-strong)]'
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
