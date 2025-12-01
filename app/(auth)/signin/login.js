
import { UserAuth } from '@contexts/useAuthContext';
import { Dialog, Transition, DialogPanel, TransitionChild, DialogTitle } from '@headlessui/react'
import { Fragment, useState, useEffect } from 'react'
import { RiRefreshLine } from "react-icons/ri";
import { IoMdArrowDropright } from "react-icons/io";
import CheckBox from '@components/checkbox';
import { completeUserEmail } from '@actions/validations';


export default function MyLoginModal({ isOpen, setIsOpen, openModal }) {

    const { SignIn, err } = UserAuth();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [disabled, setDisabled] = useState(false)
    const [remember, setRemember] = useState(false);

    const closeModal = () => {
        setIsOpen(false)
    }

    useEffect(() => {
        const savedEmail = localStorage.getItem("email");

        if (savedEmail) {
            setEmail(savedEmail);
            setRemember(true);
        }
    }, []);
    //sbashan@ims-metals.com
    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            setDisabled(true)
            let tmpEmail = completeUserEmail(email)
            await SignIn(tmpEmail, password)

            if (remember) {
                localStorage.setItem("email", email);
            } else {
                localStorage.removeItem("email");
            }
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
                                <DialogPanel className="w-full max-w-xs transform overflow-hidden rounded-2xl
                                 bg-white p-6 text-left align-middle shadow-3xl transition-all">
                                    <DialogTitle
                                        as="h3"
                                        className="text-xl font-semibold leading-6 text-gray-900
                                        text-center flex-col"
                                    >

                                        <div>🔐</div>
                                        <p className='pt-2'>Sign in to Ims-Tech</p>
                                        <p className='pt-1 text-sm text-slate-500 font-normal'>Please sign in to continue</p>
                                    </DialogTitle>


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
                                                {!disabled && <IoMdArrowDropright />}
                                            </button>


                                            <div className='flex items-center gap-2 justify-center'>
                                                <CheckBox size='size-5' checked={remember} onChange={() => setRemember(!remember)} />
                                                <label>Remember me</label>
                                            </div>
                                        </div>

                                    </form>

                                </DialogPanel>
                            </TransitionChild>
                        </div>
                    </div>
                </Dialog>
            </Transition>
        </>
    )
}
