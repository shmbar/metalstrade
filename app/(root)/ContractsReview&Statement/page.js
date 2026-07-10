'use client';
import { useContext, useEffect, useMemo, useState } from 'react';
import Customtable from './newTable';
import CustomtableStatement from '../contractsstatement/newTable';
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
import { buildInvoiceIndex, contractInvoicesFromIndex, getD } from '../../../utils/utils'
import Spin from '../../../components/spinTable';
import { ContractsValue, SumAllPayments, SumAllExp } from './funcs'
import Tltip from '../../../components/tlTip'
import CBox from '../../../components/combobox.js'
import { EXD } from './excel'
import { EXD as EXDStatement } from '../contractsstatement/excel'
import { lotIsSold, computeLineSold, aggregateRollups, lineStatus } from '../contractsstatement/soldStatus'
import { SHIPMENT_STATUS_STYLES } from '../contractsstatement/shipmentStatus'
import dateFormat from "dateformat";
import { getTtl } from '../../../utils/languages';
import DateRangePicker from '../../../components/dateRangePicker';
import Tooltip from '../../../components/tooltip';
import { MdOutlineArrowForwardIos } from "react-icons/md";
import { IoIosArrowDown } from "react-icons/io";
import { Switch } from "../../../components/ui/switch";
import React from "react";
import VideoLoader from '../../../components/videoLoader';
import { TableSkeleton } from "../../../components/skeletons";

// ── Statement roll-up indicators ───────────────────────────────────────────
const fmtMT = (n) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(Number(n) || 0);

// Auto-derived lifecycle colours, used only when the contract has no manual shipment status set.
const FALLBACK_STATUS_STYLES = {
    shipped: { backgroundColor: '#e0f2fe', border: '1px solid #bae6fd', color: '#075985' },
    partial: { backgroundColor: '#dbeeff', border: '1px solid #b8ddf8', color: 'var(--chathams-blue)' },
    pending: { backgroundColor: '#fef9c3', border: '1px solid #fde68a', color: '#92400e' },
    unsold:  { backgroundColor: '#fee2e2', border: '1px solid #fecaca', color: '#dc2626' },
};

// Status chip that follows the software lifecycle: the contract's shipment status (Pending /
// Shipped / In Transit / Arrived / Completed / On Hold) when set, otherwise an auto-derived
// status (Unsold / Sold·pending shipment / Shipped) from the sold + shipped quantities.
const StatusChip = ({ shipmentStatus, rollup }) => {
    const { key, label, isShipment } = lineStatus({ shipmentStatus, rollup });
    if (key === 'none') return <span className="responsiveTextTable" style={{ color: 'var(--regent-gray)' }}>—</span>;
    const style = isShipment ? (SHIPMENT_STATUS_STYLES[key] || SHIPMENT_STATUS_STYLES['']) : FALLBACK_STATUS_STYLES[key];
    return (
        <span className="px-3 py-1 rounded-xl responsiveTextTable font-normal whitespace-nowrap" style={style}>
            {label}
        </span>
    );
};

// Shipped-vs-contracted progress bar
const ProgressBar = ({ shipped, total }) => {
    const t = parseFloat(total) || 0;
    const s = parseFloat(shipped) || 0;
    const pct = t > 0 ? Math.max(0, Math.min(100, Math.round((s / t) * 100))) : 0;
    const color = pct >= 100 ? '#16a34a' : pct > 0 ? 'var(--endeavour)' : '#cbd5e1';
    return (
        <div className="flex flex-col items-center gap-1" style={{ minWidth: 84 }}>
            <div style={{ width: '100%', height: 6, borderRadius: 9999, background: '#e6eef7', overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 9999, transition: 'width .2s' }} />
            </div>
            <span style={{ color: 'var(--port-gore)', fontSize: '0.6rem', fontWeight: 500 }}>{fmtMT(s)} / {fmtMT(t)} · {pct}%</span>
        </div>
    );
};

// Clean vertical stack for multi-value cells (consignee, PO, destination, invoice)
const StackCell = ({ value }) => {
    const arr = Array.isArray(value) ? value : (value ? [value] : []);
    if (arr.length === 0) return '';
    return (
        <div className="flex flex-col items-center gap-0.5">
            {arr.map((v, i) => <div key={i} className="whitespace-nowrap">{v}</div>)}
        </div>
    );
};

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

// Filters the Status column by the visible status label (shipment status or derived lifecycle)
const statusRollupFilter = (row, columnId, filterValue) => {
    if (!filterValue) return true;
    const fv = String(filterValue).toLowerCase().trim();
    if (!fv) return true;
    const { key, label } = lineStatus({ shipmentStatus: row.original?.shipmentStatus, rollup: row.original?.soldRollup });
    return String(label).toLowerCase().includes(fv) || String(key).toLowerCase().includes(fv);
};

const CB = (settings, setValCur, valCur) => {
    return (
        <CBox data={settings.Currency.Currency} setValue={setValCur} value={valCur} name='cur' classes='input border-slate-300 shadow-sm items-center flex max-w-[100px] !h-7'
            classes2='text-[0.7rem]' dis={true} />
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
    const [selectedIdsStatement, setSelectedIdsStatement] = useState([])
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
            // Batch all contracts' invoices in one pass (was one query per contract).
            const invIndex = await buildInvoiceIndex(uidCollection, contractsData)
            let dt = contractsData.map(x => ({
                ...x,
                invoicesData: contractInvoicesFromIndex(x, invIndex, true),
            }))

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
            // Batch all contracts' invoices in one pass (was one query per contract);
            // stock still loads per contract (separate collection).
            const invIndex = await buildInvoiceIndex(uidCollection, contractsData)
            let dt = await Promise.all(
                contractsData.map(async (x) => {
                    const Stock = await loadStockData(uidCollection, 'id', x.stock)

                    return {
                        ...x,
                        invoicesData: contractInvoicesFromIndex(x, invIndex, false),
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
                let shipments = [];

                let invTypeArr = getInvArray(obj)

                obj.invoicesData.forEach(z => {

                    if (invTypeArr.includes(z.id)) {

                        const countPOs = z.productsDataInvoice.filter(el => !isNaN(el) && el !== '').length;
                        z.productsDataInvoice.forEach(f => {
                            if (f.descriptionId === x) {

                                totalShipped += parseFloat(f.qnty) || 0
                                let clnt = z.final ? z.client.nname : (settings.Client.Client).find(x => x.id === z.client).nname
                                let pod = z.final ? z.pod : (settings.POD.POD).find(x => x.id === z.pod)?.['pod']

                                totalPo.push(countPOs > 1 ? (f.po).trim() : (z.productsDataInvoice[0].po).trim())
                                totalClients.push(clnt)
                                totalDestination.push(pod)
                                totalInvoices.push(z.invoice)
                                shipments.push({
                                    invoice: z.invoice,
                                    consignee: clnt,
                                    po: countPOs > 1 ? (f.po).trim() : (z.productsDataInvoice[0].po).trim(),
                                    destination: pod,
                                    qnty: parseFloat(f.qnty) || 0,
                                })
                            }
                        })
                    }
                })

                let objTmp = obj.stcokData.filter(c => c.description === x).filter(v => v.qnty * 1 !== 0)

                // "Sold" is derived from real allocation (consignee / sales-PO) or the manual flag,
                // so a lot that has been committed to a buyer no longer wrongly shows as Unsold.
                const lots = objTmp.map(l => {
                    const consignee = l.client ? (settings.Client.Client.find(d => d.id === l.client)?.nname ?? '') : ''
                    const salesPo = (l.salesPo || '').toString().trim()
                    const sold = lotIsSold(l)
                    return { qnty: parseFloat(l.qnty) || 0, status: sold ? 'sold' : 'unsold', sold, consignee, salesPo }
                })
                // Sold = shipped/invoiced OR allocated on the lot, measured against the contract qty.
                const soldRollup = computeLineSold({ contractQty: total, shippedQty: totalShipped, lots })

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
                    }, 0),
                    lots,
                    shipments,
                    soldRollup,
                    shipmentStatus: obj.shipmentStatus || '',
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
            accessorKey: 'date', header: getTtl('Date', ln), enableSorting: false, cell: (props) => <p>{dateFormat(props.getValue(), 'dd.mm.yy')}</p>,
            meta: {
                filterVariant: 'dates',
                excludeFromQuickSum: true,
            },
            filterFn: 'dateBetweenFilterFn'
        },
        { accessorKey: 'order', header: getTtl('PO', ln) + '#', ttl: <span className='font-medium'>{getTtl('Total', ln) + ':'}</span>, meta: { excludeFromQuickSum: true } },
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
        { accessorKey: 'prepaidPer', header: getTtl('Prepaid', ln) + ' %', ttl: totals[0]?.prepaidPer, meta: { excludeFromQuickSum: true } },
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
                <div className='flex items-center justify-center'>
                    {row.getCanExpand() ? (
                        <button
                            onClick={row.getToggleExpandedHandler()}
                            aria-label={row.getIsExpanded() ? 'Collapse details' : 'Expand details'}
                            className={`flex items-center justify-center w-6 h-6 rounded-lg transition-all duration-200 focus:outline-none ${row.getIsExpanded() ? 'bg-[#e7f1fd] text-[var(--endeavour)]' : 'text-[var(--endeavour)] hover:bg-[#eef5fd]'}`}
                        >
                            <IoIosArrowDown size={13} className={`transition-transform duration-200 ${row.getIsExpanded() ? 'rotate-180' : 'rotate-0'}`} />
                        </button>
                    ) : (
                        <span className='inline-block w-1.5 h-1.5 rounded-full' style={{ background: '#cbd5e1' }} />
                    )}
                </div>
            ),
        },
        {
            accessorKey: 'date', header: getTtl('Date', ln), cell: (props) => <p>{dateFormat(props.getValue(), 'dd.mm.yy')}</p>,
            meta: {
                filterVariant: 'dates',
                excludeFromQuickSum: true,
            },
            filterFn: 'dateBetweenFilterFn'
        },
        {
            accessorKey: 'order', header: getTtl('PO', ln) + '#',
            cell: (props) => {
                const val = props.getValue();
                return (
                    <Tltip direction="right" tltpText={val}>
                        <div className="truncate max-w-[80px]">{val}</div>
                    </Tltip>
                );
            },
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
            cell: (props) => <StackCell value={props.getValue()} />,
        },
        { accessorKey: 'poWeight', header: getTtl('Quantity', ln), cell: (props) => <p>{showWeight(props.getValue())}</p> },
        { accessorKey: 'description', header: getTtl('Description', ln), cell: (props) => <p className='text-wrap w-20  md:w-64'>{props.getValue()}</p> },
        { accessorKey: 'unitPrc', header: getTtl('purchaseValue', ln), cell: (props) => <p>{showAmountStatement(props)}</p> },
        { accessorKey: 'shiipedWeight', header: getTtl('Shipped Weight', ln) + ' MT', cell: (props) => <ProgressBar shipped={props.getValue()} total={props.row.original.poWeight} /> },
        {
            accessorKey: 'remaining', header: getTtl('Remaining Weight', ln) + ' MT', cell: (props) => <p className={`${props.getValue() < 0 ? 'text-red-400 font-semibold' : ''}`}>
                {props.getValue() > 0 ? showWeight(props.getValue()) : showWeight(props.getValue() * -1)}</p>
        },
        {
            accessorKey: 'qntyReceived', header: 'Mat. Table', cell: (props) => <span>
                {(() => {
                    const v = props.getValue();
                    return !v || v === 0 ? '-' : showWeight(v);
                })()
                }</span>
        },
        {
            accessorKey: 'status', header: getTtl('Status', ln),
            filterFn: statusRollupFilter,
            cell: (props) => <StatusChip shipmentStatus={props.row.original.shipmentStatus} rollup={props.row.original.soldRollup} />,
        },
        {
            accessorKey: 'totalPo', header: getTtl('PO Client', ln),
            filterFn: arrayIncludesString,
            cell: (props) => <StackCell value={props.getValue()} />,
        },
        {
            accessorKey: 'destination', header: getTtl('Destination', ln),
            filterFn: arrayIncludesString,
            cell: (props) => <StackCell value={props.getValue()} />,
        },
        {
            accessorKey: 'invoiceNum', header: getTtl('Invoice', ln),
            filterFn: arrayIncludesString,
            cell: (props) => <StackCell value={props.getValue()} />,
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

            const aggRollup = aggregateRollups(i.map(o => o.soldRollup))

            newArr.push({
                ...i[0],
                poWeight: i.reduce((total, obj) => {
                    return total + obj.poWeight * 1;
                }, 0),
                unitPrc: '',
                description: '',
                shiipedWeight: i.reduce((total, obj) => {
                    return total + (Number(obj.shiipedWeight) || 0);
                }, 0),
                remaining: i.reduce((total, obj) => {
                    return total + (Number(obj.remaining) || 0);
                }, 0),
                qntyReceived: '',
                client: '',
                totalPo: '',
                destination: '',
                status: '',
                invoiceNum: '',
                lots: [],
                shipments: [],
                soldRollup: aggRollup,
                subRows: i.map(z => ({ ...z })),
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
            <div className="mx-auto w-full max-w-full px-1 md:px-2 pb-4 mt-[72px]">
                {Object.keys(settings).length === 0 ? <TableSkeleton /> :
                    <>
                        <Toast />
                        <VideoLoader loading={loading} fullScreen={true} />
                        {/* Main Card */}
                        <div className="rounded-2xl p-3 sm:p-5 mt-8 border border-[#b8ddf8]  w-full bg-white">
                            {/* Header Section */}
                            <div className='flex items-center justify-between flex-wrap gap-2 pb-1'>
                                <h1 className="text-[var(--chathams-blue)] font-poppins responsiveTextTitle font-medium border-l-4 border-[var(--chathams-blue)] pl-2">
                                    {getTtl('Contracts', ln)}
                                </h1>
                                {/* <div className='flex group'>
                                    <DateRangePicker />
                                    <Tooltip txt='Select Dates Range' />
                                </div> */}
                            </div>

                            {/* Tabs */}
                            <div className='flex gap-8'>
                                <button
                                    onClick={() => setActiveTab('review')}
                                    className={`pb-1 responsiveTextTable font-medium transition-all border-b-2 ${
                                        activeTab === 'review'
                                            ? 'border-[var(--chathams-blue)] text-[var(--chathams-blue)]'
                                            : 'border-transparent text-[var(--port-gore)] hover:text-[var(--chathams-blue)]'
                                    }`}
                                    style={{ background: 'none', boxShadow: 'none', borderRadius: 0 }}
                                >
                                    {getTtl('Contracts Review', ln)}
                                </button>
                                <button
                                    onClick={() => setActiveTab('statement')}
                                    className={`pb-1 responsiveTextTable font-medium transition-all border-b-2 ${
                                        activeTab === 'statement'
                                            ? 'border-[var(--chathams-blue)] text-[var(--chathams-blue)]'
                                            : 'border-transparent text-[var(--port-gore)] hover:text-[var(--chathams-blue)]'
                                    }`}
                                    style={{ background: 'none', boxShadow: 'none', borderRadius: 0 }}
                                >
                                    {getTtl('Contracts Statement', ln)}
                                </button>
                            </div>

                            {/* Review Tab Content */}
                            {activeTab === 'review' && (
                                <div className='mt-2'>
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
                                <div className='mt-2'>
                                    {/* Both modes are the SAME Customtable — only data/columns differ. Rendering one
                                        instance (switching props) keeps it mounted across the Table <-> Expanded toggle,
                                        so the search/filter you typed is preserved instead of being wiped on a remount. */}
                                    <CustomtableStatement
                                        data={loading ? [] : (enabledSwitch
                                            ? groupedArrayInvoiceStatement(getFormattedStatement(dataTableStatement))
                                            : getFormattedStatement(dataTableStatement))}
                                        columns={enabledSwitch ? propDefaultsStatement : propDefaultsStatement.slice(1)}
                                        excellReport={EXDStatement(dataTableStatement.filter(x => (selectedIdsStatement.length ? selectedIdsStatement : filteredDataStatement.map(z => z.id)).includes(x.id)), settings, getTtl('Contracts Statement', ln), ln)}
                                        invisible={invisibleStatement} ln={ln}
                                        setFilteredData={setFilteredDataStatement}
                                        onSelectionChange={setSelectedIdsStatement}
                                        tableModes={<TableModes />} type='contractStatementTableModes'
                                    />

                                    <div className='pt-8'>
                                        <TableTotals data={sortArr(totalsStatement.map(z => ({ ...z, spName: gQ(z.supplier, 'Supplier', 'nname') })), 'spName')} columns={colsTotals} expensesData={dataTableStatement}
                                            settings={settings} />
                                    </div>
                                </div>
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

