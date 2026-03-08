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
    <div className="container ">
      <Toast />
      <VideoLoader loading={loading} fullScreen={true} />
      <div className=" p-1 md:p-4 mt-[5%] bg-white">
        <div className="text-[14px] mt-5 text-[var(--chathams-blue)] font-poppins responsiveTextTitle border-l-4 border-[var(--chathams-blue)] pl-2">{getTtl('Settings', ln)}</div>

        <div className="w-full px-2 sm:px-0 mt-5">
          <TabGroup >
<TabList
  className="
    flex
    ml-1
    gap-3
    bg-transparent
    pb-0
    p-0
    overflow-x-auto
  "
>
              {tabs.map((z) => (
               <Tab
  key={z}
  className={({ selected }) =>
    classNames(
      'px-6 py-1.5 text-xs font-poppins whitespace-nowrap transition-all text-[var(--endeavour)] w-[140px]',
      'focus:outline-none',
      selected
        ? `
          rounded-full
          shadow-sm
          text-white
          bg-[var(--endeavour)]
        `
        : `
          text-[var(--endeavour)]
          rounded-full
          hover:bg-[var(--selago)]
        `
    )
  }
>
  {getTtl(z, ln)}
</Tab>

              ))}
            </TabList>
           <div
  className="
    relative
    mt-[-1px]
    rounded-xl
    border border-[var(--selago)]
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
