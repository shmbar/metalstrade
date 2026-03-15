import { Fragment, useState } from 'react'
import {
    Combobox, Transition, ComboboxInput, ComboboxButton,
    ComboboxOptions, ComboboxOption
} from '@headlessui/react'
import { HiChevronUpDown } from 'react-icons/hi2';
import { cn } from '../../../../lib/utils';



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
                    <div className={`relative w-full cursor-default overflow-hidden rounded-2xl bg-white text-left 
                     focus:outline-none sm:text-sm border border-[var(--endeavour)] hover:border-[var(--endeavour)] transition-colors h-8 ${classes} items-center flex`}>
                        <ComboboxInput
                            className={cn('w-full py-2 pl-3 pr-10 text-xs leading-5 focus:outline-none',
                                selected[name] !== plcHolder ? 'text-[var(--endeavour)]' : 'text-[var(--endeavour)]')}
                            displayValue={(value) => (value || {})[name] || selected ? selected[name] : plcHolder}
                            onChange={(event) => setQuery(event.target.value)}
                        />
                        <ComboboxButton className="absolute inset-y-0 right-0 flex items-center pr-2">
                            <HiChevronUpDown
                                className="h-5 w-5 text-[var(--endeavour)]"
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
                        <ComboboxOptions className={`z-[9999] absolute mt-1 max-h-60 w-full overflow-auto custom-scroll rounded-xl
                        bg-white py-1 text-base shadow-lg border border-[#dbeeff] focus:outline-none
                        sm:text-sm ${classes1}`}>
                            {filteredData.length === 0 && query !== '' ? (
                                <div className="relative cursor-default select-none py-2 px-4 text-[var(--regent-gray)] text-xs">
                                    Nothing found.
                                </div>
                            ) : (

                                filteredData.map((x) => (
                                    <ComboboxOption
                                        key={x.id}
                                        className={cn(
                                            'relative cursor-default select-none py-1 text-xs pl-2 pr-2 text-[var(--port-gore)]',
                                            selected.id === x.id
                                                ? 'bg-[#dbeeff] text-[var(--endeavour)]'
                                                : 'hover:bg-[#dbeeff] hover:text-[var(--endeavour)]'
                                        )}
                                        value={x}
                                    >
                                        {({ focus, selected }) => (
                                            <span className={`block truncate ${selected ? 'font-bold' : 'font-normal'}`}>
                                                {x[name]}
                                            </span>
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
