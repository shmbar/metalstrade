import { specBreakdown } from '../../../utils/grades'

/* The specs a Stocks row holds, and how much of each is left (utils/grades.js
   specBreakdown). One module for the Spec column and the Excel export, so the sheet
   and the screen can never disagree.

   A row is a stock line (warehouse × PO line) carrying its lots in `data`; a By-grade
   row carries its lines in `_all`. Cached per row object: the table asks for the same
   row several times a render (cell, sort value, filter), and a spec needs a parse of
   every lot behind it. A reload builds new row objects, so the cache never goes stale. */
const cache = new WeakMap()

export const rowSpecs = (row) => {
  if (!row || typeof row !== 'object') return []
  if (cache.has(row)) return cache.get(row)
  const lines = row._all || [row]
  const parts = specBreakdown(lines.map(l => ({
    qnty: parseFloat(l?.qnty) || 0,
    value: l?.total === '-' ? 0 : parseFloat(l?.total) || 0,
    lots: (l?.data || []).filter(x => x && x.type === 'in'),
    description: l?.descriptionName || '',
  })))
  cache.set(row, parts)
  return parts
}

/* How one spec reads: a typed spec ("UMZ", "99%") or the chemistry ("43Ni 15Cr").
   Empty when there is nothing to add to the description beside it — a lot known only
   by its name is already named in the Description column. (The contract's Original
   supplier is not a spec: it has its own column, and shown here as "ex Timur" it read
   as the producer of material Timur only sold on.) */
// eslint-disable-next-line no-unused-vars
export const specLabel = (part, settings) => (part.source !== 'name' ? part.label : '')

export const specText = (row, settings) =>
  rowSpecs(row).map(p => specLabel(p, settings)).filter(Boolean).join(' · ')
