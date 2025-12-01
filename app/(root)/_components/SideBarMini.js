import { Fragment } from 'react'
import imsLogo from '@public/logo/logoNew.png';
import Image from 'next/image'
import { BiLogOutCircle } from 'react-icons/bi';
import { UserAuth } from "@contexts/useAuthContext";
import { useRouter } from "next/navigation";
import { Menu, MenuButton, Transition, MenuItems } from '@headlessui/react'
import { sideBar } from '@components/const'
import Link from 'next/link'
import { usePathname } from 'next/navigation';
import { FiSettings } from "react-icons/fi";
import { ImMenu } from "react-icons/im";
import CompanySelect from './companySelect';

const SideBarMini = () => {
  const pathName = usePathname();
  const router = useRouter()
  const { SignOut } = UserAuth();

  const LogOut = async () => {
    router.push("/");
    await SignOut();
  }

  return (
    <nav className="w-full h-fit flex shadow-sm bg-slate-200">
      <div className='flex w-full justify-between'>
        <div className='items-center flex'>
          <Menu as="div" className="relative inline-block text-left">
            <div className='flex h-full'>
              <MenuButton className="flex items-center justify-center px-4 text-lg text-slate-800 focus:outline-none">
                <ImMenu className='opacity-80' />
              </MenuButton>
            </div>
            <Transition
              as={Fragment}
              enter="transition ease-out duration-100"
              enterFrom="transform opacity-0 scale-95"
              enterTo="transform opacity-100 scale-100"
              leave="transition ease-in duration-75"
              leaveFrom="transform opacity-100 scale-100"
              leaveTo="transform opacity-0 scale-95"
            >
              <MenuItems className="absolute left-2 mt-2 w-48 origin-top-left divide-y divide-gray-100 rounded-md
               bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none h-[400px] overflow-auto">

                <div className="text-sm text-slate-600 px-2 pt-2">
                  <CompanySelect />
                </div>

                <ul className="flex-1 divide-slate-100 divide-y">
                  {sideBar().map((x, i) => {
                    return <div key={i}>
                      <div className='group pb-0 text-slate-800 font-medium overflow-hidden transition-all ml-2 pt-2'>
                        {x.ttl}
                      </div>
                      <div>
                        {x.items.map((y, k) => {
                          const isActive = pathName.slice(1) === y.page;

                          return (
                            <Link href={`${y.page}`} key={k}>
                              <div className="flex p-2 py-1 text-sm items-center ">
                                <div className={`gap-2  w-full text-gray-600 flex items-center p-2 hover:bg-slate-400 hover:text-white rounded-lg 
                         ${isActive ? 'text-white bg-slate-600' : 'text-slate-600'}`}>

                                  <div className='scale-125'>{y.img}</div>
                                  <div className={`flex justify-between items-center
              overflow-hidden leading-4`}  >
                                    <span className="text-[0.8rem] whitespace-nowrap">{y.item}</span>
                                  </div>

                                </div>
                              </div>
                            </Link>)
                        })}
                      </div>
                    </div>
                  })}
                </ul>

                <div className='divide-slate-100 divide-y'>
                  <Link href='/settings'>
                    <div className=" group flex p-2 text-slate-600 text-sm flex items-center ">
                      <div className=" w-full text-gray-600 flex items-center p-2 rounded-lg hover:bg-slate-400 hover:text-white">
                        <FiSettings className='scale-125' />
                        <div className='flex justify-between items-center ml-2 overflow-hidden leading-4 text-[0.8rem]'>
                          Settings
                        </div>
                      </div>
                    </div>
                  </Link>
                </div>
                <div className='divide-slate-500 divide-y'>
                  <div className=" group flex p-2 text-slate-600 text-sm flex items-center cursor-pointer" onClick={LogOut}>
                    <div className=" w-full text-gray-600 flex items-center p-2 rounded-lg hover:bg-slate-400 hover:text-white">
                      <BiLogOutCircle className='scale-125' />
                      <div className='flex justify-between items-center ml-2 overflow-hidden leading-4 text-[0.8rem]'>
                        Logout
                      </div>
                    </div>
                  </div>
                </div>

              </MenuItems>
            </Transition>
          </Menu>


        </div>
        <div className='p-2'>
          <Image
            src={imsLogo}
            className='overflow-hidden transition-all w-12'
            alt=""
            priority
          />
        </div>
      </div>
    </nav>
  )
}

export default SideBarMini

/* 
 <div className='flex-1'></div>
<div className='flex items-center gap-1 pr-2 text-sm text-slate-700' onClick={LogOut}>
          <BiLogOutCircle />
          Logout
        </div>

*/