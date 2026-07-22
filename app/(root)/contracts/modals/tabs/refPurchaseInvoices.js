import React, { useEffect, useMemo, useState } from 'react'
import { Check } from 'lucide-react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@utils/firebase';
import { UserAuth } from "@contexts/useAuthContext";
import { getTtl } from '@utils/languages';
import { bustLoadCache } from '@utils/loadCache';

const RefPurchaseInvoices = ({ valueCon, setValueCon, saveData_PoInvoices, ln }) => {

    const { uidCollection } = UserAuth();
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
        const local = (valueCon.poInvoices || []).map(p => ({
            ...p,
            invRef: Array.isArray(p.invRef) ? p.invRef : [],
            _source: null,
        }));
        const foreign = foreignContracts.flatMap(c =>
            (c.poInvoices || []).map(p => ({
                ...p,
                invRef: Array.isArray(p.invRef) ? p.invRef : [],
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

        bustLoadCache(); // direct write (bypasses utils.js) — clear the page-load cache
        await updateDoc(
            doc(db, uidCollection, 'data', 'contracts_' + year, source.id),
            { poInvoices: newPoInvoices }
        );
        setForeignContracts(prev => prev.map(c => c.id === source.id ? updatedSource : c));
    }

    return (
        <div className='relative'>
            {/* ONE table for labels + checkboxes. The old layout was two separate
                side-by-side tables whose row heights drifted apart whenever a label
                cell grew taller (the source-PO chip rows), producing "stairs". A
                single table shares row heights by construction; the first column is
                sticky so the labels stay put if the matrix scrolls horizontally. */}
            <div className="overflow-x-auto rounded-2xl border border-[#b8ddf8]">
                <table className="w-full border-separate" style={{ borderSpacing: 0 }}>
                    <thead>
                        <tr className='text-center'>
                            <th rowSpan={2}
                                className='sticky left-0 z-10 font-medium responsiveTextTable bg-[#dbeeff] text-[var(--chathams-blue)] whitespace-nowrap h-10 px-3 border-b border-r border-[#b8ddf8]'>
                                {getTtl('POInvoices', ln)}
                            </th>
                            <th colSpan={salesInvCols.length}
                                className='font-medium responsiveTextTable bg-[#dbeeff] text-[var(--chathams-blue)] h-5 whitespace-nowrap border-b border-[#d8e8f5] text-center'>
                                {getTtl('SalesInvoices', ln)}
                            </th>
                        </tr>
                        <tr>
                            {salesInvCols.map((y, k) => (
                                <th
                                    scope="col"
                                    key={k}
                                    className='bg-[#dbeeff] border-b border-[#b8ddf8] px-3 responsiveTextTable font-medium text-[var(--chathams-blue)] h-5 text-center whitespace-nowrap'
                                >
                                    {y}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((y) => (
                            <tr key={(y._source?.id || 'local') + '_' + y.id}>
                                <td className={`sticky left-0 z-10 bg-[#f8fbff] border-b border-r border-[#d8e8f5] responsiveTextTable
                                    whitespace-nowrap px-3 h-11 text-center text-[var(--port-gore)] ${y._source ? 'italic' : ''}`} >
                                    <div className='flex flex-col items-center justify-center leading-tight gap-0.5'>
                                        <span className='font-medium'>{y.inv}</span>
                                        {y._source &&
                                            <span className='text-[0.6rem] px-1.5 rounded-full bg-[#dbeeff] text-[var(--chathams-blue)] not-italic'>
                                                {y._source.order}
                                            </span>
                                        }
                                    </div>
                                </td>
                                {salesInvCols.map((x, q) => {
                                    const active = y.invRef.includes(x.toString());
                                    return (
                                        <td
                                            key={q}
                                            data-label={q}
                                            className={`px-3 border-b border-r border-[#d8e8f5] h-11 cursor-pointer transition-colors
                                            ${active ? 'bg-[#dbeeff]' : 'bg-white hover:bg-[#f4f9ff]'}`}
                                            onClick={() => setRef(y, x)}
                                        >
                                            <div className='flex items-center justify-center'>
                                                <span className={`inline-flex items-center justify-center size-4 rounded-md transition-all
                                                ${active
                                                        ? 'bg-[var(--endeavour)] text-white shadow-sm'
                                                        : 'border border-[#b8ddf8] bg-white'}`}>
                                                    {active && <Check className='size-3' strokeWidth={3} />}
                                                </span>
                                            </div>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )

}

export default RefPurchaseInvoices
