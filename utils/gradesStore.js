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
    const now = Date.now();
    /* A Firestore batch takes 500 writes. One merge changes two or three grades, but
       naming every group on the Stocks page in one pass can change many more, so the
       write is chunked. Each chunk is still atomic, and the guarantee that matters — a
       spelling never sitting on two grades — holds within the pair that moved it. */
    for (let i = 0; i < grades.length; i += 400) {
        const batch = writeBatch(db);
        grades.slice(i, i + 400).forEach(g => batch.set(doc(db, SHARED_STOCK_UID, 'data', 'grades', g.id),
            { ...g, updatedAt: now, ...(by ? { updatedBy: by } : {}) }));
        await batch.commit();
    }
    return true;
};
