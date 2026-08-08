import './globals.css';
import { Inter, Plus_Jakarta_Sans } from 'next/font/google';
import Provider from './providers'
import { SpeedInsights } from "@vercel/speed-insights/next";
import { GlobalSearchProvider } from '../contexts/useGlobalSearchContext';

// Plus Jakarta Sans = all UI, headings and body (the reference look).
// Inter = data tables and figures only — its tabular numerals keep columns aligned.
const jakarta = Plus_Jakarta_Sans({
	weight: ['400', '500', '600', '700', '800'],
	subsets: ['latin'],
	variable: '--font-jakarta',
});

const inter = Inter({
	weight: ['400', '500', '600'],
	subsets: ['latin'],
	variable: '--font-inter',
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
		// suppressHydrationWarning: the pre-paint boot script below legitimately
		// sets theme vars + .dark on <html> before React hydrates
		<html lang="en" suppressHydrationWarning>
			{/* --font-poppins is aliased to Jakarta so the legacy call sites that still
			    say font-poppins / var(--font-poppins) render the current UI font. */}
			<body
				className={`${jakarta.variable} ${inter.variable} ${jakarta.className}`}
				style={{ '--font-poppins': jakarta.style.fontFamily }}
			>
				{/* Apply the member's saved colour theme before first paint (see
				    contexts/useThemeContext.js — the vars map is precomputed at save time). */}
				<script
					dangerouslySetInnerHTML={{
						__html:
							"try{var t=JSON.parse(localStorage.getItem('ims-theme'));if(t&&t.vars){var r=document.documentElement;for(var k in t.vars){r.style.setProperty(k,t.vars[k])}if(t.mode==='dark'){r.classList.add('dark');r.style.colorScheme='dark'}}}catch(e){}",
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
