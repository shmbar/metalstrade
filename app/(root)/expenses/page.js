'use client';
import { useContext, useEffect } from 'react';
import Customtable from '../contracts/newTable';
import MyDetailsModal from './modals/dataModal.js'
import { SettingsContext } from "@contexts/useSettingsContext";
import MonthSelect from '@components/monthSelect';
import Toast from '@components/toast.js'
import { ExpensesContext } from "@contexts/useExpensesContext";

import { loadData } from '@utils/utils'

import Spinner from '@components/spinner';
import { UserAuth } from "@contexts/useAuthContext"
import Spin from '@components/spinTable';
import { EXD } from './excel'
import dateFormat from "dateformat";
import { getTtl } from '@utils/languages';


const Expenses = () => {


	const { settings, dateSelect, setDateYr, loading, setLoading, ln } = useContext(SettingsContext);
	const { expensesData, valueExp, setValueExp, setIsOpen, isOpen, setExpensesData } = useContext(ExpensesContext);
	const { uidCollection } = UserAuth();

	useEffect(() => {

		const Load = async () => {
			setLoading(true)
			let dt = await loadData(uidCollection, 'expenses', dateSelect);
			setExpensesData(dt)
			setLoading(false)
		}

		Load();

	}, [dateSelect])

	let showAmount = (x) => {

		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: x.row.original.cur,
			minimumFractionDigits: 2
		}).format(x.getValue())
	}

	let propDefaults = Object.keys(settings).length === 0 ? [] : [
		{ accessorKey: 'lstSaved', header: getTtl('Last Saved', ln), enableSorting: false, cell: (props) => <p>{dateFormat(props.getValue(), 'dd-mmm-yy HH:MM')}</p> },
		{ accessorKey: 'supplier', header: getTtl('Vendor', ln) },
		{ accessorKey: 'date', header: getTtl('Date', ln) , enableSorting: false, cell: (props) => <p>{dateFormat(props.getValue().startDate, 'dd-mmm-yy')}</p> },
		{ accessorKey: 'salesInv', header: getTtl('SalesInvoices', ln) },
		{ accessorKey: 'poSupplierOrder', header: getTtl('PoOrderNo', ln)},
		{ accessorKey: 'cur', header: getTtl('Currency', ln) },
		{ accessorKey: 'amount', header: getTtl('Amount', ln) , cell: (props) => <p>{showAmount(props)}</p> },
		{ accessorKey: 'expense', header: getTtl('Expense Invoice', ln)+' #' },
		{ accessorKey: 'expType', header: getTtl('Expense Type', ln) },
		{ accessorKey: 'paid', header: getTtl('Paid / Unpaid', ln) },
		{ accessorKey: 'comments', header: getTtl('Comments', ln) },
	];

	let invisible = ['lstSaved', 'comments'].reduce((acc, key) => {
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

	const SelectRow = (row) => {
		setValueExp(expensesData.find(x => x.id === row.id));
		setDateYr(row.date.startDate.substring(0, 4));
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
							<MonthSelect />
						</div>

						<Customtable data={getFormatted(expensesData.map(x => ({ ...x, poSupplierOrder: x.poSupplier.order })))}
							columns={propDefaults} SelectRow={SelectRow}
							invisible={invisible}
							excellReport={EXD(expensesData.map(x => ({ ...x, poSupplierOrder: x.poSupplier.order })),
								settings, getTtl('Expenses', ln), ln)} />

					</div>

					{valueExp && <MyDetailsModal isOpen={isOpen} setIsOpen={setIsOpen}
						title={getTtl('Existing Expense', ln)} />}
				</>}
		</div>
	);
};

export default Expenses;

