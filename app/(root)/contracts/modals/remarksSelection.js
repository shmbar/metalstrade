import React, { useRef, useEffect, useContext } from 'react'
import { MdDeleteOutline } from 'react-icons/md';
import { IoAddCircleOutline } from 'react-icons/io5';
import { v4 as uuidv4 } from 'uuid';
import CBox from '@components/comboboxRemarks'
import { MdClear } from 'react-icons/md';
import { SettingsContext } from "@contexts/useSettingsContext";
import { getTtl } from '@utils/languages';

const Remraks = ({ value, setValue, settings }) => {

    const { ln } = useContext(SettingsContext);
    const deleteItem = (i) => {
        const tmp = value.remarks;
        setValue({ ...value, remarks: tmp.filter((x, y) => y !== i) });
    }

    const addItem = () => {
        let newItem = { id: uuidv4(), rmrk: '' }
        const tmp = [...value.remarks, newItem];
        setValue({ ...value, remarks: tmp });
    }

    const handleValue = (e, i) => {
        let newObj = [...value.remarks]
        newObj = newObj.map((x, y) => y === i ? { ...x, [e.target.name]: e.target.value } : x)
        setValue({ ...value, remarks: newObj })
    }

    const caneclEditText = (i) => {
        let newObj = [...value.remarks]
        newObj = newObj.map((x, y) => y === i ? { ...x, 'isRmrkText': false, 'rmrk': '' } : x)
        setValue({ ...value, remarks: newObj })
    }

    return (
        <div className={`${value.remarks.length > 0 ? 'max-w-4xl' : 'max-w-xs'}`}>
            <div className='flex items-center justify-between'>
                <p className='flex items-center text-sm font-medium pl-2'>{getTtl('Remarks', ln)}:</p>

                {!value.final && <div className='group relative '>
                    <button className=" flex items-center justify-center gap-1.5 px-2 
                    h-7 border border-slate-400 bg-slate-700 hover:bg-slate-400 rounded-md text-sm text-white 
                 shadow-lg"
                        onClick={() => addItem()}>
                        <IoAddCircleOutline className='scale-110' /> {getTtl('Add', ln)}
                    </button>
                    <span className="absolute hidden group-hover:flex top-8 w-fit p-1
    bg-slate-400 rounded-md text-center text-white text-xs z-10 whitespace-nowrap -left-1.5">
                        {getTtl('AddRemark', ln)}</span>
                </div>}

            </div>

            <ul className="flex flex-col mt-1">
                {value.remarks.map((x, i) => {
                    return (
                        <li key={i} className="justify-between inline-flex items-center gap-x-2 py-0.5 px-2 text-sm  bg-white border text-gray-800 -mt-px first:rounded-t-lg first:mt-0 last:rounded-b-lg
                        relative ">
                            {!x.isRmrkText ?
                                <div className='w-full flex items-center gap-3'>
                                    <CBox data={[...settings.Remarks.Remarks, { rmrk: '..Add Text', id: 'EditTextRmrks' }]} indx={i} setValue={setValue} value={value} name='rmrk' classes='shadow-md' />
                                    <MdDeleteOutline className='scale-125 opacity-50 cursor-pointer' onClick={() => deleteItem(i)} />
                                </div>
                                :
                                <div className='flex pt-1 items-center w-full gap-x-3'>
                                    <input type='text' className="input text-[15px] text-gray-800 shadow-lg h-[1.86rem] text-xs w-full rounded-lg
                                    truncate pr-10" name='rmrk'
                                        value={x.rmrk} onChange={(e) => handleValue(e, i)} />
                                    <button className='absolute right-10 '>
                                        <MdClear className="size-5 text-gray-300  hover:text-gray-500"
                                            onClick={() => caneclEditText(i)} />
                                    </button>
                                    <MdDeleteOutline className='scale-125 opacity-50 cursor-pointer' onClick={() => deleteItem(i)} />
                                </div>
                            }
                        </li>
                    )
                })}
            </ul>

        </div>
    )
}

export default Remraks;

// 