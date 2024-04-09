import { Menu, Transition } from '@headlessui/react'
import { getTtl } from '@utils/languages';
import { Fragment, useEffect, useRef, useState } from 'react'
import { BsThreeDotsVertical } from 'react-icons/bs';

export default function Example({ isSelection, selectOrEdit, indx, ln }) {
    return (
        <div>
            <Menu as="div" className="relative inline-block text-left items-center flex">
                <Menu.Button>
                    <BsThreeDotsVertical className='scale-125 font-medium' />
                </Menu.Button>
                <Transition
                    as={Fragment}
                    enter="transition ease-out duration-100"
                    enterFrom="transform opacity-0 scale-95"
                    enterTo="transform opacity-100 scale-100"
                    leave="transition ease-in duration-75"
                    leaveFrom="transform opacity-100 scale-100"
                    leaveTo="transform opacity-0 scale-95"
                >
                    <Menu.Items className="absolute z-10 left-0 mt-2 origin-top-right divide-y divide-gray-100 rounded-md bg-white shadow-lg ring-1 ring-black/5 focus:outline-none">
                        <div className="px-1 py-1 ">
                            <Menu.Item>
                                {({ active }) => (
                                    <button
                                        className={`${active ? 'bg-slate-500 text-white' : 'text-gray-900'
                                            } group flex w-full items-center rounded-md px-2 py-2 text-xs whitespace-nowrap`}
                                        disabled={!isSelection}
                                        onClick={() => selectOrEdit('1', indx)}
                                    >
                                        {getTtl('Edit Description', ln)}
                                    </button>
                                )}
                            </Menu.Item>
                            <Menu.Item>
                                {({ active }) => (
                                    <button
                                        className={`${active ? 'bg-slate-500 text-white' : 'text-gray-900'
                                            } group flex w-full items-center rounded-md px-2 py-2 text-xs whitespace-nowrap`}
                                        disabled={isSelection}
                                        onClick={() => selectOrEdit('2', indx)}
                                    >
                                        {getTtl('Original Description', ln)}
                                    </button>
                                )}
                            </Menu.Item>
                        </div>
                    </Menu.Items>
                </Transition>
            </Menu>
        </div>
    )
}

