import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { filteredArray } from './aggregate';

/**
 * Net on-hand quantity per contract material line — port of web utils.js
 * loadStockOnHandByLine. What the duplicate-line trap needs: an answer for EVERY
 * candidate line of a contract before any one of them is chosen.
 *
 * One batched read (Firestore `in` caps at 30), matched on either `description` or
 * `descriptionId`, each lot counted once, drafts and zero-value settlement rows
 * excluded, and run through the same filteredArray supersede rule every other stock
 * reader uses. `stock` narrows to one warehouse when given.
 */
export async function loadStockOnHandByLine(
  uidCollection: string,
  lineIds: string[] = [],
  stock: string | null = null
): Promise<Record<string, number>> {
  const ids = [...new Set(lineIds.filter(Boolean))];
  if (!ids.length) return {};
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
  const kept = filteredArray(
    lots.filter((l) => {
      if (seen.has(l.id)) return false;
      seen.add(l.id);
      if (stock && l.stock !== stock) return false;
      return l.draft !== true && l.total !== 0;
    }) as any
  ) as any[];
  const onHand: Record<string, number> = {};
  ids.forEach((id) => {
    onHand[id] = 0;
  });
  kept.forEach((l) => {
    const key = ids.includes(l.description) ? l.description : l.descriptionId;
    if (!(key in onHand)) return;
    onHand[key] += (Number(l.qnty) || 0) * (l.type === 'in' ? 1 : -1);
  });
  return onHand;
}
