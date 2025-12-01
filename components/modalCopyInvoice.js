import { useContext } from 'react'
import { InvoiceContext } from "@contexts/useInvoiceContext";
import { SettingsContext } from "@contexts/useSettingsContext";
import { getTtl } from '@utils/languages.js';

const MyModal = () => {

  const { copyInvoice, setCopyInvoice, setCopyInvValue } = useContext(InvoiceContext);
  const { ln} = useContext(SettingsContext);
  const Cncl = () => {
    setCopyInvValue('')
    setCopyInvoice(false)
  }


  return (
    <>
      {copyInvoice &&
        <div className="relative z-50 transition-all ">
          <div className='max-w-72 text-white bg-slate-700 border border-slate-200 z-50
   fixed p-3 top-3 right-10 rounded-lg shadow-lg transition-all '>
            <div className='text-lg'>	{getTtl('copyInvoice', ln)}</div>
            <div className='text-sm mt-2'>{getTtl('copyInvoiceTxt', ln)}</div>
           
            <button className='cursor-pointer px-2 py-1 text-xs mt-2 border border-white rounded-lg z-50'
              onClick={Cncl}>{getTtl('Cancel', ln)}</button>
          </div>
        </div>
      }
    </>
  )
}

export default MyModal;
