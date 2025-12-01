'use client'
import React, { useContext } from 'react'
import { Tab, TabPanel, TabGroup, TabList, TabPanels } from '@headlessui/react'
import CompanyDetails from './tabs/general'
import Setup from './tabs/setup'
import Suppliers from './tabs/suppliers'
import Clients from './tabs/clients'
import BankAccount from './tabs/bankAccounts'
import Stocks from './tabs/stocks'
import Toast from '@components/toast.js'
import { SettingsContext } from "@contexts/useSettingsContext";
import { getTtl } from "@utils/languages";
import Users from './tabs/users'
import { UserAuth } from '@contexts/useAuthContext'
import Spin from '@components/spinTable';



function classNames(...classes) {
  return classes.filter(Boolean).join(' ')
}

const Page = () => {

  const { compData, loading } = useContext(SettingsContext);
  const ln = compData.lng
  const { userTitle } = UserAuth();

  let tabs = ['Company Details', 'Setup', 'Suppliers', 'Clients', 'Bank Account', 'Stocks']
  if (userTitle === 'Admin') tabs.push('Users');

  const SetDiv = (x) => {
    if (x === 0) {
      return <CompanyDetails />
    } else if (x === 1) {
      return <Setup />
    } else if (x === 2) {
      return <Suppliers />
    } else if (x === 3) {
      return <Clients />
    } else if (x === 4) {
      return <BankAccount />
    } else if (x === 5) {
      return <Stocks />
    } else if (x === 6) {
      return <Users />
    }
  }


  return (
    <div className="container mx-auto px-2 md:px-8 xl:px-10 pb-6 mt-16 md:mt-0">
      <Toast />
      {loading && <Spin />}
      <div className="border border-slate-200 rounded-xl p-1 md:p-4 mt-8 shadow-md">
        <div className="text-3xl p-1 pb-2 text-slate-500">  {getTtl('Settings', ln)}</div>

        <div className="w-full px-2 sm:px-0">
          <TabGroup >
            <TabList className="overflow-x-auto max-w-3xl flex space-x-1 rounded-xl bg-slate-400 p-1">
              {tabs.map((z) => (
                <Tab
                  key={z}
                  className={({ selected }) =>
                    classNames(
                      'w-full rounded-lg py-2.5 px-2 text-sm font-medium leading-5 whitespace-nowrap',
                      'ring-white ring-opacity-60 focus:outline-none focus:ring-1',
                      selected
                        ? 'text-slate-600 bg-white shadow'
                        : 'text-white hover:bg-slate-500 hover:text-white'
                    )
                  }
                >
                  {getTtl(z, ln)}
                </Tab>
              ))}
            </TabList>
            <TabPanels className="mt-4">
              {tabs.map((tab, idx) => (
                <TabPanel
                  key={idx}
                  className={classNames(
                    'rounded-xl bg-white',
                    'ring-white ring-opacity-60 focus:outline-none focus:ring-2'
                  )}
                >
                  {SetDiv(idx)}

                </TabPanel>
              ))}
            </TabPanels>
          </TabGroup>
        </div>


      </div>
    </div>
  )
}

export default Page