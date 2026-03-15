import { Fragment, useState, useRef, useEffect } from 'react'
import {
    Combobox, Transition, ComboboxInput, ComboboxButton,
    ComboboxOptions, ComboboxOption, Portal
} from '@headlessui/react'
import { AiOutlineCheck } from 'react-icons/ai';
import { HiChevronUpDown } from 'react-icons/hi2';
import { cn } from '../lib/utils';



const MyComboboxSelectStock = ({ data, setValue, value, idx, name, classes, disabled, classes1, plcHolder }) => {

    const [selected, setSelected] = useState(value ?? { [name]: plcHolder })
    const [query, setQuery] = useState('')

    const wrapperRef = useRef(null)
    const [dropdownStyle, setDropdownStyle] = useState({})

    const updateDropdownStyle = () => {
        const el = wrapperRef.current
        if (!el) return
        const rect = el.getBoundingClientRect()
        setDropdownStyle({
            position: 'absolute',
            left: `${rect.left + window.scrollX}px`,
            top: `${rect.bottom + window.scrollY}px`,
            width: `${rect.width}px`,
            zIndex: 9999,
        })
    }

    useEffect(() => {
        updateDropdownStyle()
        window.addEventListener('resize', updateDropdownStyle)
        window.addEventListener('scroll', updateDropdownStyle, true)
        return () => {
            window.removeEventListener('resize', updateDropdownStyle)
            window.removeEventListener('scroll', updateDropdownStyle, true)
        }
    }, [])

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
        setValue(e, idx)
    }

    return (
        <div className="w-full" ref={wrapperRef}>
            <Combobox by="id" value={selected} onChange={(e) => setSelection(e)} disabled={disabled}>
                <div className="relative">
                    <div className={`relative w-full cursor-default overflow-hidden rounded-full bg-white text-left
                     focus:outline-none text-xs border border-[#b8ddf8] hover:border-[var(--endeavour)] transition-colors h-8 ${classes}`}>
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
                        <Portal>
                            <ComboboxOptions style={dropdownStyle} className={`z-50 max-h-60 overflow-auto custom-scroll rounded-xl
                            bg-white py-1 text-xs shadow-lg border border-[#dbeeff] focus:outline-none ${classes1}`}>
                            {filteredData.length === 0 && query !== '' ? (
                                <div className="relative cursor-default select-none py-2 px-4 text-[var(--regent-gray)] text-xs">
                                    Nothing found.
                                </div>
                            ) : (

                                filteredData.map((x) => ( //slice(1)
                                    <ComboboxOption
                                        key={x.id}
                                        className={cn(
                                            'relative cursor-default select-none py-1 text-[0.75rem] pl-10 pr-4 text-[var(--port-gore)] hover:bg-[#dbeeff] hover:text-[var(--endeavour)]',
                                            selected.id === x.id
                                                ? 'bg-[#dbeeff] text-[var(--endeavour)]'
                                                : '',
                                                x.id==='allStocks' ? 'text-[var(--chathams-blue)] italic font-bold truncate': ''
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
                                                        className="absolute inset-y-0 left-0 flex items-center pl-3 text-[var(--endeavour)]"
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
                        </Portal>
                    </Transition>
                </div>
            </Combobox>
        </div>
    )
}

export default MyComboboxSelectStock;
