'use client'
import { createContext } from 'react';
import useSalesContractsState from '@hooks/useSalesContractsState';

export const SalesContractsContext = createContext();

const SalesContractsProvider = (props) => {
    const salesContractsStuff = useSalesContractsState();

    return (
        <SalesContractsContext.Provider value={salesContractsStuff}>
            {props.children}
        </SalesContractsContext.Provider>
    );
};

export default SalesContractsProvider;
