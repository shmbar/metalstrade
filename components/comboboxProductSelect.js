import { Fragment, useEffect, useState, useRef, useLayoutEffect } from 'react'
import { Combobox, Transition, ComboboxOption, ComboboxButton, ComboboxOptions } from '@headlessui/react'
//import { CheckIcon, ChevronUpDownIcon } from '@heroicons/react/20/solid'
import { AiOutlineCheck } from 'react-icons/ai';
import { HiChevronUpDown } from 'react-icons/hi2';
import { loadStockDataPerDescription, filteredArray } from '@utils/utils'

const MyCombobox = ({ data, setValue, value, indx, name, classes, disabled, classes1, uidCollection }) => {

    const newArr = [{ id: '00000', ['description']: 'Select' }, ...data]
    const [selected, setSelected] = useState(value.productsDataInvoice[indx][name] === '' ? newArr[0] :
        data.find(x => x.id === value.productsDataInvoice[indx][name]))

    const [query, setQuery] = useState('')

    useEffect(() => {
        //when I clear a value
        if (value.productsDataInvoice[indx][name] === '' && selected.id !== '00000') {
            setSelected(newArr[0])
        }

    }, [value])




    const filteredData =
        query === ''
            ? newArr.slice(1)
            : newArr.slice(1).filter((x) =>
                x['description']
                    .toLowerCase()
                    .replace(/\s+/g, '')
                    .includes(query.toLowerCase().replace(/\s+/g, ''))
            )

    const setSelection = async (e) => {
        setSelected(e)
        //e = selected item of data

        let newObj = [...value.productsDataInvoice]

        //get the quantity in the selected stock
        let totalQnty = 0;
        if (newObj[indx]['stock'] !== '') {
            let stockData = await loadStockDataPerDescription(uidCollection, newObj[indx]['stock'], e.id)
            stockData = filteredArray(stockData) //Filter Original invoices if there is final invoice

            stockData.forEach(obj => {
                totalQnty += obj.type === 'in' ? parseFloat(obj.qnty * 1) : parseFloat(obj.qnty * -1);
            });
        }

        ////////////////////////////////////////////

        let itm = { ...newObj[indx], [name]: e.id, stockValue: totalQnty }

        newObj = newObj.map((x, i) => i === indx ? itm : x)
        setValue({ ...value, productsDataInvoice: newObj })
    }

    return (
        <div className="w-full">
            <Combobox by="id" value={selected} onChange={(e) => setSelection(e)} disabled={disabled}>
                <div className="my-1">
                    <div className={`relative w-full cursor-default overflow-hidden rounded-lg bg-white text-left 
                     focus:outline-none sm:text-sm border border-slate-400 ${classes}`}
                        >
                        <Combobox.Input
                            className="w-full py-1 pl-3 pr-10 text-xs leading-5 text-gray-900 focus:outline-none "
                            displayValue={() => (data.find(y => y.id === value.productsDataInvoice[indx][name]) || {})['description'] ||
                                selected['description']}
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
                        <ComboboxOptions className={`w-[var(--input-width)] z-10 absolute mt-1 max-h-60 overflow-auto rounded-md 
                        bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none 
                        sm:text-sm ${classes1}
                        [--anchor-gap:var(--spacing-1)]`} 
                        >
                            {filteredData.length === 0 && query !== '' ? (
                                <div className="relative cursor-default select-none py-2 px-4 text-gray-700 text-xs">
                                    Nothing found.
                                </div>
                            ) : (

                                filteredData.map((x) => ( //slice(1)
                                    <ComboboxOption
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
                                                    {x['description']}
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