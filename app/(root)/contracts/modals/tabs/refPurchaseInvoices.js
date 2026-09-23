import React, { useEffect, useMemo, useState } from 'react'
import { Check } from 'lucide-react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@utils/firebase';
import { UserAuth } from "@contexts/useAuthContext";
import { getTtl } from '@utils/languages';
import { bustLoadCache } from '@utils/loadCache';
import { existingSalesInvoiceNumbers } from '@utils/utils';

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

    /* A tick for a sales invoice that has since been DELETED had no column to sit in,
       so it could be neither seen nor cleared — while the purchase invoice's delete
       guard went on counting it. Such links get a column of their own, marked removed,
       where they can only be cleared.

       "Not on this contract" is not enough to call a link dead: material imported from
       one PO and sold on another links to a sales invoice on the OTHER contract, and
       that link is real. So a candidate is looked up, and only a number that exists in
       no invoice year becomes a removed column. Only this contract's own purchase
       invoices are read: an imported row's links belong to its own contract. */
    const candidates = useMemo(() => {
        const live = new Set(salesInvCols.map(String));
        return [...new Set((valueCon.poInvoices || [])
            .flatMap(p => (Array.isArray(p.invRef) ? p.invRef : []).map(String))
            .filter(r => r && !live.has(r)))].sort();
    }, [valueCon.poInvoices, salesInvCols]);
    const candidatesKey = candidates.join('|');
    const [goneRefs, setGoneRefs] = useState([]);

    useEffect(() => {
        let cancelled = false;
        if (!candidates.length) { setGoneRefs([]); return; }
        existingSalesInvoiceNumbers(uidCollection, candidates)
            .then(found => { if (!cancelled) setGoneRefs(candidates.filter(c => !found.has(c))); })
            .catch(() => { if (!cancelled) setGoneRefs([]); });   // unsure → show nothing extra
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [candidatesKey, uidCollection]);

    const cols = useMemo(() => [
        ...salesInvCols.map(n => ({ n, stale: false })),
        ...goneRefs.map(n => ({ n, stale: true })),
    ], [salesInvCols, goneRefs]);

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
            {/* ONE table for the labels AND the checkboxes — do not split this back
                into two side-by-side tables. Two tables size their headers and rows
                independently, so the columns drift out of step ("stairs"): the sales
                side has two header rows to the purchase side's one, and label cells
                grow past the fixed row height whenever they carry the source-PO chip.
                A single table shares every row boundary by construction, which is
                what rowSpan={2} on the label header is for. The label column is
                sticky so it stays put when the matrix scrolls horizontally, and
                border-separate keeps the sticky cells' own borders (collapsed
                borders belong to the table, and sticky cells scroll away from them). */}
            <div className="overflow-x-auto rounded-2xl border border-[var(--line)]">
                <table className="w-full border-separate" style={{ borderSpacing: 0 }}>
                    <thead>
                        <tr className='text-center'>
                            <th rowSpan={2}
                                className='sticky left-0 z-sticky font-medium responsiveTextTable bg-[var(--bg-subtle)] text-[var(--chathams-blue)] whitespace-nowrap h-10 px-3 border-b border-r border-[var(--line)]'>
                                {getTtl('POInvoices', ln)}
                            </th>
                            <th colSpan={cols.length}
                                className='font-medium responsiveTextTable bg-[var(--bg-subtle)] text-[var(--chathams-blue)] h-5 whitespace-nowrap border-b border-[var(--line-strong)] text-center'>
                                {getTtl('SalesInvoices', ln)}
                            </th>
                        </tr>
                        <tr>
                            {cols.map((c, k) => (
                                <th
                                    scope="col"
                                    key={k}
                                    title={c.stale ? `Sales invoice ${c.n} no longer exists — click a tick to clear the leftover link` : undefined}
                                    className={`bg-[var(--bg-subtle)] border-b border-[var(--line)] px-3 responsiveTextTable font-medium
                                    h-5 text-center whitespace-nowrap ${c.stale ? 'text-[var(--warn-text)]' : 'text-[var(--chathams-blue)]'}`}
                                >
                                    {c.stale ? `${c.n} · removed` : c.n}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((y) => (
                            <tr key={(y._source?.id || 'local') + '_' + y.id}>
                                <td className={`sticky left-0 z-sticky bg-[var(--bg-subtle)] border-b border-r border-[var(--line-strong)] responsiveTextTable
                                    whitespace-nowrap px-3 h-11 text-center text-[var(--port-gore)] ${y._source ? 'italic' : ''}`} >
                                    <div className='flex flex-col items-center justify-center leading-tight gap-0.5'>
                                        <span className='font-medium'>{y.inv}</span>
                                        {y._source &&
                                            <span className='responsiveTextTable px-1.5 rounded-full bg-[var(--bg-subtle)] text-[var(--chathams-blue)] not-italic'>
                                                {y._source.order}
                                            </span>
                                        }
                                    </div>
                                </td>
                                {cols.map(({ n: x, stale }, q) => {
                                    const active = y.invRef.includes(x.toString());
                                    // A removed invoice can only be UNticked, and only on this contract's own rows.
                                    const clickable = !stale || (active && !y._source);
                                    return (
                                        <td
                                            key={q}
                                            data-label={q}
                                            title={stale && clickable ? 'Clear this leftover link' : undefined}
                                            className={`px-3 border-b border-r border-[var(--line-strong)] h-11 transition-colors
                                            ${clickable ? 'cursor-pointer' : 'cursor-default'}
                                            ${active && stale ? 'bg-[var(--warn-bg)]'
                                                : active ? 'bg-[var(--brand-soft)]'
                                                : clickable ? 'bg-[var(--bg-card)] hover:bg-[var(--bg-subtle)]' : 'bg-[var(--bg-card)]'}`}
                                            onClick={() => { if (clickable) setRef(y, x) }}
                                        >
                                            <div className='flex items-center justify-center'>
                                                <span className={`inline-flex items-center justify-center size-4 rounded-lg transition-all
                                                ${active
                                                        ? 'bg-[var(--endeavour)] text-[var(--on-brand)] shadow-sm'
                                                        : 'border border-[var(--line)] bg-[var(--bg-card)]'}`}>
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
