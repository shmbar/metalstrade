'use client'

import { Dialog, Transition, DialogPanel, DialogTitle, TransitionChild } from '@headlessui/react';
import { Fragment, useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

/* A dialog should be as wide as its densest row needs and no wider. Everything used to
   land on the old `max-w-7xl` default — 1280px of stretched form, which reads as a page
   rather than a dialog. These four steps are the whole vocabulary now. */
const SIZES = {
    sm: 'max-w-[480px]',   // one column: confirmations, single-record edits, pickers
    md: 'max-w-[640px]',   // two columns of fields
    lg: 'max-w-[840px]',   // two-to-three columns, small tables
    xl: 'max-w-[1040px]',  // the full contract / invoice forms and their product tables
};

// However far a draggable dialog is moved, this much of it stays on screen to grab again.
const KEEP_VISIBLE = 120;
const TITLE_BAR = 48;
const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);

const Modal = ({ isOpen, setIsOpen, title, subtitle, children, size = 'md', w, draggable = false }) => {

    /* `w` is the old escape hatch — a raw max-w-* class — and still wins where a call site
       passes one, so nothing breaks mid-migration. `size` is the scale to move onto. */
    const width = w || SIZES[size] || SIZES.md;

    /* `draggable`: the title bar moves the dialog, so it can be pulled aside to read the
       record underneath (the Materials Breakdown covers the contract it is filled from).
       Double-clicking the title bar puts it back; every open starts centred. The offset
       is the CSS `translate` property, which composes with the transition's scale
       transform instead of replacing it. */
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [dragging, setDragging] = useState(false);
    const drag = useRef(null);
    useEffect(() => { if (isOpen) setOffset({ x: 0, y: 0 }); }, [isOpen]);

    const notAGrab = (e) => !draggable || !!e.target.closest('button, a, input, select, textarea');
    const dragStart = (e) => {
        if (e.button !== 0 || notAGrab(e)) return;
        drag.current = { sx: e.clientX, sy: e.clientY, from: offset, r: e.currentTarget.parentElement.getBoundingClientRect() };
        e.currentTarget.setPointerCapture(e.pointerId);
        setDragging(true);
        e.preventDefault();
    };
    const dragMove = (e) => {
        const d = drag.current;
        if (!d) return;
        const dx = clamp(e.clientX - d.sx, KEEP_VISIBLE - d.r.right, window.innerWidth - KEEP_VISIBLE - d.r.left);
        const dy = clamp(e.clientY - d.sy, -d.r.top, window.innerHeight - TITLE_BAR - d.r.top);
        setOffset({ x: d.from.x + dx, y: d.from.y + dy });
    };
    const dragEnd = () => { drag.current = null; setDragging(false); };

    /* A dialog moved aside invites a click on what it uncovered — which would close it and
       throw away unsaved rows. So a draggable dialog closes from × and Escape only. */
    const panelRef = useRef(null);
    const pressedOutside = useRef(false);
    useEffect(() => {
        if (!draggable || !isOpen) return;
        const down = (e) => { pressedOutside.current = !panelRef.current?.contains(e.target); };
        const key = () => { pressedOutside.current = false; };
        document.addEventListener('pointerdown', down, true);
        document.addEventListener('keydown', key, true);
        return () => {
            document.removeEventListener('pointerdown', down, true);
            document.removeEventListener('keydown', key, true);
        };
    }, [draggable, isOpen]);
    const onClose = () => { if (!(draggable && pressedOutside.current)) setIsOpen(false); };

    return (
        <>
            <Transition appear show={isOpen} as={Fragment}>
                <Dialog as="div" className="relative z-modal" onClose={onClose} >
                    <TransitionChild
                        as={Fragment}
                        enter="ease-out duration-200"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-150"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        {/* No blur behind a draggable dialog: it is moved precisely to read what is under it. */}
                        <div className={`fixed inset-0 bg-[var(--overlay)]${draggable ? '' : ' backdrop-blur-[2px]'}`} />
                    </TransitionChild>

                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center p-4 text-center">
                            <TransitionChild
                                as={Fragment}
                                enter="ease-out duration-200"
                                enterFrom="opacity-0 scale-[0.98]"
                                enterTo="opacity-100 scale-100"
                                leave="ease-in duration-150"
                                leaveFrom="opacity-100 scale-100"
                                leaveTo="opacity-0 scale-[0.98]"
                            >
                                {/* Capped height with the body scrolling inside, so the title and the
                                    actions stay put instead of scrolling off the top of the screen. */}
                                <DialogPanel ref={panelRef} className={`w-full ${width} max-h-[88vh] flex flex-col text-left
                                 transform rounded-2xl bg-[var(--bg-card)] transition-all border border-[var(--line)]`}
                                    style={{
                                        boxShadow: 'var(--shadow-md)',
                                        ...(draggable ? { translate: `${offset.x}px ${offset.y}px` } : {}),
                                        ...(dragging ? { transition: 'none' } : {}),
                                    }}>
                                    <DialogTitle
                                        as="div"
                                        className={`shrink-0 flex justify-between items-start gap-3 border-b border-[var(--line)] px-4 py-2.5 rounded-t-2xl bg-[var(--bg-card)]${draggable ? ' cursor-move select-none touch-none' : ''}`}
                                        {...(draggable ? {
                                            onPointerDown: dragStart,
                                            onPointerMove: dragMove,
                                            onPointerUp: dragEnd,
                                            onPointerCancel: dragEnd,
                                            onDoubleClick: (e) => { if (!notAGrab(e)) setOffset({ x: 0, y: 0 }); },
                                        } : {})}
                                    >
                                        <div className="min-w-0">
                                            <h3 className="responsiveTextPage font-semibold leading-tight text-[var(--ink)] font-display truncate">{title}</h3>
                                            {subtitle && (
                                                <p className="responsiveText text-[var(--ink-muted)] leading-tight mt-0.5 truncate">{subtitle}</p>
                                            )}
                                        </div>
                                        <button
                                            type="button"
                                            aria-label="Close"
                                            className='shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-[var(--ink-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--ink)] cursor-pointer transition-colors'
                                            onClick={() => setIsOpen(false)}
                                        >
                                            <X size={16} />
                                        </button>
                                    </DialogTitle >

                                    {/* Forms pin their own action row with sticky bottom-0 against this
                                        scroll box. A shell-level footer cannot serve the contract modal,
                                        whose five tabs each carry actions bound to that tab's own state. */}
                                    <div className="flex-1 min-h-0 overflow-y-auto">
                                        {children}
                                    </div>
                                </DialogPanel>
                            </TransitionChild>
                        </div>
                    </div>
                </Dialog>
            </Transition>
        </>
    );
};

export default Modal;
