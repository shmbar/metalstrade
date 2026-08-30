'use client';
import Spinner from "../../../components/spinner";
import Toast from "../../../components/toast";
import YearSelect from "./yearSelect";
import { SettingsContext } from "../../../contexts/useSettingsContext";
import { getTtl } from "../../../utils/languages";
import React, { useContext, useEffect, useMemo, useRef, useState } from 'react'
import AutosavePill from "../../../components/AutosavePill";
import Spin from '../../../components/spinTable';
import VideoLoader from '../../../components/videoLoader';
import { CardsSkeleton } from "../../../components/skeletons";
import { loadData, loadDataSettings, loadInvoice, loadMargins, loadSharedStock, loadStockData, loadAllStockData, saveCashflow, saveCashflowFinanced, saveDataSettings, saveMultipleData, saveStockIn, syncSpecialInvoicesPaidStatus, updateClientPayment, updateExpPayments } from "../../../utils/utils";
import { UserAuth } from "../../../contexts/useAuthContext";
import { NumericFormat } from "react-number-format";
import { MdDeleteOutline } from "react-icons/md";
import { MdOutlineClose } from "react-icons/md";
import { addComma, ClientDetails, clientToolTip, entityName, ExpensesToolTip, FinalSummaryBadge, getTotals, getTotalsSupPayments, runExpenses, runInvoices, runStocks, runSupPayments, SharedStockDetails, StocksUnSold, StoclToolTip, SupplierDetails, supplierToolTip } from "./funcs";
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
import ContractModal from "../contracts/modals/dataModal";
import ExpenseModal from "../expenses/modals/dataModal";
import InvPopup from "./invPopup";
import ForecastPanel from "./ForecastPanel";
import SumBasket from "./sumBasket";
import { exportCashflowToExcel } from "./excel";
import KpiStrip from "../../../components/KpiStrip";
import { BtnIcon } from "../../../components/buttonIcons";
import Avatar from "../../../components/Avatar";
import { Boxes, Users, Factory, Wallet, Banknote } from "lucide-react";

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

// Mini-stat section header: 28px brand-soft icon tile + section name, with any
// trailing controls (sort toggles / Add button) passed as children. Style only.
const SectionHeader = ({ icon: Icon, title, className = '', children }) => (
    <div className={`flex items-center justify-between mb-1 rounded-2xl px-1 py-1 hover:bg-[var(--bg-subtle)] transition-colors ${className}`}>
        <div className="flex items-center gap-2 min-w-0">
            <span className="w-7 h-7 rounded-control bg-[var(--brand-soft)] text-[var(--brand)] flex items-center justify-center shrink-0">
                {Icon && <Icon size={15} strokeWidth={1.75} />}
            </span>
            <span className="responsiveTextTitle font-display font-semibold text-[var(--ink)] truncate">{title}</span>
        </div>
        {children ? <div className="flex items-center gap-2 shrink-0">{children}</div> : null}
    </div>
);


const Cashflow = () => {

    const { settings, compData, ln, setLoading, loading, setToast, setDateSelect } = useContext(SettingsContext);
    const { valueCon, setValueCon, isOpenCon, setIsOpenCon } = useContext(ContractsContext);
    const { valueExp, setValueExp, isOpen, setIsOpen } = useContext(ExpensesContext);
    const { blankInvoice } = useContext(InvoiceContext);
    const [invPreview, setInvPreview] = useState(null);
    const [nameQ, setNameQ] = useState('');
    const openInvModal = (z, type) => {
        const supplierName = type === 'supplier'
            ? settings.Supplier?.Supplier?.find(s => s.id === z.supplier)?.nname
            : null;
        const clientName = type === 'client'
            ? settings.Client?.Client?.find(c => c.id === z.client)?.nname
            : null;
        setInvPreview({
            ...z,
            _type: type,
            supplierName: supplierName || z.supplierName || null,
            clientName: clientName || z.clientName || null,
        });
    };
    const currentYear = new Date().getFullYear()
    const settingsLoaded = Object.keys(settings).length > 0;
    const clientCount = settings.Client?.Client?.length || 0;
    const supplierCount = settings.Supplier?.Supplier?.length || 0;
    const stockCount = settings.Stocks?.Stocks?.length || 0;
    // Starts at its final value (last year + this year). It used to start as
    // [currentYear - 1] with a mount effect appending currentYear — which ran the
    // whole Firestore load cascade twice (first pass with the wrong single year).
    const [yr, setYr] = useState([currentYear - 1, currentYear])
    const [incoming, setIncoming] = useState();
    const { uidCollection, userTitle, gisAccount, isAdmin } = UserAuth();
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

    // Party names for the section rows. entityName falls back past a missing
    // short name and labels an id that no longer resolves, so no row can render
    // as a nameless dot.
    const supName = (id) => entityName(settings?.Supplier?.Supplier, id, 'supplier');
    const cliName = (id) => entityName(settings?.Client?.Client, id, 'client');
    const whName = (id) => entityName(settings?.Stocks?.Stocks, id, 'warehouse');

    /* Rows across all eight sections key off either x.client or x.supplier, so one
       resolver covers them. Returns the array untouched when the box is empty, so an
       unused search costs nothing. */
    const rowName = (x) =>
        x?.supplierName ||
        (x?.client ? cliName(x.client) : '') ||
        (x?.supplier ? supName(x.supplier) : '') ||
        (x?.stock ? whName(x.stock) : '') || '';
    const byName = (arr) => {
        const t = nameQ.trim().toLowerCase();
        if (!t) return arr || [];
        return (arr || []).filter(x => rowName(x).toLowerCase().includes(t));
    };

    const [stocksSort, setStocksSort] = useState(true)
    const [stocksSort1, setStocksSort1] = useState(true)
    const [stocksSort2, setStocksSort2] = useState(true)
    const [stocksSortName, setStocksSortName] = useState(false)
    const [stocksSortName1, setStocksSortName1] = useState(false)
    const [stocksSortName2, setStocksSortName2] = useState(false)

    const [clientsData, setClientsData] = useState([])
    // Mirrors clientsData synchronously. savePmntClient is called once per client
    // inside a single autosave commit; reading/writing state through this ref means
    // iteration N+1 sees the rows iteration N already removed, instead of recomputing
    // from a stale render value and putting them back.
    const clientsDataRef = useRef(clientsData);
    clientsDataRef.current = clientsData;
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

    // Running-sum basket — a scratch tally of any invoices ticked across sections.
    // Keyed by composite key; pure UI state, never written to Firestore.
    const [sumSel, setSumSel] = useState({})
    const toggleSum = (item) => {
        setSumSel(prev => {
            const next = { ...prev };
            if (next[item.key]) delete next[item.key];
            else next[item.key] = item;
            return next;
        });
    };
    const removeSum = (key) => setSumSel(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
    });
    const clearSum = () => setSumSel({});


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

        if (!uidCollection) return;
        loadData()

    }, [yr, uidCollection])


    useEffect(() => {

        const Load = async () => {
            setLoading(true)

            // All independent Firestore reads start in parallel; each processing step
            // below awaits only what it needs. Raw invoices are loaded ONCE and shared
            // by runInvoices + runSupPayments (each used to download them separately).
            const marginsPromise = Promise.all(yr.map(year => loadMargins(uidCollection, year)));
            const contractsPromise = Promise.all(
                yr.map(year =>
                    loadData(uidCollection, 'contracts', {
                        start: `${year}-01-01`,
                        end: `${year}-12-31`,
                    })
                )
            ).then(perYear => perYear.flat());
            const rawInvoicesPromise = Promise.all(
                yr.map(year =>
                    loadData(uidCollection, 'invoices', {
                        start: `${year}-01-01`,
                        end: `${year}-12-31`,
                    })
                )
            ).then(perYear => [].concat(...perYear));
            const expensesPromise = runExpenses(uidCollection, settings, yr);
            // Start the stocks download NOW (it does not depend on contracts) — only the
            // netting inside runStocks needs the contract list.
            const stocksDataPromise = loadAllStockData(uidCollection);
            const stocksPromise = contractsPromise.then(cd => runStocks(uidCollection, settings, yr, cd, stocksDataPromise));

            const marginsPerYear = await marginsPromise;
            const tmp = marginsPerYear.reduce((total, dt) =>
                total + dt.filter(item => !isNaN(item.remaining))
                    .reduce((acc, item) => acc + (parseFloat(item.remaining) || 0), 0)
            , 0);
            setIncoming(tmp);

            let contractsData = await contractsPromise;
            const rawInvoices = await rawInvoicesPromise;

            //load stocks
            let dataStock = await stocksPromise
            dataStock.result = dataStock.result.map(z => ({ ...z, stockName: settings.Stocks.Stocks.find(k => k.id === z.stock)?.stock }))
            dataStock.result1 = dataStock.result1.map(z => ({ ...z, stockName: settings.Stocks.Stocks.find(k => k.id === z.stock)?.stock }))
            setStockData1(dataStock.result.sort((a, b) => b.total - a.total))
            setStockData2(dataStock.result1.sort((a, b) => b.total - a.total))
            setStockDataAll(dataStock.stocksArrWithPayment)
            setStockDataNoPayment(dataStock.stocksArrNoPayment)
            setStockDataNoSold(dataStock.unSoldArrTitles)
            setStockDataAllArray(dataStock.unSoldAll)

            //load invoices (from the shared raw rows — no second download)
            let invoices = await runInvoices(uidCollection, settings, yr, rawInvoices)
            invoices = invoices.map(z => ({ ...z, clientName: settings.Client.Client.find(k => k.id === z.client)?.nname, checked: false }))
            setClientsData(invoices)
            setClientInvoices1(getTotals(invoices.filter(z => z.payments.length > 0)))
            setClientInvoices2(getTotals(invoices.filter(z => z.payments.length === 0)))

            // Shipment-finalized status lives only on the sales invoice, but the
            // supplier balances below need the same flag so both sides agree on
            // whether a balance is before/after the final invoice. Finalized =
            // manual Finalizing flag OR the invoice being a Final Note (issuing
            // the final note IS the finalization). Map it per contract
            // (invoice.poSupplier.id === contract.id); 'Yes' always wins if any
            // linked invoice for the contract is finalized.
            const finOf = (inv) => (inv.shipData?.fnlzing === '4568'
                || inv.invType === '3333' || inv.invType === 'Final Note') ? '4568' : inv.shipData?.fnlzing;
            const fnlzingByContract = {};
            for (const inv of invoices) {
                const cid = inv.poSupplier?.id;
                if (!cid) continue;
                const f = finOf(inv);
                if (f === '4568' || !(cid in fnlzingByContract)) {
                    fnlzingByContract[cid] = f;
                }
            }

            //load payments to Suppliers (same shared raw invoices for the ETD/ETA map)
            let supPayments = await runSupPayments(uidCollection, settings, yr, contractsData, rawInvoices)
            supPayments = supPayments.map(z => ({ ...z, suplierName: settings.Supplier.Supplier.find(a => a.id === z.supplier)?.nname, checked: false, fnlzing: fnlzingByContract[z.orderData?.id] }))
            setsupPaymentsData(supPayments)
            setSupPayments1(getTotalsSupPayments(supPayments.filter(z => z.pmnt * 1 > 0)))
            setSupPayments2(getTotalsSupPayments(supPayments.filter(z => parseFloat(z.pmnt) === 0)))


            //Expenses (already loading since the top of Load)
            let expenses = await expensesPromise
            expenses.totalBySupplier = expenses.totalBySupplier.map(z => ({
                ...z, suplierName: settings.Supplier.Supplier.find(a => a.id === z.supplier)?.nname
            }))
            setExpenses(expenses.totalBySupplier.sort((a, b) => b.amount - a.amount))
            setExpensesAll(expenses.dt.map(x => ({ ...x, checked: false })))

            setLoading(false)
        }

        if (!uidCollection || !settingsLoaded) return;
        Load();

    }, [yr, settingsLoaded, clientCount, supplierCount, stockCount, uidCollection])

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

        let newArr = [...initialData, { title: 'New item', num: 0 }]
        setInitialData(newArr)
    }

    const delItem = async (i) => {

        const updatedData = initialData.filter((item, index) => index !== i);
        setInitialData(updatedData)

    }

    const saveInitData = async () => {

        try {
            for (let year of yr) {
                const key = `total${year}`;
                const val = totalYrs.find(obj => obj.hasOwnProperty(key))?.[key];
                if (val === undefined) continue;
                await saveCashflow(uidCollection, year, { [key]: val })
            }
        } catch (err) {
            console.error('saveCashflow totals failed', err)
        }

        try {
            await saveCashflowFinanced(uidCollection,
                {
                    initial: initialData,
                    financedLeft, financedRight,
                }
            )
            setToast({ show: true, text: 'Data successfully saved!', clr: 'success' })
        } catch (err) {
            console.error('saveCashflowFinanced failed', err)
            setToast({ show: true, text: 'Save failed!', clr: 'fail' })
        }
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

        let tmpArr = clientsDataRef.current.filter(x => x.client === clientId && x.checked)
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

        const savedIds = tmpArr.map(x => x.id)
        let newArr = clientsDataRef.current.filter(z => !savedIds.includes(z.id))
        clientsDataRef.current = newArr
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

    // Stock lots carry a SNAPSHOT of their contract's poInvoices (taken when the
    // breakdown was saved). The contract-modal payment path refreshes it, but the
    // cashflow payment paths didn't — so invoices paid HERE left their stock stuck
    // in "Stocks - UnPaid" forever (the ELG 010726 case). Refresh after any
    // cashflow supplier payment.
    const syncStockPoInvoices = async (contracts) => {
        await Promise.all((contracts || []).map(async (c) => {
            if (!Array.isArray(c.stock) || c.stock.length === 0) return;
            try {
                const lots = await loadStockData(uidCollection, 'id', c.stock);
                if (lots.length) await saveStockIn(uidCollection, lots.map(l => ({ ...l, poInvoices: c.poInvoices })));
            } catch (e) { console.warn('stock poInvoices sync failed:', e?.message || e); }
        }));
    };

    const savePmntSupplier = async (arr) => {

        let arr1 = arr.filter(x => x.checked)
        let tmpArr = []
        let dt = dateFormat(new Date(), 'yyyy-mm-dd')

        // Group ticked payments by CONTRACT and apply them all to one loaded doc.
        // The old loop loaded the contract fresh per invoice and batched N copies
        // of the same document — last write won, so ticking several invoices of
        // one PO saved only one of them per click ("press the diskette N times").
        const byContract = new Map();
        arr1.forEach(p => {
            const key = p.orderData?.id;
            if (!key) return;
            if (!byContract.has(key)) byContract.set(key, { orderData: p.orderData, ids: new Set() });
            byContract.get(key).ids.add(p.id);
        });

        for (const { orderData, ids } of byContract.values()) {

            let inv = await loadInvoice(uidCollection, 'contracts', orderData)

            let updatedpoInvoices = inv.poInvoices.map(x => {
                if (!ids.has(x.id)) return x;

                //in case there is no payments
                let tmp = x.payments ? x.payments :
                    parseFloat(x.pmnt) > 0 ?
                        [{
                            pmntId: uuidv4(), pmntDate: null, pmntPerc: ((parseFloat(x.pmnt) / parseFloat(x.invValue) * 100)).toFixed(1),
                            pmnt: x.pmnt,
                        }] : []

                return {
                    ...x, pmnt: x.invValue, blnc: 0,
                    payments: [...tmp, {
                        pmntId: uuidv4(),
                        pmntDate: { endDate: dt, startDate: dt },
                        pmntPerc: parseFloat((parseFloat(x.blnc) * 100 / parseFloat(x.invValue)).toFixed(1)),
                        pmnt: x.blnc
                    }]
                };
            })

            inv.poInvoices = [...updatedpoInvoices]
            tmpArr.push(inv)
        }

        let success = await saveMultipleData(uidCollection, 'contracts', tmpArr)
        await Promise.all(tmpArr.map(c => syncSpecialInvoicesPaidStatus(uidCollection, c)))
        await syncStockPoInvoices(tmpArr)
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

        const { ok, marked, unplaceable } = await updateExpPayments(uidCollection, arr1)

        // Never say "saved" for a record that was not saved — this row reappearing
        // on the next load, after a success message, is exactly how an unmarked
        // expense went unnoticed for weeks.
        setToast(ok
            ? { show: true, text: getTtl('Payments successfully saved!', ln), clr: 'success' }
            : { show: true, clr: 'fail', text: `Marked ${marked} paid, but could not find: ${unplaceable.join(', ')}` })

        // Only clear the rows that actually got marked; anything unplaceable stays
        // on screen rather than vanishing until the next reload brings it back.
        const failed = new Set(arr1.filter(x => unplaceable.includes(x.expense || x.id)).map(x => x.id))
        setExpensesAll(expensesAll.filter(z => !arr1.map(x => x.id).includes(z.id) || failed.has(z.id)))

    }

    // ── Autosave for ticked payments (floating pill) ─────────────────────────
    // Ticking a checkbox here marks money as PAID, so committing silently would be
    // dangerous — instead, ticks auto-commit after a visible countdown with Cancel /
    // Save now, shown in a floating pill that's visible anywhere on the page (the
    // section save icons still work as before). Expenses and suppliers commit in one
    // batch each; client groups commit one client per cycle (their save routine
    // refreshes state per client), and the pill simply re-arms for the rest.
    const [autoSaving, setAutoSaving] = useState(false);
    const [savedFlash, setSavedFlash] = useState(false);
    const [autoCancelled, setAutoCancelled] = useState(false);
    const [countdown, setCountdown] = useState(6);
    const countdownRef = useRef(6);

    // Shared Stock (IMS + GIS) — the joint pool, shown as its own cashflow card.
    // Informational: the pool has no purchase invoices, so it joins no
    // paid/unpaid totals; the card shows value + who finances it.
    const [sharedStock, setSharedStock] = useState([]);
    useEffect(() => {
        if (!uidCollection) return;
        loadSharedStock()
            .then(d => setSharedStock((d || []).filter(Boolean)))
            .catch(() => setSharedStock([]));
    }, [uidCollection]);

    const pendingChecked = useMemo(() => {
        const clients = clientsData.filter(x => x.checked);
        const sups = supPaymentsData.filter(x => x.checked);
        const exps = expensesAll.filter(x => x.checked);
        return {
            clients, sups, exps,
            total: clients.length + sups.length + exps.length,
            sig: [...clients.map(x => 'c' + x.id), ...sups.map(x => 's' + x.id), ...exps.map(x => 'e' + x.id)].sort().join('|'),
        };
    }, [clientsData, supPaymentsData, expensesAll]);

    // Re-entrancy guard. autoSaving is React state, so two calls made before the
    // re-render both read it as false and both commit — which is exactly what the
    // timer used to do. A ref flips synchronously, so the second call bails.
    const committingRef = useRef(false);

    // Refreshed every render so the commit always uses the current save closures.
    const commitRef = useRef(null);
    commitRef.current = async () => {
        if (committingRef.current || pendingChecked.total === 0) return;
        committingRef.current = true;
        setAutoSaving(true);
        try {
            if (pendingChecked.exps.length) await savePmntExp(expensesAll);
            if (pendingChecked.sups.length) await savePmntSupplier(supPaymentsData);
            // EVERY pending client group, always. Saving one group per countdown used
            // to dribble the rest out over 6s cycles each, and anything still pending
            // when the user left the page was lost. savePmntClient chains through
            // clientsDataRef, so the groups no longer overwrite each other's removals.
            const clientIds = [...new Set(pendingChecked.clients.map(x => x.client))];
            for (const cid of clientIds) await savePmntClient(cid);
            setSavedFlash(true);
            setTimeout(() => setSavedFlash(false), 2500);
        } catch (e) {
            // Without this, a failed save vanished silently, the pill even said
            // "saved", and the countdown re-fired every second into the same
            // failure. Keep the ticks, stop the loop, tell the user.
            setToast({ show: true, text: `Autosave failed — payments NOT saved yet. Press "Save now" to retry. (${e?.message || e})`, clr: 'fail' });
            setAutoCancelled(true);
            countdownRef.current = 6;
            setCountdown(6);
        } finally {
            committingRef.current = false;
            setAutoSaving(false);
        }
    };

    // Ticks live only in memory until the countdown commits — leaving the page
    // inside that window silently lost them ("autosave not always working").
    // Three guards: commit immediately when the tab goes hidden (background
    // timers are throttled, so the countdown may never finish there), flush on
    // unmount (in-app navigation), and warn before a hard close.
    const pendingRef = useRef(pendingChecked); pendingRef.current = pendingChecked;
    const cancelledRef = useRef(autoCancelled); cancelledRef.current = autoCancelled;
    const savingRef = useRef(autoSaving); savingRef.current = autoSaving;
    useEffect(() => {
        const flush = () => {
            if (pendingRef.current.total > 0 && !cancelledRef.current && !savingRef.current) commitRef.current?.();
        };
        const onVis = () => { if (document.visibilityState === 'hidden') flush(); };
        const warn = (e) => {
            if (pendingRef.current.total > 0 && !cancelledRef.current) { e.preventDefault(); e.returnValue = ''; }
        };
        document.addEventListener('visibilitychange', onVis);
        window.addEventListener('beforeunload', warn);
        return () => {
            document.removeEventListener('visibilitychange', onVis);
            window.removeEventListener('beforeunload', warn);
            // Unmount = in-app navigation away from Cashflow — final flush, every group.
            if (pendingRef.current.total > 0 && !cancelledRef.current) {
                commitRef.current?.();
            }
        };
    }, []);

    // Ticking again un-pauses; the timer effect below owns the countdown itself.
    useEffect(() => {
        setAutoCancelled(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pendingChecked.sig]);

    useEffect(() => {
        if (!pendingChecked.sig || autoCancelled || autoSaving) return;
        countdownRef.current = 6;
        setCountdown(6);
        // The commit fires from the interval callback, not from inside a setState
        // updater: React is free to invoke an updater more than once, and when it did,
        // two commits ran concurrently and wrote the same payment twice.
        const t = setInterval(() => {
            const next = countdownRef.current - 1;
            countdownRef.current = next;
            setCountdown(next);
            if (next <= 0) { clearInterval(t); commitRef.current?.(); }
        }, 1000);
        return () => clearInterval(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pendingChecked.sig, autoCancelled, autoSaving]);

    // "Close balance" on an overpaid purchase invoice: records a balancing
    // settlement-adjustment entry (a negative payment equal to the residual) so
    // the balance lands on exactly 0 and the row leaves the cashflow. Per-invoice
    // and reversible — the entry shows as a payment line in the contract popup
    // and can be deleted there to bring the balance back.
    const supplierCloseBalance = async (item) => {
        const residual = parseFloat(item.blnc) || 0;
        if (residual === 0) return;
        const dt = dateFormat(new Date(), 'yyyy-mm-dd');

        let inv = await loadInvoice(uidCollection, 'contracts', item.orderData);
        // Reading the contract can come back empty (a deleted contract whose row is
        // still on screen from a stale load). Say so — this used to throw on the
        // next line and leave the click looking like it did nothing at all.
        if (!inv?.poInvoices) {
            setToast({
                show: true, clr: 'fail',
                text: `Contract for PO ${item.order || ''} could not be read — reload the page; if the row is still here, the contract it belongs to no longer exists`,
            });
            return;
        }
        let updatedpoInvoices = inv.poInvoices.map(x => {
            if (x.id !== item.id) return x;
            const tmp = x.payments ? x.payments :
                parseFloat(x.pmnt) > 0 ?
                    [{
                        pmntId: uuidv4(), pmntDate: null, pmntPerc: ((parseFloat(x.pmnt) / parseFloat(x.invValue) * 100)).toFixed(1),
                        pmnt: x.pmnt,
                    }] : [];
            const adj = parseFloat(x.blnc) || 0; // the live residual on the stored doc
            return {
                ...x, pmnt: parseFloat(x.pmnt) + adj, blnc: 0,
                payments: [...tmp, {
                    pmntId: uuidv4(),
                    pmntDate: { endDate: dt, startDate: dt },
                    pmntPerc: parseFloat(((adj * 100) / parseFloat(x.invValue)).toFixed(1)),
                    pmnt: adj,
                    adjustment: 'closeBalance',
                }],
            };
        });
        inv.poInvoices = [...updatedpoInvoices];

        await saveMultipleData(uidCollection, 'contracts', [inv]);
        await syncSpecialInvoicesPaidStatus(uidCollection, inv);
        await syncStockPoInvoices([inv]);

        const newArr = supPaymentsData.filter(x => x.id !== item.id);
        setsupPaymentsData(newArr);
        setSupPayments1(getTotalsSupPayments(newArr.filter(z => z.blnc * 1 > 0)));
        setSupPayments2(getTotalsSupPayments(newArr.filter(z => parseFloat(z.pmnt) === 0)));
        setToast({ show: true, text: `Balance of invoice ${item.invoice} closed (settlement adjustment recorded)`, clr: 'success' });
    };

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
        await syncSpecialInvoicesPaidStatus(uidCollection, inv)
        await syncStockPoInvoices([inv])

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

    // Export the current cashflow view to Excel (one worksheet per section). Builds
    // rows from the same state arrays the page renders, resolving entity names via
    // settings so the file reads like the on-screen lists.
    const handleExportCashflow = () => {
        const stocksS = settings.Stocks?.Stocks || [];
        const clientsS = settings.Client?.Client || [];
        const suppliersS = settings.Supplier?.Supplier || [];
        // Same labelling as the on-screen rows — an export row with a blank name
        // and a real amount is worse than one that names what could not be resolved.
        const nameOf = (arr, id) => entityName(arr, id, arr === stocksS ? 'warehouse' : arr === clientsS ? 'client' : 'supplier');
        const curOf = (cur) => cur === 'us' ? 'USD' : cur === 'eu' ? 'EUR' : (cur || '');

        if (activeTab === 'unsold') {
            exportCashflowToExcel({
                fileName: `cashflow-unsold-stocks-${yr}.xlsx`,
                sections: [{
                    name: 'Unsold Stocks',
                    rows: stockDataNoSold.map(x => ({
                        name: x.supplierName || nameOf(suppliersS, x.supplier),
                        currency: curOf(x.cur), amount: x.total,
                    })),
                }],
            });
            return;
        }

        exportCashflowToExcel({
            fileName: `cashflow-${yr}.xlsx`,
            sections: [
                { name: 'Stocks - Paid', rows: stockData1.map(x => ({ name: nameOf(stocksS, x.stock), currency: curOf(x.cur), amount: x.total })) },
                { name: 'Stocks - UnPaid', rows: stockData2.map(x => ({ name: nameOf(stocksS, x.stock), currency: curOf(x.cur), amount: x.total })) },
                { name: 'Clients - Payment', rows: clientInvoices2.map(x => ({ name: nameOf(clientsS, x.client), currency: curOf(x.cur), amount: x.debtBlnc })) },
                { name: 'Clients - Balances', rows: clientInvoices1.map(x => ({ name: nameOf(clientsS, x.client), currency: curOf(x.cur), amount: x.debtBlnc })) },
                { name: 'Supplier - Payment', rows: supPayments2.map(x => ({ name: nameOf(suppliersS, x.supplier), currency: curOf(x.cur), amount: x.blnc })) },
                { name: 'Supplier - Balances', rows: supPayments1.map(x => ({ name: nameOf(suppliersS, x.supplier), currency: curOf(x.cur), amount: x.blnc })) },
                { name: 'Expenses', rows: expenses.map(x => ({ name: nameOf(suppliersS, x.supplier), currency: curOf(x.cur), amount: x.amount })) },
            ],
        });
    };

    // KPI summary — pure reuse of the same aggregates the section totals below
    // already render (no new computation beyond re-running the identical reduces).
    const clientsDueKpi = [...clientInvoices1, ...clientInvoices2].reduce((t, o) => t + (parseFloat(o.debtBlnc) || 0), 0);
    const suppliersDueKpi = [...(supPayments1 || []), ...(supPayments2 || [])].reduce((t, o) => t + (parseFloat(o.blnc) || 0), 0);
    const expensesKpi = (expenses || []).reduce((t, o) => t + (parseFloat(o.amount) || 0), 0);
    const fmtUsd = (n) => '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const kpiItems = [
        ...(isAdmin ? [{
            label: 'Total Balance',
            value: (totalLeft || 0) - (totalRight || 0),
            format: fmtUsd, icon: Banknote,
            tone: ((totalLeft || 0) - (totalRight || 0)) >= 0 ? 'green' : 'red',
            sub: 'Left − right totals',
        }] : []),
        { label: 'Clients due', value: clientsDueKpi, format: fmtUsd, icon: Users, tone: 'blue' },
        { label: 'Suppliers due', value: suppliersDueKpi, format: fmtUsd, icon: Factory, tone: 'amber' },
        { label: 'Expenses', value: expensesKpi, format: fmtUsd, icon: Wallet, tone: 'red' },
    ];

    return (
        <div className="w-full" style={{ background: "var(--bg-page)" }}>
            <div className="cf-uniform mx-auto max-w-full px-1 md:px-2 pb-4 mt-[72px]">
                {Object.keys(settings).length === 0 ? <CardsSkeleton /> :
                    <>
                        <Toast />
                        <AutosavePill
                            mode={autoSaving ? 'saving' : (pendingChecked.total > 0 && !autoCancelled) ? 'pending' : (pendingChecked.total > 0 && autoCancelled) ? 'paused' : savedFlash ? 'saved' : null}
                            text={autoSaving ? 'Saving payments…'
                                : (pendingChecked.total > 0 && !autoCancelled) ? `Recording ${pendingChecked.total} payment${pendingChecked.total > 1 ? 's' : ''}`
                                    : (pendingChecked.total > 0 && autoCancelled) ? `Autosave paused — ${pendingChecked.total} payment${pendingChecked.total > 1 ? 's' : ''} pending`
                                        : 'Payments saved'}
                            countdown={countdown}
                            onSaveNow={() => commitRef.current?.()}
                            onCancel={() => setAutoCancelled(true)}
                        />
                        <VideoLoader loading={loading} fullScreen={true} />
                        <div className="page-card rounded-2xl p-3 sm:p-5 mt-8 border border-[var(--line)] shadow-card w-full bg-[var(--bg-card)]">
                            <div className='flex items-center justify-between flex-wrap gap-2 pb-2'>
                                <div>
                                    <h1 className="text-display">{getTtl('Cashflow', ln)}</h1>
                                    <p className="responsiveTextInput text-[var(--ink-muted)] mt-0.5">Cash position across stocks, clients, suppliers & expenses</p>
                                </div>
                                <div className="flex items-center gap-2 group">
                                    {/* A find tool, not a scope: totalLeft/totalRight are computed from the
                                        full period and deliberately do NOT move with this box, so the cash
                                        position stays honest while you look someone up. Said out loud below,
                                        because "filter" would otherwise imply the totals had narrowed too. */}
                                    <input
                                        value={nameQ}
                                        onChange={(e) => setNameQ(e.target.value)}
                                        placeholder="Find a client, supplier or stock"
                                        className="input h-8"
                                        style={{ width: 210 }}
                                    />
                                    {nameQ.trim() && (
                                        <span className="responsiveTextTable text-[var(--ink-muted)] whitespace-nowrap">
                                            rows only — totals cover the full period
                                        </span>
                                    )}
                                    <Tltip direction='bottom' tltpText='Export the current cashflow tables to Excel'>
                                        <button
                                            type="button"
                                            onClick={handleExportCashflow}
                                            className="whiteButton"
                                        >
                                            <BtnIcon action="export" /> Export
                                        </button>
                                    </Tltip>
                                    <YearSelect yr={yr} setYr={setYr} />
                                </div>
                            </div>

                            {/* AI Cash Forecast Panel */}
                            <ForecastPanel />

                            {/* Tabs */}
                            <div className="inline-flex gap-1 mb-2 bg-[var(--bg-subtle)] border border-[var(--line)] rounded-lg p-0.5">
                                <button
                                    onClick={() => setActiveTab('general')}
                                    className={`px-4 py-1 responsiveTextInput rounded-lg transition-all ${activeTab === 'general' ? 'bg-[var(--bg-card)] text-[var(--ink)] font-medium shadow-card' : 'text-[var(--ink-secondary)]'}`}
                                >
                                    General Cashflow
                                </button>
                                <button
                                    onClick={() => setActiveTab('unsold')}
                                    className={`px-4 py-1 responsiveTextInput rounded-lg transition-all ${activeTab === 'unsold' ? 'bg-[var(--bg-card)] text-[var(--ink)] font-medium shadow-card' : 'text-[var(--ink-secondary)]'}`}
                                >
                                    Unsold Stocks
                                </button>
                            </div>

                            {/* KPI summary strip (same values as the section totals below) */}
                            {activeTab === 'general' && <KpiStrip items={kpiItems} />}

                            {activeTab === 'unsold' ? (
                                <div className="w-full max-w-2xl border border-[var(--line)] rounded-2xl overflow-hidden bg-[var(--bg-card)] p-4">
                                    <SectionHeader icon={Boxes} title="Unsold Stocks" className="mb-2">
                                        {stocksSortName2 ?
                                            <FaSortAmountDown className="scale-[0.9] text-[var(--ink-muted)] hover:text-[var(--ink)] cursor-pointer" onClick={() => sortStocksName2()} />
                                            :
                                            <FaSortAmountUpAlt className="scale-[0.9] text-[var(--ink-muted)] hover:text-[var(--ink)] cursor-pointer" onClick={() => sortStocksName2()} />}
                                        {stocksSort2 ?
                                            <FaSortAmountDown className="scale-[0.9] text-[var(--ink-muted)] hover:text-[var(--ink)] cursor-pointer" onClick={() => sortStocks2()} />
                                            :
                                            <FaSortAmountUpAlt className="scale-[0.9] text-[var(--ink-muted)] hover:text-[var(--ink)] cursor-pointer" onClick={() => sortStocks2()} />}
                                    </SectionHeader>
                                    {stockDataNoSold.length === 0 ? (
                                        <div className="text-[var(--ink-muted)] responsiveText py-4 text-center">No unsold stocks</div>
                                    ) : (
                                        <>
                                            {byName(stockDataNoSold).map((x, i) => (
                                                <div className="bg-[var(--bg-card)] py-0.5 px-0 rounded-2xl hover:bg-[var(--bg-subtle)] transition-colors" key={i}>
                                                    <MyAccordion title={
                                                        <div className="flex w-full justify-between">
                                                            <div className="responsiveText font-medium text-[var(--ink)] items-center flex gap-1.5 outline-none whitespace-normal break-words min-w-0">
                                                                <Avatar name={x.supplierName} size={18} />
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
                                                                    className='responsiveText text-[var(--ink)] tabular-nums'
                                                                />
                                                            </div>
                                                        </div>
                                                    }>
                                                        <StocksUnSold supplier={x.supplier} stockDataAllArray={stockDataAllArray} settings={settings} uidCollection={uidCollection} setDateSelect={setDateSelect} setValueCon={setValueCon} setIsOpenCon={setIsOpenCon} blankInvoice={blankInvoice} router={router} sumSel={sumSel} toggleSum={toggleSum} />
                                                    </MyAccordion>
                                                </div>
                                            ))}

                                            <div className="rounded-lg py-1 px-0 mt-1 flex items-center justify-between">
                                                <div className="responsiveTextTotal text-[var(--ink)] font-medium border-t border-[var(--line-strong)] pt-0.5">Total</div>
                                                <NumericFormat
                                                    value={stockDataNoSold.reduce((sum, item) => sum + (parseFloat(item.total) || 0), 0)}
                                                    displayType="text"
                                                    thousandSeparator
                                                    allowNegative={true}
                                                    prefix={'$'}
                                                    decimalScale='2'
                                                    fixedDecimalScale
                                                    className='responsiveTextTotal text-[var(--ink)] font-medium border-t border-[var(--line-strong)] pt-0.5'
                                                />
                                            </div>
                                        </>
                                    )}
                                </div>
                            ) : (
                                <>
                                    {/* Opening balances. This strip used to be the one place on the page
                                        running its own type: 600-weight labels (the section-header weight)
                                        over 400-weight figures, which is the inverse of every other row
                                        here and is why "Future" and the account names read as a different
                                        typeface. Labels sit at 500 like every other row label; figures
                                        take .tnum, which supplies 500 + tabular-nums from the token layer.
                                        It also floated on the page background with no surface — it now
                                        carries the same card as the sections below it. */}
                                    {isAdmin &&
                                        <div className="w-full border border-[var(--line)] rounded-2xl bg-[var(--bg-card)] p-2 mb-2">
                                            <div className="flex gap-2 items-center">
                                                <span className="responsiveText font-medium items-center flex w-44 text-[var(--ink)]">Future</span>
                                                <label className="pl-1">{
                                                    <NumericFormat
                                                        value={incoming}
                                                        displayType="text"
                                                        thousandSeparator
                                                        allowNegative={true}
                                                        prefix={'$'}
                                                        decimalScale='2'
                                                        fixedDecimalScale
                                                        className='responsiveText tnum text-[var(--ink)]'
                                                    />
                                                }</label>
                                            </div>
                                            {
                                                initialData?.map((z, i) => {
                                                    return (
                                                        <div className="flex gap-2 my-1 items-center" key={i}>
                                                            <input className="responsiveText font-medium items-center flex outline-none w-44 truncate bg-transparent text-[var(--ink)]" value={z.title}
                                                                onChange={e => handleChangeInitial(e, i, 'title')} />
                                                            <NumericFormat className='input w-44 responsiveText tnum font-medium text-[var(--ink)]'
                                                                value={z.num} thousandSeparator allowNegative={false} decimalScale={2} fixedDecimalScale prefix='$'
                                                                onValueChange={values => handleChangeInitial({ target: { value: values.value } }, i, 'num')} />
                                                            <button onClick={() => delItem(i)} className="text-red-500 px-2 h-8 rounded-lg hover:bg-red-50 transition-all"><MdDeleteOutline className="scale-110" /></button>
                                                        </div>
                                                    )
                                                })}
                                            {/* Left-aligned on purpose (client, 31 Aug 2026): these were briefly
                                                moved under the amount column and the client asked for them back
                                                where they were. Leave them at the card's left edge. */}
                                            <div className="flex gap-2 my-1">
                                                <Tltip direction='bottom' tltpText='Save added data'>
                                                    <button type="button" className="blackButton" onClick={saveInitData}><BtnIcon action="save" />Save</button>
                                                </Tltip>
                                                <Tltip direction='bottom' tltpText='Add new item'>
                                                    <button type="button" className="whiteButton" onClick={addItem}><BtnIcon action="add" />Add</button>
                                                </Tltip>
                                            </div>
                                        </div>

                                    }
                                    <div className="w-full border border-[var(--line)] rounded-2xl overflow-hidden bg-[var(--bg-card)]">
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 w-full">
                                            <div className="w-full">
                                                <div className="p-2 bg-[var(--bg-card)] mb-3 flex flex-col cf-card">
                                                    <SectionHeader icon={Boxes} title="Stocks - Paid">
                                                        {stocksSortName ? <FaSortAmountDown className="scale-[0.9] text-[var(--ink-muted)] hover:text-[var(--ink)] cursor-pointer" onClick={() => sortStocksName()} /> : <FaSortAmountUpAlt className="scale-[0.9] text-[var(--ink-muted)] hover:text-[var(--ink)] cursor-pointer" onClick={() => sortStocksName()} />}
                                                        {stocksSort ? <FaSortAmountDown className="scale-[0.9] text-[var(--ink-muted)] hover:text-[var(--ink)] cursor-pointer" onClick={() => sortStocks()} /> : <FaSortAmountUpAlt className="scale-[0.9] text-[var(--ink-muted)] hover:text-[var(--ink)] cursor-pointer" onClick={() => sortStocks()} />}
                                                    </SectionHeader>
                                                    {byName(stockData1).map((x, i) => {
                                                        return (
                                                            <div className="bg-[var(--bg-card)] py-0.5 px-0 rounded-2xl hover:bg-[var(--bg-subtle)] transition-colors" key={i}>
                                                                <MyAccordion title={
                                                                    <div className="flex w-full justify-between">
                                                                        <div className="responsiveText items-center font-medium text-[var(--ink)] flex gap-1.5 outline-none whitespace-normal break-words min-w-0"
                                                                        >
                                                                            <Avatar name={whName(x.stock)} size={18} />
                                                                            {whName(x.stock)}
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
                                                                                className='responsiveText text-[var(--ink)] tabular-nums'
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                }>

                                                                    <StoclToolTip stock={x.stock} stockDataAll={stockDataAll} settings={settings} uidCollection={uidCollection} setDateSelect={setDateSelect} setValueCon={setValueCon} setIsOpenCon={setIsOpenCon} blankInvoice={blankInvoice} router={router} sumSel={sumSel} toggleSum={toggleSum} />
                                                                </MyAccordion>


                                                            </div>

                                                        )
                                                    })}
                                                    <div className="rounded-lg py-1 px-0 mt-1 flex items-center justify-between">
                                                        <div className="responsiveTextTotal text-[var(--ink)] font-medium border-t border-[var(--line-strong)] pt-0.5">
                                                            Total
                                                        </div>
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
                                                            className='responsiveTextTotal text-[var(--ink)] font-medium border-t border-[var(--line-strong)] pt-0.5'
                                                        />
                                                    </div>

                                                </div>



                                                {stockData2.length > 0 && <div className="p-2 bg-[var(--bg-card)] mb-3 flex flex-col cf-card">
                                                    <SectionHeader icon={Boxes} title="Stocks - UnPaid">
                                                        {stocksSortName1 ? <FaSortAmountDown className="scale-[0.9] text-[var(--ink-muted)] hover:text-[var(--ink)] cursor-pointer" onClick={() => sortStocksName1()} /> : <FaSortAmountUpAlt className="scale-[0.9] text-[var(--ink-muted)] hover:text-[var(--ink)] cursor-pointer" onClick={() => sortStocksName1()} />}
                                                        {stocksSort1 ? <FaSortAmountDown className="scale-[0.9] text-[var(--ink-muted)] hover:text-[var(--ink)] cursor-pointer" onClick={() => sortStocks1()} /> : <FaSortAmountUpAlt className="scale-[0.9] text-[var(--ink-muted)] hover:text-[var(--ink)] cursor-pointer" onClick={() => sortStocks1()} />}
                                                    </SectionHeader>

                                                    {byName(stockData2).map((x, i) => {
                                                        return (
                                                            <div className="bg-[var(--bg-card)] py-0.5 px-0 rounded-2xl hover:bg-[var(--bg-subtle)] transition-colors" key={i}>
                                                                <MyAccordion title={
                                                                    <div className="flex w-full justify-between">
                                                                        <div className="responsiveText font-medium text-[var(--ink)] items-center flex gap-1.5 outline-none whitespace-normal break-words min-w-0"
                                                                        >
                                                                            <Avatar name={whName(x.stock)} size={18} />
                                                                            {whName(x.stock)}
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
                                                                                className='responsiveText text-[var(--ink)] tabular-nums'
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                }>

                                                                    <StoclToolTip stock={x.stock} stockDataAll={stockDataNoPayment} settings={settings} uidCollection={uidCollection} setDateSelect={setDateSelect} setValueCon={setValueCon} setIsOpenCon={setIsOpenCon} blankInvoice={blankInvoice} router={router} sumSel={sumSel} toggleSum={toggleSum} />
                                                                </MyAccordion>
                                                            </div>

                                                        )
                                                    })}
                                                    <div className="rounded-lg py-1 px-0 mt-1 flex items-center justify-between">
                                                        <div className="responsiveTextTotal text-[var(--ink)] font-medium border-t border-[var(--line-strong)] pt-0.5">
                                                            Total
                                                        </div>
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
                                                            className='responsiveTextTotal text-[var(--ink)] font-medium border-t border-[var(--line-strong)] pt-0.5'
                                                        />
                                                    </div>
                                                </div>}


                                                {sharedStock.length > 0 && <div className="p-2 bg-[var(--surface-card)] mb-3 flex flex-col cf-card">
                                                    <SectionHeader icon={Boxes} title="Shared Stock (IMS + GIS)" />
                                                    <div className="bg-[var(--surface-card)] py-0.5 px-0 hover:bg-[var(--surface-header)] transition-colors">
                                                        <MyAccordion title={
                                                            <div className="flex w-full justify-between">
                                                                <div className="responsiveText font-medium text-[var(--port-gore)] items-center flex outline-none whitespace-normal break-words min-w-0">
                                                                    Shared Inventory · {sharedStock.length} lot{sharedStock.length !== 1 ? 's' : ''}
                                                                </div>
                                                                <div className="leading-4 2xl:leading-6">
                                                                    <NumericFormat
                                                                        value={sharedStock.reduce((s, r) => s + (parseFloat(r.qnty) || 0) * (parseFloat(r.unitPrc) || 0), 0)}
                                                                        displayType="text"
                                                                        thousandSeparator
                                                                        allowNegative={true}
                                                                        prefix='$'
                                                                        decimalScale='2'
                                                                        fixedDecimalScale
                                                                        className='responsiveText text-[var(--port-gore)]'
                                                                    />
                                                                </div>
                                                            </div>
                                                        }>
                                                            <SharedStockDetails rows={sharedStock} settings={settings} />
                                                        </MyAccordion>
                                                    </div>
                                                </div>}


                                                <div className="p-2 bg-[var(--surface-card)] mb-3 flex flex-col cf-card">
                                                    <SectionHeader icon={Users} title="Clients - Payment">
                                                        {clientSortName1 ? <FaSortAmountDown className="scale-[0.9] text-[var(--ink-muted)] hover:text-[var(--ink)] cursor-pointer" onClick={() => sortClientsName(1)} /> : <FaSortAmountUpAlt className="scale-[0.9] text-[var(--ink-muted)] hover:text-[var(--ink)] cursor-pointer" onClick={() => sortClientsName(1)} />}
                                                        {clientSort1 ? <FaSortAmountDown className="scale-[0.9] text-[var(--ink-muted)] hover:text-[var(--ink)] cursor-pointer" onClick={() => sortClients(1)} /> : <FaSortAmountUpAlt className="scale-[0.9] text-[var(--ink-muted)] hover:text-[var(--ink)] cursor-pointer" onClick={() => sortClients(1)} />}
                                                    </SectionHeader>

                                                    {byName(clientInvoices2).map((x, i) => {
                                                        return (
                                                            <div className="bg-[var(--surface-card)] py-0.5 px-0 hover:bg-[var(--surface-header)] transition-colors" key={i}>
                                                                <MyAccordion title={
                                                                    <div className="flex w-full justify-between">
                                                                        <div className="flex items-center gap-1.5 min-w-0">
                                                                            <div className="responsiveText text-[var(--ink)] font-medium items-center flex gap-1.5 outline-none whitespace-normal break-words min-w-0">
                                                                                <Avatar name={cliName(x.client)} size={18} />
                                                                                {cliName(x.client)}
                                                                            </div>
                                                                            <FinalSummaryBadge finalized={x._finCount} total={x._finTotal} />
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
                                                                                className='responsiveText text-[var(--ink)] tabular-nums'
                                                                            />

                                                                        </div>
                                                                    </div>}>
                                                                    <ClientDetails client={x.client} data={clientsData} type="InDebt" uidCollection={uidCollection} setDateSelect={setDateSelect} setValueCon={setValueCon} setIsOpenCon={setIsOpenCon} blankInvoice={blankInvoice} router={router} toggleCheckClient={toggleCheckClient} toggleCheckClientAll={toggleCheckClientAll} toggleClientPartial={toggleClientPartial} toggleClientFull={toggleClientFull} savePmntClient={savePmntClient} clientPartialPayment={clientPartialPayment} openInvModal={openInvModal} sumSel={sumSel} toggleSum={toggleSum} />
                                                                </MyAccordion>
                                                            </div>
                                                        )
                                                    })}
                                                    <div className="rounded-lg py-1 px-0 mt-1 flex items-center justify-between">
                                                        <div className="responsiveTextTotal text-[var(--ink)] font-medium border-t border-[var(--line-strong)] pt-0.5">
                                                            Total
                                                        </div>
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
                                                            className='responsiveTextTotal text-[var(--ink)] font-medium border-t border-[var(--line-strong)] pt-0.5'
                                                        />
                                                    </div>
                                                </div>


                                                <div className="p-2 bg-[var(--bg-card)] mb-3 flex flex-col cf-card">
                                                    <SectionHeader icon={Users} title="Clients - Balances">
                                                        {clientSortName ? <FaSortAmountDown className="scale-[0.9] text-[var(--ink-muted)] hover:text-[var(--ink)] cursor-pointer" onClick={() => sortClientsName(0)} /> : <FaSortAmountUpAlt className="scale-[0.9] text-[var(--ink-muted)] hover:text-[var(--ink)] cursor-pointer" onClick={() => sortClientsName(0)} />}
                                                        {clientSort ? <FaSortAmountDown className="scale-[0.9] text-[var(--ink-muted)] hover:text-[var(--ink)] cursor-pointer" onClick={() => sortClients(0)} /> : <FaSortAmountUpAlt className="scale-[0.9] text-[var(--ink-muted)] hover:text-[var(--ink)] cursor-pointer" onClick={() => sortClients(0)} />}
                                                    </SectionHeader>

                                                    {byName(clientInvoices1).map((x, i) => {
                                                        return (
                                                            <div className="bg-[var(--bg-card)] py-0.5 px-0 rounded-2xl hover:bg-[var(--bg-subtle)] transition-colors" key={i}>
                                                                <MyAccordion title={
                                                                    <div className="flex w-full justify-between">
                                                                        <div className="flex items-center gap-1.5 min-w-0">
                                                                            <div className="responsiveText font-medium text-[var(--ink)] items-center flex gap-1.5 outline-none whitespace-normal break-words min-w-0">
                                                                                <Avatar name={cliName(x.client)} size={18} />
                                                                                {cliName(x.client)}
                                                                            </div>
                                                                            <FinalSummaryBadge finalized={x._finCount} total={x._finTotal} />
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
                                                                                className='responsiveText text-[var(--ink)] tabular-nums'
                                                                            />

                                                                        </div>
                                                                    </div>}>
                                                                    <ClientDetails client={x.client} data={clientsData} type="PartPaid" uidCollection={uidCollection} setDateSelect={setDateSelect} setValueCon={setValueCon} setIsOpenCon={setIsOpenCon} blankInvoice={blankInvoice} router={router} toggleCheckClient={toggleCheckClient} toggleCheckClientAll={toggleCheckClientAll} toggleClientPartial={toggleClientPartial} toggleClientFull={toggleClientFull} savePmntClient={savePmntClient} clientPartialPayment={clientPartialPayment} openInvModal={openInvModal} sumSel={sumSel} toggleSum={toggleSum} />
                                                                </MyAccordion>
                                                            </div>
                                                        )
                                                    })}

                                                    <div className="rounded-lg py-1 px-0 mt-1 flex items-center justify-between">
                                                        <div className="responsiveTextTotal text-[var(--ink)] font-medium border-t border-[var(--line-strong)] pt-0.5">
                                                            Total
                                                        </div>
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
                                                            className='responsiveTextTotal text-[var(--ink)] font-medium border-t border-[var(--line-strong)] pt-0.5'
                                                        />
                                                    </div>
                                                </div>


                                                <div>
                                                    {
                                                        isAdmin &&
                                                        <div className='mt-1 p-1'>
                                                            <SectionHeader icon={Banknote} title="Financing">
                                                                <button
                                                                    type="button"
                                                                    className="blackButton"
                                                                    onClick={() => setFinancedLeft([...financedLeft, { title: '', num: '' }])}
                                                                >
                                                                    <BtnIcon action="add" />Add
                                                                </button>
                                                            </SectionHeader>
                                                            <div className="py-0 px-0 mb-1 ">
                                                                {
                                                                    financedLeft?.map((z, i) => {
                                                                        return (
                                                                            <div className="flex items-center justify-between rounded-2xl px-0 responsiveTextInput hover:bg-[var(--bg-subtle)] transition-colors" key={i}>
                                                                                <div className="flex items-center gap-1 min-w-0 flex-1">
                                                                                    <button onClick={() => setFinancedLeft(financedLeft.filter((z, k) => k !== i))}><MdOutlineClose className="scale-110" /></button>
                                                                                    {/* responsiveText unconditionally: the filled state used to carry no
                                                                                        size class at all, so it fell through to the browser's default
                                                                                        input size (13.3px) and only happened to match the page at
                                                                                        1536px+. Below that it rendered a rung or two larger than every
                                                                                        row around it. */}
                                                                                    <input className={cn('flex-1 min-w-0 outline-none h-6 bg-transparent responsiveText font-medium text-[var(--ink)]',
                                                                                        z.title === '' ? 'input' : '')} value={z.title}
                                                                                        onChange={e => handleChangeFinance(e, i, 'left', 'title')} />
                                                                                </div>
                                                                                <NumericFormat className={cn('h-6 bg-transparent flex-shrink-0 responsiveText tnum font-medium text-[var(--ink)] text-right',
                                                                                    z.num === '' ? 'input w-24' : 'outline-none')}
                                                                                    value={z.num} thousandSeparator allowNegative={false} decimalScale={2} fixedDecimalScale prefix='$'
                                                                                    onValueChange={values => handleChangeFinance({ target: { value: values.value } }, i, 'left', 'num')}
                                                                                />
                                                                            </div>
                                                                        )
                                                                    })}
                                                            </div>

                                                            <div className="rounded-lg py-1 px-0 mt-1 flex items-center justify-between">
                                                                <div className="responsiveTextTotal text-[var(--ink)] font-medium border-t border-[var(--line-strong)] pt-0.5">
                                                                    Total
                                                                </div>
                                                                <NumericFormat
                                                                    value={Array.isArray(financedLeft) ? financedLeft.reduce((total, obj) => total + (parseFloat(obj.num) || 0), 0) : 0}
                                                                    displayType="text"
                                                                    thousandSeparator
                                                                    allowNegative={true}
                                                                    prefix='$'
                                                                    decimalScale='2'
                                                                    fixedDecimalScale
                                                                    className='responsiveTextTotal text-[var(--ink)] font-medium border-t border-[var(--line-strong)] pt-0.5'
                                                                />
                                                            </div>
                                                        </div>
                                                    }

                                                </div>
                                            </div>


                                            <div className="w-full border-l border-[var(--line)] pt-0">

                                                <div className="p-2 bg-[var(--bg-card)] mb-3 flex flex-col cf-card">
                                                    <SectionHeader icon={Factory} title="Supplier - Payment">
                                                        {supPmntssSortName1 ? <FaSortAmountDown className="scale-[0.9] text-[var(--ink-muted)] hover:text-[var(--ink)] cursor-pointer" onClick={() => sortSupPmntsName(1)} /> : <FaSortAmountUpAlt className="scale-[0.9] text-[var(--ink-muted)] hover:text-[var(--ink)] cursor-pointer" onClick={() => sortSupPmntsName(1)} />}
                                                        {supPmntssSort1 ? <FaSortAmountDown className="scale-[0.9] text-[var(--ink-muted)] hover:text-[var(--ink)] cursor-pointer" onClick={() => sortSupPmnts(1)} /> : <FaSortAmountUpAlt className="scale-[0.9] text-[var(--ink-muted)] hover:text-[var(--ink)] cursor-pointer" onClick={() => sortSupPmnts(1)} />}
                                                    </SectionHeader>



                                                    {byName(supPayments2).map((x, i) => {
                                                        return (
                                                            <div className="bg-[var(--bg-card)] py-0.5 px-0 rounded-2xl hover:bg-[var(--bg-subtle)] transition-colors" key={i}>
                                                                <MyAccordion title={
                                                                    <div className="flex w-full justify-between leading-4 2xl:leading-6">
                                                                        <div className="flex items-center gap-1.5 w-full min-w-0">
                                                                            <span className="responsiveText font-medium text-[var(--ink)] items-center flex gap-1.5 outline-none whitespace-normal break-words min-w-0">
                                                                                <Avatar name={supName(x.supplier)} size={18} />
                                                                                {supName(x.supplier)}
                                                                            </span>
                                                                            <FinalSummaryBadge finalized={x._finCount} total={x._finTotal} />
                                                                        </div>
                                                                        <div className="w-full text-right">
                                                                            <NumericFormat
                                                                                value={x.blnc}
                                                                                displayType="text"
                                                                                thousandSeparator
                                                                                allowNegative={true}
                                                                                prefix={'$'}
                                                                                decimalScale='2'
                                                                                fixedDecimalScale
                                                                                className='responsiveText text-[var(--ink)] tabular-nums'
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                }>
                                                                    <SupplierDetails supplier={x.supplier} data={supPaymentsData.filter(z => z.pmnt * 1 === 0)} uidCollection={uidCollection} setDateSelect={setDateSelect} setValueCon={setValueCon} setIsOpenCon={setIsOpenCon} blankInvoice={blankInvoice} router={router} toggleCheckSupplier={toggleCheckSupplier} toggleCheckSupplierAll={toggleCheckSupplierAll} toggleSupplier={toggleSupplier} savePmntSupplier={savePmntSupplier} supplierPartialPayment={supplierPartialPayment} supplierCloseBalance={supplierCloseBalance} openInvModal={openInvModal} sumSel={sumSel} toggleSum={toggleSum} />
                                                                </MyAccordion>
                                                            </div>

                                                        )
                                                    })}
                                                    <div className="rounded-lg py-1 px-0 mt-1 flex items-center justify-between">
                                                        <div className="responsiveTextTotal text-[var(--ink)] font-medium border-t border-[var(--line-strong)] pt-0.5">
                                                            Total
                                                        </div>
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
                                                            className='responsiveTextTotal text-[var(--ink)] font-medium border-t border-[var(--line-strong)] pt-0.5'
                                                        />
                                                    </div>
                                                </div>


                                                <div className="p-2 bg-[var(--bg-card)] mb-3 flex flex-col cf-card">
                                                    <SectionHeader icon={Factory} title="Supplier - Balances">
                                                        {supPmntssSortName ? <FaSortAmountDown className="scale-[0.9] text-[var(--ink-muted)] hover:text-[var(--ink)] cursor-pointer" onClick={() => sortSupPmntsName(0)} /> : <FaSortAmountUpAlt className="scale-[0.9] text-[var(--ink-muted)] hover:text-[var(--ink)] cursor-pointer" onClick={() => sortSupPmntsName(0)} />}
                                                        {supPmntssSort ? <FaSortAmountDown className="scale-[0.9] text-[var(--ink-muted)] hover:text-[var(--ink)] cursor-pointer" onClick={() => sortSupPmnts(0)} /> : <FaSortAmountUpAlt className="scale-[0.9] text-[var(--ink-muted)] hover:text-[var(--ink)] cursor-pointer" onClick={() => sortSupPmnts(0)} />}
                                                    </SectionHeader>



                                                    {byName(supPayments1).map((x, i) => {
                                                        return (
                                                            <div className="bg-[var(--bg-card)] py-0.5 px-0 rounded-2xl hover:bg-[var(--bg-subtle)] transition-colors" key={i}>
                                                                <MyAccordion title={
                                                                    <div className="flex w-full justify-between leading-4 2xl:leading-6">
                                                                        <div className="flex items-center gap-1.5 w-full min-w-0">
                                                                            <span className="responsiveText items-center font-medium text-[var(--ink)] flex gap-1.5 outline-none whitespace-normal break-words min-w-0">
                                                                                <Avatar name={supName(x.supplier)} size={18} />
                                                                                {supName(x.supplier)}
                                                                            </span>
                                                                            <FinalSummaryBadge finalized={x._finCount} total={x._finTotal} />
                                                                        </div>
                                                                        <div className="w-full text-right">
                                                                            <NumericFormat
                                                                                value={x.blnc}
                                                                                displayType="text"
                                                                                thousandSeparator
                                                                                allowNegative={true}
                                                                                prefix={'$'}
                                                                                decimalScale='2'
                                                                                fixedDecimalScale
                                                                                className='responsiveText text-[var(--ink)] tabular-nums'
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                }>
                                                                    <SupplierDetails supplier={x.supplier} data={supPaymentsData.filter(z => z.pmnt * 1 > 0)} uidCollection={uidCollection} setDateSelect={setDateSelect} setValueCon={setValueCon} setIsOpenCon={setIsOpenCon} blankInvoice={blankInvoice} router={router} toggleCheckSupplier={toggleCheckSupplier} toggleCheckSupplierAll={toggleCheckSupplierAll} toggleSupplier={toggleSupplier} savePmntSupplier={savePmntSupplier} supplierPartialPayment={supplierPartialPayment} supplierCloseBalance={supplierCloseBalance} openInvModal={openInvModal} sumSel={sumSel} toggleSum={toggleSum} />
                                                                </MyAccordion>
                                                            </div>
                                                        )
                                                    })}

                                                    <div className="rounded-lg py-1 px-0 mt-1 flex items-center justify-between">
                                                        <div className="responsiveTextTotal text-[var(--ink)] font-medium border-t border-[var(--line-strong)] pt-0.5">
                                                            Total
                                                        </div>
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
                                                            className='responsiveTextTotal text-[var(--ink)] font-medium border-t border-[var(--line-strong)] pt-0.5'
                                                        />
                                                    </div>
                                                </div>

                                                <div className="p-2 bg-[var(--bg-card)] mb-3 flex flex-col cf-card">
                                                    <SectionHeader icon={Wallet} title="Expenses">
                                                        {expensesSortName ? <FaSortAmountDown className="scale-[0.9] text-[var(--ink-muted)] hover:text-[var(--ink)] cursor-pointer" onClick={() => sortExpensesName()} /> : <FaSortAmountUpAlt className="scale-[0.9] text-[var(--ink-muted)] hover:text-[var(--ink)] cursor-pointer" onClick={() => sortExpensesName()} />}
                                                        {expensesSort ? <FaSortAmountDown className="scale-[0.9] text-[var(--ink-muted)] hover:text-[var(--ink)] cursor-pointer" onClick={() => sortExpenses()} /> : <FaSortAmountUpAlt className="scale-[0.9] text-[var(--ink-muted)] hover:text-[var(--ink)] cursor-pointer" onClick={() => sortExpenses()} />}
                                                    </SectionHeader>

                                                    {byName(expenses).map((x, i) => {
                                                        return (
                                                            <div className="bg-[var(--bg-card)] py-0.5 px-0 rounded-2xl hover:bg-[var(--bg-subtle)] transition-colors" key={i}>
                                                                <MyAccordion title={
                                                                    <div className="flex justify-between leading-4 2xl:leading-6 w-full">
                                                                        <div className="responsiveText font-medium text-[var(--ink)] items-center flex gap-1.5 outline-none whitespace-normal break-words min-w-0">
                                                                            <Avatar name={supName(x.supplier)} size={18} />
                                                                            {supName(x.supplier)}
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
                                                                                className='responsiveText text-[var(--ink)] tabular-nums'
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                }>
                                                                    <ExpensesToolTip supplier={x.supplier} expensesAll={expensesAll} settings={settings} uidCollection={uidCollection} setDateSelect={setDateSelect} setValueExp={setValueExp} setIsOpen={setIsOpen} blankInvoice={blankInvoice} router={router} toggleCheckExp={toggleCheckExp} toggleCheckExpAll={toggleCheckExpAll} toggleExp={toggleExp} savePmntExp={savePmntExp} sumSel={sumSel} toggleSum={toggleSum} />
                                                                </MyAccordion>
                                                            </div>

                                                        )
                                                    })}
                                                    <div className="rounded-lg py-1 px-0 mt-1 flex items-center justify-between">
                                                        <div className="responsiveTextTotal text-[var(--ink)] font-medium border-t border-[var(--line-strong)] pt-0.5">
                                                            Total
                                                        </div>
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
                                                            className='responsiveTextTotal text-[var(--ink)] font-medium border-t border-[var(--line-strong)] pt-0.5'
                                                        />
                                                    </div>
                                                </div>

                                                <div className="p-2 bg-[var(--bg-card)] mb-3 flex flex-col cf-card">
                                                    {
                                                        isAdmin &&
                                                        <div className='mt-1 p-1'>
                                                            <SectionHeader icon={Banknote} title="Financing">
                                                                <button
                                                                    type="button"
                                                                    className="blackButton"
                                                                    onClick={() => setFinancedRight([...financedRight, { title: '', num: '' }])}
                                                                >
                                                                    <BtnIcon action="add" />Add
                                                                </button>
                                                            </SectionHeader>
                                                            <div className="flex gap-1 mt-1 pt-2 flex-col" >
                                                                {
                                                                    financedRight?.map((z, i) => {
                                                                        return (
                                                                            <div className="flex items-center justify-between rounded-2xl px-0 responsiveTextInput hover:bg-[var(--bg-subtle)] transition-colors" key={i}>
                                                                                <div className="flex items-center gap-1 min-w-0 flex-1">
                                                                                    <button onClick={() => setFinancedRight(financedRight.filter((z, k) => k !== i))}><MdOutlineClose className="scale-110" /></button>
                                                                                    <input className={cn('flex-1 min-w-0 outline-none h-6 responsiveText font-medium text-[var(--ink)] bg-transparent',
                                                                                        z.title === '' ? 'input' : '')}
                                                                                        value={z.title} onChange={e => handleChangeFinance(e, i, 'right', 'title')} />
                                                                                </div>
                                                                                <NumericFormat className={cn('flex-shrink-0 h-6 responsiveText tnum font-medium text-[var(--ink)] bg-transparent text-right',
                                                                                    z.num === '' ? 'input w-24' : 'outline-none')}
                                                                                    value={z.num} thousandSeparator allowNegative={false} decimalScale={2} fixedDecimalScale prefix='$'
                                                                                    onValueChange={values => handleChangeFinance({ target: { value: values.value } }, i, 'right', 'num')} />
                                                                            </div>
                                                                        )
                                                                    })}
                                                            </div>

                                                            <div className="rounded-lg py-1 px-0 mt-1 flex items-center justify-between">
                                                                <div className="responsiveTextTotal text-[var(--ink)] font-medium border-t border-[var(--line-strong)] pt-0.5">
                                                                    Total
                                                                </div>
                                                                <NumericFormat
                                                                    value={Array.isArray(financedRight) ? financedRight.reduce((total, obj) => total + (parseFloat(obj.num) || 0), 0) : 0}
                                                                    displayType="text"
                                                                    thousandSeparator
                                                                    allowNegative={true}
                                                                    prefix='$'
                                                                    decimalScale='2'
                                                                    fixedDecimalScale
                                                                    className='responsiveTextTotal text-[var(--ink)] font-medium border-t border-[var(--line-strong)] pt-0.5'
                                                                />
                                                            </div>

                                                        </div>
                                                    }

                                                </div>

                                            </div>
                                        </div>

                                        {isAdmin && (
                                            <div className="mt-1 w-full border border-[var(--line)] rounded-2xl p-2">

                                                {/* TOTALS AND BALANCE IN ONE ROW */}
                                                <div className="grid grid-cols-[2fr_1fr_2fr] gap-1 responsiveTextTotal">

                                                    <div className="flex justify-between items-center bg-[var(--brand-soft)] rounded-lg px-3 py-0.5">
                                                        <span className="font-medium text-[var(--ink)] responsiveText whitespace-nowrap">
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
                                                            className="font-medium text-[var(--ink)] responsiveText whitespace-nowrap"
                                                        />
                                                    </div>

                                                    <div className="flex justify-between items-center bg-[var(--brand)] text-[var(--on-brand)] border-0 rounded-lg px-3 py-0.5">
                                                        <span className="font-medium responsiveText whitespace-nowrap">
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
                                                            className="font-medium responsiveText whitespace-nowrap"
                                                        />
                                                    </div>

                                                    <div className="flex justify-between items-center bg-[var(--brand-soft)] rounded-lg px-3 py-0.5">
                                                        <span className="font-medium text-[var(--ink)] responsiveText whitespace-nowrap">
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
                                                            className="font-medium text-[var(--ink)] responsiveText whitespace-nowrap"
                                                        />
                                                    </div>

                                                </div>

                                                {/* YEAR TOTAL INPUTS */}
                                                <div className="pt-1 pl-2">
                                                    {yr.map(z => {
                                                        const key = `total${z}`;
                                                        return (
                                                            <div className="flex gap-2 my-1" key={z}>
                                                                <span className="responsiveText items-center flex w-28 text-[var(--chathams-blue)] whitespace-nowrap font-medium">Total for {z}</span>
                                                                <NumericFormat
                                                                    className='input w-44 responsiveText font-medium text-[var(--ink)] text-right px-3 bg-[var(--bg-subtle)] border-[var(--line-strong)]'
                                                                    value={totalYrs.find(obj => obj.hasOwnProperty(key))?.[key] || ''}
                                                                    thousandSeparator allowNegative={false} decimalScale={2} prefix='$'
                                                                    onValueChange={values => handleChange({ target: { value: values.value } }, z)}
                                                                />
                                                            </div>
                                                        )
                                                    })}
                                                </div>

                                            </div>
                                        )}

                                    </div>
                                </>
                            )}

                        </div>

                        {/* Contract modal overlay */}
                        {valueCon && (
                            <ContractModal
                                isOpen={isOpenCon}
                                setIsOpen={setIsOpenCon}
                                title={!valueCon.id ? getTtl('New Contract', ln) : `${getTtl('Contract No', ln)}: ${valueCon.order}`}
                            />
                        )}

                        {/* Expense modal overlay */}
                        {valueExp && (
                            <ExpenseModal
                                isOpen={isOpen}
                                setIsOpen={setIsOpen}
                                title={getTtl('Existing Expense', ln)}
                            />
                        )}

                        {/* Invoice preview popup */}
                        <InvPopup inv={invPreview} onClose={() => setInvPreview(null)} settings={settings} compData={compData} gisAccount={gisAccount} />

                        {/* Running-sum basket — floats bottom-left so it clears the FloatingChat */}
                        <SumBasket items={Object.values(sumSel)} onRemove={removeSum} onClear={clearSum} />

                    </>
                }
            </div>
        </div>
    )
}
export default Cashflow;
