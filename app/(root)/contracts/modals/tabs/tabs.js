'use client'
import { useContext } from 'react'
import { Tab } from '@headlessui/react'
import Invoice from '../invoiceDetails'
import Contract from '../contractDetails';
import Profit from './pnl';
import Inventory from './inventory'
import { ContractsContext } from "@contexts/useContractsContext";
import { SettingsContext } from "@contexts/useSettingsContext";
import { getTtl } from '@utils/languages';

function classNames(...classes) {
    return classes.filter(Boolean).join(' ')
}

const Page = () => {
    const { valueCon, isButtonDisabled } = useContext(ContractsContext);
    const { ln } = useContext(SettingsContext);
    let tabs = ['Contract', 'Invoices', 'Shipments Tracking', 'Inventory']

    const SetDiv = (x) => {

        if (x === 0) {
            return <Contract />
        } else if (x === 1) {
            return <Invoice />
        } else if (x === 2) {
            return <Profit />
        } else if (x === 3) {
            return <Inventory />
        }
    }


    return (
        <div>
            <div className="border border-transparent border-slate-200  p-1">
                <div className="w-full px-0 ">
                    <Tab.Group >
                        <Tab.List className="flex space-x-1 p-1">
                            {tabs.map((z, i) => (
                                <Tab
                                    disabled={((i === 1 || i == 2 || i == 3) && valueCon.id === '') || isButtonDisabled}
                                    key={z}
                                    className={({ selected }) =>
                                        classNames(
                                            'rounded-full py-1.5 px-4 text-xs font-medium leading-4 transition-colors whitespace-nowrap',
                                            'focus:outline-none',
                                            selected
                                                ? 'text-white bg-[var(--endeavour)] shadow-sm'
                                                : 'text-[var(--endeavour)] hover:bg-[var(--selago)] border-2 border-[#b8ddf8]'
                                        )
                                    }
                                >
                                    {getTtl(z, ln)}
                                </Tab>
                            ))}
                        </Tab.List>
                        <Tab.Panels>
                            {tabs.map((tab, idx) => (
                                <Tab.Panel
                                    key={idx}
                                    className={classNames(
                                        'rounded-xl bg-white', ' focus:outline-none'
                                    )}
                                >
                                    {SetDiv(idx)}

                                </Tab.Panel>
                            ))}
                        </Tab.Panels>
                    </Tab.Group>
                </div>


            </div>
        </div>
    )
}

export default Page