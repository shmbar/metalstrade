import { useContext } from 'react'
import { InvoiceContext } from "@contexts/useInvoiceContext";

const MyModal = () => {

  const { copyInvoice, setCopyInvoice, setCopyInvValue } = useContext(InvoiceContext);

  const Cncl = () => {
    setCopyInvValue('')
    setCopyInvoice(false)
  }


  return (
    <>
      {copyInvoice &&
        <div className="relative z-50 transition-all ">
          <div className='max-w-72 max-h-32 text-white bg-slate-700 border border-slate-200 z-50
   fixed p-3 top-3 right-10 rounded-lg shadow-lg transition-all'>
            <div className='text-lg'>Please select the requested contract!</div>
            <div className='text-sm'>To paste the invoice, navigate to the 'Invoices' tab and click the 'Paste' button.</div>
            <button className='px-2 py-1 text-xs mt-2 border border-white rounded-lg z-50'
              onClick={Cncl}>Cancel</button>
          </div>
        </div>
      }
    </>
  )
}

export default MyModal;
