import { useContext } from 'react';
import { SettingsContext } from "@contexts/useSettingsContext";
import { Dialog, DialogPanel, Transition, TransitionChild, DialogTitle } from '@headlessui/react'
import { Fragment, useEffect, useState } from 'react'

import { getTtl } from '@utils/languages';

const MyModal = ({ isDeleteOpen, setIsDeleteOpen, ttl, txt, doAction }) => {

  let [isOpen, setIsOpen] = useState(false)
  const { compData } = useContext(SettingsContext);
  const ln = compData.lng

  useEffect(() => {
    setIsOpen(isDeleteOpen)
  }, [isDeleteOpen])


  function closeModal() {
    setIsOpen(false)
    setIsDeleteOpen(false)
  }

  const confirmDel = () => {
    closeModal()
    doAction()
  }
  return (
    <>
      <Transition appear show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-30" onClose={closeModal} >
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
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <TransitionChild
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <DialogPanel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <DialogTitle
                    as="h3"
                    className="text-lg font-medium leading-6 text-gray-900"
                  >
                    {ttl}
                  </DialogTitle>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      {txt}
                    </p>
                  </div>

                  <div className="mt-4 gap-4 flex">
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md border border-transparent bg-slate-700 px-3 py-1 text-sm font-medium text-white hover:bg-slate-400 focus:outline-none"
                      onClick={confirmDel}
                    >
                      {getTtl('Confirm', ln)} 
                    </button>
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md border border-slate-700 bg-white px-3 py-1 text-sm font-medium text-slate-700 hover:bg-slate-50"
                      onClick={closeModal}
                    >
                        {getTtl('Cancel', ln)} 
                    </button>
                  </div>
                </DialogPanel>
              </TransitionChild>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  )
}

export default MyModal; 
