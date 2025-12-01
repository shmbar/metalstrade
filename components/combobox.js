import { Fragment, useEffect, useState } from 'react'
import { Combobox, Transition, ComboboxInput, ComboboxButton, ComboboxOptions, ComboboxOption } from '@headlessui/react'
//import { CheckIcon, ChevronUpDownIcon } from '@heroicons/react/20/solid'
import { AiOutlineCheck } from 'react-icons/ai';
import { HiChevronUpDown } from 'react-icons/hi2';
import { MdClear } from 'react-icons/md';
import { sortArr } from '@utils/utils'

const MyCombobox = ({ data, setValue, value, name, classes, disabled, classes1, classes2, dis }) => {

    const newArr = [{ id: '00000', [name]: 'Select' }, ...sortArr(data.filter(x => !x.deleted), name)]

    const [selected, setSelected] = useState(value[name] === '' ? newArr[0] : data.find(x => x.id === value[name]))
    const [query, setQuery] = useState('')

    useEffect(() => {
        //when I clear a value
        if (value[name] === '' && selected.id !== '00000') {
            setSelected(newArr[0])
        }

    }, [value])

    useEffect(() => {
        //switching between diffrent values

        if (selected?.id !== value[name] && value[name] !== '') {
            setSelected(data.find(x => x.id === value[name]))
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
        //   setSelected(e)
        //e = selected item of data

        let v = false;
        //conditions
        if ('supplier' in value) {
            if (name === 'delTerm' && (e.id === '2345' || e.id === '8768' || e.id === '324')) {
                v = true
                setValue({ ...value, [name]: e.id, pod: '' })
            } else if (name === 'shpType' && e.id === '434') {
                v = true
                setValue({ ...value, [name]: e.id, contType: '' })
            }
        }

        if ('client' in value) {
            if (name === 'delTerm' && (e.id === '32432' || e.id === '456' || e.id === '43214' || e.id === '567')) {
                v = true
                setValue({ ...value, [name]: e.id, pod: '' })
            }
        }

        if (e.id === 'EditTextDelTime') {
            v = true
            setValue({ ...value, 'isDeltimeText': true, 'deltime': '' })
        }

        !v && setValue({ ...value, [name]: e.id })
    }

    const Cncl = () => {
        setValue({ ...value, [name]: '' })
    }



    return (
        <div className="w-full">
            <Combobox by="id" value={selected} onChange={(e) => setSelection(e)} disabled={disabled} >
                <div className="relative my-1">
                    <div className={`relative w-full cursor-default overflow-hidden rounded-lg bg-white text-left 
                     focus:outline-none sm:text-sm border border-slate-400 ${classes}`}>
                        <ComboboxInput
                            className={`w-full py-1 pl-3 pr-10 text-xs ${classes2} leading-5 text-gray-900 focus:outline-none`}
                            displayValue={(value) => (data.find(y => y.id === value[name]) || {})[name] || value[name]}
                            onChange={(event) => setQuery(event.target.value)}
                        />
                        <ComboboxButton className="absolute inset-y-0 right-0 flex items-center pr-2">
                            {!dis && <MdClear
                                className="size-5 text-gray-100  hover:text-gray-400"
                                aria-hidden="true"
                                onClick={Cncl}
                            />}

                            <HiChevronUpDown
                                className="h-5 w-5 text-gray-400"
                                aria-hidden="true"
                            />
                        </ComboboxButton>
                    </div>
                    <Transition
                        as={Fragment}
                        leave="transition ease-in duration-100"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                        afterLeave={() => setQuery('')}
                    >
                      
                        <ComboboxOptions anchor="bottom" className={`w-[var(--input-width)] 
                        [--anchor-gap:var(--spacing-1)] empty:hidden border boder-1 border-slate-200
                        mt-1 max-h-60   rounded-md bg-white py-1 text-base shadow-lg  focus:outline-none 
                        sm:text-sm ${classes1} dropDownHeight`}>
                            {filteredData.length === 0 && query !== '' ? (
                                <div className="relative cursor-default select-none py-2 px-4 text-gray-700 text-xs">
                                    Nothing found.
                                </div>
                            ) : (
                                filteredData.map((x) => ( //slice(1)
                                    <ComboboxOption
                                        key={x.id}
                                        className={({ active }) =>
                                            `relative cursor-default select-none py-1 text-xs ${classes2} pl-10 pr-4 ${active ? 'bg-slate-400 text-white' : 'text-gray-900'}
                                            `
                                        }
                                        value={x}
                                        disabled={x.deleted}
                                    >
                                        {({ selected, active }) => (
                                            <>
                                                <span
                                                    className={`block truncate ${selected ? 'font-bold' : 'font-normal'
                                                        }
                                                        ${x.id === 'EditTextDelTime' || x.id === 'allStocks' ? 'font-semibold italic text-purple-900' : ''}
                                                        `}
                                                >
                                                    {x[name]}
                                                </span>
                                                {selected ? (
                                                    <span
                                                        className={`absolute inset-y-0 left-0 flex items-center pl-3 ${active ? 'text-white' : 'text-teal-600'
                                                            }`}
                                                    >
                                                        <AiOutlineCheck className="size-5" aria-hidden="true" />
                                                    </span>
                                                ) : null}
                                            </>
                                        )}
                                    </ComboboxOption>
                                ))
                            )}
                        </ComboboxOptions>
                    </Transition>
                </div>
            </Combobox>
        </div>
    )
}

export default MyCombobox;