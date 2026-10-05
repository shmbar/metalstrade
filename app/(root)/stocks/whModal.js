import Modal from '@components/modal.js'
import { useNumericCaret } from '@utils/numericCaret';
import { useContext, useState } from 'react'
import { SettingsContext } from "@contexts/useSettingsContext";
import Switch from '@components/switch'
import { UserAuth } from "@contexts/useAuthContext";
import dateFormat from "dateformat";

import { v4 as uuidv4 } from 'uuid';
import { getD, loadInvoice, saveStockIn, loadStockData, loadLedgerRowsReferencing, patchStockLots, updateContractField } from '@utils/utils'
import { renameLots, safeMerges } from '@utils/productEntries'
import AssayEditor from '@components/AssayEditor';
import { BtnIcon } from '@components/buttonIcons';
import ShipTable from './shipmentsTable'
import { getTtl } from '@utils/languages';
import { useRouter } from 'next/navigation.js';
import { ContractsContext } from '@contexts/useContractsContext';
import Tltip from '@components/tlTip';
import { InvoiceContext } from '@contexts/useInvoiceContext';
import { Selector } from '@components/selectors/selectShad';
import { FilePen, Archive, FileText   } from "lucide-react"
import { Button } from '@components/ui/button';




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


const WHvModal = ({ isOpen, setIsOpen, item, setItem, data, setData }) => {
    // The value is reformatted on every keystroke, which parks the caret at the end.
    const rememberCaret = useNumericCaret();

    const { settings, setToast, ln, setDateSelect } = useContext(SettingsContext);
    const { uidCollection } = UserAuth();
    const [showBlock, setShowBlock] = useState(false)
    const [newItemStock, setNewItemStock] = useState({ qnty: '', stock: '' })
    const [enabledSwitch, setEnabledSwitch] = useState(true)
    const router = useRouter();
    const { setValueCon, setIsOpenCon } = useContext(ContractsContext);
    const { blankInvoice } = useContext(InvoiceContext);


    const addComma = (nStr, addSymbol) => {
        nStr += '';
        var x = nStr.split('.');
        var x1 = x[0];
        var x2 = x.length > 1 ? '.' + x[1] : '';
        var rgx = /(\d+)(\d{3})/;
        while (rgx.test(x1)) {
            x1 = x1.replace(rgx, '$1,$2');
        }


        const symbol = item.cur !== '' ? settings.Currency.Currency.find(x => x.id === item.cur).symbol : ''
        x2 = x2.length > 3 ? x2.substring(0, 4) : x2
        return addSymbol ? (symbol + x1 + x2) : (x1 + x2);
    }


    const removeNonNumeric = (num) => num.toString().replace(/[^0-9.]/g, "");


    const handleValuePmnt = (e) => {

        if (countDecimalDigits(e.target.value) > 2) return;
        let itm = { ...item, [e.target.name]: removeNonNumeric(e.target.value) }
        if (e.target.name === 'unitPrc' && itm.qnty !== '') {
            itm = { ...itm, total: removeNonNumeric(itm.qnty) * removeNonNumeric(itm.unitPrc) }
        }

        setItem(itm)
    }

    const handleValueQnty = (e) => {

        if (countDecimalDigits(e.target.value) > 3) return;

        let itm = { ...item, [e.target.name]: removeNonNumeric(e.target.value) }
        if (e.target.name === 'qnty' && itm.unitPrc !== '') {
            itm = { ...itm, total: removeNonNumeric(itm.qnty) * removeNonNumeric(itm.unitPrc) }
        }

        setItem(itm)
    }

    const handleValueQnty1 = (e) => {

        if (countDecimalDigits(e.target.value) > 3) return;
        let itm = { ...newItemStock, [e.target.name]: removeNonNumeric(e.target.value) }
        setNewItemStock(itm)
    }

    const moveItems = () => {
        setShowBlock(!showBlock)
    }

    const moveStock = async () => {

        if (newItemStock.qnty === '' || newItemStock.stock === '') {
            setToast({ show: true, text: 'Please fill the required data!', clr: 'fail' })
            return;
        }

        if (newItemStock.qnty * 1 > item.qnty * 1) {
            setToast({ show: true, text: 'Selected weight is bigger than possible!', clr: 'fail' })
            return;
        }

        let itemOut = {
            stock: item.stock, id: uuidv4(), invoice: '', unitPrc: item.unitPrc,
            date: dateFormat(new Date(), 'dd-mmm-yyyy'), qnty: newItemStock.qnty * 1, type: "out",
            supplier: item.supplier, descriptionId: item.data[0].type === 'in' ? item.data[0].description : item.data[0].descriptionId,
            newStock: newItemStock.stock, cur: item.cur, descriptionName: item.descriptionName,
            moveType: 'out'
        }


        let newData = data.map(x => (
            x.ind === item.ind ?
                {
                    ...x, data: [...x.data, itemOut], qnty: x.qnty * 1 - newItemStock.qnty * 1,
                    total: (x.qnty * 1 - newItemStock.qnty * 1) * x.unitPrc
                } : x
        ))

        let newItem = {
            ...item, data: [...item.data, itemOut], qnty: item.qnty * 1 - newItemStock.qnty * 1,
            total: (item.qnty * 1 - newItemStock.qnty * 1) * item.unitPrc,
        }

        setItem(newItem)
        setData(newData)

        let itemIn = item.data.find(x => x.type === 'in')
        itemIn = {
            ...itemIn, id: uuidv4(), qnty: newItemStock.qnty, total: newItemStock.qnty * item.unitPrc,
            stock: newItemStock.stock, invoice: '', oldStock: item.stock, moveType: 'in',
            date: dateFormat(new Date(), 'dd-mmm-yyyy')
        }

        await saveStockIn(uidCollection, [itemOut, itemIn])

        setNewItemStock({ qnty: '', stock: '' })
        setToast({ show: true, text: 'New stock data saved!', clr: 'success' })
    }

    const moveToContracts = async () => {
        let dt = item.data.find(z => z.contractData)?.contractData
        setIsOpen(false)

        let fstDay = new Date(dt.date);
        fstDay.setDate(1);
        fstDay = dateFormat(fstDay, 'yyyy-mm-dd')

        let lstDay = new Date(dt.date);
        lstDay.setMonth(lstDay.getMonth() + 1);

        lstDay.setDate(0);
        lstDay = dateFormat(lstDay, 'yyyy-mm-dd')

        setDateSelect({
            start: fstDay,
            end: lstDay
        })
        let contract = await loadInvoice(uidCollection, 'contracts', dt)

        if (Object.keys(contract).length === 0) {

            const date1 = new Date(dt.date);
            date1.setDate(date1.getDate() - 1);
            dt.date = date1.toISOString().split("T")[0]; // Convert back to 'YYYY-MM-DD' format

            contract = await loadInvoice(uidCollection, 'contracts', dt)

            if (Object.keys(contract).length === 0) {
                setToast({ show: true, text: 'Contract can not be accessed!', clr: 'fail' })
                return;
            }

        }

        setValueCon(contract);
        blankInvoice();

        router.push("/contracts");

        setIsOpenCon(true)

    }

    /* ── Description and spec, edited here (client, 2026-09-29) ────────────────────
       Before, this window showed both read-only and a spec could only be entered from
       the contract's Materials Breakdown. The same two editors now work from the stock
       row itself, on the same rules:
         · spec and chemistry belong to each received lot — written onto the lot, those
           two fields only (patchStockLots);
         · the name follows the Breakdown's ✎: this row's lots get the new name, the PO
           line and every other lot keep theirs, and a name back to the PO line's own
           folds the row into it again (utils/productEntries.js renameLots). */
    const lots = (item?.data || []).filter(l => l.type === 'in' && l.description)
    const [nameDraft, setNameDraft] = useState(item?.descriptionName || '')
    const [drafts, setDrafts] = useState({})               // lotId → { spec?, analysis? }
    const [saving, setSaving] = useState(false)
    const valueOf = (lot, field) => drafts[lot.id]?.[field] ?? lot[field] ?? ''
    const setLotField = (lotId, field, value) =>
        setDrafts(prev => ({ ...prev, [lotId]: { ...(prev[lotId] || {}), [field]: value } }))
    const lotPatch = (lot) => Object.fromEntries(Object.entries(drafts[lot.id] || {})
        .filter(([k, v]) => String(v ?? '') !== String(lot[k] ?? '')))
    const renaming = nameDraft.trim() !== '' && nameDraft.trim() !== String(item?.descriptionName || '').trim()
    const specsChanged = lots.some(l => Object.keys(lotPatch(l)).length)
    const dirty = renaming || specsChanged
    const specSummary = [...new Set(lots.map(l => String(valueOf(l, 'spec')).trim()).filter(Boolean))].join(' · ')

    const specEditor = (lot) => (
        <div className='flex items-center gap-1.5 min-w-0'>
            <AssayEditor
                value={valueOf(lot, 'analysis')}
                onChange={(v) => setLotField(lot.id, 'analysis', v)}
                spec={valueOf(lot, 'spec')}
                onSpecChange={(v) => setLotField(lot.id, 'spec', v)}
                knownSpecs={lots.filter(l => l.id !== lot.id).map(l => valueOf(l, 'spec'))} />
            <span className='truncate responsiveTextTable font-medium text-[var(--brand-strong)]'>{String(valueOf(lot, 'spec')).trim()}</span>
        </div>
    )

    // A contract by its { id, date } — tried a day earlier too, as Contract below does.
    const loadContractOf = async (ref) => {
        let c = await loadInvoice(uidCollection, 'contracts', ref)
        if (Object.keys(c || {}).length) return { contract: c, date: ref.date }
        const d = new Date(ref.date); d.setDate(d.getDate() - 1)
        const date = d.toISOString().split('T')[0]
        c = await loadInvoice(uidCollection, 'contracts', { ...ref, date })
        return Object.keys(c || {}).length ? { contract: c, date } : null
    }

    const saveEdits = async () => {
        if (!dirty || saving) return
        setSaving(true)
        try {
            let written = []                                  // lots already saved whole below
            let newName = item.descriptionName
            let renamed = null                                // lotId → the lot as saved

            if (renaming) {
                const refs = [...new Set(lots.map(l => l.contractData?.id).filter(Boolean))]
                if (refs.length !== 1) throw new Error('This row holds material from more than one PO — rename it on each PO\'s Materials Breakdown.')
                const found = await loadContractOf(lots.find(l => l.contractData).contractData)
                if (!found) throw new Error('The contract can not be accessed.')
                const { contract, date } = found
                const lineId = lots[0].description
                const conLots = await loadStockData(uidCollection, 'id', contract.stock || [])
                const lotIds = lots.filter(l => l.description === lineId && conLots.some(c => c.id === l.id)).map(l => l.id)
                const args = { productsData: contract.productsData || [], lots: conLots, lotIds, name: nameDraft, newId: uuidv4() }
                let r = renameLots(args)
                if (r.mode === 'none') throw new Error('This material\'s line was not found on its contract.')
                // Folding back into the PO line moves the lots off their entry: only when
                // nothing else in the ledger — a sale, a move — still names it.
                if (r.mode === 'folded') {
                    const ledger = await loadLedgerRowsReferencing(uidCollection, [lineId])
                    if (!safeMerges([{ from: lineId, to: r.entryId }], ledger, lotIds).length) r = renameLots({ ...args, canFold: false })
                }
                // A row with sales or moves can't hand only its remaining lots a new line:
                // the sales keep the old name and the stock splits in two.
                if (r.mode === 'split' && (item.data.some(l => l.type === 'out') || lots.some(l => l.moveType === 'in'))) {
                    throw new Error('Part of this row has already been sold or moved, and those records keep the current name — renaming only the rest would split the stock in two.')
                }
                // Lots that arrived here by a move are not on the contract's own list, but
                // carry its names too: re-snapshot them with the rest.
                const arrivals = r.mode === 'renamed'
                    ? (await loadLedgerRowsReferencing(uidCollection, [r.entryId])).filter(x => x.type === 'in'
                        && x.contractData?.id === contract.id && !conLots.some(c => c.id === x.id))
                    : []
                const toWrite = [...r.lots, ...arrivals].map(l => ({ ...l, productsData: r.productsData, ...lotPatch(l) }))
                await updateContractField(uidCollection, contract.id, date, { productsData: r.productsData })
                await saveStockIn(uidCollection, toWrite)
                written = toWrite.map(l => l.id)
                renamed = new Map(toWrite.map(l => [l.id, l]))
                newName = r.productsData.find(p => p.id === r.entryId)?.description || nameDraft.trim()
            }

            const rest = lots.filter(l => !written.includes(l.id))
                .map(l => ({ id: l.id, patch: lotPatch(l) })).filter(p => Object.keys(p.patch).length)
            if (rest.length) await patchStockLots(uidCollection, rest)

            // The row as it now stands, without waiting for a reload.
            const nextData = item.data.map(l => {
                const saved = renamed?.get(l.id)
                if (saved) return { ...l, description: saved.description, productsData: saved.productsData, spec: saved.spec, analysis: saved.analysis, descriptionName: newName }
                const p = l.type === 'in' && l.description ? lotPatch(l) : {}
                return Object.keys(p).length ? { ...l, ...p } : l
            })
            const next = { ...item, descriptionName: newName, data: nextData }
            setItem(next)
            setData(data.map(x => (x.id === item.id ? next : x)))
            setDrafts({})
            setNameDraft(newName)
            setToast({ show: true, text: 'Saved', clr: 'success' })
        } catch (e) {
            setToast({ show: true, text: e?.message || String(e), clr: 'fail' })
        } finally {
            setSaving(false)
        }
    }

    const handleChange = (e, name) => {
        setNewItemStock(prev => {
            return { ...prev, [name]: e }
        })
    }


    const clear = (name) => {
        setNewItemStock(prev => ({
            ...prev, [name]: '',
        }))
    }

    // whitespace-nowrap was pushing these captions out of their column — a narrow one
    // could not hold "Description:" on one line, and it overflowed the field below it.
    // Let them wrap.
    const labelCls = 'responsiveText font-medium text-[var(--ink-muted)] mb-1'
    const inputCls = 'w-full rounded-control border border-[var(--line-strong)] bg-[var(--bg-card)] text-[var(--ink)] responsiveTextInput h-8 px-2 focus:outline-none focus:ring-[3px] focus:ring-[var(--brand-soft)] focus:border-[var(--brand)] disabled:opacity-70'

    return (
        <Modal isOpen={isOpen} setIsOpen={setIsOpen} title={getTtl('Materials Breakdown', ln)} size='lg'>

            {/* Info fields. From md up a figure's box is as wide as a figure needs — 80px holds
                1,234.567, 124px a price or a total into the tens of millions — and the two
                names share what is left, 3:2. They were all shares of twelve columns, and
                Weight's one was 56px of this 840px window: "29.044" was cut (client,
                2026-10-05). The room came from Stock, which shows a warehouse's full legal
                name and elides the long ones as it always did. Below md the fields pair up on
                the twelve columns. */}
            <div className='grid grid-cols-12 md:grid-cols-[minmax(0,3fr)_80px_124px_124px_minmax(0,2fr)] gap-3 p-3 m-3 rounded-2xl border border-[var(--line)]' style={{ background: 'var(--bg-subtle)' }}>
                <div className='col-span-12 md:col-span-1 flex flex-col'>
                    <p className={labelCls}>{getTtl('Description', ln)}:</p>
                    <Tltip direction='top' tltpText="Rename this row's material — this stock row only; the PO line and other rows keep their name. Save to apply.">
                        <input type='text' value={nameDraft} name='descriptionName' className={inputCls}
                            disabled={!lots.length || saving}
                            onChange={e => setNameDraft(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') saveEdits(); if (e.key === 'Escape') { e.stopPropagation(); setNameDraft(item.descriptionName || ''); } }} />
                    </Tltip>
                </div>
                <div className='col-span-6 md:col-span-1 flex flex-col'>
                    <p className={labelCls}>{getTtl('Weight', ln)}</p>
                    <input type='text' disabled className={inputCls} name='qnty' value={addComma(item.qnty, false)} onChange={() => {}} />
                </div>
                <div className='col-span-6 md:col-span-1 flex flex-col'>
                    <p className={labelCls}>{getTtl('Price', ln)}:</p>
                    <input type='text' disabled className={inputCls} name='unitPrc' value={item.unitPrc ? addComma(item.unitPrc, true) : '-'} onChange={e => handleValuePmnt(e)} />
                </div>
                <div className='col-span-6 md:col-span-1 flex flex-col'>
                    <p className={labelCls}>{getTtl('Total', ln)}:</p>
                    <input type='text' disabled className={inputCls} name='total' value={item.total === '-' ? item.total : addComma((item.total * 1).toFixed(2), true)} />
                </div>
                <div className='col-span-6 md:col-span-1 flex flex-col'>
                    <p className={labelCls}>{getTtl('Stock', ln)}:</p>
                    <input type='text' disabled value={getD(settings.Stocks.Stocks, item, 'stock')} className={inputCls + ' truncate'} />
                </div>
                {/* Spec: the lot's own when the row is one lot, else what its lots add up to,
                    each edited on its line in the table below. */}
                {lots.length > 0 && (
                    <div className='col-span-full flex items-center gap-2 min-w-0'>
                        <p className={labelCls + ' mb-0'}>Spec:</p>
                        {lots.length === 1 ? specEditor(lots[0]) : (
                            <>
                                <span className='truncate responsiveText font-medium text-[var(--brand-strong)]'>{specSummary || '—'}</span>
                                <span className='responsiveTextTable text-[var(--ink-muted)] shrink-0'>· each lot&apos;s spec is set on its line below</span>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Change Stock section */}
            <div className={`${showBlock ? 'flex' : 'hidden'} gap-4 px-3 pb-2 mx-3 mb-2 rounded-2xl border border-[var(--line)] p-3`} style={{ background: 'var(--bg-subtle)' }}>
                <div className='flex flex-col'>
                    <p className={labelCls}>{getTtl('Weight', ln)}</p>
                    <input type='text' className={inputCls + ' w-24 !bg-[var(--bg-card)]'} name='qnty' value={addComma(newItemStock.qnty, false)} onChange={e => { rememberCaret(e); handleValueQnty1(e); }} />
                </div>
                <div className='flex flex-col w-48'>
                    <p className={labelCls}>{getTtl('Stock', ln)}:</p>
                    <Selector arr={settings.Stocks.Stocks} value={newItemStock} onChange={(e) => handleChange(e, 'stock')} name='stock' clear={clear} />
                </div>
                <div className='flex items-end'>
                    <Button className='h-8 responsiveTextInput rounded-lg' onClick={moveStock} disabled={item.stock === newItemStock.stock}>
                        <FilePen />
                        {getTtl('Move to new Stock', ln)}
                    </Button>
                </div>
            </div>

            {/* Action buttons */}
            <div className='flex gap-3 px-3 py-2 border-t border-[var(--line)]'>
                <Tltip direction='top' tltpText='Save the name and spec changes'>
                    <Button className="h-8 responsiveTextInput rounded-lg" onClick={saveEdits} disabled={!dirty || saving}>
                        <BtnIcon action="save" />
                        {saving ? getTtl('saving', ln) : getTtl('save', ln)}
                    </Button>
                </Tltip>
                <Tltip direction='top' tltpText='Move item to a different stock'>
                    <Button className="h-8 responsiveTextInput rounded-lg" onClick={moveItems}>
                        <Archive />
                        {getTtl('Change Stock', ln)}
                    </Button>
                </Tltip>
                <Tltip direction='top' tltpText='View the contract for this item'>
                    <Button className="h-8 responsiveTextInput rounded-lg" onClick={() => moveToContracts()}>
                        <FileText />
                        {getTtl('Contract', ln)}
                    </Button>
                </Tltip>
            </div>

            {/* Show Shipments toggle */}
            <div className='flex items-center px-3 py-2 gap-2'>
                <p className='responsiveTextInput text-[var(--ink)]'>{!enabledSwitch ? getTtl('Hide Shipments', ln) : getTtl('Show Shipments', ln)}</p>
                <Switch enabled={enabledSwitch} setEnabled={setEnabledSwitch} />
            </div>

            {enabledSwitch && <ShipTable item={item} data={[]}
                renderSpec={(lotId) => { const lot = lots.find(l => l.id === lotId); return lot ? specEditor(lot) : ''; }} />}

        </Modal>
    )
}

export default WHvModal
