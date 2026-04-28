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

  let tabs = ['Company Details', 'Setup', 'Suppliers', 'Clients', 'Bank Account', 'Stocks', 'Documents']
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
      return <Users />
    }
  }


  return (
    <div className="mx-auto w-full max-w-full px-1 md:px-2 pb-4 mt-[72px]">
      <Toast />
      <VideoLoader loading={loading} fullScreen={true} />
      <div className="p-1 md:p-4 bg-white rounded-2xl border border-[#b8ddf8] shadow-sm">
        <div className="mt-5 text-[var(--chathams-blue)] font-poppins text-[0.875rem] xl:text-[0.9375rem] 2xl:text-[1rem] 3xl:text-[1.0625rem] font-medium border-l-4 border-[var(--chathams-blue)] pl-2">{getTtl('Settings', ln)}</div>

        <div className="w-full px-3 mt-2 border border-[#b8ddf8] rounded-xl bg-white p-3">
          <TabGroup >
<TabList
  className="
    flex
    ml-1
    gap-4
    bg-transparent
    pb-2
    p-0
    overflow-x-auto
  "
>
              {tabs.map((z) => (
               <Tab
  key={z}
  className={({ selected }) =>
    classNames(
      'px-5 py-2 h-[32px] flex items-center text-[0.75rem] font-poppins whitespace-nowrap transition-all focus:outline-none rounded-full',
      selected
        ? `
          font-semibold
          text-white
          bg-[var(--endeavour)]
          shadow-md
          border border-[var(--endeavour)]
        `
        : `
          text-[var(--endeavour)]
          bg-[#dbeeff]
          border border-[#b8ddf8]
          font-medium
          hover:bg-[#c5e4f8]
          hover:border-[var(--endeavour)]
          hover:shadow-sm
        `
    )
  }
>
  {getTtl(z, ln) || z}
</Tab>

              ))}
            </TabList>
           <div
  className="
    relative
    mt-[-1px]
    rounded-xl
    border border-[#b8ddf8]
    bg-white
    shadow-sm
    p-3
  "
>
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
