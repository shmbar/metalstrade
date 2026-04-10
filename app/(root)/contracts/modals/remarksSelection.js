import React, {  useContext } from 'react'
import { v4 as uuidv4 } from 'uuid';
import { SettingsContext } from "@contexts/useSettingsContext";
import { getTtl } from '@utils/languages';
import { Selector } from '@components/selectors/selectShad';
import { X, CirclePlus, Trash } from "lucide-react"
import { Button } from '@components/ui/button.jsx';


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


    const handleChange = (e, name, indx) => {
        setValue(prev => ({
            ...prev,
            remarks: prev.remarks.map((item, i) =>
                i === indx ? e === "EditTextRmrks"
                    ? { ...item, isRmrkText: true, [name]: "" }
                    : { ...item, [name]: e } : item),
        }));
    };


    return (
        <div className={`${value.remarks.length > 0 ? 'max-w-4xl' : 'max-w-xs'}`}>
            <div className='flex items-center justify-between'>
                <p className='flex items-center text-sm font-medium pl-2'>{getTtl('Remarks', ln)}:</p>

                {!value.final && <div className='group relative '>
                    <Button className="h-7 px-2"
                        onClick={() => addItem()}>
                        <CirclePlus /> {getTtl('Add', ln)}
                    </Button>
                    <span className="absolute hidden group-hover:flex top-8 w-fit p-1
    bg-slate-400 rounded-md text-center text-white text-xs z-10 whitespace-nowrap -left-1.5">
                        {getTtl('AddRemark', ln)}</span>
                </div>}

            </div>

            <ul className="flex flex-col mt-1">
                {value.remarks.map((x, i) => {
                    return (
                        <li key={i} className="justify-between inline-flex items-center gap-x-2 py-0.5 px-2 text-[13px]  bg-white border text-[var(--port-gore)] -mt-px first:rounded-t-lg first:mt-0 last:rounded-b-lg
                        relative ">
                            {!x.isRmrkText ?
                                <div className='w-full flex items-center gap-3'>
                                    <Selector
                                        arr={[...settings.Remarks.Remarks, { rmrk: '..Add Text', id: 'EditTextRmrks' }]}
                                        value={value.remarks[i]}
                                        onChange={(e) => handleChange(e, 'rmrk', i)}
                                        name='rmrk'
                                     />
                                    <Trash size={20} className='opacity-50 cursor-pointer' onClick={() => deleteItem(i)} />
                                </div>
                                :
                                <div className='flex pt-1 items-center w-full gap-x-3'>
                                    <input type='text' className="input text-[13px] text-[var(--port-gore)] shadow-lg h-[1.86rem] text-xs w-full rounded-lg
                                    truncate pr-10" name='rmrk'
                                        value={x.rmrk} onChange={(e) => handleValue(e, i)} />
                                    <div className='absolute right-12 '>
                                        <X className="size-5 text-[var(--regent-gray)]  hover:text-[var(--regent-gray)] cursor-pointer"
                                            onClick={() => caneclEditText(i)} />
                                    </div>
                                    <Trash size={20} className='opacity-50 cursor-pointer' onClick={() => deleteItem(i)} />
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