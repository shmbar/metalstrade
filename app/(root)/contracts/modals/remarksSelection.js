import React, { useRef, useEffect } from 'react'
import { MdDeleteOutline } from 'react-icons/md';
import { IoAddCircleOutline } from 'react-icons/io5';
import { v4 as uuidv4 } from 'uuid';
import CBox from '@components/comboboxRemarks'

const Remraks = ({ value, setValue, settings }) => {


    const deleteItem = (i) => {
        const tmp = value.remarks;
        setValue({ ...value, remarks: tmp.filter((x, y) => y !== i) });
    }

    const addItem = () => {
        let newItem = { id: uuidv4(), rmrk: '' }
        const tmp = [...value.remarks, newItem];
        setValue({ ...value, remarks: tmp });
    }



    return (
        <div className={`${value.remarks.length > 0 ? 'max-w-4xl' : 'max-w-xs'}`}>
            <div className='flex items-center justify-between'>
                <p className='flex items-center text-sm font-medium pl-2'>Remarks:</p>

                {!value.final && <div className='group relative '>
                    <button className="text-slate-700  flex items-center justify-center text-white gap-1.5 px-2 
                    h-7 border border-slate-400 bg-slate-400 rounded-md text-sm text-white 
                    hover:bg-slate-500 shadow-lg"
                        onClick={() => addItem()}>
                        <IoAddCircleOutline className='scale-110' /> Add
                    </button>
                    <span className="absolute hidden group-hover:flex top-8 w-fit p-1
    bg-slate-400 rounded-md text-center text-white text-xs z-10 whitespace-nowrap -left-1.5">
                        Add remark</span>
                </div>}

            </div>

            <ul className="flex flex-col mt-1">

                {value.remarks.map((x, i) => {
                    return (
                        <li key={i} className="justify-between inline-flex items-center gap-x-2 py-0.5 px-2 text-sm  bg-white border text-gray-800 -mt-px first:rounded-t-lg first:mt-0 last:rounded-b-lg ">
                            <div className='w-full flex items-center gap-3'>
                                <CBox data={settings.Remarks.Remarks} indx={i} setValue={setValue} value={value} name='rmrk' classes='shadow-md' />
                                <MdDeleteOutline className='scale-125 opacity-50 cursor-pointer' onClick={() => deleteItem(i)} />
                            </div>
                        </li>
                    )
                })}
            </ul>

        </div>
    )
}

export default Remraks;

