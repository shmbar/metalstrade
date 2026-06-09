import { useState, useRef, useEffect, useContext } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { NumericFormat } from 'react-number-format';
import ChkBox from '@components/checkbox.js'
import { getD, reOrderTableCon } from '@utils/utils.js';
import { CalculateNum } from '@components/calculate';
import { SettingsContext } from "@contexts/useSettingsContext";
import { getTtl } from '@utils/languages.js';
import { ScrollText, Warehouse, Trash, CirclePlus, ChevronDown, MoveRight } from "lucide-react"
import Tltip from '@components/tlTip'
import { getCur } from '@components/exchangeApi'

// The PO stores weight (qnty) and price (unitPrc) in the contract's OWN unit/currency
// (its Quantity selector + Currency = the "base"). Every other view in the app — the PO PDF,
// the contracts list, derived invoices/stock — reads these raw numbers. So conversions here
// are display-only: a per-cell Lb/Kg input helper (converts entry to the base unit) and an
// ephemeral "View in" overlay (re-expresses the table on screen). Stored data never changes.
const LB_PER_MT = 2204.6226218; // 1 metric tonne = 2204.6226218 lb
const KG_PER_MT = 1000;         // 1 metric tonne = 1000 kg

// 1 MT expressed in each unit (weight). Used as a common pivot for unit<->unit conversion.
const W_FACTOR = { mt: 1, kg: KG_PER_MT, lb: LB_PER_MT };
const UNIT_LABEL = { mt: 'MT', kg: 'KGS', lb: 'LB' };
// Display decimals per weight unit (kg/lb numbers are larger, so fewer decimals).
const Q_DEC = { mt: 3, kg: 1, lb: 1 };

const roundTo = (n, d) => { const f = 10 ** d; return Math.round(n * f) / f; };

// Map a Quantity label ('MT' | 'KGS' | 'LB') to a unit code. Empty/unknown -> 'mt'.
const unitFromLabel = (label) => {
    const l = String(label || '').toLowerCase();
    if (l.includes('kg')) return 'kg';
    if (l.includes('lb')) return 'lb';
    return 'mt';
};

// Weight: value_to = value_from * (1 MT in `to`) / (1 MT in `from`).
const convertWeight = (num, fromUnit, toUnit) => num * ((W_FACTOR[toUnit] ?? 1) / (W_FACTOR[fromUnit] ?? 1));
// Per-unit price moves the opposite way (per-lb -> per-MT multiplies up).
const convertPrice = (num, fromUnit, toUnit) => num * ((W_FACTOR[fromUnit] ?? 1) / (W_FACTOR[toUnit] ?? 1));

const ProductsTable = ({ value, setValue, currency, quantityTable, setShowPoInvModal, setShowStockModal, setToast, contractsData }) => {

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
        const object = value.productsData.find(z => z.id === obj.id);

        // Values are always edited in the contract's base unit/currency (what's stored).
        // While a converted "View in" overlay is active, qnty/price are read-only.
        const inBaseView = (viewUnit === '' || viewUnit === baseUnit) && (viewCur === '' || viewCur === baseCur);
        if ((key === 'qnty' || key === 'unitPrc') && !inBaseView) {
            setToast({ show: true, text: 'Set “View in” back to the contract’s own unit/currency to edit values.', clr: 'fail' });
            return;
        }

        setValue1(object.eq && key === 'unitPrc' ? object.eq : obj[key]); // raw base value
        setEdit({ status: true, id: obj['id'], header: key });
        setInputUnit(baseUnit); // default entry unit = the contract's base unit
    };

    const handleKeyPress = (e) => {
        // const isValidInputQnty = /^\d+(\.\d{0,3})?$/.test(e.target.value);

        if (e.key === 'Enter') {

            /*            if (e.target.name === "qnty" && !isValidInputQnty) {
                            setToast({ show: true, text: 'Please enter numbers only with at most three letters after the dot!', clr: 'fail' })
                            return;
                        }
            */

            const baseUnit = unitFromLabel(getD(quantityTable, value, 'qTypeTable'));
            const isEquation = (e.target.value).substr(0, 1) === "=";
            let Nm = edit.header !== 'unitPrc' ? e.target.value : CalculateNum(e.target.value, 10)

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

            const newArr = value.productsData.map((x) =>
                x.id === edit.id ? {
                    ...x, [edit.header]: Nm,
                    // a converted price no longer equals its typed equation, so drop the stored eq
                    eq: e.target.name === 'unitPrc'
                        ? (converted ? null : (isEquation ? e.target.value : null))
                        : x.eq ?? null
                } : x
            );

            setValue({ ...value, productsData: newArr });
            setEdit({ status: false, id: null, header: null });
            setValue1('');
            setInputUnit(baseUnit);
        }

        if (e.key === 'Escape') {
            setEdit({ status: false, id: null, header: null });
            setValue1('');
            setInputUnit(unitFromLabel(getD(quantityTable, value, 'qTypeTable')));
        }
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

    // USD<->EUR at the contract-date rate (rate = USD per 1 EUR). Same/unknown currency passes through.
    const convCur = (price) => {
        const p = Number(price);
        if (!effViewCur || effViewCur === baseCode || !rate) return p;
        const usd = baseCode === 'USD' ? p : p * rate;          // base -> USD
        return effViewCur === 'USD' ? usd : usd / rate;         // USD -> view
    };
    const toDispQnty = (raw) => (raw === '' || raw == null) ? '' : convertWeight(Number(raw), baseUnit, effViewUnit);
    const toDispPrice = (raw) => (raw === '' || raw == null) ? '' : convCur(convertPrice(Number(raw), baseUnit, effViewUnit));

    // Header labels — show the raw base labels until a view is actually selected (no visual change by default).
    const qtyHeaderLabel = viewUnit ? UNIT_LABEL[effViewUnit] : q;
    const priceHeaderLabel = (viewUnit || viewCur)
        ? effViewCur + (effViewUnit === 'mt' ? '' : '/' + UNIT_LABEL[effViewUnit])
        : c;

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

    // Live hint shown while keying in a non-base unit — exactly what will be stored (in the base unit).
    const convPreview = (() => {
        if (!edit.status || inputUnit === baseUnit) return null;
        if (edit.header !== 'qnty' && edit.header !== 'unitPrc') return null;
        let numStr = value1;
        if (edit.header === 'unitPrc') {
            try { numStr = CalculateNum(String(value1 ?? ''), 10); } catch { return null; }
        }
        const n = parseFloat(numStr);
        if (isNaN(n)) return null;
        const baseLabel = UNIT_LABEL[baseUnit];
        const res = edit.header === 'unitPrc' ? convertPrice(n, inputUnit, baseUnit) : convertWeight(n, inputUnit, baseUnit);
        return edit.header === 'unitPrc'
            ? `${curSymbol}${res.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} /${baseLabel}`
            : `${res.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} ${baseLabel}`;
    })();

    const setInput = (e) => {
        let t = e.target.value;
        t = t.indexOf(".") >= 0 && e.target.name === 'unitPrc' && t.substr(0, 1) !== "=" ? t.slice(0, t.indexOf(".") + 10) : t;
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
    //overflow-x-auto

    return (
        <div className="w-full justify-center flex">
            <div className="flex flex-col w-full">
                <div className="flex items-center justify-end gap-3 mb-1.5 responsiveTextTable flex-wrap">
                    <span className="text-[var(--regent-gray)] font-medium">View in:</span>
                    <div className="inline-flex rounded-full border border-[#d8e8f5] overflow-hidden">
                        {['mt', 'kg', 'lb'].map((u) => (
                            <button key={u} type="button" onClick={() => setViewUnit(u)}
                                className={`px-2.5 py-0.5 font-semibold transition-colors border-l first:border-l-0 border-[#d8e8f5] ${effViewUnit === u ? 'bg-[var(--endeavour)] text-white' : 'bg-[#f8fbff] text-[var(--chathams-blue)] hover:bg-[#eaf4fd]'}`}>
                                {UNIT_LABEL[u]}
                            </button>
                        ))}
                    </div>
                    {canFx && (
                        <div className="inline-flex rounded-full border border-[#d8e8f5] overflow-hidden">
                            <button type="button" onClick={() => setViewCurrency(baseCode)}
                                className={`px-2.5 py-0.5 font-semibold transition-colors ${effViewCur === baseCode ? 'bg-[var(--endeavour)] text-white' : 'bg-[#f8fbff] text-[var(--chathams-blue)] hover:bg-[#eaf4fd]'}`}>
                                {curSymbol} {baseCode}
                            </button>
                            <button type="button" onClick={() => setViewCurrency(otherCur)}
                                className={`px-2.5 py-0.5 font-semibold border-l border-[#d8e8f5] transition-colors ${effViewCur === otherCur ? 'bg-[var(--endeavour)] text-white' : 'bg-[#f8fbff] text-[var(--chathams-blue)] hover:bg-[#eaf4fd]'}`}>
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
                    <div className="border border-[#b8ddf8] rounded-lg  relative">
                        <table className=" table-fixed min-w-[640px] w-full divide-y divide-[#b8ddf8]">
                            <thead style={{ background: '#dbeeff' }}>
                                <tr>
                                    <th scope="col" className=" w-1/12 py-1 pl-4 "></th>
                                    <th scope="col" className="w-1/12 px-1 py-1 text-left responsiveTextTable font-medium text-[var(--chathams-blue)]"  >
                                        #</th>
                                    <th scope="col" className="w-6/12 px-1 py-1 text-left responsiveTextTable font-medium text-[var(--chathams-blue)]" >
                                        {getTtl('Description', ln)}  </th>
                                    <th scope="col" className=" w-2/12 px-1 py-1 text-left responsiveTextTable font-medium text-[var(--chathams-blue)]" >
                                        <div>   {getTtl('Quantity', ln)} <span className={`font-medium ${viewUnit ? 'text-[var(--endeavour)]' : ''}`}>
                                            {qtyHeaderLabel ? '(' + qtyHeaderLabel + ')' : ''}</span></div></th>
                                    <th scope="col" className="w-2/12 px-1 py-1 text-left responsiveTextTable font-medium text-[var(--chathams-blue)]" >
                                        <div>{getTtl('UnitPrice', ln)} <span className={`font-medium ${(viewUnit || viewCur) ? 'text-[var(--endeavour)]' : ''}`}>
                                            {priceHeaderLabel ? '(' + priceHeaderLabel + ')' : ''}</span></div></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#b8ddf8] relative">
                                {reOrderTableCon(value.productsData.filter(x => !x.import)).map((obj, i) => {
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
                                                .map((key) => (
                                                    <td
                                                        key={key}
                                                        data-label={key}
                                                        className="px-1 py-1 responsiveTextTable text-[var(--port-gore)] whitespace-normal tableStyle relative overflow-visible"
                                                        onClick={() => handleDoubleClick(obj, key)}
                                                    >
                                                        {edit.status &&
                                                            edit.id === obj['id'] &&
                                                            edit.header === key ? (
                                                            <div className='group relative whitespace-normal flex items-center gap-1'>
                                                                <input
                                                                    className="input flex-1 min-w-0 border rounded-md border-slate-400 h-7
                                focus:outline-0 focus:border-slate-600 indent-1.5"
                                                                    style={{ fontSize: 'inherit', fontFamily: 'inherit' }}
                                                                    onKeyDown={handleKeyPress}
                                                                    value={value1}
                                                                    maxLength={70}
                                                                    name={key}
                                                                    onChange={(e) => setInput(e)}
                                                                    ref={inputRef}
                                                                    type='text'
                                                                />
                                                                {(key === 'qnty' || key === 'unitPrc') && (
                                                                    <div className='relative shrink-0' onClick={(e) => e.stopPropagation()}>
                                                                        <select
                                                                            value={inputUnit}
                                                                            onChange={(e) => { setInputUnit(e.target.value); inputRef.current?.focus(); }}
                                                                            title={`Enter the value in this unit — converted to the contract's ${UNIT_LABEL[baseUnit]} base on Enter`}
                                                                            className={`appearance-none h-7 rounded-md border bg-[#f8fbff] pl-2 pr-5 font-semibold cursor-pointer focus:outline-0 transition-colors
                                                                                ${inputUnit === baseUnit
                                                                                    ? 'border-[#d8e8f5] text-[var(--chathams-blue)]'
                                                                                    : 'border-[var(--endeavour)] text-[var(--endeavour)] bg-[#eaf4fd]'}`}
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
                                                                    <span className='absolute left-0 top-full mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#dbeeff] border border-[#b8ddf8] text-[var(--endeavour)] font-semibold shadow-sm whitespace-nowrap z-50'>
                                                                        <MoveRight className='size-3' />
                                                                        {convPreview}
                                                                    </span>
                                                                )}
                                                                <span className={`absolute hidden ${key === 'unitPrc' && String(value1).substr(0, 1) === "=" ? 'group-hover:flex' : ''}
                                                                 bottom-[30px] w-fit p-1  bg-slate-400 rounded-md text-center
                                                                  text-white responsiveTextTable z-50 whitespace-nowrap -left-0.5`}>
                                                                    {value1}</span>
                                                            </div>
                                                        ) : key === 'unitPrc' ?
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
                                                                <NumericFormat
                                                                    value={toDispQnty(obj[key])}
                                                                    displayType="text"
                                                                    thousandSeparator
                                                                    allowNegative={true}
                                                                    decimalScale={qDec}
                                                                    fixedDecimalScale
                                                                />
                                                            ) : obj[key]
                                                        }
                                                    </td>
                                                ))}
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
                            <CirclePlus className='size-4' />
                            {getTtl('Add', ln)}
                        </button>
                    </Tltip>
                    <Tltip direction='top' tltpText={getTtl('DelProduct', ln)}>
                        <button
                            className="whiteButton py-1"
                            onClick={() => delItem()}
                        >
                            <Trash className='size-4' />
                            {getTtl('Delete', ln)}
                        </button>
                    </Tltip>
                    <Tltip direction='top' tltpText={getTtl('POInvoices', ln)}>
                        <button
                            className={`whiteButton py-1 ${!value.productsData.map(x => x.description).some(item => item !== '') ? 'opacity-50 cursor-not-allowed' : ''}`}
                            onClick={openInvoicesModal}
                            disabled={!value.productsData.map(x => x.description).some(item => item !== '')}
                        >
                            <ScrollText className='size-4' />
                            {getTtl('Invoices', ln)}
                        </button>
                    </Tltip>
                    <Tltip direction='top' tltpText={getTtl('warehouse', ln)}>
                        <button
                            className={`whiteButton py-1 ${!checkIfAlllowed() ? 'opacity-50 cursor-not-allowed' : ''}`}
                            disabled={!checkIfAlllowed()}
                            onClick={() => setShowStockModal(true)}
                        >
                            <Warehouse className='size-4' />
                            {getTtl('Stocks', ln)}
                        </button>
                    </Tltip>
                </div>
            </div>
        </div>
    );
}

export default ProductsTable;
