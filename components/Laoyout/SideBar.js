"use client";
import { FaAngleLeft } from "react-icons/fa";
import { FaAngleRight } from "react-icons/fa";
import { useState, useContext } from "react"
import imsLogo from '@public/logo/imsLogo.png';
import Image from 'next/image'
import { FiSettings } from "react-icons/fi";
import { sideBar } from '@components/const'
import Link from 'next/link'
import { usePathname } from 'next/navigation';
import { SettingsContext } from "@contexts/useSettingsContext";



export default function Sidebar() {
  const [expanded, setExpanded] = useState(true)
  const pathName = usePathname();
  const { setDateSelect } = useContext(SettingsContext);
  const date11 = new Date();

  return (
    <aside className="h-screen">
      <nav className="h-full flex flex-col border-r shadow-sm bg-slate-100">
        <div className={`${expanded ? 'p-4 pb-2' : 'p-0 pt-2 px-1 pb-12'
          }  flex justify-between items-center`}>
          <Image
            src={imsLogo}
            className={`overflow-hidden transition-all ${expanded ? "w-36" : "w-8"
              }`}
            priority
            alt=""
          />
          <button
            onClick={() => setExpanded((curr) => !curr)}
            className="px-1 py-1 bg-slate-400 absolute -right-3 top-5 justify-center flex items-center rounded-full
    ring-stone-500 ring-1 text-white"
          >
            {expanded ? <FaAngleLeft className='scale-150 opacity-70' /> : <FaAngleRight className='scale-150 opacity-70' />}
          </button>
        </div>


        <ul className="flex-1 ">
          {sideBar.map((x, i) => {
            return <div key={i}>
              <div className={`group pb-0 text-slate-800 font-medium overflow-hidden transition-all ${expanded ? "ml-2 pt-2" : "hidden"}`}>
                {x.ttl}
              </div>
              <div>
                {x.items.map((y, k) => {
                  const isActive = pathName.slice(1) === y.page;

                  return (
                    <Link href={`${y.page}`} key={k} onClick={() => setDateSelect({ month: [(date11.getMonth() + 1).toString().padStart(2, '0')], year: date11.getFullYear() })}>
                      <div className="group flex p-2 py-1 text-sm flex items-center ">
                        <div className={`w-full text-gray-600 flex items-center p-2 hover:bg-slate-400 hover:text-white rounded-lg 
                         ${isActive ? 'text-white bg-slate-600' : 'text-slate-600'}`}>

                          <div className='scale-125'>{y.img}</div>
                          <div className={`flex justify-between items-center
              overflow-hidden ${expanded ? "ml-2" : "w-0"} leading-4`}  >
                            <span className="text-[0.8rem] whitespace-nowrap">{y.item}</span>
                          </div>

                        </div>
                        {!expanded && (
                          <div className={`absolute left-full rounded-md px-2 py-1 ml-3
          bg-slate-500 text-white text-sm invisible opacity-20 -translate-x-3 transition-all
          group-hover:visible group-hover:opacity-100 group-hover:translate-x-0 whitespace-nowrap`}
                          >
                            {y.item}
                          </div>
                        )}
                      </div>
                    </Link>)
                })}
              </div>
            </div>
          })}
        </ul>

        <Link href='/settings'>
          <div className=" group flex p-2 text-slate-600 text-sm flex items-center ">
            <div className=" w-full text-gray-600 flex items-center p-2 hover:bg-slate-400 hover:text-white border-black rounded-lg hover:border-l-slate-600">
              <FiSettings className='scale-125' />
              <div className={`flex justify-between items-center
              overflow-hidden ${expanded ? "ml-2" : "w-0"} leading-4`}  >
                <span className="text-[0.8rem]">Settings</span>
              </div>
            </div>
            {!expanded && (
              <div className={`absolute left-full rounded-md px-2 py-1 ml-3
          bg-slate-500 text-white text-sm invisible opacity-20 -translate-x-3 transition-all
          group-hover:visible group-hover:opacity-100 group-hover:translate-x-0 whitespace-nowrap`}
              >
                Settings
              </div>
            )}
          </div>
        </Link>
      </nav>
    </aside>
  )
}
