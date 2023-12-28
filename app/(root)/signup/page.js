'use client'
import {useState} from 'react';
import { UserAuth } from "@contexts/useAuthContext";
import { useRouter } from "next/navigation";

export default function Signup() {

//	const { SignUp } = UserAuth();
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');

	return (


		<div className="flex flex-wrap w-full min-h-screen ">
			<div className="grid grid-cols-5 w-full">
				<div className='col-span-12 md:col-span-2 p-2 relative justify-center flex flex-col shadow-2xl bg-slate-100 '>
					<div className="text-5xl font-semibold text-center">Sign Up</div>
					<div className='text-center pt-5 sm:px-28 md:px-12 lg:px-24 px-6'>
						<label className="block mb-1 text-sm text-gray-600 text-left">Email Adress</label>
						<input className="input w-full text-[16px] shadow-lg" value={email}
							onChange={(e) => setEmail(e.target.value)} />
					</div>
					<div className='text-center pt-5 sm:px-28 md:px-12 lg:px-24 px-6'>
						<label className="block mb-1 text-sm text-gray-600 text-left">Password</label>
						<input className="input w-full shadow-lg " type='password' value={password}
							onChange={(e) => setPassword(e.target.value)} />
					</div>
					<div className='text-center pt-6 sm:px-28 md:px-12 lg:px-24 px-6'>
						<button type="submit" className='w-full text-white bg-slate-700 hover:bg-slate-500 focus:outline-none font-medium rounded-lg text-sm px-5 py-3 text-center drop-shadow-2xl'
					/*	onClick={() => SignUp(email, password)}*/>Register</button>
					</div>

				</div>
				<div className='hidden md:flex md:col-span-3 p-2 bg-LoginBG  bg-no-repeat bg-cover'>
				</div>
			</div>


		</div>

	);
}
