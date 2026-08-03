'use client'

import { Dialog, Transition, DialogPanel, DialogTitle, TransitionChild } from '@headlessui/react';
import { Fragment } from 'react';
import { AiOutlineCloseCircle } from 'react-icons/ai';

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
                        {/* THE overlay. One value + one blur, everywhere (TOKENS.md §5.1).
                            Was `bg-black bg-opacity-25` — one of five different scrims. */}
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
                                {/* Panel: rounded-2xl (was rounded-xl — one card radius, TOKENS.md §3),
                                    border on --border-cell so it stays visible in dark mode. */}
                                <DialogPanel className={`w-full ${w == null ? 'max-w-7xl' : w} transform rounded-2xl
                                 bg-[var(--surface-card)] text-left align-middle shadow-lg transition-all border border-[var(--border-cell)]
                                 `}>
                                    {/* Header: was a rogue text-[0.85rem] (13.6px, used nowhere else).
                                        Now on the ladder via .responsiveTextTitle. */}
                                    <DialogTitle
                                        as="h3"
                                        className="responsiveTextTitle font-semibold leading-tight text-[var(--chathams-blue)] border-b border-[var(--border-divider)] px-4 py-2.5 rounded-t-2xl"
                                        style={{ background: 'var(--surface-header)' }}
                                    >
                                        <div className='flex justify-between items-center gap-3'>
                                            <div className='flex items-center gap-2'>
                                                <div className='w-0.5 h-4 bg-[var(--endeavour)] rounded-full'></div>
                                                <span>{title}</span>
                                            </div>
                                            <button
                                                type='button'
                                                aria-label='Close'
                                                onClick={() => setIsOpen(false)}
                                                className='w-6 h-6 -mr-1 flex items-center justify-center rounded-full text-[var(--regent-gray)] hover:text-[var(--endeavour)] hover:bg-[var(--selago)] transition-colors'
                                            >
                                                <AiOutlineCloseCircle className='scale-110' />
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
