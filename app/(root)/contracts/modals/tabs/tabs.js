'use client'
import { useContext } from 'react'
import { Tab } from '@headlessui/react'
import Invoice from '../invoiceDetails'
import Contract from '../contractDetails';
import Profit from './pnl';
import Inventory from './inventory'
import { ContractsContext } from "../../../../../contexts/useContractsContext";
import { SettingsContext } from "../../../../../contexts/useSettingsContext";
import { getTtl } from '../../../../../utils/languages';

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
            <div className="border border-transparent border-gray-200 p-1">
                <div className="w-full px-0 ">
                    <Tab.Group >
                        <Tab.List className="max-w-xl flex space-x-1 p-1 bg-[#e8f4fd] rounded-full">
                            {tabs.map((z, i) => (
                                <Tab
                                    disabled={((i === 1 || i == 2 || i == 3) && valueCon.id === '') || isButtonDisabled}
                                    key={z}
                                    className={({ selected }) =>
                                        classNames(
                                            'w-full rounded-full py-1 px-2.5 text-[10px] font-medium leading-4 transition-all',
                                            'focus:outline-none',
                                            selected
                                                ? 'text-white bg-[#0b6eb6] shadow-sm'
                                                : 'text-[#0b6eb6] hover:bg-white/50'
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
