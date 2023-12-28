import { useContext, useState } from 'react'
import { SettingsContext } from "@contexts/useSettingsContext";
import { MdOutlineSaveAs } from 'react-icons/md';
import { UserAuth } from "@contexts/useAuthContext";
import Spinner from '@components/spinner';
//import Modal from '@components/modalToProceed';

const General = () => {
    const { compData, setCompData, updateCompanyData, setToast } = useContext(SettingsContext);
    const { uidCollection } = UserAuth();
    const [invNum, setInvNum] = useState('')
    //   const [isOpen, setIsOpen] = useState(false)
    // const setNum = async () => {
    //     let success = await saveDataSettings(uidCollection, 'invoiceNum', { num: invNum * 1 })
    //     success && setToast({ show: true, text: 'New number is saved!', clr: 'success' })
    // }

    return (
        <div>
            {Object.keys(compData).length === 0 ?
                <Spinner />
                : <>
                    <div className=' border border-slate-300 p-4 rounded-lg mt-1'>
                        <div className='flex gap-4 items-center'>
                            <p className='text-sm font-medium whitespace-nowrap text-slate-600'>Company Name:</p>
                            <input type='input' className='input max-w-md w-full h-8' value={compData.name}
                                onChange={(e) => setCompData({ ...compData, 'name': e.target.value })} />
                        </div>
                    </div>

                    <div className='border border-slate-300 p-4 rounded-lg mt-5'>
                        <div className='grid grid-cols-2 gap-4'>
                            <div className='col-span-12 sm:col-span-1'>
                                <div className='flex flex-col gap-2 max-w-sm'>
                                    <div className='gap-4 flex items-center' >
                                        <p className='text-sm font-medium text-slate-600'>Street:</p>
                                        <input type='input' className='input w-full h-8' value={compData.street}
                                            onChange={(e) => setCompData({ ...compData, 'street': e.target.value })} />
                                    </div>
                                    <div className='flex gap-4 items-center ' >
                                        <p className='text-sm font-medium whitespace-nowrap text-slate-600'>City:</p>
                                        <input type='input' className='input max-w-sm h-8' value={compData.city}
                                            onChange={(e) => setCompData({ ...compData, 'city': e.target.value })} />
                                    </div>
                                    <div className='col-span-12 md:col-span-1 flex gap-4 items-center' >
                                        <p className='text-sm font-medium whitespace-nowrap text-slate-600'>Country:</p>
                                        <input type='input' className='input max-w-sm h-8' value={compData.country}
                                            onChange={(e) => setCompData({ ...compData, 'country': e.target.value })} />
                                    </div>
                                    <div className='col-span-12 md:col-span-1 flex gap-4 items-center' >
                                        <p className='text-sm font-medium whitespace-nowrap text-slate-600'>Zip Code:</p>
                                        <input type='input' className='input max-w-sm h-8' value={compData.zip}
                                            onChange={(e) => setCompData({ ...compData, 'zip': e.target.value })} />
                                    </div>
                                </div>
                            </div>
                            <div className='col-span-12 sm:col-span-1'>
                                <div className='flex flex-col gap-2 max-w-sm'>
                                    <div className='col-span-12 md:col-span-1 flex gap-4 items-center' >
                                        <p className='text-sm font-medium whitespace-nowrap text-slate-600'>Reg No.:</p>
                                        <input type='input' className='input max-w-sm h-8' value={compData.reg}
                                            onChange={(e) => setCompData({ ...compData, 'reg': e.target.value })} />
                                    </div>
                                    <div className='col-span-12 md:col-span-1 flex gap-4 items-center' >
                                        <p className='text-sm font-medium whitespace-nowrap text-slate-600'>VAT No.:</p>
                                        <input type='input' className='input max-w-sm h-8' value={compData.vat}
                                            onChange={(e) => setCompData({ ...compData, 'vat': e.target.value })} />
                                    </div>
                                    <div className='col-span-12 md:col-span-1 flex gap-4 items-center' >
                                        <p className='text-sm font-medium whitespace-nowrap text-slate-600'>EORI No.:</p>
                                        <input type='input' className='input max-w-sm h-8' value={compData.eori}
                                            onChange={(e) => setCompData({ ...compData, 'eori': e.target.value })} />
                                    </div>
                                </div>

                            </div>
                        </div>
                    </div>



                    <div className=' border border-slate-300 p-4 rounded-lg  mt-5 max-w-3xl'>
                        <div className='grid grid-cols-2 gap-4'>
                            <div className='col-span-12 md:col-span-1 flex gap-4 items-center' >
                                <p className='text-sm font-medium whitespace-nowrap text-slate-600'>Email Address:</p>
                                <input type='input' className='input max-w-md w-full  h-8' value={compData.email}
                                    onChange={(e) => setCompData({ ...compData, 'email': e.target.value })} />
                            </div>
                            <div className='col-span-12 md:col-span-1 flex gap-4 items-center' >
                                <p className='text-sm font-medium whitespace-nowrap text-slate-600'>Website:</p>
                                <input type='input' className='input max-w-md w-full h-8' value={compData.website}
                                    onChange={(e) => setCompData({ ...compData, 'website': e.target.value })} />
                            </div>
                        </div>
                    </div>


                    <div className=' border border-slate-300 p-4 rounded-lg  mt-5 max-w-3xl'>
                        <div className='grid grid-cols-2 gap-4'>
                            <div className='col-span-12 md:col-span-1 flex gap-4 items-center' >
                                <p className='text-sm font-medium whitespace-nowrap text-slate-600'>Phone:</p>
                                <input type='input' className='input max-w-md w-full  h-8' value={compData.phone}
                                    onChange={(e) => setCompData({ ...compData, 'phone': e.target.value })} />
                            </div>
                            <div className='col-span-12 md:col-span-1 flex gap-4 items-center' >
                                <p className='text-sm font-medium whitespace-nowrap text-slate-600'>Mobile:</p>
                                <input type='input' className='input max-w-md w-full h-8' value={compData.mobile}
                                    onChange={(e) => setCompData({ ...compData, 'mobile': e.target.value })} />
                            </div>
                        </div>
                    </div>

                    <div className="flex">

                        <button
                            className=" flex items-center justify-center text-white gap-1.5 mt-4 border p-1 px-4
         border-slate-400 bg-slate-400 rounded-md  text-sm text-white hover:bg-slate-500 shadow-lg"
                            onClick={() => updateCompanyData(uidCollection)}
                        >
                            <MdOutlineSaveAs className='scale-110' />
                            Save Company Data
                        </button>
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