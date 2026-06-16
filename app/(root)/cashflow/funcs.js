
import { useState } from 'react';
import { TbSortAscending, TbSortDescending } from 'react-icons/tb';
import CheckBox from "../../../components/checkbox";
import Tltip from "../../../components/tlTip";
import { Button } from "../../../components/ui/button";
import { filteredArray, groupedArrayInvoice, loadAllStockData, loadCompanyExpense, loadCompanyExpenses, loadData, loadInvoice } from "../../../utils/utils"
import { lotIsSold } from "../contractsstatement/soldStatus"
import dateFormat from 'dateformat';
import { ContactRoundIcon, Save } from "lucide-react";
import { NumericFormat } from "react-number-format";
import DoalogModal from "./dialogSupplier";
import DoalogModalClient from "./dialogClient";



const sortRows = (arr, key, dir) => {
    if (!key) return arr;
    return [...arr].sort((a, b) => {
        const av = a[key], bv = b[key];
        if (!isNaN(parseFloat(av)) && !isNaN(parseFloat(bv)))
            return dir === 'asc' ? parseFloat(av) - parseFloat(bv) : parseFloat(bv) - parseFloat(av);
        const as = String(av ?? ''), bs = String(bv ?? '');
        return dir === 'asc' ? as.localeCompare(bs) : bs.localeCompare(as);
    });
};

const SortTh = ({ colKey, label, sortKey, sortDir, onSort, className = '' }) => (
    <th className={`cursor-pointer select-none ${className}`} onClick={() => onSort(colKey)}>
        <span className="inline-flex items-center gap-1">
            {label}
            {sortKey === colKey && sortDir === 'asc' && <TbSortAscending className="shrink-0" style={{ fontSize: '0.85rem', color: 'var(--endeavour)' }} />}
            {sortKey === colKey && sortDir === 'desc' && <TbSortDescending className="shrink-0" style={{ fontSize: '0.85rem', color: 'var(--endeavour)' }} />}
        </span>
    </th>
);

const useSortState = () => {
    const [sortKey, setSortKey] = useState(null);
    const [sortDir, setSortDir] = useState('asc');
    const handleSort = (key) => {
        if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortKey(key); setSortDir('asc'); }
    };
    return { sortKey, sortDir, handleSort };
};

// Composite key for the running-sum basket (ids are uuids but kind-prefixed to be safe)
const sumKey = (kind, id) => kind + '_' + id;

// Leading per-row toggle that adds/removes an invoice from the running-sum
// basket. Visually distinct from the trailing payment checkbox so the two
// are never confused. `sumSel` is the page-level selection object.
const SumToggle = ({ active, onToggle }) => (
    <Tltip direction='right' tltpText={active ? 'Remove from sum' : 'Add to running sum'}>
        <button type="button" onClick={onToggle}
            className={`flex items-center justify-center w-4 h-4 rounded-[4px] border text-[10px] leading-none font-bold transition-colors ${active
                ? 'bg-[var(--endeavour)] border-[var(--endeavour)] text-white'
                : 'bg-white border-[#b8ddf8] text-[var(--endeavour)] hover:bg-[#dbeeff]'}`}>
            {active ? '✓' : '+'}
        </button>
    </Tltip>
);

// Tiny ∑ header cell for the leading sum-toggle column.
const SumTh = () => (
    <th className="text-left w-6 px-1 py-0">
        <Tltip direction='right' tltpText='Tick invoices to total them in the basket'>
            <span className="text-[var(--chathams-blue)]">&#931;</span>
        </Tltip>
    </th>
);

// Shipment-finalized badge. The only "finalized" signal in the app is the sales
// invoice's shipData.fnlzing (Finalizing const: '4568' = Yes, '2587' = No). A
// finalized shipment means the final invoice has been issued; anything else
// (No, or unset on older data) is still provisional — i.e. a balance from
// BEFORE the final invoice. Used on client balances (read straight off the
// invoice) and supplier balances (mirrored from the linked contract's sales
// invoice via contract id, wired up in cashflow/page.js).
const FinalBadge = ({ fnlzing }) => {
    const yes = fnlzing === '4568';
    // Matches FinalSummaryBadge: soft tint + inset ring + status dot.
    const tone = yes
        ? { dot: '#10b981', text: '#047857', bg: '#ecfdf5', ring: '#a7f3d0' }
        : { dot: '#f59e0b', text: '#b45309', bg: '#fffbeb', ring: '#fde68a' };
    return (
        <Tltip direction='top' tltpText={yes ? 'Shipment finalized — final invoice issued' : 'Not finalized — balance is before the final invoice'}>
            <span
                className="inline-flex items-center gap-1 rounded-full font-semibold leading-none cursor-default whitespace-nowrap"
                style={{
                    color: tone.text,
                    backgroundColor: tone.bg,
                    boxShadow: `inset 0 0 0 1px ${tone.ring}`,
                    fontSize: '0.6rem',
                    padding: '3px 7px',
                }}
            >
                <span className="rounded-full shrink-0" style={{ width: 5, height: 5, backgroundColor: tone.dot }} />
                {yes ? 'Yes' : 'No'}
            </span>
        </Tltip>
    );
};

// Header cell for the "Final" column (same tooltip wording on every table).
const FinalTh = () => (
    <th className="text-left">
        <Tltip direction='top' tltpText='Final invoice issued (shipment finalized)?'>
            <span className="cursor-default">Final</span>
        </Tltip>
    </th>
);

// Aggregate finalized chip for the collapsed summary rows (per supplier / per
// client). A party's balance usually spans several shipments, so a single
// Yes/No is wrong here — instead we show how many of its balance lines have the
// final invoice issued: green "All final", amber "Provisional" (none), or blue
// "n/m final" when mixed. `finalized`/`total` are precomputed in getTotals /
// getTotalsSupPayments.
export const FinalSummaryBadge = ({ finalized = 0, total = 0 }) => {
    if (!total) return null;
    const allDone = finalized === total;
    const noneDone = finalized === 0;
    // Just a small colour-coded status dot next to the name — the per-row
    // "Final" column already spells out Yes/No, so a word here would be
    // redundant. Same dot colours as the table chips: emerald = all finalized ·
    // amber = none yet (provisional) · blue = partial. Meaning is in the tooltip.
    const dot = allDone ? '#10b981' : noneDone ? '#f59e0b' : '#3b82f6';
    const label = allDone ? 'All finalized — final invoice issued'
        : noneDone ? 'Not finalized yet — before final invoice'
            : `${finalized} of ${total} finalized`;
    return (
        <Tltip direction='top' tltpText={label}>
            <span
                className="inline-block shrink-0 rounded-full cursor-default"
                style={{ width: 6, height: 6, backgroundColor: dot }}
            />
        </Tltip>
    );
};

let propDefaults = [
    { accessorKey: 'order', },
    { accessorKey: 'date', },
    { accessorKey: 'supplier', },
    { accessorKey: 'originSupplier', },
    { accessorKey: 'descriptionName', },
    { accessorKey: 'qnty', },
    { accessorKey: 'qTypeTable', },
    { accessorKey: 'unitPrc', },
    { accessorKey: 'total', },
    { accessorKey: 'stock', },
    { accessorKey: 'sType', },
];

let showAmount = (x, y) => {

    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: y,
        minimumFractionDigits: 2
    }).format(x)
}

// Round to whole cents (nearest). Money is stored/derived with occasional
// sub-cent fractions (e.g. a prepayment = percentage * total). Rounding every
// component before we subtract guarantees Amount - Payment === Balance on screen,
// and matches how the PDF / invoice preview already format (Intl rounds too).
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

function isNumber(str) {
    if (typeof str !== "string") {
        return false; // Return false for non-string inputs
    }
    return /^[+-]?(\d+(\.\d*)?|\.\d+)$/.test(str.trim());
}


export const runStocks = async (uidCollection, settings, yr, contractsData = []) => {

    let stockData = await loadAllStockData(uidCollection)
    stockData = stockData.filter(z => z.total !== 0).filter(x => x.draft === undefined || x.draft === false)


    let newArr = []
 
    stockData = stockData.map(x => (
        {
            ...x,
            descriptionName: x.type === 'in' && x.description ?  //Contract Invoice
                x.productsData.find(y => y.id === x.description)?.description :
                x.isSelection || x.mtrlStatus === 'select' ? x.productsData.find(y => y.id === x.descriptionId)?.description : // Invoice 
                    x.type === 'out' && x.moveType === "out" ? x.descriptionName :
                        x.descriptionText
        }))

    // Unsold Stocks is driven by the manual "Sold / Unsold" status on each warehouse lot in
    // the contract's Materials Breakdown. A contract's lots are looked up via its own `stock`
    // id list — NOT via lot.contractData.id — which is what makes duplicated contracts work:
    // a duplicate copies the stock id list, so it resolves to the same (sold) lots and is
    // correctly treated as sold even though those lots point back at the original contract.
    // "Sold" uses the Contracts Statement rule: a lot is sold when marked 'sold' or allocated
    // to a consignee / sales-PO.
    //
    // A whole contract is hidden when it has lots and every one is sold (covers fully-sold
    // contracts and their phantom duplicates). Otherwise each product line is listed unless
    // that product's own lots are all sold. Contracts with no stock yet (nothing received /
    // broken down) still show — they are bought-but-unsold.
    const inLotById = new Map(stockData.filter(l => l.type === 'in').map(l => [l.id, l]));
    const unSoldAll = contractsData.flatMap(con => {
        const ownLots = (con.stock || []).map(id => inLotById.get(id)).filter(Boolean);
        const contractFullySold = ownLots.length > 0 && ownLots.every(lotIsSold);
        if (contractFullySold) return [];
        const rows = [];
        for (const prod of (con.productsData || [])) {
            if (prod.import) continue;
            const prodLots = ownLots.filter(l => l.description === prod.id || l.descriptionId === prod.id);
            // Fully-sold product line drops off.
            if (prodLots.length > 0 && prodLots.every(lotIsSold)) continue;
            // When the material has been received into stock (Materials Breakdown lots), show
            // the actual UNSOLD weight & value from those lots, so the figures match the
            // inventory tables rather than the contracted quantity. When nothing is in stock
            // yet, fall back to the contract quantity (bought-but-unsold, not yet received).
            const unsoldLots = prodLots.filter(l => !lotIsSold(l));
            const qnty = prodLots.length > 0
                ? unsoldLots.reduce((s, l) => s + (Number(l.qnty) || 0), 0)
                : (Number(prod.qnty) || 0);
            const total = prodLots.length > 0
                ? unsoldLots.reduce((s, l) => s + (Number(l.total) || 0), 0)
                : (Number(prod.qnty) || 0) * (Number(prod.unitPrc) || 0);
            // Warehouse(s) the unsold material physically sits in (from its lots).
            const stockName = [...new Set(unsoldLots
                .map(l => { const s = settings?.Stocks?.Stocks?.find(k => k.id === l.stock); return s?.stock || s?.nname; })
                .filter(Boolean))].join(', ');
            rows.push({
                ...prod,
                order: con.order,
                supplier: con.supplier,
                originSupplier: con.originSupplier,
                stockName,
                qnty,
                unitPrc: qnty > 0 ? total / qnty : (Number(prod.unitPrc) || 0),
                total,
                cur: con.cur,
                orderData: { date: con.date, id: con.id },
            });
        }
        return rows;
    });

    const unSoldArrTitles = Object.values(
        unSoldAll.reduce((acc, item) => {
            if (!item?.order) return acc;

            const supplier = item.supplier;
            const supplierName = settings.Supplier.Supplier.find(z => z.id === item.supplier)?.nname;
            const total = Number(item.total) || 0;
            const cur = item.cur;

            if (!acc[supplier]) {
                acc[supplier] = { supplier, total: 0, cur, supplierName };
            }

            acc[supplier].total += total;

            return acc;
        }, {})
    );


    let stocksArrData = [...new Set(stockData.map(x => x.stock))]

    let fieldValues = propDefaults.map(item => item.accessorKey);

    for (let st in stocksArrData) {
        let filteredstockData = stockData.filter(x => x.stock === stocksArrData[st]) //Filter per stockId
        let destcriptionArr = [...new Set(filteredstockData.map(x => (x.description || x.descriptionId)))]

        for (const key in destcriptionArr) {
            let filteredData = filteredstockData.filter(x => ((x.description === destcriptionArr[key]) ||
                (x.descriptionId === destcriptionArr[key])))



            filteredData = filteredArray(filteredData) //Filter Original invoices if there is final invoice

            let totalObj = {}

            for (const x in filteredData) {
                let currentObj = filteredData[x]

                fieldValues.forEach(key => {
                    if (key === 'qnty') {
                        totalObj[key] = (parseFloat(totalObj[key]) || 0) +
                            (currentObj.type === 'in' ? (Math.abs(parseFloat(currentObj[key])) || 0) +
                                ((currentObj.finalqnty && currentObj.finalqnty * 1 !== currentObj.qnty * 1) ?
                                    (currentObj.qnty * 1 - currentObj.finalqnty * 1) * -1 : 0)
                                : (parseFloat(currentObj[key]) * -1 || 0));
                    } else if (currentObj.type === 'in' && currentObj.description) { //referring to Contract invoices
                        totalObj[key] = currentObj[key];
                    }

                })
                totalObj['id'] = currentObj.id
                totalObj['qTypeTable'] = currentObj.qTypeTable || ''
            }


            let untPrc = filteredData[0].productsData?.find(z => z.id ===
                (filteredData[0].descriptionId || filteredData[0].description))?.unitPrc

            totalObj['unitPrc'] = (isNumber(untPrc) ? untPrc : totalObj.unitPrc)
            totalObj['total'] = totalObj.unitPrc * totalObj.qnty
            totalObj['data'] = filteredData
            totalObj['date'] = dateFormat(filteredData.find(z => z.contractData)?.contractData?.date, 'dd.mm.yy')
            totalObj['cur'] = filteredData[0]['cur']
            totalObj['sType'] = settings?.Stocks?.Stocks?.find(x => x.id === totalObj.stock)?.sType || ''
            totalObj['ind'] = parseFloat(key) //row number
            totalObj['qnty'] = totalObj.qnty === 0 ? totalObj.qnty : parseFloat(totalObj.qnty).toFixed(3)

            if (totalObj.qnty * 1 > 0) newArr.push(totalObj);

        }

    }

    //Just to prevent showing errors in the table
    for (let i = 0; i < newArr.length; i++) {
        if (!newArr[i].supplier) {
            newArr[i] = {
                ...newArr[i], supplier: '-',
                descriptionName: newArr[i]?.data?.[0]?.productsData?.[0]?.description,
                total: '-'
            }
        }
    }

    const stocksArr = [...newArr];

    //Find invoices with payment===0
    let invoicesPaymentZero = stocksArr.filter(c => {
        // step 1: find child with same id as parent
        const child = c.data?.find(d => d.id === c.id);
        if (!child) return false;

        // step 2: find the matching poInvoice
        const invoice = child.poInvoices?.find(x => x.id === child.poInvoice);
        if (!invoice) return false;

        // step 3: check if payment is "0"
        return invoice.pmnt === "0" || invoice.pmnt === 0;
    });

    const stocksArrNoPayment = [...invoicesPaymentZero];
    //Clean newArr from stocks with payment zero

    newArr = newArr.filter(x => !invoicesPaymentZero.map(q => q.id).includes(x.id))
    const stocksArrWithPayment = [...newArr];

    //totals for newArr
    let tmpArr = newArr.map(x => ({ cur: x.cur, qTypeTable: x.qTypeTable, stock: x.stock, qnty: 0, total: 0 }))
    let sumArr = Array.from(new Set(tmpArr.map(item => JSON.stringify(item)))).map(item => JSON.parse(item))

    sumArr.forEach(z => {
        let filteredGroup = newArr.filter(q => q.stock === z.stock && q.qTypeTable === z.qTypeTable && q.cur === z.cur)

        filteredGroup.forEach(item => {
            z.qnty += parseFloat(item.qnty);
            z.total += item.total === '-' ? 0 : parseFloat(item.total);
        });
    })


    const sumupResult = Object.values(sumArr.reduce((acc, item) => {
        const stock = item.stock || "no_stock";  // Handle cases where stock is undefined
        if (!acc[stock]) {
            // If the stock is not yet in the accumulator, initialize it
            acc[stock] = { ...item };
        } else {
            // If the stock is already in the accumulator, sum up qnty and total
            acc[stock].qnty += item.qnty;
            acc[stock].total += item.total;
        }
        return acc;
    }, {}));

    const result = sumupResult.filter(z => z.total !== 0);

    ////////////----/////////////////////////////

    //totals for invoicesPaymentZero

    let tmpArr1 = invoicesPaymentZero.map(x => ({ cur: x.cur, qTypeTable: x.qTypeTable, stock: x.stock, qnty: 0, total: 0 }))
    let sumArr1 = Array.from(new Set(tmpArr1.map(item => JSON.stringify(item)))).map(item => JSON.parse(item))

    sumArr1.forEach(z => {
        let filteredGroup = invoicesPaymentZero.filter(q => q.stock === z.stock && q.qTypeTable === z.qTypeTable && q.cur === z.cur)

        filteredGroup.forEach(item => {
            z.qnty += parseFloat(item.qnty);
            z.total += item.total === '-' ? 0 : parseFloat(item.total);
        });
    })


    const sumupResult1 = Object.values(sumArr1.reduce((acc, item) => {
        const stock = item.stock || "no_stock";  // Handle cases where stock is undefined
        if (!acc[stock]) {
            // If the stock is not yet in the accumulator, initialize it
            acc[stock] = { ...item };
        } else {
            // If the stock is already in the accumulator, sum up qnty and total
            acc[stock].qnty += item.qnty;
            acc[stock].total += item.total;
        }
        return acc;
    }, {}));

    const result1 = sumupResult1.filter(z => z.total !== 0);

    return { result, result1, stocksArrWithPayment, stocksArrNoPayment, unSoldArrTitles, unSoldAll };
}


const moveToContracts = async (z, ent, uidCollection, setDateSelect,
    setValue, setIsOpen, blankInvoice, router) => {


    let dt = ent === 'stock' ? z.data.find(z => z.contractData)?.contractData :
        ent === 'client' ? z.poSupplier :
            ent === 'supplier' ? z.orderData :
                ent === 'expense' ? { date: z.date, id: z.id } :
                    ent === 'compexpense' ? { date: z.date, id: z.id } :
                        ent === 'stock1' ? z.contractData :
                            ent === 'order' ? z.orderData :
                                null



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

    let contract = ent === 'expense' ? await loadInvoice(uidCollection, 'expenses', dt) :
        ent === 'compexpense' ? await loadCompanyExpense(uidCollection, 'companyExpenses', z) :
            await loadInvoice(uidCollection, 'contracts', dt)


    if (Object.keys(contract).length === 0 && ent !== 'expense' && ent !== 'compexpense') {

        const date1 = new Date(dt.date);
        date1.setDate(date1.getDate() - 1);
        dt.date = date1.toISOString().split("T")[0]; // Convert back to 'YYYY-MM-DD' format

        contract = await loadInvoice(uidCollection, 'contracts', dt)

        if (Object.keys(contract).length === 0) {
            setToast({ show: true, text: 'Contract can not be accessed!', clr: 'fail' })
            return;
        }

    }
    if (ent === 'expense' || ent === 'compexpense') {
        setValue(contract);
        setIsOpen(true);
    } else {
        setValue(contract);
        blankInvoice();
        setIsOpen(true);
    }


}

export const StoclToolTip = ({ stock, stockDataAll, settings, uidCollection, setDateSelect,
    setValueCon, setIsOpenCon, blankInvoice, router, sumSel = {}, toggleSum }) => {
    const { sortKey, sortDir, handleSort } = useSortState();

    const base = stockDataAll
        .filter(z => z.stock === stock)
        // Group rows by contract number (PO#), matching the Unsold Stocks ordering.
        .sort((a, b) => String(a.order ?? '').localeCompare(String(b.order ?? ''), undefined, { numeric: true }))
        .map(z => ({ ...z, _supplierName: settings.Supplier.Supplier.find(q => q.id === z.supplier)?.nname || '' }));
    const filteredArr = sortKey ? sortRows(base, sortKey, sortDir) : base;

    const buildSumItem = (z) => ({
        key: sumKey('stock', z.id), id: z.id, kind: 'stock',
        label: z._supplierName || 'Stock', sub: z.descriptionName || z.order || '', cur: z.cur,
        amount: parseFloat(z.total) || 0, paid: null, balance: null, autoMetric: 'amount',
    });

    return (
        <div className="w-full border border-[#b8ddf8] rounded-xl overflow-hidden bg-white">
            <div className="max-h-[30rem] lg:max-h-[50rem] overflow-y-auto overflow-x-auto">
            <table className="cashflow-detail-table w-full table-auto">
                <thead>
                    <tr>
                        <SumTh />
                        <SortTh colKey="order" label="PO#" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="text-left w-12" />
                        <SortTh colKey="_supplierName" label="Supplier" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="text-left w-16" />
                        <SortTh colKey="descriptionName" label="Description" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="text-left w-28 max-w-28" />
                        <SortTh colKey="qnty" label="Quantity" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="text-left w-14" />
                        <SortTh colKey="unitPrc" label="Unit Price" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="text-left w-20" />
                        <SortTh colKey="total" label="Total" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="text-right w-20" />
                    </tr>
                </thead>
                <tbody>
                    {filteredArr.map((z, i) => {
                        return (
                            <tr key={i}>
                                <td className="!py-1 px-1">
                                    <SumToggle active={!!sumSel[sumKey('stock', z.id)]} onToggle={() => toggleSum && toggleSum(buildSumItem(z))} />
                                </td>
                                <td className="text-left cursor-pointer text-[var(--endeavour)] hover:underline max-w-20 truncate"
                                    onClick={() => moveToContracts(z, 'stock', uidCollection, setDateSelect,
                                        setValueCon, setIsOpenCon, blankInvoice, router)}>
                                    <Tltip direction='top' tltpText={z.order || ''}><span className="block truncate">{z.order}</span></Tltip></td>
                                <td className="text-left w-16"><Tltip direction='top' tltpText={[settings.Supplier.Supplier.find(q => q.id === z.supplier)?.nname, settings.Supplier.Supplier.find(q => q.id === z.originSupplier)?.nname ? 'Org: ' + settings.Supplier.Supplier.find(q => q.id === z.originSupplier)?.nname : ''].filter(Boolean).join(' · ')}><span className="block truncate cursor-default">{settings.Supplier.Supplier.find(q => q.id === z.supplier)?.nname}</span></Tltip></td>
                                <td className="text-left w-28 max-w-28">
                                    <Tltip direction='top' tltpText={z.descriptionName || ''}><span className="block truncate cursor-default">{z.descriptionName}</span></Tltip>
                                </td>
                                <td className="text-left">{
                                    <NumericFormat
                                        value={z.qnty}
                                        displayType="text"
                                        thousandSeparator
                                        allowNegative={true}
                                        decimalScale='3'
                                        fixedDecimalScale
                                    />
                                }</td>
                                <td className="text-left">{
                                    <NumericFormat
                                        value={z.unitPrc}
                                        displayType="text"
                                        thousandSeparator
                                        allowNegative={true}
                                        prefix={z.cur === 'us' ? '$' : '€'}
                                        decimalScale='2'
                                        fixedDecimalScale
                                    />
                                }</td>
                                <td className="text-right">{
                                    <NumericFormat
                                        value={z.total}
                                        displayType="text"
                                        thousandSeparator
                                        allowNegative={true}
                                        prefix={z.cur === 'us' ? '$' : '€'}
                                        decimalScale='2'
                                        fixedDecimalScale
                                    />
                                }</td>
                            </tr>
                        )
                    })}

                </tbody>
                <tfoot>
                    <tr className="bg-[#dbeeff]">
                        <th></th>
                        <th className="text-left">
                            Total
                        </th>
                        <th>
                        </th>
                        <th>
                        </th>
                        <th className="text-left">
                            {
                                <NumericFormat
                                    value={filteredArr.reduce((sum, item) => sum + (item.qnty * 1 || 0), 0)}
                                    displayType="text"
                                    thousandSeparator
                                    allowNegative={true}
                                    decimalScale='3'
                                    fixedDecimalScale
                                />
                            }
                        </th>
                        <th className="text-left">
                            {showAmount(filteredArr.reduce((sum, item) => sum + item.unitPrc * 1, 0), 'usd')}
                        </th>
                        <th className="text-right">
                            {showAmount(filteredArr.reduce((sum, item) => sum + item.total * 1, 0), 'usd')}
                        </th>
                    </tr>
                </tfoot>
            </table>
            </div>
        </div>
    )//stock;
}

export const StocksUnSold = ({ supplier, stockDataAllArray, settings, uidCollection, setDateSelect,
    setValueCon, setIsOpenCon, blankInvoice, router, sumSel = {}, toggleSum }) => {
    const { sortKey, sortDir, handleSort } = useSortState();

    const base = stockDataAllArray.filter(z => z.supplier === supplier)
        // Group rows by contract number (PO#) so both stock tables read consistently.
        .sort((a, b) => String(a.order ?? '').localeCompare(String(b.order ?? ''), undefined, { numeric: true }));
    const filteredArr = sortKey ? sortRows(base, sortKey, sortDir) : base;
    const ttl = showAmount(filteredArr.reduce((sum, item) => sum + item.total * 1, 0) || '', 'usd');

    const buildSumItem = (z) => ({
        key: sumKey('stock', z.id), id: z.id, kind: 'stock',
        label: settings.Supplier?.Supplier?.find(q => q.id === z.supplier)?.nname || 'Stock',
        sub: z.description || z.order || '', cur: z.cur,
        amount: parseFloat(z.total) || 0, paid: null, balance: null, autoMetric: 'amount',
    });

    return (
        <div className="w-full border border-[#b8ddf8] rounded-xl overflow-hidden bg-white">
            <div className="max-h-[30rem] lg:max-h-[50rem] overflow-y-auto overflow-x-auto">
            <table className="cashflow-detail-table w-full table-auto">
                <thead>
                    <tr>
                        <SumTh />
                        <SortTh colKey="order" label="PO#" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="text-left w-12" />
                        <SortTh colKey="description" label="Description" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="text-left w-28 max-w-28" />
                        <SortTh colKey="stockName" label="Stock" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="text-left w-20" />
                        <SortTh colKey="qnty" label="Quantity" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="text-left w-14" />
                        <SortTh colKey="unitPrc" label="Unit Price" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="text-left w-20" />
                        <SortTh colKey="total" label="Total" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="text-right w-20" />
                    </tr>
                </thead>
                <tbody>
                    {filteredArr.map((z, i) => {
                        return (
                            <tr key={i}>
                                <td className="!py-1 px-1">
                                    <SumToggle active={!!sumSel[sumKey('stock', z.id)]} onToggle={() => toggleSum && toggleSum(buildSumItem(z))} />
                                </td>
                                <td className="text-left cursor-pointer text-[var(--endeavour)] hover:underline max-w-20 truncate"
                                    onClick={() => moveToContracts(z, 'order', uidCollection, setDateSelect,
                                        setValueCon, setIsOpenCon, blankInvoice, router)}>
                                    <Tltip direction='top' tltpText={[z.order, settings.Supplier.Supplier.find(q => q.id === z.originSupplier)?.nname ? 'Org: ' + settings.Supplier.Supplier.find(q => q.id === z.originSupplier)?.nname : ''].filter(Boolean).join(' · ')}><span className="block truncate">{z.order}</span></Tltip></td>
                                <td className="text-left w-28 max-w-28">
                                    <Tltip direction='top' tltpText={z.description || ''}><span className="block truncate cursor-default">{z.description}</span></Tltip>
                                </td>
                                <td className="text-left w-20">
                                    <Tltip direction='top' tltpText={z.stockName || ''}><span className="block truncate cursor-default">{z.stockName}</span></Tltip>
                                </td>
                                <td className="text-left">{
                                    <NumericFormat
                                        value={z.qnty}
                                        displayType="text"
                                        thousandSeparator
                                        allowNegative={true}
                                        decimalScale='3'
                                        fixedDecimalScale
                                    />
                                }</td>
                                <td className="text-left">{
                                    <NumericFormat
                                        value={z.unitPrc}
                                        displayType="text"
                                        thousandSeparator
                                        allowNegative={true}
                                        prefix={z.cur === 'us' ? '$' : '€'}
                                        decimalScale='2'
                                        fixedDecimalScale
                                    />
                                }</td>
                                <td className="text-right">{
                                    <NumericFormat
                                        value={z.total}
                                        displayType="text"
                                        thousandSeparator
                                        allowNegative={true}
                                        prefix={z.cur === 'us' ? '$' : '€'}
                                        decimalScale='2'
                                        fixedDecimalScale
                                    />
                                }</td>
                            </tr>
                        )
                    })}

                </tbody>
                <tfoot>
                    <tr className="bg-[#dbeeff]">
                        <th></th>
                        <th className="text-left">
                            Total
                        </th>
                        <th></th>
                        <th></th>
                        <th className="text-left">
                            {
                                <NumericFormat
                                    value={filteredArr.reduce((sum, item) => sum + (item.qnty * 1 || 0), 0)}
                                    displayType="text"
                                    thousandSeparator
                                    allowNegative={true}
                                    decimalScale='3'
                                    fixedDecimalScale
                                />
                            }
                        </th>
                        <th></th>
                        <th className="text-right">
                            {ttl}
                        </th>
                    </tr>
                </tfoot>
            </table>
            </div>
        </div>
    )
}

const makeGroup = (arr) => {
    const groupedByPoSupplierId = arr.reduce((acc, invoice) => {
        const poSupplierId = invoice.poSupplier?.id; // Safely access poSupplier.id
        if (poSupplierId) {
            // If the poSupplier.id exists, group by this id
            if (!acc[poSupplierId]) {
                acc[poSupplierId] = [];
            }
            acc[poSupplierId].push([invoice]);
        }
        return acc;
    }, {});

    return groupedByPoSupplierId;
}

export const runInvoices = async (uidCollection, settings, yr) => {

    let dt = await Promise.all(
        yr.map(year =>
            loadData(uidCollection, 'invoices', {
                start: `${year}-01-01`,
                end: `${year}-12-31`
            })
        )
    );
    dt = [].concat(...dt);

    dt = makeGroup(dt)
    dt = Object.values(dt)

    dt = await Promise.all(
        dt.map(async (x) => {
            //   const con = await loadContracts(uidCollection, x)
            return {
                //  ...con,
                invoicesData: x,
            };
        })
    );


    let newArr = []

    dt.forEach(innerObj => {
        if (innerObj.invoicesData && Array.isArray(innerObj.invoicesData)) {

            innerObj.invoicesData.forEach(obj => {
                newArr.push({
                    arr: obj,
                })
            })
        }
    })

    dt = setCurFilterData(newArr, settings)

    dt = groupedArrayInvoice(dt)

    dt = dt.map(z => {

        if (z.length === 1) {
            return z[0]; // Take the object as is
        }

        let obj = z.filter(obj => obj.invType !== "1111"); //array of invoices with invType !== "1111"

        let arr1 = z.map(x => x.payments).flat()

        let totalAmount = obj.reduce((total, obj1) => {
            return total + (obj1.totalAmount * 1 || 0);
        }, 0)

        let db = round2(round2(totalAmount) - round2(arr1.reduce((total, obj1) => {
            return total + (obj1.pmnt * 1 || 0);
        }, 0)))

        obj = { ...obj[0], payments: arr1, debtBlnc: db, totalAmount }

        if (!obj) return null; // Safety check

        return obj;
    })

    dt = dt.filter(z => Math.abs(z.debtBlnc) >= 0.01).filter(x => x.draft === undefined || x.draft === false);

    return dt
}

export const getTotals = (arr) => {
    const acc = new Map();

    for (const item of arr) {
        const ent = item.client;
        if (!ent) continue;

        // Carry counts forward when re-aggregating an already-summarised array
        // (the sort handlers re-run getTotals on its own output); only fall back
        // to the raw shipData flag on the first pass over per-invoice rows.
        const incTotal = item._finTotal != null ? item._finTotal : 1;
        const incFinal = item._finTotal != null ? (item._finCount || 0) : (item.shipData?.fnlzing === '4568' ? 1 : 0);
        if (!acc.has(ent)) {
            acc.set(ent, { ...item, _finCount: incFinal, _finTotal: incTotal });
        } else {
            const existing = acc.get(ent);
            existing.debtBlnc += item.debtBlnc;
            existing._finCount += incFinal;
            existing._finTotal += incTotal;
            acc.set(ent, existing); // not strictly necessary, but clear
        }
    }

    return [...acc.values()];
};

const setCurFilterData = (arr, settings) => {

    let dt = arr.map((x) => {

        let srtX = sortedData(x.arr)
        const totalAmount = Total(srtX, 'totalAmount', { cur: 'us' }, x.euroToUSD, settings).accumuLastInv
        const payments = TotalInvoicePayments(srtX);
        const debtBlnc = round2(round2(totalAmount) - round2(payments));



        return {
            ...x.arr[0],
            debtBlnc,

        };
    })
    return dt;
}


const getprefixInv = (q) => {

    return (q.invType === '1111' || q.invType === 'Invoice') ? '' :
        (q.invType === '2222' || q.invType === 'Credit Note') ? 'CN' : 'FN'
}

export const ClientDetails = ({ client, data, type, uidCollection, setDateSelect,
    setValueCon, setIsOpenCon, blankInvoice, router, toggleCheckClient, toggleCheckClientAll,
    toggleClientPartial, toggleClientFull, savePmntClient, clientPartialPayment, openInvModal,
    sumSel = {}, toggleSum }) => {
    const { sortKey, sortDir, handleSort } = useSortState();

    const buildSumItem = (z) => ({
        key: sumKey('client', z.id), id: z.id, kind: 'client',
        label: z.clientName || '', sub: z.invoice, cur: z.cur,
        amount: parseFloat(z.totalAmount) || 0,
        paid: (z.payments || []).reduce((t, p) => t + (parseFloat(p.pmnt) || 0), 0),
        balance: parseFloat(z.debtBlnc) || 0,
        // Auto: Balances section totals the outstanding Balance; Payment section the full Amount
        autoMetric: type === 'PartPaid' ? 'balance' : 'amount',
    });

    const tmp = data.filter(z => z.client === client);
    const rawPartPaid = tmp.filter(x => x.payments.length > 0)
        .map(z => ({ ...z, _order: z.poSupplier?.order || '', _pmntTotal: (z.payments || []).reduce((t, p) => t + p.pmnt * 1, 0) }));
    const rawInDebt = tmp.filter(x => x.payments.length === 0)
        .map(z => ({ ...z, _order: z.poSupplier?.order || '' }));
    const filteredArr = sortKey ? sortRows(rawPartPaid, sortKey, sortDir) : rawPartPaid;
    const filteredArr1 = sortKey ? sortRows(rawInDebt, sortKey, sortDir) : rawInDebt;

    return (
        <div className="w-full border border-[#b8ddf8] rounded-xl overflow-hidden bg-white">
            <div className="max-h-[30rem] lg:max-h-[50rem] overflow-y-auto overflow-x-auto">
            {type === 'PartPaid' &&
                <div className="pt-1 w-full">
                    <table className="cashflow-detail-table w-full table-auto">
                        <thead>
                            <tr>
                                <SumTh />
                                <SortTh colKey="_order" label="PO#" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="text-left max-w-20 2xl:max-w-24" />
                                <SortTh colKey="invoice" label="Invoice" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="text-left w-12" />
                                <SortTh colKey="totalAmount" label="Amount" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="text-left" />
                                <SortTh colKey="_pmntTotal" label="Payment" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="text-left" />
                                <SortTh colKey="debtBlnc" label="Balance" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="text-left" />
                                <FinalTh />
                                <th className="text-left">ETD</th>
                                <th className="text-left">ETA</th>
                                <th className="text-left">Pmn</th>
                                <th className="text-left px-2 py-0">
                                    <Tltip direction='right' tltpText='Select all'>
                                        <div className='flex items-center justify-start'>
                                            {filteredArr.length > 0 && <CheckBox size='size-3' checked={!!toggleClientPartial[filteredArr[0]?.client]}
                                                onChange={() => toggleCheckClientAll('PartPaid', filteredArr)}
                                            />
                                            }
                                        </div>
                                    </Tltip>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredArr.map((z, i) => {
                                return (
                                    <tr key={i}>
                                        <td className="!py-1 px-1">
                                            <SumToggle active={!!sumSel[sumKey('client', z.id)]} onToggle={() => toggleSum && toggleSum(buildSumItem(z))} />
                                        </td>
                                        <td className="text-left cursor-pointer text-[var(--endeavour)] hover:underline max-w-14 2xl:max-w-24 truncate"
                                            onClick={() => moveToContracts(z, 'client', uidCollection, setDateSelect,
                                                setValueCon, setIsOpenCon, blankInvoice, router)}>
                                            <Tltip direction='top' tltpText={z.poSupplier?.order || ''}><span className="block truncate">{z.poSupplier?.order}</span></Tltip></td>
                                        <td className="text-left w-10 cursor-pointer text-[var(--endeavour)] hover:underline" onClick={() => openInvModal && openInvModal(z, 'client')}><Tltip direction='top' tltpText='Click to preview invoice'><span className="block truncate">{z.invoice}</span></Tltip></td>
                                        <td className="text-left">{
                                            <NumericFormat
                                                value={z.totalAmount}
                                                displayType="text"
                                                thousandSeparator
                                                allowNegative={true}
                                                prefix={z.cur === 'us' ? '$' : '€'}
                                                decimalScale='2'
                                                fixedDecimalScale
                                            />
                                        }</td>
                                        <td className="text-left">{
                                            <NumericFormat
                                                value={round2(z.payments.reduce((total, obj) => {
                                                    return total + obj.pmnt * 1;
                                                }, 0))}
                                                displayType="text"
                                                thousandSeparator
                                                allowNegative={true}
                                                prefix={z.cur === 'us' ? '$' : '€'}
                                                decimalScale='2'
                                                fixedDecimalScale
                                            />
                                        }</td>
                                        <td className="text-left">{
                                            <NumericFormat
                                                value={z.debtBlnc}
                                                displayType="text"
                                                thousandSeparator
                                                allowNegative={true}
                                                prefix={z.cur === 'us' ? '$' : '€'}
                                                decimalScale='2'
                                                fixedDecimalScale
                                            />
                                        }</td>
                                        <td className="text-left"><FinalBadge fnlzing={z.shipData?.fnlzing} /></td>
                                        <td className="text-left">{dateFormat(z.shipData?.etd?.startDate, 'dd.mm.yy')}</td>
                                        <td className="text-left">{dateFormat(z.shipData?.eta?.startDate, 'dd.mm.yy')}</td>
                                        <td className="text-left !py-1">
                                            <Tltip direction='right' tltpText='Partial Payment'>
                                                <div className='flex items-center justify-start'>
                                                    <DoalogModalClient obj={z}
                                                        clientPartialPayment={clientPartialPayment}
                                                    />
                                                </div>
                                            </Tltip>
                                        </td>
                                        <td className="text-left !py-1">
                                            <Tltip direction='right' tltpText='Set full payment'>
                                                <div className='flex items-center justify-start'>
                                                    <CheckBox size='size-3' checked={z.checked}
                                                        onChange={() => toggleCheckClient(z, 'PartPaid')} />
                                                </div>
                                            </Tltip>
                                        </td>
                                    </tr>
                                )
                            })}

                        </tbody>
                        <tfoot>
                            <tr className="bg-[#dbeeff]">
                                <th></th>
                                <th className="text-left">TOTAL</th>
                                <th></th>
                                <th className="text-left">
                                    {showAmount(filteredArr.reduce((sum, item) => sum + item.totalAmount, 0), 'usd')}
                                </th>
                                <th className="text-left">
                                    {showAmount(filteredArr
                                        .flatMap(item => item.payments || [])
                                        .reduce((sum, payment) => sum + (parseFloat(payment.pmnt) || 0), 0), 'usd')}
                                </th>
                                <th className="text-left">
                                    {showAmount(filteredArr.reduce((sum, item) => sum + item.debtBlnc, 0), 'usd')}
                                </th>
                                <th></th>
                                <th></th>
                                <th></th>
                                <th></th>
                                <th className="text-left">
                                    <div className='flex items-center justify-start'>
                                        <button className='p-0 bg-transparent border-0 outline-none leading-none text-[var(--endeavour)] hover:opacity-70'
                                            onClick={() => savePmntClient(filteredArr[0]?.client)}
                                            disabled={filteredArr.length === 0}>
                                            <Save className="w-3 h-3" />
                                        </button>
                                    </div>
                                </th>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            }

            {type === 'InDebt' &&
                <div className="pt-1 w-full">
                    <table className="cashflow-detail-table w-full table-auto">
                        <thead>
                            <tr>
                                <SumTh />
                                <SortTh colKey="_order" label="PO#" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="text-left w-28" />
                                <SortTh colKey="invoice" label="Invoice" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="text-left w-12" />
                                <SortTh colKey="totalAmount" label="Amount" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="text-left" />
                                <SortTh colKey="percentage" label="Prepayment" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="text-left" />
                                <th className="text-left">Prep. Amount</th>
                                <FinalTh />
                                <th className="text-left">ETD</th>
                                <th className="text-left">Pmn</th>
                                <th className="text-left p-1 2xl:p-1 py-0">
                                    <Tltip direction='right' tltpText='Select all'>
                                        <div className='flex items-center justify-start'>
                                            {filteredArr1.length > 0 && <CheckBox size='size-3' checked={!!toggleClientFull[filteredArr1[0]?.client]}
                                                onChange={() => toggleCheckClientAll('InDebt', filteredArr1)} />
                                            }
                                        </div>
                                    </Tltip>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredArr1.map((z, i) => {
                                return (
                                    <tr key={i}>
                                        <td className="!py-1 px-1">
                                            <SumToggle active={!!sumSel[sumKey('client', z.id)]} onToggle={() => toggleSum && toggleSum(buildSumItem(z))} />
                                        </td>
                                        <td className="text-left cursor-pointer text-[var(--endeavour)] hover:underline max-w-14 2xl:max-w-24 truncate"
                                            onClick={() => moveToContracts(z, 'client', uidCollection, setDateSelect,
                                                setValueCon, setIsOpenCon, blankInvoice, router)}>
                                            <Tltip direction='top' tltpText={z.poSupplier?.order || ''}><span className="block truncate">{z.poSupplier?.order}</span></Tltip></td>
                                        <td className="text-left cursor-pointer text-[var(--endeavour)] hover:underline" onClick={() => openInvModal && openInvModal(z, 'client')}><Tltip direction='top' tltpText='Click to preview invoice'><span className="block truncate">{z.invoice}</span></Tltip></td>
                                        <td className="text-left">{
                                            <NumericFormat
                                                value={z.totalAmount}
                                                displayType="text"
                                                thousandSeparator
                                                allowNegative={true}
                                                prefix={z.cur === 'us' ? '$' : '€'}
                                                decimalScale='2'
                                                fixedDecimalScale
                                            />
                                        }</td>
                                        <td className="text-left">{
                                            z.percentage + '%'
                                        }</td>
                                        <td className="text-left">{
                                            <NumericFormat
                                                value={z.totalAmount * (z.percentage / 100) || 0}
                                                displayType="text"
                                                thousandSeparator
                                                allowNegative={true}
                                                prefix={z.cur === 'us' ? '$' : '€'}
                                                decimalScale='2'
                                                fixedDecimalScale
                                            />
                                        }</td>
                                        <td className="text-left"><FinalBadge fnlzing={z.shipData?.fnlzing} /></td>
                                        <td className="text-left">{dateFormat(z.shipData?.etd?.startDate, 'dd.mm.yy')}</td>
                                        <td className="text-left !py-1">
                                            <Tltip direction='right' tltpText='Partial Payment'>
                                                <div className='flex items-center justify-start'>
                                                    <DoalogModalClient obj={z}
                                                        clientPartialPayment={clientPartialPayment}
                                                    />
                                                </div>
                                            </Tltip>
                                        </td>

                                        <td className="text-left !py-1">
                                            <Tltip direction='right' tltpText='Set full payment'>
                                                <div className='flex items-center justify-start'>
                                                    <CheckBox size='size-3' checked={z.checked}
                                                        onChange={() => toggleCheckClient(z, 'InDebt')} />
                                                </div>
                                            </Tltip>
                                        </td>
                                    </tr>
                                )
                            })}

                        </tbody>
                        <tfoot>
                            <tr className="bg-[#dbeeff]">
                                <th></th>
                                <th className="text-left">TOTAL</th>
                                <th></th>
                                <th className="text-left">
                                    {showAmount(filteredArr1.reduce((sum, item) => sum + item.totalAmount, 0), 'usd')}
                                </th>
                                <th></th>
                                <th className="text-left">
                                    {showAmount(filteredArr1.reduce((sum, item) => sum + item.totalAmount * (item.percentage / 100), 0), 'usd')}
                                </th>
                                <th></th>
                                <th></th>
                                <th></th>
                                <th className="text-left">
                                    <div className='flex items-center justify-start'>
                                        <button className='p-0 bg-transparent border-0 outline-none leading-none text-[var(--endeavour)] hover:opacity-70'
                                            onClick={() => savePmntClient(filteredArr1[0]?.client)}
                                            disabled={filteredArr1.length === 0}>
                                            <Save className="w-3 h-3" />
                                        </button>
                                    </div>
                                </th>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            }
            </div>
        </div>
    )
}


const sortedData = (arr) => {
    return arr.map(z => ({
        ...z,
        d: z.final ? z.invType === 'Invoice' ? '1111' :
            z.invType === 'Credit Note' ? '2222' : '3333'
            : z.invType
    })).sort((a, b) => {
        const invTypeOrder = { '1111': 1, '2222': 2, '3333': 3 };
        const invTypeA = a.d || '';
        const invTypeB = b.d || '';
        return invTypeOrder[invTypeA] - invTypeOrder[invTypeB]
    })
}

const Total = (data, name, val, mult, settings) => {
    let accumuLastInv = 0;
    let accumuDeviation = 0;

    data.forEach(obj => {
        if (obj && !isNaN(obj[name])) {

            let num = obj.canceled ? 0 : obj[name] * 1

            accumuDeviation += (data.length === 1 && ['1111', 'Invoice'].includes(obj.invType) ||
                data.length > 1 && ['1111', 'Invoice'].includes(obj.invType)) ?
                num : 0;

            accumuLastInv += (data.length === 1 && ['1111', 'Invoice'].includes(obj.invType) ||
                data.length > 1 && !['1111', 'Invoice'].includes(obj.invType)) ?
                num : 0;

        }
    });

    return { accumuDeviation, accumuLastInv };
}

const TotalInvoicePayments = (data) => {
    let accumulatedPmnt = 0;

    data.forEach(obj => {
        if (obj && Array.isArray(obj.payments)) {
            obj.payments.forEach(payment => {


                if (payment && !isNaN(parseFloat(payment.pmnt))) {
                    accumulatedPmnt += parseFloat(payment.pmnt * 1);
                }
            });
        }

    });

    return accumulatedPmnt;
}

export const addComma = (nStr) => {

    nStr += '';
    var x = nStr.split('.');
    var x1 = x[0];
    var x2 = x.length > 1 ? '.' + x[1] : '';
    var rgx = /(\d+)(\d{3})/;
    while (rgx.test(x1)) {
        x1 = x1.replace(rgx, '$1,$2');
    }

    x2 = x2.length > 3 ? x2.substring(0, 3) : x2
    return ('$' + x1 + x2);
}

// Suppliers

export const runSupPayments = async (uidCollection, settings, yr, contractsData = null) => {


    let dt = contractsData;
    if (!Array.isArray(dt)) {
        dt = await Promise.all(
            yr.map(year =>
                loadData(uidCollection, 'contracts', {
                    start: `${year}-01-01`,
                    end: `${year}-12-31`
                })
            )
        );

        dt = [].concat(...dt);
    }

    // ETD/ETA for supplier balances mirror the Shipment page: the contract's own
    // shipmentEtd/Eta, falling back to the linked client invoice's shipData. The client
    // balances table reads the same invoice shipData, so both sides show the same date.
    const invShip = {};
    const invByYear = await Promise.all(
        yr.map(year => loadData(uidCollection, 'invoices', { start: `${year}-01-01`, end: `${year}-12-31` }))
    );
    for (const inv of [].concat(...invByYear)) {
        const cid = inv.poSupplier?.id;
        if (cid && !invShip[cid]) invShip[cid] = { etd: inv.shipData?.etd?.startDate || '', eta: inv.shipData?.eta?.startDate || '' };
    }

    let arr = []

    dt.forEach(contract => {
        contract.poInvoices.forEach(inv => {
            let obj = {
                invValue: inv.invValue, pmnt: inv.pmnt, blnc: inv.blnc, supplier: contract.supplier,
                originSupplier: contract.originSupplier,
                order: contract.order, cur: contract.cur, invoice: inv.inv, euroToUSD: contract.euroToUSD,
                orderData: { date: contract.date, id: contract.id },
                id: inv.id,
                shipmentEtd: contract.shipmentEtd || invShip[contract.id]?.etd || '',
                shipmentEta: contract.shipmentEta || invShip[contract.id]?.eta || '',
                contractData: {
                    productsData: contract.productsData || [],
                    shpType: contract.shpType, origin: contract.origin,
                    delTerm: contract.delTerm, pol: contract.pol, pod: contract.pod,
                    packing: contract.packing, ttlGross: contract.ttlGross,
                    ttlPackages: contract.ttlPackages, qTypeTable: contract.qTypeTable,
                    contType: contract.contType, size: contract.size,
                    deltime: contract.deltime, isDeltimeText: contract.isDeltimeText,
                    termPmnt: contract.termPmnt, remarks: contract.remarks || [],
                    date: contract.date,
                }
            }
            arr.push(obj)
        })
    })

    arr = arr.filter(z => z.blnc !== 0)

    // let totalBySupplier = Object.entries(
    //     arr.reduce((acc, item) => {
    //         const supplier = item.supplier;
    //         const blncValue = item.cur === 'us' ? parseFloat(item.blnc) : parseFloat(item.blnc * item.euroToUSD);

    //         // Accumulate blnc values by supplier
    //         acc[supplier] = (acc[supplier] || 0) + blncValue;
    //         return acc;
    //     }, {})
    // );

    // Convert the result to an array of objects with supplier and blnc fields
    //   totalBySupplier = totalBySupplier.map(([supplier, blnc]) => ({ supplier, blnc }));

    return arr;
}


export const getTotalsSupPayments = (arr) => {

    let totalBySupplier = Object.values(arr.reduce((acc, item) => {
        const supplier = item.supplier;
        const blncValue = item.cur === 'us' ? parseFloat(item.blnc) : parseFloat(item.blnc * item.euroToUSD);
        // Idempotent under re-aggregation (sort handlers re-run this on its own
        // output): carry forward existing counts, else derive from the raw flag.
        const incTotal = item._finTotal != null ? item._finTotal : 1;
        const incFinal = item._finTotal != null ? (item._finCount || 0) : (item.fnlzing === '4568' ? 1 : 0);
        if (!acc[supplier]) {
            // If the stock is not yet in the accumulator, initialize it
            acc[supplier] = { ...item, _finCount: incFinal, _finTotal: incTotal };
        } else {
            // If the stock is already in the accumulator, sum up qnty and total
            acc[supplier].blnc += blncValue;
            acc[supplier]._finCount += incFinal;
            acc[supplier]._finTotal += incTotal;
        }

        return acc;
    }, {}));


    return totalBySupplier//.map(([supplier, blnc]) => ({ supplier, blnc }));
}


export const SupplierDetails = ({ supplier, data, uidCollection, setDateSelect,
    setValueCon, setIsOpenCon, blankInvoice, router, toggleCheckSupplier, toggleCheckSupplierAll,
    toggleSupplier, savePmntSupplier, supplierPartialPayment, openInvModal,
    sumSel = {}, toggleSum }) => {
    const { sortKey, sortDir, handleSort } = useSortState();

    const base = data.filter(z => z.supplier === supplier && z.blnc * 1 !== 0);
    const filteredArr = sortKey ? sortRows(base, sortKey, sortDir) : base;
    const type = filteredArr[0]?.pmnt !== '0' ? 'PartPaid' : 'fullDebt';

    const buildSumItem = (z) => ({
        key: sumKey('supplier', z.id), id: z.id, kind: 'supplier',
        label: z.suplierName || '', sub: z.invoice, cur: z.cur,
        amount: parseFloat(z.invValue) || 0,
        paid: parseFloat(z.pmnt) || 0,
        balance: parseFloat(z.blnc) || 0,
        autoMetric: type === 'PartPaid' ? 'balance' : 'amount',
    });

    return (
        <div className="w-full border border-[#b8ddf8] rounded-xl overflow-hidden bg-white">
            <div className="max-h-[30rem] lg:max-h-[50rem] overflow-y-auto overflow-x-auto">
            <table className="cashflow-detail-table w-full table-auto">
                <thead>
                    <tr>
                        <SumTh />
                        <SortTh colKey="order" label="PO#" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="text-left" />
                        <SortTh colKey="invoice" label="Invoice" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="text-left w-12" />
                        <SortTh colKey="invValue" label="Value" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="text-left" />
                        <SortTh colKey="pmnt" label="Payment" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="text-left" />
                        <SortTh colKey="blnc" label="Balance" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="text-left" />
                        <th className="text-left">ETD</th>
                        <th className="text-left">ETA</th>
                        <FinalTh />
                        <th className="text-left">Pmn</th>
                        <th className="text-left py-0">
                            <Tltip direction='right' tltpText='Select all'>
                                <div className='flex items-center justify-start'>
                                    {filteredArr.length > 0 && <CheckBox size='size-3' checked={!!toggleSupplier[filteredArr[0]?.supplier + '-' + type]}
                                        onChange={() => toggleCheckSupplierAll(filteredArr)}
                                    />
                                    }
                                </div>
                            </Tltip>
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {filteredArr.map((z, i) => {
                        return (
                            <tr key={i}>
                                <td className="!py-1 px-1">
                                    <SumToggle active={!!sumSel[sumKey('supplier', z.id)]} onToggle={() => toggleSum && toggleSum(buildSumItem(z))} />
                                </td>
                                <td className="text-left cursor-pointer text-[var(--endeavour)] hover:underline max-w-20 truncate"
                                    onClick={() => moveToContracts(z, 'supplier', uidCollection, setDateSelect,
                                        setValueCon, setIsOpenCon, blankInvoice, router)}
                                ><Tltip direction='top' tltpText={z.order || ''}><span className="block truncate">{z.order}</span></Tltip></td>
                                <td className="text-left 2xl:max-w-24 truncate cursor-pointer text-[var(--endeavour)] hover:underline" onClick={() => openInvModal && openInvModal(z, 'supplier')}><Tltip direction='top' tltpText='Click to preview invoice'><span className="block truncate">{z.invoice}</span></Tltip></td>
                                <td className="text-left">{
                                    <NumericFormat
                                        value={z.invValue}
                                        displayType="text"
                                        thousandSeparator
                                        allowNegative={true}
                                        prefix={z.cur === 'us' ? '$' : '€'}
                                        decimalScale='2'
                                        fixedDecimalScale
                                    />
                                }</td>
                                <td className="text-left">{
                                    <NumericFormat
                                        value={z.pmnt}
                                        displayType="text"
                                        thousandSeparator
                                        allowNegative={true}
                                        prefix={z.cur === 'us' ? '$' : '€'}
                                        decimalScale='2'
                                        fixedDecimalScale
                                    />
                                }</td>
                                <td className="text-left">{
                                    <NumericFormat
                                        value={z.blnc}
                                        displayType="text"
                                        thousandSeparator
                                        allowNegative={true}
                                        prefix={z.cur === 'us' ? '$' : '€'}
                                        decimalScale='2'
                                        fixedDecimalScale
                                    />
                                }</td>
                                <td className="text-left">{z.shipmentEtd ? dateFormat(z.shipmentEtd, 'dd.mm.yy') : ''}</td>
                                <td className="text-left">{z.shipmentEta ? dateFormat(z.shipmentEta, 'dd.mm.yy') : ''}</td>
                                <td className="text-left"><FinalBadge fnlzing={z.fnlzing} /></td>
                                <td className="text-left !py-1">
                                    <Tltip direction='right' tltpText='Partial Payment'>
                                        <div className='flex items-center justify-start'>
                                            <DoalogModal obj={z} supplierPartialPayment={supplierPartialPayment} />
                                        </div>
                                    </Tltip>
                                </td>
                                <td className="text-left !py-1">
                                    <Tltip direction='right' tltpText='Set full payment'>
                                        <div className='flex items-center justify-start'>
                                            <CheckBox size='size-3' checked={z.checked}
                                                onChange={() => toggleCheckSupplier(z, filteredArr)} />
                                        </div>
                                    </Tltip>
                                </td>
                            </tr>
                        )
                    })}
                </tbody>
                <tfoot>
                    <tr className="bg-[#dbeeff]">
                        <th></th>
                        <th className="text-left">TOTAL</th>
                        <th></th>
                        <th className="text-left">
                            {showAmount(filteredArr.reduce((sum, item) => sum + item.invValue * 1, 0), 'usd')}
                        </th>
                        <th className="text-left">
                            {showAmount(filteredArr.reduce((sum, item) => sum + item.pmnt * 1, 0), 'usd')}
                        </th>
                        <th className="text-left">
                            {showAmount(filteredArr.reduce((sum, item) => sum + item.blnc * 1, 0), 'usd')}
                        </th>
                        <th></th>
                        <th></th>
                        <th></th>
                        <th></th>
                        <th className="text-left">
                            <div className='flex items-center justify-start'>
                                <button className='p-0 bg-transparent border-0 outline-none leading-none text-[var(--endeavour)] hover:opacity-70'
                                    onClick={() => savePmntSupplier(filteredArr)}
                                    disabled={filteredArr.length === 0}>
                                    <Save className="w-3 h-3" />
                                </button>
                            </div>
                        </th>
                    </tr>
                </tfoot>
            </table>
            </div>
        </div>
    )//stock;
}


//Expenses

export const runExpenses = async (uidCollection, settings, yr) => {

    //let dt = await loadData(uidCollection, 'expenses', { start: `${yr}-01-01`, end: `${yr}-12-31` });
    let dt = await Promise.all(
        yr.map(year =>
            loadData(uidCollection, 'expenses', {
                start: `${year}-01-01`,
                end: `${year}-12-31`
            })
        )
    );

    // Merge all the individual arrays into one
    dt = [].concat(...dt);

    let dt1 = await Promise.all(
        yr.map(year =>
            loadCompanyExpenses(uidCollection, 'companyExpenses', {
                start: `${year}-01-01`,
                end: `${year}-12-31`
            })
        )
    );

    dt1 = [].concat(...dt1);

    dt = [...dt, ...dt1]

    dt = dt.filter(z => z && z.paid === '222')

    let totalBySupplier = Object.entries(
        dt.reduce((acc, item) => {
            const supplier = item.supplier;
            const pmntValue = parseFloat(item.amount);
            let mult = item.cur === 'us' ? 1 : 1.08
            // Accumulate pmnt values by supplier
            acc[supplier] = (acc[supplier] || 0) + pmntValue * mult;
            return acc;
        }, {})
    );

    // Convert the result to an array of objects with supplier and pmnt fields
    totalBySupplier = totalBySupplier.map(([supplier, amount]) => ({ supplier, amount }));

    return { totalBySupplier, dt };

}

export const ExpensesToolTip = ({ supplier, expensesAll, settings, uidCollection, setDateSelect,
    setValueExp, setIsOpen, blankInvoice, router, toggleCheckExp, toggleCheckExpAll,
    toggleExp, savePmntExp, sumSel = {}, toggleSum }) => {
    const { sortKey, sortDir, handleSort } = useSortState();

    const buildSumItem = (z) => ({
        key: sumKey('expense', z.id), id: z.id, kind: 'expense',
        label: settings.Supplier?.Supplier?.find(s => s.id === z.supplier)?.nname || 'Expense',
        sub: z.expense, cur: z.cur,
        amount: parseFloat(z.amount) || 0, paid: null, balance: null, autoMetric: 'amount',
    });

    const base = expensesAll.filter(z => z.supplier === supplier)
        .map(z => ({ ...z, _order: z.poSupplier?.order ?? 'Comp. Exp.' }));
    const filteredArr = sortKey ? sortRows(base, sortKey, sortDir) : base;

    return (
        <div className="w-full border border-[#b8ddf8] rounded-xl overflow-hidden bg-white">
            <div className="max-h-[30rem] lg:max-h-[50rem] overflow-y-auto overflow-x-auto">
            <table className="cashflow-detail-table w-full table-auto">
                <thead>
                    <tr>
                        <SumTh />
                        <SortTh colKey="_order" label="PO#" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="text-left w-24" />
                        <SortTh colKey="expense" label="Exp. Invoice" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="text-left" />
                        <SortTh colKey="expType" label="Exp. Type" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="text-left" />
                        <SortTh colKey="amount" label="Amount" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="text-left" />
                        <SortTh colKey="date" label="Date" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="text-left" />
                        <th className="text-left">Payment</th>
                        <th className="text-left">
                            <Tltip direction='right' tltpText='Select all'>
                                <div className='flex items-center justify-start'>
                                    {filteredArr.length > 0 && <CheckBox size='size-3' checked={!!toggleExp[filteredArr[0]?.supplier]}
                                        onChange={() => toggleCheckExpAll(filteredArr)}
                                    />
                                    }
                                </div>
                            </Tltip>
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {filteredArr.map((z, i) => {
                        return (
                            <tr key={i}>
                                <td className="!py-1 px-1">
                                    <SumToggle active={!!sumSel[sumKey('expense', z.id)]} onToggle={() => toggleSum && toggleSum(buildSumItem(z))} />
                                </td>
                                <td className="text-left cursor-pointer text-[var(--endeavour)] hover:underline max-w-20 truncate"
                                    onClick={() => moveToContracts(z, z.poSupplier ? 'expense' : 'compexpense', uidCollection, setDateSelect,
                                        setValueExp, setIsOpen, blankInvoice, router)}>
                                    <Tltip direction='top' tltpText={z.poSupplier?.order ?? 'Comp. Exp.'}><span className="block truncate">{z.poSupplier?.order ?? 'Comp. Exp.'}</span></Tltip></td>
                                <td className="text-left"><Tltip direction='top' tltpText={z.expense || ''}><span className="block truncate max-w-20">{z.expense}</span></Tltip></td>
                                <td className="text-left"><Tltip direction='top' tltpText={settings.Expenses.Expenses.find(q => q.id === z.expType)?.expType || ''}><span className="block truncate max-w-20">{settings.Expenses.Expenses.find(q => q.id === z.expType)?.expType}</span></Tltip></td>
                                <td className="text-left">{
                                    <NumericFormat
                                        value={z.amount}
                                        displayType="text"
                                        thousandSeparator
                                        allowNegative={true}
                                        prefix={z.cur === 'us' ? '$' : '€'}
                                        decimalScale='2'
                                        fixedDecimalScale
                                    />
                                }</td>
                                <td className="text-left">
                                    {dateFormat(z.date, 'dd.mm.yy')}
                                </td>
                                <td className="text-left">
                                    <span className={z.paid === '111' ? 'text-green-600' : 'text-orange-500'}>{z.paid === '111' ? 'Paid' : 'Unpaid'}</span>
                                </td>
                                <td className="text-left !py-1">
                                    <Tltip direction='right' tltpText='Set full payment'>
                                        <div className='flex items-center justify-start'>
                                            <CheckBox size='size-3' checked={z.checked}
                                                onChange={() => toggleCheckExp(z)} />
                                        </div>
                                    </Tltip>
                                </td>
                            </tr>
                        )
                    })}

                </tbody>
                <tfoot>
                    <tr className="bg-[#dbeeff]">
                        <th></th>
                        <th className="text-left">
                            <div>Total $</div>
                            <div className="pt-0.5">Total €</div>
                        </th>
                        <th></th>
                        <th></th>
                        <th className="text-left">
                            <div>{
                                showAmount(filteredArr.reduce((sum, item) => {
                                    const amt = parseFloat(item.amount) || 0;
                                    return sum + (item.cur === 'us' ? amt : amt * 1.08);
                                }, 0), 'usd')
                            }</div>
                            <div className="pt-0.5">{
                                showAmount(filteredArr.reduce((sum, item) => {
                                    const amt = parseFloat(item.amount) || 0;
                                    return sum + (item.cur === 'eu' ? amt : amt / 1.08);
                                }, 0), 'eur')
                            }</div>
                        </th>
                        <th></th>
                        <th></th>
                        <th className="text-left">
                            <div className='flex items-center justify-start'>
                                <button className='p-0 bg-transparent border-0 outline-none leading-none text-[var(--endeavour)] hover:opacity-70'
                                    onClick={() => savePmntExp(filteredArr)}
                                    disabled={filteredArr.length === 0}>
                                    <Save className="w-3 h-3" />
                                </button>
                            </div>
                        </th>
                    </tr>
                </tfoot>
            </table>
            </div>
        </div>
    )//stock;
}
