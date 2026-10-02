'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { rowKeys, isSameList, nextPageIndex } from './keepPage'

/* Per-page table preferences: which columns are shown, what each one is filtered to,
   how the table is sorted, and how many rows a page holds. Client asked for these to
   survive a reload — hiding six columns on Contracts and filtering to one supplier is
   a setup, not a one-off, and redoing it on every visit is the complaint.
   Scoped by route, so Contracts and Invoices keep separate setups; pass a suffix for
   two tables on one route (the Stocks page's My Stock / Shared tabs).
   The store is localStorage: per browser, never leaves the machine. */

const VERSION = 1
const keyFor = (scope, name) => `ims.table.v${VERSION}.${scope}.${name}`

const read = (key) => {
  try {
    const raw = window.localStorage.getItem(key)
    return raw === null ? undefined : JSON.parse(raw)
  } catch {
    // Private mode, blocked storage, or a value some other version wrote — fall back
    // to the default rather than taking the page down.
    return undefined
  }
}

const write = (key, value) => {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch { /* quota or blocked storage: preferences are a convenience, not data */ }
}

/* Drop-in for useState.

   Two things this deliberately does NOT do, both learned the hard way:

   1. It does not read localStorage in the useState initialiser. These tables are
      server-rendered, and a first render that differs from the server's markup
      breaks hydration.

   2. It does not write from an effect on [value]. That effect runs in the SAME
      commit as the restore effect, before the restored value has been applied, so
      it wrote the DEFAULT over the saved setup — and under StrictMode's double
      invoke the next read then returned that default and the setup was gone for
      good. Writing happens only in the setter, i.e. only when something actually
      changes the table. */
export const useTablePrefs = (name, initial, suffix = '') => {
  const pathname = usePathname()
  const scope = `${pathname || 'unknown'}${suffix ? `:${suffix}` : ''}`
  const key = keyFor(scope, name)

  const [value, setValue] = useState(initial)
  /* Mirrors `value` so the setter can resolve an updater function without waiting
     for a re-render. It follows `value`, never the `initial` ARGUMENT: initial may
     be a lazy initialiser function, and a ref holding that function would make
     TanStack's {...old, [id]: false} spread the function instead of the current
     visibility map — every other column's saved state silently wiped. */
  const valueRef = useRef(value)
  valueRef.current = value

  useEffect(() => {
    const stored = read(key)
    if (stored === undefined) return
    valueRef.current = stored
    setValue(stored)
  }, [key])

  const set = useCallback((updater) => {
    const next = typeof updater === 'function' ? updater(valueRef.current) : updater
    valueRef.current = next
    write(key, next)
    setValue(next)
  }, [key])

  return [value, set]
}

/* Pagination, with only the page SIZE remembered. Landing on page 7 of a table you
   just opened is disorienting, so the index always starts at 0. */
export const useTablePagination = (defaultSize = 50, suffix = '') => {
  const [pageSize, setPageSize] = useTablePrefs('pageSize', defaultSize, suffix)
  const [pageIndex, setPageIndex] = useState(0)

  const setPagination = useCallback((updater) => {
    const next = typeof updater === 'function' ? updater({ pageIndex, pageSize }) : updater
    if (!next) return
    setPageIndex(next.pageIndex ?? 0)
    if (next.pageSize !== undefined && next.pageSize !== pageSize) setPageSize(next.pageSize)
  }, [pageIndex, pageSize, setPageSize])

  return [{ pageIndex, pageSize }, setPagination]
}

// Before the screen paints, so a page change never flashes the wrong rows; on the
// server, where there is nothing to paint, the plain effect (useLayoutEffect warns there).
const useBeforePaint = typeof window !== 'undefined' ? useLayoutEffect : useEffect

/* The page a person is on, kept while the rows under it are refreshed.

   TanStack sends a table back to page 1 whenever its rows are recomputed — after a new
   search or sort, but also after new DATA. Saving in an edit window hands the table a
   fresh copy of the same list, so working down page 3 of Stocks, every save in
   Materials Breakdown threw the table back to page 1 (client, 2026-10-02) — and every
   other page with an edit window did the same. This replaces that rule:
     · search, a column filter, the sort          → page 1, as before
     · different rows (another view, warehouse,
       date range, find-by-spec)                  → page 1
     · the same rows refreshed (an edit, a record
       added or removed)                          → the page stays — or the last page,
                                                    if it no longer exists
   (components/table/keepPage.js tells the last two apart by the records' ids.)

   Call it straight after useReactTable:  useKeepPage(table) */
export const useKeepPage = (table) => {
  // TanStack's own reset is the rule above that threw the page away; switched off here,
  // on the table, so a table cannot take the hook and keep the old behaviour by omission.
  table.setOptions(prev => ({ ...prev, autoResetPageIndex: false }))

  const { globalFilter, columnFilters, sorting, pagination } = table.getState()
  const data = table.options.data
  const pageIndex = pagination?.pageIndex ?? 0
  const pageCount = table.getPageCount()
  const viewKey = JSON.stringify([globalFilter ?? '', columnFilters ?? [], sorting ?? []])
  // What the last decision was made on: the view, the data, and that data's record keys.
  const seen = useRef(null)

  useBeforePaint(() => {
    const prev = seen.current
    const dataChanged = !prev || prev.data !== data
    const keys = dataChanged ? rowKeys(data) : prev.keys
    const next = nextPageIndex({
      viewChanged: !!prev && prev.viewKey !== viewKey,
      sameList: !prev || !dataChanged || isSameList(prev.keys, keys),
      pageIndex,
      pageCount,
    })
    seen.current = { viewKey, data, keys }
    if (next !== null) table.setPageIndex(next)
  })
}
