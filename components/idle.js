'use client'
import { useEffect, useState, Fragment } from 'react'
import { useIdleTimer } from 'react-idle-timer'
import { Dialog, Transition, TransitionChild, DialogPanel, DialogTitle } from '@headlessui/react'
import { UserAuth } from "@contexts/useAuthContext";
import { useRouter } from "next/navigation";

const timeout = 10800_000 //3 hours
const promptBeforeIdle = 30_000

export default function App() {

    const [remaining, setRemaining] = useState(timeout)
    const router = useRouter()
    const { SignOut } = UserAuth();
  
    const onIdle = () => {
        LogOut()
        closeModal(false)
    }

    const LogOut = async () => {
        router.push("/");
        await SignOut();
    }

    const onActive = () => {
        closeModal()
    }

    const onPrompt = () => {
        openModal()
    }

    const { getRemainingTime, activate } = useIdleTimer({
        onIdle,
        onActive,
        onPrompt,
        timeout,
        promptBeforeIdle,
        throttle: 500
    })

    useEffect(() => {
        const interval = setInterval(() => {
            setRemaining(Math.ceil(getRemainingTime() / 1000))
        })

        return () => {
            clearInterval(interval)
        }
    })

    const handleStillHere = () => {
        activate()
        closeModal()
    }


    const timeTillPrompt = Math.max(remaining - promptBeforeIdle / 1000, 0)
 
    let [isOpen, setIsOpen] = useState(false)

    function closeModal() {
        setIsOpen(false)
    }

    function openModal() {
        setIsOpen(true)
    }

    return (
        <>
            <Transition appear show={isOpen} as={Fragment}>
                <Dialog as="div" className="relative z-10" onClose={() => {}}>
                    <TransitionChild
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-black/25" />
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
                                        No-Activity Notification
                                    </DialogTitle>
                                    <div className="mt-2">
                                        <p className="text-sm text-gray-500">
                                            It looks like you&#39;ve been inactive for a while.
                                            To ensure the activity, please press the button below.
                                        </p>
                                        <br />
                                        <p className="text-sm text-gray-500">
                                            {`You will be loged out in ${remaining} seconds`}
                                        </p>
                                    </div>

                                    <div className="mt-4">
                                        <button
                                            type="button"
                                            className="inline-flex justify-center rounded-md border border-transparent bg-blue-100 px-4 py-2 text-sm font-medium text-blue-900 hover:bg-blue-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                                            onClick={handleStillHere}
                                        >
                                            Still here...
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
