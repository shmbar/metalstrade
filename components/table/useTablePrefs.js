'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'

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
