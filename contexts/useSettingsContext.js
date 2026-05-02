'use client'
import { createContext, useMemo } from 'react';
import useSettingsState from '@hooks/useSettingsState';

export const SettingsContext = createContext();

const SettingsProvider = (props) => {
    const settingsStuff = useSettingsState();

    const value = useMemo(() => settingsStuff, [
        settingsStuff.settings,
        settingsStuff.compData,
        settingsStuff.loading,
        settingsStuff.toast,
        settingsStuff.dateSelect,
        settingsStuff.dateYr,
        settingsStuff.ln,
        settingsStuff.uidCollection,
    ]);

    return (
        <SettingsContext.Provider value={value}>
            {props.children}
        </SettingsContext.Provider>
    );
};

export default SettingsProvider;
