'use client'

import { Dialog, Transition, DialogPanel, DialogTitle, TransitionChild } from '@headlessui/react';
import { Fragment } from 'react';
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

const Modal = ({ isOpen, setIsOpen, title, subtitle, children, size = 'md', w }) => {

    /* `w` is the old escape hatch — a raw max-w-* class — and still wins where a call site
       passes one, so nothing breaks mid-migration. `size` is the scale to move onto. */
    const width = w || SIZES[size] || SIZES.md;

    return (
        <>
            <Transition appear show={isOpen} as={Fragment}>
                <Dialog as="div" className="relative z-modal" onClose={() => setIsOpen(false)} >
                    <TransitionChild
                        as={Fragment}
                        enter="ease-out duration-200"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-150"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-[var(--overlay)] backdrop-blur-[2px]" />
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
                                <DialogPanel className={`w-full ${width} max-h-[88vh] flex flex-col text-left
                                 transform rounded-2xl bg-[var(--bg-card)] transition-all border border-[var(--line)]`}
                                    style={{ boxShadow: 'var(--shadow-md)' }}>
                                    <DialogTitle
                                        as="div"
                                        className="shrink-0 flex justify-between items-start gap-3 border-b border-[var(--line)] px-4 py-2.5 rounded-t-2xl bg-[var(--bg-card)]"
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
