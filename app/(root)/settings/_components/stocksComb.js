import { Fragment, useEffect, useState } from 'react'
import { Listbox, ListboxButton, Transition, ListboxOption, ListboxOptions } from '@headlessui/react'
import { AiOutlineCheck } from 'react-icons/ai';
import { HiChevronUpDown } from 'react-icons/hi2';

const types = [{ sType: "Warehouse" }, { sType: "Virtual" }]


const StockComb = ({ value, setValue }) => {

  const [selected, setSelected] = useState(value.sType === '' ? types[0] : types.find(x => x.sType === value.sType))

  const setSelection = (e) => {
    setSelected(e)
    setValue({ ...value, 'sType': e.sType })
  }

  useEffect(() => {
      setSelected(value.sType === '' ? types[0] : types.find(x => x.sType === value.sType))
  }, [value])


  return (
    <div className='w-full'>
      <Listbox value={selected} onChange={e=> setSelection(e)}>
        <div className="relative ">
          <ListboxButton className='cursor-pointer w-full h-8 rounded-full border border-[#E5E7EB] bg-white
                     focus:outline-none focus:border-[var(--endeavour)] focus:ring-2 focus:ring-[var(--endeavour)]/20
                     pl-4 pr-10 text-xs text-[var(--port-gore)] transition-all hover:border-[var(--rock-blue)] text-left'>
            <span className="block truncate">{value.sType === '' ? selected?.sType : value?.sType}</span>
            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
              <HiChevronUpDown
                className="size-5 text-[var(--regent-gray)]"
                aria-hidden="true"
              />
            </span>
          </ListboxButton>
          <Transition
            as={Fragment}
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <ListboxOptions className="absolute mt-1 max-h-60 w-full overflow-auto rounded-xl bg-white py-1 text-sm shadow-lg border border-[#dbeeff] focus:outline-none z-50">
              {types.map((tp, personIdx) => (
                <ListboxOption
                  key={personIdx}
                  className={({ active }) =>
                    `text-xs relative cursor-pointer select-none py-2 pl-10 pr-4 ${active ? 'bg-[#dbeeff] text-[var(--endeavour)]' : 'text-[var(--port-gore)]'
                    }`
                  }
                  value={tp}
                >
                  {({ selected, active }) => (
                    <>
                      <span
                        className={`block truncate ${selected ? 'font-bold' : 'font-normal'
                          }`}
                      >
                        {tp.sType}
                      </span>
                      {selected ? (
                        <span className={`absolute inset-y-0 left-0 flex items-center pl-3
                        ${active ? 'text-white' : 'text-[var(--endeavour)]'} `}
                        >
                          <AiOutlineCheck className="size-5" aria-hidden="true" />
                        </span>
                      ) : null}
                    </>
                  )}
                </ListboxOption >
              ))}
            </ListboxOptions >
          </Transition>
        </div>
      </Listbox>
    </div>
  )
}


export default StockComb;
