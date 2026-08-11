'use client'
import React, { useContext } from 'react'
import { Tab, TabPanel, TabGroup, TabList, TabPanels } from '@headlessui/react'
import CompanyDetails from './tabs/general'
import Setup from './tabs/setup'
import Suppliers from './tabs/suppliers'
import Clients from './tabs/clients'
import BankAccount from './tabs/bankAccounts'
import Stocks from './tabs/stocks'
import Toast from '../../../components/toast.js'
import { SettingsContext } from "../../../contexts/useSettingsContext";
import { getTtl } from "../../../utils/languages";
import Users from './tabs/users'
import Documents from './tabs/documents'
import EmailSetup from './tabs/emailSetup'
import { UserAuth } from '../../../contexts/useAuthContext'
import Spin from '../../../components/spinTable';
import VideoLoader from '../../../components/videoLoader';



function classNames(...classes) {
  return classes.filter(Boolean).join(' ')
}

const Page = () => {

  const { compData, loading } = useContext(SettingsContext);
  const ln = compData?.lng || 'English';
  const { userTitle } = UserAuth();

  let tabs = ['Company Details', 'Setup', 'Suppliers', 'Clients', 'Bank Account', 'Stocks', 'Documents', 'Email Setup']
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
      return <Documents />
    } else if (x === 7) {
      return <EmailSetup />
    } else if (x === 8) {
      return <Users />
    }
  }


  return (
    <div className="mx-auto w-full max-w-full px-1 md:px-2 pb-4 mt-[72px]">
      <Toast />
      <VideoLoader loading={loading} fullScreen={true} />
      <div>
        {/* Page header sits on the page background, like every other page */}
        <div className="page-header mt-6 mb-3 px-1">
          <h1 className="text-display">{getTtl('Settings', ln)}</h1>
          <p className="responsiveTextInput text-[var(--ink-muted)] mt-0.5">Suppliers, clients & app configuration</p>
        </div>

        <div className="w-full">
          <TabGroup >
<TabList className="inline-flex ml-1 gap-1 p-0.5 rounded-lg bg-[var(--bg-subtle)] border border-[var(--line)] overflow-x-auto">
              {tabs.map((z) => (
               <Tab
  key={z}
  className={({ selected }) =>
    classNames(
      'px-4 py-1.5 h-8 flex items-center responsiveTextInput whitespace-nowrap transition-colors focus:outline-none rounded-lg',
      selected
        ? 'font-medium text-[var(--ink)] bg-[var(--bg-card)] shadow-card'
        : 'font-medium text-[var(--ink-secondary)] hover:text-[var(--ink)]'
    )
  }
>
  {getTtl(z, ln) || z}
</Tab>

              ))}
            </TabList>
           <div className="page-card relative mt-3 rounded-2xl border border-[var(--line)] bg-[var(--bg-card)] shadow-card p-4">
  <TabPanels>
    {tabs.map((tab, idx) => (
      <TabPanel
        key={idx}
        className="focus:outline-none"
      >
        {SetDiv(idx)}
      </TabPanel>
    ))}
  </TabPanels>
</div>

          </TabGroup>
        </div>


      </div>
    </div>
  )
}

export default Page
