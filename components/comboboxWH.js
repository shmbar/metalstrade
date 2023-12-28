import { Fragment, useEffect, useState } from 'react'
import { Combobox, Transition } from '@headlessui/react'
//import { CheckIcon, ChevronUpDownIcon } from '@heroicons/react/20/solid'
import { AiOutlineCheck } from 'react-icons/ai';
import { HiChevronUpDown } from 'react-icons/hi2';



const MyCombobox = ({ data, setValue, value, dt, indx, name, classes, disabled, classes1 }) => {
  
    const newArr = [{ id: '00000', [name]: 'Select' }, ...data.filter(x => !x.deleted)]
    const [selected, setSelected] = useState(dt[indx][name] === '' ? newArr[0] :
        data.find(x => x.id === dt[indx][name]))
    const [query, setQuery] = useState('')

    useEffect(() => {
        //when I clear a value
        if (value[name] === '' && selected.id !== '00000') {
            setSelected(newArr[0])
        }

    }, [value])


    const filteredData =
        query === ''
            ? newArr.slice(1)
            : newArr.slice(1).filter((x) =>
                x[name]
                    .toLowerCase()
                    .replace(/\s+/g, '')
                    .includes(query.toLowerCase().replace(/\s+/g, ''))
            )

    const setSelection = (e) => {
        setSelected(e)
        
        //e = selected item of data
        if (name === 'description') {
            let itm = dt[indx]
            itm = { ...itm, [name]: e.id }

            //unitPrice
            let prc = value.productsData.find(q => q.id === e.id)?.unitPrc
            prc = isNaN(prc * 1) ? 0 : prc
            itm = { ...itm, unitPrc: prc }

            //total
            if (itm.unitPrc !== '' && itm.qnty !== '') {
                itm = { ...itm, total: itm.unitPrc * itm.qnty }
            }

            let newObj = [...dt]
            newObj[indx] = itm;
            setValue(newObj)
        } else if (name === 'poInvoice' || name === 'stock') {
            let itm = dt[indx]
            itm = { ...itm, [name]: e.id }

            let newObj = [...dt]
            newObj[indx] = itm;

            setValue(newObj)
        }
    }

    return (
        <div className="w-full">
            <Combobox by="id" value={selected} onChange={(e) => setSelection(e)} disabled={disabled}>
                <div className="relative">
                    <div className={`relative w-full cursor-default overflow-hidden rounded-lg bg-white text-left 
                     focus:outline-none sm:text-sm border border-slate-400 ${classes}`}>
                        <Combobox.Input
                            className="w-full py-1 pl-3 pr-10 text-xs leading-5 text-gray-900 focus:outline-none "
                            displayValue={(value) => (data.find(x => x.id === dt[indx][name]) || {})[name] || selected[name]}
                            onChange={(event) => setQuery(event.target.value)}
                        />
                        <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
                            <HiChevronUpDown
                                className="h-5 w-5 text-gray-400"
                                aria-hidden="true"
                            />
                        </Combobox.Button>
                    </div>
                    <Transition
                        as={Fragment}
                        leave="transition ease-in duration-100"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                        afterLeave={() => setQuery('')}
                    >
                        <Combobox.Options className={`z-10 absolute mt-1 max-h-60 w-full overflow-auto rounded-md 
                        bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none 
                        sm:text-sm ${classes1}`}>
                            {filteredData.length === 0 && query !== '' ? (
                                <div className="relative cursor-default select-none py-2 px-4 text-gray-700 text-xs">
                                    Nothing found.
                                </div>
                            ) : (

                                filteredData.map((x) => ( //slice(1)
                                    <Combobox.Option
                                        key={x.id}
                                        className={({ active }) =>
                                            `relative cursor-default select-none py-1 text-xs pl-10 pr-4 ${active ? 'bg-slate-400 text-white' : 'text-gray-900'
                                            }`
                                        }
                                        value={x}
                                    >
                                        {({ selected, active }) => (
                                            <>
                                                <span
                                                    className={`block truncate ${selected ? 'font-bold' : 'font-normal'
                                                        }`}
                                                >
                                                    {x[name]}
                                                </span>
                                                {selected ? (
                                                    <span
                                                        className={`absolute inset-y-0 left-0 flex items-center pl-3 ${active ? 'text-white' : 'text-teal-600'
                                                            }`}
                                                    >
                                                        <AiOutlineCheck className="h-5 w-5" aria-hidden="true" />
                                                    </span>
                                                ) : null}
                                            </>
                                        )}
                                    </Combobox.Option>
                                ))
                            )}
                        </Combobox.Options>
                    </Transition>
                </div>
            </Combobox>
        </div>
    )
}

export default MyCombobox;