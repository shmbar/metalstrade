
import CheckBox from "@components/checkbox";
import Tltip from "@components/tlTip";
import { Button } from "@components/ui/button";
import { filteredArray, groupedArrayInvoice, loadAllStockData, loadCompanyExpense, loadCompanyExpenses, loadData, loadInvoice } from "@utils/utils"
import dateFormat from 'dateformat';
import { ContactRoundIcon, Save } from "lucide-react";
import { NumericFormat } from "react-number-format";
import { MdPayments } from "react-icons/md";
import DoalogModal from "./dialogSupplier";
import DoalogModalClient from "./dialogClient";



let propDefaults = [
    { accessorKey: 'order', },
    { accessorKey: 'date', },
    { accessorKey: 'supplier', },
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

function isNumber(str) {
    if (typeof str !== "string") {
        return false; // Return false for non-string inputs
    }
    return /^[+-]?(\d+(\.\d*)?|\.\d+)$/.test(str.trim());
}


export const runStocks = async (uidCollection, settings) => {

    let stockData = await loadAllStockData(uidCollection)
    stockData = stockData.filter(z => z.total !== 0).filter(x => x.draft === undefined || x.draft === false)


    let newArr = []
 
    stockData = stockData.map(x => (
        {
            ...x,
            descriptionName: x.type === 'in' && x.description ?  //Contract Invoice
                x.productsData.find(y => y.id === x.description)?.description :
                x.isSelection ? x.productsData.find(y => y.id === x.descriptionId)?.description : // Invoice 
                    x.type === 'out' && x.moveType === "out" ? x.descriptionName :
                        x.descriptionText
        }))



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
            totalObj['date'] = dateFormat(filteredData.find(z => z.contractData)?.contractData?.date, 'dd-mmm-yy')
            totalObj['cur'] = filteredData[0]['cur']
            totalObj['sType'] = settings?.Stocks?.Stocks?.find(x => x.id === totalObj.stock)?.sType || ''
            totalObj['ind'] = parseFloat(key) //row number
            totalObj['qnty'] = totalObj.qnty === 0 ? totalObj.qnty : parseFloat(totalObj.qnty).toFixed(3)

            if (totalObj.qnty * 1 !== 0) newArr.push(totalObj);

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

    return { result, result1, stocksArr, stocksArrNoPayment };
}


const moveToContracts = async (z, ent, uidCollection, setDateSelect,
    setValue, setIsOpen, blankInvoice, router) => {


    let dt = ent === 'stock' ? z.data.find(z => z.contractData)?.contractData :
        ent === 'client' ? z.poSupplier :
            ent === 'supplier' ? z.orderData :
                ent === 'expense' ? { date: z.date, id: z.id } :
                    ent === 'compexpense' ? { date: z.date, id: z.id } : null



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
    if (ent === 'expense') {
        setValue(contract)

        router.push("/expenses");
        setIsOpen(true)
    } else if (ent === 'compexpense') {
        setValue(contract)

        router.push("/companyexpenses");
        setIsOpen(true)
    } else {
        setValue(contract);
        blankInvoice();

        router.push("/contracts");

        setIsOpen(true)
    }


}

export const stoclToolTip = (stock, stockDataAll, settings, uidCollection, setDateSelect,
    setValueCon, setIsOpenCon, blankInvoice, router) => {

    let filteredArr = stockDataAll.filter(z => z.stock === stock)
    filteredArr = filteredArr.sort((a, b) => new Date(a.date) - new Date(b.date));

    return (
        <div className="max-h-[28rem] overflow-y-auto responsiveTextTable pt-2 justify-end flex">
            <table>
                <thead>
                    <tr className="border border-slate-300 p-2">
                        <th className="text-left p-1 w-24">PO#</th>
                        <th className="text-left p-1">Supplier</th>
                        <th className="text-left p-1 w-40">Description</th>
                        <th className="text-left p-1">Quantity</th>
                        <th className="text-right p-1">Unit Price</th>
                        <th className="text-right p-1">Total</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredArr.map((z, i) => {
                        return (
                            <tr className="border border-slate-300 p-2" key={i}>
                                <td className="text-left p-1 cursor-pointer text-blue-700"
                                    onClick={() => moveToContracts(z, 'stock', uidCollection, setDateSelect,
                                        setValueCon, setIsOpenCon, blankInvoice, router)}>
                                    {z.order}</td>
                                <td className="text-left p-1 w-20">{settings.Supplier.Supplier.find(q => q.id === z.supplier)?.nname}</td>
                                <td className="text-left p-1 max-w-28 2xl:max-w-48 truncate" >{z.descriptionName}</td>
                                <td className="text-left p-1">{
                                    <NumericFormat
                                        value={z.qnty}
                                        displayType="text"
                                        thousandSeparator
                                        allowNegative={true}
                                        //  prefix={z.cur === 'us' ? '$' : '€'}
                                        decimalScale='3'
                                        fixedDecimalScale
                                        className=''
                                    />
                                }</td>
                                <td className="text-right p-1">{
                                    <NumericFormat
                                        value={z.unitPrc}
                                        displayType="text"
                                        thousandSeparator
                                        allowNegative={true}
                                        prefix={z.cur === 'us' ? '$' : '€'}
                                        decimalScale='2'
                                        fixedDecimalScale
                                        className=''
                                    />
                                }</td>
                                <td className="text-right p-1">{
                                    <NumericFormat
                                        value={z.total}
                                        displayType="text"
                                        thousandSeparator
                                        allowNegative={true}
                                        prefix={z.cur === 'us' ? '$' : '€'}
                                        decimalScale='2'
                                        fixedDecimalScale
                                        className=''
                                    />
                                }</td>
                            </tr>
                        )
                    })}

                </tbody>
                <tfoot>
                    <tr className="border-t bg-slate-100 border border-slate-300">
                        <th className="relative px-1 py-1 text-left font-medium text-gray-500 uppercase                                  ">
                            Total
                        </th>
                        <th className="relative p-1 text-left font-medium text-gray-500 uppercase">
                        </th>
                        <th className="relative p-1 text-left font-medium text-gray-500 uppercase">
                        </th>
                        <th className="relative p-1 text-left font-medium text-gray-500 uppercase">
                            {
                                <NumericFormat
                                    value={filteredArr.reduce((sum, item) => sum + (item.qnty * 1 || 0), 0)}
                                    displayType="text"
                                    thousandSeparator
                                    allowNegative={true}
                                    //   prefix={z.cur === 'us' ? '$' : '€'}
                                    decimalScale='3'
                                    fixedDecimalScale
                                    className=''
                                />
                            }
                        </th>
                        <th className="relative p-1 text-right font-medium text-gray-500 uppercase">
                            {showAmount(filteredArr.reduce((sum, item) => sum + item.unitPrc * 1, 0), 'usd')}
                        </th>
                        <th className="relativep-2 p-1 text-right font-medium text-gray-500 uppercase">
                            {showAmount(filteredArr.reduce((sum, item) => sum + item.total * 1, 0), 'usd')}
                        </th>
                    </tr>
                </tfoot>
            </table>
        </div>
    )//stock; 
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

        let db = totalAmount * 1 - arr1.reduce((total, obj1) => {
            return total + (obj1.pmnt * 1 || 0);
        }, 0)

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

        if (!acc.has(ent)) {
            acc.set(ent, { ...item });
        } else {
            const existing = acc.get(ent);
            existing.debtBlnc += item.debtBlnc;
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
        const debtBlnc = totalAmount - payments;



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

export const clientDetails = (client, data, type, uidCollection, setDateSelect,
    setValueCon, setIsOpenCon, blankInvoice, router, toggleCheckClient, toggleCheckClientAll,
    toggleClientPartial, toggleClientFull, savePmntClient, clientPartialPayment) => {

    let tmp = data.filter(z => z.client === client)
    let filteredArr = tmp.filter(x => x.payments.length > 0)

    let filteredArr1 = tmp.filter(x => x.payments.length === 0)

    return (
        <div className="max-h-[28rem] overflow-y-auto p-1 responsiveTextTable1 justify-end flex">
            {type === 'PartPaid' &&
                <div className="pt-1">
                    <table>
                        <thead>
                            <tr className="border border-slate-300 ">
                                <th className="text-left p-1 2xl:p-2  max-w-20 2xl:max-w-24 truncate">PO#</th>
                                <th className="text-left p-1 2xl:p-2">Invoice</th>
                                <th className="text-right p-1 2xl:p-2">Amount</th>
                                <th className="text-right p-1 2xl:p-2">Payment</th>
                                <th className="text-right p-1 2xl:p-2">Balance</th>
                                <th className="text-left p-1 2xl:p-2">ETD</th>
                                <th className="text-left p-1 2xl:p-2">ETA</th>
                                <th className="text-left p-1 2xl:p-2">Payment</th>
                                <th className="text-center px-2 py-0">
                                    <Tltip direction='right' tltpText='Select all'>
                                        <div className='flex items-center justify-center'>
                                            {filteredArr.length > 0 && <CheckBox size='size-5' checked={!!toggleClientPartial[filteredArr[0]?.client]}
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
                                    <tr className="border border-slate-300" key={i}>
                                        <td className="text-left p-1 2xl:p-2 text-blue-700 cursor-pointer max-w-14 2xl:max-w-24 truncate"
                                            onClick={() => moveToContracts(z, 'client', uidCollection, setDateSelect,
                                                setValueCon, setIsOpenCon, blankInvoice, router)}>
                                            {z.poSupplier?.order}</td>
                                        <td className="text-left p-1 2xl:p-2  w-10">{z.invoice}</td>
                                        <td className="text-right p-1 2xl:p-2">{
                                            <NumericFormat
                                                value={z.totalAmount}
                                                displayType="text"
                                                thousandSeparator
                                                allowNegative={true}
                                                prefix={z.cur === 'us' ? '$' : '€'}
                                                decimalScale='2'
                                                fixedDecimalScale
                                                className=''
                                            />
                                        }</td>
                                        <td className="text-right p-1 2xl:p-2">{
                                            <NumericFormat
                                                value={z.payments.reduce((total, obj) => {
                                                    return total + obj.pmnt * 1;
                                                }, 0)}
                                                displayType="text"
                                                thousandSeparator
                                                allowNegative={true}
                                                prefix={z.cur === 'us' ? '$' : '€'}
                                                decimalScale='2'
                                                fixedDecimalScale
                                                className=''
                                            />
                                        }</td>
                                        <td className="text-right p-1 2xl:p-2">{
                                            <NumericFormat
                                                value={z.debtBlnc}
                                                displayType="text"
                                                thousandSeparator
                                                allowNegative={true}
                                                prefix={z.cur === 'us' ? '$' : '€'}
                                                decimalScale='2'
                                                fixedDecimalScale
                                                className=''
                                            />
                                        }</td>
                                        <td className="text-left p-1 2xl:p-2">{dateFormat(z.shipData?.etd?.startDate, 'dd.mm.yy')}</td>
                                        <td className="text-left p-1 2xl:p-2">{dateFormat(z.shipData?.eta?.startDate, 'dd.mm.yy')}</td>
                                        <td className="text-center p-1 2xl:p-2 py-0">
                                            <Tltip direction='right' tltpText='Partial Payment'>
                                                <div className='flex items-center justify-center'>
                                                    <DoalogModalClient obj={z}
                                                        clientPartialPayment={clientPartialPayment}
                                                    />
                                                </div>
                                            </Tltip>
                                        </td>
                                        <td className="text-center  p-1 2xl:p-2 py-0">
                                            <Tltip direction='right' tltpText='Set full payment'>
                                                <div className='flex items-center justify-center'>
                                                    <CheckBox size='size-5' checked={z.checked}
                                                        onChange={() => toggleCheckClient(z, 'PartPaid')} />
                                                </div>
                                            </Tltip>
                                        </td>
                                    </tr>
                                )
                            })}

                        </tbody>
                        <tfoot>
                            <tr className="border-t bg-slate-100 border border-slate-300">
                                <th className="relative p-1 2xl:p-2 text-left responsiveTextTable font-medium text-gray-500 uppercase                                  ">
                                    Total
                                </th>
                                <th className="relative p-1 2xl:p-2 text-left font-medium text-gray-500 uppercase">
                                </th>
                                <th className="relative p-1 2xl:p-2 text-left font-medium text-gray-500 uppercase">
                                    {showAmount(filteredArr.reduce((sum, item) => sum + item.totalAmount, 0), 'usd')}
                                </th>
                                <th className="relative p-1 2xl:p-2 text-right font-medium text-gray-500 uppercase">
                                    {
                                        showAmount(filteredArr
                                            .flatMap(item => item.payments || [])
                                            .reduce((sum, payment) => sum + (parseFloat(payment.pmnt) || 0), 0), 'usd')
                                    }
                                </th>
                                <th className="relative p-1 2xl:p-2 text-left font-medium text-gray-500 uppercase">
                                    {showAmount(filteredArr.reduce((sum, item) => sum + item.debtBlnc, 0), 'usd')}
                                </th>
                                <th className="relative p-1 2xl:p-2 text-left font-medium text-gray-500 uppercase">
                                </th>
                                <th className="relativep-1 2xl:p-2 text-left font-medium text-gray-500 uppercase">
                                </th>
                                <th className="relative p-1 2xl:p-2 text-left  font-medium text-gray-500 uppercase">
                                </th>
                                <th className="relative  text-left font-medium text-gray-500 uppercase">
                                    <div className='flex items-center justify-center'>
                                        <Button className='h-6 2xl:h-7 p-1 2xl:p-2 bg-slate-500'
                                            onClick={() => savePmntClient(filteredArr[0]?.client)}
                                            disabled={filteredArr.length === 0}>
                                            <Save className="scale-[0.8] 2xl:scale-100" />
                                        </Button>
                                    </div>
                                </th>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            }

            {type === 'InDebt' &&
                <div className="pt-1">
                    <table className="responsiveTextTable">
                        <thead>
                            <tr className="border border-slate-300 p-2">
                                <th className="text-left p-1 2xl:p-2  w-28">PO#</th>
                                <th className="text-left p-1 2xl:p-2 w-16">Invoice</th>
                                <th className="text-right p-1 2xl:p-2">Amount</th>
                                <th className="text-left p-1 2xl:p-2">Prepayment</th>
                                <th className="text-left p-1 2xl:p-2">Payment</th>
                                <th className="text-center p-1 2xl:p-2 py-0">
                                    <Tltip direction='right' tltpText='Select all'>
                                        <div className='flex items-center justify-center'>
                                            {filteredArr1.length > 0 && <CheckBox size='size-5' checked={!!toggleClientFull[filteredArr1[0]?.client]}
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
                                    <tr className="border border-slate-300 " key={i}>
                                        <td className="text-left p-1 2xl:p-2 text-blue-700 cursor-pointer"
                                            onClick={() => moveToContracts(z, 'client', uidCollection, setDateSelect,
                                                setValueCon, setIsOpenCon, blankInvoice, router)}>
                                            {z.poSupplier?.order}</td>
                                        <td className="text-left p-1 2xl:p-2">{z.invoice}</td>
                                        <td className="text-right p-1 2xl:p-2">{
                                            <NumericFormat
                                                value={z.totalAmount}
                                                displayType="text"
                                                thousandSeparator
                                                allowNegative={true}
                                                prefix={z.cur === 'us' ? '$' : '€'}
                                                decimalScale='2'
                                                fixedDecimalScale
                                                className=''
                                            />
                                        }</td>
                                        <td className="text-left p-1 2xl:p-2">{
                                            z.percentage + '%'
                                        }</td>
                                        <td className="text-center p-1 2xl:p-2 py-0">
                                            <Tltip direction='right' tltpText='Partial Payment'>
                                                <div className='flex items-center justify-center'>
                                                    <DoalogModalClient obj={z}
                                                        clientPartialPayment={clientPartialPayment}
                                                    />
                                                </div>
                                            </Tltip>
                                        </td>

                                        <td className="text-center p-1 2xl:p-2 py-0">
                                            <Tltip direction='right' tltpText='Set full payment'>
                                                <div className='flex items-center justify-center'>
                                                    <CheckBox size='size-5' checked={z.checked}
                                                        onChange={() => toggleCheckClient(z, 'InDebt')} />
                                                </div>
                                            </Tltip>
                                        </td>
                                    </tr>
                                )
                            })}

                        </tbody>
                        <tfoot>
                            <tr className="border-t bg-slate-100 border border-slate-300">
                                <th className="relative p-1 2xl:p-2 text-left font-medium text-gray-500 uppercase                                  ">
                                    Total
                                </th>
                                <th className="relative p-1 2xl:p-2 text-left  font-medium text-gray-500 uppercase">
                                </th>
                                <th className="relative p-1 2xl:p-2 text-left  font-medium text-gray-500 uppercase">
                                    {showAmount(filteredArr1.reduce((sum, item) => sum + item.totalAmount, 0), 'usd')}
                                </th>
                                <th className="relative p-1 2xl:p-2 text-left  font-medium text-gray-500 uppercase">
                                    {showAmount(filteredArr1.reduce((sum, item) => sum + item.totalAmount * (item.percentage / 100), 0), 'usd')}
                                </th>
                                <th></th>
                                <th className="relative text-left font-medium text-gray-500 uppercase">
                                    <div className='flex items-center justify-center'>
                                        <Button className='h-6 2xl:h-7 p-1 2xl:p-2 bg-slate-500'
                                            onClick={() => savePmntClient(filteredArr1[0]?.client)}
                                            disabled={filteredArr1.length === 0}>
                                            <Save className="scale-[0.8] 2xl:scale-100" />
                                        </Button>
                                    </div>
                                </th>

                            </tr>
                        </tfoot>
                    </table>
                </div>
            }
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

export const runSupPayments = async (uidCollection, settings, yr) => {


    //  let dt = await loadData(uidCollection, 'contracts', { start: `${yr}-01-01`, end: `${yr}-12-31` });
    let dt = await Promise.all(
        yr.map(year =>
            loadData(uidCollection, 'contracts', {
                start: `${year}-01-01`,
                end: `${year}-12-31`
            })
        )
    );

    // Merge all the individual arrays into one
    dt = [].concat(...dt);

    let arr = []

    dt.forEach(contract => {
        contract.poInvoices.forEach(inv => {
            let obj = {
                invValue: inv.invValue, pmnt: inv.pmnt, blnc: inv.blnc, supplier: contract.supplier,
                order: contract.order, cur: contract.cur, invoice: inv.inv, euroToUSD: contract.euroToUSD,
                orderData: { date: contract.date, id: contract.id },
                id: inv.id
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
        if (!acc[supplier]) {
            // If the stock is not yet in the accumulator, initialize it
            acc[supplier] = { ...item };
        } else {
            // If the stock is already in the accumulator, sum up qnty and total
            acc[supplier].blnc += blncValue;
        }
        return acc;
    }, {}));


    return totalBySupplier//.map(([supplier, blnc]) => ({ supplier, blnc }));
}


export const supplierDetails = (supplier, data, uidCollection, setDateSelect,
    setValueCon, setIsOpenCon, blankInvoice, router, toggleCheckSupplier, toggleCheckSupplierAll,
    toggleSupplier, savePmntSupplier, supplierPartialPayment,
) => {

    let filteredArr = data.filter(z => z.supplier === supplier)
    let type = filteredArr[0]?.pmnt !== '0' ? 'PartPaid' : 'fullDebt'

    return (
        <div className="max-h-[28rem] overflow-y-auto responsiveTextTable pt-1 justify-end flex">
            <table>
                <thead>
                    <tr className="border border-slate-300">
                        <th className="text-left p-1 2xl:p-2">PO#</th>
                        {/* <th className="text-left p-2">Supplier</th> */}
                        <th className="text-left p-1 2xl:p-2">Invoice</th>
                        <th className="text-right p-1 2xl:p-2">Value</th>
                        <th className="text-right p-1 2xl:p-2">Payment</th>
                        <th className="text-right p-1 2xl:p-2">Balance</th>
                        <th className="text-right p-1 2xl:p-2">Payment</th>
                        <th>
                            <Tltip direction='right' tltpText='Select all'>
                                <div className='flex items-center justify-center'>
                                    {filteredArr.length > 0 && <CheckBox size='size-5' checked={!!toggleSupplier[filteredArr[0]?.supplier + '-' + type]}
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
                            <tr className="border border-slate-300" key={i}>
                                <td className="text-left p-1 2xl:p-2 text-blue-700 cursor-pointer"
                                    onClick={() => moveToContracts(z, 'supplier', uidCollection, setDateSelect,
                                        setValueCon, setIsOpenCon, blankInvoice, router)}
                                >{z.order}</td>
                                {/* <td className="text-left p-2">{settings.Supplier.Supplier.find(q => q.id === z.supplier)?.nname}</td> */}
                                <td className="text-left p-1 2xl:p-2 2xl:max-w-24 truncate" >{z.invoice}</td>
                                <td className="text-right p-1 2xl:p-2">{
                                    <NumericFormat
                                        value={z.invValue}
                                        displayType="text"
                                        thousandSeparator
                                        allowNegative={true}
                                        prefix={z.cur === 'us' ? '$' : '€'}
                                        decimalScale='2'
                                        fixedDecimalScale
                                        className='responsiveTextTable'
                                    />
                                }</td>
                                <td className="text-right p-1 2xl:p-2">{
                                    <NumericFormat
                                        value={z.pmnt}
                                        displayType="text"
                                        thousandSeparator
                                        allowNegative={true}
                                        prefix={z.cur === 'us' ? '$' : '€'}
                                        decimalScale='2'
                                        fixedDecimalScale
                                        className='responsiveTextTable'
                                    />
                                }</td>
                                <td className="text-right p-1 2xl:p-2">{
                                    <NumericFormat
                                        value={z.blnc}
                                        displayType="text"
                                        thousandSeparator
                                        allowNegative={true}
                                        prefix={z.cur === 'us' ? '$' : '€'}
                                        decimalScale='2'
                                        fixedDecimalScale
                                        className='responsiveTextTable'
                                    />
                                }</td>
                                <td className="text-center p-1 2xl:p-2 py-0">
                                    <Tltip direction='right' tltpText='Partial Payment'>
                                        <div className='flex items-center justify-center'>
                                            <DoalogModal obj={z} supplierPartialPayment={supplierPartialPayment} />
                                        </div>
                                    </Tltip>
                                </td>
                                <td className="text-center p-1 2xl:p-2 py-0">
                                    <Tltip direction='right' tltpText='Set full payment'>
                                        <div className='flex items-center justify-center'>
                                            <CheckBox size='size-5' checked={z.checked}
                                                onChange={() => toggleCheckSupplier(z, filteredArr)} />
                                        </div>
                                    </Tltip>
                                </td>
                            </tr>
                        )
                    })}
                </tbody>
                <tfoot>
                    <tr className="border-t bg-slate-100 border border-slate-300 responsiveTextTable">
                        <th className="relative p-1 2xl:p-2 text-left responsiveTextTable font-medium text-gray-500 uppercase                                  ">
                            Total
                        </th>
                        <th className="relative p-1 2xl:p-2 text-left responsiveTextTable font-medium text-gray-500 uppercase">
                        </th>
                        <th className="relative p-1 2xl:p-2 text-right responsiveTextTable font-medium text-gray-500 uppercase">
                            {showAmount(filteredArr.reduce((sum, item) => sum + item.invValue * 1, 0), 'usd')}
                        </th>
                        <th className="relative p-1 2xl:p-2 text-right responsiveTextTable font-medium text-gray-500 uppercase">
                            {showAmount(filteredArr.reduce((sum, item) => sum + item.pmnt * 1, 0), 'usd')}
                        </th>
                        <th className="relative p-1 2xl:p-2 text-right responsiveTextTable font-medium text-gray-500 uppercase">
                            {showAmount(filteredArr.reduce((sum, item) => sum + item.blnc * 1, 0), 'usd')}
                        </th>
                        <th>

                        </th>
                        <th className="relative  text-right font-medium text-gray-500 uppercase">
                            <div className='flex items-center justify-center'>
                                <Button className='h-6 2xl:h-7 p-1 2xl:p-2 bg-slate-500'
                                    onClick={() => savePmntSupplier(filteredArr)}
                                    disabled={filteredArr.length === 0}> <Save className="scale-[0.8] 2xl:scale-100" />
                                </Button>
                            </div>
                        </th>
                    </tr>
                </tfoot>
            </table>
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

export const expensesToolTip = (supplier, expensesAll, settings, uidCollection, setDateSelect,
    setValueExp, setIsOpen, blankInvoice, router, toggleCheckExp, toggleCheckExpAll,
    toggleExp, savePmntExp) => {

    let filteredArr = expensesAll.filter(z => z.supplier === supplier)

    return (
        <div className="max-h-[28rem] overflow-y-auto pt-2 responsiveTextTable justify-end flex">
            <table>
                <thead>
                    <tr className="border border-slate-300">
                        <th className="text-left p-1 2xl:p-2 w-24">PO#</th>
                        {/* <th className="text-left p-2">Supplier</th> */}
                        <th className="text-left p-1 2xl:p-2">Exp. Invoice</th>
                        <th className="text-left p-1 2xl:p-2">Exp. Type</th>
                        <th className="text-right p-1 2xl:p-2">Amount</th>
                        <th className="text-left p-1 2xl:p-2">Date</th>
                        <th className="text-left p-1 2xl:p-2">Payment</th>
                        <th className="text-center p-1 2xl:p-2 py-0">
                            <Tltip direction='right' tltpText='Select all'>
                                <div className='flex items-center justify-center'>
                                    {filteredArr.length > 0 && <CheckBox size='size-5' checked={!!toggleExp[filteredArr[0]?.supplier]}
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
                            <tr className="border border-slate-300 " key={i}>
                                <td className="text-left p-1 2xl:p-2 text-blue-700 cursor-pointer"
                                    onClick={() => moveToContracts(z, z.poSupplier ? 'expense' : 'compexpense', uidCollection, setDateSelect,
                                        setValueExp, setIsOpen, blankInvoice, router)}>
                                    {z.poSupplier?.order ?? 'Comp. Exp.'}</td>
                                {/* <td className="text-left p-2">{settings.Supplier.Supplier.find(q => q.id === z.supplier)?.nname}</td> */}
                                <td className="text-left p-1 2xl:p-2" >{z.expense}</td>
                                <td className="text-left p-1 2xl:p-2" >{settings.Expenses.Expenses.find(q => q.id === z.expType)?.expType}</td>
                                <td className="text-right p-1 2xl:p-2">{
                                    <NumericFormat
                                        value={z.amount}
                                        displayType="text"
                                        thousandSeparator
                                        allowNegative={true}
                                        prefix={z.cur === 'us' ? '$' : '€'}
                                        decimalScale='2'
                                        fixedDecimalScale
                                        className='responsiveTextTable'
                                    />
                                }</td>
                                <td className="text-left p-1 2xl:p-2">
                                    {dateFormat(z.date, 'dd.mm.yy')}
                                </td>
                                <td className="text-left p-1 2xl:p-2">
                                    {z.paid === '111' ? 'Paid' : 'Unpaid'}
                                </td>
                                <td className="text-center p-1 2xl:p-2">
                                    <Tltip direction='right' tltpText='Set full payment'>
                                        <div className='flex items-center justify-center'>
                                            <CheckBox size='size-5' checked={z.checked}
                                                onChange={() => toggleCheckExp(z)} />
                                        </div>
                                    </Tltip>
                                </td>
                            </tr>
                        )
                    })}

                </tbody>
                <tfoot>
                    <tr className="border-t bg-slate-100 border border-slate-300">
                        <th className="grelative p-1 2xl:p-2 text-left responsiveTextTable font-medium text-gray-500 uppercase                                  ">
                            <div>Total $</div>
                            <div className="pt-1">Total €</div>
                        </th>
                        <th className="relative p-1 2xl:p-2 text-left font-medium text-gray-500 uppercase">
                        </th>
                        <th className="relative p-1 2xl:p-2 text-left font-medium text-gray-500 uppercase">
                        </th>
                        <th className="relative p-1 2xl:p-2 text-right responsiveTextTable font-medium text-gray-500 uppercase">
                            <div>{
                                showAmount(filteredArr.reduce((sum, item) => sum + (item.cur === 'us' ?
                                    parseFloat(item.amount) || 0 : 0), 0), 'usd')
                            }</div>
                            <div className="pt-1">{
                                showAmount(filteredArr.reduce((sum, item) => sum + (item.cur === 'eu' ?
                                    parseFloat(item.amount) || 0 : 0), 0), 'eur')
                            }
                            </div>
                        </th>
                        <th className="relative  text-left font-medium text-gray-500 uppercase">
                        </th>
                        <th className="relative p-1 2xl:p-2  text-left font-medium text-gray-500 uppercase">
                        </th>
                        <th className="relative p-1 2xl:p-2 text-right text-[0.8rem] font-medium text-gray-500 uppercase">
                            <div className='flex items-center justify-center'>
                                <Button className='h-6 2xl:h-7 p-1 2xl:p-2 bg-slate-500'
                                    onClick={() => savePmntExp(filteredArr)}
                                    disabled={filteredArr.length === 0}>
                                    <Save className="scale-[0.8] 2xl:scale-100" />
                                </Button>
                            </div>
                        </th>
                    </tr>
                </tfoot>
            </table>
        </div>
    )//stock; 
}