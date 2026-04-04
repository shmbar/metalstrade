import './globals.css';
import { Plus_Jakarta_Sans } from 'next/font/google';
import Provider from './providers'
import { SpeedInsights } from "@vercel/speed-insights/next";
import { GlobalSearchProvider } from '../contexts/useGlobalSearchContext';


const poppins = Plus_Jakarta_Sans({
	weight: ['300', '400', '500', '600', '700'],
	subsets: ['latin'],
	variable: '--font-poppins',
});


export const metadata = {
	title: 'IMS-Metals',
	description: 'Invoices & Contracts',
};

export default function RootLayout({ children }) {


	return (
		<html lang="en">
			<body className={`${poppins.variable} ${poppins.className}`}>
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
