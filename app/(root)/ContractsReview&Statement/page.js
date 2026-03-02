'use client';
import { useContext, useEffect, useMemo, useState } from 'react';
import Customtable from './newTable';
import CustomtableStatement from '../contractsstatement/newTable';
import CustomtableStatement1 from '../contractsstatement/newTable1';
import MyDetailsModal from '../contracts/modals/dataModal.js'
import { SettingsContext } from "../../../contexts/useSettingsContext";
import { ContractsContext } from "../../../contexts/useContractsContext";
import MonthSelect from '../../../components/monthSelect';
import Toast from '../../../components/toast.js'
import { ExpensesContext } from "../../../contexts/useExpensesContext";
import { InvoiceContext } from "../../../contexts/useInvoiceContext";
import TableTotals from '../contractsstatement/totals/tableTotals';

import { loadData, sortArr, loadStockData } from '../../../utils/utils'
import Spinner from '../../../components/spinner';
import { UserAuth } from "../../../contexts/useAuthContext"
import { getInvoices, groupedArrayInvoice, getD } from '../../../utils/utils'
import Spin from '../../../components/spinTable';
import { ContractsValue, SumAllPayments, SumAllExp } from './funcs'
import CBox from '../../../components/combobox.js'
import { EXD } from './excel'
import { EXD as EXDStatement } from '../contractsstatement/excel'
import dateFormat from "dateformat";
import { getTtl } from '../../../utils/languages';
import DateRangePicker from '../../../components/dateRangePicker';
import Tooltip from '../../../components/tooltip';
import { MdOutlineArrowForwardIos } from "react-icons/md";
import { IoIosArrowDown } from "react-icons/io";
import { Switch } from "../../../components/ui/switch";
import React from "react";

const TotalInvoicePayments = (data, val, mult) => {
    let accumulatedPmnt = 0;

    data.forEach(innerArray => {
        innerArray.forEach(obj => {
            if (obj && Array.isArray(obj.payments)) {
                obj.payments.forEach(payment => {
                    let mltTmp = obj.cur === val.cur ? 1 :
                        obj.cur === 'us' && val.cur === 'eu' ? 1 / mult : mult

                    if (payment && !isNaN(parseFloat(payment.pmnt))) {
                        accumulatedPmnt += parseFloat(payment.pmnt * 1 * mltTmp);
                    }
                });
            }
        });
    });

    return accumulatedPmnt;
}

const TotalArrsExp = (data, val, mult) => {
    let accumulatedExp = 0;

    data.forEach(obj => {
        if (obj) {
            let mltTmp = obj.cur === val.cur ? 1 :
                obj.cur === 'us' && val.cur === 'eu' ? 1 / mult : mult

            if (obj && !isNaN(parseFloat(obj.amount))) {
                accumulatedExp += parseFloat(obj.amount * 1 * mltTmp);
            }
        };

    });


    return accumulatedExp;
}

const Total = (data, name, val, mult, settings) => {
    let accumuLastInv = 0;
    let accumuDeviation = 0;

    data.forEach(innerArray => {
        innerArray.forEach(obj => {
            if (obj && !isNaN(obj[name])) {
                const currentCur = !obj.final ? obj.cur : settings.Currency.Currency.find(x => x.cur === obj.cur.cur)['id']
                let mltTmp = currentCur === val.cur ? 1 :
                    currentCur === 'us' && val.cur === 'eu' ? 1 / mult : mult

                let num = obj.canceled ? 0 : obj[name] * 1 * mltTmp
                accumuDeviation += (innerArray.length === 1 && ['1111', 'Invoice'].includes(obj.invType) ||
                    innerArray.length > 1 && ['1111', 'Invoice'].includes(obj.invType)) ?
                    num : 0;

                accumuLastInv += (innerArray.length === 1 && ['1111', 'Invoice'].includes(obj.invType) ||
                    innerArray.length > 1 && !['1111', 'Invoice'].includes(obj.invType)) ?
                    num : 0;

            }
        });
    });

    return { accumuDeviation, accumuLastInv };
}


const loadInvoices = async (uidCollection, con) => {

    let yrs = [...new Set((con.invoices || []).map(x => x.date.substring(0, 4)))]
    let arrTmp = [];
    for (let i = 0; i < yrs.length; i++) {
        let yr = yrs[i]
        let tmpDt = [...new Set(con.invoices.filter(x => x.date.substring(0, 4) === yr).map(y => y.invoice))]
        let obj = { yr: yr, arrInv: tmpDt }
        arrTmp.push(obj)
    }

    let tmpInv = await getInvoices(uidCollection, 'invoices', arrTmp)
    return groupedArrayInvoice(tmpInv)

}

const loadInvoicesStatement = async (uidCollection, con) => {

    let yrs = [...new Set(con.invoices.map(x => x.date.substring(0, 4)))]
    let arrTmp = [];
    for (let i = 0; i < yrs.length; i++) {
        let yr = yrs[i]
        let tmpDt = [...new Set(con.invoices.filter(x => x.date.substring(0, 4) === yr).map(y => y.invoice))]
        let obj = { yr: yr, arrInv: tmpDt }
        arrTmp.push(obj)
    }

    let tmpInv = await getInvoices(uidCollection, 'invoices', arrTmp)
    return tmpInv

}

const getInvArray = (obj) => {
    let invArr = []
    for (let i = 0; i < obj.invoices.length; i++) {
        let tmpArr = obj.invoices.filter(x => x.invoice === obj.invoices[i]['invoice'])
        if (tmpArr.length === 1) {
            invArr.push(tmpArr[0]['id'])
        } else {
            let findObjWithHighINVTYPE = tmpArr.reduce((prev, current) => {
                return prev.invType > current.invType ? prev : current;
            });
            invArr.push(findObjWithHighINVTYPE.id)
        }
    }

    return [...new Set(invArr)];
}

const arrayIncludesString = (row, columnId, filterValue) => {
    const cellValue = row.getValue(columnId);
    if (!Array.isArray(cellValue)) return false;
    if (!filterValue) return true;

    const search = filterValue.toLowerCase();

    return cellValue.some(item => {
        if (item === null || item === undefined) return false;
        return item.toString().toLowerCase().includes(search);
    });
};

const CB = (settings, setValCur, valCur) => {
    return (
        <CBox data={settings.Currency.Currency} setValue={setValCur} value={valCur} name='cur' classes='input border-slate-300 shadow-sm items-center flex'
            classes2='text-lg' dis={true} />
    )
}
const ContractsMerged = () => {

    const { settings, dateSelect, setLoading, loading, setDateYr, ln } = useContext(SettingsContext);
    const { valueCon, setValueCon, contractsData, setContractsData, isOpenCon, setIsOpenCon } = useContext(ContractsContext);
    const { blankInvoice, setIsInvCreationCNFL } = useContext(InvoiceContext);
    const { blankExpense } = useContext(ExpensesContext);
    const { uidCollection } = UserAuth();
    const [totals, setTotals] = useState([]);
    const [valCur, setValCur] = useState({ cur: 'us' })
    const [filteredData, setFilteredData] = useState([]);
    const [dataTable, setDataTable] = useState([])
    
    // Tab state - 'review' or 'statement'
    const [activeTab, setActiveTab] = useState('review')
    
    // Statement specific states
    const [dataTableStatement, setDataTableStatement] = useState([])
    const [totalsStatement, setTotalsStatement] = useState([])
    const [filteredDataStatement, setFilteredDataStatement] = useState([])
    const [enabledSwitch, setEnabledSwitch] = useState(true)

    const gQ = (z, y, x) => settings[y][y].find(q => q.id === z)?.[x] || ''


    useEffect(() => {

        const Load = async () => {
            setLoading(true)
            let dt = await loadData(uidCollection, 'contracts', dateSelect);
            setContractsData(dt)
            
        }

        Object.keys(settings).length !== 0 && Load();


    }, [dateSelect, settings])

    // Review Data Loading
    useEffect(() => {

        const loadInv = async () => {
            let dt = [...contractsData]
            dt = await Promise.all(
                dt.map(async (x) => {
                    const Invoices = await loadInvoices(uidCollection, x)
                    return {
                        ...x,
                        invoicesData: Invoices,
                    };
                })
            );

            dt = setCurFilterData(dt)
            setDataTable(dt)
            setFilteredData(dt)
            setLoading(false)
        }

        loadInv()
    }, [contractsData])

    // Statement Data Loading
    useEffect(() => {

        const loadInvStatement = async () => {
            let dt = [...contractsData]
            dt = await Promise.all(
                dt.map(async (x) => {
                    const Invoices = await loadInvoicesStatement(uidCollection, x)
                    const Stock = await loadStockData(uidCollection, 'id', x.stock)

                    return {
                        ...x,
                        invoicesData: Invoices,
                        stcokData: Stock,
                    };
                })
            );

            dt = setCurFilterDataStatement(dt)

            const groupedTotals = dt.reduce((acc, { supplier, poWeight, shiipedWeight, cur, remaining }) => {

                let key = cur === "us" ? "totalsUs" : "totalsEU";

                acc[key] ??= [];
                let existing = acc[key].find(z => z.supplier === supplier);

                if (existing) {
                    existing.poWeight = (Number(existing.poWeight) || 0) + (Number(poWeight) || 0);
                    existing.shiipedWeight = (Number(existing.shiipedWeight) || 0) + (Number(shiipedWeight) || 0);
                    existing.remaining = existing.poWeight - existing.shiipedWeight

                } else {
                    acc[key].push({ supplier, poWeight, shiipedWeight, remaining, cur });
                }

                return acc;
            }, { totalsUs: [], totalsEU: [] });

            const totals = [...groupedTotals.totalsUs, ...groupedTotals.totalsEU];

            setTotalsStatement(totals);
            setDataTableStatement(dt)
            setFilteredDataStatement(dt)
        }

        if (contractsData.length > 0) {
            loadInvStatement()
        }
    }, [contractsData])

    useEffect(() => {

        const Load = () => {
            let dt2 = setTtl(filteredData)
            setTotals(dt2)
        }

        Load();
    }, [filteredData])


    useEffect(() => {

        const Load = async () => {
            let dt1 = setCurFilterData(dataTable)
            setDataTable(dt1)

            let dt2 = setTtl(filteredData)
            setTotals(dt2)

        }

        Load();
    }, [valCur])

    const setCurFilterData = (arr) => {

        let dt = arr.map((x) => {

            const conValue = ContractsValue(x, 'pmnt', valCur, x.euroToUSD);
            const totalInvoices = Total(x.invoicesData, 'totalAmount', valCur, x.euroToUSD, settings).accumuLastInv;
            const deviation = totalInvoices - Total(x.invoicesData, 'totalAmount', valCur, x.euroToUSD, settings).accumuDeviation;
            const totalPrepayment1 = Total(x.invoicesData, 'totalPrepayment', valCur, x.euroToUSD, settings).accumuLastInv;
            const prepaidPer = isNaN(totalPrepayment1 / totalInvoices) ? '-' : ((totalPrepayment1 / totalInvoices) * 100).toFixed(1) + '%'
            const inDebt = totalInvoices - totalPrepayment1;
            const payments = TotalInvoicePayments(x.invoicesData, valCur, x.euroToUSD);
            const debtaftr = totalPrepayment1 - payments;
            const debtBlnc = totalInvoices - payments;
            const expenses1 = TotalArrsExp(x.expenses, valCur, x.euroToUSD)
            const profit = totalInvoices - conValue - expenses1;

            return {
                ...x,
                conValue,
                totalInvoices,
                deviation,
                prepaidPer,
                totalPrepayment1,
                inDebt,
                payments,
                debtaftr,
                debtBlnc,
                expenses1,
                profit,
            };
        })
        return dt;
    }

    const setCurFilterDataStatement = (arr) => {

        let newArr = []

        arr.forEach(obj => {

            let newObj = {};
            let total = 0;

            let materialsArr = [...new Set(obj.productsData.map(x => x.id))]

            materialsArr.forEach(x => {

                total = obj.productsData.find(q => q.id === x)['qnty']

                let totalShipped = 0;
                let totalClients = [];
                let totalPo = [];
                let totalDestination = [];
                let totalInvoices = [];

                let invTypeArr = getInvArray(obj)

                obj.invoicesData.forEach(z => {

                    if (invTypeArr.includes(z.id)) {

                        const countPOs = z.productsDataInvoice.filter(el => !isNaN(el) && el !== '').length;
                        z.productsDataInvoice.forEach(f => {
                            if (f.descriptionId === x) {

                                totalShipped += parseFloat(f.qnty)
                                let clnt = z.final ? z.client.nname : (settings.Client.Client).find(x => x.id === z.client).nname
                                let pod = z.final ? z.pod : (settings.POD.POD).find(x => x.id === z.pod)?.['pod']

                                totalPo.push(countPOs > 1 ? (f.po).trim() : (z.productsDataInvoice[0].po).trim())
                                totalClients.push(clnt)
                                totalDestination.push(pod)
                                totalInvoices.push(z.invoice)
                            }
                        })
                    }
                })

                let objTmp = obj.stcokData.filter(c => c.description === x).filter(v => v.qnty * 1 !== 0)
                newObj = {
                    supplier: obj.supplier, date: obj.date, order: obj.order, poWeight: total,
                    comments: obj.comments, description: obj.productsData.find(z => z.id === x).description,
                    unitPrc: obj.productsData.find(z => z.id === x).unitPrc, cur: obj.cur,
                    shiipedWeight: totalShipped, remaining: total - totalShipped,
                    client: totalClients.length > 0 ? [...new Set(totalClients)] : objTmp.map(x => (settings.Client.Client.find(d => d.id === x.client)?.nname ?? '')),
                    totalPo: totalPo.length > 0 ? [...new Set(totalPo)] : objTmp.map(x => x.qnty + '-' + (x.salesPo ?? '')),
                    destination: [...new Set(totalDestination)],
                    invoiceNum: [...new Set(totalInvoices)],
                    id: obj.productsData.find(z => z.id === x).id, client1: [...new Set(totalClients)].join(' '),
                    totalPo1: [...new Set(totalPo)].join(' '), destination1: [...new Set(totalDestination)].join(' '),
                    status: objTmp.map(x => x.qnty + '-' + (x.status ?? '')),
                    qntyReceived: objTmp.reduce((total, obj1) => {
                        return total + obj1.qnty * 1;
                    }, 0)
                }
                newArr.push(newObj)
            })
        });

        return newArr
    }

    const setTtl = (filteredData) => {

        // totals
        const totalContracts = filteredData.reduce((total, obj) => {
            return total + ContractsValue(obj, 'pmnt', valCur, obj.euroToUSD);
        }, 0);

        const totalInvoices1 = filteredData.reduce((total, obj) => {
            return total + Total(obj.invoicesData, 'totalAmount', valCur, obj.euroToUSD, settings).accumuLastInv;
        }, 0);

        const totalPrepayment2 = filteredData.reduce((total, obj) => {
            return total + Total(obj.invoicesData, 'totalPrepayment', valCur, obj.euroToUSD, settings).accumuLastInv;
        }, 0);

        const expenses2 = SumAllExp(filteredData, valCur)
        const payments1 = SumAllPayments(filteredData, valCur)


        let Ttls = [{
            date: '', order: '', supplier: '', conValue: totalContracts,
            totalInvoices: totalInvoices1, deviation: filteredData.reduce((total, obj) => { return total + obj.deviation }, 0),
            prepaidPer: isNaN(totalPrepayment2 / totalInvoices1) ? '-' : ((totalPrepayment2 / totalInvoices1) * 100).toFixed(2) + '%',
            totalPrepayment1: totalPrepayment2,
            inDebt: (totalInvoices1 - totalPrepayment2),
            payments: payments1, debtaftr: totalPrepayment2 - payments1, debtBlnc: totalInvoices1 - payments1,
            expenses1: expenses2, profit: (totalInvoices1 - totalContracts - expenses2),

            cur: 'us'
        }]

        return Ttls;
    }

    let showAmount = (x) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: getD(settings.Currency.Currency, valCur, 'cur'),
            minimumFractionDigits: 2
        }).format(x)
    }

    let showWeight = (x) => {
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 3
        }).format(x)
    }

    let showAmountStatement = (x) => {
        return Number(x.getValue()) ? new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: x.row.original.cur,
            minimumFractionDigits: 2
        }).format(x.getValue())
            : x.getValue()
    }

    let propDefaults = Object.keys(settings).length === 0 ? [] : [

        {
            accessorKey: 'date', header: getTtl('Date', ln), enableSorting: false, cell: (props) => <p>{dateFormat(props.getValue(), 'dd-mmm-yy')}</p>,
            meta: {
                filterVariant: 'dates',
            },
            filterFn: 'dateBetweenFilterFn'
        },
        { accessorKey: 'order', header: getTtl('PO', ln) + '#', ttl: <span className='font-medium'>{getTtl('Total', ln) + ':'}</span> },
        {
            accessorKey: 'supplier', header: getTtl('Supplier', ln), meta: {
                filterVariant: 'selectSupplier',
            },
        },
        {
            accessorKey: 'conValue', header: getTtl('purchaseValue', ln), cell: (props) => <p>{showAmount(props.getValue())}</p>, ttl: showAmount(totals[0]?.conValue),
            meta: {
                filterVariant: 'range',
            },
        },
        {
            accessorKey: 'totalInvoices', header: getTtl('invValueSale', ln), cell: (props) => <p>{showAmount(props.getValue())}</p>, ttl: showAmount(totals[0]?.totalInvoices),
            meta: {
                filterVariant: 'range',
            },
        },
        {
            accessorKey: 'deviation', header: getTtl('Deviation', ln), cell: (props) => <p>{showAmount(props.getValue())}</p>, ttl: showAmount(totals[0]?.deviation),
        },
        { accessorKey: 'prepaidPer', header: getTtl('Prepaid', ln) + ' %', ttl: totals[0]?.prepaidPer },
        {
            accessorKey: 'totalPrepayment1', header: getTtl('Prepaid Amount', ln), cell: (props) => <p>{showAmount(props.getValue())}</p>, ttl: showAmount(totals[0]?.totalPrepayment1),
            meta: {
                filterVariant: 'range',
            },
        },
        {
            accessorKey: 'inDebt', header: getTtl('Initial Debt', ln), cell: (props) => <p>{showAmount(props.getValue())}</p>, ttl: showAmount(totals[0]?.inDebt),
            meta: {
                filterVariant: 'range',
            },
        },
        {
            accessorKey: 'payments', header: getTtl('Actual Payment', ln), cell: (props) => <p>{showAmount(props.getValue())}</p>, ttl: showAmount(totals[0]?.payments),
            meta: {
                filterVariant: 'range',
            },
        },
        {
            accessorKey: 'debtaftr', header: getTtl('debtAfterPrepPmnt', ln), cell: (props) => <p>{showAmount(props.getValue())}</p>, ttl: showAmount(totals[0]?.debtaftr),
            meta: {
                filterVariant: 'range',
            },
        },
        {
            accessorKey: 'debtBlnc', header: getTtl('Debt Balance', ln), cell: (props) => <p>{showAmount(props.getValue())}</p>, ttl: showAmount(totals[0]?.debtBlnc),
            meta: {
                filterVariant: 'range',
            },
        },
        {
            accessorKey: 'expenses1', header: getTtl('Expenses', ln), cell: (props) => <p>{showAmount(props.getValue())}</p>, ttl: showAmount(totals[0]?.expenses1),
            meta: {
                filterVariant: 'range',
            },
        },
        {
            accessorKey: 'profit', header: getTtl('Profit', ln), cell: (props) => <p>{showAmount(props.getValue())}</p>, ttl: showAmount(totals[0]?.profit),
            meta: {
                filterVariant: 'range',
            },
        },

    ];

    // Statement columns
    let propDefaultsStatement = Object.keys(settings).length === 0 ? [] : [
        {
            accessorKey: 'expander', header: '', enableSorting: false,
            enableColumnPinning: true,
            enablePinning: true,
            enableColumnFilter: false,
            cell: ({ row }) => (
                <div className='w-10 flex items-center justify-center'>
                    {row.getCanExpand() ? (
                        <button
                            onClick={row.getToggleExpandedHandler()}
                            aria-label={row.getIsExpanded() ? 'Collapse details' : 'Expand details'}
                            className={`flex items-center justify-center w-8 h-8 rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--endeavour)] ${row.getIsExpanded() ? 'bg-[var(--endeavour)] text-white' : 'bg-white text-[var(--endeavour)] hover:bg-[var(--selago)]'}`}
                        >
                            <IoIosArrowDown className={`transform transition-transform duration-200 ${row.getIsExpanded() ? 'rotate-180' : 'rotate-0'}`} />
                        </button>
                    ) : (
                        <span className='pl-4'>🔵</span>
                    )}
                </div>
            ),
        },
        {
            accessorKey: 'date', header: getTtl('Date', ln), cell: (props) => <p>{dateFormat(props.getValue(), 'dd-mmm-yy')}</p>,
            meta: {
                filterVariant: 'dates',
            },
            filterFn: 'dateBetweenFilterFn'
        },
        {
            accessorKey: 'order', header: getTtl('PO', ln) + '#'
        },
        {
            accessorKey: 'supplier', header: getTtl('Supplier', ln),
            meta: {
                filterVariant: 'selectSupplier',
            },
        },
        {
            accessorKey: 'client', header: getTtl('Consignee', ln),
            filterFn: arrayIncludesString,
            cell: (props) => {
                return enabledSwitch ? props.getValue() : (
                    <div className="flex flex-col">
                        {props.getValue().map((client, index) => (
                            <div key={index}>{client}</div>
                        ))}
                    </div>
                );
            },
        },
        { accessorKey: 'poWeight', header: getTtl('Quantity', ln), cell: (props) => <p>{showWeight(props.getValue())}</p> },
        { accessorKey: 'description', header: getTtl('Description', ln), cell: (props) => <p className='text-wrap w-20  md:w-64'>{props.getValue()}</p> },
        { accessorKey: 'unitPrc', header: getTtl('purchaseValue', ln), cell: (props) => <p>{showAmountStatement(props)}</p> },
        { accessorKey: 'shiipedWeight', header: getTtl('Shipped Weight', ln) + ' MT', cell: (props) => <p>{showWeight(props.getValue())}</p> },
        {
            accessorKey: 'remaining', header: getTtl('Remaining Weight', ln) + ' MT', cell: (props) => <p className={`${props.getValue() < 0 ? 'text-red-400 font-semibold' : ''}`}>
                {props.getValue() > 0 ? showWeight(props.getValue()) : showWeight(props.getValue() * -1)}</p>
        },
        {
            accessorKey: 'qntyReceived', header: 'Mat. Table', cell: (props) => <span>
                {(() => {
                    const v = props.getValue();
                    return v === 'Details expanded' ? v : v === 0 ? '-' : showWeight(v);
                })()
                }</span>
        },
        {
            accessorKey: 'status', header: getTtl('Status', ln),
            filterFn: arrayIncludesString,
            cell: (props) => {
                return enabledSwitch ? props.getValue() : (
                    <div className="flex flex-col">
                        {props.getValue().map((status, index) => (
                            <div key={index}>{status}</div>
                        ))}
                    </div>
                );
            },
        },
        {
            accessorKey: 'totalPo', header: getTtl('PO Client', ln),
            filterFn: arrayIncludesString,
            cell: (props) => {
                return enabledSwitch ? props.getValue() : (
                    <div className="flex flex-col">
                        {props.getValue().map((totalPo, index) => (
                            <div key={index}>{totalPo}</div>
                        ))}
                    </div>
                );
            },
        },
        {
            accessorKey: 'destination', header: getTtl('Destination', ln),
            filterFn: arrayIncludesString,
            cell: (props) => {
                return enabledSwitch ? props.getValue() : (
                    <div className="flex flex-col">
                        {props.getValue().map((destination, index) => (
                            <div key={index}>{destination}</div>
                        ))}
                    </div>
                );
            },
        },
        {
            accessorKey: 'invoiceNum', header: getTtl('Invoice', ln),
            filterFn: arrayIncludesString,
            cell: (props) => {
                return enabledSwitch ? props.getValue() : (
                    <div className="flex flex-col">
                        {props.getValue().map((invoiceNum, index) => (
                            <div key={index}>{invoiceNum}</div>
                        ))}
                    </div>
                );
            },
        },
        { accessorKey: 'comments', header: getTtl('Comments/Status', ln), cell: (props) => <span className='w-[560px] flex text-wrap'>{props.getValue()}</span> },
    ];

    let colsTotals = Object.keys(settings).length === 0 ? [] : [
        {
            accessorKey: 'supplier', header: getTtl('Vendor', ln),
            cell: (props) => <p>{gQ(props.getValue('supplier'), 'Supplier', 'nname')}</p>
        },
        { accessorKey: 'poWeight', header: getTtl('Quantity', ln), cell: (props) => <p>{showWeight(props.getValue())}</p> },
        { accessorKey: 'shiipedWeight', header: getTtl('Shipped Weight', ln) + ' MT', cell: (props) => <p>{showWeight(props.getValue())}</p> },
        {
            accessorKey: 'remaining', header: getTtl('Remaining Weight', ln) + ' MT', cell: (props) => <p className={`${props.getValue() < 0 ? 'text-red-400 font-semibold' : ''}`}>
                {props.getValue() > 0 ? showWeight(props.getValue()) : showWeight(props.getValue() * -1)}</p>
        },
    ];

    let invisible = ['date', 'debtBlnc'].reduce((acc, key) => {
        acc[key] = false;
        return acc;
    }, {});

    let invisibleStatement = ['salesPrice'].reduce((acc, key) => {
        acc[key] = false;
        return acc;
    }, {});

    const getFormatted = (arr) => {

        let newArr = []

        arr.forEach(row => {
            let formattedRow = {
                ...row,
                supplier: gQ(row.supplier, 'Supplier', 'nname'),
            }

            newArr.push(formattedRow)
        })

        return newArr;
    }

    const getFormattedStatement = (arr) => {

        let newArr = []

        arr.forEach(row => {
            let formattedRow = {
                ...row,
                supplier: gQ(row.supplier, 'Supplier', 'nname'),
                cur: gQ(row.cur, 'Currency', 'cur'),
            }

            newArr.push(formattedRow)
        })

        return newArr
    }

    const groupedArrayInvoiceStatement = (arrD) => {

        const groupedArray1 = arrD.sort((a, b) => {
            return a.order - b.order;
        }).reduce((result, obj) => {

            const group = result.find((group) => group[0]?.order === obj.order);

            if (group) {
                group.push(obj);
            } else {
                result.push([obj]);
            }

            return result;
        }, []);

        let newArr = []
        for (let i of groupedArray1) {

            newArr.push({
                ...i[0],
                poWeight: i.reduce((total, obj) => {
                    return total + obj.poWeight * 1;
                }, 0),
                unitPrc: '',
                description: getTtl('Details expanded', ln),
                shiipedWeight: i.reduce((total, obj) => {
                    return total + obj.shiipedWeight * 1;
                }, 0),
                remaining: i.reduce((total, obj) => {
                    return total + obj.remaining * 1;
                }, 0),
                qntyReceived: getTtl('Details expanded', ln),
                client: getTtl('Details expanded', ln),
                totalPo: getTtl('Details expanded', ln),
                destination: getTtl('Details expanded', ln),
                status: getTtl('Details expanded', ln),
                invoiceNum: getTtl('Details expanded', ln),
                subRows: i.map(z => ({
                    ...z, client: z.client.map((item, index) => {
                        return <div key={index}>{item}</div>
                    }),
                    totalPo: z.totalPo.map((item, index) => {
                        return <div key={index}>{item}</div>
                    }),
                    destination: z.destination.map((item, index) => {
                        return <div key={index}>{item}</div>
                    }),
                    invoiceNum: z.invoiceNum.map((item, index) => {
                        return <div key={index}>{item}</div>
                    }),
                    status: z.status.map((item, index) => {
                        return <div key={index}>{item}</div>
                    }),
                }))
            })
        }

        return newArr;
    };

    const SelectRow = (row) => {
        setValueCon(contractsData.find(x => x.id === row.id));
        blankInvoice();
        setDateYr(row.dateRange.startDate.substring(0, 4));
        blankExpense();
        setIsInvCreationCNFL(false);
        setIsOpenCon(true);
    };

    const TableModes = () => {
        // Adjust these values for perfect spacing
        const knobSize = 18;
        const trackWidth = 36;
        const knobOffset = 2;
        const rightGap = 4; // space from right edge

        // Calculate translateX so knob stops before the right edge
        const translateX = trackWidth - knobSize - knobOffset - rightGap;

        return (
            <div className='flex items-center gap-3'>
                <span className='text-sm text-[var(--port-gore)] font-medium select-none'>
                    {enabledSwitch ? 'Expanded mode' : 'Table mode'}
                </span>
                <button
                    aria-label={enabledSwitch ? "Switch to Table mode" : "Switch to Expanded mode"}
                    onClick={() => setEnabledSwitch(!enabledSwitch)}
                    className="relative w-9 h-5 rounded-full focus:outline-none transition-colors duration-200 border-2 flex items-center"
                    style={{
                        background: enabledSwitch ? "#3367AE" : "#a0a0a0",
                        borderColor: enabledSwitch ? "#3367AE" : "#a0a0a0",
                        minWidth: trackWidth,
                        borderWidth: 2,
                        padding: 0,
                    }}
                >
                    <span
                        className="absolute"
                        style={{
                            top: "50%",
                            left: `${knobOffset}px`,
                            width: `${knobSize}px`,
                            height: `${knobSize}px`,
                            borderRadius: "50%",
                            background: "radial-gradient(circle at 60% 40%, #f5f5f5 70%, #e0e0e0 100%)",
                            boxShadow: "0 2px 6px rgba(0,0,0,0.10)",
                            transform: `translateY(-50%) ${enabledSwitch ? `translateX(${translateX}px)` : "translateX(0)"}`,
                            transition: "transform 0.2s",
                            display: "block",
                        }}
                    />
                </button>
            </div>
        );
    }

    return (
        <div className="w-full " style={{ background: "#f8fbff" }}>
            <div className="mx-auto w-full max-w-[98%] px-1 sm:px-2 md:px-3 pb-4 mt-[72px]">
                {Object.keys(settings).length === 0 ? <Spinner /> :
                    <>
                        <Toast />
                        {loading && <Spin />}
                        {/* Main Card */}
                        <div className="rounded-2xl p-3 sm:p-5 mt-8 border border-gray-200  w-full backdrop-blur-[2px] bg-white">
                            {/* Header Section */}
                            <div className='flex items-center justify-between flex-wrap gap-2 pb-2'>
                                <h1 className="text-[14px] text-[#11497c] font-poppins responsiveTextTitle border-l-4 border-[#11497c] pl-2" style={{ fontSize: '14px' }}>
                                    {getTtl('Contracts', ln)}
                                </h1>
                                {/* <div className='flex group'>
                                    <DateRangePicker />
                                    <Tooltip txt='Select Dates Range' />
                                </div> */}
                            </div>

                            {/* Tabs */}
                            <div className='flex gap-8 mt-4 mb-6 '>
                                <button
                                    onClick={() => setActiveTab('review')}
                                    className={`pb-2 text-lg font-semibold transition-all border-b-4 ${
                                        activeTab === 'review'
                                            ? 'border-[var(--endeavour)] text-[var(--endeavour)]'
                                            : 'border-transparent text-[var(--port-gore)] hover:text-[var(--endeavour)]'
                                    }`}
                                    style={{ background: 'none', boxShadow: 'none', borderRadius: 0 }}
                                >
                                    {getTtl('Contracts Review', ln)}
                                </button>
                                <button
                                    onClick={() => setActiveTab('statement')}
                                    className={`pb-2 text-lg font-semibold transition-all border-b-4 ${
                                        activeTab === 'statement'
                                            ? 'border-[var(--endeavour)] text-[var(--endeavour)]'
                                            : 'border-transparent text-[var(--port-gore)] hover:text-[var(--endeavour)]'
                                    }`}
                                    style={{ background: 'none', boxShadow: 'none', borderRadius: 0 }}
                                >
                                    {getTtl('Contracts Statement', ln)}
                                </button>
                            </div>

                            {/* Review Tab Content */}
                            {activeTab === 'review' && (
                                <div className='mt-5'>
                                    <Customtable data={loading ? [] : getFormatted(dataTable)} datattl={loading ? [] : totals} columns={propDefaults} SelectRow={SelectRow}
                                        invisible={invisible} 
                                        excellReport={EXD(dataTable.filter(x => filteredData.map(z => z.id).includes(x.id)), settings, getTtl('Contracts Review', ln),
                                            ln, valCur)}
                                        cb={CB(settings, setValCur, valCur)}
                                        setFilteredData={setFilteredData}
                                        valCur={valCur} setValCur={setValCur}
                                        ln={ln}
                                    />
                                </div>
                            )}

                            {/* Statement Tab Content */}
                            {activeTab === 'statement' && (
                                <>
                                    {enabledSwitch ?
                                        <CustomtableStatement data={loading ? [] : groupedArrayInvoiceStatement(getFormattedStatement(dataTableStatement))} columns={propDefaultsStatement}
                                            excellReport={EXDStatement(dataTableStatement.filter(x => filteredDataStatement.map(z => z.id).includes(x.id)), settings, getTtl('Contracts Statement', ln), ln)}
                                            invisible={invisibleStatement} ln={ln}
                                            setFilteredData={setFilteredDataStatement}
                                            tableModes={<TableModes />} type='contractStatementTableModes'
                                        />
                                        :
                                        <CustomtableStatement1 data={loading ? [] : (getFormattedStatement(dataTableStatement))} columns={propDefaultsStatement.slice(1)}
                                            excellReport={EXDStatement(dataTableStatement.filter(x => filteredDataStatement.map(z => z.id).includes(x.id)), settings, getTtl('Contracts Statement', ln), ln)}
                                            invisible={invisibleStatement} ln={ln}
                                            setFilteredData={setFilteredDataStatement}
                                            tableModes={<TableModes />} type='contractStatementTableModes'
                                        />
                                    }

                                    <div className='pt-8'>
                                        <TableTotals data={sortArr(totalsStatement.map(z => ({ ...z, spName: gQ(z.supplier, 'Supplier', 'nname') })), 'spName')} columns={colsTotals} expensesData={dataTableStatement}
                                            settings={settings} />
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Modal */}
                        {valueCon && <MyDetailsModal isOpen={isOpenCon} setIsOpen={setIsOpenCon}
                            title={!valueCon.id ? getTtl('New Contract', ln) : `${getTtl('Contract No', ln)}: ${valueCon.order}`} />}
                    </>
                }
            </div>
        </div>
    );
};

export default ContractsMerged;

