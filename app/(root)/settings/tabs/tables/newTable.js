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
import SortIcon from "@components/table/SortIcon";


const Customtable = ({
  data,
  columns,
  invisible,
  Edit,
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
          <div className="flex items-center relative w-[140px] h-7 border border-[var(--selago)] rounded-2xl bg-[var(--bg-card)] shadow-sm">
            <input
              className="bg-[var(--bg-card)] border-0 shadow-none pr-8 pl-3 focus:outline-none w-full text-[var(--endeavour)] placeholder:text-[var(--endeavour)] h-full responsiveTextInput rounded-2xl"
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
          <table className="w-full min-w-[700px] border-collapse text-center table-fixed border border-[var(--selago)]">
            <thead className="md:sticky md:top-0 md:z-10 bg-[var(--bg-subtle)]">
              {table.getHeaderGroups().map((hdGroup) => (
                <tr key={hdGroup.id} className="border-b border-[var(--line)]">
                  {hdGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-3 py-2 text-center font-medium uppercase"
                      style={{ width: `${header.column.getSize()}px`, fontSize: 'var(--fs-body)', letterSpacing: '0.04em', color: 'var(--ink-muted)' }}
                    >
                      {header.column.getCanSort() ? (
                        <div
                          onClick={header.column.getToggleSortingHandler()}
                          className="cursor-pointer flex items-center justify-center gap-1"
                        >
                          {header.column.columnDef.header}
                          <SortIcon column={header.column} />
                        </div>
                      ) : (
                        <span>{header.column.columnDef.header}</span>
                      )}
                      {filterOn && header.column.getCanFilter() && (
                        <input
                          className="mt-1 w-full border border-[var(--selago)] rounded-lg px-2 py-0.5 responsiveTextTable font-medium focus:outline-none focus:border-[var(--endeavour)]"
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
            <tbody className="divide-y divide-[var(--line)] bg-[var(--bg-card)]">
              {table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="cursor-pointer transition-colors hover-row"
                  onDoubleClick={() => Edit(row)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      data-label={cell.column.columnDef.header}
                      className="px-3 py-2 responsiveTextTable text-center font-sans"
                    >
                      <div className="flex items-center justify-center">
                        {
                          cell.column.id === 'delete' ? (
                            <div className="px-2 py-0.5 rounded-lg bg-red-100 border border-red-300 responsiveTextTable inline-flex items-center justify-center min-w-[60px]">
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </div>
                          ) : (
                            <div className="px-1 py-1 responsiveTextTable w-full" style={{ color: 'var(--ink)' }}>
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
        <div className="flex items-center justify-between p-3 border-[var(--line)] bg-[var(--bg-card)] rounded-b-lg">
          {/* LEFT — Showing text */}
          <div className="hidden lg:flex text-[var(--endeavour)] responsiveTextInput">
            {`${getTtl("Showing", ln)} ${table.getState().pagination.pageIndex *
              table.getState().pagination.pageSize +
              (table.getFilteredRowModel().rows.length ? 1 : 0)
              }-${table.getRowModel().rows.length +
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
