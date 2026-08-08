'use client'

import { Dialog, Transition, DialogPanel, DialogTitle, TransitionChild } from '@headlessui/react';
import { Fragment } from 'react';
import { X } from 'lucide-react';

const Modal = ({ isOpen, setIsOpen, title, children, w }) => {

    //onClose={() => {}}
    return (
        <>
            <Transition appear show={isOpen} as={Fragment}>
                <Dialog as="div" className="relative z-modal" onClose={() => setIsOpen(false)} >
                    <TransitionChild
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-[var(--overlay)] backdrop-blur-[2px]" />
                    </TransitionChild>

                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-start justify-center p-4 text-center pt-[72px]">
                            <TransitionChild
                                as={Fragment}
                                enter="ease-out duration-300"
                                enterFrom="opacity-0 scale-95"
                                enterTo="opacity-100 scale-100"
                                leave="ease-in duration-200"
                                leaveFrom="opacity-100 scale-100"
                                leaveTo="opacity-0 scale-95"
                            >
                                <DialogPanel className={`w-full ${w == null ? 'max-w-7xl' : w} transform rounded-2xl
                                 bg-[var(--bg-card)] text-left align-middle transition-all border border-[var(--line)]`}
                                    style={{ boxShadow: 'var(--shadow-md)' }}>
                                    <DialogTitle
                                        as="h3"
                                        className="responsiveTextPage font-semibold leading-tight text-[var(--ink)] border-b border-[var(--line)] px-4 py-3 rounded-t-2xl bg-[var(--bg-card)] font-display"
                                    >
                                        <div className='flex justify-between items-center gap-3'>
                                            <span>{title}</span>
                                            <button
                                                type="button"
                                                aria-label="Close"
                                                className='w-7 h-7 flex items-center justify-center rounded-lg text-[var(--ink-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--ink)] cursor-pointer transition-colors'
                                                onClick={() => setIsOpen(false)}
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>

                                    </DialogTitle >
                                    {children}
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
