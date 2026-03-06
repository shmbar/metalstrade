import { useContext, useState } from 'react'
import { SettingsContext } from "../../../../contexts/useSettingsContext";
import { MdOutlineSaveAs } from 'react-icons/md';
import { UserAuth } from "../../../../contexts/useAuthContext";
import Spinner from '../../../../components/spinner';
//import Modal from '../../../../components/modalToProceed';
import CBox from '../_components/combobox.js'
import { getTtl } from '../../../../utils/languages'
import Logos from './logos.js';
import Tltip from '../../../../components/tlTip.js';

export const getLng = () => {
    return;
}

const languages = [{ lng: "English" }, { lng: "Русский" }]

const General = () => {
    const { compData, setCompData, updateCompanyData, setToast } = useContext(SettingsContext);
    const { uidCollection } = UserAuth();
    const ln = compData?.lng || 'English';
    // const [invNum, setInvNum] = useState('')

    //   const [isOpen, setIsOpen] = useState(false)
    // const setNum = async () => {
    //     let success = await saveDataSettings(uidCollection, 'invoiceNum', { num: invNum * 1 })
    //     success && setToast({ show: true, text: 'New number is saved!', clr: 'success' })
    // }


    return (
        <div>
            {compData && Object.keys(compData).length === 0 ?
                <Spinner />
                : <>
                    <div className='border border-[#E5E7EB] p-4 rounded-lg mt-1 flex flex-wrap md:flex-nowrap w-full space-x-4'>
                                    <div className='gap-4 flex items-center w-full' >
                            <p className='text-sm font-normal whitespace-nowrap  text-[var(--endeavour)]'>
                                {getTtl('cmpName', ln)}:</p>
                                <input
                                    type='input'
className="
  w-full
  h-8
  px-4
  rounded-full
  border
  border-[#E5E7EB]
  bg-white
  text-sm
  text-[#979797]
  outline-none
  transition
  focus:border-[#0A5DB8]
  focus:ring-2
  focus:ring-[#0A5DB8]/20
"

                                    value={compData?.name || ''}
                                    onChange={e => setCompData({ ...(compData || {}), name: e.target.value })}
                                />
                        </div>

                                    <div className='gap-4 flex items-center w-full' >
  <p className="text-sm font-normal  text-[var(--endeavour)]">
    {getTtl("lng", ln)}:
  </p>

  <div
    className="
      relative
      flex
      items-center
      w-full
      h-8
      px-4
      rounded-full
      border
      text-[#979797]
      border-[#E5E7EB]
      bg-white
      transition
      overflow-visible
      focus-within:border-[#0A5DB8]
      focus-within:ring-2
      focus-within:ring-[#0A5DB8]/20
    "
  >
    <CBox
      languages={languages}
      compData={compData}
      setCompData={setCompData}
      lang={languages.find(
        x => x.lng === (compData?.lng || "English")
      )}
    />
  </div>
</div>




                    </div>

                    <div className='border border-[#E5E7EB] p-4 rounded-lg mt-5'>
                        <div className='grid grid-cols-2 gap-4'>
                            <div className='col-span-12 sm:col-span-1'>
                                <div className='flex flex-col gap-2 max-w-sm'>
                                    <div className='gap-4 flex items-center' >
                                        <p className='text-sm font-normal  text-[var(--endeavour)]'>
                                            {getTtl('street', ln)}:</p>
                                        <input
                                            type='input'
className="
  w-full
  h-8
  px-4
    ml-4
  rounded-full
  border
  border-[#E5E7EB]
  bg-white
  text-sm
  text-[#979797]
  outline-none
  transition
  focus:border-[#0A5DB8]
  focus:ring-2
  focus:ring-[#0A5DB8]/20
"

                                            value={compData?.street || ''}
                                            onChange={e => setCompData({ ...(compData || {}), street: e.target.value })}
                                        />
                                    </div>
                                    <div className='flex gap-4 items-center ' >
                                        <p className='text-sm font-normal whitespace-nowrap  text-[var(--endeavour)]'>
                                            {getTtl('city', ln)}: </p>
                                        <input
                                            type='input'
className="
  w-full
  h-8
  px-4
  ml-7
  rounded-full
  border
  border-[#E5E7EB]
  bg-white
  text-sm
  text-[#979797]
  outline-none
  transition
  focus:border-[#0A5DB8]
  focus:ring-2
  focus:ring-[#0A5DB8]/20
"

                                            value={compData?.city || ''}
                                            onChange={e => setCompData({ ...(compData || {}), city: e.target.value })}
                                        />
                                    </div>
                                    <div className='col-span-12 md:col-span-1 flex gap-4 items-center' >
                                        <p className='text-sm font-normal whitespace-nowrap  text-[var(--endeavour)]'>
                                            {getTtl('country', ln)}:</p>
                                        <input
                                            type='input'
className="
  w-full
  h-8
  px-4
  rounded-full
  border
  border-[#E5E7EB]
  bg-white
  text-sm
  text-[#979797]
  outline-none
  transition
  focus:border-[#0A5DB8]
  focus:ring-2
  focus:ring-[#0A5DB8]/20
"

                                            value={compData?.country || ''}
                                            onChange={e => setCompData({ ...(compData || {}), country: e.target.value })}
                                        />
                                    </div>
                                    <div className='col-span-12 md:col-span-1 flex gap-4 items-center' >
                                        <p className='text-sm font-normal whitespace-nowrap  text-[var(--endeavour)]'>
                                            {getTtl('zipCode', ln)}:</p>
                                        <input
                                            type='input'
className="
  w-full
  h-8
  px-4
  rounded-full
  border
  border-[#E5E7EB]
  bg-white
  text-sm
  text-[#979797]
  outline-none
  transition
  focus:border-[#0A5DB8]
  focus:ring-2
  focus:ring-[#0A5DB8]/20
"

                                            value={compData?.zip || ''}
                                            onChange={e => setCompData({ ...(compData || {}), zip: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className='col-span-12 sm:col-span-1'>
                                <div className='flex flex-col gap-2 max-w-sm'>
                                    <div className='col-span-12 md:col-span-1 flex gap-4 items-center' >
                                        <p className='text-sm font-normal whitespace-nowrap  text-[var(--endeavour)]'>Reg No.:</p>
                                        <input
                                            type='input'
className="
  w-full
  h-8
  px-4
  rounded-full
  border
  border-[#E5E7EB]
  bg-white
  text-sm
  text-[#979797]
  outline-none
  transition
  focus:border-[#0A5DB8]
  focus:ring-2
  focus:ring-[#0A5DB8]/20
"

                                            value={compData?.reg || ''}
                                            onChange={e => setCompData({ ...(compData || {}), reg: e.target.value })}
                                        />
                                    </div>
                                    <div className='col-span-12 md:col-span-1 flex gap-4 items-center' >
                                        <p className='text-sm font-normal whitespace-nowrap  text-[var(--endeavour)]'>VAT No.:</p>
                                        <input
                                            type='input'
className="
  w-full
  h-8
  px-4
  rounded-full
  border
  border-[#E5E7EB]
  bg-white
  text-sm
  text-[#979797]
  outline-none
  transition
  focus:border-[#0A5DB8]
  focus:ring-2
  focus:ring-[#0A5DB8]/20
"

                                            value={compData?.vat || ''}
                                            onChange={e => setCompData({ ...(compData || {}), vat: e.target.value })}
                                        />
                                    </div>
                                    <div className='col-span-12 md:col-span-1 flex gap-4 items-center' >
                                        <p className='text-sm font-normal whitespace-nowrap  text-[var(--endeavour)]'>EORI No.:</p>
                                        <input
                                            type='input'
className="
  w-full
  h-8
  px-4
  rounded-full
  border
  border-[#E5E7EB]
  bg-white
  text-sm
  text-[#979797]
  outline-none
  transition
  focus:border-[#0A5DB8]
  focus:ring-2
  focus:ring-[#0A5DB8]/20
"

                                            value={compData?.eori || ''}
                                            onChange={e => setCompData({ ...(compData || {}), eori: e.target.value })}
                                        />
                                    </div>
                                </div>

                            </div>
                        </div>
                    </div>



                    <div className='border border-[#E5E7EB] p-4 rounded-lg  mt-5 w-full'>
                        <div className='grid grid-cols-2 gap-2 w-full'>
                            <div className='col-span-12 md:col-span-1 flex gap-4 items-center' >
                                <p className='text-sm font-normal whitespace-nowrap text-[var(--endeavour)]'>
                                    {getTtl('cmpemail', ln)}:</p>
                                <input
                                    type='input'
className="
  w-full
  h-8
  px-4
  rounded-full
  border
  border-[#E5E7EB]
  bg-white
  text-sm
  text-[#979797]
  outline-none
  transition
  focus:border-[#0A5DB8]
  focus:ring-2
  focus:ring-[#0A5DB8]/20
"
                                    value={compData?.email || ''}
                                    onChange={e => setCompData({ ...(compData || {}), email: e.target.value })}
                                />
                            </div>
                            <div className='col-span-12 md:col-span-1 flex gap-4 items-center' >
                                <p className='text-sm font-normal whitespace-nowrap text-[var(--endeavour)]'>
                                    {getTtl('cmpwebsite', ln)}:</p>
                                <input
                                    type='input'
className="
  w-full
  h-8
  px-4
  rounded-full
  border
  border-[#E5E7EB]
  bg-white
  text-sm
  text-[#979797]
  outline-none
  transition
  focus:border-[#0A5DB8]
  focus:ring-2
  focus:ring-[#0A5DB8]/20
"
                                    value={compData?.website || ''}
                                    onChange={e => setCompData({ ...(compData || {}), website: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>


                    <div className=' border border-[#E5E7EB] p-4 rounded-lg  mt-5 w-full'>
                        <div className='grid grid-cols-2 gap-2 w-full'>
                            <div className='col-span-12 md:col-span-1 flex gap-4 items-center' >
                                <p className='text-sm font-normal whitespace-nowrap   text-[var(--endeavour)]'>
                                    {getTtl('cmpPhone', ln)}:</p>
                                <input
                                    type='input'
className="
  w-full
  h-8
  px-4
  rounded-full
  border
  border-[#E5E7EB]
  bg-white
  text-sm
  text-[#979797]
  outline-none
  transition
  focus:border-[#0A5DB8]
  focus:ring-2
  focus:ring-[#0A5DB8]/20
"
                                    value={compData?.phone || ''}
                                    onChange={e => setCompData({ ...(compData || {}), phone: e.target.value })}
                                />
                            </div>
                            <div className='col-span-12 md:col-span-1 flex gap-4 items-center' >
                                <p className='text-sm font-normal whitespace-nowrap   text-[var(--endeavour)]'>
                                    {getTtl('cmpMobile', ln)}:</p>
                                <input
                                    type='input'
className="
  w-full
  h-8
  px-4
  rounded-full
  border
  border-[#E5E7EB]
  bg-white
  text-sm
  text-[#979797]
  outline-none
  transition
  focus:border-[#0A5DB8]
  focus:ring-2
  focus:ring-[#0A5DB8]/20
"
                                    value={compData?.mobile || ''}
                                    onChange={e => setCompData({ ...(compData || {}), mobile: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    {/* <div className=' border border-slate-300 p-4 rounded-lg  mt-5 w-full'>
                        <Logos compData={compData} setCompData={setCompData} />
                    </div> */}
                    <div className="flex mt-3 ml-3">
                        <Tltip direction='top' tltpText='Save/update company data'>
                            <button
                                    className="bg-[var(--endeavour)] border border-[var(--rock-blue)] text-white px-4 h-8 text-xs rounded-xl hover:bg-[var(--selago)]/30 transition-all"
                                onClick={() => updateCompanyData(uidCollection)}
                            >
                                {getTtl('save', ln)}
                            </button>
                        </Tltip>
                    </div>
                    {/*
                    <div className='flex flex-wrap gap-4 border border-slate-300 p-4 rounded-lg  mt-5 max-w-3xl'>

                        <div className='flex flex-wrap gap-4 items-center' >
                            <p className='text-sm font-medium whitespace-nowrap text-slate-600'>Start Invoice Number From:</p>
                            <input type='number' className='input max-w-[10rem] w-full  h-8' value={invNum}
                                onChange={(e) => setInvNum(e.target.value)} />
                        </div>


                        <button
                            className=" flex items-center justify-center text-white gap-1.5 border p-1 px-4
         border-slate-400 bg-slate-400 rounded-md  text-sm text-white hover:bg-slate-500 shadow-lg"
                            onClick={()=>setIsOpen(true)}
                        >
                            <MdOutlineSaveAs className='scale-110' />
                            Set
                        </button>

                    </div> */}
                </>}
            {/*    <Modal isDeleteOpen={isOpen} setIsDeleteOpen={setIsOpen}
                        ttl='Invoice Number' txt='To set a new number from which the next invoice will be received, please confirm to proceed.'
                        doAction={setNum} />
*/}
        </div >
    )
}

export default General
