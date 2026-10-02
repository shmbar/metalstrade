'use client';
import { useCallback, useEffect, useRef, useState } from 'react';

/* A table's scroll box, capped to the screen it is on (2026-10-02, 14-inch audit).

   Every page-level table caps its own scroll box at a fixed height —
   `Math.min(rows * 40 + 180, 700)`. On a 1080p monitor 700px fits under the page
   header; on a 14-inch laptop (1366×768, 1440×900) it does not: the header, KPI cards
   and toolbar already take ~260px, so a 700px box ran ~450px past the bottom of the
   screen. The page scrolled, and the table scrolled inside it — two scrollbars for one
   list, and the table's own header row and last rows never on screen together.

   This returns the height that is actually left for the box: the app's content area,
   minus everything on the page above the box and below it. Callers take the smaller of
   that and their own cap, so a large screen keeps exactly the height it had and only a
   short one gets less. Never below `min` — a table squeezed to two rows is worse than a
   page that scrolls a little.

     const [fitRef, fitPx] = useFitHeight();
     <div ref={fitRef} style={{ maxHeight: fitPx ? Math.min(cap, fitPx) : cap }}>

   Measured, not guessed: what sits above a table differs on every page (KPI cards,
   tabs, filters that open and close), so a fixed offset would be wrong on most of them.
   Re-measured on resize and whenever the page around the box changes size; the box's
   own height never enters the sum, so setting it cannot loop.

   Only a strip of what follows the box is kept on screen (`maxBelow`): the card's
   bottom edge and a pagination row — 82–99px measured across the pages, hence 104.
   A whole section underneath — the expenses totals,
   a second table — is left for the page to scroll to; counting it would squeeze the
   table to a sliver on exactly the pages that have the most to show.

   `anchor` is for a page of stacked tables (Material Tables): measured from the
   page top, the second table would get whatever is left under the first — nothing.
   With an anchor (a selector for the box's own card) the box is fitted to the screen
   together with that card instead, so each card fits whole once scrolled to. */
export function useFitHeight({ min = 280, gap = 0, maxBelow = 104, anchor = null } = {}) {
    const [el, setEl] = useState(null);
    const [fit, setFit] = useState(null);
    const measureRef = useRef(null);
    /* data-fit opts the box out of the blanket short-screen cap in globals.css
       (`.dashboard-scroll { max-height: calc(100vh - 210px) !important }`), which
       would otherwise override the measured height on any screen up to 820px tall —
       a 1366×768 laptop included. That rule is a fixed guess at what sits above a
       table; this box has the measurement. */
    const ref = useCallback((node) => {
        if (node) node.setAttribute('data-fit', '');
        setEl(node);
    }, []);

    useEffect(() => {
        if (!el || typeof window === 'undefined') return;
        const scroller = el.closest('[data-app-scroller]');
        if (!scroller) return;
        // The page itself: the scroller's child that holds the box. (Not "the last
        // child": a page can render modal roots after its content, and a box measured
        // against one of those was never re-measured when the page above it grew.)
        const pageRoot = [...scroller.children].find((c) => c.contains(el));
        const card = anchor ? el.closest(anchor) : null;

        const measure = () => {
            // Hidden (the other breakpoint's copy of the table) — nothing to fit.
            if (!el.offsetParent || !pageRoot) return;
            const s = scroller.getBoundingClientRect();
            const r = el.getBoundingClientRect();
            const frame = card ? card.getBoundingClientRect() : null;
            /* A card is read once it has been scrolled up to the fixed top bar, not to
               the top of the window — the bar covers the first 56–63px of the scroller.
               Without this a card "fitted to the screen" hung that much off the bottom. */
            const bar = card ? [...scroller.children].find((c) => getComputedStyle(c).position === 'fixed') : null;
            const inset = bar ? Math.max(0, bar.getBoundingClientRect().bottom - s.top) : 0;
            const above = frame ? r.top - frame.top + inset : r.top - s.top + scroller.scrollTop;
            const end = frame ? frame.bottom : pageRoot.getBoundingClientRect().bottom;
            const below = Math.min(maxBelow, Math.max(0, end - r.bottom));
            const next = Math.max(min, Math.floor(scroller.clientHeight - above - below - gap));
            setFit((prev) => (prev === next ? prev : next));
        };

        measure();
        measureRef.current = measure;
        const ro = new ResizeObserver(measure);
        ro.observe(scroller);
        if (pageRoot) ro.observe(pageRoot);
        if (card) ro.observe(card);
        window.addEventListener('resize', measure);
        return () => {
            measureRef.current = null;
            ro.disconnect();
            window.removeEventListener('resize', measure);
        };
    }, [el, min, gap, maxBelow, anchor]);

    /* And after every render of the table. The box can move without the page
       changing size — a toolbar row that wraps differently once the data is in, a
       banner swapped for one of another height — and nothing above would notice;
       on /expenses that left the box 10px too short. Two rect reads, and setFit
       bails out when the figure is unchanged, so it settles in one pass. */
    useEffect(() => { measureRef.current?.(); });

    return [ref, fit];
}
