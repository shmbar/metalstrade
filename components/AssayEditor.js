'use client';

/* A lot's chemistry, edited where the lot is.

   One flask per Materials Breakdown row instead of another column in a grid that is
   already ~1,200px wide. The analysis is kept exactly as typed — or as the document
   reader found it — and read back underneath, so a figure that did not parse is seen
   here, before saving, not discovered later in the Stocks chemistry popup.

   It floats out of the row for the same reason the date picker does
   (components/FloatingDatepicker.js): the rows sit inside two scroll boxes that would
   clip an in-place popup. And it uses Headless UI's Portal rather than react-dom's, so
   inside the breakdown's <Dialog> it counts as part of the dialog — typing in it is not
   an outside click, and the focus trap lets the textarea keep the caret. */

import { useEffect, useRef, useState } from 'react';
import { Portal } from '@headlessui/react';
import { BtnIcon } from '@components/buttonIcons';
import { formatAssay, hasAssay, parseAssay } from '@utils/grades';

const POP_W = 320;
const POP_H = 170;

function popPos(el, keepFlip) {
    const r = el.getBoundingClientRect();
    const left = Math.max(8, Math.min(r.left - 8, window.innerWidth - POP_W - 8));
    const roomBelow = window.innerHeight - r.bottom - 8;
    const flip = keepFlip ?? (roomBelow < POP_H && r.top - 8 > roomBelow);
    return flip
        ? { left, bottom: window.innerHeight - r.top + 4, flip }
        : { left, top: r.bottom + 4, flip };
}

export default function AssayEditor({ value = '', onChange, disabled = false }) {
    const anchorRef = useRef(null);
    const popRef = useRef(null);
    const areaRef = useRef(null);
    const [open, setOpen] = useState(false);
    const [pos, setPos] = useState(null);

    const text = String(value ?? '');
    const parsed = parseAssay(text);
    const filled = text.trim() !== '';

    const openAt = () => {
        if (disabled || !anchorRef.current) return;
        setPos(popPos(anchorRef.current));
        setOpen(true);
    };

    useEffect(() => {
        if (!open) return;
        const t = setTimeout(() => areaRef.current?.focus(), 0);
        return () => clearTimeout(t);
    }, [open]);

    // Follow the row while the breakdown scrolls; close once it is out of sight.
    useEffect(() => {
        if (!open) return;
        const sync = () => {
            const el = anchorRef.current;
            if (!el || !el.isConnected) { setOpen(false); return; }
            const r = el.getBoundingClientRect();
            if (r.bottom < 0 || r.top > window.innerHeight) { setOpen(false); return; }
            setPos(p => popPos(el, p?.flip));
        };
        window.addEventListener('scroll', sync, true);
        window.addEventListener('resize', sync);
        return () => {
            window.removeEventListener('scroll', sync, true);
            window.removeEventListener('resize', sync);
        };
    }, [open]);

    useEffect(() => {
        if (!open) return;
        const onDown = (e) => {
            if (popRef.current?.contains(e.target)) return;
            if (anchorRef.current?.contains(e.target)) return;   // the flask toggles itself
            setOpen(false);
        };
        // Escape closes the editor, not the breakdown around it.
        const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); } };
        document.addEventListener('mousedown', onDown);
        document.addEventListener('keydown', onKey, true);
        return () => {
            document.removeEventListener('mousedown', onDown);
            document.removeEventListener('keydown', onKey, true);
        };
    }, [open]);

    return (
        <>
            <button ref={anchorRef} type="button" disabled={disabled}
                aria-label={filled ? 'Edit lot analysis' : 'Add lot analysis'}
                title={filled ? `Analysis: ${formatAssay(parsed) || text}` : 'Add this lot’s analysis'}
                onClick={() => (open ? setOpen(false) : openAt())}
                className={`inline-flex items-center justify-center shrink-0 w-5 h-5 rounded-control transition-opacity disabled:opacity-30
                    ${filled ? 'text-[var(--brand)]' : 'text-[var(--ink-muted)] opacity-60 hover:opacity-100'}`}>
                <BtnIcon action="assay" />
            </button>

            {open && pos && (
                <Portal>
                    <div ref={popRef}
                        style={{
                            position: 'fixed', left: pos.left, width: POP_W, zIndex: 'var(--z-popover)',
                            ...(pos.flip ? { bottom: pos.bottom } : { top: pos.top }),
                        }}
                        className="rounded-2xl border border-[var(--line)] bg-[var(--bg-card)] p-3 shadow-pop">
                        <p className="responsiveTextTable font-medium text-[var(--ink-muted)] mb-1">Analysis — this lot</p>
                        <textarea ref={areaRef} rows={3} value={text}
                            onChange={e => onChange?.(e.target.value)}
                            placeholder="e.g. 51.2Ni 18.9Cr 3Mo 5Nb 4.1Sn — or paste the certificate line"
                            className="w-full px-2 py-1.5 rounded-control border border-[var(--line-strong)] bg-[var(--bg-card)] text-[var(--ink)] responsiveTextInput outline-none focus:border-[var(--brand)] resize-y"
                            style={{ fontFamily: 'inherit' }} />
                        <p className="responsiveTextTable mt-1.5 text-[var(--ink-muted)]">
                            {hasAssay(parsed)
                                ? <>Reads as <span className="tnum text-[var(--ink)]">{formatAssay(parsed)}</span></>
                                : filled ? 'No elements recognised yet' : 'Saved with the breakdown'}
                        </p>
                    </div>
                </Portal>
            )}
        </>
    );
}
