'use client';
import { useContext, useEffect, useState } from 'react';
import Customtable from './newTable';
import MyDetailsModal from './modals/dataModal.js'
import { SettingsContext } from "@contexts/useSettingsContext";
import MonthSelect from '@components/monthSelect';
import Toast from '@components/toast.js'
import { ExpensesContext } from "@contexts/useExpensesContext";
import { TbLayoutGridAdd } from 'react-icons/tb';
import { loadCompanyExpenses, loadData, loadDataInvoices } from '@utils/utils'

import Spinner from '@components/spinner';
import { UserAuth } from "@contexts/useAuthContext"
import Spin from '@components/spinTable';
import { EXD } from './excel'
import dateFormat from "dateformat";
import { getTtl } from '@utils/languages';
import DateRangePicker from '@components/dateRangePicker';
import Tooltip from '@components/tooltip';
import Tltip from '@components/tlTip';
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

        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: x.row.original.cur,
            minimumFractionDigits: 2
        }).format(x.getValue())
    }

    const caseInsensitiveEquals = (row, columnId, filterValue) =>
        row.getValue(columnId).toLowerCase() === filterValue.toLowerCase();

    let propDefaults = Object.keys(settings).length === 0 ? [] : [
        { accessorKey: 'lstSaved', header: getTtl('Last Saved', ln), cell: (props) => <p>{dateFormat(props.getValue(), 'dd-mmm-yy HH:MM')}</p> },
        {
            accessorKey: 'supplier', header: getTtl('Vendor', ln), meta: {
                filterVariant: 'selectSupplier',
            },
        },
        {
            accessorKey: 'date', header: getTtl('Date', ln), cell: (props) => <p>{dateFormat(props.getValue(), 'dd-mmm-yy')}</p>,
            meta: {
                filterVariant: 'dates',
            },
            filterFn: 'dateBetweenFilterFn'
        },
        { accessorKey: 'cur', header: getTtl('Currency', ln) },
        {
            accessorKey: 'amount', header: getTtl('Amount', ln), cell: (props) => <p>{showAmount(props)}</p>,
            meta: {
                filterVariant: 'range',
            },
        },
        { accessorKey: 'expense', header: getTtl('Expense Invoice', ln) + '#' },
        { accessorKey: 'expType', header: getTtl('Expense Type', ln) },
        {
            accessorKey: 'paid', header: getTtl('Paid / Unpaid', ln), meta: {
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

        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: gQ(x.row.original.cur, 'Currency', 'cur'),
            minimumFractionDigits: 2
        }).format(x.getValue())
    }


    let colsTotals = Object.keys(settings).length === 0 ? [] : [
        {
            accessorKey: 'supplier', header: getTtl('Vendor', ln),
            cell: (props) => <p>{props.getValue('supplier')}</p>
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
        <div className="container mx-auto px-2 md:px-8 xl:px-10 mt-16 md:mt-0">
            {Object.keys(settings).length === 0 ? <Spinner /> :
                <>
                    <Toast />
                    {loading && <Spin />}
                    <div className="border border-slate-200 rounded-xl p-4 mt-8 shadow-md relative">
                        <div className='flex items-center justify-between flex-wrap pb-2'>
                            <div className="text-3xl p-1 pb-2 text-slate-500">{getTtl('Company Expenses', ln)}</div>
                            <div className='flex group'>
                                <DateRangePicker />
                                <Tooltip txt='Select Dates Range' />
                            </div>
                        </div>

                        <Customtable
                            data={getFormatted(expensesData)}
                            columns={propDefaults}
                            SelectRow={SelectRow}
                            excellReport={EXD(expensesData.filter(x => filteredId.includes(x.id)), settings, getTtl('Company Expenses', ln), ln)}
                            setFilteredId={setFilteredId}
                            invisible={invisible}
                        />



                        <div className="text-left pt-6 flex gap-4">
                            <Tltip direction='bottom' tltpText='Create new Company Expense'>
                                <button
                                    type="button"
                                    onClick={addNewExpense}
                                    className="text-white bg-slate-500 hover:bg-slate-400 focus:outline-none font-medium rounded-lg 
													 text-sm px-4 py-3 text-center drop-shadow-xl gap-1.5 items-center flex"
                                >
                                    <TbLayoutGridAdd className="scale-110" />
                                    New Expense
                                </button>
                            </Tltip>
                        </div>


                        <div className='flex gap-4 2xl:gap-20 flex-wrap'>
                            <div className='pt-8'>
                                <TableTotals data={totals.map(x => ({ ...x, supplier: gQ(x.supplier, 'Supplier', 'nname') }))} columns={colsTotals} expensesData={expensesData}
                                    settings={settings} filt='reduced' title='Summary - Unpaid Company expenses' />
                            </div>

                            <div className='pt-8'>
                                <TableTotals data={totalsAll.map(x => ({ ...x, supplier: gQ(x.supplier, 'Supplier', 'nname') }))} columns={colsTotals} expensesData={expensesData}
                                    settings={settings} filt='full' title='Summary' />
                            </div>
                        </div>

                    </div>

                    <MyDetailsModal isOpen={isOpen} setIsOpen={setIsOpen}
                        title={getTtl('Existing Expense', ln)} />
                </>}
        </div>
    );
};

export default Expenses;

