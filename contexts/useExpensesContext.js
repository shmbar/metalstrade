'use client'
import {createContext} from 'react';
import useExpensesState from '@hooks/useExpensesState';


export const ExpensesContext = createContext();

const ExpensesProvider=(props)=>{
		const expensesStuff = useExpensesState();
		
		return (
			<ExpensesContext.Provider value={expensesStuff}>
				{props.children}
			</ExpensesContext.Provider>
		);
	};

export default ExpensesProvider;
