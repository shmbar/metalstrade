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
                        <Tab.List className="max-w-xl flex space-x-1 p-1">
                            {tabs.map((z, i) => (
                                <Tab
                                    disabled={((i === 1 || i == 2 || i == 3) && valueCon.id === '') || isButtonDisabled}
                                    key={z}
                                    className={({ selected }) =>
                                        classNames(
                                            'w-full rounded-lg py-1 text-xs font-medium leading-4 ',
                                            'ring-white ring-opacity-60 focus:outline-none focus:ring-1',
                                            selected
                                                ? 'text-white bg-slate-500 shadow'
                                                : 'text-slate-600 hover:bg-slate-400 hover:text-white border border-slate-400'
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