'use client';

import Header from "../../../components/table/header";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable
} from "@tanstack/react-table";
import { useMemo, useState, useContext, useEffect } from "react";
import { Paginator } from "../../../components/table/Paginator";
import RowsIndicator from "../../../components/table/RowsIndicator";
import { SettingsContext } from "../../../contexts/useSettingsContext";
import { getTtl } from "../../../utils/languages";
import { Filter } from "../../../components/table/filters/filterFunc";
import dateBetweenFilterFn from '../../../components/table/filters/date-between-filter';

const Customtable = ({
  data,
  columns,
  invisible,
  SelectRow,
  setFilteredData,
  highlightId,
  onCellUpdate,
  excellReport
}) => {

  const { ln } = useContext(SettingsContext);

  const [globalFilter, setGlobalFilter] = useState('');
  const [columnVisibility, setColumnVisibility] = useState(invisible);
  const [columnFilters, setColumnFilters] = useState([]);
  const [{ pageIndex, pageSize }, setPagination] = useState({
    pageIndex: 0,
    pageSize: 12
  });

  const pagination = useMemo(() => ({ pageIndex, pageSize }), [pageIndex, pageSize]);

  const table = useReactTable({
    columns,
    data,
    filterFns: { dateBetweenFilterFn },
    state: { globalFilter, columnVisibility, pagination, columnFilters },
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onPaginationChange: setPagination,
  });

  useEffect(() => {
    setFilteredData?.(table.getFilteredRowModel().rows.map(x => x.original));
  }, [columnFilters, globalFilter]);

  const dynamicMaxHeight = '650px';

  return (
    <div className="w-full">

      {/* ======= GLOBAL STYLE MATCHING SCREENSHOT ======= */}
      <style jsx global>{`
        .custom-table th,
        .custom-table td {
          border: 1px solid #d7d7d7;
          text-align: center;
          font-size: 12px;
        }

        .header-blue {
          background-color: #d9e6f2;
          color: #1d3d79;
          font-weight: 400;
        }

        .summary-green {
          background-color: #b7d1b5;
          color: #1d3d79;
          font-weight: 400;
        }

        .summary-blue {
          background-color: #8db6d8;
          color: #1d3d79;
          font-weight: 400;
        }

        .pagination-center {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 10px;
        }

        .page-btn {
          padding: 6px 12px;
          border-radius: 8px;
          font-weight: 500;
        }

        .page-active {
          background-color: #1d3d79;
          color: white;
        }

        .page-normal {
          color: #1d3d79;
        }
      `}</style>

      <div className="custom-table shadow-lg rounded-3xl overflow-hidden border border-[#d7d7d7]">

        <div className="overflow-auto" style={{ maxHeight: dynamicMaxHeight, borderLeft: '10px solid #1D3D79' }}>

          <table className="w-full">

            {/* ======= SUMMARY ROWS ======= */}
            <thead>
              <tr className="summary-green">
                <th colSpan={columns.length}>
                  <div className="grid grid-cols-4 w-full">
                    <div className="text-left pl-6">Total $:</div>
                    <div>$ 0.00</div>
                    <div>$ 0.00</div>
                    <div>$ 0.00</div>
                  </div>
                </th>
              </tr>

              <tr className="summary-blue">
                <th colSpan={columns.length}>
                  <div className="grid grid-cols-4 w-full">
                    <div className="text-left pl-6">Total €:</div>
                    <div>€ 0.00</div>
                    <div>€ 0.00</div>
                    <div>€ 0.00</div>
                  </div>
                </th>
              </tr>

              {/* ======= HEADER ======= */}
              {table.getHeaderGroups().map(hdGroup => (
                <tr key={hdGroup.id}>
                  {hdGroup.headers.map(header => (
                    <th key={header.id} className="header-blue py-3">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>

            {/* ======= BODY ======= */}
            <tbody>
              {table.getRowModel().rows.map(row => (
                <tr key={row.id}>
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} className="py-4 bg-white">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}

              {table.getRowModel().rows.length === 0 && (
                <tr>
                  <td colSpan={columns.length} className="py-16 text-gray-500">
                    {getTtl('No data available', ln)}
                  </td>
                </tr>
              )}
            </tbody>

          </table>
        </div>

        {/* ======= PAGINATION (CENTERED EXACTLY LIKE SCREENSHOT) ======= */}
        <div className="py-4 border-t border-[#d7d7d7] bg-white">

          <div className="pagination-center">

            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="page-btn page-normal"
            >
              Previous
            </button>

            {Array.from({ length: table.getPageCount() }).map((_, i) => (
              <button
                key={i}
                onClick={() => table.setPageIndex(i)}
                className={`page-btn ${
                  table.getState().pagination.pageIndex === i
                    ? 'page-active'
                    : 'page-normal'
                }`}
              >
                {i + 1}
              </button>
            ))}

            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="page-btn page-normal"
            >
              Next
            </button>

          </div>

          <div className="text-center text-sm text-gray-600 mt-3">
            Showing {table.getRowModel().rows.length} out of {table.getFilteredRowModel().rows.length}
          </div>

        </div>

      </div>
    </div>
  );
};

export default Customtable;