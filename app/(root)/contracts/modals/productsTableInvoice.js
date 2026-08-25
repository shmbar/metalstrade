import { useState, useRef, useEffect, useContext } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { NumericFormat } from 'react-number-format';
import ChkBox from '@components/checkbox.js'
import { } from 'lucide-react';
import { filteredArray, getD, loadStockDataPerDescription, sortArr } from '@utils/utils.js';
import { SettingsContext } from "@contexts/useSettingsContext";
import SlctOpt from '@components/invoicePrdSlct'
import { CalculateNum } from '@components/calculate';
import { getTtl } from '@utils/languages';
import CheckBox from '@components/checkbox.js';
import FindCOntract4Materials from '@components/findContract4Materials';
import { Selector } from '@components/selectors/selectShad';
import { Import } from 'lucide-react';
import Tltip from '@components/tlTip'
import { BtnIcon } from '@components/buttonIcons';


const cols = ['container', 'qnty', 'unitPrc', 'total', 'stock', 'stockValue']

// Round to whole cents. Subtracting two already-rounded amounts can leave a
// float residue (e.g. 31864.8099999998) that NumericFormat truncates but Intl
// rounds — wrapping the whole expression in round2 keeps every surface in sync.
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

const ProductsTable = ({ value, setValue, currency, settings, uidCollection, setDeleteProducts, materialsArr,
    certOpen, setCertOpen, salesContracts = []
}) => {

    const [checkedItems, setCheckedItems] = useState([]);
    const [edit, setEdit] = useState({ status: false, id: null, header: null });
    const inputRef = useRef(null);
    const [value1, setValue1] = useState('0');
    const [percent, setPercent] = useState(false)
    const [prepayment, setPrepayment] = useState(false)
    const fnl = value.final;
    const { setToast, ln, compData } = useContext(SettingsContext);
    const [valueDesc, setValueDesc] = useState('')
    const [openFindContract, setOpenFindContract] = useState(false)


    useEffect(() => {

        if (edit.status || percent || prepayment) {
            inputRef.current.focus();
            const valueLength = inputRef.current.value.length;
            inputRef.current.setSelectionRange(valueLength, valueLength);
        }

    }, [edit.status, percent, prepayment]);

    const addItem = () => {

        if (materialsArr.length === 0) {
            setToast({ show: true, text: getTtl('TableIsEmpty', ln), clr: 'fail' })
            return;
        }

        let newArr = [
            ...value.productsDataInvoice,
            {
                id: uuidv4(), po: '', descriptionId: '', container: '', qnty: '0', unitPrc: '0', total: 0,
                descriptionText: '', mtrlStatus: 'select', stock: '', stockValue: '',
                // Empty = "follow the invoice's own Sales Contract link". Only a row
                // deliberately tagged to a different client PO carries a value here.
                salesContractId: ''
            },
        ];
        setValue({ ...value, productsDataInvoice: newArr });
    };

    const checkItem = (i) => {
        if (checkedItems.includes(i)) {
            setCheckedItems(checkedItems.filter((x) => x !== i));
        } else {
            setCheckedItems([...checkedItems, i]);
        }
    };

    const delItem = () => {

        let tmptotalAmount = value.productsDataInvoice.filter((item) => !checkedItems.includes(item.id))
            .map(x => x.total).reduce((accumulator, currentValue) => accumulator + currentValue, 0)

        setValue({
            ...value, productsDataInvoice: value.productsDataInvoice.filter((item) => !checkedItems.includes(item.id)), totalAmount: tmptotalAmount,
            totalPrepayment: value.invType === '1111' ? value.percentage !== '' ?
                Math.round((value.percentage / 100 * tmptotalAmount) * 100) / 100 : '' : value.totalPrepayment,
            balanceDue: (value.invType === '2222' || value.invType === '3333') ? Math.round((tmptotalAmount - value.totalPrepayment) * 100) / 100 :
                value.balanceDue,
        });

        setDeleteProducts(checkedItems)
        setCheckedItems([]);
    };

    const handleDoubleClick = (obj, key) => {

        let object = value.productsDataInvoice.find(z => z.id === obj.id)


        if (!['total', 'description', 'stock', 'stockValue'].includes(key)) {
            setValue1((object.eqUnitPrc || object.eq) && key === 'unitPrc' ? (object.eqUnitPrc || object.eq) :
                object.eqQnty && key === 'qnty' ? object.eqQnty : obj[key]);
            setEdit({ status: true, id: obj['id'], header: key });
            setPercent(false)
            setPrepayment(false)
        }
    };

    const handleClick1 = () => {
        setPercent(true)
        setPrepayment(false)
        setEdit({ status: false, id: null, header: null });
        setValue1(value.percentage);
    }

    const handleClick2 = () => {
        setPrepayment(true)
        setPercent(false)
        setEdit({ status: false, id: null, header: null });
        setValue1(value.totalPrepayment);
    }

    const handleClick3 = (obj, name) => {
        setValueDesc(obj[name]);
        setEdit({ status: true, id: obj['id'], header: 'description' });
        setPercent(false)
        setPrepayment(false)
    }


    const handleKeyPress = (e) => {
        //  const isValidInputUnitPrc = /^\d+(\.\d{0,2})?$/.test(e.target.value);
        //   const isValidInputQnty = /^\d+(\.\d{0,3})?$/.test(e.target.value);
        const isEquation = (e.target.value).substr(0, 1) === "=";

        if (e.key === 'Enter') {

            /*  if (e.target.name === "unitPrc" && !isValidInputUnitPrc && !isEquation) {
                  setToast({ show: true, text: getTtl('Please enter numbers only!', ln), clr: 'fail' })
                  return;
              }
  
              if (e.target.name === "qnty" && !isValidInputQnty && !isEquation) {
                  setToast({ show: true, text: getTtl('NumbersOnlyWith3digits', ln), clr: 'fail' })
                  return; 
              }*/

            let Nm = edit.header === 'unitPrc' ? CalculateNum(e.target.value, 10) :
                edit.header === 'qnty' ? CalculateNum(e.target.value, 10) :
                    e.target.value


            let newArr = value.productsDataInvoice.map((x) =>
                x.id === edit.id ? {
                    ...x, [edit.header]: Nm,
                    // Typing the client's PO number on a line links that line to the matching
                    // Sales Contract, the same way the header field already auto-matches what
                    // is typed into "Client Contract #". Without this the number had to be
                    // entered twice — once as text for the printed invoice, once in the picker.
                    // Only fills a BLANK tag, so a deliberate override is never overwritten.
                    salesContractId: (edit.header === 'po' && !x.salesContractId)
                        ? (matchSalesContract(Nm) || x.salesContractId || '')
                        : x.salesContractId,
                    eqUnitPrc: e.target.name === 'unitPrc' ? (isEquation ? e.target.value : null)
                        : x.eqUnitPrc ?? null,
                    eqQnty: e.target.name === 'qnty' ? (isEquation ? e.target.value : null)
                        : x.eqQnty ?? null
                } : x
            );

            newArr = newArr.map(x => ({
                ...x, total: x.qnty === "s" ? x.unitPrc * 1 :
                    x.eqQnty ? eval(x.eqQnty.replace('=', '')) * x.unitPrc :
                        Math.round(x.qnty * x.unitPrc * 100) / 100
            }))


            let tmptotalAmount = newArr.map(x => x.total)
                .reduce((accumulator, currentValue) => accumulator + currentValue, 0)
            tmptotalAmount = Math.round(tmptotalAmount * 100) / 100;

            setValue({
                ...value, productsDataInvoice: newArr, totalAmount: tmptotalAmount,
                totalPrepayment: value.invType === '1111' ? value.percentage !== '' ?
                    Math.round((value.percentage / 100 * tmptotalAmount) * 100) / 100 : '' : value.totalPrepayment,
                balanceDue: (value.invType === '2222' || value.invType === '3333') ? round2(round2(tmptotalAmount) - round2(value.totalPrepayment)) :
                    value.balanceDue
            });
            setEdit({ status: false, id: null, header: null });
            setValue1('');
        }

        if (e.key === 'Escape') {
            setEdit({ status: false, id: null, header: null });
            setValue1('');
        }
    };

    const handleKeyPress1 = (e) => {

        const isValidInputPerc = /^\d+(\.\d{0,2})?$/.test(e.target.value);

        if (e.key === 'Enter') {

            if (!isValidInputPerc) {
                setToast({ show: true, text: getTtl('Please enter numbers only!', ln), clr: 'fail' })
                return;
            }

            setValue({
                ...value, percentage: e.target.value,
                totalPrepayment: round2(e.target.value / 100 * value.totalAmount),
                balanceDue: round2(round2(value.totalAmount) - round2(e.target.value / 100 * value.totalAmount))
            });

            setPercent(false);
            setValue1('');
        }

        if (e.key === 'Escape') {
            setPercent(false);
            setValue1('');
        }
    };

    const handleKeyPress2 = (e) => {
        const isValidInputPrep = /^\d+(\.\d{0,2})?$/.test(e.target.value);


        if (e.key === 'Enter') {

            if (!isValidInputPrep) {
                setToast({ show: true, text: getTtl('Please enter numbers only!', ln), clr: 'fail' })
                return;
            }

            setValue({
                ...value, totalPrepayment: e.target.value, balanceDue: round2(round2(value.totalAmount) - round2(e.target.value))
            });
            setPrepayment(false);
            setValue1('');
        }

        if (e.key === 'Escape') {
            setPrepayment(false);
            setValue1('');
        }
    };

    const handleKeyPress3 = (e) => {

        if (e.key === 'Enter') {
            let newArr = value.productsDataInvoice.map((x) =>
                x.id === edit.id ? { ...x, descriptionText: valueDesc } : x
            );
            setValue({ ...value, productsDataInvoice: newArr });

            setEdit({ status: false, id: null, header: null });
            setValueDesc('');
        }


        if (e.key === 'Escape') {
            setPrepayment(false);
            setValueDesc('');
        }
    }


    const c = fnl ? value.cur.cur : getD(currency, value, 'cur');
    const contTitle = fnl ? value.shpType : value.shpType === '323' ? getTtl('Container No', ln) :
        value.shpType === '434' ? getTtl('Truck No', ln) :
            value.shpType === '565' ? getTtl('Container pls', ln) :
                value.shpType === '787' ? getTtl('Flight No', ln) : ''

    const currentCur = fnl ? value.cur.sym : value.cur && currency.find(x => x.id === value.cur)['symbol']

    const setInput = (e) => {

        let t = e.target.value;

        t = t.indexOf(".") >= 0 && e.target.name === 'unitPrc' && t.substring(0, 1) !== "=" ? t.slice(0, t.indexOf(".") + 10) :
            t.indexOf(".") >= 0 && e.target.name === 'qnty' && t.substring(0, 1) !== "=" ? t.slice(0, t.indexOf(".") + 10) :
                t;
        setValue1(t)
    }


    const selectOrEdit = (val, i) => {

        const normalized = value.productsDataInvoice.map(item => {
            if ("isSelection" in item) {
                const { isSelection, ...clean } = item;
                return {
                    ...clean,
                    mtrlStatus: isSelection ? "select" : "edit"
                };
            }

            // If no isSelection — return item unchanged
            return item;
        });

        let target = normalized[i];

        target = { ...target, mtrlStatus: val };

        if (val === "edit") {
            const desc = materialsArr.find(x => x.id === target.descriptionId)?.description;
            setValueDesc(desc);

            target = {
                ...target,
                descriptionText: desc
            };
        }



        const newArr = [...normalized];
        newArr[i] = target;

        setValue({ ...value, productsDataInvoice: newArr });
    };

    const handleCert = (e, k) => {

        let newArr = value.productsDataInvoice.map((x, i) =>
            i === k ? { ...x, cert: e.target.value } : x
        );

        setValue({ ...value, productsDataInvoice: newArr });


    }

    const handleChange = async (e, name, indx) => {

        const products = [...value.productsDataInvoice];
        const current = products[indx];

        let totalQnty = 0;

        if (current.stock) {
            let stockData = await loadStockDataPerDescription(uidCollection, current.stock, e);

            totalQnty = filteredArray(stockData).reduce(
                (sum, obj) => sum + (obj.type === "in" ? Number(obj.qnty) : -Number(obj.qnty)), 0);
        }

        products[indx] = { ...current, [name]: e, stockValue: totalQnty, };

        setValue(prev => ({ ...prev, productsDataInvoice: products, }));

    }

    // Per-line client PO. Deliberately NOT routed through handleChange above: that one
    // re-queries stock availability for the row, which has nothing to do with which
    // sales contract the line is sold against.
    const handleSalesContract = (id, indx) => {
        const products = [...value.productsDataInvoice];
        products[indx] = { ...products[indx], salesContractId: id || '' };
        setValue(prev => ({ ...prev, productsDataInvoice: products }));
    };

    // Clearing a line returns it to the invoice-level link rather than to "none", which
    // is what the empty value means everywhere else in this feature.
    const clearSalesContract = (_name, indx) => handleSalesContract('', indx);

    // Tolerant number match, same normalisation the header's auto-match uses, so
    // "pb-062971" finds "PB062971".
    const normalizeNo = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const matchSalesContract = (typed) => {
        const target = normalizeNo(typed);
        if (!target) return '';
        return salesContracts.find(sc => normalizeNo(sc.contractNo) === target)?.id || '';
    };

    const handleChangeStockAvailability = async (e, name, indx) => {
        const current = value.productsDataInvoice[indx];

        const stockData = filteredArray(
            await loadStockDataPerDescription(uidCollection, e, current.descriptionId));

        const totalQnty = stockData.reduce(
            (sum, obj) => sum + (obj.type === "in" ? Number(obj.qnty) : -Number(obj.qnty)), 0
        );

        setValue(prev => ({
            ...prev, productsDataInvoice: prev.productsDataInvoice.map((item, i) =>
                i === indx ? { ...item, [name]: e, stockValue: totalQnty } : item),
        }));
    };

  

    return (
        <div className="w-full justify-center flex">
            <div className="flex flex-col w-full">
                <div className=" overflow-x-auto">
                    <div className="border border-[var(--line)] rounded-lg overflow-hidden">
                        <table id='my-table' className="table-fixed min-w-[640px] w-full divide-y divide-[var(--line)]">
                            <thead style={{ background: 'var(--bg-subtle)' }}>
                                <tr>
                                    <th scope="col" className="w-8 py-1 px-2"></th>
                                    <th scope="col" className="w-6 pr-1 py-1 text-left responsiveTextTable font-medium text-[var(--chathams-blue)]">
                                        #</th>
                                    {certOpen && <th scope="col" className="w-14 pr-1 py-1 text-left responsiveTextTable font-medium text-[var(--chathams-blue)]">
                                        Cert</th>}
                                    <th scope="col" className="w-[9%] py-1 px-1 text-left responsiveTextTable font-medium text-[var(--chathams-blue)]">
                                        {getTtl('PO', ln)}#</th>
                                    {/* Client PO per line, so one invoice can cover two or more sales
                                        contracts and each is credited only with its own tonnage.
                                        The 11% comes out of Description (32→25) and Stock (13→9);
                                        the row still totals 100%. */}
                                    <th scope="col" className="w-[11%] px-1 py-1 text-left responsiveTextTable font-medium text-[var(--chathams-blue)]">
                                        {/* The guidance lives here, not on the cells — a tooltip on the
                                            dropdown itself covered the neighbouring rows and blocked the
                                            click. A header is static, so hovering it is harmless. */}
                                        <Tltip direction='top' tltpText={'Which client PO each line is sold against. It fills itself in from the PO# you type on the line; set it by hand only when a line belongs to a different PO than the rest of the invoice. Lines shown in italics follow the invoice’s own Sales Contract.'}>
                                            <span className='cursor-help border-b border-dotted border-[var(--line-strong)]'>Sales PO</span>
                                        </Tltip>
                                    </th>
                                    <th scope="col" className="w-[25%] px-1 py-1 text-left responsiveTextTable font-medium text-[var(--chathams-blue)]">
                                        {getTtl('Description', ln)}</th>
                                    <th scope="col" className="w-[11%] px-1 py-1 text-left responsiveTextTable font-medium text-[var(--chathams-blue)]">
                                        {contTitle}</th>
                                    <th scope="col" className="w-[8%] px-1 py-1 text-left responsiveTextTable font-medium text-[var(--chathams-blue)]">
                                        {getTtl('Quantity', ln)} MT</th>
                                    <th scope="col" className="w-[9%] px-1 py-1 text-left responsiveTextTable font-medium text-[var(--chathams-blue)]">
                                        <div className='table-caption'>{getTtl('UnitPrice', ln)} <span className='responsiveTextTable'>
                                            {c !== '' ? '(' + c + ')' : ''}</span></div></th>
                                    <th scope="col" className="w-[9%] px-1 py-1 text-left responsiveTextTable font-medium text-[var(--chathams-blue)]">
                                        <div>{getTtl('Total', ln)} <span className='responsiveTextTable'>
                                            {c !== '' ? '(' + c + ')' : ''}</span></div></th>
                                    <th scope="col" className="w-[9%] px-1 py-1 text-left responsiveTextTable font-medium text-[var(--chathams-blue)]">
                                        {getTtl('Stock', ln)}</th>
                                    <th scope="col" className="w-[9%] px-1 py-1 text-left responsiveTextTable font-medium text-[var(--chathams-blue)]">
                                        {getTtl('Available Quantity', ln)} (MT)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--line)]">
                                {value.productsDataInvoice.map((obj, i) => {
                                    return (
                                        <tr key={i} className='relative hover:z-10'>
                                            <td className="py-2 px-2 w-8">
                                                <div className="flex items-center h-5">
                                                    <ChkBox checked={checkedItems.includes(obj.id)} size='h-5 w-5' onChange={() => checkItem(obj.id)} />
                                                </div>
                                            </td>
                                            <td className="px-1 py-2 w-6">
                                                <div className="flex items-center h-5 responsiveTextTable text-[var(--port-gore)]">
                                                    {i + 1}
                                                </div>
                                            </td>
                                            {certOpen && <td>
                                                <input value={obj.cert} onChange={e => handleCert(e, i)}
                                                    className="w-14 border rounded-lg border-slate-400 h-7 
                                focus:outline-0 focus:border-slate-600 indent-1.5"
                                                    style={{ fontSize: 'inherit' }}
                                                />
                                            </td>}
                                            <td
                                                data-label='po'
                                                className="px-1 py-1 responsiveTextTable text-[var(--port-gore)] whitespace-normal"
                                                onClick={() => !fnl && handleDoubleClick(obj, 'po')}
                                            >
                                                {edit.status &&
                                                    edit.id === obj['id'] &&
                                                    edit.header === 'po' ? (

                                                    <input
                                                        className="input w-full border rounded-lg border-slate-400 h-7 
                                focus:outline-0 focus:border-slate-600 indent-1.5"
                                                        style={{ fontSize: 'inherit', fontFamily: 'inherit' }}
                                                        onKeyDown={handleKeyPress}
                                                        value={value1}
                                                        maxLength={15}
                                                        name='po'
                                                        onChange={(e) => setInput(e)}
                                                        ref={inputRef}
                                                    />
                                                ) : obj['po']
                                                }
                                            </td>
                                            {/* Sales PO.
                                                NO tooltip on this cell. A Tltip wraps its child as the hover
                                                trigger, and this child is a dropdown: at delayDuration 0 the
                                                bubble opened the moment you moved onto the control, covered the
                                                rows around it and swallowed the click, so the picker could not
                                                be used at all. The explanation lives on the column HEADER, which
                                                is static and safe to hover. Reported by the client on first use.

                                                An untagged row shows the invoice's own link, muted, because that
                                                IS what the row counts against — blank would misread as "not
                                                linked". The clear button only appears on a row that carries its
                                                OWN tag, since clearing an inherited value is a no-op and looked
                                                broken ("I can't delete the selected"). */}
                                            <td
                                                data-label='salesContractId'
                                                className="px-1 py-1 responsiveTextTable text-[var(--port-gore)]"
                                            >
                                                {!fnl ?
                                                    <div className='w-full min-w-0'>
                                                        <Selector
                                                            arr={salesContracts}
                                                            value={{ salesContractId: obj.salesContractId || value.salesContractId || '' }}
                                                            onChange={(e) => handleSalesContract(e, i)}
                                                            name='salesContractId'
                                                            secondaryName='scLabel'
                                                            clear={obj.salesContractId ? clearSalesContract : undefined}
                                                            row={i}
                                                            classes={obj.salesContractId ? '' : 'italic opacity-70'}
                                                        />
                                                    </div>
                                                    :
                                                    <span>{salesContracts.find(s => s.id === (obj.salesContractId || value.salesContractId))?.contractNo || ''}</span>
                                                }
                                            </td>
                                            <td
                                                data-label='description'
                                                className="px-1 py-1 responsiveTextTable text-[var(--port-gore)] whitespace-normal"
                                            >
                                                <div className='flex items-center gap-1'>
                                                    {obj.mtrlStatus === 'select' || obj.isSelection ?

                                                        <Selector arr={materialsArr.map(x => ({ ...x, descriptionId: x.description }))}
                                                            value={value.productsDataInvoice[i]}
                                                            onChange={(e) => handleChange(e, 'descriptionId', i)}
                                                            name='descriptionId'
                                                        />
                                                        :
                                                        <div className='w-full'
                                                            onClick={() => !fnl && handleClick3(obj, 'descriptionText')}
                                                        >
                                                            {edit.status &&
                                                                edit.id === obj['id'] &&
                                                                edit.header === 'description' ?
                                                                <input
                                                                    className="inpiut  w-full border rounded-lg border-slate-400 h-7 
                                focus:outline-0 focus:border-slate-600 indent-1.5"
                                                                    style={{ fontSize: 'inherit', fontFamily: 'inherit' }}
                                                                    onKeyDown={handleKeyPress3}
                                                                    value={valueDesc}
                                                                    maxLength={80}
                                                                    name='description'
                                                                    onChange={(e) => setValueDesc(e.target.value)}
                                                                    ref={inputRef}
                                                                />
                                                                :
                                                                obj.descriptionText
                                                            }
                                                        </div>
                                                    }
                                                    <div className={`${obj.descriptionId === '' ? 'hidden' : 'flex'}`}>
                                                        <SlctOpt isSelection={obj.mtrlStatus === 'select' || obj.isSelection}
                                                            selectOrEdit={selectOrEdit} indx={i} ln={ln} />
                                                    </div>
                                                </div>

                                            </td>


                                            {cols.map((key) => (
                                                <td
                                                    key={key}
                                                    data-label={key}
                                                    className={`px-1 py-1 responsiveTextTable text-[var(--port-gore)] overflow-visible
                                                    ${key === 'stock' ? 'border-l' : ''}`}
                                                    onClick={() => !fnl && handleDoubleClick(obj, key)}
                                                >
                                                    {edit.status &&
                                                        edit.id === obj['id'] &&
                                                        edit.header === key ? (
                                                        <div className='group relative  whitespace-normal'>
                                                            <input
                                                                className="input w-full border rounded-lg border-slate-400 h-7 
                                focus:outline-0 focus:border-slate-600 indent-1.5"
                                                                style={{ fontSize: 'inherit', fontFamily: 'inherit' }}
                                                                onKeyDown={handleKeyPress}
                                                                value={value1}
                                                                maxLength={key === 'container' ? 17 : 100}
                                                                name={key}
                                                                onChange={(e) => setInput(e)}
                                                                ref={inputRef}
                                                            />
                                                            <span className={`absolute hidden ${(key === 'unitPrc' || key === 'qnty') && value1?.substring(0, 1) === "=" ? 'group-hover:flex' : ''}
                                                                 bottom-[30px] w-fit p-1  bg-[var(--tooltip-bg)] border border-[var(--tooltip-border)] shadow-pop rounded-lg text-center
                                                                  text-[var(--tooltip-ink)] responsiveTextTable z-tooltip whitespace-nowrap -left-0.5`}>
                                                                {value1}
                                                            </span>


                                                        </div>
                                                    ) :
                                                        key === 'unitPrc' ? (
                                                            <div className='group relative'>
                                                                <NumericFormat
                                                                    value={obj[key]}
                                                                    displayType="text"
                                                                    thousandSeparator
                                                                    allowNegative={true}
                                                                    prefix={currentCur}
                                                                    decimalScale='2'
                                                                    fixedDecimalScale
                                                                />
                                                                {(obj.eqUnitPrc || obj.eq) && (
                                                                    <span className='absolute hidden group-hover:flex bottom-[20px] w-fit p-1 bg-[var(--tooltip-bg)] border border-[var(--tooltip-border)] shadow-pop rounded-lg text-center text-[var(--tooltip-ink)] responsiveTextTable z-tooltip whitespace-nowrap -left-0.5'>
                                                                        {obj.eqUnitPrc || obj.eq}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        ) : key === 'total' ? (
                                                            <NumericFormat
                                                                value={obj[key]}
                                                                displayType="text"
                                                                thousandSeparator
                                                                allowNegative={true}
                                                                prefix={currentCur}
                                                                decimalScale='2'
                                                                fixedDecimalScale
                                                            />
                                                        ) : key === 'qnty' ? (
                                                            <div className='group relative'>
                                                                {obj[key] !== 's' ? <NumericFormat
                                                                    value={obj[key]}
                                                                    displayType="text"
                                                                    thousandSeparator
                                                                    allowNegative={false}
                                                                    decimalScale='3'
                                                                    fixedDecimalScale
                                                                />
                                                                    :
                                                                    <span>Service</span>}
                                                                {obj.eqQnty && (
                                                                    <span className='absolute hidden group-hover:flex bottom-[20px] w-fit p-1 bg-[var(--tooltip-bg)] border border-[var(--tooltip-border)] shadow-pop rounded-lg text-center text-[var(--tooltip-ink)] responsiveTextTable z-tooltip whitespace-nowrap -left-0.5'>
                                                                        {obj.eqQnty}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        ) : key === 'stock' && obj.qnty !== "s" ?
                                                            <Selector arr={sortArr(settings.Stocks.Stocks, 'stock')}
                                                                value={value.productsDataInvoice[i]}
                                                                onChange={(e) => handleChangeStockAvailability(e, 'stock', i)}
                                                                name='stock'
                                                                secondaryName='nname'
                                                                disabled={obj.descriptionId === ''}
                                                             
                                                            />
                                                            :
                                                            key === 'stock' && obj.qnty === "s" ?
                                                                '' :
                                                                key === 'stockValue' && obj.qnty !== "s" ? (
                                                                    <NumericFormat
                                                                        value={obj[key]}
                                                                        displayType="text"
                                                                        thousandSeparator
                                                                        allowNegative={true}
                                                                        decimalScale={obj[key] === 0 ? 0 : 3}
                                                                        fixedDecimalScale
                                                                    />
                                                                ) : key === 'stockValue' && obj.qnty === "s" ? ''
                                                                    :
                                                                    obj[key]
                                                    }
                                                </td>
                                            ))}
                                        </tr>
                                    );
                                })}
                                <tr >
                                    <td className="py-2 pl-4"></td>
                                    <td className="py-2 pl-4"></td>
                                    <td className="py-2 pl-4"></td>
                                    <td className="py-2 pl-4"></td>
                                    <td className="py-2 pl-4"></td>
                                    <td className="px-1 py-2 responsiveTextTable text-[var(--regent-gray)] whitespace-nowrap border-t border-[var(--line-strong)]">
                                        {getTtl('Total Amount', ln)}:
                                    </td>
                                    <td className="px-1 py-2 border-t border-[var(--line-strong)]"></td>
                                    <td className="px-1 py-2 responsiveTextTable text-[var(--port-gore)] whitespace-nowrap border-t border-[var(--line-strong)]">
                                        <NumericFormat
                                            value={value.totalAmount}
                                            displayType="text"
                                            thousandSeparator
                                            allowNegative={false}
                                            prefix={currentCur}
                                            decimalScale='2'
                                            fixedDecimalScale
                                        />
                                    </td>
                                    <td className="py-2 pl-4"></td>
                                    <td className="py-2 pl-4"></td>
                                </tr>

                                {(value.invType === '1111' || value.invType === 'Invoice') && <tr >
                                    <td className="py-2 pl-4"></td>
                                    <td className="py-2 pl-4"></td>
                                    <td className="py-2 pl-4"></td>
                                    <td className="py-2 pl-4"></td>
                                    <td className="py-2 pl-4"></td>
                                    <td className="px-1 py-2 responsiveTextTable text-[var(--regent-gray)] whitespace-nowrap ">
                                        {(compData?.invPrepaymentLabel?.trim() || getTtl('Prepayment', ln))}:
                                    </td>
                                    <td className="px-1 py-2 responsiveText text-[var(--port-gore)] whitespace-nowrap" onClick={() => !fnl && handleClick1()}>
                                        {percent ?
                                            <input
                                                className="w-full border rounded-lg border-slate-400 h-7 
                focus:outline-0 focus:border-slate-600 indent-1.5"
                                                style={{ fontSize: 'inherit', fontFamily: 'inherit' }}
                                                onKeyDown={handleKeyPress1}
                                                value={value1}
                                                onChange={(e) =>
                                                    setValue1(e.target.value)
                                                }
                                                ref={inputRef}
                                            />
                                            :
                                            <NumericFormat
                                                value={value.percentage}
                                                displayType="text"
                                                allowNegative={false}
                                                suffix={'%'}
                                                fixedDecimalScale
                                            />
                                        }
                                    </td>
                                    <td className="px-1 py-2 responsiveText text-[var(--port-gore)] whitespace-nowrap">
                                        <NumericFormat
                                            value={Math.round((value.totalPrepayment || 0) * 100) / 100}
                                            displayType="text"
                                            thousandSeparator
                                            allowNegative={false}
                                            prefix={currentCur}
                                            decimalScale='2'
                                            fixedDecimalScale
                                        />
                                    </td>
                                    <td className="py-2 pl-4"></td>
                                    <td className="py-2 pl-4"></td>
                                </tr>}

                                {((value.invType === '2222' || value.invType === 'Credit Note') ||
                                    (value.invType === '3333' || value.invType === 'Final Invoice')) && <tr >
                                        <td className="py-2 pl-4"></td>
                                        <td className="py-2 pl-4"></td>
                                        <td className="py-2 pl-4"></td>
                                        <td className="py-2 pl-4"></td>
                                        <td className="py-2 pl-4"></td>
                                        <td className="px-1 py-2 responsiveTextTable text-[var(--regent-gray)] whitespace-nowrap ">
                                            {getTtl('Prepaid Amount', ln)}:
                                        </td>
                                        <td className="py-2 pl-4"></td>
                                        <td className="px-1 py-2 responsiveText text-[var(--port-gore)] whitespace-nowrap" onClick={() => !fnl && handleClick2()}>
                                            {prepayment ?
                                                <input
                                                    className="w-full border rounded-lg border-slate-400 h-7 
                focus:outline-0 focus:border-slate-600 indent-1.5"
                                                    style={{ fontSize: 'inherit', fontFamily: 'inherit' }}
                                                    onKeyDown={handleKeyPress2}
                                                    value={value1}
                                                    onChange={(e) =>
                                                        setValue1(e.target.value)
                                                    }
                                                    ref={inputRef}
                                                />
                                                :
                                                <NumericFormat
                                                    value={Math.round((value.totalPrepayment || 0) * 100) / 100}
                                                    displayType="text"
                                                    thousandSeparator
                                                    allowNegative={true}
                                                    prefix={currentCur}
                                                    decimalScale='2'
                                                    fixedDecimalScale
                                                />
                                            }
                                        </td>
                                        <td className="py-2 pl-4"></td>
                                        <td className="py-2 pl-4"></td>
                                    </tr>
                                }
                                {((value.invType === '2222' || value.invType === 'Credit Note') ||
                                    (value.invType === '3333' || value.invType === 'Final Invoice')) && <tr >
                                        <td className="py-2 pl-4"></td>
                                        <td className="py-2 pl-4"></td>
                                        <td className="py-2 pl-4"></td>
                                        <td className="py-2 pl-4"></td>
                                        <td className="py-2 pl-4"></td>
                                        <td className="px-1 py-2 responsiveTextTable text-[var(--regent-gray)] whitespace-nowrap font-medium">
                                            {getTtl('Balance Due', ln)}:
                                        </td>
                                        <td className="py-2 pl-4"></td>
                                        <td className="px-1 py-2 responsiveText text-[var(--port-gore)] whitespace-nowrap">
                                            <NumericFormat
                                                value={round2(round2(value.totalAmount) - round2(value.totalPrepayment))}
                                                displayType="text"
                                                thousandSeparator
                                                allowNegative={true}
                                                prefix={currentCur}
                                                decimalScale='2'
                                                fixedDecimalScale
                                                style={{ color: Number(value.balanceDue) > 0 ? 'var(--bad-text)' : undefined }}
                                            />

                                        </td>
                                        <td className="py-2 pl-4"></td>
                                        <td className="py-2 pl-4"></td>
                                    </tr>
                                }
                            </tbody>
                        </table>
                    </div>
                </div>
                {!fnl &&
                    <div className="flex gap-3 mt-4 flex-wrap items-center">
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
                        {value.invType === '1111' &&
                            <Tltip direction='top' tltpText='Certification'>
                                <button
                                    className="whiteButton py-1"
                                    onClick={() => { setCertOpen(!certOpen) }}
                                >
                                    <BtnIcon action="certs" />
                                    Certs
                                </button>
                            </Tltip>
                        }
                        <Tltip direction='top' tltpText='Import materials'>
                            <button
                                className="whiteButton py-1"
                                onClick={() => setOpenFindContract(true)}
                            >
                                <BtnIcon action="import" />
                                Import
                            </button>
                        </Tltip>
                        <div className='justify-end flex flex-1 gap-3'>
                            <div className='flex leading-7 items-center gap-1'>
                                <CheckBox size='size-5' checked={value.draft ?? false}
                                    onChange={() => setValue({ ...value, draft: !value.draft })} />
                                <span className='responsiveTextTable'>Draft</span>
                            </div>
                            <div className='flex leading-7 items-center gap-1'>
                                <CheckBox size='size-5' checked={value.completed ?? false}
                                    onChange={() => setValue({ ...value, completed: !value.completed })} />
                                <span className='responsiveTextTable'>Invoice completed</span>
                            </div>
                        </div>
                        {
                            openFindContract &&
                            <FindCOntract4Materials open={openFindContract}
                                setOpen={setOpenFindContract}
                                uidCollection={uidCollection}
                                value={value}
                                setValue={setValue}
                            />
                        }
                    </div>
                }

            </div>



        </div>
    );
}

export default ProductsTable;
