import { useState, useRef, useEffect, useLayoutEffect, useContext } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { NumericFormat } from 'react-number-format';
import ChkBox from '@components/checkbox.js'
import { getD, reOrderTableCon } from '@utils/utils.js';
import { UNIT_LABEL, Q_DEC, unitFromLabel, convertWeight, convertPrice, convertCurrency } from '@utils/units';
import { CalculateNum } from '@components/calculate';
import { SettingsContext } from "@contexts/useSettingsContext";
import { getTtl } from '@utils/languages.js';
import { ChevronDown, MoveRight } from 'lucide-react';
import Tltip from '@components/tlTip'
import { getCur } from '@components/exchangeApi'
import { BtnIcon } from '@components/buttonIcons';
import { pdfText } from './pdf/pdfText';

// The PO stores weight (qnty) and price (unitPrc) in the contract's OWN unit/currency
// (its Quantity selector + Currency = the "base"). Every other view in the app — the PO PDF,
// the contracts list, derived invoices/stock — reads these raw numbers. So conversions here
// are display-only: a per-cell Lb/Kg input helper (converts entry to the base unit) and an
// ephemeral "View in" overlay (re-expresses the table on screen). Stored data never changes.
// The factors and the two conversions live in utils/units.js: the PO PDF converts with
// them too, and a copy here is how the sheet on screen and the printed sheet drift.
// Contracts priced on element content (Ni/Cr/Mo) have no single unit price to print, so the
// column defers to the Price Remarks block that prints right under the table on the PO PDF.
// Display-only, exactly like the unit/currency overlay above: unitPrc keeps its stored number
// so margins, derived invoices and stock are untouched, and switching back reveals it again.
const SEE_BELOW = 'See below*';

// A description is a full alloy spec ("64.31Ni 11.41Cr 10.61Co … 5W Ingots"): 70 characters
// made the client drop elements to fit (2026-09-30). The box wraps and grows as it fills; the
// invoice's own description box (productsTableInvoice.js) takes the same length.
const DESC_MAX = 150;

const roundTo = (n, d) => { const f = 10 ** d; return Math.round(n * f) / f; };

// A stored "=…" formula (eq for the price, eqQnty for the quantity) is only offered back
// for editing while it still gives the stored number. The phone app edits qnty/unitPrc
// without knowing about formulas; reopening a stale one and pressing Enter would quietly
// put the old figure back.
const liveFormula = (formula, stored) => {
    if (!formula || String(formula).substr(0, 1) !== '=') return null;
    try {
        const n = Number(CalculateNum(String(formula), 10));
        return Math.abs(n - parseFloat(stored)) <= 0.0005 + 1e-9 ? formula : null;
    } catch { return null; }
};

const ProductsTable = ({ value, setValue, currency, quantityTable, setShowPoInvModal, setShowStockModal, setToast, contractsData, onViewChange }) => {

    const [checkedItems, setCheckedItems] = useState([]);
    const [edit, setEdit] = useState({ status: false, id: null, header: null });
    const inputRef = useRef(null);
    const [value1, setValue1] = useState();
    // Unit the user is typing in for the current cell (defaults to the contract's base unit).
    const [inputUnit, setInputUnit] = useState('mt');
    // Ephemeral "View in" overlay — re-expresses the table for display only ('' = base, no change).
    const [viewUnit, setViewUnit] = useState('');
    const [viewCur, setViewCur] = useState('');
    const [rate, setRate] = useState(value.euroToUSD || null); // USD per 1 EUR (contract-date)
    const { ln } = useContext(SettingsContext);

    // Reset the view back to base whenever the contract's base unit/currency changes.
    useEffect(() => { setViewUnit(''); }, [value.qTypeTable]);
    useEffect(() => { setViewCur(''); }, [value.cur]);

    useEffect(() => {
        if (edit.status) {
            inputRef.current.focus();
            const valueLength = inputRef.current.value.length;
            inputRef.current.setSelectionRange(valueLength, valueLength);
        }
    }, [edit.status]);

    // The description box starts at two lines and grows with what is typed, so the whole
    // spec stays in view while it is edited. Layout effect: no one-frame flash at h-8.
    useLayoutEffect(() => {
        const el = inputRef.current;
        if (!edit.status || !el || el.tagName !== 'TEXTAREA') return;
        el.style.height = 'auto';
        el.style.height = `${el.scrollHeight + 2}px`;   // + the 1px top and bottom border
    }, [edit.status, edit.header, value1]);

    const addItem = () => {
        let newArr = [
            ...value.productsData,
            { id: uuidv4(), description: '', qnty: '', unitPrc: '' },
        ];

        setValue({ ...value, productsData: newArr });
    };

    const checkItem = (i) => {
        if (checkedItems.includes(i)) {
            setCheckedItems(checkedItems.filter((x) => x !== i));
        } else {
            setCheckedItems([...checkedItems, i]);
        }
    };

    const delItem = () => {
        setValue({ ...value, productsData: value.productsData.filter((item) => !checkedItems.includes(item.id)) });
        setCheckedItems([]);
    };

    const handleDoubleClick = (obj, key) => {
        const baseUnit = unitFromLabel(getD(quantityTable, value, 'qTypeTable'));
        const baseCur = getD(currency, value, 'cur');
        // The stored line, not the row the table draws: reOrderTableCon keeps only
        // id/description/qnty/unitPrc, so contentPrc and the formulas are not on `obj`.
        const object = value.productsData.find(z => z.id === obj.id) || obj;

        // Values are always edited in the contract's base unit/currency (what's stored).
        // While a converted "View in" overlay is active, qnty/price are read-only.
        const inBaseView = (viewUnit === '' || viewUnit === baseUnit) && (viewCur === '' || viewCur === baseCur);
        if ((key === 'qnty' || key === 'unitPrc') && !inBaseView) {
            setToast({ show: true, text: 'Set “View in” back to the contract’s own unit/currency to edit values.', clr: 'fail' });
            return;
        }

        // A cell typed as a formula reopens as that formula. ?? '' keeps the input
        // controlled: contentPrc is absent until it is first typed in.
        const formula = key === 'unitPrc' ? liveFormula(object.eq, object.unitPrc)
            : key === 'qnty' ? liveFormula(object.eqQnty, object.qnty) : null;
        setValue1(formula ?? object[key] ?? ''); // raw base value
        setEdit({ status: true, id: obj['id'], header: key });
        setInputUnit(baseUnit); // default entry unit = the contract's base unit
    };

    const handleKeyPress = (e) => {
        // const isValidInputQnty = /^\d+(\.\d{0,3})?$/.test(e.target.value);

        if (e.key === 'Enter') {
            // The description box is a textarea: Enter saves it, it never starts a new line.
            e.preventDefault();

            /*            if (e.target.name === "qnty" && !isValidInputQnty) {
                            setToast({ show: true, text: 'Please enter numbers only with at most three letters after the dot!', clr: 'fail' })
                            return;
                        }
            */

            const baseUnit = unitFromLabel(getD(quantityTable, value, 'qTypeTable'));
            // Quantity and price both take a formula, "=10.5+1.973" — the invoice table's
            // cells already did. Stored as the result; the formula rides along in eq/eqQnty.
            const numeric = edit.header === 'unitPrc' || edit.header === 'qnty';
            const isEquation = numeric && (e.target.value).substr(0, 1) === "=";
            let Nm = e.target.value;
            // A description is stored the way it prints: runs of spaces collapsed, ends trimmed.
            // The browser hides a doubled space; the PO and invoice PDFs do not (pdf/pdfText.js).
            if (edit.header === 'description') Nm = pdfText(Nm);
            if (isEquation) {
                try { Nm = Number(CalculateNum(e.target.value, 10)); } catch { Nm = NaN; }
                if (!Number.isFinite(Nm)) {
                    setToast({ show: true, text: `Can't calculate "${e.target.value}" — use numbers and + - * / ( ), e.g. =10.5+1.973`, clr: 'fail' });
                    return;
                }
            }

            // Entry-unit -> base-unit conversion. When the entry unit equals the base unit the
            // value is stored exactly as typed (the existing behaviour, no rounding surprises).
            let converted = false;
            if (inputUnit !== baseUnit && Nm !== '' && !isNaN(parseFloat(Nm))) {
                const res = edit.header === 'unitPrc'
                    ? convertPrice(parseFloat(Nm), inputUnit, baseUnit)
                    : convertWeight(parseFloat(Nm), inputUnit, baseUnit);
                Nm = String(edit.header === 'unitPrc' ? roundTo(res, 2) : roundTo(res, 3));
                converted = true;
            }
            // A quantity is kept to the 3 decimals it is shown and printed with.
            if (isEquation && !converted && edit.header === 'qnty') Nm = String(roundTo(Nm, 3));

            const newArr = value.productsData.map((x) =>
                x.id === edit.id ? {
                    ...x, [edit.header]: Nm,
                    // a converted value no longer equals its typed equation, so drop the stored one
                    eq: e.target.name === 'unitPrc'
                        ? (converted ? null : (isEquation ? e.target.value : null))
                        : x.eq ?? null,
                    eqQnty: e.target.name === 'qnty'
                        ? (converted ? null : (isEquation ? e.target.value : null))
                        : x.eqQnty ?? null,
                } : x
            );

            setValue({ ...value, productsData: newArr });
            setEdit({ status: false, id: null, header: null });
            setValue1('');
            setInputUnit(baseUnit);
        }

        if (e.key === 'Escape') {
            // Cancels this cell only. Left to bubble, the same key also closed the whole PO
            // window and dropped every unsaved change in it.
            e.stopPropagation();
            setEdit({ status: false, id: null, header: null });
            setValue1('');
            setInputUnit(unitFromLabel(getD(quantityTable, value, 'qTypeTable')));
        }
    };

    // Switching the per-cell unit converts the number in the box to the same physical
    // value in the new unit (e.g. 11.300 MT -> 24,912.4956 Lb), so the digits track the
    // unit. It round-trips (MT->Lb->MT returns to the original), so toggling never compounds.
    const handleUnitSwitch = (newUnit) => {
        const prev = inputUnit;
        const s = String(value1 ?? '');
        if (prev !== newUnit && s !== '' && s.substr(0, 1) !== '=' && !isNaN(parseFloat(s))) {
            const n = parseFloat(s);
            const baseUnit = unitFromLabel(getD(quantityTable, value, 'qTypeTable'));
            const conv = edit.header === 'unitPrc'
                ? convertPrice(n, prev, newUnit)
                : convertWeight(n, prev, newUnit);
            // Back at the base unit -> clean base precision (so the stored value is exact);
            // intermediate units keep more decimals to avoid drift while toggling.
            const dec = newUnit === baseUnit ? (edit.header === 'unitPrc' ? 2 : 3) : 6;
            setValue1(String(roundTo(conv, dec)));
        }
        setInputUnit(newUnit);
        inputRef.current?.focus();
    };

    const q = getD(quantityTable, value, 'qTypeTable');
    const c = getD(currency, value, 'cur');
    const curSymbol = (value.cur && currency.find(x => x.id === value.cur)?.['symbol']) || '';

    // ---- Base = the contract's own unit/currency (what's stored). View = display only. ----
    const baseUnit = unitFromLabel(q);           // 'mt' | 'kg' | 'lb'
    const baseCode = c;                          // 'USD' | 'EUR' | ''
    const effViewUnit = viewUnit || baseUnit;    // unit actually shown
    const effViewCur = viewCur || baseCode;      // currency actually shown
    const isViewing = effViewUnit !== baseUnit || effViewCur !== baseCode; // a conversion is active
    // Default (no overlay) keeps the original 3-decimal qnty display; converted views use the unit's scale.
    const qDec = viewUnit ? (Q_DEC[effViewUnit] ?? 3) : 3;
    const viewSymbol = (currency.find(x => x.cur === effViewCur)?.symbol) || curSymbol;

    // USD<->EUR at the contract-date rate (rate = USD per 1 EUR). Same/unknown currency
    // passes through. Shared with the PO PDF via utils/units.
    const convCur = (price) => convertCurrency(price, baseCode, effViewCur, rate);
    const toDispQnty = (raw) => (raw === '' || raw == null) ? '' : convertWeight(Number(raw), baseUnit, effViewUnit);
    const toDispPrice = (raw) => (raw === '' || raw == null) ? '' : convCur(convertPrice(Number(raw), baseUnit, effViewUnit));

    // Header labels — show the raw base labels until a view is actually selected (no visual change by default).
    const qtyHeaderLabel = viewUnit ? UNIT_LABEL[effViewUnit] : q;
    const priceHeaderLabel = (viewUnit || viewCur)
        ? effViewCur + (effViewUnit === 'mt' ? '' : '/' + UNIT_LABEL[effViewUnit])
        : c;

    /* Report the active view up so the PO PDF can print what is on screen. The toggle
       is still display-only for STORAGE — nothing here writes to the contract — but a
       PDF made while viewing MT that comes out in LB is the toggle lying to you. Deps
       are primitives, so this fires only when the view actually changes. */
    useEffect(() => {
        onViewChange?.({
            unit: effViewUnit, cur: effViewCur, rate, isViewing,
            baseUnit, baseCur: baseCode, symbol: viewSymbol, qDec,
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [effViewUnit, effViewCur, rate, isViewing, baseUnit, baseCode, viewSymbol, qDec]);

    // The "other" convertible currency for the view toggle (USD<->EUR only).
    const otherCur = baseCode === 'USD' ? 'EUR' : baseCode === 'EUR' ? 'USD' : '';
    const otherSymbol = (currency.find(x => x.cur === otherCur)?.symbol) || '';
    const canFx = !!otherCur && currency.some(x => x.cur === otherCur);

    const setViewCurrency = async (code) => {
        if (code !== baseCode && !rate) {
            const d = value.dateRange?.startDate || value.date;
            let r = value.euroToUSD || null;
            if (!r && d) { try { r = await getCur(d); } catch { /* ignore */ } }
            if (!r) { setToast({ show: true, text: 'Exchange rate unavailable for this contract date.', clr: 'fail' }); return; }
            setRate(r);
        }
        setViewCur(code);
    };

    // Live hint shown while keying in a non-base unit or a formula — exactly what will be
    // stored (in the base unit). A half-typed formula ("=10.5+") simply shows nothing yet.
    const convPreview = (() => {
        if (!edit.status) return null;
        if (edit.header !== 'qnty' && edit.header !== 'unitPrc') return null;
        const typed = String(value1 ?? '');
        if (inputUnit === baseUnit && typed.substr(0, 1) !== '=') return null;
        let n;
        try { n = parseFloat(CalculateNum(typed, 10)); } catch { return null; }
        if (!Number.isFinite(n)) return null;
        const baseLabel = UNIT_LABEL[baseUnit];
        const res = inputUnit === baseUnit ? n
            : edit.header === 'unitPrc' ? convertPrice(n, inputUnit, baseUnit) : convertWeight(n, inputUnit, baseUnit);
        return edit.header === 'unitPrc'
            ? `${curSymbol}${res.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} /${baseLabel}`
            : `${res.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} ${baseLabel}`;
    })();

    const setInput = (e) => {
        let t = e.target.value;
        t = t.indexOf(".") >= 0 && e.target.name === 'unitPrc' && t.substr(0, 1) !== "=" ? t.slice(0, t.indexOf(".") + 10) : t;
        // A spec pasted from a document arrives with line breaks; the PO keeps it one line of text.
        if (e.target.name === 'description') t = t.replace(/\s*[\r\n]+\s*/g, ' ');
        setValue1(t)
    }

    const openInvoicesModal = () => {
        if (value.id === '') {
            setToast({ show: true, text: 'Contract must be saved first!', clr: 'fail' })
            return;
        }

        setShowPoInvModal(true)
    }

    const checkIfAlllowed = () => value.id !== ''
    // Pricing basis for this PO. Absent on every contract written before this existed, so the
    // unit-price default has to come from the falsy case rather than from a stored value.
    const priceMode = value.priceMode === 'content' ? 'content' : 'unit';
    const perContent = priceMode === 'content';
    //overflow-x-auto

    return (
        <div className="w-full justify-center flex">
            <div className="flex flex-col w-full">
                <div className="flex items-center gap-3 mb-1.5 responsiveTextTable flex-wrap">
                    <span className="text-[var(--regent-gray)] font-medium">{getTtl('Price', ln)}:</span>
                    <div className="inline-flex rounded-lg border border-[var(--line-strong)] overflow-hidden">
                        {[['unit', getTtl('UnitPrice', ln)], ['content', getTtl('PricePerContent', ln)]].map(([m, label]) => (
                            <button key={m} type="button" onClick={() => setValue({ ...value, priceMode: m })}
                                className={`px-2.5 py-0.5 font-semibold transition-colors border-l first:border-l-0 border-[var(--line-strong)] ${priceMode === m ? 'bg-[var(--endeavour)] text-[var(--on-brand)]' : 'bg-[var(--bg-subtle)] text-[var(--chathams-blue)] hover:bg-[var(--bg-subtle)]'}`}>
                                {label}
                            </button>
                        ))}
                    </div>
                    {perContent && (
                        <Tltip direction='right' tltpText={`The Unit Price column prints as "${SEE_BELOW}" on the PO — spell the actual basis out in Price Remarks, which print directly below the table. Your entered prices are kept, not erased: switch back to Unit price and they reappear.`}>
                            <span className="text-[var(--endeavour)] font-semibold cursor-help whitespace-nowrap">
                                prints as &ldquo;{SEE_BELOW}&rdquo; · set the basis in Price Remarks
                            </span>
                        </Tltip>
                    )}
                    <span className="ml-auto text-[var(--regent-gray)] font-medium">View in:</span>
                    <div className="inline-flex rounded-lg border border-[var(--line-strong)] overflow-hidden">
                        {['mt', 'kg', 'lb'].map((u) => (
                            <button key={u} type="button" onClick={() => setViewUnit(u)}
                                className={`px-2.5 py-0.5 font-semibold transition-colors border-l first:border-l-0 border-[var(--line-strong)] ${effViewUnit === u ? 'bg-[var(--endeavour)] text-[var(--on-brand)]' : 'bg-[var(--bg-subtle)] text-[var(--chathams-blue)] hover:bg-[var(--bg-subtle)]'}`}>
                                {UNIT_LABEL[u]}
                            </button>
                        ))}
                    </div>
                    {canFx && (
                        <div className="inline-flex rounded-lg border border-[var(--line-strong)] overflow-hidden">
                            <button type="button" onClick={() => setViewCurrency(baseCode)}
                                className={`px-2.5 py-0.5 font-semibold transition-colors ${effViewCur === baseCode ? 'bg-[var(--endeavour)] text-[var(--on-brand)]' : 'bg-[var(--bg-subtle)] text-[var(--chathams-blue)] hover:bg-[var(--bg-subtle)]'}`}>
                                {curSymbol} {baseCode}
                            </button>
                            <button type="button" onClick={() => setViewCurrency(otherCur)}
                                className={`px-2.5 py-0.5 font-semibold border-l border-[var(--line-strong)] transition-colors ${effViewCur === otherCur ? 'bg-[var(--endeavour)] text-[var(--on-brand)]' : 'bg-[var(--bg-subtle)] text-[var(--chathams-blue)] hover:bg-[var(--bg-subtle)]'}`}>
                                {otherSymbol} {otherCur}
                            </button>
                        </div>
                    )}
                    {isViewing
                        ? <span className="text-[var(--endeavour)] font-semibold whitespace-nowrap">
                            view only · saved as {UNIT_LABEL[baseUnit]}{baseCode ? ' ' + baseCode : ''}
                            {effViewCur !== baseCode && rate ? ` @1€=$${Number(rate).toFixed(4)}` : ''}
                        </span>
                        : <Tltip direction='left' tltpText="Re-express the table in another unit/currency for viewing & printing. Conversions are display-only at the contract-date rate — the contract is still stored & saved in its own unit/currency, so the PO PDF, Invoices, Stock and Accounting are unaffected. Switch back to the base to edit.">
                            <span className="text-[var(--regent-gray)] cursor-help">(display only)</span>
                        </Tltip>}
                </div>
                <div className="relative overflow-x-auto">
                    <div className="border border-[var(--line)] rounded-lg  relative">
                        <table className=" table-fixed min-w-[640px] w-full divide-y divide-[var(--line)]">
                            <thead style={{ background: 'var(--bg-subtle)' }}>
                                <tr>
                                    <th scope="col" className=" w-1/12 py-1 pl-4 "></th>
                                    <th scope="col" className="w-1/12 px-1 py-1 text-left responsiveTextTable font-medium text-[var(--chathams-blue)]"  >
                                        #</th>
                                    {/* Takes the width the Grade column had (retired 2026-10-02): the
                                        material's name and spec are entered in Materials Breakdown. */}
                                    <th scope="col" className="w-6/12 px-1 py-1 text-left responsiveTextTable font-medium text-[var(--chathams-blue)]" >
                                        {getTtl('Description', ln)}  </th>
                                    <th scope="col" className=" w-2/12 px-1 py-1 text-left responsiveTextTable font-medium text-[var(--chathams-blue)]" >
                                        <div>   {getTtl('Quantity', ln)} <span className={`font-medium ${viewUnit ? 'text-[var(--endeavour)]' : ''}`}>
                                            {qtyHeaderLabel ? '(' + qtyHeaderLabel + ')' : ''}</span></div></th>
                                    <th scope="col" className="w-2/12 px-1 py-1 text-left responsiveTextTable font-medium text-[var(--chathams-blue)]" >
                                        <div>{perContent ? getTtl('PricePerContent', ln) : getTtl('UnitPrice', ln)} <span className={`font-medium ${(viewUnit || viewCur) ? 'text-[var(--endeavour)]' : ''}`}>
                                            {/* The per-MT suffix would misdescribe a content-based price, so only the
                                                currency stays once the column is no longer a unit price. */}
                                            {perContent ? (baseCode ? '(' + baseCode + ')' : '')
                                                : (priceHeaderLabel ? '(' + priceHeaderLabel + ')' : '')}</span></div></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--line)] relative">
                                {reOrderTableCon(value.productsData.filter(x => !x.import)).map((obj, i) => {
                                    // What the row draws is trimmed to four keys; the rest of the line
                                    // (contentPrc, the formulas) is read from the stored product.
                                    const full = value.productsData.find(z => z.id === obj.id) || obj;
                                    const qtyFormula = effViewUnit === baseUnit ? liveFormula(full.eqQnty, full.qnty) : null;
                                    return (
                                        <tr key={i} className='relative hover:z-10'>
                                            <td className="py-2 pl-4">
                                                <div className="flex items-center h-5">
                                                    <ChkBox checked={checkedItems.includes(obj.id)} size='h-5 w-5' onChange={() => checkItem(obj.id)} />
                                                </div>
                                            </td>
                                            <td className="px-1 py-2 ">
                                                <div className="flex items-center h-5 responsiveTextTable text-[var(--port-gore)]">
                                                    {i + 1}
                                                </div>
                                            </td>
                                            {Object.keys(obj)
                                                .slice(1)
                                                // contentPrc rides inside the price cell — it must not become a column
                                                // of its own, since the columns are just the product object's keys.
                                                .filter((key) => key !== 'contentPrc')
                                                .map((key) => {
                                                    // In per-content mode the price cell edits contentPrc (free text)
                                                    // instead of unitPrc, so the stored number is never overwritten.
                                                    const editKey = perContent && key === 'unitPrc' ? 'contentPrc' : key;
                                                    return (
                                                    <td
                                                        key={key}
                                                        data-label={key}
                                                        className="px-1 py-1 responsiveTextTable text-[var(--port-gore)] whitespace-normal tableStyle relative overflow-visible"
                                                        onClick={() => handleDoubleClick(obj, editKey)}
                                                    >
                                                        {edit.status &&
                                                            edit.id === obj['id'] &&
                                                            edit.header === editKey ? (
                                                            // flex-wrap: the result preview and the character count take their own
                                                            // line INSIDE the cell. Hung below it they were cut off by the table's
                                                            // scroll box whenever the row was the last one.
                                                            <div className='group relative whitespace-normal flex flex-wrap items-center gap-1'>
                                                                {key === 'description' ? (
                                                                    <textarea
                                                                        className="input flex-1 min-w-0 border rounded-lg border-slate-400 px-1.5 py-1 resize-none
                                focus:outline-0 focus:border-slate-600"
                                                                        style={{ fontSize: 'inherit', fontFamily: 'inherit', lineHeight: 'inherit' }}
                                                                        rows={2}
                                                                        onKeyDown={handleKeyPress}
                                                                        value={value1}
                                                                        maxLength={DESC_MAX}
                                                                        name={editKey}
                                                                        onChange={(e) => setInput(e)}
                                                                        ref={inputRef}
                                                                    />
                                                                ) : (
                                                                    <input
                                                                        className="input flex-1 min-w-0 border rounded-lg border-slate-400 h-7
                                focus:outline-0 focus:border-slate-600 indent-1.5"
                                                                        style={{ fontSize: 'inherit', fontFamily: 'inherit' }}
                                                                        onKeyDown={handleKeyPress}
                                                                        value={value1}
                                                                        maxLength={70}
                                                                        name={editKey}
                                                                        onChange={(e) => setInput(e)}
                                                                        ref={inputRef}
                                                                        type='text'
                                                                    />
                                                                )}
                                                                {key === 'description' && String(value1 ?? '').length >= DESC_MAX - 25 && (
                                                                    <span className='basis-full text-right text-[var(--ink-muted)] font-medium tabular-nums whitespace-nowrap'>
                                                                        {String(value1 ?? '').length}/{DESC_MAX}
                                                                    </span>
                                                                )}
                                                                {(key === 'qnty' || key === 'unitPrc') && (
                                                                    <div className='relative shrink-0' onClick={(e) => e.stopPropagation()}>
                                                                        <select
                                                                            value={inputUnit}
                                                                            onChange={(e) => handleUnitSwitch(e.target.value)}
                                                                            title={`Switch the unit to convert the value; it's stored in the contract's ${UNIT_LABEL[baseUnit]} base on Enter`}
                                                                            className={`appearance-none h-7 rounded-lg border bg-[var(--bg-subtle)] pl-2 pr-5 font-semibold cursor-pointer focus:outline-0 transition-colors
                                                                                ${inputUnit === baseUnit
                                                                                    ? 'border-[var(--line-strong)] text-[var(--chathams-blue)]'
                                                                                    : 'border-[var(--endeavour)] text-[var(--endeavour)] bg-[var(--bg-subtle)]'}`}
                                                                            style={{ fontSize: 'inherit', fontFamily: 'inherit' }}
                                                                        >
                                                                            <option value='mt'>{key === 'unitPrc' ? '/MT' : 'MT'}</option>
                                                                            <option value='kg'>{key === 'unitPrc' ? '/Kg' : 'Kg'}</option>
                                                                            <option value='lb'>{key === 'unitPrc' ? '/Lb' : 'Lb'}</option>
                                                                        </select>
                                                                        <ChevronDown className={`pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 size-3
                                                                            ${inputUnit === baseUnit ? 'text-[var(--chathams-blue)]' : 'text-[var(--endeavour)]'}`} />
                                                                    </div>
                                                                )}
                                                                {convPreview && (
                                                                    <div className='basis-full'>
                                                                        <span className='inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[var(--bg-subtle)] border border-[var(--line)] text-[var(--endeavour)] font-semibold whitespace-nowrap'>
                                                                            <MoveRight className='size-3' />
                                                                            {convPreview}
                                                                        </span>
                                                                    </div>
                                                                )}
                                                                <span className={`absolute hidden ${key === 'unitPrc' && String(value1).substr(0, 1) === "=" ? 'group-hover:flex' : ''}
                                                                 bottom-[30px] w-fit tooltip-pill text-center z-tooltip whitespace-nowrap -left-0.5`}>
                                                                    {value1}</span>
                                                            </div>
                                                        ) : key === 'unitPrc' ?
                                                            // Mode wins over a hand-typed price: POs that predate this were given
                                                            // text like "$2,200*" by hand, and switching to Price per content is
                                                            // how those get migrated onto the real setting. "See below*" is only
                                                            // the default — click the cell to write the basis in directly.
                                                            perContent ?
                                                                (String(full.contentPrc ?? '').trim()
                                                                    ? <span className="font-medium">{full.contentPrc}</span>
                                                                    : <span className="text-[var(--ink-secondary)] font-medium">{SEE_BELOW}</span>) :
                                                                isNaN(obj[key] * 1) ?
                                                                    obj[key] :
                                                                    <NumericFormat
                                                                        value={toDispPrice(obj[key])}
                                                                        displayType="text"
                                                                        thousandSeparator
                                                                        allowNegative={false}
                                                                        prefix={viewSymbol}
                                                                        decimalScale='2'
                                                                        fixedDecimalScale
                                                                    />
                                                            : key === 'qnty' ? (
                                                                // Hovering a calculated quantity shows the formula behind it.
                                                                <span title={qtyFormula || undefined}>
                                                                    <NumericFormat
                                                                        value={toDispQnty(obj[key])}
                                                                        displayType="text"
                                                                        thousandSeparator
                                                                        allowNegative={true}
                                                                        decimalScale={qDec}
                                                                        fixedDecimalScale
                                                                    />
                                                                </span>
                                                            ) : obj[key]
                                                        }
                                                    </td>
                                                    );
                                                })}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div className="flex gap-x-3 flex-wrap mt-4">
                    <Tltip direction='top' tltpText={getTtl('AddProduct', ln)}>
                        <button
                            className="blackButton py-1"
                            onClick={() => addItem()}
                        >
                            <BtnIcon action="add" />
                            {getTtl('Add', ln)}
                        </button>
                    </Tltip>
                    <Tltip direction='top' tltpText={getTtl('DelProduct', ln)}>
                        <button
                            className="whiteButton py-1"
                            onClick={() => delItem()}
                        >
                            <BtnIcon action="delete" />
                            {getTtl('Delete', ln)}
                        </button>
                    </Tltip>
                    <Tltip direction='top' tltpText={getTtl('POInvoices', ln)}>
                        <button
                            className={`whiteButton py-1 ${!value.productsData.map(x => x.description).some(item => item !== '') ? 'opacity-50 cursor-not-allowed' : ''}`}
                            onClick={openInvoicesModal}
                            disabled={!value.productsData.map(x => x.description).some(item => item !== '')}
                        >
                            <BtnIcon action="invoices" />
                            {getTtl('Invoices', ln)}
                        </button>
                    </Tltip>
                    <Tltip direction='top' tltpText={getTtl('warehouse', ln)}>
                        <button
                            className={`whiteButton py-1 ${!checkIfAlllowed() ? 'opacity-50 cursor-not-allowed' : ''}`}
                            disabled={!checkIfAlllowed()}
                            onClick={() => setShowStockModal(true)}
                        >
                            <BtnIcon action="stocks" />
                            {getTtl('Stocks', ln)}
                        </button>
                    </Tltip>
                </div>
            </div>
        </div>
    );
}

export default ProductsTable;
