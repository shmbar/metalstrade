'use client'
import {createContext} from 'react';
import useSettingsState from '@hooks/useSettingsState';


export const SettingsContext = createContext();

const SettingsProvider=(props)=>{
		const settingsStuff = useSettingsState();
		
		return (
			<SettingsContext.Provider value={settingsStuff}>
				{props.children}
			</SettingsContext.Provider>
		);
	};

export default SettingsProvider;
