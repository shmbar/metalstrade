"use client";

import Header from "../../../../../components/table/header";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useEffect, useMemo, useState } from "react";
import { TbSortDescending } from "react-icons/tb";
import { TbSortAscending } from "react-icons/tb";
import { FaSearch } from "react-icons/fa";
import { TiDeleteOutline } from "react-icons/ti";
import { LuFilter } from "react-icons/lu";
import ColFilter from "../../../../../components/table/ColumnsFilter";

import { Paginator } from "../../../../../components/table/Paginator";
import RowsIndicator from "../../../../../components/table/RowsIndicator";
import "../../../contracts/style.css";
import { useContext } from "react";
import { SettingsContext } from "../../../../../contexts/useSettingsContext";
import { usePathname } from "next/navigation";
import { getTtl } from "../../../../../utils/languages";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../../../../..//components/ui/tooltip";
import Tltip from "../../../../../components/tlTip";

const Customtable = ({
  data,
  columns,
  invisible,
  SelectRow,
  excellReport,
  setFilteredData,
}) => {
  const [globalFilter, setGlobalFilter] = useState("");
  const [columnVisibility, setColumnVisibility] = useState(invisible);
  const [filterOn, setFilterOn] = useState(false);

  const [{ pageIndex, pageSize }, setPagination] = useState({
    pageIndex: 0,
    pageSize: 500,
  });
  const pagination = useMemo(
    () => ({ pageIndex, pageSize }),
    [pageIndex, pageSize],
  );
  const pathName = usePathname();
  const { ln } = useContext(SettingsContext);

  const [columnFilters, setColumnFilters] = useState([]); //Column filter

  const table = useReactTable({
    columns,
    data,
    getCoreRowModel: getCoreRowModel(),
    state: {
      globalFilter,
      columnVisibility,
      pagination,
      columnFilters,
    },
    onColumnFiltersChange: setColumnFilters, ////Column filter
    getFilteredRowModel: getFilteredRowModel(),
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setColumnVisibility,
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onPaginationChange: setPagination,
  });

  const resetTable = () => {
    table.resetColumnFilters();
  };

  useEffect(() => {
    resetTable();
  }, []);

  return (
    <div className="flex flex-col relative ">
      <div>
        {/* Custom header: Search + Edit + Columns + Filter icons */}
        <div className="flex items-center gap-2 p-2">
          <div className="flex items-center relative w-[140px] h-7 border border-[var(--endeavour)] rounded-2xl bg-white shadow-sm">
            <input
              className="bg-white border-0 shadow-none pr-8 pl-3 focus:outline-none w-full text-[var(--endeavour)] placeholder:text-[var(--endeavour)] h-full text-[0.75rem] rounded-2xl"
              placeholder="Search..."
              value={globalFilter ?? ''}
              onChange={e => setGlobalFilter(e.target.value)}
              type='text'
            />
            {globalFilter === '' ? (
              <FaSearch className="text-[var(--endeavour)] absolute right-3" style={{ fontSize: 12 }} />
            ) : (
              <TiDeleteOutline className="text-[var(--regent-gray)] absolute right-3 cursor-pointer hover:text-red-500" onClick={() => setGlobalFilter('')} style={{ fontSize: 16 }} />
            )}
          </div>
          <div className="w-7 h-7 inline-flex items-center justify-center rounded hover:bg-[var(--selago)] cursor-pointer text-[var(--endeavour)]">
            <ColFilter table={table} iconClassName="text-[var(--endeavour)]" iconSize={16} />
          </div>
          <div
            className={`w-7 h-7 inline-flex items-center justify-center rounded hover:bg-[var(--selago)] cursor-pointer transition-colors ${filterOn ? 'bg-[var(--selago)] text-[var(--endeavour)]' : 'text-[var(--endeavour)]'}`}
            onClick={() => setFilterOn(!filterOn)}
          >
            <LuFilter style={{ fontSize: 14 }} />
          </div>
        </div>

        <div className="w-full rounded-2xl border border-[var(--selago)] overflow-x-auto shadow-sm">
          <table className="w-full min-w-[700px] border-collapse text-center table-fixed">
            <thead className="md:sticky md:top-0 md:z-10 bg-[#dbeeff]">
              {table.getHeaderGroups().map((hdGroup) => (
                <tr key={hdGroup.id} className="divide-x divide-[var(--selago)]">
                  {hdGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-3 py-3 responsiveTextTable text-[var(--chathams-blue)] text-center font-medium font-poppins"
                      style={{ width: `${header.column.getSize()}px` }}
                    >
                      {header.column.getCanSort() ? (
                        <div
                          onClick={header.column.getToggleSortingHandler()}
                          className="cursor-pointer flex items-center justify-center gap-1"
                        >
                          {header.column.columnDef.header}
                          {
                            {
                              asc: <TbSortAscending className="text-[var(--endeavour)] scale-110" />,
                              desc: <TbSortDescending className="text-[var(--endeavour)] scale-110" />,
                            }[header.column.getIsSorted()]
                          }
                        </div>
                      ) : (
                        <span>{header.column.columnDef.header}</span>
                      )}
                      {filterOn && header.column.getCanFilter() && (
                        <input
                          className="mt-1 w-full border border-[var(--selago)] rounded-full px-2 py-0.5 responsiveTextTable font-normal focus:outline-none focus:border-[var(--endeavour)]"
                          value={header.column.getFilterValue() ?? ''}
                          onChange={e => header.column.setFilterValue(e.target.value)}
                          placeholder="Filter..."
                          onClick={e => e.stopPropagation()}
                        />
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-[var(--selago)] bg-white">
              {table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="cursor-pointer transition-colors divide-x divide-[var(--selago)]"
                  onDoubleClick={() => SelectRow(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      data-label={cell.column.columnDef.header}
                      className="px-3 py-2 responsiveTextTable font-normal text-center font-poppins"
                    >
                      <div className="flex items-center justify-center">
                        {cell.column.id === 'edit' ? (
                          <div className="px-2 py-0.5 rounded-full bg-green-100 border border-green-300 responsiveTextTable inline-flex items-center justify-center min-w-[60px]">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </div>
                        ) : cell.column.id === 'delete' ? (
                          <div className="px-2 py-0.5 rounded-full bg-red-100 border border-red-300 responsiveTextTable inline-flex items-center justify-center min-w-[60px]">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </div>
                        ) : (
                          <div
                            className="px-3 py-1 rounded-xl responsiveTextTable font-normal w-full"
                            style={{ backgroundColor: '#f8fbff', border: '1px solid #d8e8f5' }}
                          >
                            {cell.getValue() != null && cell.getValue() !== ''
                              ? flexRender(cell.column.columnDef.cell, cell.getContext())
                              : <>&nbsp;</>}
                          </div>
                        )}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between p-3 border-[#E5E7EB] bg-white rounded-b-lg">
          {/* LEFT — Showing text */}
          <div className="hidden lg:flex text-[var(--endeavour)] text-[0.72rem]">
            {`${getTtl("Showing", ln)} ${
              table.getState().pagination.pageIndex *
                table.getState().pagination.pageSize +
              (table.getFilteredRowModel().rows.length ? 1 : 0)
            }-${
              table.getRowModel().rows.length +
              table.getState().pagination.pageIndex *
                table.getState().pagination.pageSize
            } ${getTtl("of", ln)} ${table.getFilteredRowModel().rows.length}`}
          </div>

          {/* CENTER — Pagination */}
          <div className="flex justify-center flex-1">
            <Paginator table={table} />
          </div>

          {/* RIGHT — Rows Indicator */}
          <div className="flex justify-end">
            <RowsIndicator table={table} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Customtable;
