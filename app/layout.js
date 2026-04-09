import './globals.css';
import { GeistSans } from 'geist/font/sans';
import Provider from './providers'
import { SpeedInsights } from "@vercel/speed-insights/next";
import { GlobalSearchProvider } from '../contexts/useGlobalSearchContext';


export const metadata = {
	title: 'IMS-Metals',
	description: 'Invoices & Contracts',
};

export default function RootLayout({ children }) {


	return (
		<html lang="en">
			<body className={GeistSans.className} style={{ '--font-poppins': GeistSans.style.fontFamily }}>
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
