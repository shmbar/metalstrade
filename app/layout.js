import './globals.css';
import { Poppins} from 'next/font/google';
import Provider from './providers'


const poppins = Poppins({
	weight: ['100', '200', '300', '400', '500', '600', '700', '800'],
	subsets: ['latin'],
});


export const metadata = {
	title: 'IMS-Metals',
	description: 'Invoices & Contracts',
};

export default function RootLayout({ children }) {


	return (
		<html lang="en">
			<body className={poppins.className}>
				<Provider>
					<div>{children}</div>
				</Provider>
			</body>
		</html>
	);
}