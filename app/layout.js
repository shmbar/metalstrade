import './globals.css';
import { Poppins } from 'next/font/google';
import Provider from './providers'
import { SpeedInsights } from "@vercel/speed-insights/next";
import { GlobalSearchProvider } from '../contexts/useGlobalSearchContext';

const poppins = Poppins({
	weight: ['300', '400', '500', '600', '700'],
	subsets: ['latin'],
	variable: '--font-poppins',
});

export const metadata = {
	title: 'IMS-Metals',
	description: 'Invoices & Contracts',
	icons: {
		icon: '/logo/logoNew.svg',
		apple: '/logo/logoNew.svg',
	},
};

// Every page is auth-gated and renders live, per-user Firebase data — there is no static
// HTML to gain, and statically prerendering client pages that call useSearchParams() (e.g.
// /contracts, /invoices, /expenses) breaks `next build`. Render the app dynamically.
export const dynamic = 'force-dynamic';

export default function RootLayout({ children }) {


	return (
		<html lang="en">
			<body className={poppins.className} style={{ '--font-poppins': poppins.style.fontFamily }}>
				{/* Apply the member's saved colour theme before first paint (see
				    contexts/useThemeContext.js — the vars map is precomputed at save time). */}
				<script
					dangerouslySetInnerHTML={{
						__html:
							"try{var t=JSON.parse(localStorage.getItem('ims-theme'));if(t&&t.vars){var r=document.documentElement;for(var k in t.vars){r.style.setProperty(k,t.vars[k])}}}catch(e){}",
					}}
				/>
				<Provider>
					<GlobalSearchProvider>
						<div>{children}</div>
					</GlobalSearchProvider>
				</Provider>
				<SpeedInsights />
			</body>
		</html>
	);
}
