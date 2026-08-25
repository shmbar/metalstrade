'use client'

import { useContext, useEffect, useRef } from 'react';
import { SettingsContext } from '../contexts/useSettingsContext';
import { ContractsContext } from '../contexts/useContractsContext';
import { ExpensesContext } from '../contexts/useExpensesContext';
import { accountName } from '../utils/activeAccount';

// Switching between IMS and GIS swaps which account every read and write
// addresses, but it does not touch what is already on screen: a contract opened
// in one account stays open, still showing the other account's figures, and
// saving it writes that record into the account now selected. That is how a
// contract came to exist twice across the two accounts.
//
// Nothing on screen announced the switch either, because the account could also
// change on its own — the token refresh used to overwrite a deliberate switch
// (see utils/activeAccount.js). So close what is open, drop the list loaded from
// the account we just left, and say plainly which account we are now in.
const AccountSwitchGuard = () => {
    const { uidCollection, setToast } = useContext(SettingsContext);
    const { setIsOpenCon, setContractsData } = useContext(ContractsContext);
    const { setIsOpen: setIsOpenExp } = useContext(ExpensesContext);

    // The first account of the session is not a switch — only a CHANGE is.
    const prev = useRef(null);

    useEffect(() => {
        const from = prev.current;
        prev.current = uidCollection;
        if (!from || !uidCollection || from === uidCollection) return;

        setIsOpenCon(false);
        setIsOpenExp(false);
        setContractsData([]);   // belongs to the account we just left
        setToast({
            show: true, clr: 'success',
            text: `Now in ${accountName(uidCollection) || 'another account'} — open records were closed so nothing is saved to the wrong account`,
        });
    }, [uidCollection, setIsOpenCon, setIsOpenExp, setContractsData, setToast]);

    return null;
};

export default AccountSwitchGuard;
