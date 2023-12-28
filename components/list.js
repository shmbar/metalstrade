import { useRef, useEffect } from 'react'
import { BiEditAlt } from 'react-icons/bi';
import { MdDeleteOutline } from 'react-icons/md';
import { useState } from 'react'
import { IoAddCircleOutline } from 'react-icons/io5';
import { v4 as uuidv4 } from 'uuid';
import {sortArr} from '@utils/utils'

const List = ({ list, updateList, ttl, name }) => {


    const [edit, setEdit] = useState({ status: false, id: '' })
    const [value1, setValue1] = useState('')
    const [isNewItemAdded, setIsNewItemAdded] = useState(false);

    const inputRef = useRef(null);
    const containerRef = useRef(null);

    useEffect(() => {
        edit.status && inputRef.current.focus();
    }, [edit.status]);

    useEffect(() => {
        if (isNewItemAdded && containerRef.current && containerRef.current.lastChild) {
            setTimeout(() => {
                containerRef.current.lastChild.scrollIntoView({ behavior: 'smooth' });
            }, 0);
            setIsNewItemAdded(false);
        }
    }, [isNewItemAdded]);

    const deleteItem = (item) => {
        let tmp = list.map(x => x.id === item.id ? { ...x, deleted: true } : x)
        updateList(tmp, true);
    }

    const editItem = (x) => {
        setEdit({ status: true, id: x.id })
        let keyTmp = Object.keys(x).filter(q => q !== 'id')[0]
        setValue1(x[keyTmp])
    }

    const addItem = () => {
        const newItem = { id: uuidv4(), [name]: 'New ' + ttl, deleted: false }
        const newList = [...list, newItem];

        updateList(newList, false);
        setIsNewItemAdded(true);
    }


    const handleKeyPress = (e) => {

        if (e.key === 'Enter') {
            const newArr = list.map((x) =>
                x.id === edit.id ? { ...x, [name]: e.target.value } : x
            );

            updateList(newArr, true)
            setEdit({ status: false, id: '', });
            setValue1('');
        }

        if (e.key === 'Escape') {
            setEdit({ status: false, id: '' });
            setValue1('');
        }
    };

    return (
        <div className='w-full'>
            <div className='flex items-center justify-between'>
                <p className='flex items-center text-sm font-medium pl-2 text-slate-700' >{ttl}:</p>
                <button className="text-slate-700  flex items-center justify-center text-white gap-1.5 px-2 
                    h-6 border border-slate-400 bg-slate-400 rounded-md text-xs text-white 
                    hover:bg-slate-500 shadow-lg"
                    onClick={() => addItem()}>
                    <IoAddCircleOutline className='scale-110' /> Add
                </button>
            </div>

            <ul ref={containerRef} className="flex flex-col mt-1 overflow-auto max-h-80 ring-1 ring-black/5 rounded-lg divide-y" >

                {(name==='hs'? list: sortArr(list, name)).filter(q => !q.deleted).map((x, i) => {
                    return (
                        <li key={i} className="justify-between flex items-center gap-x-2 py-2 px-4 text-xs text-slate-700">
                            {edit.status && edit.id === x.id ?
                                <input
                                    className="w-full border rounded-md border-slate-400 h-7 
focus:outline-0 focus:border-slate-600 indent-1.5 text-sm text-slate-500"
                                    onKeyDown={handleKeyPress}
                                    value={value1}
                                    onChange={(e) =>
                                        setValue1(e.target.value)
                                    }
                                    ref={inputRef}
                                />
                                : x[name]
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

export default List