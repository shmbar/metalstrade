'use client';
import { useContext, useEffect, useState } from 'react';

import { SettingsContext } from "../../../contexts/useSettingsContext";
import Spinner from '../../../components/spinner';
import { UserAuth } from "../../../contexts/useAuthContext"
import { EXD } from './excel'
import dateFormat from "dateformat";
import { getTtl } from '../../../utils/languages';
import { getD, loadCompanyExpenses, loadDataInvoices, updateSpecialInvoiceField, loadInvoice, loadStockData } from '../../../utils/utils';
import ContractModal from '../contracts/modals/dataModal';
import { ContractsContext } from '../../../contexts/useContractsContext';
import { InvoiceContext } from '../../../contexts/useInvoiceContext';
import DateRangePicker from '../../../components/dateRangePicker';
import Tooltip from '../../../components/tooltip';
import Customtable from './newTable';
import TableTotals from './totals/tableTotals';
import { TableSkeleton } from "../../../components/skeletons";
import Modal from '../../../components/modal';

// Manual IMS category buckets for Misc Invoices (client request: personal / random / shipments).
const MISC_CATS = [
    { id: 'personal', label: 'Personal' },
    { id: 'random', label: 'Random' },
    { id: 'shipments', label: 'Shipments' },
];

// Inline dropdown used in the Category column. stopPropagation keeps row click/select
// handlers from firing while choosing. '' (unset) shows as “—”.
const CategorySelect = ({ id, value, onChange }) => (
    <select
        value={value || 'none'}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => { e.stopPropagation(); onChange(id, e.target.value === 'none' ? '' : e.target.value); }}
        className="bg-transparent outline-none cursor-pointer responsiveTextTable"
        style={{ color: 'var(--port-gore)', fontFamily: 'inherit' }}
    >
        <option value="none">—</option>
        {MISC_CATS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
    </select>
);

const SpecialInvoices = () => {
    const { settings, dateSelect, setDateYr, setLoading, loading, ln } = useContext(SettingsContext);
    const { uidCollection } = UserAuth();
    const { valueCon, setValueCon, isOpenCon, setIsOpenCon } = useContext(ContractsContext);
    const { blankInvoice } = useContext(InvoiceContext);
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

        if (!uidCollection) return;
        Load();

    }, [dateSelect, uidCollection])


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

    const [detail, setDetail] = useState(null);
    // Open the originating contract in its editable modal so corrections can be made there
    // (they re-flow to this misc invoice on save). Fall back to a read-only detail popup if
    // the source contract can't be resolved (e.g. older rows without a stock link).
    const SelectRow = async (row) => {
        try {
            const stock = await loadStockData(uidCollection, 'id', [row.id]);
            const cd = stock?.[0]?.contractData;
            if (cd?.id) {
                const contract = await loadInvoice(uidCollection, 'contracts', { id: cd.id, date: cd.date });
                if (contract && Object.keys(contract).length > 0) {
                    setValueCon(contract);
                    blankInvoice();
                    setIsOpenCon(true);
                    return;
                }
            }
        } catch (e) { console.error(e); }
        setDetail(row);
    };

    // Persist the manual category tag and reflect it immediately in the table.
    const handleCategoryChange = async (id, category) => {
        setData(prev => prev.map(r => r.id === id ? { ...r, category } : r));
        await updateSpecialInvoiceField(uidCollection, id, { category });
    };

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
            accessorKey: 'date', header: getTtl('Date', ln), cell: (props) => <p>{dateFormat(props.getValue(), 'dd.mm.yy')}</p>,
            meta: {
                filterVariant: 'dates',
                excludeFromQuickSum: true,
            }, filterFn: 'dateBetweenFilterFn'
        },
        {
            accessorKey: 'supplier',
            header: getTtl('Supplier', ln), meta: {
                filterVariant: 'selectSupplier',
            },
        },
        { accessorKey: 'originSupplier', header: 'Original supplier' },
        { accessorKey: 'order', header: getTtl('PO', ln) + '#', meta: { excludeFromQuickSum: true } },
        { accessorKey: 'salesInvoice', header: 'Sales Invoice', meta: { excludeFromQuickSum: true } },
        { accessorKey: 'invoice', header: getTtl('Invoice', ln), meta: { excludeFromQuickSum: true } },
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
            accessorKey: 'paidNotPaid', header: 'Status',
            meta: {
                filterVariant: 'paidNotPaid',
            },
            filterFn: exactMatchFilter,
        },
        {
            id: 'category', header: 'Category',
            accessorFn: (row) => row.category || 'none',
            cell: (props) => <CategorySelect id={props.row.original.id} value={props.row.original.category} onChange={handleCategoryChange} />,
            meta: { excludeFromQuickSum: true },
            enableColumnFilter: false,
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
        <div className="w-full " style={{ background: "#f8fbff" }}>
            <div className="mx-auto w-full max-w-full px-1 md:px-2 pb-4 mt-[72px]">
                {Object.keys(settings).length === 0 ? <TableSkeleton /> :
                    <>
                        {/* Main Card */}
                        <div className="rounded-2xl p-3 sm:p-5 mt-8 border border-[#b8ddf8] shadow-xl w-full bg-[#f8fbff]">
                            {/* Header Section */}
                            <div className='flex items-center justify-between flex-wrap gap-2 pb-2'>
                                <h1 className="text-[var(--chathams-blue)] font-poppins responsiveTextTitle font-medium border-l-4 border-[var(--chathams-blue)] pl-2">
                                    {getTtl('Misc Invoices', ln)}
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
                                data={getFormatted(data)}
                                columns={propDefaults}
                                SelectRow={SelectRow}
                                excellReport={EXD(
                                    data.filter(x => filteredData.map(z => z.id).includes(x.id)),
                                    settings,
                                    getTtl('Misc Invoices', ln),
                                    ln
                                )}
                                setFilteredData={setFilteredData}
                            />

                            {/* Totals Section */}
                            <div className='flex flex-col md:flex-row w-full gap-4 mt-6 '>
                                <div className='w-full md:w-1/2'>
                                    <TableTotals
                                        data={totals}
                                        columns={colsTotals}
                                        expensesData={filteredData}
                                        settings={settings}
                                        title='Summary - Unpaid invoices'
                                        filt='reduced'
                                        totalsOnly={true}
                                    />
                                </div>
                                <div className='w-full md:w-1/2'>
                                    <TableTotals
                                        data={totalsAll}
                                        columns={colsTotals}
                                        expensesData={filteredData}
                                        settings={settings}
                                        title='Summary'
                                        filt='full'
                                    />
                                </div>
                            </div>
                        </div>
                        {detail && (
                            <Modal isOpen={!!detail} setIsOpen={() => setDetail(null)} title='Misc Invoice' w='max-w-lg'>
                                <div className='p-4 grid grid-cols-2 gap-x-4 gap-y-2.5'>
                                    {[
                                        ['Company', detail.compName],
                                        ['Date', detail.date ? dateFormat(detail.date, 'dd.mm.yy') : ''],
                                        ['Supplier', detail.supplier],
                                        ['Original supplier', detail.originSupplier],
                                        ['PO #', detail.order],
                                        ['Sales Invoice', detail.salesInvoice],
                                        ['Invoice', detail.invoice],
                                        ['Description', detail.description],
                                        ['Weight', setDecimals(detail.qnty)],
                                        ['Price', new Intl.NumberFormat('en-US', { style: 'currency', currency: gQ(detail.cur, 'Currency', 'cur') || 'USD', minimumFractionDigits: 2 }).format(Number(detail.unitPrc) || 0)],
                                        ['Total', new Intl.NumberFormat('en-US', { style: 'currency', currency: gQ(detail.cur, 'Currency', 'cur') || 'USD', minimumFractionDigits: 2 }).format(Number(detail.total) || 0)],
                                        ['Status', detail.paidNotPaid],
                                        ['Category', (MISC_CATS.find(c => c.id === detail.category) || {}).label || 'Uncategorized'],
                                    ].map(([k, v]) => (
                                        <div key={k} className='flex flex-col'>
                                            <span className='uppercase tracking-wide text-[var(--regent-gray)]' style={{ fontSize: '0.58rem' }}>{k}</span>
                                            <span className='text-[var(--port-gore)] font-medium break-words responsiveTextTable'>{(v === 0 ? '0' : v) || '—'}</span>
                                        </div>
                                    ))}
                                </div>
                            </Modal>
                        )}
                        {valueCon && <ContractModal isOpen={isOpenCon} setIsOpen={setIsOpenCon} />}
                    </>
                }
            </div>
        </div>
    );
};

export default SpecialInvoices;

