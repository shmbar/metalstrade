'use client';
import { useContext, useEffect, useState } from 'react';
import Customtable from './newTable';
import TableTotals from './totals/tableTotals';
import MyDetailsModal from './modals/dataModal.js'
import { SettingsContext } from "@contexts/useSettingsContext";

import Toast from '@components/toast.js'
import { ExpensesContext } from "@contexts/useExpensesContext";

import { loadData } from '@utils/utils'

import Spinner from '@components/spinner';
import { UserAuth } from "@contexts/useAuthContext"
import Spin from '@components/spinTable';
import { EXD } from './excel'
import dateFormat from "dateformat";
import { getTtl } from '@utils/languages';
import DateRangePicker from '@components/dateRangePicker';
import Tooltip from '@components/tooltip';



const Expenses = () => {

	const { settings, dateSelect, setDateYr, loading, setLoading, ln } = useContext(SettingsContext);
	const { expensesData, valueExp, setValueExp, setIsOpen, isOpen, setExpensesData } = useContext(ExpensesContext);
	const { uidCollection } = UserAuth();
	const [totals, setTotals] = useState([])
	const [totalsAll, setTotalsAll] = useState([])
	const [filteredId, setFilteredId] = useState([])

	useEffect(() => {

		const Load = async () => {
			setLoading(true)
			let dt = await loadData(uidCollection, 'expenses', dateSelect);
			dt = dt.map(z => ({ ...z, amount: parseFloat(z.amount) }))

			setExpensesData(dt)
			setFilteredId(dt.map(x => x.id))
			setLoading(false)
		}

		Load();

	}, [dateSelect])


	useEffect(() => {

		const groupedTotals = expensesData.filter(x => filteredId.includes(x.id)).
			filter(z => z.paid === "222").
			reduce((acc, { supplier, cur, amount }) => {


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

		const totals1 = [...groupedTotals.totalsUs, ...groupedTotals.totalsEU];

		const groupedTotalsAll = expensesData.filter(x => filteredId.includes(x.id)).
			reduce((acc, { supplier, cur, amount }) => {


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

		const totalsAll = [...groupedTotalsAll.totalsUs, ...groupedTotalsAll.totalsEU];

		setTotals(totals1);
		setTotalsAll(totalsAll);

	}, [filteredId])



	let showAmount = (x) => {

		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: x.row.original.cur,
			minimumFractionDigits: 2
		}).format(x.getValue())
	}

	const gQ = (z, y, x) => settings[y][y].find(q => q.id === z)?.[x] || ''

	let showAmount1 = (x) => {

		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: gQ(x.row.original.cur, 'Currency', 'cur'),
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
		{ accessorKey: 'salesInv', header: getTtl('SalesInvoices', ln) },
		{ accessorKey: 'poSupplierOrder', header: getTtl('PoOrderNo', ln) },
		{ accessorKey: 'cur', header: getTtl('Currency', ln) },
		{
			accessorKey: 'amount', header: getTtl('Amount', ln), cell: (props) => <p>{showAmount(props)}</p>, meta: {
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

	let invisible = ['lstSaved', 'comments'].reduce((acc, key) => {
		acc[key] = false;
		return acc;
	}, {});


	let colsTotals = Object.keys(settings).length === 0 ? [] : [
		{
			accessorKey: 'supplier', header: getTtl('Vendor', ln),
			cell: (props) => <p>{gQ(props.getValue('supplier'), 'Supplier', 'nname')}</p>
		},
		{
			accessorKey: 'amount', header: getTtl('Amount', ln),
			cell: (props) => <p>{showAmount1(props)}</p>
		}
	];


	const getFormatted = (arr) => {  //convert id's to values

		let newArr = []

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

	const SelectRow = (row) => {
		setValueExp(expensesData.find(x => x.id === row.id));
		setDateYr(row.dateRange?.startDate?.substring(0, 4));
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
							<div className="text-3xl p-1 pb-2 text-slate-500">{getTtl('Expenses', ln)}</div>
							<div className='flex group'>
								<DateRangePicker />
								<Tooltip txt='Select Dates Range' />
							</div>
						</div>

						<Customtable data={getFormatted(expensesData.map(x => ({ ...x, poSupplierOrder: x.poSupplier?.order })))}
							columns={propDefaults} SelectRow={SelectRow}
							invisible={invisible}
							excellReport={EXD(expensesData.filter(x => filteredId.includes(x.id)).map(x => ({ ...x, poSupplierOrder: x.poSupplier?.order })),
								settings, getTtl('Expenses', ln), ln)}
							setFilteredId={setFilteredId}
						/>


						<div className='flex gap-4 2xl:gap-20 flex-wrap'>
							<div className='pt-8'>
								<TableTotals data={totals} columns={colsTotals} expensesData={expensesData}
									settings={settings} filt='reduced' title='Summary - Unpaid invoices' />
							</div>

							<div className='pt-8'>
								<TableTotals data={totalsAll} columns={colsTotals} expensesData={expensesData}
									settings={settings} filt='full' title='Summary' />
							</div>

						</div>


					</div>

					{valueExp && <MyDetailsModal isOpen={isOpen} setIsOpen={setIsOpen}
						title={getTtl('Existing Expense', ln)} />}
				</>}
		</div>
	);
};

export default Expenses;

