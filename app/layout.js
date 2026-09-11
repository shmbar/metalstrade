import './globals.css';
import { Plus_Jakarta_Sans } from 'next/font/google';
import Provider from './providers'
import { SpeedInsights } from "@vercel/speed-insights/next";
import { GlobalSearchProvider } from '../contexts/useGlobalSearchContext';

/* ONE family: Plus Jakarta Sans, everywhere.
   Client revision 2026-08-08: "one font family across the whole app".
   Inter was previously loaded for data tables and figures, on the reasoning that
   its tabular numerals keep columns aligned. Jakarta has tabular figures too
   (globals.css switches them on via font-variant-numeric), so the second family
   bought nothing and cost three things: two typefaces on one screen, a second
   webfont download on first paint, and — because Inter was loaded at 400/500/600
   only — synthesised faux-bold wherever a table cell asked for 700.

   800 is dropped from the weight list along with it: nothing renders at 800 now
   that font-bold maps to 600 (see fontWeight in tailwind.config.js), so it was a
   third font file downloaded for nothing. */
const jakarta = Plus_Jakarta_Sans({
	weight: ['400', '500', '600', '700'],
	subsets: ['latin'],
	variable: '--font-jakarta',
});

/* The product is IMS Tech (ims-tech.io). "IMS Metals & Alloys" is one of the trading
   companies that uses it — that name stays on its own invoices and PDFs, not on the
   browser tab or a shared link's preview card.

   Icons: logoNew.svg is a wide wordmark in a mostly-empty 600x500 box, so every square
   slot (tab, home screen, link preview) cropped or squeezed it. imsTechIcon.svg is the
   IMS mark centred in a square; the touch icon is a PNG because iOS ignores SVG ones. */
export const metadata = {
	title: 'IMS Tech',
	applicationName: 'IMS Tech',
	description: 'Invoices & Contracts',
	openGraph: { title: 'IMS Tech', siteName: 'IMS Tech' },
	icons: {
		icon: [{ url: '/logo/imsTechIcon.svg', type: 'image/svg+xml' }],
		apple: [{ url: '/logo/imsTech-apple-180.png', sizes: '180x180', type: 'image/png' }],
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
			{/* --font-jakarta comes from next/font via the .variable class. It is
			    now the only family in the app — no Inter, no Poppins alias. */}
			<body className={`${jakarta.variable} ${jakarta.className}`}>
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
