import React, { useRef, useEffect } from 'react'
import { useState } from 'react'
import { v4 as uuidv4 } from 'uuid';
import { getTtl } from '@utils/languages';
import { CirclePlus, Pencil, Trash, } from "lucide-react"
import { Button } from '@components/ui/button.jsx';

const Remraks = ({ value, setValue, ln }) => {

    //  const [rmrks, setRmrks] = useState(rmks);
    const [edit, setEdit] = useState({ status: false, id: '' })
    const [value1, setValue1] = useState('')
    const inputRef = useRef(null);

    useEffect(() => {
        edit.status && inputRef.current.focus();
    }, [edit.status]);


    const deleteItem = (item) => {
        const tmp = value.remarks;
        setValue({ ...value, remarks: tmp.filter(x => x.id !== item.id) });
    }

    const editItem = (x) => {
        setEdit({ status: true, id: x.id })
        setValue1(x.rmrk)
    }

    const addItem = () => {
        let newItem = { id: uuidv4(), rmrk: 'New Remark' }
        const tmp = [...value.remarks, newItem];
        setValue({ ...value, remarks: tmp });

        setEdit({ status: true, id: newItem.id })
    }

    const handleKeyPress = (e) => {

        if (e.key === 'Enter') {
            const newArr = value.remarks.map((x) =>
                x.id === edit.id ? { ...x, 'rmrk': e.target.value } : x
            );

            setValue({ ...value, remarks: newArr });
            setEdit({ status: false, id: '', });
            setValue1('');
        }

        if (e.key === 'Escape') {
            setEdit({ status: false, id: '' });
            setValue1('');
        }
    };

    return (
        <div className={`${value.remarks.length > 0 ? 'max-w-5xl' : 'max-w-xs'}`}>
            <div className='flex items-center justify-between'>
                <p className='flex items-center responsiveText font-medium pl-2 text-[var(--chathams-blue)]'>{getTtl('Remarks', ln)}:</p>

                {!value.final && <div className='group relative '>
                    <Button className="h-7 px-2"
                        onClick={() => addItem()}>
                        <CirclePlus /> {getTtl('Add', ln)}
                    </Button>
                    <span className="absolute hidden group-hover:flex top-8 w-fit p-1
    bg-slate-400 rounded-md text-center text-white responsiveTextTable z-10 whitespace-nowrap -left-1.5">
                        {getTtl('AddRemark', ln)}</span>
                </div>}

            </div>

            <ul className="flex flex-col mt-1">

                {value.remarks.map((x, i) => {
                    return (
                        <li key={i} className="justify-between inline-flex items-center gap-x-2 py-2 px-4 responsiveText bg-white border border-[#d8e8f5] text-[var(--port-gore)] -mt-px first:rounded-t-xl first:mt-0 last:rounded-b-xl ">
                            {edit.status && edit.id === x.id ?
                                <input
                                    className="w-full border rounded-full border-[#d8e8f5] h-7
focus:outline-0 focus:border-[var(--endeavour)] indent-1.5 text-[0.72rem] text-[var(--port-gore)]"
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
                                <Pencil size={20} className='opacity-50 cursor-pointer' onClick={() => editItem(x)} />
                                <Trash size={20} className='opacity-50 cursor-pointer' onClick={() => deleteItem(x)} />
                            </div>}
                        </li>

                    )
                })}
            </ul>
        </div>
    )
}

export default Remraks