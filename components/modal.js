'use client'

import { Dialog, Transition, DialogPanel, DialogTitle, TransitionChild } from '@headlessui/react';
import { Fragment } from 'react';
import { AiOutlineCloseCircle } from 'react-icons/ai';

const Modal = ({ isOpen, setIsOpen, title, children, w }) => {

    //onClose={() => {}}
    return (
        <>
            <Transition appear show={isOpen} as={Fragment}>
                <Dialog as="div" className="relative z-20" onClose={() => setIsOpen(false)} >
                    <TransitionChild
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-black bg-opacity-25" />
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
                                <DialogPanel className={`w-full ${w == null ? 'max-w-7xl' : w} transform rounded-xl
                                 bg-white text-left align-middle shadow-lg transition-all border border-[var(--selago)]

                                 `}>
                                    <DialogTitle
                                        as="h3"
                                        className="text-sm font-semibold leading-tight text-[var(--chathams-blue)] border-b border-[#b8ddf8] p-2.5 pl-3 pt-2.5 pb-2.5 rounded-t-xl"
                                        style={{ background: '#dbeeff' }}
                                    >
                                        <div className='flex justify-between items-center gap-3'>
                                            <div className='flex items-center gap-2'>
                                                <div className='w-0.5 h-4 bg-[var(--endeavour)] rounded-full'></div>
                                                <span>{title}</span>
                                            </div>
                                            <AiOutlineCloseCircle className='scale-110 text-gray-400 hover:text-[var(--endeavour)] cursor-pointer transition-colors'
                                                onClick={() => setIsOpen(false)} />
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
