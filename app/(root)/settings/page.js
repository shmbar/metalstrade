'use client'
import React, { useContext } from 'react'
import { Tab, TabPanel, TabGroup, TabList, TabPanels } from '@headlessui/react'
import CompanyDetails from './tabs/general'
import Setup from './tabs/setup'
import Suppliers from './tabs/suppliers'
import Clients from './tabs/clients'
import BankAccount from './tabs/bankAccounts'
import Stocks from './tabs/stocks'
import Grades from './tabs/grades'
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

/* Panels by tab NAME. They used to be picked by position (0 → Company Details …
   8 → Users), so inserting a tab — Grades, next to Stocks — would have silently
   shifted every panel after it onto the wrong tab. */
const PANELS = {
  'Company Details': CompanyDetails,
  'Setup': Setup,
  'Suppliers': Suppliers,
  'Clients': Clients,
  'Bank Account': BankAccount,
  'Stocks': Stocks,
  'Grades': Grades,
  'Documents': Documents,
  'Email Setup': EmailSetup,
  'Users': Users,
}

const Page = () => {

  const { compData, loading } = useContext(SettingsContext);
  const ln = compData?.lng || 'English';
  const { canManageUsers } = UserAuth();

  let tabs = ['Company Details', 'Setup', 'Suppliers', 'Clients', 'Bank Account', 'Stocks', 'Grades', 'Documents', 'Email Setup']
  // Super Admins and Admins both manage people; the role hierarchy inside the
  // tab decides who each of them is allowed to touch.
  if (canManageUsers) tabs.push('Users');


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
    {tabs.map((tab) => {
      const Panel = PANELS[tab];
      return (
        <TabPanel
          key={tab}
          className="focus:outline-none"
        >
          {Panel ? <Panel /> : null}
        </TabPanel>
      );
    })}
  </TabPanels>
</div>

          </TabGroup>
        </div>


      </div>
    </div>
  )
}

export default Page
