'use client'
import Sidebar from '@components/Laoyout/SideBar';
import SideBarMini from '@components/Laoyout/SideBarMini';
import Spinner from '@components/spinner';
import { UserAuth } from "@contexts/useAuthContext";
import BackToLoginPage from '@components/backToLoginPage';
import Idle from '@components/idle.js'
export default function MyLayout({
	children, // will be a page or nested layout
}) {

	const { user, loadingPage } = UserAuth();

	return (
		<main className="md:flex">
			<Idle />
			{loadingPage ? <Spinner /> :
				user ? <>
					<>
						<div className='hidden md:flex drop-shadow-xl z-10'>
							<Sidebar />
						</div>
						<div className='md:hidden flex drop-shadow-xl z-10 top-0 bottom-4 fixed w-full h-0'>
							<SideBarMini />
						</div>
					</>
					<div className="grow md:overflow-auto h-screen pt-10 md:pt-0 relative">{children}</div></>
					:
					<BackToLoginPage />
			}
		</main>
	);
}