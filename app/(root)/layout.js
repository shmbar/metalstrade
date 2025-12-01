'use client'
import Sidebar from '@app/(root)/_components/SideBar';
import SideBarMini from '@app/(root)/_components/SideBarMini';
import Spinner from '@components/spinner';
import { UserAuth } from "@contexts/useAuthContext";
import BackToLoginPage from '@components/backToLoginPage';
import Idle from '@components/idle.js'
import { MainNav } from './_components/MainNav';
import { usePathname } from 'next/navigation'

export default function MyLayout({
	children, // will be a page or nested layout
}) {

	const { user, loadingPage, userTitle } = UserAuth();
	const pathname = usePathname()

	if (userTitle === 'accounting' && pathname !== '/accounting') return;

	return (
		<main className="md:flex ">
			<Idle />
			{loadingPage ? <Spinner /> :
				(user) && <>
					<>
						<div className='hidden md:flex  drop-shadow-xl z-10 mx-auto'>
							<Sidebar />
						</div>
						<div className='md:hidden flex drop-shadow-xl z-30 top-0 bottom-4 fixed w-full h-0'>
							<SideBarMini />
						</div>
					</>

					<div className="grow md:overflow-auto h-screen relative">
						<MainNav />
						{children}
					</div>

				</>

			}
		</main>
	);
}