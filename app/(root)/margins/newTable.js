import Header from "@components/table/header";
import { flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable } from "@tanstack/react-table"
import { useMemo, useState } from "react"
import '../contracts/style.css';
import { useContext } from 'react';
import { SettingsContext } from "@contexts/useSettingsContext";
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
} from "@/components/ui/table"
import { addComma } from '@app/(root)/cashflow/funcs';

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
import CheckBox from "@components/checkbox";
import Tltip from "@components/tlTip";

const DraggableRow = ({ row, props, cName }) => {

    let { handleChangeDate, handleCancelDate, month, handleChange, deleteRow,
        handleChangeSelect, settings, handleCheckBox
    } = props;
    const { transform, transition, setNodeRef, isDragging } = useSortable({
        id: row.original.id,
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition: transition,
        opacity: isDragging ? 0.8 : 1,
        zIndex: isDragging ? 1 : 0,
        position: 'relative',
    };

    const inputs = ['purchase', 'description', 'margin', 'shipped'];
    const currs = ['margin', 'totalMargin', 'remaining'];

    return (
        <TableRow ref={setNodeRef} style={style}>
            {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id} style={{ width: cell.column.getSize() }} className="p-1">
                    {cell.column.id === 'drag-handle' ?
                        flexRender(cell.column.columnDef.cell, cell.getContext())
                        :
                        cell.column.id === 'date' ? (
                            <DatePicker
                                props={cell}
                                handleChangeDate={handleChangeDate}
                                month={month}
                                handleCancelDate={handleCancelDate}
                            />

                        )
                            :
                            inputs.includes(cell.column.id) ?
                                <Tltip direction='right' tltpText={(cName === 'ims' ? 'IMS: ' : 'GIS ') + addComma(cell.getValue() / 2)} show={cell.column.id === 'margin' && row.original.gis ? true : false}>
                                    <div>
                                        <Input
                                            props={cell}
                                            handleChange={handleChange}
                                            month={month}
                                            name={cell.column.id}
                                            styles={
                                                cell.column.id === 'purchase' ? 'w-16' :
                                                    cell.column.id === 'description' ? 'w-44' :
                                                        cell.column.id === 'margin' ? 'w-20 text-right px-1' :
                                                            cell.column.id === 'shipped' ? 'w-16' :
                                                                ''

                                            }
                                            addCur={currs.includes(cell.column.id)}
                                        />
                                    </div>
                                </Tltip>
                                :
                                cell.column.id === 'del' ?
                                    <div className='flex items-center max-w-4'>
                                        <MdDeleteOutline className="scale-125 text-slate-500 cursor-pointer"
                                            onClick={(e) => deleteRow(e, cell.row.index, month)} />
                                    </div>
                                    :
                                    cell.column.id === 'supplier' || cell.column.id === 'client' ?
                                        <SelectEnt
                                            props={cell}
                                            data={cell.column.id === 'supplier' ?
                                                settings.Supplier.Supplier : settings.Client.Client}
                                            handleChangeSelect={handleChangeSelect}
                                            month={month}
                                            name={cell.column.id === 'supplier' ? "supplier" : "client"}
                                            plHolder={cell.column.id === 'supplier' ? "Select Supplier" : "Select Client"}
                                        />
                                        :
                                        cell.column.id === 'gis' ?
                                            <div className='items-center flex'>
                                                <CheckBox size='size-5' checked={cell.getValue() ?? false}
                                                    onChange={() => handleCheckBox(!cell.getValue(), cell.row.index, month)} />
                                            </div>
                                            :
                                            <NumericFormat
                                                value={(cell.column.id === 'totalMargin' || cell.column.id === 'remaining') && row.original.gis ?
                                                    cell.getValue() / 2 : cell.getValue()}
                                                displayType="text"
                                                thousandSeparator
                                                allowNegative={true}
                                                prefix={currs.includes(cell.column.id) ? '$' : ''}
                                                decimalScale={cell.getValue() !== 0 ? currs.includes(cell.column.id) ? '2' : '3' : 0}
                                                fixedDecimalScale
                                                className={`text-[0.8rem] text-slate-600 text-right ${cell.column.id === 'totalMargin' ?
                                                    'justify-end flex px-1' : ''}`}
                                            />
                    }

                </TableCell>
            ))}
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
                size: 60,
            },
            { accessorKey: 'date', header: 'Date', },
            { accessorKey: 'purchase', header: 'Qty (MT)', cell: (props) => <p> {props.getValue()}</p> },
            { accessorKey: 'description', header: 'Description', },
            { accessorKey: 'supplier', header: 'Supplier' },
            { accessorKey: 'client', header: 'Client' },
            { accessorKey: 'margin', header: 'Margin', },
            { accessorKey: 'totalMargin', header: 'Total Margin', },
            { accessorKey: 'shipped', header: 'Shipped' },
            { accessorKey: 'openShip', header: 'Open Ship' },
            { accessorKey: 'remaining', header: 'Remaining' },
            { accessorKey: 'gis', header: cName === 'ims' ? 'GIS' : 'IMS', },
            { accessorKey: 'del', header: '' },
        ],
        []
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
            <div className="flex flex-col relative">
                <div className="rounded-md border overflow-visible relative">

                    <Table className="relative">
                        <TableHeader>
                            {table.getHeaderGroups().map((headerGroup) => (

                                <TableRow key={headerGroup.id}>
                                    {headerGroup.headers.map((header) => {
                                        return (
                                            <TableHead key={header.id} className={cn('p-1 h-8 font-bold text-xs',
                                                (header.column.id === 'margin' ? 'text-right px-6' :
                                                    header.column.id === 'totalMargin' ? 'text-right px-2' :
                                                        ''))}>
                                                {header.isPlaceholder
                                                    ? null
                                                    : flexRender(header.column.columnDef.header, header.getContext())}
                                            </TableHead>
                                        );
                                    })}
                                </TableRow>
                            ))}
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
                                            <TableCell colSpan={columns.length} className="h-24 text-center">
                                                No results.
                                            </TableCell>
                                        </TableRow>
                                    )
                                }
                            </SortableContext>
                        </TableBody>
                        {data.length ? <TableFooter>
                            {table.getFooterGroups().map((footerGroup) => (
                                <TableRow key={footerGroup.id} className='bg-white'>
                                    {footerGroup.headers.map((footer) => {
                                        const accessorKey = footer.column.columnDef.accessorKey;


                                        // Calculate the total only for numeric columns
                                        const total = data.reduce((sum, row) => {
                                            const value = (accessorKey === 'totalMargin' || accessorKey === 'remaining') && row?.gis ?
                                                row[accessorKey] / 2 : row[accessorKey];

                                            return sum + (value * 1 || 0)
                                        }, 0);
                                        return (
                                            <TableCell
                                                key={`footer-${footer.id}`}
                                                className={cn('p-1 text-left text-xs',
                                                    ["totalMargin", "remaining", "purchase", "openShip"].includes(accessorKey) ?
                                                        'border-t border-t-black' : '')}
                                            >
                                                {
                                                    ["totalMargin", "remaining", "purchase", "openShip"].includes(accessorKey) &&
                                                    <NumericFormat
                                                        value={total}
                                                        displayType="text"
                                                        thousandSeparator
                                                        allowNegative={true}
                                                        prefix={currs.includes(accessorKey) ? '$' : ''}
                                                        decimalScale={currs.includes(accessorKey) ? '2' : '3'}
                                                        fixedDecimalScale
                                                        className={`text-[0.8rem] text-slate-600 font-semibold
                                                             ${accessorKey === 'totalMargin' ? 'flex justify-end px-1' : ''}`}
                                                    />
                                                }

                                            </TableCell>
                                        );
                                    })}
                                </TableRow>
                            ))}
                        </TableFooter>
                            : ''}
                    </Table>
                </div>
            </div>
        </DndContext >
    );
}

export default Customtable;
