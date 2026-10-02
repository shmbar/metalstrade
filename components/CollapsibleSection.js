'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { BtnIcon } from './buttonIcons';
import { moneyFull } from '@utils/currency';
import { UserAuth } from '@contexts/useAuthContext';

/* A page section that folds to one line — and says what is in it while folded.

   2026-10-02, the 14-inch pass. Once every page table fitted its screen, what was
   left of the scrolling was whatever sat UNDER the table: the two vendor summaries
   on Expenses and Company Expenses, the totals on Misc Invoices, the per-month
   totals on Margins, the delayed-response list on Contracts, the storage-aging
   cards on Stocks. None of it can share a 768px screen with a table that is meant
   to fill one, and none of it should be removed. So each becomes a section with a
   header line that carries its headline figures (`summary`) — the totals stay on
   screen either way, and the breakdown is one click below them.

   The default depends on the screen, and only the default:
     · a short desktop screen (the desktop layout, ≤ 900px tall — a 14-inch laptop)
       starts folded, so the page fits;
     · anything taller, and every phone, starts open — exactly as it was.
   The first time someone folds or unfolds a section their choice is kept and the
   default never speaks again. Kept for that PERSON in that WORKSPACE (IMS and GIS
   apart), per page, in this browser — localStorage only, never Firestore, so one
   person folding a summary never changes what a colleague sees.

   Controlled on purpose: the page owns `open` (via useSectionOpen) because the
   table above needs it too — a folded section is short enough to keep on screen,
   so the table reserves room for it (see `fitBelow` on the page tables). */

const KEY = (uid, workspace, path, name) => `ims.section.v2.${uid}.${workspace}.${path || 'unknown'}.${name}`;
const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/** The desktop layout on a screen too short for a table and its summaries. */
export const isShortDesktop = () =>
    typeof window !== 'undefined' && window.innerWidth >= 768 && window.innerHeight <= 900;

/** How much room a page table leaves under itself for a FOLDED section's one line
    (pager + the line + the card's padding measured 125–140px; see useFitHeight). */
export const FIT_BELOW_FOLDED = 184;

export function useSectionOpen(name) {
    const pathname = usePathname();
    const { user, uidCollection } = UserAuth() || {};
    // No key until the person and workspace are known: until then the screen's
    // default applies, and nothing is read or written under a half-built key.
    const key = user?.uid && uidCollection ? KEY(user.uid, uidCollection, pathname, name) : null;
    // Open until the screen is known: the server and the first client render agree,
    // and the layout effect below settles it before anything is painted.
    const [open, setOpen] = useState(true);
    const openRef = useRef(open);
    openRef.current = open;

    useIsoLayoutEffect(() => {
        let stored;
        try {
            const raw = key ? window.localStorage.getItem(key) : null;
            if (raw !== null) stored = JSON.parse(raw);
        } catch { /* blocked storage: fall back to the screen's default */ }
        const next = typeof stored === 'boolean' ? stored : !isShortDesktop();
        openRef.current = next;
        setOpen(next);
    }, [key]);

    const toggle = useCallback(() => {
        const next = !openRef.current;
        openRef.current = next;
        try { if (key) window.localStorage.setItem(key, JSON.stringify(next)); } catch { /* a convenience, not data */ }
        setOpen(next);
    }, [key]);

    return [open, toggle];
}

/**
 * @param open      from useSectionOpen
 * @param onToggle  from useSectionOpen
 * @param title     what the section is — "Summary", "Totals by month"
 * @param summary   the headline figures, shown in the header whether open or folded
 * @param bare      no frame while open: the children already draw their own cards
 * @param headerOnly  draw the header line alone — the caller shows and hides the body
 *                    itself (`aria-controls` then points at the caller's element, `id-body`)
 */
export default function CollapsibleSection({ id, open, onToggle, title, summary, children, bare = true, headerOnly = false, className = '' }) {
    const bodyId = `${id}-body`;
    const framed = !open || !bare;
    return (
        <section className={className}>
            <button
                type="button"
                onClick={onToggle}
                aria-expanded={open}
                aria-controls={bodyId}
                className={`w-full flex flex-wrap items-center gap-x-3 gap-y-0.5 px-3 text-left rounded-2xl transition-colors hover:bg-[var(--bg-subtle)] ${
                    framed ? 'min-h-9 border border-[var(--line)] bg-[var(--bg-card)]' : 'min-h-8 border border-transparent'
                }`}
            >
                <BtnIcon action="section" className={`shrink-0 text-[var(--ink-muted)] transition-transform ${open ? '' : '-rotate-90'}`} />
                <span className="responsiveText font-semibold text-[var(--ink)]">{title}</span>
                {summary && (
                    <span className="flex flex-wrap items-center gap-x-4 gap-y-0.5 responsiveTextTable text-[var(--ink-secondary)] tabular-nums min-w-0">
                        {summary}
                    </span>
                )}
                <span className="ml-auto responsiveTextTable text-[var(--ink-muted)] whitespace-nowrap">{open ? 'Hide' : 'Show'}</span>
            </button>
            {open && !headerOnly && <div id={bodyId} className="pt-2">{children}</div>}
        </section>
    );
}

/** One "label value" pair for a section header — the label quiet, the figure in ink. */
export const SectionFigure = ({ label, children }) => (
    <span className="inline-flex items-baseline gap-1.5 whitespace-nowrap">
        <span className="text-[var(--ink-muted)]">{label}</span>
        <span className="font-medium text-[var(--ink)]">{children}</span>
    </span>
);

/** The "Total $ / Total €" a summary card prints at its foot, as one header figure.
    `rows` are the card's own rows — { cur: 'us' | 'eu', amount } — so the header and
    the card under it cannot disagree. `field` names the figure when a page calls it
    something else (Misc Invoices: `total`). */
export const CurrencyTotals = ({ label, rows, field = 'amount' }) => {
    const sum = (cur) => (rows || []).filter((i) => i.cur === cur).reduce((s, i) => s + (Number(i[field]) || 0), 0);
    return <SectionFigure label={label}>{moneyFull('us', sum('us'))} · {moneyFull('eu', sum('eu'))}</SectionFigure>;
};
