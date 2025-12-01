'use client'
import {createContext} from 'react';
import useInvoiceState from '@hooks/useInvoiceState';


export const InvoiceContext = createContext();

const InvoiceProvider=(props)=>{
		const invoiceStuff = useInvoiceState();
		
		return (
			<InvoiceContext.Provider value={invoiceStuff}>
				{props.children}
			</InvoiceContext.Provider>
		);
	};

export default InvoiceProvider;
