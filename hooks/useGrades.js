'use client';
import { useCallback, useEffect, useState } from 'react';
import { saveGrades, subscribeGrades } from '@utils/gradesStore';
import { buildGradeIndex } from '@utils/grades';

/* One live subscription for the whole app, however many components ask for grades.
   The grade card, the chemistry cell on every Stocks row, each PO-line dropdown and the
   settings tab all read the same list, and an edit made on IMS has to show on GIS without
   a reload — so it is a Firestore listener, shared, and dropped once nothing on screen
   uses it.

   The index is built HERE, once per snapshot, not in each consumer: the Stocks table
   mounts a consumer per row, and hundreds of identical index builds on every grade edit
   would be the cost of that. */
const EMPTY = { all: [], grades: [], index: buildGradeIndex([]), ready: false };
let snapshot = EMPTY;
let unsubscribe = null;
const listeners = new Set();

const publish = (list) => {
    snapshot = { all: list, grades: list.filter(g => !g.deleted), index: buildGradeIndex(list), ready: true };
    listeners.forEach(fn => fn(snapshot));
};

const start = () => {
    if (unsubscribe) return;
    unsubscribe = subscribeGrades(
        publish,
        (err) => {
            // Signed out, or no access: behave as an empty registry rather than break the
            // page. Material without a grade is a valid state everywhere.
            console.warn('grades subscription failed:', err?.code || err);
            unsubscribe = null;
            publish(snapshot.all);
        },
    );
};

const stop = () => {
    if (listeners.size || !unsubscribe) return;
    unsubscribe();
    unsubscribe = null;
    snapshot = EMPTY;
};

export default function useGrades() {
    const [snap, setSnap] = useState(snapshot);

    useEffect(() => {
        listeners.add(setSnap);
        start();
        setSnap(snapshot);
        return () => { listeners.delete(setSnap); stop(); };
    }, []);

    const save = useCallback((changed, by) => saveGrades(changed, by), []);
    return { grades: snap.grades, all: snap.all, index: snap.index, ready: snap.ready, save };
}
