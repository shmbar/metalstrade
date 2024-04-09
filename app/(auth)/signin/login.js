import { UserAuth } from '@contexts/useAuthContext';
import { Dialog, Transition } from '@headlessui/react'
import { Fragment, useState } from 'react'
import { RiRefreshLine } from "react-icons/ri";
import { IoMdArrowDropright } from "react-icons/io";

export default function MyLoginModal({ isOpen, setIsOpen, openModal }) {

    const { SignIn, err } = UserAuth();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [disabled, setDisabled] = useState(false)


    const closeModal = () => {
        setIsOpen(false)
    }


    const handleSubmit = async (e) => {
		e.preventDefault();

		try {
			setDisabled(true)
			await SignIn(email, password)
		}
		catch (err) {
			console.log(err)
		}
		finally {
			//setDisabled(false)
		} 
		//	

	};

    return (
        <>
            <Transition appear show={isOpen} as={Fragment}>
                <Dialog as="div" className="relative z-10" onClose={closeModal}>
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-black/25" />
                    </Transition.Child>

                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center p-4 text-center">
                            <Transition.Child
                                as={Fragment}
                                enter="ease-out duration-300"
                                enterFrom="opacity-0 scale-95"
                                enterTo="opacity-100 scale-100"
                                leave="ease-in duration-200"
                                leaveFrom="opacity-100 scale-100"
                                leaveTo="opacity-0 scale-95"
                            >
                                <Dialog.Panel className="w-full max-w-xs transform overflow-hidden rounded-2xl
                                 bg-white p-6 text-left align-middle shadow-3xl transition-all">
                                    <Dialog.Title
                                        as="h3"
                                        className="text-xl font-semibold leading-6 text-gray-900
                                        text-center flex-col"
                                    >
                                        
                                        <div>🔐</div>
                                        <p className='pt-2'>Sign in to Ims-Tech</p>
                                        <p className='pt-1 text-sm text-slate-500 font-normal'>Please sign in to continue</p>
                                    </Dialog.Title>


                                    <form onSubmit={handleSubmit}>
                                        <div className='text-center pt-5 px-6'>
                                            <label className="block mb-1 text-sm text-gray-600 text-left" >Email Adress</label>
                                            <input className="input w-full text-[16px] shadow-lg bg-slate-100 text-xs" value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                            />
                                        </div>
                                        <div className='text-center pt-5 px-6'>
                                            <label className="block mb-1 text-sm text-gray-600 text-left">Password</label>
                                            <input className="input w-full shadow-lg bg-slate-100 text-xs" type='password' value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                            />
                                        </div>

                                        <div className='text-center pt-6 px-6'>
                                            {err ? <span className='text-sm text-red-500 font-medium uppercase'>{err.slice(22, err.length - 2)}</span> : ''}
                                           
                                           
                                            <button disabled={disabled && !err} type="submit"
                                             className='w-full text-white bg-slate-700 hover:bg-slate-500 focus:outline-none font-medium rounded-lg 
							text-sm px-5 py-3 text-center drop-shadow-2xl flex items-center justify-center gap-2 mb-2'
                                            >{(disabled && !err) ? 'Connecting' : 'Continue'}
                                                {(disabled && !err) && <div className='animate-spin'>
                                                    < RiRefreshLine className='scale-125' />
                                                </div>}
                                                {!disabled && <IoMdArrowDropright/>}
                                            </button>

                                        </div>
                                    </form>

                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>
        </>
    )
}
