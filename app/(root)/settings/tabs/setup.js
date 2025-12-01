import React, { useEffect } from 'react'
import { useState, useContext } from 'react';
import List from '@components/list';
import { SettingsContext } from "@contexts/useSettingsContext";
import { UserAuth } from "@contexts/useAuthContext";
import { getTtl } from '@utils/languages';

const Setup = () => {

  const { settings, updateSettings, ln } = useContext(SettingsContext);
  const [keyName, setKeyName] = useState('Container Type')
  const [list, setList] = useState(settings[keyName]);
  const { uidCollection } = UserAuth();

  let listA = { ...settings };
  delete listA['Supplier'];
  delete listA['Client'];
  delete listA['Bank Account'];
  delete listA['InvTypes'];
  delete listA['ExpPmnt'];
  delete listA['Currency'];
  delete listA['Stocks'];

  useEffect(() => {
    setList(settings[keyName])
  }, [settings])

  const showList = (z) => {
    setKeyName(z)
    setList(settings[z])
  }

  const updateList = (newArrList, updateServer) => {
    const newObj = { ...list, [keyName]: newArrList }
    updateSettings(uidCollection, newObj, keyName, updateServer)
  }


  return (
    <div className='flex w-full border border-slate-300 py-1 md:py-4  rounded-lg mt-1'>
      <div className='flex w-full flex-col md:flex-row p-2 md:p-0'>

        <div className='px-1 md:px-10'>
          <ul className="flex flex-col overflow-auto mt-1 ring-1 ring-black/5 rounded-lg divide-y" >

            {Object.keys(listA).sort().map((x, i) => {
              return (
                <li key={i} onClick={() => showList(x)}
                  className={` justify-between inline-flex items-center gap-x-2 py-1.5 px-4
                   text-[0.8rem] text-slate-700 cursor-pointer ${x === keyName && 'font-bold bg-slate-100 '} 
                    hover:bg-slate-50 whitespace-nowrap`
                  }>
                  {x !== 'Hs' ? getTtl(x, ln) : x}
                </li>
              )
            })}

          </ul>
        </div>

        <div className="hidden sm:inline-block h-full min-h-[1em] w-px self-stretch bg-slate-200"></div>

        <div className='w-full  px-1 md:px-10 md:max-w-xl pt-4 md:pt-0'>
          <div className='border border-slate-300 p-4 rounded-lg mt-1 shadow-md '>
            <List list={list[keyName]} ttl={keyName} updateList={updateList}
              name={list['name']} />
          </div>
        </div>

      </div>
    </div>
  )
}

export default Setup;

/*

 

          */