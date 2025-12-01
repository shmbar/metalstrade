import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import CheckBox from '@components/checkbox';
import { useEffect, useState } from 'react';

const YearSelect = ({ yr, setYr }) => {
    const currentYear = new Date().getFullYear();
    const yrArr = Array.from({ length: 5 }, (_, i) => currentYear - 3 + i);
//    const [checkedItems, setCheckedItems] = useState([]);



    const checkItem = (i) => {
        if (yr.includes(i)) {
         //   setCheckedItems(checkedItems.filter((x) => x !== i));
            setYr(yr.filter((x) => x !== i))
        } else {
       //     setCheckedItems([...checkedItems, i]);
            setYr([...yr, i])
        }
    };

    return (
        <Menu>
            <MenuButton className="border border-slate-400 rounded-md p-2 text-slate-600 text-sm px-3">
                {yr.length > 1 ? yr.sort((a, b) => a - b).map((z, i) => {
                    return i === yr.length - 1 ? z : z + ', '
                }) : yr.length === 1 ? yr[0] : 'Select Year'}
            </MenuButton>
            <MenuItems anchor="bottom" className="z-50 border border-slate-400 rounded-md p-2 mt-1 bg-white">
                {yrArr.map((z) => (
                    <MenuItem as="div" key={z} className="text-slate-600 text-sm">
                        <div className='flex items-center gap-2'>
                            <CheckBox checked={yr.includes(z)} size='h-5 w-5'
                                onChange={() => checkItem(z)} />
                            <div
                                className={`hover:bg-slate-200 flex w-full items-center gap-2 rounded-lg py-1.5 my-1 px-1 ${yr === z ? 'bg-slate-500 text-white' : ''
                                    }`}
                            //    onClick={() => setYr(z)}
                            >
                                {z}
                            </div>
                        </div>
                    </MenuItem>
                ))}
            </MenuItems>
        </Menu>
    );
};

export default YearSelect;
