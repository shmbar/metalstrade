import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react'
import { useEffect, useState } from 'react';

const YearSelect = ({yr, setYr}) => {
    
    const currentYear = new Date().getFullYear();
    const yrArr = Array.from({ length: 5 }, (_, i) => currentYear - 3 + i);

    return (
        <Menu>
            <MenuButton className='border border-slate-400 rounded-md p-2 text-slate-600 text-sm px-3 font-poppins text-xs'>{yr}</MenuButton>
            <MenuItems anchor="bottom" className='z-50 border border-slate-400 rounded-full p-2 mt-1 bg-white font-poppins text-xs'>
                {yrArr.map(z => {
                    return (
                        <MenuItem className='text-slate-600 font-poppins text-xs' key={z} >
                            <button className={`hover:bg-slate-200 flex w-full items-center gap-2 rounded-full py-1.5 my-1 px-1 
                            ${yr === z ? 'bg-slate-500 text-white' : ''}`}
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
