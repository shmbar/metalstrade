import React, { useRef, useEffect , useContext} from 'react'
import { BiEditAlt } from 'react-icons/bi';
import { MdDeleteOutline } from 'react-icons/md';
import { useState } from 'react'
import { IoAddCircleOutline } from 'react-icons/io5';
import { v4 as uuidv4 } from 'uuid';
import { SettingsContext } from "@contexts/useSettingsContext";
import { getTtl } from '@utils/languages';

const FinalRemarks = ({ value, setValue }) => {

    const [edit, setEdit] = useState({ status: false, id: '' })
    const [value1, setValue1] = useState('')
    const inputRef = useRef(null);
    const {ln } = useContext(SettingsContext);


    useEffect(() => {
        edit.status && inputRef.current.focus();
    }, [edit.status]);

    const deleteItem = (item) => {
        const tmp = value.finalSRemarks;
        setValue({ ...value, finalSRemarks: tmp.filter(x => x.id !== item.id) });
    }

    const editItem = (x) => {
        setEdit({ status: true, id: x.id })
        setValue1(x.rmrk)
    }

    const addItem = () => {
        let newItem = { id: uuidv4(), rmrk: 'New Remark' }
        const tmp = [...value?.finalSRemarks, newItem];
        setValue({ ...value, finalSRemarks: tmp });

        setEdit({ status: true, id: newItem.id })
    }

    const handleKeyPress = (e) => {

        if (e.key === 'Enter') {
            const newArr = value.finalSRemarks.map((x) =>
                x.id === edit.id ? { ...x, 'rmrk': e.target.value } : x
            );

            setValue({ ...value, finalSRemarks: newArr });
            setEdit({ status: false, id: '', });
            setValue1('');
        }

        if (e.key === 'Escape') {
            setEdit({ status: false, id: '' });
            setValue1('');
        }
    };

    return (
        <div className={`${value?.finalSRemarks?.length>0 ? 'max-w-4xl' : 'max-w-xs'}`}>
            <div className='flex items-center justify-between'>
                <p className='flex items-center text-sm font-medium pl-2'>{getTtl('Remarks', ln)}:</p>

                <div className='group relative '>
                    <button className="text-white  flex items-center justify-center gap-1.5 px-2 
                    h-7 border border-slate-400 bg-slate-700 rounded-md text-sm
                    hover:bg-slate-400 shadow-lg"
                        onClick={() => addItem()}>
                        <IoAddCircleOutline className='scale-110' /> {getTtl('Add', ln)}
                    </button>
                    <span className="absolute hidden group-hover:flex top-8 w-fit p-1
    bg-slate-400 rounded-md text-center text-white text-xs z-10 whitespace-nowrap -left-1.5">
                        {getTtl('AddFormula', ln)}</span>
                </div>

            </div>

            <ul className="flex flex-col mt-1">

                {value?.finalSRemarks?.map((x, i) => {
                    return (
                        <li key={i} className="justify-between inline-flex items-center gap-x-2 py-2 px-4 text-sm  bg-white border text-gray-800 -mt-px first:rounded-t-lg first:mt-0 last:rounded-b-lg ">
                            {edit.status && edit.id === x.id ?
                                <input
                                    className="w-full border rounded-md border-slate-400 h-7 
focus:outline-0 focus:border-slate-600 indent-1.5 text-sm text-slate-500"
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
                                <BiEditAlt className='scale-125 opacity-50 cursor-pointer' onClick={() => editItem(x)} />
                                <MdDeleteOutline className='scale-125 opacity-50 cursor-pointer' onClick={() => deleteItem(x)} />
                            </div>}
                        </li>

                    )
                })}
            </ul>

        </div>
    )
}

export default FinalRemarks