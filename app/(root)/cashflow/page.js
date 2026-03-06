'use client';
import Spinner from "../../../components/spinner";
import Toast from "../../../components/toast";
import YearSelect from "./yearSelect";
import { SettingsContext } from "../../../contexts/useSettingsContext";
import { getTtl } from "../../../utils/languages";
import React, { useContext, useEffect, useState } from 'react'
import Spin from '../../../components/spinTable';
import VideoLoader from '../../../components/videoLoader';
import { loadData, loadDataSettings, loadInvoice, loadMargins, loadStockData, saveCashflow, saveCashflowFinanced, saveDataSettings, saveMultipleData, updateClientPayment, updateExpPayments } from "../../../utils/utils";
import { UserAuth } from "../../../contexts/useAuthContext";
import { NumericFormat } from "react-number-format";
import { MdDeleteOutline } from "react-icons/md";
import { MdOutlineClose } from "react-icons/md";
import { addComma, clientDetails, clientToolTip, expensesToolTip, getTotals, getTotalsSupPayments, runExpenses, runInvoices, runStocks, runSupPayments, stocksUnSold, stoclToolTip, supplierDetails, supplierToolTip } from "./funcs";
import Tltip from "../../../components/tlTip";
import { FaSortAmountDown } from "react-icons/fa";
import { FaSortAmountUpAlt } from "react-icons/fa";
import MyAccordion from "./accordion";
import { cn } from "../../../lib/utils";
import { ContractsContext } from "../../../contexts/useContractsContext";
import { InvoiceContext } from "../../../contexts/useInvoiceContext";
import { useRouter } from "next/navigation";
import { ExpensesContext } from "../../../contexts/useExpensesContext";
import { v4 as uuidv4 } from 'uuid';
import dateFormat from "dateformat";

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


const Cashflow = () => {

    const { settings, ln, setLoading, loading, setToast, setDateSelect } = useContext(SettingsContext);
    const { setValueCon, setIsOpenCon } = useContext(ContractsContext);
    const { setValueExp, setIsOpen, } = useContext(ExpensesContext);
    const { blankInvoice } = useContext(InvoiceContext);
    const currentYear = new Date().getFullYear();
    const [yr, setYr] = useState([currentYear - 1])
    const [incoming, setIncoming] = useState();
    const { uidCollection, userTitle } = UserAuth();
    const [initialData, setInitialData] = useState([]);
    const [stockData1, setStockData1] = useState([])
    const [stockData2, setStockData2] = useState([])
    const [stockDataAll, setStockDataAll] = useState([])
    const [stockDataNoPayment, setStockDataNoPayment] = useState([])
    const [stockDataNoSold, setStockDataNoSold] = useState([])
    const [stockDataAllArray, setStockDataAllArray] = useState([])

    const [clientInvoices1, setClientInvoices1] = useState([])
    const [clientInvoices2, setClientInvoices2] = useState([])

    const [financedLeft, setFinancedLeft] = useState([])
    const [totalLeft, setTotalLeft] = useState('')

    const [supPayments1, setSupPayments1] = useState([])
    const [supPayments2, setSupPayments2] = useState([])


    const [expenses, setExpenses] = useState([])
    const [expensesAll, setExpensesAll] = useState([])
    const [financedRight, setFinancedRight] = useState([])
    const [totalRight, setTotalRight] = useState('')

    const [stocksSort, setStocksSort] = useState(true)
    const [stocksSort1, setStocksSort1] = useState(true)
    const [stocksSort2, setStocksSort2] = useState(true)
    const [stocksSortName, setStocksSortName] = useState(false)
    const [stocksSortName1, setStocksSortName1] = useState(false)
    const [stocksSortName2, setStocksSortName2] = useState(false)

    const [clientsData, setClientsData] = useState([])
    const [clientSort, setClientSort] = useState(true)
    const [clientSort1, setClientSort1] = useState(true)
    const [clientSortName, setClientSortName] = useState(false)
    const [clientSortName1, setClientSortName1] = useState(false)

    const [supPaymentsData, setsupPaymentsData] = useState([])
    const [supPmntssSort, setSupPmntssSort] = useState(true)
    const [supPmntssSort1, setSupPmntssSort1] = useState(true)
    const [supPmntssSortName, setSupPmntssSortName] = useState(false)
    const [supPmntssSortName1, setSupPmntssSortName1] = useState(false)

    const [expensesSort, setExpensesSort] = useState(true)
    const [expensesSortName, setExpensesSortName] = useState(false)

    const [totalYrs, setTotalYrs] = useState([])
    const [activeTab, setActiveTab] = useState('general')
    const router = useRouter();

    const [toggleClientPartial, setToggleClientPartial] = useState({})
    const [toggleClientFull, setToggleClientFull] = useState({})

    const [toggleSupplier, setToggleSupplier] = useState({})
    const [toggleExp, setToggleExp] = useState({})


    useEffect(() => {
        const loadData = async () => {
            const inData = await loadDataSettings(uidCollection, 'cashflow')

            setInitialData(inData.financed?.initial || [])

            setFinancedLeft(inData.financed?.financedLeft || [])

            setFinancedRight(inData.financed?.financedRight || [])

            setTotalYrs([
                Object.fromEntries(
                    Object.keys(inData).map(year => [`total${year}`, inData[year][`total${year}`] ?? 0])
                )
            ])
        }

        loadData()
    }, [yr])


    useEffect(() => {
        setYr([...yr, currentYear])
    }, [])

    useEffect(() => {

        const Load = async () => {
            setLoading(true)

            let tmp = 0;

            for (let year of yr) {
                const dt = await loadMargins(uidCollection, year);

                const yearTotal = dt
                    .filter(item => !isNaN(item.remaining))
                    .reduce((acc, item) => acc + (parseFloat(item.remaining) || 0), 0);

                tmp += yearTotal;
            }

            setIncoming(tmp);

            let contractsData = (
                await Promise.all(
                    yr.map(year =>
                        loadData(uidCollection, 'contracts', {
                            start: `${year}-01-01`,
                            end: `${year}-12-31`,
                        })
                    )
                )
            ).flat();

            //load stocks
            let dataStock = await runStocks(uidCollection, settings, yr, contractsData)
            dataStock.result = dataStock.result.map(z => ({ ...z, stockName: settings.Stocks.Stocks.find(k => k.id === z.stock)?.stock }))
            dataStock.result1 = dataStock.result1.map(z => ({ ...z, stockName: settings.Stocks.Stocks.find(k => k.id === z.stock)?.stock }))
            setStockData1(dataStock.result.sort((a, b) => b.total - a.total))
            setStockData2(dataStock.result1.sort((a, b) => b.total - a.total))
            setStockDataAll(dataStock.stocksArrWithPayment)
            setStockDataNoPayment(dataStock.stocksArrNoPayment)
            setStockDataNoSold(dataStock.unSoldArrTitles)
            setStockDataAllArray(dataStock.unSoldAll)

            //load invoices
            let invoices = await runInvoices(uidCollection, settings, yr)
            invoices = invoices.map(z => ({ ...z, clientName: settings.Client.Client.find(k => k.id === z.client)?.nname, checked: false }))
            setClientsData(invoices)
            setClientInvoices1(getTotals(invoices.filter(z => z.payments.length > 0)))
            setClientInvoices2(getTotals(invoices.filter(z => z.payments.length === 0)))



            //load payments to Suppliers
            let supPayments = await runSupPayments(uidCollection, settings, yr, contractsData)
            supPayments = supPayments.map(z => ({ ...z, suplierName: settings.Supplier.Supplier.find(a => a.id === z.supplier)?.nname, checked: false }))
            setsupPaymentsData(supPayments)
            setSupPayments1(getTotalsSupPayments(supPayments.filter(z => z.pmnt * 1 > 0)))
            setSupPayments2(getTotalsSupPayments(supPayments.filter(z => parseFloat(z.pmnt) === 0)))


            //Expenses
            let expenses = await runExpenses(uidCollection, settings, yr)
            expenses.totalBySupplier = expenses.totalBySupplier.map(z => ({
                ...z, suplierName: settings.Supplier.Supplier.find(a => a.id === z.supplier)?.nname
            }))
            setExpenses(expenses.totalBySupplier.sort((a, b) => b.amount - a.amount))
            setExpensesAll(expenses.dt.map(x => ({ ...x, checked: false })))

            setLoading(false)
        }
        Object.keys(settings).length !== 0 && Load();
    }, [yr, settings,])

    useEffect(() => {
        if (!isNaN(incoming)) {
            let total = incoming +
                initialData?.reduce((total, obj) => {
                    return total + (parseFloat(obj.num) || 0);
                }, 0) +
                stockData1.reduce((total, obj) => {
                    return total + (parseFloat(obj.total) || 0);
                }, 0) +
                stockData2.reduce((total, obj) => {
                    return total + (parseFloat(obj.total) || 0);
                }, 0) +
                clientInvoices1.reduce((total, obj) => {
                    return total + (parseFloat(obj.debtBlnc) || 0);
                }, 0) +
                clientInvoices2.reduce((total, obj) => {
                    return total + (parseFloat(obj.debtBlnc) || 0);
                }, 0) +

                (Array.isArray(financedLeft) ? financedLeft.reduce((total, obj) => total + (parseFloat(obj.num) || 0), 0) : 0);

            setTotalLeft(total)

        }

    }, [financedLeft, initialData, incoming, stockData1, stockData2, clientInvoices2, clientInvoices1])

    useEffect(() => {

        let total =
            supPayments1?.reduce((total, obj) => {
                return total + (parseFloat(obj.blnc) || 0);
            }, 0) +
            supPayments2?.reduce((total, obj) => {
                return total + (parseFloat(obj.blnc) || 0);
            }, 0) +
            expenses?.reduce((total, obj) => {
                return total + (parseFloat(obj.amount) || 0);
            }, 0) +
            (Array.isArray(financedRight) ? financedRight.reduce((total, obj) => total + (parseFloat(obj.num) || 0), 0) : 0);

        setTotalRight(total)


    }, [financedRight, expenses, supPayments2, supPayments1])


    const removeNonNumeric = (num) => num.toString().replace(/[^0-9.]/g, "");

    const handleChangeInitial = (e, i, ent) => {


        if (countDecimalDigits(e.target.value) > 2) return;

        const updatedData = initialData.map((item, index) =>
            index === i ? { ...item, [ent]: ent === 'num' ? removeNonNumeric(e.target.value) : e.target.value } : item
        );

        setInitialData(updatedData)
        setToast({ show: true, text: 'Save Data!', clr: 'fail' })
    }


    const addItem = () => {

        let newArr = [...initialData, { title: 'New item', num: '' }]
        setInitialData(newArr)
    }

    const delItem = async (i) => {

        const updatedData = initialData.filter((item, index) => index !== i);
        setInitialData(updatedData)

    }

    const saveInitData = async () => {

        for (let year of yr) {
            const key = `total${year}`;
            await saveCashflow(uidCollection, year,
                {
                    [key]: totalYrs.find(obj => obj.hasOwnProperty(key))?.[key]
                }
            )
        }

        await saveCashflowFinanced(uidCollection,
            {
                initial: initialData,
                financedLeft, financedRight,
            }
        )


        setToast({ show: true, text: 'Data successfully saved!', clr: 'success' })
    }

    const sortStocks = () => {
        if (stocksSort) { //true
            //sort from to bottmom
            setStockData1(stockData1.sort((a, b) => a.total - b.total))
            setStocksSort(false)
        } else {
            setStockData1(stockData1.sort((a, b) => b.total - a.total))
            setStocksSort(true)
        }
    }

    const sortStocksName = () => {
        if (stocksSortName) { //true
            //sort from to bottmom
            setStockData1(stockData1.sort((a, b) => a.stockName.localeCompare(b.stockName)))
            setStocksSortName(false)
        } else {
            setStockData1(stockData1.sort((a, b) => b.stockName.localeCompare(a.stockName)))
            setStocksSortName(true)
        }
    }

    const sortStocks1 = () => {
        if (stocksSort1) { //true
            //sort from to bottmom
            setStockData2(stockData2.sort((a, b) => a.total - b.total))
            setStocksSort1(false)
        } else {
            setStockData2(stockData2.sort((a, b) => b.total - a.total))
            setStocksSort1(true)
        }
    }

    const sortStocksName1 = () => {
        if (stocksSortName1) { //true
            //sort from to bottmom
            setStockData2(stockData2.sort((a, b) => a.stockName.localeCompare(b.stockName)))
            setStocksSortName1(false)
        } else {
            setStockData2(stockData2.sort((a, b) => b.stockName.localeCompare(a.stockName)))
            setStocksSortName1(true)
        }
    }

    const sortStocks2 = () => {
        if (stocksSort2) {
            setStockDataNoSold(stockDataNoSold.sort((a, b) => a.total - b.total))
            setStocksSort2(false)
        } else {
            setStockDataNoSold(stockDataNoSold.sort((a, b) => b.total - a.total))
            setStocksSort2(true)
        }
    }

    const sortStocksName2 = () => {
        if (stocksSortName2) {
            setStockDataNoSold(stockDataNoSold.sort((a, b) => a.supplierName.localeCompare(b.supplierName)))
            setStocksSortName2(false)
        } else {
            setStockDataNoSold(stockDataNoSold.sort((a, b) => b.supplierName.localeCompare(a.supplierName)))
            setStocksSortName2(true)
        }
    }


    const sortClientsName = (num) => {
        const isFirst = num === 0;
        const sortDir = isFirst ? clientSortName : clientSortName1;
        const data = isFirst ? clientInvoices1 : clientInvoices2;
        const setData = isFirst ? setClientInvoices1 : setClientInvoices2;
        const toggleSort = isFirst ? setClientSortName : setClientSortName1;

        const newArr = getTotals(data).sort((a, b) =>
            !sortDir ? a.clientName.localeCompare(b.clientName) : b.clientName.localeCompare(a.clientName)
        );

        setData(newArr);
        toggleSort(!sortDir);
    };


    const sortClients = (num) => {
        const isFirst = num === 0;
        const sortDir = isFirst ? clientSort : clientSort1;
        const data = isFirst ? clientInvoices1 : clientInvoices2;
        const setData = isFirst ? setClientInvoices1 : setClientInvoices2;
        const toggleSort = isFirst ? setClientSort : setClientSort1;

        const newArr = getTotals(data).sort((a, b) =>
            !sortDir ? a.debtBlnc - b.debtBlnc : b.debtBlnc - a.debtBlnc
        );

        setData(newArr);
        toggleSort(!sortDir);
    };

    const sortSupPmntsName = (num) => {

        const isFirst = num === 0;
        const sortDir = isFirst ? supPmntssSortName : supPmntssSortName1;
        const data = isFirst ? supPayments1 : supPayments2;
        const setData = isFirst ? setSupPayments1 : setSupPayments2;
        const toggleSort = isFirst ? setSupPmntssSortName : setSupPmntssSortName1;

        const newArr = getTotalsSupPayments(data).sort((a, b) =>
            !sortDir ? a.suplierName.localeCompare(b.suplierName) : b.suplierName.localeCompare(a.suplierName)
        );

        setData(newArr);
        toggleSort(!sortDir);

    }

    const sortSupPmnts = (num) => {

        const isFirst = num === 0;
        const sortDir = isFirst ? supPmntssSort : supPmntssSort1;
        const data = isFirst ? supPayments1 : supPayments2;
        const setData = isFirst ? setSupPayments1 : setSupPayments2;
        const toggleSort = isFirst ? setSupPmntssSort : setSupPmntssSort1;

        const newArr = getTotalsSupPayments(data).sort((a, b) =>
            !sortDir ? a.blnc - b.blnc : b.blnc - a.blnc
        );

        setData(newArr);
        toggleSort(!sortDir);

    }

    const sortExpenses = () => {
        if (expensesSort) { //true
            //sort from to bottmom
            setExpenses(expenses.sort((a, b) => a.amount - b.amount))
            setExpensesSort(false)
        } else {
            setExpenses(expenses.sort((a, b) => b.amount - a.amount))
            setExpensesSort(true)
        }
    }

    const sortExpensesName = () => {
        if (expensesSortName) { //true
            setExpenses(expenses.sort((a, b) => a.suplierName.localeCompare(b.suplierName)))
            setExpensesSortName(false)
        } else {
            setExpenses(expenses.sort((a, b) => b.suplierName.localeCompare(a.suplierName)))
            setExpensesSortName(true)
        }
    }



    const FinancedRight = (e) => {
        setFinancedRight(removeNonNumeric(e.target.value))

        let total1 = supPayments.reduce((total, obj) => {
            return total + (parseFloat(obj.blnc) || 0);
        }, 0) +
            expenses.reduce((total, obj) => {
                return total + (parseFloat(obj.amount) || 0);
            }, 0) + removeNonNumeric(e.target.value) * 1;

        setTotalRight(total1)

        setToast({ show: true, text: 'Save Data!', clr: 'fail' })
    }



    const handleChange = (e, year) => {
        const key = `total${year}`;

        const keyExists = totalYrs.some(obj => key in obj);

        if (keyExists) {
            setTotalYrs(totalYrs.map(obj =>
                key in obj ? { ...obj, [key]: removeNonNumeric(e.target.value) } : obj
            ));
        } else {
            setTotalYrs(totalYrs.map(obj => ({
                ...obj,
                [key]: removeNonNumeric(e.target.value)
            })));
        }
    };

    const handleChangeFinance = (e, k, side, inp) => {

        if (side === 'left') {
            let newFin = financedLeft.map((x, i) => i === k ?
                inp === 'title' ? { ...x, title: e.target.value } : {
                    ...x, num: removeNonNumeric(e.target.value)
                } : x)
            setFinancedLeft(newFin)
        } else {
            let newFin = financedRight.map((x, i) => i === k ?
                inp === 'title' ? { ...x, title: e.target.value } : { ...x, num: removeNonNumeric(e.target.value) } : x)
            setFinancedRight(newFin)
        }

        setToast({ show: true, text: 'Save Data!', clr: 'fail' })
    }



    const toggleCheckClient = (z, type) => {
        let tmpArr = clientsData.map(x => x.id === z.id ? { ...x, checked: !x.checked } : x)
        setClientsData(tmpArr)

        if (!tmpArr.find(x => x.id === z.id)?.checked) {
            if (type === 'PartPaid') {
                setToggleClientPartial(prev => ({
                    ...prev, [z.client]: false,
                }));
            } else {
                setToggleClientFull(prev => ({
                    ...prev, [z.client]: false,
                }));
            }
        }
    }

    const toggleCheckClientAll = (z, arr) => {

        if (z === 'PartPaid') {
            setToggleClientPartial(prev => ({
                ...prev, [arr[0]?.client]: !prev[arr[0]?.client],
            }));
            setClientsData(clientsData.map(x => x.payments.length > 0 && x.client === arr[0]?.client ?
                { ...x, checked: !toggleClientPartial[arr[0]?.client] } : x))
        } else {
            setToggleClientFull(prev => ({
                ...prev, [arr[0]?.client]: !prev[arr[0]?.client],
            }));
            setClientsData(clientsData.map(x => x.payments.length === 0 && x.client === arr[0].client ?
                { ...x, checked: !toggleClientFull[arr[0]?.client] } : x))
        }
    }

    const savePmntClient = async (clientId) => {

        let tmpArr = clientsData.filter(x => x.client === clientId && x.checked)
        let dt = dateFormat(new Date(), 'yyyy-mm-dd')


        for (let i = 0; i < tmpArr.length; i++) {
            let inv = tmpArr[i]

            let obj = {
                cur: inv.cur, date: { endDate: dt, startDate: dt }, id: uuidv4(),
                pmnt: inv.payments.length > 0 ? (inv.totalAmount * 1 - inv.payments.reduce((total, obj1) => {
                    return total + (obj1.pmnt * 1 || 0);
                }, 0)).toFixed(3) * 1 : inv.totalAmount * inv.percentage / 100
            }

            inv = {
                ...inv, payments: inv.payments.length > 0 ? [...inv.payments, obj] : [obj],
                debtBlnc: inv.debtBlnc - obj.pmnt
            }


            //Remove duplicate Payments
            if (inv.invType === "3333") {

                //Load original invoice
                const OriginalInvoice = await loadInvoice(uidCollection, 'invoices', inv.originalInvoice)
                const pmntsArr = OriginalInvoice.payments?.map(x => x.id) || []

                inv = { ...inv, payments: inv.payments.filter(x => !pmntsArr.includes(x.id)) }
            }

            let success = await updateClientPayment(uidCollection, inv)
            success && setToast({ show: true, text: getTtl('Payments successfully saved!', ln), clr: 'success' })
        }

        let newArr = clientsData.filter(z => !tmpArr.map(x => x.id).includes(z.id))
        setClientsData(newArr)

        setClientInvoices1(getTotals(newArr.filter(z => z.payments.length > 0)))
        setClientInvoices2(getTotals(newArr.filter(z => z.payments.length === 0)))

    }


    const toggleCheckSupplier = (z, arr) => {
        let tmpArr = supPaymentsData.map(x => x.id === z.id ? { ...x, checked: !x.checked } : x)
        setsupPaymentsData(tmpArr)

        if (!tmpArr.find(x => x.id === z.id)?.checked) {

            let type = z.pmnt !== '0' ? 'PartPaid' : 'fullDebt'
            setToggleSupplier(prev => ({
                ...prev, [arr[0]?.supplier + '-' + type]: false,
            }));
        }
    }


    const toggleCheckSupplierAll = (arr) => {

        let type = arr[0]?.pmnt !== '0' ? 'PartPaid' : 'fullDebt'

        setToggleSupplier(prev => ({
            ...prev, [arr[0]?.supplier + '-' + type]: !prev[arr[0]?.supplier + '-' + type],
        }));

        setsupPaymentsData(supPaymentsData.map(x => x.supplier === arr[0]?.supplier &&
            arr.map(x => x.id).includes(x.id) ?
            { ...x, checked: !toggleSupplier[arr[0]?.supplier + '-' + type] } : x))

    }

    const savePmntSupplier = async (arr) => {

        let arr1 = arr.filter(x => x.checked)
        let tmpArr = []
        let dt = dateFormat(new Date(), 'yyyy-mm-dd')

        for (let i = 0; i < arr1.length; i++) {

            let inv = await loadInvoice(uidCollection, 'contracts', arr1[i].orderData)

            //in case there is no payments
            let pmntObj = inv.poInvoices.find(x => x.id === arr1[i].id)
            let tmp = pmntObj.payments ? pmntObj.payments :
                parseFloat(pmntObj.pmnt) > 0 ?
                    [{
                        pmntId: uuidv4(), pmntDate: null, pmntPerc: ((parseFloat(pmntObj.pmnt) / parseFloat(pmntObj.invValue) * 100)).toFixed(1),
                        pmnt: pmntObj.pmnt,
                    }] : []

            let updatedpoInvoices = inv.poInvoices.map(x => x.id === arr1[i].id ?
                {
                    ...x, pmnt: x.invValue, blnc: 0,
                    payments: [...tmp, {
                        pmntId: uuidv4(), pmntDate: obj.date, pmntPerc: obj.perc, pmnt: obj.pmnt }]
                } :
                x)

            inv.poInvoices = [...updatedpoInvoices]
            tmpArr.push(inv)
        }

        let success = await saveMultipleData(uidCollection, 'contracts', tmpArr)
        success && setToast({ show: true, text: getTtl('Payments successfully saved!', ln), clr: 'success' })

        let newArr = supPaymentsData.filter(z => !arr1.map(x => x.id).includes(z.id))
        setsupPaymentsData(newArr)
        setSupPayments2(getTotalsSupPayments(newArr.filter(z => parseFloat(z.pmnt) === 0)));
        setSupPayments1(getTotalsSupPayments(newArr.filter(z => z.blnc * 1 > 0)))
    }

    const toggleCheckExp = (z) => {

        let tmpArr = expensesAll.map(x => x.id === z.id ? { ...x, checked: !x.checked } : x)
        setExpensesAll(tmpArr)

        if (!tmpArr.find(x => x.id === z.id)?.checked) {
            setToggleExp(prev => ({
                ...prev, [z.supplier]: false,
            }));
        }
    }

    const toggleCheckExpAll = (arr) => {

        setToggleExp(prev => ({
            ...prev, [arr[0]?.supplier]: !prev[arr[0]?.supplier],
        }));

        setExpensesAll(expensesAll.map(x => x.supplier === arr[0]?.supplier ?
            { ...x, checked: !toggleExp[arr[0]?.supplier] } : x))

    }

    const savePmntExp = async (arr) => {

        let arr1 = arr.filter(x => x.checked)

        let success = await updateExpPayments(uidCollection, arr1)
        success && setToast({ show: true, text: getTtl('Payments successfully saved!', ln), clr: 'success' })

        setExpensesAll(expensesAll.filter(z => !arr1.map(x => x.id).includes(z.id)))

    }

    const supplierPartialPayment = async (obj) => {

        let item = supPaymentsData.find(x => x.id === obj.id)

        const flag = item.pmnt === 0 ? true : false
        item = item.pmnt === 0 ? { ...item, pmnt: obj.pmnt, blnc: item.blnc * 1 - obj.pmnt } :
            { ...item, pmnt: parseFloat(item.pmnt) + parseFloat(obj.pmnt), blnc: item.blnc * 1 - obj.pmnt }

        let inv = await loadInvoice(uidCollection, 'contracts', item.orderData)

        //in case there is no payments
        let pmntObj = inv.poInvoices.find(x => x.id === item.id)
        let tmp = pmntObj.payments ? pmntObj.payments :
            parseFloat(pmntObj.pmnt) > 0 ?
                [{
                    pmntId: uuidv4(), pmntDate: null, pmntPerc: ((parseFloat(pmntObj.pmnt) / parseFloat(pmntObj.invValue) * 100)).toFixed(1),
                    pmnt: pmntObj.pmnt,
                }] : []

        let updatedpoInvoices = inv.poInvoices.map(x => x.id === item.id ?
            {
                ...x, pmnt: parseFloat(x.pmnt) + parseFloat(obj.pmnt), blnc: x.blnc - obj.pmnt,
                payments: [...tmp, { pmntId: uuidv4(), pmntDate: obj.date, pmntPerc: obj.perc, pmnt: obj.pmnt }]
            } : x)
        inv.poInvoices = [...updatedpoInvoices]

        await saveMultipleData(uidCollection, 'contracts', [inv])

        let newArr;

        if ((item.invValue * 1 - obj.pmnt) > 1) { // partial payment
            newArr = supPaymentsData.map(x => x.id === item.id ? item : x);
        } else { // full payment
            newArr = supPaymentsData.filter(x => x.id !== item.id);
        }

        setsupPaymentsData(newArr);
        if (flag) {
            setSupPayments2(getTotalsSupPayments(newArr.filter(z => parseFloat(z.pmnt) === 0)));
        }
        setSupPayments1(getTotalsSupPayments(newArr.filter(z => z.blnc * 1 > 0)))

        setToast({ show: true, text: getTtl('Payments successfully saved!', ln), clr: 'success' })

    }

    const clientPartialPayment = async (obj) => {

        let inv = clientsData.find(x => x.id === obj.id)

        let obj1 = {
            cur: inv.cur, date: obj.date, id: uuidv4(),
            pmnt: obj.pmnt
        }
   
        inv = {
            ...inv, payments: inv.payments.length > 0 ? [...inv.payments, obj1] : [obj1],
            debtBlnc: inv.debtBlnc - obj1.pmnt
        }
 

        let success;

        //Remove duplicate Payments
        if (inv.invType === "3333") {

            //Load original invoice
            const OriginalInvoice = await loadInvoice(uidCollection, 'invoices', inv.originalInvoice)
            const pmntsArr = OriginalInvoice.payments?.map(x => x.id) || []

            let inv1 = { ...inv, payments: inv.payments.filter(x => !pmntsArr.includes(x.id)) }
            success = await updateClientPayment(uidCollection, inv1)
        } else {
            success = await updateClientPayment(uidCollection, inv)
        }

        let newArr = clientsData.map(x => x.id === inv.id ? inv : x)

        success && setToast({ show: true, text: getTtl('Payments successfully saved!', ln), clr: 'success' })

        setClientsData(newArr)

        setClientInvoices1(getTotals(newArr.filter(z => z.payments.length > 0)))
        setClientInvoices2(getTotals(newArr.filter(z => z.payments.length === 0)))

    }
// ...existing code...

return (
	<div className="w-full" style={{ background: "#f8fbff" }}>
		<div className="mx-auto max-w-[98%] px-1 sm:px-2 md:px-3 pb-4 mt-[72px]">
			{Object.keys(settings).length === 0 ? <VideoLoader loading={true} fullScreen={true} /> :
            <>
                <Toast />
                <VideoLoader loading={loading} fullScreen={true} />
                <div className="rounded-2xl p-3 sm:p-5 mt-8 border border-gray-200 shadow-xl w-full backdrop-blur-[2px] bg-white">
                    <div className='flex items-center justify-between flex-wrap gap-2 pb-2'>
                        <h1 className="text-[14px] text-[var(--chathams-blue)] font-poppins responsiveTextTitle border-l-4 border-[var(--chathams-blue)] pl-2">
                            {getTtl('Cashflow', ln)}
                        </h1>
                        <div className="flex items-center gap-2 group">
                            <YearSelect yr={yr} setYr={setYr} />
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-2 mb-3">
                        <button
                            onClick={() => setActiveTab('general')}
                            className={`px-4 py-1.5 text-xs rounded-full border transition-all font-medium ${activeTab === 'general' ? 'bg-[var(--chathams-blue)] text-white border-[var(--chathams-blue)]' : 'bg-white text-[var(--chathams-blue)] border-[#b8ddf8] hover:bg-[#d4eafc]'}`}
                        >
                            General Cashflow
                        </button>
                        <button
                            onClick={() => setActiveTab('unsold')}
                            className={`px-4 py-1.5 text-xs rounded-full border transition-all font-medium ${activeTab === 'unsold' ? 'bg-[var(--chathams-blue)] text-white border-[var(--chathams-blue)]' : 'bg-white text-[var(--chathams-blue)] border-[#b8ddf8] hover:bg-[#d4eafc]'}`}
                        >
                            Unsold Stocks
                        </button>
                    </div>


{activeTab === 'unsold' ? (
    <div className="w-full border border-[#b8ddf8] rounded-2xl overflow-hidden bg-white p-4">
        <div className="text-[var(--endeavour)] responsiveTextTitle mb-2 font-medium">Unsold Stocks</div>
        <div className="flex p-1 justify-between mb-1">
            {
                stocksSortName2 ?
                    <FaSortAmountDown className="scale-[0.9] text-slate-600 cursor-pointer" onClick={() => sortStocksName2()} />
                    :
                    <FaSortAmountUpAlt className="scale-[0.9] text-slate-600 cursor-pointer" onClick={() => sortStocksName2()} />}
            {
                stocksSort2 ?
                    <FaSortAmountDown className="scale-[0.9]  text-slate-600 cursor-pointer" onClick={() => sortStocks2()} />
                    :
                    <FaSortAmountUpAlt className="scale-[0.9] text-slate-600 cursor-pointer" onClick={() => sortStocks2()} />}
        </div>
        {stockDataNoSold.length === 0 ? (
            <div className="text-gray-400 text-sm py-4 text-center">No unsold stocks</div>
        ) : (
            <>
                {stockDataNoSold.map((x, i) => (
                    <div className="bg-white rounded-xl py-0 px-1 mb-1 border border-[#b8ddf8]" key={i}>
                        <MyAccordion title={
                            <div className="flex w-full justify-between">
                                <div className="responsiveText font-normal text-[#545454] items-center flex outline-none whitespace-normal break-words min-w-0">
                                    {x.supplierName}
                                </div>
                                <div className="leading-4 2xl:leading-6">
                                    <NumericFormat
                                        value={x.total || 0}
                                        displayType="text"
                                        thousandSeparator
                                        allowNegative={true}
                                        prefix={x.cur === 'us' ? '$' : '€'}
                                        decimalScale='2'
                                        fixedDecimalScale
                                        className='responsiveText font-normal text-[#545454]'
                                    />
                                </div>
                            </div>
                        }>
                            {stocksUnSold(x.supplier, stockDataAllArray, settings, uidCollection, setDateSelect,
                                setValueCon, setIsOpenCon, blankInvoice, router)}
                        </MyAccordion>
                    </div>
                ))}

                <div className="mt-2 pt-2 border-t border-[#b8ddf8] flex items-center justify-between">
                    <div className="responsiveTextTitle text-[var(--endeavour)] font-semibold">Total</div>
                    <NumericFormat
                        value={stockDataNoSold.reduce((sum, item) => sum + (parseFloat(item.total) || 0), 0)}
                        displayType="text"
                        thousandSeparator
                        allowNegative={true}
                        prefix={'$'}
                        decimalScale='2'
                        fixedDecimalScale
                        className='responsiveTextTitle text-[var(--endeavour)] font-semibold'
                    />
                </div>
            </>
        )}
    </div>
) : (
<div className="w-full border border-[#dedede] rounded-2xl overflow-hidden bg-white">
  {userTitle === 'Admin' &&
                        <div className="w-full p-3 sm:p-4 border-b border-[#dedede]">
                            <div className="flex gap-2">
                                <span className="responsiveTextInput items-center flex w-44 text-[var(--endeavour)]">Future</span>
                                <label className="pl-1">{
                                    <NumericFormat
                                        value={incoming}
                                        displayType="text"
                                        thousandSeparator
                                        allowNegative={true}
                                        prefix={'$'}
                                        decimalScale='2'
                                        fixedDecimalScale
                                        className='responsiveTextTotal  !text-[var(--endeavour)] font-normal'
                                    />
                                }</label>
                            </div>
                            {
                                initialData?.map((z, i) => {
                                    return (
                                        <div className="flex gap-2 my-1" key={i}>
                                            <input className="responsiveTextInput items-center flex outline-none w-44 truncate" value={z.title}
                                                onChange={e => handleChangeInitial(e, i, 'title')} />
                                            <input className='input w-44 h-6 responsiveTextTotal'
                                                value={addComma(z.num)} onChange={e => handleChangeInitial(e, i, 'num')} />
                                            <button onClick={() => delItem(i)} className="border border-red-300 text-red-500 px-1.5 h-7 rounded-full hover:bg-red-50 transition-all"><MdDeleteOutline className="scale-110" /></button>
                                        </div>
                                    )
                                })}
                            <div className="flex gap-2 mt-4">
                                <Tltip direction='bottom' tltpText='Save added data'>
                                    <button
                                        type="button"
                                    className="bg-[var(--endeavour)] border border-[var(--rock-blue)] text-white px-3 h-7 text-xs rounded-full hover:opacity-90 transition-all"
                                        onClick={saveInitData}
                                    >
                                        Save
                                    </button>
                                </Tltip>
                                <Tltip direction='bottom' tltpText='Add new item above'>
                                    <button
                                        type="button"
                                        className="border border-[var(--rock-blue)] text-[var(--endeavour)] px-3 h-7 text-xs rounded-full hover:bg-[var(--selago)] transition-all"
                                        onClick={addItem}
                                    >
                                        Add
                                    </button>
                                </Tltip>
                            </div>
                        </div>

                    }
  <div className="flex flex-wrap w-full">
                            <div className="w-full max-w-screen-lg flex-1 min-w-[320px]">
                            <div className="p-4 bg-white   mb-0.5 flex flex-col justify-between min-h-[140px] cf-card">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-[var(--endeavour)] responsiveTextTitle">Stocks - Paid</span>
                                </div>
                                <div className="flex p-1 justify-between">
                                    {
                                        stocksSortName ?
                                            <FaSortAmountDown className="scale-[0.9] text-slate-600 cursor-pointer" onClick={() => sortStocksName()} />
                                            :
                                            <FaSortAmountUpAlt className="scale-[0.9] text-slate-600 cursor-pointer" onClick={() => sortStocksName()} />}
                                    {
                                        stocksSort ?
                                            <FaSortAmountDown className="scale-[0.9]  text-slate-600 cursor-pointer" onClick={() => sortStocks()} />
                                            :
                                            <FaSortAmountUpAlt className="scale-[0.9] text-slate-600 cursor-pointer" onClick={() => sortStocks()} />}
                                </div>
                                {stockData1.map((x, i) => {
                                    return (
                                        <div className="bg-white rounded-xl py-0 px-1 mb-1 border border-[#b8ddf8]" key={i}>
                                            <MyAccordion title={
                                                <div className="flex w-full justify-between">
                                                        <div className="responsiveText items-center font-normal text-[#545454] flex outline-none whitespace-normal break-words min-w-0"
                                                    >
                                                        {settings.Stocks.Stocks.find(z => z.id === x.stock)?.nname}
                                                    </div>

                                                    <div className="leading-4 2xl:leading-6">
                                                        <NumericFormat
                                                            value={x.total}
                                                            displayType="text"
                                                            thousandSeparator
                                                            allowNegative={true}
                                                            prefix={x.cur === 'us' ? '$' : '€'}
                                                            decimalScale='2'
                                                            fixedDecimalScale
                                                            className='responsiveText font-normal text-[#545454] '
                                                        />
                                                    </div>
                                                </div>
                                            }>

                                                {stoclToolTip(x.stock, stockDataAll, settings, uidCollection,
                                                    setDateSelect, setValueCon, setIsOpenCon, blankInvoice, router,)}
                                            </MyAccordion>


                                        </div>

                                    )
                                })}  
                                <div className=" rounded-md py-0 px-1 mt-2 flex items-center justify-between responsiveTextTotal">
                                    <div className=" text-[var(--endeavour)] font-normal">
                                        Total
                                    </div>
                                    <div className="text-[var(--endeavour)] font-normal">
                                        {
                                            <NumericFormat
                                                value={stockData1.reduce((total, obj) => {
                                                    return total + (parseFloat(obj.total) || 0);
                                                }, 0)}
                                                displayType="text"
                                                thousandSeparator
                                                allowNegative={true}
                                                prefix='$'
                                                decimalScale='2'
                                                fixedDecimalScale
                                                className='responsiveTextTotal font-normal'
                                            />
                                        }
                                    </div>
                                </div>

                            </div>



                            <div className="p-4 bg-white   mb-0.5 flex flex-col justify-between min-h-[140px] cf-card">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-[var(--endeavour)] responsiveTextTitle">Stocks - UnPaid</span>
                                </div>
                                <div className="flex p-1 justify-between">
                                    {
                                        stocksSortName1 ?
                                            <FaSortAmountDown className="scale-[0.9] text-slate-600 cursor-pointer" onClick={() => sortStocksName1()} />
                                            :
                                            <FaSortAmountUpAlt className="scale-[0.9] text-slate-600 cursor-pointer" onClick={() => sortStocksName1()} />}
                                    {
                                        stocksSort1 ?
                                            <FaSortAmountDown className="scale-[0.9]  text-slate-600 cursor-pointer" onClick={() => sortStocks1()} />
                                            :
                                            <FaSortAmountUpAlt className="scale-[0.9] text-slate-600 cursor-pointer" onClick={() => sortStocks1()} />}
                                </div>

                                {stockData2.map((x, i) => {
                                    return (
                                        <div className="bg-white rounded-xl py-0 px-1 mb-1 border border-[#b8ddf8]" key={i}>
                                            <MyAccordion title={
                                                <div className="flex w-full justify-between">
                                                    <div className="responsiveText font-normal text-[#545454] items-center flex outline-none whitespace-normal break-words min-w-0"
                                                    >
                                                        {settings.Stocks.Stocks.find(z => z.id === x.stock)?.nname}
                                                    </div>

                                                    <div className="leading-4 2xl:leading-6">
                                                        <NumericFormat
                                                            value={x.total}
                                                            displayType="text"
                                                            thousandSeparator
                                                            allowNegative={true}
                                                            prefix={x.cur === 'us' ? '$' : '€'}
                                                            decimalScale='2'
                                                            fixedDecimalScale
                                                            className='responsiveText font-normal text-[#545454]'
                                                        />
                                                    </div>
                                                </div>
                                            }>

                                                {stoclToolTip(x.stock, stockDataNoPayment, settings, uidCollection,
                                                    setDateSelect, setValueCon, setIsOpenCon, blankInvoice, router,)}
                                            </MyAccordion>
                                        </div>

                                    )
                                })}
                                <div className="rounded-md py-0 px-1 mt-2  flex items-center justify-between responsiveTextTotal">
                                    <div className="font-normal text-[var(--endeavour)]">
                                        Total
                                    </div>
                                    <div className="font-normal text-[var(--endeavour)]">
                                        {
                                            <NumericFormat
                                                value={stockData2.reduce((total, obj) => {
                                                    return total + (parseFloat(obj.total) || 0);
                                                }, 0)}
                                                displayType="text"
                                                thousandSeparator
                                                allowNegative={true}
                                                prefix='$'
                                                decimalScale='2'
                                                fixedDecimalScale
                                                className='responsiveTextTotal font-normal'
                                            />
                                        }
                                    </div>
                                </div>
                            </div>


                            <div className="p-4 bg-white   mb-0.5 flex flex-col justify-between min-h-[140px] cf-card">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-[var(--endeavour)] responsiveTextTitle">Clients - Payment</span>
                                </div>
                                <div className="flex p-1 justify-between">
                                    {
                                        clientSortName1 ?
                                            <FaSortAmountDown className="scale-[0.9] text-slate-600 cursor-pointer" onClick={() => sortClientsName(1)} />
                                            :
                                            <FaSortAmountUpAlt className="scale-[0.9]  text-slate-600 cursor-pointer" onClick={() => sortClientsName(1)} />}
                                    {
                                        clientSort1 ?
                                            <FaSortAmountDown className="scale-[0.9] text-slate-600 cursor-pointer" onClick={() => sortClients(1)} />
                                            :
                                            <FaSortAmountUpAlt className="scale-[0.9]  text-slate-600 cursor-pointer" onClick={() => sortClients(1)} />}
                                </div>

                                {clientInvoices2.map((x, i) => {
                                    return (
                                        <div className="bg-white rounded-xl py-0 px-1 mb-1 border border-[#b8ddf8]" key={i}>
                                            <MyAccordion title={
                                                <div className="flex w-full justify-between">
                                                    <div className="responsiveText text-[#545454] font-normal items-center flex outline-none whitespace-normal break-words min-w-0"
                                                    >
                                                        {settings.Client.Client.find(z => z.id === x.client)?.nname}
                                                    </div>
                                                    <div className='leading-4 2xl:leading-6 '>
                                                        <NumericFormat
                                                            value={x.debtBlnc}
                                                            displayType="text"
                                                            thousandSeparator
                                                            allowNegative={true}
                                                            prefix={x.cur === 'us' ? '$' : '€'}
                                                            decimalScale='2'
                                                            fixedDecimalScale
                                                            className='responsiveText font-normal text-[#545454]'
                                                        />

                                                    </div>
                                                </div>}>
                                                {clientDetails(x.client, clientsData, 'InDebt', uidCollection, setDateSelect,
                                                    setValueCon, setIsOpenCon, blankInvoice, router, toggleCheckClient, toggleCheckClientAll,
                                                    toggleClientPartial, toggleClientFull, savePmntClient, clientPartialPayment)}
                                            </MyAccordion>
                                        </div>
                                    )
                                })}
                                <div className="rounded-md py-0 px-1 mt-2 flex items-center justify-between responsiveTextTotal">
                                    <div className=" text-[var(--endeavour)] font-normal">
                                        Total
                                    </div>
                                    <div className="text-[var(--endeavour)] font-normal">
                                        {
                                            <NumericFormat
                                                value={clientInvoices2.reduce((total, obj) => {
                                                    return total + (parseFloat(obj.debtBlnc) || 0);
                                                }, 0)}
                                                displayType="text"
                                                thousandSeparator
                                                allowNegative={true}
                                                prefix='$'
                                                decimalScale='2'
                                                fixedDecimalScale
                                            />
                                        }
                                    </div>
                                </div>
                            </div>


                            <div className="p-4 bg-white   mb-0.5 flex flex-col justify-between min-h-[140px] cf-card">
                                <div className="flex items-center justify-between mb-2">
                                    <span className=" font-normal text-[var(--endeavour)] responsiveTextTitle">Clients - Balances</span>
                                </div>
                                <div className="flex p-1 justify-between ">
                                    {
                                        clientSortName ?
                                            <FaSortAmountDown className="scale-[0.9] text-slate-600 cursor-pointer" onClick={() => sortClientsName(0)} />
                                            :
                                            <FaSortAmountUpAlt className="scale-[0.9] text-slate-600 cursor-pointer" onClick={() => sortClientsName(0)} />}
                                    {
                                        clientSort ?
                                            <FaSortAmountDown className="scale-[0.9] text-slate-600 cursor-pointer" onClick={() => sortClients(0)} />
                                            :
                                            <FaSortAmountUpAlt className="scale-[0.9] text-slate-600 cursor-pointer" onClick={() => sortClients(0)} />}
                                </div>

                                {clientInvoices1.map((x, i) => {
                                    return (
                                        <div className="bg-white rounded-xl py-0 px-1 mb-1 border border-[#b8ddf8]" key={i}>
                                            <MyAccordion title={
                                                <div className="flex w-full justify-between">
                                                    <div className="responsiveText font-normal text-[#545454] items-center flex outline-none whitespace-normal break-words min-w-0"
                                                    >
                                                        {settings.Client.Client.find(z => z.id === x.client)?.nname}
                                                    </div>
                                                    <div className='leading-4 2xl:leading-6'>
                                                        <NumericFormat
                                                            value={x.debtBlnc}
                                                            displayType="text"
                                                            thousandSeparator
                                                            allowNegative={true}
                                                            prefix={x.cur === 'us' ? '$' : '€'}
                                                            decimalScale='2'
                                                            fixedDecimalScale
                                                            className='responsiveText font-normal text-[#545454]'
                                                        />

                                                    </div>
                                                </div>}>
                                                {clientDetails(x.client, clientsData, 'PartPaid', uidCollection, setDateSelect,
                                                    setValueCon, setIsOpenCon, blankInvoice, router, toggleCheckClient,
                                                    toggleCheckClientAll, toggleClientPartial, toggleClientFull, savePmntClient, clientPartialPayment)}
                                            </MyAccordion>
                                            </div>
                                        )
                                    })}

                                <div className="rounded-md py-0 px-1 mt-2 flex items-center justify-between responsiveTextTotal">
                                    <div className="font-normal text-[var(--endeavour)]">
                                        Total
                                    </div>
                                    <div className=" text-[var(--endeavour)]">
                                        {
                                            <NumericFormat
                                                value={clientInvoices1.reduce((total, obj) => {
                                                    return total + (parseFloat(obj.debtBlnc) || 0);
                                                }, 0)}
                                                displayType="text"
                                                thousandSeparator
                                                allowNegative={true}
                                                prefix='$'
                                                decimalScale='2'
                                                fixedDecimalScale
                                                className='responsiveTextTotal font-normal'
                                            />
                                        }
                                    </div>
                                </div>
                            </div>


                            <div>
                                {
                                    userTitle === 'Admin' &&
                                    <div className='mt-4 p-1'>
                                        <div className='flex justify-between p-2'>
                                            <span className="text-[var(--endeavour)] responsiveTextTitle">Financing</span>
                                            <button
                                                type="button"
                                    className="bg-[var(--endeavour)] border border-[var(--rock-blue)] text-white px-3 py-1 text-xs rounded-full hover:bg-[var(--selago)]/30 transition-all"
                                                onClick={() => setFinancedLeft([...financedLeft, { title: '', num: '' }])}
                                            >
                                                Add
                                            </button>
                                        </div>
                                        <div className="py-0 px-3 mb-1 ">
                                            {
                                                financedLeft?.map((z, i) => {
                                                    return (
                                                        <div className="flex gap-2 rounded-xl px-1 responsiveTextInput" key={i}>
                                                            <button onClick={() => setFinancedLeft(financedLeft.filter((z, k) => k !== i))}><MdOutlineClose className="scale-110" /></button>
                                                            <input className={cn('items-center flex-1 min-w-0 outline-none h-6 text-slate-600 bg-transparent',
                                                                z.title === '' ? 'input' : '')} value={z.title}
                                                                onChange={e => handleChangeFinance(e, i, 'left', 'title')} />
                                                            <input className={cn('h-6 text-slate-700 bg-transparent w-full',
                                                                z.num === '' ? 'input text-left' : 'text-right outline-none')}
                                                                value={addComma(z.num)} onChange={e => handleChangeFinance(e, i, 'left', 'num')}
                                                            />

                                                        </div>
                                                    )
                                                })}
                                        </div>

                                        <div className="rounded-md py-0 px-3 mt-2  flex items-center justify-between responsiveTextTotal">
                                            <div className="font-normal text-[var(--endeavour)]">
                                                Total
                                            </div>
                                            <div className="font-normal text-[var(--endeavour)]">
                                                {
                                                    <NumericFormat
                                                        value={Array.isArray(financedLeft) ? financedLeft.reduce((total, obj) => total + (parseFloat(obj.num) || 0), 0) : 0}
                                                        displayType="text"
                                                        thousandSeparator
                                                        allowNegative={true}
                                                        prefix='$'
                                                        decimalScale='2'
                                                        fixedDecimalScale
                                                    />
                                                }
                                            </div>
                                        </div>
                                    </div>
                                }

                            </div>
                        </div>


<div className="w-full flex-1 min-w-[320px] border-l border-[#dedede] pt-0">

                            <div className="p-4  bg-white   mb-0.5 flex flex-col justify-between min-h-[140px] cf-card">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-[var(--endeavour)] responsiveTextTitle">Supplier - Payment</span>
                                </div>
                                <div className="flex p-1 justify-between">
                                    {
                                        supPmntssSortName1 ?
                                            <FaSortAmountDown className="scale-[0.9] text-slate-600 cursor-pointer" onClick={() => sortSupPmntsName(1)} />
                                            :
                                            <FaSortAmountUpAlt className="scale-[0.9] text-slate-600 cursor-pointer" onClick={() => sortSupPmntsName(1)} />}
                                    {
                                        supPmntssSort1 ?
                                            <FaSortAmountDown className="scale-[0.9] text-slate-600 cursor-pointer" onClick={() => sortSupPmnts(1)} />
                                            :
                                            <FaSortAmountUpAlt className="scale-[0.9] text-slate-600 cursor-pointer" onClick={() => sortSupPmnts(1)} />}
                                </div>



                                {supPayments2.map((x, i) => {
                                    return (
                                        <div className="bg-white rounded-xl py-0 px-1 mb-1 border border-[#b8ddf8]" key={i}>
                                            <MyAccordion title={
                                                <div className="flex w-full justify-between leading-4 2xl:leading-6">
                                                    <span className="responsiveText font-normal text-[#545454] items-center flex outline-none whitespace-normal break-words w-full min-w-0"
                                                    >
                                                        {settings.Supplier.Supplier.find(z => z.id === x.supplier)?.nname}
                                                    </span>
                                                    <div className="w-full text-right">
                                                        <NumericFormat
                                                            value={x.blnc}
                                                            displayType="text"
                                                            thousandSeparator
                                                            allowNegative={true}
                                                            prefix={'$'}
                                                            decimalScale='2'
                                                            fixedDecimalScale
                                                            className='responsiveText font-normal text-[#545454]'
                                                        />
                                                    </div>
                                                </div>
                                            }>
                                                {supplierDetails(x.supplier, supPaymentsData.filter(z => z.pmnt * 1 === 0),
                                                    uidCollection, setDateSelect,
                                                    setValueCon, setIsOpenCon, blankInvoice, router, toggleCheckSupplier, toggleCheckSupplierAll,
                                                    toggleSupplier, savePmntSupplier, supplierPartialPayment)}
                                            </MyAccordion>
                                        </div>

                                    )
                                })}
                                <div className=" rounded-md py-0 px-1 mt-2 flex items-center justify-between responsiveTextTotal">
                                    <div className="font-normal text-[var(--endeavour)]">
                                        Total
                                    </div>
                                    <div className="font-normal text-[var(--endeavour)]">
                                        {
                                            <NumericFormat
                                                value={supPayments2?.reduce((total, obj) => {
                                                    return total + (parseFloat(obj.blnc) || 0);
                                                }, 0)}
                                                displayType="text"
                                                thousandSeparator
                                                allowNegative={true}
                                                prefix='$'
                                                decimalScale='2'
                                                fixedDecimalScale
                                                className='responsiveTextTotal font-normal'
                                            />
                                        }
                                    </div>
                                </div>
                            </div>


                            <div className="p-4 bg-white   mb-0.5 flex flex-col justify-between min-h-[140px] cf-card">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="font-normal text-[var(--endeavour)] responsiveTextTitle">Supplier - Balances</span>
                                </div>
                                <div className="flex p-1 justify-between">
                                    {
                                        supPmntssSortName ?
                                            <FaSortAmountDown className="scale-[0.9] text-slate-600 cursor-pointer" onClick={() => sortSupPmntsName(0)} />
                                            :
                                            <FaSortAmountUpAlt className="scale-[0.9] text-slate-600 cursor-pointer" onClick={() => sortSupPmntsName(0)} />}
                                    {
                                        supPmntssSort ?
                                            <FaSortAmountDown className="scale-[0.9] text-slate-600 cursor-pointer" onClick={() => sortSupPmnts(0)} />
                                            :
                                            <FaSortAmountUpAlt className="scale-[0.9] text-slate-600 cursor-pointer" onClick={() => sortSupPmnts(0)} />}
                                </div>



                                {supPayments1.map((x, i) => {
                                    return (
                                        <div className="bg-white rounded-xl py-0 px-1 mb-1 border border-[#b8ddf8]" key={i}>
                                            <MyAccordion title={
                                                <div className="flex w-full justify-between leading-4 2xl:leading-6">
                                                    <span className="responsiveText items-center font-normal text-[#545454] flex outline-none whitespace-normal break-words w-full min-w-0"
                                                    >
                                                        {settings.Supplier.Supplier.find(z => z.id === x.supplier)?.nname}
                                                    </span>
                                                    <div className="w-full text-right">
                                                        <NumericFormat
                                                            value={x.blnc}
                                                            displayType="text"
                                                            thousandSeparator
                                                            allowNegative={true}
                                                            prefix={'$'}
                                                            decimalScale='2'
                                                            fixedDecimalScale
                                                            className='responsiveText font-normal text-[#545454]'
                                                        />
                                                    </div>
                                                </div>
                                            }>
                                                {supplierDetails(x.supplier, supPaymentsData.filter(z => z.pmnt * 1 > 0),
                                                    uidCollection, setDateSelect,
                                                    setValueCon, setIsOpenCon, blankInvoice, router, toggleCheckSupplier, toggleCheckSupplierAll,
                                                    toggleSupplier, savePmntSupplier, supplierPartialPayment)}
                                            </MyAccordion>
                                        </div>
                                    )
                                })}

                                <div className=" rounded-md py-0 px-1 mt-2 flex items-center justify-between responsiveTextTotal">
                                    <div className="font-normal text-[var(--chathams-blue)]">
                                        Total
                                    </div>
                                    <div className="font-normal text-[var(--chathams-blue)]">
                                        {
                                            <NumericFormat
                                                value={supPayments1?.reduce((total, obj) => {
                                                    return total + (parseFloat(obj.blnc) || 0);
                                                }, 0)}
                                                displayType="text"
                                                thousandSeparator
                                                allowNegative={true}
                                                prefix='$'
                                                decimalScale='2'
                                                fixedDecimalScale
                                                className="font-normal text-[var(--endeavour)]"
                                            />
                                        }
                                    </div>
                                </div>
                            </div>

                            <div className="p-4">
                                <span className="font-normal text-[var(--endeavour)] flex items-center responsiveTextTitle">Expenses</span>
                                <div className="flex p-1 justify-between">
                                    {
                                        expensesSortName ?
                                            <FaSortAmountDown className="scale-[0.9] text-slate-600 cursor-pointer" onClick={() => sortExpensesName()} />
                                            :
                                            <FaSortAmountUpAlt className="scale-[0.9] text-slate-600 cursor-pointer" onClick={() => sortExpensesName()} />}
                                    {
                                        expensesSort ?
                                            <FaSortAmountDown className="scale-[0.9] text-slate-600 cursor-pointer" onClick={() => sortExpenses()} />
                                            :
                                            <FaSortAmountUpAlt className="scale-[0.9] text-slate-600 cursor-pointer" onClick={() => sortExpenses()} />}
                                </div>

                                {expenses.map((x, i) => {
                                    return (
                                        <div className="bg-white rounded-xl py-0 px-1 mb-1 border border-[#b8ddf8]" key={i}>
                                            <MyAccordion title={
                                                <div className="flex justify-between leading-4 2xl:leading-6 w-full">
                                                    <div className="responsiveText font-normal text-[#545454] items-center flex outline-none whitespace-normal break-words min-w-0"              >
                                                        {settings.Supplier.Supplier.find(z => z.id === x.supplier)?.nname}
                                                    </div>

                                                    <div className="items-center flex">
                                                        <NumericFormat
                                                            value={x.amount}
                                                            displayType="text"
                                                            thousandSeparator
                                                            allowNegative={true}
                                                            prefix={'$'}
                                                            decimalScale='2'
                                                            fixedDecimalScale
                                                            className='responsiveText font-normal text-[#545454]'
                                                        />
                                                    </div>
                                                </div>
                                            }>
                                                {expensesToolTip(x.supplier, expensesAll, settings, uidCollection, setDateSelect,
                                                    setValueExp, setIsOpen, blankInvoice, router, toggleCheckExp, toggleCheckExpAll,
                                                    toggleExp, savePmntExp)}
                                            </MyAccordion>
                                        </div>

                                    )
                                })}
                                <div className=" rounded-md py-0 px-1 mt-2  flex items-center justify-between responsiveTextTotal">
                                    <div className="font-normal text-[var(--endeavour)]">
                                        Total
                                    </div>
                                    <div className="font-normal text-[var(--endeavour)]">

                                        <NumericFormat
                                            value={expenses?.reduce((total, obj) => {
                                                return total + (parseFloat(obj.amount) || 0);
                                            }, 0)}
                                            displayType="text"
                                            thousandSeparator
                                            allowNegative={true}
                                            prefix='$'
                                            decimalScale='2'
                                            fixedDecimalScale
                                            className="font-normal"
                                        />

                                    </div>
                                </div>
                            </div>

                            <div className="p-4 bg-white   mb-0.5 flex flex-col justify-between min-h-[140px] cf-card">
                                {
                                    userTitle === 'Admin' &&
                                    <div className='mt-10 p-1'>
                                        <div className='flex justify-between'>
                                            <span className="font-normal text-[var(--endeavour)] responsiveTextTitle">Financing</span>
                                            <button
                                                type="button"
                                    className="bg-[var(--endeavour)] border border-[var(--rock-blue)] text-white px-3 py-1 text-xs rounded-full hover:bg-[var(--selago)]/30 transition-all"
                                                onClick={() => setFinancedRight([...financedRight, { title: '', num: '' }])}
                                            >
                                                Add
                                            </button>
                                        </div>
                                        <div className="flex gap-1 mt-1 pt-2 flex-col" >
                                            {
                                                financedRight?.map((z, i) => {
                                                    return (
                                                        <div className="flex gap-2 rounded-xl px-0.5 responsiveTextInput" key={i}>
                                                            <button onClick={() => setFinancedRight(financedRight.filter((z, k) => k !== i))}><MdOutlineClose className="scale-110" /></button>
                                                            <input className={cn('items-center flex-1 min-w-0 outline-none h-6 text-slate-600 bg-transparent',
                                                                z.title === '' ? 'input' : '')}
                                                                value={z.title} onChange={e => handleChangeFinance(e, i, 'right', 'title')} />
                                                            <input className={cn('w-full h-6 text-slate-700 outline-none bg-transparent',
                                                                z.num === '' ? 'input text-left' : 'text-right')}
                                                                value={addComma(z.num)} onChange={e => handleChangeFinance(e, i, 'right', 'num')} />
                                                        </div>
                                                    )
                                                })}
                                        </div>

                                        <div className="rounded-md py-0 px-1 mt-2 flex items-center justify-between responsiveTextTotal">
                                            <div className="font-normal text-[var(--endeavour)]">
                                                Total
                                            </div>
                                            <div className="font-normal text-[var(--endeavour)]">
                                                {
                                                    <NumericFormat
                                                        value={Array.isArray(financedRight) ? financedRight.reduce((total, obj) => total + (parseFloat(obj.num) || 0), 0) : 0}
                                                        displayType="text"
                                                        thousandSeparator
                                                        allowNegative={true}
                                                        prefix='$'
                                                        decimalScale='2'
                                                        fixedDecimalScale
                                                        className="font-normal"
                                                    />
                                                }
                                            </div>
                                        </div>

                                    </div>
                                }

                            </div>

                        </div>
                    </div>

                    {userTitle === 'Admin' && (
                <div className="mt-2 w-full border-2 border-gray-300 rounded-lg p-2">

                    {/* TOTALS AND BALANCE IN ONE ROW */}
                    <div className="grid grid-cols-[2fr_1fr_2fr] gap-1 responsiveTextTotal">
                        
                        <div className="flex justify-between items-center bg-[#d4eafc]  rounded-lg px-4 py-0">
                            <span className="font-normal text-[var(--endeavour)] responsiveTextTitle whitespace-nowrap">
                                Total (Left)
                            </span>
                            <NumericFormat
                                value={totalLeft}
                                displayType="text"
                                thousandSeparator
                                allowNegative
                                prefix="$"
                                decimalScale={2}
                                fixedDecimalScale
                                className="font-normal text-[var(--endeavour)] whitespace-nowrap"
                            />
                        </div>

                        <div className="flex justify-between items-center bg-[var(--chathams-blue)] text-white border-2 border-[var(--chathams-blue)] rounded-lg px-4 py-0 responsiveTextTotal">
                            <span className="font-normal whitespace-nowrap">
                                Balance
                            </span>
                            <NumericFormat
                                value={totalLeft - totalRight}
                                displayType="text"
                                thousandSeparator
                                allowNegative
                                prefix="$"
                                decimalScale={2}
                                fixedDecimalScale
                                className="font-normal whitespace-nowrap"
                            />
                        </div>

                        <div className="flex justify-between items-center bg-[#d4eafc]  rounded-lg px-4 py-0">
                            <span className="font-normal text-[var(--endeavour)] responsiveTextTitle whitespace-nowrap">
                                Total (Right)
                            </span>
                            <NumericFormat
                                value={totalRight}
                                displayType="text"
                                thousandSeparator
                                allowNegative
                                prefix="$"
                                decimalScale={2}
                                fixedDecimalScale
                                className="font-normal text-[var(--endeavour)] whitespace-nowrap"
                            />
                        </div>

                    </div>

                    {/* YEAR TOTAL INPUTS */}
                    <div className="pt-2 pl-2">
                        {yr.map(z => {
                            const key = `total${z}`;
                            return (
                                <div className="flex gap-2 my-2" key={z}>
                                    <span className="responsiveTextInput items-center flex w-28 text-[var(--endeavour)] whitespace-nowrap">Total for {z}</span>
                                    <input
                                        className='input w-44 h-6 responsiveTextTotal font-normal text-[11px]  text-[var(--endeavour)] text-right p-2 bg-[#f9f9f9] border-[#dedede]'
                                        value={addComma(totalYrs.find(obj => obj.hasOwnProperty(key))?.[key] || '')}
                                        onChange={e => handleChange(e, z)}
                                    />
                                </div>
                            )
                        })}
                    </div>

                </div>
            )}

        </div>
)}

        </div>
        </>
        }
        </div>
    </div>
    )
}
export default Cashflow;
