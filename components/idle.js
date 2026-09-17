'use client'
import { useEffect, useState, Fragment } from 'react'
import { useIdleTimer } from 'react-idle-timer'
import { Dialog, Transition, TransitionChild, DialogPanel, DialogTitle } from '@headlessui/react'
import { UserAuth, sessionCapMs, touchLastSeen, expiredDest } from "../contexts/useAuthContext";

/* Signs an idle session out from inside the tab, with a 30-second warning first.
 *
 * The window is the session's cap from useAuthContext — 2 hours, or 24 with
 * "Remember me" — for EVERY session. Remembered sessions used to be exempt here,
 * which together with a stamp that a timer kept fresh meant an open tab never
 * expired at all (a login still there two days later, client 2026-09-16).
 * "Remember me" now means the session survives a browser close; it does not mean
 * it survives a day of nobody using it. */
const promptBeforeIdle = 30_000

export default function App() {
    // Read once: the remember flag is set at login and cannot change mid-session.
    const [timeout] = useState(() => sessionCapMs())
    const [remaining, setRemaining] = useState(timeout)
    const { SignOut } = UserAuth();

    const onIdle = () => {
        LogOut()
        closeModal(false)
    }

    const LogOut = async () => {
        await SignOut(expiredDest());
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

    // Once a second, and only while the warning is up — this used to run with no
    // delay at all, re-rendering as fast as the browser could go for the whole session.
    useEffect(() => {
        if (!isOpen) return
        const interval = setInterval(() => {
            setRemaining(Math.ceil(getRemainingTime() / 1000))
        }, 1000)
        return () => {
            clearInterval(interval)
        }
    })

    const handleStillHere = () => {
        activate()
        // The click is activity; say so to the stamp the reload/wake checks read.
        touchLastSeen()
        closeModal()
    }

    let [isOpen, setIsOpen] = useState(false)

    function closeModal() {
        setIsOpen(false)
    }

    function openModal() {
        setRemaining(Math.ceil(getRemainingTime() / 1000))
        setIsOpen(true)
    }

    return (
        <>
            <Transition appear show={isOpen} as={Fragment}>
                {/* z-modal, matching components/modal.js. At z-10 the session-timeout
                    warning sat below the header (20) and every sticky table toolbar. */}
                <Dialog as="div" className="relative z-modal" onClose={() => {}}>
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
                                <DialogPanel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-[var(--bg-card)] p-6 text-left align-middle shadow-xl transition-all">
                                    <DialogTitle
                                        as="h3"
                                        className="responsiveTextTitle font-semibold leading-tight text-[var(--chathams-blue)]"
                                    >
                                        Still there?
                                    </DialogTitle>
                                    <div className="mt-2">
                                        <p className="responsiveTextTitle text-gray-500">
                                            Nothing has happened here for a while, so you are about to be signed out to keep the account safe.
                                        </p>
                                        <br />
                                        <p className="responsiveTextTitle text-gray-500">
                                            {`Signing out in ${remaining} seconds.`}
                                        </p>
                                    </div>

                                    <div className="mt-4">
                                        <button
                                            type="button"
                                            className="inline-flex justify-center rounded-lg border border-transparent bg-blue-100 px-4 py-2 responsiveTextTitle font-medium text-blue-900 hover:bg-blue-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                                            onClick={handleStillHere}
                                        >
                                            I&#39;m still here
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
