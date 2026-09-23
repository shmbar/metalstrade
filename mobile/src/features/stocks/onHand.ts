import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { onHandByLine } from '@shared/stockGuards';
import { filteredArray } from './aggregate';

/**
 * Net on-hand quantity per contract material line — port of web utils.js
 * loadStockOnHandByLine.
 */
export async function loadStockOnHandByLine(
  uidCollection: string,
  lineIds: string[] = [],
  stock: string | null = null
): Promise<Record<string, number>> {
  const ids = [...new Set(lineIds.filter(Boolean))];
  return onHandByLine(await loadStockRowsByLine(uidCollection, ids, stock), ids);
}

/**
 * The ledger rows behind loadStockOnHandByLine, before they are summed — port of web
 * loadStockRowsByLine. What the duplicate-line trap needs: an answer for EVERY
 * candidate line of a contract before any one of them is chosen, as rows, because a
 * line id can be shared by several contracts and only a row says whose it is.
 *
 * One batched read (Firestore `in` caps at 30), matched on either `description` or
 * `descriptionId`, each lot counted once, drafts and zero-value settlement rows
 * excluded, and run through the same filteredArray supersede rule every other stock
 * reader uses. `stock` narrows to one warehouse when given.
 */
export async function loadStockRowsByLine(
  uidCollection: string,
  lineIds: string[] = [],
  stock: string | null = null
): Promise<any[]> {
  const ids = [...new Set(lineIds.filter(Boolean))];
  if (!ids.length) return [];
  const lots: any[] = [];
  for (let i = 0; i < ids.length; i += 30) {
    const chunk = ids.slice(i, i + 30);
    for (const field of ['description', 'descriptionId']) {
      const snap = await getDocs(query(collection(db, uidCollection, 'data', 'stocks'), where(field, 'in', chunk)));
      snap.docs.forEach((d) => lots.push({ id: d.id, ...d.data() }));
    }
  }
  // a lot can match on both fields — count it once
  const seen = new Set<string>();
  return filteredArray(
    lots.filter((l) => {
      if (seen.has(l.id)) return false;
      seen.add(l.id);
      if (stock && l.stock !== stock) return false;
      return l.draft !== true && l.total !== 0;
    }) as any
  ) as any[];
}
