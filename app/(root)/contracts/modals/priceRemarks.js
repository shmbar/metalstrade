import React, { useRef, useEffect, useContext } from 'react'
import { useState } from 'react'
import { v4 as uuidv4 } from 'uuid';
import { SettingsContext } from "@contexts/useSettingsContext";
import { getTtl } from '@utils/languages';
import { CirclePlus, Pencil, Trash, } from "lucide-react"
import { Button } from '@components/ui/button.jsx';


const PriceRemarks = ({ value, setValue }) => {

    const [edit, setEdit] = useState({ status: false, id: '' })
    const [value1, setValue1] = useState('')
    const inputRef = useRef(null);
    const { ln } = useContext(SettingsContext);


    useEffect(() => {
        edit.status && inputRef.current.focus();
    }, [edit.status]);

    const deleteItem = (item) => {
        const tmp = value.priceRemarks;
        setValue({ ...value, priceRemarks: tmp.filter(x => x.id !== item.id) });
    }

    const editItem = (x) => {
        setEdit({ status: true, id: x.id })
        setValue1(x.rmrk)
    }

    const addItem = () => {
        let newItem = { id: uuidv4(), rmrk: 'New Remark' }
        const tmp = [...value.priceRemarks, newItem];
        setValue({ ...value, priceRemarks: tmp });

        setEdit({ status: true, id: newItem.id })
    }

    const handleKeyPress = (e) => {

        if (e.key === 'Enter') {
            const newArr = value.priceRemarks.map((x) =>
                x.id === edit.id ? { ...x, 'rmrk': e.target.value } : x
            );

            setValue({ ...value, priceRemarks: newArr });
            setEdit({ status: false, id: '', });
            setValue1('');
        }

        if (e.key === 'Escape') {
            setEdit({ status: false, id: '' });
            setValue1('');
        }
    };

    return (
        <div className={"w-full"}>
            <div className='flex items-center justify-between'>
                <p className='flex items-center responsiveText font-medium pl-2'>{getTtl('PriceFormula', ln)}:</p>

                <div className='group relative '>
                    <Button className="h-7 px-2"
                        onClick={() => addItem()}>
                        <CirclePlus size={10}/> {getTtl('Add', ln)}
                    </Button>
                    <span className="absolute hidden group-hover:flex top-8 w-fit p-1
    bg-slate-400 rounded-md text-center text-white responsiveTextTable z-10 whitespace-nowrap -left-1.5">
                        {getTtl('AddFormula', ln)}</span>
                </div>

            </div>

            <ul className="flex flex-col mt-1">

                {value.priceRemarks.map((x, i) => {
                    return (
                        <li key={i} className="justify-between inline-flex items-center gap-x-2 py-2 px-4 responsiveTextTable bg-white border text-[var(--port-gore)] -mt-px first:rounded-t-lg first:mt-0 last:rounded-b-lg">
                            {edit.status && edit.id === x.id ?
                                <input
                                    className="w-full border rounded-md border-slate-400 h-7 
focus:outline-0 focus:border-slate-600 indent-1.5 responsiveTextTable text-[var(--regent-gray)]"
                                    onKeyDown={handleKeyPress}
                                    value={value1}
                                    maxLength={140}
                                    onChange={(e) =>
                                        setValue1(e.target.value)
                                    }
                                    ref={inputRef}
                                />
                                : x.rmrk
                            }

                            {edit.id !== x.id && <div className='flex gap-4'>
                                <Pencil size={16} className='opacity-50 cursor-pointer' onClick={() => editItem(x)} />
                                <Trash size={16} className='opacity-50 cursor-pointer' onClick={() => deleteItem(x)} />
                            </div>}
                        </li>

                    )
                })}
            </ul>

        </div>
    )
}

export default PriceRemarks