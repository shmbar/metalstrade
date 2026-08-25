'use client';

/* A date picker whose calendar cannot be clipped.

   react-tailwindcss-datepicker v1.6.6 draws its calendar as an `absolute` child of
   the input's own wrapper, so every scroll box between that wrapper and the page
   cuts it off. Materials Breakdown has two of them: the row grid sits in an
   `overflow-x-auto` box — and per CSS Overflow 3 a box with one axis set to `auto`
   cannot keep the other `visible`, so that box clips vertically as well — inside the
   modal's own `overflow-y-auto` body. The calendar was sliced off at the last row and
   you had to scroll the modal to reach the month it had opened on.

   Margins solves the same problem from the other end, by dropping the scroll
   container's clip for as long as a picker is open (`.margins-table-scroll:has(...)`
   in globals.css). That works for a table that scrolls sideways. It cannot work here:
   dropping the clip on a scrolled modal body throws the whole dialog back to the top.

   So the input stays in the cell and the calendar moves out. A second, headless
   instance of the library renders in a portal at coordinates measured from the cell,
   where nothing above it in the tree can clip it. The portal is Headless UI's rather
   than react-dom's, so a picker used inside a <Dialog> counts as part of that dialog:
   picking a date is not an outside click, and the focus trap lets the calendar keep
   focus. Shipments does this by hand in its own page and could move onto this. */

import { useEffect, useRef, useState } from 'react';
import { Portal } from '@headlessui/react';
import Datepicker from 'react-tailwindcss-datepicker';
import dayjs from 'dayjs';
import { CalendarDays, X } from 'lucide-react';

const PICKER_W = 320;    // the library's popover, measured
const PICKER_H = 360;
const PICKER_ARROW = 27; // its arrow sits ~27px in from the popover's left edge

const EMPTY = { startDate: null, endDate: null };

/* Anchored to the cell on BOTH axes: when there is no room below, the calendar opens
   ABOVE the cell rather than being clamped to some fixed offset, which would park it
   mid-table over unrelated rows. Which side it opens on is decided once, at open, and
   then carried through scrolling (keepFlip) — a calendar that hops from under the row
   to over it while you scroll is worse than one that runs a little off-screen. */
function pickerPos(el, keepFlip) {
    const r = el.getBoundingClientRect();
    // Shift left so the arrow, not the popover centre, points at the cell centre.
    const desired = r.left + r.width / 2 - PICKER_ARROW;
    const left = Math.max(8, Math.min(desired, window.innerWidth - PICKER_W - 8));

    const roomBelow = window.innerHeight - r.bottom - 8;
    const roomAbove = r.top - 8;
    const flip = keepFlip ?? (roomBelow < PICKER_H && roomAbove > roomBelow);

    /* The popover places itself relative to this wrapper, so the wrapper goes on the
       cell edge the popover grows AWAY from: `down` hangs below it, `up` pins its
       bottom edge to the wrapper top. The library's own margin supplies the gap. */
    return { top: flip ? r.top - 2 : r.bottom + 2, left, flip };
}

const FloatingDatepicker = ({
    value,
    onChange,
    displayFormat = 'DD-MMM-YYYY',
    inputClassName = 'input w-full h-8',
    placeholder,
    disabled = false,
    minDate = null,
    maxDate = null,
}) => {
    const anchorRef = useRef(null);
    const popRef = useRef(null);
    const [open, setOpen] = useState(false);
    const [pos, setPos] = useState({ top: 0, left: 0, flip: false });

    const raw = value?.startDate ?? null;
    const parsed = raw ? dayjs(raw) : null;
    const text = parsed && parsed.isValid() ? parsed.format(displayFormat) : '';

    const openAt = () => {
        if (disabled || !anchorRef.current) return;
        setPos(pickerPos(anchorRef.current));
        setOpen(true);
    };

    /* The library opens its popover when its input takes focus, and the portal mounts
       a fresh — therefore closed — instance each time, so focus it once it is there. */
    useEffect(() => {
        if (!open) return;
        const t = setTimeout(() => popRef.current?.querySelector('input')?.focus(), 0);
        return () => clearTimeout(t);
    }, [open]);

    /* The coordinates are measured once, at open, so anything scrolling underneath
       would leave the calendar hanging over a different row. Re-measure instead, and
       close once the cell it belongs to has scrolled out of sight. Capture phase:
       scroll does not bubble, and here the rows scroll inside their own box. */
    useEffect(() => {
        if (!open) return;
        const sync = () => {
            const el = anchorRef.current;
            if (!el || !el.isConnected) { setOpen(false); return; }
            const r = el.getBoundingClientRect();
            if (r.bottom < 0 || r.top > window.innerHeight) { setOpen(false); return; }
            setPos(p => pickerPos(el, p.flip));
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
            if (anchorRef.current?.contains(e.target)) return; // the trigger toggles itself
            setOpen(false);
        };
        // Escape closes the calendar, not the dialog around it.
        const onKey = (e) => {
            if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); }
        };
        document.addEventListener('mousedown', onDown);
        document.addEventListener('keydown', onKey, true);
        return () => {
            document.removeEventListener('mousedown', onDown);
            document.removeEventListener('keydown', onKey, true);
        };
    }, [open]);

    return (
        <>
            <div ref={anchorRef} className='relative w-full'>
                <input
                    type='text'
                    readOnly
                    disabled={disabled}
                    value={text}
                    placeholder={placeholder ?? displayFormat}
                    className={inputClassName}
                    style={{ cursor: disabled ? 'not-allowed' : 'pointer', paddingRight: '1.5rem' }}
                    onClick={() => (open ? setOpen(false) : openAt())}
                    onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
                            e.preventDefault();
                            openAt();
                        }
                    }}
                />
                {/* The same affordance the library puts there: a calendar while the cell
                    is empty, a clear once it holds a date. */}
                <button
                    type='button'
                    tabIndex={-1}
                    disabled={disabled}
                    aria-label={text ? 'Clear date' : 'Open calendar'}
                    className='absolute right-0 top-0 h-full px-1.5 flex items-center text-[var(--ink-muted)]
                               hover:text-[var(--ink)] disabled:opacity-40 transition-colors'
                    onClick={() => {
                        if (text) { onChange(EMPTY); setOpen(false); }
                        else openAt();
                    }}
                >
                    {text ? <X className='w-3.5 h-3.5' /> : <CalendarDays className='w-3.5 h-3.5' />}
                </button>
            </div>

            {open && (
                <Portal>
                    <div ref={popRef}
                        style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 'var(--z-popover)' }}>
                        <Datepicker
                            asSingle={true}
                            useRange={false}
                            value={value ?? EMPTY}
                            onChange={v => { onChange(v); setOpen(false); }}
                            displayFormat={displayFormat}
                            popoverDirection={pos.flip ? 'up' : 'down'}
                            minDate={minDate}
                            maxDate={maxDate}
                            /* This instance is here for its calendar only: its input is
                               the handle the library opens on, kept at zero size, and its
                               toggle button would otherwise float loose in the portal. */
                            inputClassName='absolute w-0 h-0 p-0 m-0 border-0 opacity-0 overflow-hidden'
                            toggleClassName='hidden'
                        />
                    </div>
                </Portal>
            )}
        </>
    );
};

export default FloatingDatepicker;
