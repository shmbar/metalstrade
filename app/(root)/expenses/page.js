'use client';
import { useContext, useEffect, useState, useCallback } from 'react';
import Customtable from './newTable';
import TableTotals from './totals/tableTotals';
import MyDetailsModal from './modals/dataModal.js'
import { SettingsContext } from "../../../contexts/useSettingsContext";

import Toast from '../../../components/toast.js'
import { ExpensesContext } from "../../../contexts/useExpensesContext";

import { loadData } from '../../../utils/utils'

import Spinner from '../../../components/spinner';
import VideoLoader from '../../../components/videoLoader';
import { UserAuth } from "../../../contexts/useAuthContext"
import Spin from '../../../components/spinTable';
import { EXD } from './excel'
import dateFormat from "dateformat";
import { getTtl } from '../../../utils/languages';
import DateRangePicker from '../../../components/dateRangePicker';
import Tooltip from '../../../components/tooltip';
//import EditableCell from '../../../components/table/EditableCell';
import useInlineEdit from '../../../hooks/useInlineEdit';
import { useRouter, useSearchParams } from 'next/navigation';
import EditableCell from '../../../components/table/inlineEditing/EditableCell';
import EditableSelectCell from '../../../components/table/inlineEditing/EditableSelectCell';
import { updateExpenseField } from '../../../utils/utils';
import { useGlobalSearch } from '../../../contexts/useGlobalSearchContext';




const Expenses = () => {

	const { settings, dateSelect, setDateYr, loading, setLoading, ln } = useContext(SettingsContext);
	const { expensesData, valueExp, setValueExp, setIsOpen, isOpen, setExpensesData } = useContext(ExpensesContext);
	const { uidCollection } = UserAuth();
	const router = useRouter();
	const searchParams = useSearchParams();
	const [totals, setTotals] = useState([])
	const [totalsAll, setTotalsAll] = useState([])
	const [filteredId, setFilteredId] = useState([])
	const [highlightId, setHighlightId] = useState(null)
		const { upsertSourceItems } = useGlobalSearch();
const [isEditMode, setIsEditMode] = useState(false);

	// Inline editing hook
	const { updateField } = useInlineEdit('expenses', setExpensesData);

	// Handle inline cell save
	const handleCellSave = useCallback(async (rowData, field, value) => {
		const originalItem = expensesData.find(e => e.id === rowData.id);
		if (originalItem) {
			await updateField(originalItem, field, value);
		}
	}, [expensesData, updateField]);

	// Handle openId from URL (from global search) - highlight row only
	useEffect(() => {
		const openId = searchParams.get('openId');
		if (openId && expensesData.length > 0) {
			const item = expensesData.find(e => e.id === openId);
			if (item) {
				// Highlight the row
				setHighlightId(openId);
				setTimeout(() => setHighlightId(null), 3000);
				// Clear the URL parameter
				router.replace('/expenses', { scroll: false });
			}
		}
	}, [searchParams, expensesData]);

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
useEffect(() => {
  if (!expensesData || !expensesData.length || Object.keys(settings).length === 0) {
    upsertSourceItems('expenses', []);
    return;
  }

  const items = expensesData.map(e => ({
    key: `expense_${e.id}`,
    route: '/expenses',
    rowId: e.id,

    title: `Expense • ${gQ(e.supplier, 'Supplier', 'nname') || ''} • ${e.expense || ''}`,
    subtitle: `${e.salesInv || ''} • ${e.amount ?? ''} • ${e.comments || ''}`,

    // This is what we actually search against:
    searchText: [
      gQ(e.supplier, 'Supplier', 'nname'),
      e.expense,
      e.salesInv,
      e.comments,
      e.amount,
      e.cur,
      e.expType,
      e.paid
    ].filter(Boolean).join(' ')
  }));

  upsertSourceItems('expenses', items);
}, [expensesData, settings]);



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
    accessorKey: 'supplier',
    header: getTtl('Vendor', ln),
    cell: EditableSelectCell,
    meta: {
      filterVariant: 'selectSupplier',
      options: settings.Supplier?.Supplier?.map(s => ({ value: s.id, label: s.nname })) ?? []
    }
  },
		{
			accessorKey: 'date', header: getTtl('Date', ln), cell: (props) => <p>{dateFormat(props.getValue(), 'dd.mm.yy')}</p>,
			meta: {
				filterVariant: 'dates',
			},
			filterFn: 'dateBetweenFilterFn'
		},
		{ accessorKey: 'salesInv', header: getTtl('SalesInvoices', ln) },
		{ accessorKey: 'poSupplierOrder', header: getTtl('PoOrderNo', ln) },
		  {
    accessorKey: 'cur',
		header: '$/€',
    cell: EditableSelectCell,
    meta: {
      options: settings.Currency?.Currency?.map(c => ({ value: c.id, label: c.cur })) ?? []
    }
  },
	{
  accessorKey: 'amount',
  header: getTtl('Amount', ln),
  cell: EditableCell,
  meta: { filterVariant: 'range' },
},

		 { accessorKey: 'expense', header: getTtl('Expense Invoice', ln) + '#', cell: EditableCell },
		  {
    accessorKey: 'expType',
    header: getTtl('Expense Type', ln),
    cell: EditableSelectCell,
    meta: {
      options: settings.Expenses?.Expenses?.map(e => ({ value: e.id, label: e.expType })) ?? []
    }
  },
	{
  accessorKey: 'paid',
  header: getTtl('Paid / Unpaid', ln),
  cell: EditableSelectCell,
  meta: {
    filterVariant: 'paidNotPaidExp',
    options: settings.ExpPmnt?.ExpPmnt?.map(p => ({ value: p.id, label: p.paid })) ?? [],
  },
  filterFn: caseInsensitiveEquals,
},

		{ accessorKey: 'comments', header: getTtl('Comments', ln), cell: EditableCell },

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
const onCellUpdate = async ({ rowIndex, columnId, value }) => {
  const row = expensesData[rowIndex];
  if (!row?.id) return;

  // fix numeric
  const newValue = columnId === "amount" ? (parseFloat(value) || 0) : value;

  // optimistic UI update
  const prev = expensesData;
  const next = prev.map((x, i) => (i === rowIndex ? { ...x, [columnId]: newValue } : x));
  setExpensesData(next);

  try {
    await updateExpenseField(uidCollection, row.id, row.date, { [columnId]: newValue });
  } catch (e) {
    console.error(e);
    setExpensesData(prev); // revert on fail
  }
};

	return (
			<div className="w-full " style={{ background: "#f8fbff" }}>
			<div className="mx-auto w-full max-w-[98%] px-1 sm:px-2 md:px-3 pb-4 mt-[72px]">
				{Object.keys(settings).length === 0 ? <VideoLoader loading={true} fullScreen={true} /> :
					<>
						<Toast />
							<VideoLoader loading={loading} fullScreen={true} />
						{/* Main Card */}
						<div className="rounded-2xl p-3 sm:p-5 mt-8 border border-[#b8ddf8]  w-full backdrop-blur-[2px] bg-white">
							
							{/* Header Section */}
							<div className='flex items-center justify-between flex-wrap gap-2 pb-2'>
								<h1 className="text-[14px] text-[var(--chathams-blue)] font-poppins responsiveTextTitle border-l-4 border-[var(--chathams-blue)] pl-2" style={{ fontSize: '14px' }}>
									{getTtl('Expenses', ln)}
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
								data={expensesData.map(x => ({ ...x, poSupplierOrder: x.poSupplier?.order }))}
								columns={propDefaults} 
								SelectRow={SelectRow}
								invisible={invisible}
								excellReport={EXD(expensesData.filter(x => filteredId.includes(x.id)).map(x => ({ ...x, poSupplierOrder: x.poSupplier?.order })),
									settings, getTtl('Expenses', ln), ln)}
								setFilteredId={setFilteredId}
								highlightId={highlightId} 
								onCellUpdate={onCellUpdate}
							/>

							{/* Totals Section */}
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

						{/* Modals */}
						{valueExp && (
							<MyDetailsModal 
								isOpen={isOpen} 
								setIsOpen={setIsOpen}
								title={getTtl('Existing Expense', ln)} 
							/>
						)}
					</>
				}
			</div>
		</div>
	);
};

export default Expenses;

