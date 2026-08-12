'use client'
import { useContext } from 'react'
import { Tab } from '@headlessui/react'
import Invoice from '../invoiceDetails'
import Contract from '../contractDetails';
import Profit from './pnl';
import Inventory from './inventory'
import CertChecker from '../CertChecker';
import { ContractsContext } from "@contexts/useContractsContext";
import { SettingsContext } from "@contexts/useSettingsContext";
import { getTtl } from '@utils/languages';

function classNames(...classes) {
    return classes.filter(Boolean).join(' ')
}

const Page = () => {
    const { valueCon, isButtonDisabled } = useContext(ContractsContext);
    const { ln } = useContext(SettingsContext);
    let tabs = ['Contract', 'Invoices', 'Shipments Tracking', 'Inventory', 'Certificate']

    const SetDiv = (x) => {
        if (x === 0) return <Contract />
        if (x === 1) return <Invoice />
        if (x === 2) return <Profit />
        if (x === 3) return <Inventory />
        if (x === 4) return <CertChecker />
    }


    return (
        <div>
            <div className="p-1">
                <div className="w-full px-0 ">
                    <Tab.Group >
                        <Tab.List className="inline-flex space-x-1 p-0.5 rounded-full bg-[var(--bg-subtle)] border border-[var(--line)]">
                            {tabs.map((z, i) => (
                                <Tab
                                    disabled={((i === 1 || i === 2 || i === 3 || i === 4) && valueCon.id === '') || isButtonDisabled}
                                    key={z}
                                    className={({ selected }) =>
                                        classNames(
                                            'rounded-lg py-1.5 px-4 responsiveTextInput font-medium leading-4 transition-colors whitespace-nowrap',
                                            'focus:outline-none disabled:opacity-40',
                                            selected
                                                ? 'bg-[var(--bg-card)] text-[var(--ink)] shadow-card'
                                                : 'text-[var(--ink-secondary)] hover:text-[var(--ink)]'
                                        )
                                    }
                                >
                                    {getTtl(z, ln) || z}
                                </Tab>
                            ))}
                        </Tab.List>
                        <Tab.Panels>
                            {tabs.map((tab, idx) => (
                                <Tab.Panel
                                    key={idx}
                                    className={classNames(
                                        'rounded-2xl bg-[var(--bg-card)]', ' focus:outline-none'
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
