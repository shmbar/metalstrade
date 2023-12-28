'use client';

import SettingsProvider from '@contexts/useSettingsContext';
import ContractsProvider from '@contexts/useContractsContext';
import InvoiceProvider from '@contexts/useInvoiceContext';
import ExpensesProvider from '@contexts/useExpensesContext';
import AuthProvier from '@contexts/useAuthContext';

const Providers=({ children }) =>{
    return (
        <SettingsProvider>
            <AuthProvier>
                <ContractsProvider >
                    <InvoiceProvider >
                        <ExpensesProvider>
                            {children}
                        </ExpensesProvider>
                    </InvoiceProvider>
                </ContractsProvider>
            </AuthProvier>
        </SettingsProvider>
    );
}

export default Providers;