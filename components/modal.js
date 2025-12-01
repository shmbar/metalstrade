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
                        <div className="flex min-h-full items-center justify-center p-4 text-center top-8 md:top-0 relative">
                            <TransitionChild
                                as={Fragment}
                                enter="ease-out duration-300"
                                enterFrom="opacity-0 scale-95"
                                enterTo="opacity-100 scale-100"
                                leave="ease-in duration-200"
                                leaveFrom="opacity-100 scale-100"
                                leaveTo="opacity-0 scale-95"
                            >
                                <DialogPanel className={`w-full ${w == null ? 'max-w-7xl' : w} transform  rounded-2xl
                                 bg-white  text-left align-middle shadow-xl transition-all border border-b-2  
                                 
                                 `}>
                                    <DialogTitle
                                        as="h3"
                                        className="text-lg font-medium leading-5 text-gray-900 border-b border-slate-200  p-3 pl-6 pt-4"
                                    >
                                        <div className='flex justify-between'>
                                            <span>{title}</span>
                                            <AiOutlineCloseCircle className='scale-150 text-slate-500 cursor-pointer'
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