'use client';
import { useContext, useEffect, useState } from 'react';
import Customtable from './newTable';
import MyDetailsModal from './modals/dataModal.js'
import { SettingsContext } from "../../../contexts/useSettingsContext";
import MonthSelect from '../../../components/monthSelect';
import Toast from '../../../components/toast.js'
import { ExpensesContext } from "../../../contexts/useExpensesContext";
import { TbLayoutGridAdd } from 'react-icons/tb';
import { loadCompanyExpenses, loadData, loadDataInvoices } from '../../../utils/utils'

import Spinner from '../../../components/spinner';
import VideoLoader from '../../../components/videoLoader';
import { UserAuth } from "../../../contexts/useAuthContext"
import Spin from '../../../components/spinTable';
import { EXD } from './excel'
import dateFormat from "dateformat";
import { getTtl } from '../../../utils/languages';
import DateRangePicker from '../../../components/dateRangePicker';
import Tooltip from '../../../components/tooltip';
import Tltip from '../../../components/tlTip';
import { v4 as uuidv4 } from 'uuid';
import TableTotals from './totals/tableTotals';


const Expenses = () => {


    const { settings, dateSelect, loading, setLoading, ln } = useContext(SettingsContext);
    const { expensesData, setValueExp, setExpensesData, isOpen, setIsOpen, valueExp } = useContext(ExpensesContext);
    const { uidCollection } = UserAuth();
    const [filteredId, setFilteredId] = useState([])
    const [totals, setTotals] = useState([])
    const [totalsAll, setTotalsAll] = useState([])

    useEffect(() => {

        const Load = async () => {
            setLoading(true)
            let dt = await loadCompanyExpenses(uidCollection, 'companyExpenses', dateSelect);
            dt = dt.map(z => ({ ...z, amount: z.amount * 1 }))

            setExpensesData(dt)
            setFilteredId(dt.map(x => x.id))
            setLoading(false)
        }

        Load();

    }, [dateSelect])

    useEffect(() => {

        const groupedTotals = expensesData.filter(x => filteredId.includes(x.id)).
            filter(z => z.paid === "222").
            reduce((acc, { supplier, paid, cur, amount }) => {
                let key = cur === "us" ? "totalsUs" : "totalsEU";

                acc[key] ??= []; // Initialize array if not present
                let existing = acc[key].find(z => z.supplier === supplier);

                if (existing) {
                    existing.amount += amount;
                } else {
                    acc[key].push({ supplier, amount, cur });
                }

                return acc;
            }, { totalsUs: [], totalsEU: [] });

        const totals = [...groupedTotals.totalsUs, ...groupedTotals.totalsEU];

        setTotals(totals);

        const groupedTotalsall = expensesData.filter(x => filteredId.includes(x.id)).
            reduce((acc, { supplier, paid, cur, amount }) => {
                let key = cur === "us" ? "totalsUs" : "totalsEU";

                acc[key] ??= []; // Initialize array if not present
                let existing = acc[key].find(z => z.supplier === supplier);

                if (existing) {
                    existing.amount += amount;
                } else {
                    acc[key].push({ supplier, amount, cur });
                }

                return acc;
            }, { totalsUs: [], totalsEU: [] });

        const totalsAll = [...groupedTotalsall.totalsUs, ...groupedTotalsall.totalsEU];

        setTotalsAll(totalsAll);


    }, [filteredId])



    let showAmount = (x) => {
        const rawCur = (x.row.original.cur || '').toUpperCase();
        const currency = rawCur === 'US' ? 'USD' : rawCur === 'EU' ? 'EUR' : (rawCur || 'USD');
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency,
            minimumFractionDigits: 2
        }).format(x.getValue())
    }

    const caseInsensitiveEquals = (row, columnId, filterValue) =>
        row.getValue(columnId).toLowerCase() === filterValue.toLowerCase();

    let propDefaults = Object.keys(settings).length === 0 ? [] : [
        { accessorKey: 'lstSaved', header: getTtl('Last Saved', ln), cell: (props) => <p>{dateFormat(props.getValue(), 'dd-mmm-yy HH:MM')}</p>, meta: { excludeFromQuickSum: true } },
        {
            accessorKey: 'supplier', header: getTtl('Vendor', ln), meta: {
                filterVariant: 'selectSupplier',
            },
        },
        {
            accessorKey: 'date', header: getTtl('Date', ln), cell: (props) => <p>{dateFormat(props.getValue(), 'dd.mm.yy')}</p>,
            meta: {
                filterVariant: 'dates',
            },
            filterFn: 'dateBetweenFilterFn'
        },
        { accessorKey: 'cur', header: getTtl('Currency', ln), cell: (props) => { const v = (props.getValue() || '').toUpperCase(); const isUsd = v === 'USD' || v === 'US'; const isEur = v === 'EUR' || v === 'EU'; return <span style={{ background: isUsd ? '#b7d1b5' : isEur ? '#dbeeff' : '#f0f0f0', color: isUsd ? '#2d6a2d' : isEur ? 'var(--chathams-blue)' : '#555', borderRadius: '8px', padding: '3px 14px', fontWeight: 500, fontSize: '0.75rem', display: 'inline-block' }}>{isUsd ? '$' : isEur ? '€' : v}</span> } },
        {
            accessorKey: 'amount', header: getTtl('Amount', ln), cell: (props) => <p>{showAmount(props)}</p>,
            meta: {
                filterVariant: 'range',
            },
        },
        { accessorKey: 'expense', header: getTtl('Expense Invoice', ln) + '#', meta: { excludeFromQuickSum: true } },
        { accessorKey: 'expType', header: getTtl('Expense Type', ln) },
        {
            accessorKey: 'paid', header: getTtl('Status', ln), meta: {
                filterVariant: 'paidNotPaidExp',
            },
            filterFn: caseInsensitiveEquals,
        },
        { accessorKey: 'comments', header: getTtl('Comments', ln) },

    ];


    let invisible = ['lstSaved', 'cur',].reduce((acc, key) => {
        acc[key] = false;
        return acc;
    }, {});

    const getFormatted = (arr) => {  //convert id's to values

        let newArr = []
        const gQ = (z, y, x) => settings[y][y].find(q => q.id === z)?.[x] || ''

        arr.forEach(row => {
            let formattedRow = {
                ...row, supplier: gQ(row.supplier, 'Supplier', 'nname'),
                cur: gQ(row.cur, 'Currency', 'cur'),
                expType: gQ(row.expType, 'Expenses', 'expType'),
                paid: gQ(row.paid, 'ExpPmnt', 'paid'),
            }

            newArr.push(formattedRow)
        })

        return newArr
    }

    const gQ = (z, y, x) => settings[y][y].find(q => q.id === z)?.[x] || ''

    let showAmount1 = (x) => {
        const rawCur = (gQ(x.row.original.cur, 'Currency', 'cur') || '').toUpperCase();
        const currency = rawCur === 'US' ? 'USD' : rawCur === 'EU' ? 'EUR' : (rawCur || 'USD');
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency,
            minimumFractionDigits: 2
        }).format(x.getValue())
    }


    let colsTotals = Object.keys(settings).length === 0 ? [] : [
        {
            accessorKey: 'supplier', header: getTtl('Vendor', ln),
        },
        {
            accessorKey: 'amount', header: getTtl('Amount', ln),
            cell: (props) => <p>{showAmount1(props)}</p>
        }
    ];

    const addNewExpense = () => {
        setIsOpen(true)
        setValueExp({
            id: '', lstSaved: '', supplier: '', dateRange: { startDate: null, endDate: null },
            cur: '', amount: '', date: '',
            expense: '', expType: '', paid: '', comments: ''

        })
    }

    const SelectRow = (row) => {
        setValueExp(expensesData.find(x => x.id === row.id));
        setIsOpen(true);
    };

    return (
        <div className="w-full " style={{ background: "#f8fbff" }}>
            <div className="mx-auto w-full max-w-full px-1 md:px-2 pb-4 mt-[72px]">
                {Object.keys(settings).length === 0 ? <VideoLoader loading={true} fullScreen={true} /> :
                    <>
                        <Toast />
                        <VideoLoader loading={loading} fullScreen={true} />
                        {/* Main Card */}
                        <div className="rounded-2xl p-3 sm:p-5 mt-8 border border-[#b8ddf8] shadow-xl w-full bg-[#f8fbff]">
                            {/* Header Section */}
                            <div className='flex items-center justify-between flex-wrap gap-2 pb-2'>
                                <h1 className="text-[var(--chathams-blue)] font-poppins responsiveTextTitle font-medium border-l-4 border-[var(--chathams-blue)] pl-2">
                                    {getTtl('Company Expenses', ln)}
                                </h1>
                                {/* <div className='flex items-center gap-2 group'>
                                    <div className="relative">
                                        <DateRangePicker />
                                    </div>
                                    <Tooltip txt='Select Dates Range' />
                                </div> */}
                            </div>

                            {/* Table Component */}
                            <Customtable
                                data={getFormatted(expensesData)}
                                columns={propDefaults}
                                SelectRow={SelectRow}
                                excellReport={EXD(expensesData.filter(x => filteredId.includes(x.id)), settings, getTtl('Company Expenses', ln), ln)}
                                setFilteredData={(rows) => setFilteredId(rows.map(x => x.id))}
                                invisible={invisible}
                            />

                            {/* Action Button */}
                           <div className="text-left pt-6 flex gap-4">
                            <Tltip direction='bottom' tltpText='Create new Company Expense'>
                                <button
                                type="button"
                                onClick={addNewExpense}
                                className="flex items-center gap-2 bg-[var(--endeavour)] border border-[var(--chathams-blue)] text-white px-4 h-[26px] text-[0.8rem] font-medium responsiveText rounded-full hover:bg-[var(--selago)]/30 transition-all"
                                >
                                <TbLayoutGridAdd className="w-4 h-4" />
                                <span>New Expense</span>
                                </button>
                            </Tltip>
                            </div>

                            {/* Totals Section */}
                            <div className='flex gap-4 flex-wrap'>
                                <div className='pt-8 flex-1 min-w-[300px]'>
                                    <TableTotals data={totals.map(x => ({ ...x, supplier: gQ(x.supplier, 'Supplier', 'nname') }))} columns={colsTotals} expensesData={expensesData}
                                        settings={settings} filt='reduced' title='Summary - Unpaid Company expenses' />
                                </div>
                                <div className='pt-8 flex-1 min-w-[300px]'>
                                    <TableTotals data={totalsAll.map(x => ({ ...x, supplier: gQ(x.supplier, 'Supplier', 'nname') }))} columns={colsTotals} expensesData={expensesData}
                                        settings={settings} filt='full' title='Summary' />
                                </div>
                            </div>
                        </div>

                        {/* Modal */}
                        <MyDetailsModal isOpen={isOpen} setIsOpen={setIsOpen}
                            title={getTtl('Existing Expense', ln)} />
                    </>
                }
            </div>
        </div>
    );
};

export default Expenses;

