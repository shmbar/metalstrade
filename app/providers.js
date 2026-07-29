'use client';

import SettingsProvider from '../contexts/useSettingsContext';
import ContractsProvider from '../contexts/useContractsContext';
import SalesContractsProvider from '../contexts/useSalesContractsContext';
import InvoiceProvider from '../contexts/useInvoiceContext';
import ExpensesProvider from '../contexts/useExpensesContext';
import { default as AuthContextProvider } from '../contexts/useAuthContext';
import NotificationProvider from '../contexts/useNotificationContext';
import ThemeProvider from '../contexts/useThemeContext';

const Providers=({ children }) =>{
    return (
            <SettingsProvider>
                <AuthContextProvider>
                <ThemeProvider>
                <NotificationProvider>
                <ContractsProvider >
                    <SalesContractsProvider >
                    <InvoiceProvider >
                        <ExpensesProvider>
                            {children}
                        </ExpensesProvider>
                    </InvoiceProvider>
                    </SalesContractsProvider>
                </ContractsProvider>
                </NotificationProvider>
                </ThemeProvider>
                </AuthContextProvider>
        </SettingsProvider>
    );
}

export default Providers;
