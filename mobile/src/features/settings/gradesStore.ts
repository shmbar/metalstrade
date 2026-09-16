import { doc, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { SHARED_STOCK_UID } from '@/data/writes';

/*
 * Where grades live — port of web utils/gradesStore.js. One list for IMS and GIS, in the
 * SHARED_STOCK namespace beside the jointly held stock: the two companies trade the same
 * materials, and two registries would drift apart.
 *
 * saveGrades writes whole grade documents in atomic batches. Callers pass only the grades
 * that changed (assignAliases returns exactly that set), so a save that moves a spelling
 * from one grade to another lands as one change or none. Batches are chunked at 400,
 * inside Firestore's 500-write limit, exactly as web does.
 */
export async function saveGrades(grades: any[], by = ''): Promise<boolean> {
  if (!grades?.length) return true;
  const now = Date.now();
  for (let i = 0; i < grades.length; i += 400) {
    const batch = writeBatch(db);
    grades.slice(i, i + 400).forEach((g) =>
      batch.set(doc(db, SHARED_STOCK_UID, 'data', 'grades', g.id), { ...g, updatedAt: now, ...(by ? { updatedBy: by } : {}) })
    );
    await batch.commit();
  }
  return true;
}
