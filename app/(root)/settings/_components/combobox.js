import { Fragment, useState } from 'react'
import { Listbox, Transition } from '@headlessui/react'
import { AiOutlineCheck } from 'react-icons/ai';
import { HiChevronUpDown } from 'react-icons/hi2';


export default function Example({ languages, compData, setCompData, lang }) {
  const [selected, setSelected] = useState(lang)

  const setSelection = (e) => {
    setSelected(e)
    setCompData({ ...compData, 'lng': e.lng })
  }

  return (
    <div className="w-full">
      <Listbox value={selected} onChange={(e) => setSelection(e)}>
        <div className="relative my-1">
          <Listbox.Button className='cursor-default rounded-md
                     focus:outline-none text-sm border border-slate-400 
                   py-1 pl-3 pr-10 text-slate-600 h-8 max-w-3xl w-32'>
            <span className="block truncate">{selected.lng}</span>
            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
              <HiChevronUpDown
                className="h-5 w-5 text-gray-400"
                aria-hidden="true"
              />
            </span>
          </Listbox.Button>
          <Transition
            as={Fragment}
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <Listbox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm">
              {languages.map((language, personIdx) => (
                <Listbox.Option
                  key={personIdx}
                  className={({ active }) =>
                    `relative cursor-default select-none py-2 pl-10 pr-4 ${active ? 'bg-slate-400 text-white' : 'text-slate-600'
                    }`
                  }
                  value={language}
                >
                  {({ selected, active }) => (
                    <>
                      <span
                        className={`block truncate ${selected ? 'font-bold' : 'font-normal'
                          }`}
                      >
                        {language.lng}
                      </span>
                      {selected ? (
                        <span className={`absolute inset-y-0 left-0 flex items-center pl-3
                        ${active ? 'text-white' : 'text-teal-600'} `}
                        >
                          <AiOutlineCheck className="size-5" aria-hidden="true" />
                        </span>
                      ) : null}
                    </>
                  )}
                </Listbox.Option>
              ))}
            </Listbox.Options>
          </Transition>
        </div>
      </Listbox>
    </div>
  )
}
