
'use client'

import { useState } from "react"
import MyLoginModal from "./(auth)/signin/login"
import Image from 'next/image';




const RedirecToLogin = () => {

  let [isOpen, setIsOpen] = useState(false);

  const openModal = () => {
    setIsOpen(true)
  }

  return (
    <div className="flex items-center justify-center min-h-screen
    bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-200 to-gray-800">
      <div className="w-full fixed p-1 text-white flex top-0 gap-4">
        <Image
          unoptimized
          src='/logo/gisLogo.svg'
          alt="Gis"
          width={170}
          height={170}
          className="pb-5"
        />
        <Image
          unoptimized
          src='/logo/logoNew.svg'
          alt="Ims"
          width={150}
          height={150}
        />
      </div>
      <div className="items-center text-center px-3">
        <p className="text-slate-100 text-2xl">Welcome</p>
        <div className="text-3xl font-bold text-white pt-3">Unlock the power of intelligent
          trading with <span className="text-gray-700">IMS-Tech </span></div>
        <div className="container mx-auto pt-2 text-slate-300">Create, manage, and monitor all your business transactions in one place with our intuitive platform.
          Streamline your operations, gain real-time insights,
          and stay in control of your finances effortlessly
        </div>

        <button className='mx-auto mt-6 text-white bg-slate-700 hover:bg-slate-500 focus:outline-none font-medium rounded-lg 
              text-sm px-5 w-36 py-2 text-center drop-shadow-2xl flex items-center justify-center gap-2 '
          onClick={openModal}>
          Sign In
        </button>
      </div>

      <MyLoginModal isOpen={isOpen} setIsOpen={setIsOpen} openModal={openModal} />
    </div>
  )
}


export default RedirecToLogin