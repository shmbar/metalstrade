'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { UserAuth } from '@contexts/useAuthContext';
import { isShortDesktop } from '@components/CollapsibleSection';

/* Which Margins months are folded — for this person, in this workspace, for this
   year, in this browser (2026-10-02).

   It used to be workspace data. A month's +/− wrote `openMonth` onto that month's
   Firestore document, and the page's autosave rewrote the whole document with it —
   so one person folding February folded it for every colleague in the workspace,
   on every screen. With nine months open the page ran ~3,500px past a 14-inch
   laptop screen, and the only way to get a compact page was to fold it for
   everyone else as well.

   Now folding is a view preference, kept in localStorage and keyed by user,
   workspace and year. Nothing about it is written to Firestore. What each month
   shows, in order:
     1. this person's own choice for that month, if they made one;
     2. otherwise their last "Collapse all" / "Expand all" for the year;
     3. otherwise, on a short desktop screen (≤ 900px tall — a 14-inch laptop),
        folded: each month is then a one-line summary of its four figures;
     4. otherwise the month's saved `openMonth` — the layout the workspace already
        had, so a large screen opens exactly as it did before this change. That
        value is now read-only: nothing updates it any more. */

const KEY = (uid, workspace, year) => `ims.margins.months.v1.${uid}.${workspace}.${year}`;
const EMPTY = { mode: null, months: {} };
const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export function useMonthFolds(year) {
    const { user, uidCollection } = UserAuth() || {};
    const key = user?.uid && uidCollection && year ? KEY(user.uid, uidCollection, year) : null;
    const [prefs, setPrefs] = useState(EMPTY);
    const [short, setShort] = useState(false);
    const prefsRef = useRef(prefs);
    prefsRef.current = prefs;

    // Settled before paint, so a short screen never flashes every month open first.
    useIsoLayoutEffect(() => {
        setShort(isShortDesktop());
        let stored = null;
        if (key) {
            try {
                const raw = window.localStorage.getItem(key);
                if (raw) stored = JSON.parse(raw);
            } catch { /* blocked storage: the screen's default applies */ }
        }
        const next = {
            mode: stored?.mode === 'collapsed' || stored?.mode === 'expanded' ? stored.mode : null,
            months: stored?.months && typeof stored.months === 'object' ? stored.months : {},
        };
        prefsRef.current = next;
        setPrefs(next);
    }, [key]);

    const commit = useCallback((next) => {
        prefsRef.current = next;
        setPrefs(next);
        if (!key) return;
        try { window.localStorage.setItem(key, JSON.stringify(next)); } catch { /* a view preference, not data */ }
    }, [key]);

    /** Whether `month` shows open, given the month's saved (workspace) value. */
    const isOpen = useCallback((month, saved) => {
        const own = prefs.months[month];
        if (typeof own === 'boolean') return own;
        if (prefs.mode === 'collapsed') return false;
        if (prefs.mode === 'expanded') return true;
        return short ? false : saved === true;
    }, [prefs, short]);

    /** A month's own +/−: this person's choice for that month only. */
    const setMonth = useCallback((month, open) => {
        const cur = prefsRef.current;
        commit({ ...cur, months: { ...cur.months, [month]: !!open } });
    }, [commit]);

    /** Collapse all / Expand all: every month of the year, replacing the per-month choices. */
    const setAll = useCallback((open) => {
        commit({ mode: open ? 'expanded' : 'collapsed', months: {} });
    }, [commit]);

    return { isOpen, setMonth, setAll };
}
