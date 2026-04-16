import React from 'react'
import { GiCheckMark } from 'react-icons/gi';
import { UserAuth } from "@contexts/useAuthContext";
import { getTtl } from '@utils/languages';

const refPurchaseInvoices = ({ valueCon, setValueCon, saveData_PoInvoices, ln }) => {

    const { uidCollection } = UserAuth();

    const setRef = async (y, x) => {

        //avoid refering  one cotreact invoice to many customer invoices
        if (y.invRef.length >= 1 && y.invRef[0] * 1 !== x) return;

        let ref = y.invRef.includes(x.toString())
        let newArr = ref ? y.invRef.filter((item) => item !== x.toString()) :
            [...y.invRef, x.toString()]

        let newInvRef = { ...y, invRef: newArr }
        let newPOInvoices = valueCon.poInvoices.map(x => x.inv === y.inv ? newInvRef : x)
        let newValCon = { ...valueCon, poInvoices: newPOInvoices }
        setValueCon(newValCon)

        await saveData_PoInvoices(uidCollection, newValCon)
    }

    return (
        <div className='relative'>
            <div className="flex relative">
                <div className="overflow-x-auto rounded-l-md">
                    <table className="w-full border border-r-0">
                        <thead className="divide-y divide-gray-200 ">
                            <tr className='text-center' >
                                <th className='font-medium text-xs bg-[#dbeeff] whitespace-nowrap h-10 px-3' rowSpan="2">{getTtl('POInvoices', ln)}</th>
                            </tr>

                        </thead>
                        <tbody className="divide-y divide-gray-200 ">
                            {valueCon.poInvoices.map((y, i) => (
                                <tr key={i}>
                                    <td key={i} className='bg-[#dbeeff] table_cell p-1 border border-r-0 text-[0.7rem]
                                        whitespace-nowrap px-2 text-center ' >
                                        {y.inv}
                                    </td>

                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="rounded-r-md">
                    <table className="w-full border ">
                        <thead className="divide-y divide-gray-200 ">
                            <tr className='text-center' >
                                <th className='font-medium text-xs bg-[#dbeeff] h-5 whitespace-nowrap'
                                    colSpan={[... new Set(valueCon.invoices.map(x => x.invoice))].length}>{getTtl('SalesInvoices', ln)}</th>
                            </tr>
                            <tr>
                                {[... new Set(valueCon.invoices.map(x => x.invoice))].map((y, k) => (
                                    <th
                                        scope="col"
                                        key={k}
                                        className='bg-[#dbeeff] border-b px-3  text-[0.7rem] font-medium text-[var(--chathams-blue)]
                                    h-5 text-center whitespace-nowrap'
                                    >
                                        {y}
                                    </th>

                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 ">
                            {valueCon.poInvoices.map((y, i) => (
                                <tr key={i}>
                                    {[... new Set(valueCon.invoices.map(x => x.invoice))].map((x, q) => (
                                        <td key={q} data-label={q} className={`table_cell py-1 border text-[0.7rem]
                                        w-2 h-[1.55rem] cursor-pointer
                                        ${[... new Set(valueCon.invoices.map(x => x.invoice))].length === 1 && 'flex w-full justify-center'}
                                        ${y.invRef.includes(x.toString()) ? 'bg-slate-500 text-white hover:bg-slate-500' : 'hover:bg-slate-100'}
                                        `} onClick={e => setRef(y, x)} >

                                            {y.invRef.includes(x.toString()) && <GiCheckMark />}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )

}

export default refPurchaseInvoices