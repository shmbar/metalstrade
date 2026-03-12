import './globals.css';
import { Inter } from 'next/font/google';
import Provider from './providers'
import { SpeedInsights } from "@vercel/speed-insights/next";
import { GlobalSearchProvider } from '../contexts/useGlobalSearchContext';


const inter = Inter({
	weight: ['300', '400', '500', '600', '700'],
	subsets: ['latin'],
});


export const metadata = {
	title: 'IMS-Metals',
	description: 'Invoices & Contracts',
};

export default function RootLayout({ children }) {


	return (
		<html lang="en">
			<body className={inter.className}>
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
