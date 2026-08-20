'use client'
import Sidebar from '../(root)/_components/SideBar';
import SideBarMini from '../(root)/_components/SideBarMini';
import Spinner from '../../components/spinner';
import { UserAuth } from "../../contexts/useAuthContext";
import Idle from '../../components/idle.js'
import { MainNav } from './_components/MainNav';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { pageKeyFromPath } from '../../utils/permissions';
import { Analytics } from "@vercel/analytics/next"
import FloatingChat from '../../components/FloatingChat';
import GlobalSearchLoader from '../../utils/globalSearch/GlobalSearchLoader'
import CommandPalette from '../../components/CommandPalette';
import { NotificationPopupsHost } from '../../contexts/useNotificationContext';


export default function MyLayout({
	children, // will be a page or nested layout
}) {

	const auth = UserAuth() || {};
	const { user, loadingPage, can, landingPage } = auth;
	const pathname = usePathname();
	const router = useRouter();

	const pageKey = pageKeyFromPath(pathname);
	const allowed = typeof can === 'function' ? can(pageKey) : true;

	// Bounce anyone who lands on a page they aren't permitted to see. Hiding a
	// link in the sidebar was never enough — the URL still worked. This is the
	// gate that actually holds, and it sends them somewhere they CAN use rather
	// than to a dead end.
	useEffect(() => {
		if (loadingPage || !user || allowed) return;
		router.replace(landingPage || '/dashboard');
	}, [loadingPage, user, allowed, landingPage, router]);

	// Step 1: If loading, show spinner
	if (loadingPage) {
		return <Spinner />;
	}

	// Step 2: If not logged in, auth context handles redirect to /signin
	if (!user) {
		return <Spinner />;
	}

	// Step 3: Not permitted here — hold the spinner while the effect above
	// redirects, so the page's own content never flashes on screen first.
	if (!allowed) {
		return <Spinner />;
	}

	// Step 4: Render layout for authenticated users
	return (
		<main className="md:flex bg-[var(--bg-page)] min-h-screen">
			<Idle />
			<div className='hidden md:flex z-10 mx-auto'>
				<Sidebar />
			</div>
			{/* Same chrome role as MainNav, so the same rung — its search dropdown was
			    trapped under sticky table headers for the same reason. */}
			<div className='md:hidden flex drop-shadow-xl z-appbar fixed top-0 left-0 right-0 h-14'>
				<SideBarMini />
			</div>
			<div className="grow md:overflow-auto h-screen relative pt-14 md:pt-0">
								<GlobalSearchLoader />
				<MainNav />
				{children}
			</div>

			{/* AI-Powered Floating Chat */}
			<FloatingChat />

			{/* Arrival notification pop-ups — app shell only, never on marketing pages */}
			<NotificationPopupsHost />

			{/* Cmd/Ctrl+K command palette — global navigation + record search */}
			<CommandPalette />
		</main>
	);
}
