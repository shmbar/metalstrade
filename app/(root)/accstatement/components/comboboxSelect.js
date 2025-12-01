import { Fragment, useState } from 'react'
import {
    Combobox, Transition, ComboboxInput, ComboboxButton,
    ComboboxOptions, ComboboxOption
} from '@headlessui/react'
import { AiOutlineCheck } from 'react-icons/ai';
import { HiChevronUpDown } from 'react-icons/hi2';
import { cn } from '@lib/utils';



const MyComboboxSelectStock = ({ data, setValue, value, idx, name, classes, disabled, classes1, plcHolder }) => {

    const [selected, setSelected] = useState(value ?? { nname: plcHolder })
    const [query, setQuery] = useState('')

    const filteredData =
        query === ''
            ? data
            : data.filter((x) =>
                x[name]
                    .toLowerCase()
                    .replace(/\s+/g, '')
                    .includes(query.toLowerCase().replace(/\s+/g, ''))
            )

    const setSelection = (e) => {
        setSelected(e)
        setValue(e)
    }

    return (
        <div className="w-full">
            <Combobox by="id" value={selected} onChange={(e) => setSelection(e)} disabled={disabled}>
                <div className="relative">
                    <div className={`relative w-full cursor-default overflow-hidden rounded-lg bg-white text-left 
                     focus:outline-none sm:text-sm border border-slate-400 ${classes} items-center flex`}>
                        <ComboboxInput
                            className={cn('w-full pl-3 pr-10 text-md leading-5  focus:outline-none',
                                selected[name] !== plcHolder ? 'text-slate-900' : 'text-slate-400')}
                            displayValue={(value) => (value || {})[name] || selected ? selected[name] : plcHolder}
                            onChange={(event) => setQuery(event.target.value)}
                        />
                        <ComboboxButton className="absolute inset-y-0 right-0 flex items-center pr-2">
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
                        <ComboboxOptions className={`z-10 absolute mt-1 max-h-60 w-full overflow-auto rounded-md 
                        bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none 
                        sm:text-sm ${classes1}`}>
                            {filteredData.length === 0 && query !== '' ? (
                                <div className="relative cursor-default select-none py-2 px-4 text-gray-700 text-xs">
                                    Nothing found.
                                </div>
                            ) : (

                                filteredData.map((x) => ( //slice(1)
                                    <ComboboxOption
                                        key={x.id}
                                        className={cn(
                                            'relative cursor-default select-none py-1 text-xs pl-10 pr-4 text-gray-900 hover:bg-gray-200',
                                            selected.id === x.id
                                                ? 'bg-slate-400 text-white hover:bg-slate-400'
                                                : ''
                                        )}
                                        value={x}
                                    >
                                        {({ focus, selected }) => (
                                            <>
                                                <span
                                                    className={`block truncate ${selected ? 'font-bold' : 'font-normal'
                                                        }`}
                                                >
                                                    {x[name]}
                                                </span>
                                                {selected ? (
                                                    <span
                                                        className={`absolute inset-y-0 left-0 flex items-center pl-3 ${selected.id === x.id ? 'text-teal-600' : 'text-white'
                                                            }`}
                                                    >
                                                        <AiOutlineCheck className="h-5 w-5" aria-hidden="true" />
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

export default MyComboboxSelectStock;