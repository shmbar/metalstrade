import { Fragment, useEffect, useState, useRef } from 'react'
import { Combobox, Transition, ComboboxButton, ComboboxInput, ComboboxOption, ComboboxOptions, Portal } from '@headlessui/react'
import { AiOutlineCheck } from 'react-icons/ai';
import { HiChevronUpDown } from 'react-icons/hi2';
import { loadStockDataPerDescription, filteredArray } from '../utils/utils'


const MyCombobox = ({ data, setValue, value, dt, indx, name, classes, disabled, classes1, uidCollection }) => {

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
                x['stock']
                    .toLowerCase()
                    .replace(/\s+/g, '')
                    .includes(query.toLowerCase().replace(/\s+/g, ''))
            )


    const setSelection = async (e) => {
        setSelected(e)

        //e = selected item of data

        let itm = dt[indx]

        //get the quantity in the selected stock

        let stockData = await loadStockDataPerDescription(uidCollection, e.id, itm.descriptionId)
        stockData = filteredArray(stockData) //Filter Original invoices if there is final invoice

        let totalQnty = 0;
        stockData.forEach(obj => {
            totalQnty += obj.type === 'in' ? parseFloat(obj.qnty) : parseFloat(obj.qnty * -1);
        });
        ////////////////////////////////////////////

        itm = { ...itm, [name]: e.id, stockValue: totalQnty }

        //let newObj = [...dt]
        let newObj = dt.map((x, i) => i === indx ? itm : x)
        setValue({ ...value, productsDataInvoice: newObj })
    }

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

    return (
        <div className="w-full" ref={wrapperRef}>
            <Combobox by="id" value={selected} onChange={(e) => setSelection(e)} disabled={disabled}>
                <div className="my-1">
                    <div className={`relative w-full cursor-default overflow-hidden rounded-lg bg-white text-left 
                     focus:outline-none sm:text-sm border border-[var(--endeavour)] hover:border-[var(--endeavour)] transition-colors h-8 ${classes}`}>
                        <Combobox.Input
                            className="w-full py-2 pl-3 pr-10 text-xs leading-5 text-[var(--endeavour)] focus:outline-none "
                            displayValue={(value) => (data.find(y => y.id === dt[indx][name]) || {})[name] || selected[name]}
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
                            <ComboboxOptions style={dropdownStyle} className={`z-50 mt-1 max-h-60 overflow-auto rounded-md 
                            bg-white py-1 text-base shadow-lg ring-1 ring-[var(--selago)] focus:outline-none 
                            sm:text-sm ${classes1} `}>
                            {filteredData.length === 0 && query !== '' ? (
                                <div className="relative cursor-default select-none py-2 px-4 text-[var(--regent-gray)] text-xs">
                                    Nothing found.
                                </div>
                            ) : (

                                filteredData.map((x) => ( //slice(1)
                                    <ComboboxOption
                                        key={x.id}
                                        className={({ active }) =>
                                            `relative cursor-default select-none py-1 text-xs pl-10 pr-4 ${active ? 'bg-[var(--endeavour)] text-white' : 'text-[var(--port-gore)]'
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
                                                        className={`absolute inset-y-0 left-0 flex items-center pl-3 ${active ? 'text-white' : 'text-[var(--endeavour)]'
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
                        </Portal>
                    </Transition>
                </div>
            </Combobox>
        </div>
    )
}

export default MyCombobox;
