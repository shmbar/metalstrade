// Where grades live: the SHARED_STOCK namespace, beside the jointly-held stock.
//
// One list for IMS and GIS, not one per workspace like every other setting. The two
// companies trade the same materials, and two registries would drift apart within a
// month — the same 40Ni named two ways is exactly the problem grades exist to remove.
// firestore.rules already grants any member of either trading company read/write on
// SHARED_STOCK/**, so this needs no rules change.
import { collection, doc, onSnapshot, writeBatch } from 'firebase/firestore';
import { db } from './firebase';
import { SHARED_STOCK_UID } from './utils';

const gradesCol = () => collection(db, SHARED_STOCK_UID, 'data', 'grades');

/** Live list of every grade document, deleted ones included (callers filter). */
export const subscribeGrades = (onData, onError) =>
    onSnapshot(gradesCol(), snap => onData(snap.docs.map(d => ({ ...d.data(), id: d.id }))), onError);

/**
 * Write whole grade documents in one atomic commit. Callers pass only the grades that
 * changed — the assign* helpers in utils/grades.js return exactly that set — so a
 * merge that moves a spelling from one grade to another lands as one change or none.
 */
export const saveGrades = async (grades, by = '') => {
    if (!grades?.length) return true;
    const batch = writeBatch(db);
    const now = Date.now();
    grades.forEach(g => batch.set(doc(db, SHARED_STOCK_UID, 'data', 'grades', g.id),
        { ...g, updatedAt: now, ...(by ? { updatedBy: by } : {}) }));
    await batch.commit();
    return true;
};
