'use client'
import Modal from '@components/modal.js'
import { useContext, useEffect, useState } from 'react'
import { SettingsContext } from "@contexts/useSettingsContext";
import { ContractsContext } from "@contexts/useContractsContext";
import { UserAuth } from "@contexts/useAuthContext";

import ChkBox from '@components/checkbox';
import { v4 as uuidv4 } from 'uuid';
import { getTtl } from '@utils/languages';
import { loadData } from '@utils/utils';
import Datepicker from "react-tailwindcss-datepicker";
import { Button } from '@components/ui/button.jsx';
import { Save, CirclePlus, CircleMinus, Trash, ArrowBigRight, FileText, Download, X } from "lucide-react";
import DocumentImportOverlay from '@components/DocumentImportOverlay';

// Mutual-invoice mirroring (IMS ↔ GIS). Same account uids and counterpart supplier
// ids that CopyIMSGIS in contractDetails.js uses when copying contracts across.
const IMS_UID = 'DQ9gNTpvXqh6K9BqMTPTgCfxD2Z2';
const GIS_UID = 'aB3dE7FgHi9JkLmNoPqRsTuVwGIS';
const GIS_SUPPLIER_IN_IMS = 'f891ad09-aa67-4ba4-83f0-abe7040e0dd2';
const IMS_SUPPLIER_IN_GIS = '0dfe23d3-3199-4556-a178-07ad52529e37';

function countDecimalDigits(inputString) {
    const match = inputString.match(/(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/);
    if (!match) return 0;

    const decimalPart = match[1] || '';
    const exponentPart = match[2] || '';

    // Combine the decimal and exponent parts
    const combinedPart = decimalPart + exponentPart;

    // Remove leading zeros
    const trimmedPart = combinedPart.replace(/^0+/, '');

    return trimmedPart.length;
}


const PoInvModal = ({ isOpen, setIsOpen, setShowStockModal }) => {

    const { valueCon, setValueCon, saveData_payments, contractsData } = useContext(ContractsContext);
    const { settings, setToast, ln } = useContext(SettingsContext);
    const { uidCollection, gisAccount } = UserAuth();
    const [checkedItems, setCheckedItems] = useState([]);
    const [expand, setExpand] = useState(false)
    const [showDocImport, setShowDocImport] = useState(false)
    const [showMirror, setShowMirror] = useState(false)
    const [mirrorList, setMirrorList] = useState(null) // null = loading
    const [mirrorQuery, setMirrorQuery] = useState('')

    // The counterparty company for mutual (IMS ↔ GIS) trades, and whether this
    // contract is such a trade — matched by the known supplier id, with a name
    // fallback in case the supplier was re-created under a new id.
    const counterpartName = gisAccount ? 'IMS' : 'GIS';
    const counterpartUid = gisAccount ? IMS_UID : GIS_UID;
    const supName = settings?.Supplier?.Supplier?.find(s => s.id === valueCon?.supplier)?.nname || '';
    // Whole-word match so e.g. "XYZ Logistics" never matches GIS.
    const isMutual = valueCon?.supplier === (gisAccount ? IMS_SUPPLIER_IN_GIS : GIS_SUPPLIER_IN_IMS)
        || supName.toUpperCase().split(/[^A-Z]+/).includes(counterpartName);

    useEffect(() => {
        if (!valueCon?.poInvoices?.length) return;

        const arr = valueCon.poInvoices.map((item) => {

            if (item.payments == null) {
                const pmntPerc = item.invValue !== '' ? ((parseFloat(item.pmnt) / parseFloat(item.invValue) * 100)).toFixed(1) : 0;
                const pmnt = { pmntId: uuidv4(), pmntDate: null, pmntPerc, pmnt: item.pmnt, };
                return { ...item, payments: [pmnt] };
            }
            return item;
        });
        setValueCon({ ...valueCon, poInvoices: arr });
    }, []);




    const addComma = (nStr, addSymbol, item) => {
        nStr += '';
        var x = nStr.split('.');
        var x1 = x[0];
        var x2 = x.length > 1 ? '.' + x[1] : '';
        var rgx = /(\d+)(\d{3})/;
        while (rgx.test(x1)) {
            x1 = x1.replace(rgx, '$1,$2');
        }


        const symbol = valueCon.cur !== '' ? settings.Currency.Currency.find(x => x.id === valueCon.cur).symbol : ''
        x2 = x2.length > 3 ? x2.substring(0, 3) : x2
        if (x2.length === 2 && item === 'total') x2 = x2 + '0'
        return addSymbol ? (symbol + x1 + x2) : (x1 + x2);
    }


    const removeNonNumeric = (num) => {
        return num
            .toString()
            .replace(/[^0-9.-]/g, '')        // Keep digits, dot, and minus
            .replace(/(?!^)-/g, '')          // Remove any minus signs that aren't at the start
            .replace(/(\..*?)\..*/g, '$1');  // Remove all but the first dot
    };

    const handleValue = (e, x) => {

        setValueCon(prev => ({
            ...prev,
            poInvoices: prev.poInvoices.map(item => {
                if (item.id !== x.id) return item;

                // Editing the invoice number is a label change only — never touch payments.
                if (e.target.name === 'inv') {
                    return { ...item, inv: e.target.value };
                }

                // Editing the invoice value: rescale each payment by its stored percentage.
                const newInvValue = removeNonNumeric(e.target.value);
                const payments = item.payments.map(z => ({
                    ...z, pmnt: newInvValue * z.pmntPerc / 100
                }));
                const tmp = payments.reduce((t, obj) => t + (parseFloat(obj.pmnt) || 0), 0);

                return {
                    ...item,
                    invValue: newInvValue,
                    payments,
                    pmnt: tmp,
                    blnc: Math.round((newInvValue - tmp) * 100) / 100,
                };
            })
        }));
    }

    const handleDateChange = (e, x, y) => {
        setValueCon(prev => ({
            ...prev,
            poInvoices: prev.poInvoices.map((item) =>
                item.id === x.id ? {
                    ...item, payments: item.payments.map(z => z.pmntId === y.pmntId ?
                        { ...z, pmntDate: e } : z)
                } : item
            )
        }));
    };

    const handleValuePerc = (e, x, y) => {
        const isValidNumberWithOneDot = (str) => /^[0-9]*\.?[0-9]*$/.test(str);

        if (!isValidNumberWithOneDot(e.target.value)) return;
        if (e.target.value.length > 4) return;



        setValueCon(prev => ({
            ...prev,
            poInvoices: prev.poInvoices.map(item => {
                if (item.id !== x.id) return item;

                const payments = item.payments.map(z =>
                    z.pmntId === y.pmntId
                        ? { ...z, [e.target.name]: e.target.value, pmnt: (item.invValue * e.target.value) / 100 }
                        : z
                );

                let tmp = payments.reduce((t, obj) => t + (parseFloat(obj.pmnt) || 0), 0)

                return {
                    ...item,
                    payments,
                    pmnt: tmp,
                    blnc: Math.round((parseFloat(item.invValue) - tmp) * 100) / 100
                };
            })
        }));
    }

    const handleValuePmnt = (e, x, y) => {

        //    if (e.target.name === 'pmnt' && countDecimalDigits(e.target.value) > 4) return;
        //   if (e.target.name !== 'pmnt' && countDecimalDigits(e.target.value) > 2) return;
        if (countDecimalDigits(e.target.value) > 2) return;

        setValueCon(prev => ({
            ...prev,
            poInvoices: prev.poInvoices.map(item => {
                if (item.id !== x.id) return item;

                const payments = item.payments.map(z =>
                    z.pmntId === y.pmntId
                        ? {
                            ...z, [e.target.name]: removeNonNumeric(e.target.value),
                            pmntPerc: parseFloat((removeNonNumeric(e.target.value) * 100 / item.invValue).toFixed(2))
                        } : z
                );

                let tmp = payments.reduce((t, obj) => t + (parseFloat(obj.pmnt) || 0), 0)

                return {
                    ...item,
                    payments,
                    pmnt: tmp,
                    blnc: Math.round((parseFloat(item.invValue) - tmp) * 100) / 100
                };
            })
        }));

    }


    const checkItem = (i) => {
        if (checkedItems.includes(i)) {
            setCheckedItems(checkedItems.filter((x) => x !== i));
        } else {
            setCheckedItems([...checkedItems, i]);
        }
    };

    // Draft = keep this purchase invoice off the Cashflow (it's still saved on the contract).
    const toggleDraft = (x) => {
        setValueCon(prev => ({
            ...prev,
            poInvoices: prev.poInvoices.map(item => item.id === x.id ? { ...item, draft: !item.draft } : item)
        }));
    };



    const addInvoice = () => {

        let newPmnt = {
            id: uuidv4(), pmnt: '0', inv: '', invValue: '', invRef: [], blnc: '',
            payments: [{ pmntId: uuidv4(), pmntDate: null, pmntPerc: '', pmnt: '' }]
        }

        let pmntArr = [...valueCon.poInvoices, newPmnt]
        setValueCon({ ...valueCon, poInvoices: pmntArr })

    }

    // Create a new purchase-invoice row from a supplier invoice/proforma PDF the AI read.
    // Reuses the 'expense' document reader (vendor invoice number + amount) and maps its
    // output onto this modal's poInvoice shape (inv# + value); payments start empty.
    const addInvoiceFromDoc = (out) => {
        const val = out?.amount != null && out.amount !== '' ? String(out.amount) : '';
        const newInv = {
            id: uuidv4(),
            inv: out?.expense || '',
            invValue: val,
            pmnt: '0',
            blnc: val,
            invRef: [],
            payments: [{ pmntId: uuidv4(), pmntDate: null, pmntPerc: '', pmnt: '' }],
        };
        setValueCon(prev => ({ ...prev, poInvoices: [...(prev.poInvoices || []), newInv] }));
        setShowDocImport(false);
        setToast({ show: true, text: 'Purchase invoice read from PDF — review the values and Save', clr: 'success' });
    }

    // ── Mirror mutual invoices (IMS ↔ GIS) ─────────────────────────────────────
    // Both companies live in this system, so instead of retyping the counterparty's
    // invoice (the source of 1-cent rounding drift like 3948.46 vs 3948.47), pull
    // the EXACT issued figure straight from the other account. Read-only on the
    // other account — the poInvoice row is created/updated in the current one.
    const round2 = (n) => Math.round((parseFloat(n) || 0) * 100) / 100;

    const invSuffix = (q) => (q.invType === '1111' || q.invType === 'Invoice' || !q.invType) ? '' :
        (q.invType === '2222' || q.invType === 'Credit Note') ? ' CN' : ' FN';

    const openMirror = async () => {
        setShowMirror(true);
        setMirrorQuery('');
        setMirrorList(null);
        try {
            const yr = new Date().getFullYear();
            const invs = await loadData(counterpartUid, 'invoices', { start: `${yr - 1}-01-01`, end: `${yr}-12-31` });
            setMirrorList((invs || [])
                .filter(z => z && z.invoice !== undefined && z.invoice !== '')
                .sort((a, b) => String(b.date || '').localeCompare(String(a.date || ''))));
        } catch (e) {
            setMirrorList([]);
            setToast({ show: true, text: `Could not load ${counterpartName} invoices: ${e?.message || e}`, clr: 'fail' });
        }
    };

    const pickMirror = (inv) => {
        const exact = round2(inv.totalAmount);
        const num = String(inv.invoice).trim();
        const existing = (valueCon.poInvoices || []).find(p => String(p.inv).trim() === num);
        if (existing) {
            // Align the recorded value to the issued one. Payments stay untouched
            // (no percentage rescale — a cent alignment must not move payments);
            // only the balance is recomputed.
            setValueCon(prev => ({
                ...prev,
                poInvoices: prev.poInvoices.map(item => {
                    if (item.id !== existing.id) return item;
                    const paid = (item.payments || []).reduce((t, z) => t + (parseFloat(z.pmnt) || 0), 0);
                    return { ...item, invValue: String(exact), pmnt: paid, blnc: round2(exact - paid) };
                })
            }));
            setToast({ show: true, text: `Invoice ${num} aligned to the ${counterpartName} figure — review and Save`, clr: 'success' });
        } else {
            const newInv = {
                id: uuidv4(), inv: num, invValue: String(exact), pmnt: '0', blnc: String(exact), invRef: [],
                payments: [{ pmntId: uuidv4(), pmntDate: null, pmntPerc: '', pmnt: '' }],
                mirrored: { from: counterpartName, invoiceId: inv.id || '', date: inv.date || '' },
            };
            setValueCon(prev => ({ ...prev, poInvoices: [...(prev.poInvoices || []), newInv] }));
            setToast({ show: true, text: `Invoice ${num} pulled from ${counterpartName} — review and Save`, clr: 'success' });
        }
        setShowMirror(false);
    };

    const deleteItems = () => {

        let isExit = false

        checkedItems.forEach(id => {
            let tmpInvRef = valueCon.poInvoices.find(z => z.id === id).invRef
            if (tmpInvRef.length >= 1) {
                isExit = true
            }
        })

        if (isExit) {
            setToast({
                show: true,
                text: 'This invoice is relayed to customer invoice!', clr: 'fail'
            })
            return;
        }

        let delItems = valueCon.poInvoices.filter((item) => !checkedItems.includes(item.id));
        setValueCon({ ...valueCon, poInvoices: delItems });

        setCheckedItems([]);
    }

    // Use the CURRENT contract's purchase invoices (incl. ones added but not yet re-saved),
    // and never crash if the contract isn't in the persisted list — the old version read
    // contractsData.find(...).poInvoices, which threw / blocked, so the → arrow "didn't work".
    const checkIfAlllowed = () => (valueCon?.poInvoices?.length || 0) > 0

    const switchToStocks = () => {

        if (checkIfAlllowed()) {
            setIsOpen(false)
            setShowStockModal(true)
        } else {
            setToast({
                show: true,
                text: 'There are no saved invoices!', clr: 'fail'
            })
        }
    }

    const expandDiv = (id) => {
        expand !== id ? setExpand(id) : setExpand(null)
    }

    const addPaymnt = (x) => {
        let newArr = valueCon.poInvoices.map((item) => {
            if (item.id === x.id) {
                const pmnt = { pmntId: uuidv4(), pmntDate: null, pmntPerc: '', pmnt: '', };
                return { ...item, payments: [...item.payments, pmnt] };
            }
            return item;
        });

        setValueCon({ ...valueCon, poInvoices: newArr });
    }

    const deletePayment = (x, y) => {
        let newArr = valueCon.poInvoices.map((item) => {
            if (item.id === x.id) {
                let newPmntArr = item.payments.filter(z => z.pmntId !== y.pmntId);

                let tmp = newPmntArr.reduce((t, obj) => t + (parseFloat(obj.pmnt) || 0), 0)
                return { ...item, payments: newPmntArr, pmnt: tmp, blnc: Math.round((parseFloat(item.invValue) - tmp) * 100) / 100 };
            }
            return item;
        });
        setValueCon({ ...valueCon, poInvoices: newArr });
    }
    return (
        <Modal isOpen={isOpen} setIsOpen={setIsOpen} title={getTtl('POInvoices', ln)} w='max-w-5xl'>
            <div className='flex flex-col p-1 justify-between gap-2'>
                {valueCon.poInvoices.map((x, i) => {

                    return (
                        <div className='flex gap-4 p-1 border border-[#b8ddf8] rounded-2xl flex-col bg-[#f4f9ff]' key={x.id}>
                            <div className=''>
                                <div className='flex items-center'>
                                    <div className='items-center flex pt-3 pr-2'>
                                        <ChkBox checked={checkedItems.includes(x.id)} size='size-5' onChange={() => checkItem(x.id)} />
                                    </div>
                                    {expand !== x.id ?
                                        <CirclePlus className='mt-3 text-[var(--regent-gray)] mr-2 cursor-pointer' onClick={() => expandDiv(x.id)} />
                                        :
                                        <CircleMinus className='mt-3 text-[var(--regent-gray)] mr-2 cursor-pointer' onClick={() => expandDiv(x.id)} />
                                    }
                                    <div className='gap-3 flex'>
                                        <div className=''>
                                            <p className='flex responsiveTextTable font-medium whitespace-nowrap text-[var(--chathams-blue)]' > {getTtl('PurchaseInv', ln)}#:</p>
                                            <input type='text' className="number-separator input h-7 shadow-lg responsiveTextTable" name='inv'
                                                value={x.inv} onChange={e => handleValue(e, x)} />
                                        </div>
                                        <div className=''>
                                            <p className='flex responsiveTextTable font-medium whitespace-nowrap text-[var(--chathams-blue)]' >{getTtl('InvoiceValue', ln)}:</p>
                                            <input type='text' className="number-separator input h-7 shadow-lg responsiveTextTable" name='invValue'
                                                value={addComma(x.invValue, true)} onChange={e => handleValue(e, x)} />
                                        </div>
                                        <div className=''>
                                            <p className='flex responsiveTextTable font-medium whitespace-nowrap text-[var(--chathams-blue)]' >
                                                Total Payment:
                                            </p>
                                            <input type='text' className="number-separator input border-slate-300 h-7 responsiveTextTable" name='pmnt'
                                                value={addComma(x.pmnt || 0, true, 'total')} disabled />
                                        </div>
                                        <div className=''>
                                            <p className='flex responsiveTextTable font-medium whitespace-nowrap text-[var(--chathams-blue)]' >{getTtl('Balance', ln)}:</p>
                                            <div className='flex pr-3'>
                                                <input type='text' disabled className="number-separator input border-slate-300 h-7 responsiveTextTable" name='blnc'
                                                    style={{ color: Number(x.blnc) > 0 ? '#dc2626' : undefined }}
                                                    value={addComma(x.blnc, true, 'total')} />
                                                <div className='group relative'>
                                                    <ArrowBigRight className='text-[var(--regent-gray)] ml-3 cursor-pointer' onClick={switchToStocks} />
                                                    <span className="absolute hidden group-hover:flex top-[30px] w-fit p-1
    bg-slate-400 rounded-md text-center text-white responsiveTextTable z-10 whitespace-nowrap -left-2">
                                                        {getTtl('Stocks', ln)}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className=''>
                                            <p className='flex responsiveTextTable font-medium whitespace-nowrap text-[var(--chathams-blue)]'>Draft:</p>
                                            <label className='flex items-center gap-1.5 h-7 cursor-pointer' title='Draft — keep this purchase invoice off the Cashflow'>
                                                <input type='checkbox' checked={!!x.draft} onChange={() => toggleDraft(x)} className='w-4 h-4 accent-[var(--endeavour)]' />
                                                <span className='responsiveTextTable' style={{ color: x.draft ? '#b45309' : 'var(--regent-gray)' }}>{x.draft ? 'Hidden from Cashflow' : 'On Cashflow'}</span>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>


                            <div className={`w-full transition-all duration-300 ease-in-out ${expand === x.id
                                ? 'opacity-100 max-h-[1000px] py-1 pointer-events-auto'  // expanded: visible, big height, interactable
                                : 'opacity-0 max-h-0 py-0 pointer-events-none overflow-hidden' // collapsed: hidden, no pointer events
                                }`}
                            >
                                {x.payments?.map((y, k) => {
                                    return (
                                        <div key={k}>
                                            <div className='p-1 pl-28 flex items-center gap-6 flex-wrap'>
                                                <p className='responsiveTextTable text-[var(--regent-gray)]'>Payment #{k + 1}:</p>

                                                <div className='md:max-w-36 pt-2 md:pt-0'>
                                                    <p className='flex responsiveTextTable font-medium whitespace-nowrap text-[var(--chathams-blue)]' >{getTtl('Payment Date', ln)}:</p>
                                                    <div className='flex flex-col'>
                                                        <Datepicker useRange={false}
                                                            asSingle={true}
                                                            value={y.pmntDate}
                                                            popoverDirection='down'
                                                            onChange={e => handleDateChange(e, x, y)}
                                                            displayFormat={"DD-MMM-YYYY"}
                                                            inputClassName='input w-full shadow-lg h-7 responsiveTextTable'
                                                        />
                                                    </div>
                                                </div>

                                                <div className=''>
                                                    <p className='flex responsiveTextTable font-medium whitespace-nowrap text-[var(--chathams-blue)]' >Payment %:</p>
                                                    <div className='flex'>
                                                        <input type='text' className="number-separator input h-7  shadow-lg responsiveTextTable w-20" name='pmntPerc'
                                                            value={y.pmntPerc} onChange={e => handleValuePerc(e, x, y)} />
                                                        <span className='relative right-6 text-[var(--port-gore)] items-center flex'>%</span>
                                                    </div>
                                                </div>

                                                <div className=''>
                                                    <p className='flex responsiveTextTable font-medium whitespace-nowrap text-[var(--chathams-blue)]' >
                                                        {getTtl('Payment', ln)}:
                                                    </p>
                                                    <div className='flex'>
                                                        <input type='text' className="number-separator input shadow-lg h-7 responsiveTextTable w-28" name='pmnt'
                                                            value={addComma(y.pmnt, true)} onChange={e => handleValuePmnt(e, x, y)} />
                                                    </div>
                                                </div>

                                                <Button
                                                    className="h-7 px-3 mt-4 text-[var(--port-gore)] responsiveTextTable"
                                                    variant='outline'
                                                    onClick={() => deletePayment(x, y)}
                                                >
                                                    <Trash />
                                                    Delete payment
                                                </Button>
                                            </div>
                                        </div>
                                    )
                                })}
                                <div className='flex gap-4 p-2 border-t'>

                                    <Button
                                        className="h-7 px-2 text-[var(--regent-gray)]"
                                        variant='outline'
                                        onClick={() => addPaymnt(x)}
                                    >
                                        <CirclePlus />
                                        Add Payment
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )
                })}

            </div>
            <div className='flex gap-4 p-2 border-t'>
                <Button
                    className="h-8 px-3"
                    onClick={() => saveData_payments(uidCollection)}
                >
                    <Save className='scale-110' />
                    {getTtl('save', ln)}
                </Button>
                <Button
                    className="h-8 px-3"
                    variant='outline'
                    onClick={addInvoice}
                >
                    <CirclePlus />
                    Add Invoice
                </Button>

                <Button
                    className="h-8 px-3"
                    variant='outline'
                    onClick={() => setShowDocImport(true)}
                    title='Drop a supplier invoice/proforma PDF — AI reads the invoice number and value.'
                >
                    <FileText />
                    Autofill from PDF
                </Button>

                {isMutual && (
                    <Button
                        className="h-8 px-3"
                        variant='outline'
                        onClick={openMirror}
                        title={`Pull the exact invoice figure issued on the ${counterpartName} account — no retyping, no rounding differences.`}
                    >
                        <Download />
                        Pull from {counterpartName}
                    </Button>
                )}

                <Button
                    className="h-8 px-3"
                    variant='outline'
                    onClick={deleteItems}
                >
                    <Trash />
                    Delete Invoice
                </Button>
            </div>

            {showMirror && (
                <div className='fixed inset-0 z-50 flex items-center justify-center' style={{ background: 'rgba(16,42,74,0.35)' }}
                    onClick={() => setShowMirror(false)}>
                    <div className='bg-white rounded-2xl shadow-2xl w-[560px] max-w-[94vw] p-4 flex flex-col gap-2'
                        onClick={e => e.stopPropagation()}>
                        <div className='flex items-center justify-between'>
                            <p className='responsiveText font-semibold text-[var(--chathams-blue)]'>
                                Invoices issued on {counterpartName}
                            </p>
                            <X className='w-4 h-4 cursor-pointer text-[var(--regent-gray)]' onClick={() => setShowMirror(false)} />
                        </div>
                        <p className='responsiveTextTable text-[var(--regent-gray)]'>
                            Pick the {counterpartName} invoice for this contract — its exact figure is copied here, so both accounts match to the cent. Last 2 years shown.
                        </p>
                        <input type='text' className='input h-8 w-full responsiveTextTable' placeholder='Search invoice number…'
                            value={mirrorQuery} onChange={e => setMirrorQuery(e.target.value)} autoFocus />
                        <div className='max-h-[50vh] overflow-y-auto flex flex-col divide-y divide-[#d8e8f5] border border-[#d8e8f5] rounded-lg'>
                            {mirrorList === null ? (
                                <p className='p-3 responsiveTextTable text-[var(--regent-gray)]'>Loading {counterpartName} invoices…</p>
                            ) : (() => {
                                const q = mirrorQuery.trim().toLowerCase();
                                const rows = mirrorList.filter(z => !q || String(z.invoice).toLowerCase().includes(q));
                                if (!rows.length) return <p className='p-3 responsiveTextTable text-[var(--regent-gray)]'>No invoices found.</p>;
                                return rows.map(z => {
                                    const exact = round2(z.totalAmount);
                                    const rec = (valueCon.poInvoices || []).find(p => String(p.inv).trim() === String(z.invoice).trim());
                                    const recDiff = rec && round2(rec.invValue) !== exact;
                                    return (
                                        <button key={z.id || `${z.invoice}-${z.date}`} type='button'
                                            className='flex items-center justify-between gap-3 px-3 py-2 text-left hover:bg-[#f8fbff] transition-colors'
                                            onClick={() => pickMirror(z)}>
                                            <span className='responsiveTextTable font-medium text-[var(--port-gore)] whitespace-nowrap'>
                                                #{z.invoice}{invSuffix(z)}
                                            </span>
                                            <span className='responsiveTextTable text-[var(--regent-gray)] whitespace-nowrap'>{z.date || ''}</span>
                                            <span className='responsiveTextTable text-[var(--port-gore)] ml-auto whitespace-nowrap'>
                                                {(z.cur === 'us' ? '$' : z.cur === 'eu' ? '€' : '') +
                                                    new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(exact)}
                                            </span>
                                            {rec && (
                                                <span className='responsiveTextTable px-2 py-0.5 rounded-full whitespace-nowrap'
                                                    style={recDiff
                                                        ? { background: '#fee2e2', color: '#b91c1c' }
                                                        : { background: '#dcfce7', color: '#15803d' }}>
                                                    {recDiff ? 'recorded — value differs' : 'recorded ✓'}
                                                </span>
                                            )}
                                        </button>
                                    );
                                });
                            })()}
                        </div>
                    </div>
                </div>
            )}

            {showDocImport && (
                <DocumentImportOverlay
                    documentType='expense'
                    suppliers={settings?.Supplier?.Supplier || []}
                    clients={[]}
                    currencies={settings?.Currency?.Currency || []}
                    expenseTypes={settings?.Expenses?.Expenses || []}
                    anchorId={valueCon?.id}
                    onApply={addInvoiceFromDoc}
                    onClose={() => setShowDocImport(false)}
                />
            )}
        </Modal>
    )
}

export default PoInvModal