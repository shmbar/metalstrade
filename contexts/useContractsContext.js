'use client'
import {createContext} from 'react';
import useContractsState from '@hooks/useContractsState';

export const ContractsContext = createContext();

const ContractsProvider=(props)=>{
		const contractsStuff = useContractsState();
		
		return (
			<ContractsContext.Provider value={contractsStuff}>
				{props.children}
			</ContractsContext.Provider>
		);
	};

export default ContractsProvider;
