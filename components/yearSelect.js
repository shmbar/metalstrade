import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react'
import { useEffect, useState } from 'react';

const YearSelect = ({yr, setYr}) => {
    
    const currentYear = new Date().getFullYear();
    const yrArr = Array.from({ length: 5 }, (_, i) => currentYear - 3 + i);

    return (
        <Menu>
            <MenuButton className='border border-[var(--endeavour)] rounded-full p-2 text-[var(--endeavour)] responsiveTextTitle px-3 font-poppins responsiveTextInput'>{yr}</MenuButton>
            <MenuItems anchor="bottom" className='z-50 border border-[var(--endeavour)] rounded-full p-2 mt-1 bg-[var(--bg-card)] font-poppins responsiveTextInput'>
                {yrArr.map(z => {
                    return (
                        <MenuItem className='text-[var(--endeavour)] font-poppins responsiveTextInput' key={z} >
                            <button className={`hover:bg-[var(--bg-subtle)] flex w-full items-center gap-2 rounded-full py-1.5 my-1 px-1
                            ${yr === z ? 'bg-[var(--endeavour)] text-[var(--on-brand)]' : ''}`}
                                onClick={() => setYr(z)}>
                                {z}
                            </button>
                        </MenuItem>
                    )
                })
                }
            </MenuItems>
        </Menu>
    )
}

export default YearSelect;
