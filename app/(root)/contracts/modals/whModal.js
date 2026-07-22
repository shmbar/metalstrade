import Modal from '@components/modal.js'
import { useContext, useState, useEffect } from 'react'
import { SettingsContext } from "@contexts/useSettingsContext";
import { ContractsContext } from "@contexts/useContractsContext";
import Datepicker from "react-tailwindcss-datepicker";
import { UserAuth } from "@contexts/useAuthContext";

import ChkBox from '@components/checkbox';
import { v4 as uuidv4 } from 'uuid';
import { getD, loadStockData, validate } from '@utils/utils'
import { getTtl } from '@utils/languages';
import Tltip from '@components/tlTip';
import { Selector } from '@components/selectors/selectShad.js';
import { Button } from '@components/ui/button.jsx';
import { Save, CirclePlus, ScrollText, Trash, FileText, Copy, Pencil } from "lucide-react";
import DocumentImportOverlay from '@components/DocumentImportOverlay';



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


const PoInvModal = ({ isOpen, setIsOpen, setShowPoInvModal }) => {

    const { valueCon, setValueCon, saveData_stocks } = useContext(ContractsContext);
    const { settings, setToast, ln } = useContext(SettingsContext);
    const { uidCollection } = UserAuth();
    const [checkedItems, setCheckedItems] = useState([]);
    const [data, setData] = useState([]);
    const [errors, setErrors] = useState([])
    const [showDocImport, setShowDocImport] = useState(false)

    const handleValue = (e, i) => {
        let itm = valueCon.poInvoices[i]
        itm = { ...itm, [e.target.name]: e.target.value }
        let newObj = [...valueCon.poInvoices]
        newObj[i] = itm;
        setValueCon({ ...valueCon, poInvoices: newObj })
    }

    useEffect(() => {

        const loadStock = async () => {
            let stockData = valueCon.stock.length > 0 ? await loadStockData(uidCollection, 'id', valueCon.stock) : []

            stockData = stockData.sort((a, b) => {
                const dateA = a.indDate?.endDate ? new Date(a.indDate.endDate).getTime() : Infinity;
                const dateB = b.indDate?.endDate ? new Date(b.indDate.endDate).getTime() : Infinity;
                return dateA - dateB;
            })

            setData(stockData)
        }

        loadStock()
    }, [])

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
        x2 = x2.length > 3 && item === 'total' ? x2.substring(0, 3) : x2
        if (x2.length === 2 && item === 'total') x2 = x2 + '0'
        return addSymbol ? (symbol + x1 + x2) : (x1 + x2);
    }


    const removeNonNumeric = (num) => num.toString().replace(/[^0-9.\-]/g, "");


    const handleValuePmnt = (e, i) => {

        // if (countDecimalDigits(e.target.value) > 2) return;

        let itm = data[i]
        itm = { ...itm, [e.target.name]: removeNonNumeric(e.target.value) }

        if (e.target.name === 'unitPrc' && itm.qnty !== '') {
            itm = {
                ...itm,
                total: removeNonNumeric(itm.qnty) === '0' ? removeNonNumeric(itm.unitPrc) :
                    Math.round(removeNonNumeric(itm.qnty) * removeNonNumeric(itm.unitPrc) * 100) / 100
            }
        }

        let newObj = [...data]
        newObj[i] = itm;
        setData(newObj)
    }

    const handleValueQnty = (e, i) => {

        //   if (countDecimalDigits(e.target.value) > 3) return;

        let itm = data[i]
        itm = { ...itm, [e.target.name]: removeNonNumeric(e.target.value) }

        if (e.target.name === 'qnty' && itm.unitPrc !== '') {
            itm = {
                ...itm, total:
                    Math.round(removeNonNumeric(itm.qnty) * removeNonNumeric(itm.unitPrc) * 100) / 100
            }
        }

        let newObj = [...data]
        newObj[i] = itm;
        setData(newObj)
    }

    const checkItem = (i) => {
        if (checkedItems.includes(i)) {
            setCheckedItems(checkedItems.filter((x) => x !== i));
        } else {
            setCheckedItems([...checkedItems, i]);
        }
    };

    const checkItemSP = (i) => {
        setData(data.map(z => z.id === i ? { ...z, spInv: z.spInv ? !z.spInv : true } : z));
    };
    const checkItemDrft = (i) => {
        setData(data.map(z => z.id === i ? { ...z, draft: z.draft ? !z.draft : true } : z));
    };

    const handleValue1 = (e, i) => {
        setData(data.map((z, index) => index === i ? { ...z, [e.target.name]: e.target.value } : z));
    }

    let newStock = {
        id: uuidv4(), description: '', qnty: '', unitPrc: '', total: '', poInvoice: '', indDate: null, stock: '',
        spInv: false, compName: '', status: '', client: ''
    }

    // Autofill breakdown lines from the SUPPLIER INVOICE PDF (AI-read). Uses the invoice's
    // ACTUAL material + weight; every page/invoice in the bundle becomes its own line.
    //  • Weights convert to MT (LB × 0.45359237/1000, KGS ÷ 1000), rounded to 3 decimals.
    //  • The per-MT price is derived from the line's invoice total so qty × price reproduces
    //    the EXACT invoice amount (2-decimal price when that lands on the cent, else 3) —
    //    no more manual price/weight fiddling. The stored total IS the invoice figure.
    //  • Materials match the contract's products by word (prefix-tolerant, so
    //    "30% NI REF TURNINGS" finds "30Ni Refinery Turnings"), not by picking the first line.
    const LB_TO_MT = 0.45359237 / 1000, r2 = (n) => Math.round(n * 100) / 100, r3 = (n) => Math.round(n * 1000) / 1000;
    const words = (s) => String(s || '').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
    const nameScore = (a, b) => {
        const wa = words(a), wb = words(b);
        if (!wa.length || !wb.length) return 0;
        const hit = wa.filter(x => wb.some(y => y.startsWith(x) || x.startsWith(y))).length;
        return hit / Math.max(wa.length, wb.length);
    };
    const addFromDoc = (out) => {
        const products = valueCon.productsData || []
        const newProducts = [] // per-alloy entries created for unmatched lines (single-line POs)

        // Prefill the fields that are shared by every row of an import — otherwise a
        // 20-line container invoice meant picking the same date / warehouse / status /
        // purchase invoice 20 times over. Arrival date comes from the document's own
        // date; the purchase invoice is matched by the document's number (or taken
        // when the contract has exactly one); warehouse/status/consignee are
        // inherited from the first existing row when there is one.
        const firstRow = data[0] || null
        const normNo = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '')
        const docNo = normNo(out?.order)
        const poInvMatch = (docNo && (valueCon.poInvoices || []).find(pi => normNo(pi.inv) === docNo))
            || ((valueCon.poInvoices || []).length === 1 ? valueCon.poInvoices[0] : null)
        const sharedSeed = {
            indDate: out?.date ? { startDate: out.date, endDate: out.date } : (firstRow?.indDate ?? null),
            stock: firstRow?.stock || '',
            status: firstRow?.status || '',
            poInvoice: poInvMatch?.id || firstRow?.poInvoice || '',
            salesPo: firstRow?.salesPo || '',
            client: firstRow?.client || '',
        }
        const lines = (out?.productsData || []).map(p => {
            // Best word-overlap match ≥ 0.5 — never silently defaults to the first PO line
            // when there are several to choose between.
            const scored = products
                .map(x => ({ x, s: nameScore(p.description, x.description) }))
                .filter(m => m.s >= 0.5)
                .sort((a, b) => b.s - a.s)[0]?.x || null

            // Convert the document's unit to MT. When the invoice is already in MT, keep its
            // EXACT figure (0.9095 must not become 0.910 — the write-off against the sales
            // invoice uses this weight). Converted LB/KG weights keep 4 decimals, enough for
            // qty × price to reproduce the invoice total with the document's own unit price.
            const u = String(p.unit || '').toUpperCase()
            const factor = u.startsWith('LB') || u.startsWith('POUND') ? LB_TO_MT : u.startsWith('KG') ? 0.001 : 1
            const qtyMT = factor === 1
                ? (parseFloat(p.qnty) || 0)
                : Math.round((parseFloat(p.qnty) || 0) * factor * 10000) / 10000

            // Derive the per-MT price from the line's exact money total.
            const lineTotal = parseFloat(p.lineTotal)
            let unitPrc = '', total = ''
            if (qtyMT > 0 && Number.isFinite(lineTotal) && lineTotal !== 0) {
                const p2 = r2(lineTotal / qtyMT)
                unitPrc = r2(qtyMT * p2) === r2(lineTotal) ? p2 : r3(lineTotal / qtyMT)
                total = r2(lineTotal)                       // the invoice amount, exactly
            } else if (qtyMT > 0 && parseFloat(p.unitPrc)) {
                unitPrc = r2(parseFloat(p.unitPrc) / factor) // per-LB/KG price → per MT
                total = r2(qtyMT * unitPrc)
            }

            // Mixed-container invoices (e.g. Donald McArthy) bill 20+ alloys against a
            // single-line PO. Attaching them all to the PO line lost the alloy names —
            // every row displayed the PO's generic description. Instead, each unmatched
            // line becomes its own hidden product entry (import: true — the same pattern
            // findContract4Materials uses; excluded from the PO table, PDF and totals) so
            // the breakdown, stock and cashflow all show the invoice's real material name.
            // Multi-line POs keep the old behavior: unmatched lines stay blank for a
            // manual pick, since they're likelier a naming variant of an existing line.
            let match = scored
            if (!match && products.length === 1 && p.description) {
                const prod = {
                    id: uuidv4(), description: p.description,
                    qnty: qtyMT || '', unitPrc: unitPrc || '', total: total || '',
                    import: true, importedFrom: { doc: 'supplier-invoice' },
                }
                newProducts.push(prod)
                match = prod
            }
            return { ...newStock, ...sharedSeed, id: uuidv4(), description: match?.id || '', qnty: qtyMT || '', unitPrc, total }
        })
        if (newProducts.length) setValueCon(prev => ({ ...prev, productsData: [...(prev.productsData || []), ...newProducts] }))
        if (lines.length) setData(prev => [...prev, ...lines])
        setShowDocImport(false)
        const anyUnmatched = lines.some(l => !l.description)
        setToast({
            show: true,
            text: lines.length === 0 ? 'No material lines found on that document'
                : anyUnmatched ? `${lines.length} line${lines.length > 1 ? 's' : ''} read — pick the material for the unmatched one(s)`
                    : `${lines.length} line${lines.length > 1 ? 's' : ''} read from the invoice (weights in MT, totals exact)`,
            clr: lines.length === 0 || anyUnmatched ? 'fail' : 'success',
        })
    }

    const addItem = () => {
        // Prefill the material, weight (and unit price) from the contract's products — the next
        // product not already placed on a line, so repeated "Add" fills each in turn. This is
        // the "read the material and weight from the invoice" the breakdown gets for free from
        // the contract's own product list. Falls back to the first product, else a blank line.
        const products = valueCon.productsData || []
        const usedIds = data.map(d => d.description).filter(Boolean)
        const p = products.find(x => !usedIds.includes(x.id)) || products[0] || null
        const seed = p ? {
            description: p.id,
            qnty: p.qnty ?? '',
            unitPrc: p.unitPrc ?? '',
            total: ((parseFloat(p.qnty) || 0) * (parseFloat(p.unitPrc) || 0)) || '',
        } : {}
        setData([...data, { ...newStock, id: uuidv4(), ...seed }])
    }

    const deleteItems = () => {

        let delItems = data.filter((item) => !checkedItems.includes(item.id));
        setData(delItems)

        setCheckedItems([]);
    }

    const saveD = async () => {

        if (data.length >= valueCon.stock.length) { //add new item
            let errs = []
            let isNotFilled = false
            for (let i = 0; i < data.length; i++) {
                let tmp = { ...data[i] }
                if (tmp.spInv) {
                    tmp = { ...tmp, indDate: tmp?.indDate?.startDate ?? null }
                }
                // A purchase invoice link is only mandatory for special-invoice lines. Regular
                // stock can be added without one (e.g. material received, invoice not in yet) —
                // the poInvoice field stays and can be filled later.
                const required = tmp.spInv
                    ? ['description', 'qnty', 'unitPrc', 'poInvoice', 'indDate', 'stock']
                    : ['description', 'qnty', 'unitPrc', 'indDate', 'stock']
                errs[i] = validate(tmp, required)
                isNotFilled = Object.values(errs[i]).includes(true); //all filled
            }

            setErrors(errs)
            const hasTrueValue = errs.some(item => Object.values(item).includes(true));
            if (hasTrueValue) {
                setToast({ show: true, text: 'Some fields are missing!', clr: 'fail' })
                return;
            }
        }

        saveData_stocks(uidCollection, data)

    }

    const handleDateChange = (e, i) => {
        setData(prev =>
            prev.map((x, ind) => ind === i ? { ...x, indDate: e } : x)
        );
    };

    const openInvoicesModal = () => {
        setIsOpen(false)
        setShowPoInvModal(true)
    }

    // One click instead of ~80: fill the FIRST row's shared fields (arrival date,
    // warehouse, status, purchase invoice, sales PO, consignee, draft) and copy
    // them to every row below. A field left empty on the first row keeps each
    // row's own value.
    const copyFirstRowDown = () => {
        if (data.length < 2) return;
        const src = data[0];
        setData(prev => prev.map((row, i) => i === 0 ? row : ({
            ...row,
            indDate: src.indDate ?? row.indDate,
            stock: src.stock || row.stock,
            status: src.status || row.status,
            poInvoice: src.poInvoice || row.poInvoice,
            salesPo: src.salesPo || row.salesPo,
            client: src.client || row.client,
            draft: src.draft ?? row.draft,
        })));
        setToast({ show: true, text: 'First row\'s date, stock, status and invoice copied to all rows below', clr: 'success' });
    }

    const statusArr = [{ id: 'sold', status: 'Sold' }, { id: 'unsold', status: 'Unsold' }]

    // Inline rename for per-alloy names created by the invoice import. Rough scans
    // misprint characters (a '?' where the paper says '7'), and these import-flagged
    // products appear nowhere else in the UI to correct. Renaming updates the
    // contract's product entry, and Save re-snapshots productsData onto every lot,
    // so one fix propagates to the breakdown, stocks, cashflow and grade tables.
    const [editNameRow, setEditNameRow] = useState(null)
    const prodOf = (row) => (valueCon.productsData || []).find(p => p.id === row.description)
    const renameImportProduct = (prodId, name) => setValueCon(prev => ({
        ...prev,
        productsData: (prev.productsData || []).map(p => p.id === prodId ? { ...p, description: name } : p),
    }))


    const handleChange = (e, name, indx) => {
        if (name === 'description') {
            const current = data[indx];

            // unit price
            let unitPrc = valueCon.productsData.find(q => q.id === e)?.unitPrc ?? 0;

            unitPrc = isNaN(Number(unitPrc)) ? 0 : Number(unitPrc);

            // calculate total
            const qnty = current.qnty;
            let total = current.total;

            if (unitPrc !== "" && qnty !== "") {
                total = qnty === "0" ? unitPrc : unitPrc * Number(qnty);
            }

            const updatedItem = { ...current, [name]: e, unitPrc, total, };

            setData(prev =>
                prev.map((item, i) => (i === indx ? updatedItem : item))
            );

        } else if (name === 'poInvoice' || name === 'stock' || name === 'status' || name === 'client') {
            setData(prev =>
                prev.map((item, i) =>
                    i === indx ? { ...item, [name]: e } : item
                )
            );
        }
    }

    const clear = (name, row) => {
        setData(prev =>
            prev.map((item, i) =>
                i === row ? { ...item, [name]: '' } : item
            )
        );
    }

    return (
        <Modal isOpen={isOpen} setIsOpen={setIsOpen} title={getTtl('Materials Breakdown', ln)}
            w={data.map(z => z.spInv).includes(true) ? 'max-w-[1660px]' : 'max-w-[1540px]'}>
            <div className='flex flex-col p-1 justify-between gap-2 '>
                {data.map((x, i) => {

                    return (
                        <div className='flex flex-wrap p-1 gap-2 border border-[#b8ddf8] rounded-2xl bg-[#f4f9ff]' key={x.id}>
                            <div className='flex'>
                                <div className='items-center flex pt-3 pr-2'>
                                    <ChkBox checked={checkedItems.includes(x.id)} size='h-5 w-5' onChange={() => checkItem(x.id)} />
                                </div>
                                <div className='md:max-w-52 w-full pt-2 md:pt-0'>
                                    <p className='flex responsiveTextTable font-medium whitespace-nowrap text-[var(--chathams-blue)]' >{getTtl('Description', ln)}:</p>
                                    <div className='flex items-center gap-1 w-44'>
                                        {editNameRow === x.id && prodOf(x)?.import ? (
                                            <input
                                                className='input h-7 shadow-lg responsiveTextTable w-36'
                                                value={prodOf(x)?.description || ''}
                                                autoFocus
                                                onChange={e => renameImportProduct(x.description, e.target.value)}
                                                onBlur={() => setEditNameRow(null)}
                                                onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') setEditNameRow(null); }}
                                            />
                                        ) : (
                                            <div className='flex flex-col w-36'>
                                                <Selector
                                                    arr={valueCon.productsData} value={data[i]}
                                                    onChange={(e) => handleChange(e, 'description', i)}
                                                    name='description' classes='h-7'
                                                />
                                            </div>
                                        )}
                                        {prodOf(x)?.import && editNameRow !== x.id && (
                                            <Tltip direction='top' tltpText='Fix the material name (e.g. a character misread from the scan). Applies everywhere after Save.'>
                                                <Pencil className='w-3.5 h-3.5 shrink-0 cursor-pointer text-[var(--regent-gray)] hover:text-[var(--endeavour)]'
                                                    onClick={() => setEditNameRow(x.id)} />
                                            </Tltip>
                                        )}
                                    </div>
                                </div>
                            </div>



                            <div className='md:max-w-24 pt-2 md:pt-0'>
                                <p className='flex responsiveTextTable font-medium whitespace-nowrap text-[var(--chathams-blue)]' >{getTtl('Quantity', ln)} {`(${getD(settings.Quantity.Quantity, valueCon, 'qTypeTable')})`}</p>
                                <div className='flex flex-col'>
                                    <input type='text' className="number-separator input shadow-lg h-7 responsiveTextTable" name='qnty' style={{ fontFamily: 'inherit' }}
                                        value={addComma(x.qnty, false)} onChange={e => handleValueQnty(e, i)} />
                                </div>
                            </div>
                            <div className='md:max-w-24 pt-2 md:pt-0'>
                                <p className='flex responsiveTextTable font-medium whitespace-nowrap text-[var(--chathams-blue)]' >{getTtl('Price', ln)}:</p>
                                <div className='flex flex-col'>
                                    <input type='text' className="number-separator input shadow-lg h-7 responsiveTextTable" name='unitPrc' style={{ fontFamily: 'inherit' }}
                                        value={addComma(x.unitPrc, true)} placeholder="text"
                                        onChange={e => handleValuePmnt(e, i)} />
                                </div>
                            </div>

                            <div className='md:max-w-24 pt-2 md:pt-0'>
                                <p className='flex responsiveTextTable font-medium whitespace-nowrap text-[var(--chathams-blue)]' >{getTtl('Total', ln)}:</p>
                                <div className='flex'>
                                    <input type='text' disabled className="number-separator input border-slate-300 h-7 responsiveTextTable" name='total'
                                        value={addComma(x.total, true, 'total')} onChange={e => handleValue(e, i)} />
                                </div>
                            </div>

                            <div className='md:max-w-36 pt-2 md:pt-0'>
                                <p className='flex responsiveTextTable font-medium whitespace-nowrap text-[var(--chathams-blue)]' >{getTtl('PurchaseInv', ln)}#:</p>
                                <div className='flex flex-col w-36'>
                                    <Selector
                                        arr={valueCon.poInvoices.map(x => ({ id: x.id, poInvoice: x.inv }))}
                                        value={data[i]}
                                        onChange={(e) => handleChange(e, 'poInvoice', i)}
                                        name='poInvoice' classes='h-7'
                                    />
                                </div>
                            </div>

                            <div className='md:max-w-36 pt-2 md:pt-0'>
                                <p className='flex responsiveTextTable font-medium whitespace-nowrap text-[var(--chathams-blue)]' >{getTtl('Arrival Date', ln)}:</p>
                                <div className='flex flex-col'>
                                    <Datepicker useRange={false}
                                        asSingle={true}
                                        value={x.indDate}
                                        popoverDirection='down'
                                        onChange={e => handleDateChange(e, i)}
                                        displayFormat={"DD-MMM-YYYY"}
                                        inputClassName='input w-full shadow-lg h-7 responsiveTextTable'
                                    />
                                </div>
                            </div>



                            <div className='md:max-w-44 pt-2 md:pt-0'>
                                <p className='flex responsiveTextTable font-medium whitespace-nowrap text-[var(--chathams-blue)]' >{getTtl('Stock', ln)}:</p>
                                <div className='flex flex-col w-36'>
                                    <Selector
                                        arr={settings.Stocks.Stocks}
                                        value={data[i]}
                                        onChange={(e) => handleChange(e, 'stock', i)}
                                        name='stock' classes='h-7'
                                        secondaryName='nname'
                                    />
                                </div>
                            </div>

                            <div className='md:max-w-28 pt-2 md:pt-0'>
                                <p className='flex responsiveTextTable font-medium whitespace-nowrap text-[var(--chathams-blue)]' >{getTtl('Status', ln)}</p>
                                <div className='flex flex-col w-24'>
                                    <Selector
                                        arr={statusArr}
                                        value={data[i]}
                                        onChange={(e) => handleChange(e, 'status', i)}
                                        name='status' classes='h-7'
                                    />
                                </div>
                            </div>

                            <div className='md:max-w-24 pt-2 md:pt-0'>
                                <p className='flex responsiveTextTable font-medium whitespace-nowrap text-[var(--chathams-blue)]' >Sales Po#</p>
                                <div className='flex flex-col'>
                                    <input type='text' className="number-separator input shadow-lg h-7 responsiveTextTable truncate" name='salesPo' style={{ fontFamily: 'inherit' }}
                                        value={x.salesPo} placeholder="Sales Po#"
                                        onChange={e => handleValue1(e, i)} />
                                </div>
                            </div>

                            <div className='md:max-w-40 pt-2 md:pt-0'>
                                <p className='flex responsiveTextTable font-medium whitespace-nowrap text-[var(--chathams-blue)]' >{getTtl('Consignee', ln)}</p>
                                <div className='flex flex-col w-40'>
                                    <Selector
                                        arr={settings.Client.Client}
                                        value={data[i]}
                                        onChange={(e) => handleChange(e, 'client', i)}
                                        name='client' classes='h-7'
                                        secondaryName='nname'
                                        clear={clear}
                                        row={i}
                                    />
                                </div>
                            </div>
                            <Tltip direction='left' tltpText='Draft'>
                                <div className='items-center flex pt-3 pl-1'>
                                    <ChkBox checked={x.draft ?? false} size='h-5 w-5' onChange={() => checkItemDrft(x.id)} />
                                </div>
                            </Tltip >
                            <Tltip direction='left' tltpText='Misc Inv'>
                                <div className='items-center flex pt-3 pl-1'>
                                    <ChkBox checked={x.spInv ?? false} size='h-5 w-5' onChange={() => checkItemSP(x.id)} />
                                </div>
                            </Tltip >
                            {x.spInv &&
                                <div className='md:max-w-28 pt-2 md:pt-0'>
                                    <p className='flex responsiveTextTable font-medium whitespace-nowrap text-[var(--chathams-blue)]' >Comp. Name</p>
                                    <div className='flex flex-col'>
                                        <input type='text' className="number-separator input shadow-lg h-7 responsiveTextTable truncate"
                                            name='compName' style={{ fontFamily: 'inherit' }} value={x.compName} onChange={e => handleValue1(e, i)} />
                                    </div>
                                </div>
                            }

                        </div>
                    )
                })}


            </div>
            <div className='flex gap-4 p-2 border-t'>
                <Button
                    className="h-8 px-3"
                    onClick={saveD}
                >
                    <Save />
                    {getTtl('save', ln)}
                </Button>
                <Button
                    className="h-8 px-3"
                    variant='outline'
                    onClick={addItem}
                >
                    <CirclePlus />
                    {getTtl('Add', ln)}
                </Button>

                <Button
                    className="h-8 px-3"
                    variant='outline'
                    onClick={() => setShowDocImport(true)}
                    title='Read the supplier invoice PDF — fills the material and actual weight.'
                >
                    <FileText />
                    Autofill from PDF
                </Button>

                {data.length > 1 && (
                    <Button
                        className="h-8 px-3"
                        variant='outline'
                        onClick={copyFirstRowDown}
                        title="Copy the first row's arrival date, warehouse, status, purchase invoice, sales PO and consignee to every row below."
                    >
                        <Copy />
                        Copy 1st row down
                    </Button>
                )}

                <Button
                    className="h-8 px-3"
                    variant='outline'
                    onClick={deleteItems}
                >
                    <Trash />
                    {getTtl('Delete', ln)}
                </Button>
                <Button
                    className="h-8 px-3"
                    variant='outline'
                    onClick={openInvoicesModal}
                >
                    <ScrollText />
                    {getTtl('Invoices', ln)}
                </Button>
            </div>

            {showDocImport && (
                <DocumentImportOverlay
                    documentType='contract'
                    suppliers={settings?.Supplier?.Supplier || []}
                    clients={[]}
                    currencies={settings?.Currency?.Currency || []}
                    expenseTypes={settings?.Expenses?.Expenses || []}
                    anchorId={valueCon?.id}
                    onApply={addFromDoc}
                    onClose={() => setShowDocImport(false)}
                />
            )}
        </Modal>
    )
}

export default PoInvModal