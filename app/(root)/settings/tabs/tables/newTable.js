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
        <Header
          globalFilter={globalFilter}
          setGlobalFilter={setGlobalFilter}
          table={table}
        />

        <div
          className="
                w-full
                rounded-lg
                border
                border-[#E5E7EB]
                overflow-hidden
                bg-[#F9FAFB]
                shadow-sm
            "
        >
          {" "}
          <table className="w-full border-collapse border border-[#E5E7EB] overflow-hidden text-center">
            <thead className="md:sticky md:top-0 md:z-10 bg-[#e3f3ff]">
              {table.getHeaderGroups().map((hdGroup) => (
                <tr key={hdGroup.id}>
                  {hdGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="
                            px-6
                            py-4
                            text-sm
                            text-[#005b9f]
                            text-center
                            border-r
                            border-b
                            border-[#E5E7EB]
                            last:border-r-0
                            font-normal
                            font-poppins 
                        "
                    >
                      {header.column.getCanSort() ? (
                        <div
                          onClick={header.column.getToggleSortingHandler()}
                          className="cursor-pointer flex items-center justify-center gap-1 text-xs "
                        >
                          {header.column.columnDef.header}
                          {
                            {
                              asc: (
                                <TbSortAscending className="text-[#005b9f] scale-110" />
                              ),
                              desc: (
                                <TbSortDescending className="text-[#005b9f] scale-110" />
                              ),
                            }[header.column.getIsSorted()]
                          }
                        </div>
                      ) : (
                        <span className="text-xs">
                          {header.column.columnDef.header}
                        </span>
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-[var(--selago)]">
              {table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="cursor-pointer hover:bg-[var(--selago)]/50 transition-colors"
                  onDoubleClick={() => SelectRow(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                   <td
                    key={cell.id}
                    data-label={cell.column.columnDef.header}
                    className="
                        px-4
                        h-8
                        bg-[#F4F6F8]
                        border
                        border-[#E5E7EB]
                        text-[12px]
                        font-normal
                        leading-none
                        text-center
                        truncate
                        font-poppins 
                    "
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between p-3 border-[#E5E7EB] bg-white rounded-b-lg">
          {/* LEFT — Showing text */}
          <div className="hidden lg:flex text-[#005b9f] text-[0.72rem]">
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
