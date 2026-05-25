import React, { useContext, useEffect, useMemo, useState } from 'react'
import { GiCheckMark } from 'react-icons/gi';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@utils/firebase';
import { UserAuth } from "@contexts/useAuthContext";
import { SettingsContext } from "@contexts/useSettingsContext";
import { getTtl } from '@utils/languages';

const RefPurchaseInvoices = ({ valueCon, setValueCon, saveData_PoInvoices, ln }) => {

    const { uidCollection } = UserAuth();
    const { setToast } = useContext(SettingsContext);
    const [foreignContracts, setForeignContracts] = useState([]);

    const sourceRefs = useMemo(() => {
        const map = new Map();
        (valueCon.productsData || []).forEach(p => {
            const ref = p?.importedFrom;
            if (!ref?.id) return;
            const dateStr = typeof ref.date === 'string' ? ref.date : ref.date?.startDate;
            if (dateStr) map.set(ref.id, dateStr);
        });
        return Array.from(map, ([id, date]) => ({ id, date }));
    }, [valueCon.productsData]);

    const sourceRefsKey = useMemo(
        () => sourceRefs.map(r => `${r.id}:${r.date}`).sort().join('|'),
        [sourceRefs]
    );

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            const results = await Promise.all(sourceRefs.map(async (r) => {
                const year = r.date.substring(0, 4);
                const snap = await getDoc(doc(db, uidCollection, 'data', 'contracts_' + year, r.id));
                return snap.exists() ? snap.data() : null;
            }));
            if (!cancelled) setForeignContracts(results.filter(Boolean));
        };
        if (sourceRefs.length) load();
        else setForeignContracts([]);
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sourceRefsKey, uidCollection]);

    const rows = useMemo(() => {
        const local = (valueCon.poInvoices || []).map(p => ({ ...p, _source: null }));
        const foreign = foreignContracts.flatMap(c =>
            (c.poInvoices || []).map(p => ({
                ...p,
                _source: { id: c.id, order: c.order, date: c.dateRange?.startDate || c.date }
            }))
        );
        return [...local, ...foreign];
    }, [valueCon.poInvoices, foreignContracts]);

    const salesInvCols = useMemo(
        () => [...new Set((valueCon.invoices || []).map(x => x.invoice))],
        [valueCon.invoices]
    );

    const setRef = async (y, x) => {
        const has = y.invRef.includes(x.toString());

        // Within a single contract, keep the 1-to-1 PO-invoice ↔ sales-invoice rule.
        // For foreign (imported) rows, allow multiple refs since the same PO invoice
        // can legitimately be split across multiple contracts' sales invoices.
        if (!y._source && !has && y.invRef.length >= 1 && y.invRef[0] * 1 !== x) {
            setToast({
                show: true,
                text: `Purchase invoice ${y.inv} is already linked to sales invoice ${y.invRef[0]}. Unlink it first.`,
                clr: 'fail'
            });
            return;
        }

        const newArr = has ? y.invRef.filter(it => it !== x.toString()) : [...y.invRef, x.toString()];

        if (!y._source) {
            const newPOInvoices = valueCon.poInvoices.map(p => p.id === y.id ? { ...p, invRef: newArr } : p);
            const newValCon = { ...valueCon, poInvoices: newPOInvoices };
            setValueCon(newValCon);
            await saveData_PoInvoices(uidCollection, newValCon);
            return;
        }

        const source = foreignContracts.find(c => c.id === y._source.id);
        if (!source) return;

        const newPoInvoices = source.poInvoices.map(p => p.id === y.id ? { ...p, invRef: newArr } : p);
        const updatedSource = { ...source, poInvoices: newPoInvoices };

        const startDate = source.dateRange?.startDate || y._source.date;
        const year = startDate?.substring(0, 4);
        if (!year) return;

        await updateDoc(
            doc(db, uidCollection, 'data', 'contracts_' + year, source.id),
            { poInvoices: newPoInvoices }
        );
        setForeignContracts(prev => prev.map(c => c.id === source.id ? updatedSource : c));
    }

    return (
        <div className='relative'>
            <div className="flex relative">
                <div className="overflow-x-auto rounded-l-md">
                    <table className="w-full border border-r-0">
                        <thead className="divide-y divide-gray-200 ">
                            <tr className='text-center' >
                                <th className='font-medium responsiveTextTable bg-[#dbeeff] whitespace-nowrap h-10 px-3' rowSpan="2">{getTtl('POInvoices', ln)}</th>
                            </tr>

                        </thead>
                        <tbody className="divide-y divide-gray-200 ">
                            {rows.map((y) => (
                                <tr key={(y._source?.id || 'local') + '_' + y.id}>
                                    <td className={`bg-[#dbeeff] table_cell p-1 border border-r-0 responsiveTextTable
                                        whitespace-nowrap px-2 text-center ${y._source ? 'italic' : ''}`} >
                                        <div className='flex flex-col items-center leading-tight'>
                                            <span>{y.inv}</span>
                                            {y._source &&
                                                <span className='text-[0.6rem] text-[var(--regent-gray)]'>
                                                    {y._source.order}
                                                </span>
                                            }
                                        </div>
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
                                <th className='font-medium responsiveTextTable bg-[#dbeeff] h-5 whitespace-nowrap'
                                    colSpan={salesInvCols.length}>{getTtl('SalesInvoices', ln)}</th>
                            </tr>
                            <tr>
                                {salesInvCols.map((y, k) => (
                                    <th
                                        scope="col"
                                        key={k}
                                        className='bg-[#dbeeff] border-b px-3  responsiveTextTable font-medium text-[var(--chathams-blue)]
                                    h-5 text-center whitespace-nowrap'
                                    >
                                        {y}
                                    </th>

                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 ">
                            {rows.map((y) => (
                                <tr key={(y._source?.id || 'local') + '_' + y.id}>
                                    {salesInvCols.map((x, q) => (
                                        <td key={q} data-label={q} className={`table_cell py-1 border responsiveTextTable
                                        w-2 h-[1.55rem] cursor-pointer
                                        ${salesInvCols.length === 1 && 'flex w-full justify-center'}
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

export default RefPurchaseInvoices
