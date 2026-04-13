import { Fragment, useState } from 'react'
import { Listbox, Transition } from '@headlessui/react'
import { AiOutlineCheck } from 'react-icons/ai';
import { HiChevronDown, HiChevronUp } from 'react-icons/hi2';


export default function Example({ languages, compData, setCompData, lang }) {
  const [selected, setSelected] = useState(lang)

  const setSelection = (e) => {
    setSelected(e)
    if (typeof setCompData === 'function') {
      setCompData({ ...compData, 'lng': e.lng })
    }
  }

  return (
    <div className="w-36">
      <Listbox value={selected} onChange={(e) => setSelection(e)}>
        <div className="relative">
          <Listbox.Button className="cursor-pointer w-full h-8 rounded-full border border-[#E5E7EB] bg-white
                     focus:outline-none focus:border-[var(--endeavour)] focus:ring-2 focus:ring-[var(--endeavour)]/20 responsiveText
                     pl-4 pr-10 text-[var(--port-gore)] transition-all hover:border-[var(--rock-blue)] text-[0.75rem]">
            {({ open }) => (
              <>
                <span className="block truncate text-left">{selected?.lng || ''}</span>
                <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                  {open
                    ? <HiChevronUp className="h-4 w-4 text-[var(--endeavour)]" aria-hidden="true" />
                    : <HiChevronDown className="h-4 w-4 text-[var(--endeavour)]" aria-hidden="true" />
                  }
                </span>
              </>
            )}
          </Listbox.Button>
          <Transition
            as={Fragment}
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <Listbox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-xl bg-white py-1 responsiveText shadow-lg border border-[#dbeeff] focus:outline-none z-50 text-[0.75rem]">
              {languages.map((language, personIdx) => (
                <Listbox.Option
                  key={personIdx}
                  className={({ active }) =>
                    `relative cursor-pointer select-none py-2 pl-9 pr-4 ${active ? 'bg-[#dbeeff] text-[var(--endeavour)]' : 'text-[var(--port-gore)]'}`
                  }
                  value={language}
                >
                  {({ selected, active }) => (
                    <>
                      <span
                        className={`block truncate ${selected ? 'font-semibold text-[var(--endeavour)]' : 'font-normal'}`}
                      >
                        {language.lng}
                      </span>
                      {selected ? (
                        <span className="absolute inset-y-0 left-0 flex items-center pl-2 text-[var(--endeavour)]">
                          <AiOutlineCheck className="size-4" aria-hidden="true" />
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
