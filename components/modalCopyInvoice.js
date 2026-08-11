import { useContext } from 'react'
import { InvoiceContext } from "../contexts/useInvoiceContext";
import { SettingsContext } from "../contexts/useSettingsContext";
import { getTtl } from '../utils/languages.js';

const MyModal = () => {

  const { copyInvoice, setCopyInvoice, setCopyInvValue } = useContext(InvoiceContext);
  const { ln} = useContext(SettingsContext);
  const Cncl = () => {
    setCopyInvValue('')
    setCopyInvoice(false)
  }


  // Was `text-white bg-slate-700`. tailwind.config remaps slate-700 to
  // --text-strong, which is NEAR-WHITE in dark mode — so this notification was
  // white text on a white panel, i.e. unreadable. The brand surface is AA-fitted
  // against white in both modes, so it is safe here.
  return (
    <>
      {copyInvoice &&
        <div className="relative z-toast transition-all ">
          <div className='max-w-72 text-[var(--on-brand)] bg-[var(--endeavour)] border border-[var(--endeavour)] z-toast
   fixed p-3 top-3 right-10 rounded-2xl shadow-lg transition-all '>
            <div className="responsiveTextTitle font-medium">	{getTtl('copyInvoice', ln)}</div>
            <div className='responsiveTextTitle mt-2'>{getTtl('copyInvoiceTxt', ln)}</div>

            <button className='cursor-pointer px-2 py-1 responsiveTextInput mt-2 border border-[var(--on-brand)] rounded-lg z-toast'
              onClick={Cncl}>{getTtl('Cancel', ln)}</button>
          </div>
        </div>
      }
    </>
  )
}

export default MyModal;
