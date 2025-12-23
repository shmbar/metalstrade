'use client';
import { useContext, useEffect, useState } from 'react';

import { SettingsContext } from "@contexts/useSettingsContext";
import Spinner from '@components/spinner';
import { UserAuth } from "@contexts/useAuthContext"
import { EXD } from './excel'
import dateFormat from "dateformat";
import { getTtl } from '@utils/languages';
import { getD, loadCompanyExpenses, loadDataInvoices } from '@utils/utils';
import DateRangePicker from '@components/dateRangePicker';
import Tooltip from '@components/tooltip';
import Customtable from './newTable';
import TableTotals from './totals/tableTotals';

const Contracts = () => {
    const { settings, dateSelect, setDateYr, setLoading, loading, ln } = useContext(SettingsContext);
    const { uidCollection } = UserAuth();
    const [data, setData] = useState([]);
    const [totals, setTotals] = useState([])
    const [totalsAll, setTotalsAll] = useState([])
    const [filteredData, setFilteredData] = useState([])

    useEffect(() => {

        const Load = async () => {
            setLoading(true)
            let dt = await loadCompanyExpenses(uidCollection, 'specialInvoices', dateSelect);

            setData(dt)
            setFilteredData(dt)
            setLoading(false)
        }

        Load();
    }, [dateSelect])


    useEffect(() => {

        const groupedTotals = filteredData.filter(x => x.paidNotPaid !== 'Paid').
            reduce((acc, { supplier, cur, total }) => {

                let key = cur === "us" ? "totalsUs" : "totalsEU";

                acc[key] ??= []; // Initialize array if not present
                let existing = acc[key].find(z => z.supplier === supplier);

                if (existing) {
                    existing.total = existing.total * 1 + total * 1;
                } else {
                    acc[key].push({ supplier, total, cur });
                }

                return acc;
            }, { totalsUs: [], totalsEU: [] });

        const totals = [...groupedTotals.totalsUs, ...groupedTotals.totalsEU];



        const groupedTotalsAll = filteredData.reduce((acc, { supplier, cur, total }) => {

            let key = cur === "us" ? "totalsUs" : "totalsEU";

            acc[key] ??= []; // Initialize array if not present
            let existing = acc[key].find(z => z.supplier === supplier);

            if (existing) {

                existing.total = existing.total * 1 + total * 1;
            } else {
                acc[key].push({ supplier, total, cur });
            }

            return acc;
        }, { totalsUs: [], totalsEU: [] });

        const totalsAll = [...groupedTotalsAll.totalsUs, ...groupedTotalsAll.totalsEU];

        setTotals(totals);
        setTotalsAll(totalsAll);
    }, [filteredData])



    let showAmount = (x) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: getD(settings.Currency.Currency, x.row.original, 'cur'),
            minimumFractionDigits: 2
        }).format(x.getValue())
    }

    const SelectRow = () => { }

    const exactMatchFilter = (row, columnId, filterValue) => {
        const cellValue = row.getValue(columnId);
        return cellValue === filterValue || filterValue === '';
    };

    const setDecimals = (x) => {
        if (x === undefined || x === null) return ''; // or return x, or '0', depending on your use case

        const tmp = x.toString().split('.');
        return tmp[1]?.length > 2 ? (x * 1).toFixed(2) : x;
    };

    let propDefaults = Object.keys(settings).length === 0 ? [] : [
        { accessorKey: 'compName', header: 'Company Name', cell: (props) => <p>{props.getValue()}</p> },
        {
            accessorKey: 'date', header: getTtl('Date', ln), cell: (props) => <p>{dateFormat(props.getValue(), 'dd-mmm-yy')}</p>,
            meta: {
                filterVariant: 'dates',
            }, filterFn: 'dateBetweenFilterFn'
        },
        {
            accessorKey: 'supplier',
            header: getTtl('Supplier', ln), meta: {
                filterVariant: 'selectSupplier',
            },
        },
        {
			accessorKey: 'originSupplier', header: 'Original supplier',
		},
        { accessorKey: 'order', header: getTtl('PO', ln) + '#' },
        { accessorKey: 'salesInvoice', header: 'Sales Invoice' },
        { accessorKey: 'invoice', header: getTtl('Invoice', ln) },
        { accessorKey: 'description', header: getTtl('Description', ln) },
        { accessorKey: 'qnty', header: getTtl('Weight', ln), cell: (props) => <p>{setDecimals(props.getValue())}</p>, },
        {
            accessorKey: 'unitPrc', header: getTtl('Price', ln),
            cell: (props) => <p>{showAmount(props)}</p>,
        },
        {
            accessorKey: 'total', header: getTtl('Total', ln),
            cell: (props) => <p>{showAmount(props)}</p>,
        },
        {
            accessorKey: 'paidNotPaid', header: 'Paid/Unpaid',
            meta: {
                filterVariant: 'paidNotPaid',
            },
            filterFn: exactMatchFilter,
        },
    ];

    const getFormatted = (arr) => {  //convert id's to values

        let newArr = []
        const gQ = (z, y, x) => settings[y][y].find(q => q.id === z)?.[x] || ''

        arr.forEach(row => {
            let formattedRow = {
                ...row,
                supplier: gQ(row.supplier, 'Supplier', 'nname'),
                originSupplier: gQ(row.originSupplier, 'Supplier', 'nname'),

            }

            newArr.push(formattedRow)
        })

        return newArr;
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
            accessorKey: 'supplier', header: getTtl('Supplier', ln),
            cell: (props) => <p>{gQ(props.getValue('supplier'), 'Supplier', 'nname') || props.getValue('supplier')}</p>
        },
        {
            accessorKey: 'total', header: getTtl('Total', ln),
            cell: (props) => <p>{showAmount1(props)}</p>
        }
    ];


    return (
        <div className="container mx-auto px-2 md:px-8 xl:px-10 pb-8 md:pb-0 mt-16 md:mt-0">
            {Object.keys(settings).length === 0 ? <Spinner /> :
                <>

                    <div className="border border-slate-200 rounded-xl p-4 mt-8 shadow-md relative">
                        <div className='flex items-center justify-between flex-wrap pb-2'>
                            <div className="text-3xl p-1 pb-2 text-slate-500"> {getTtl('Misc Invoices', ln)} </div>
                            <div className='flex group'>
                                <DateRangePicker />
                                <Tooltip txt='Select Dates Range' />
                            </div>

                        </div>

                        <Customtable data={getFormatted(data)} columns={propDefaults} SelectRow={SelectRow}
                            excellReport={EXD(data.filter(x => filteredData.map(z => z.id).includes(x.id)), settings, getTtl('Misc Invoices', ln), ln)}
                            setFilteredData={setFilteredData}
                        />

                        <div className='flex gap-20 flex-wrap'>
                            <div className='pt-8'>
                                <TableTotals data={totals} columns={colsTotals} expensesData={filteredData}
                                    settings={settings} title='Sumarry - Unpaid invoices' filt='reduced' />
                            </div>

                            <div className='pt-8'>
                                <TableTotals data={totalsAll} columns={colsTotals} expensesData={filteredData}
                                    settings={settings} title='Sumarry' filt='full' />
                            </div>
                        </div>

                    </div>
                </>}

        </div>
    );

};

export default Contracts;

