'use client';
import { useContext, useEffect, useState, useCallback, useMemo } from 'react';
import Customtable from './newTable';
import TableTotals from './totals/tableTotals';
import MyDetailsModal from './modals/dataModal.js'
import { SettingsContext } from "../../../contexts/useSettingsContext";

import Toast from '../../../components/toast.js'
import { ExpensesContext } from "../../../contexts/useExpensesContext";

import { loadData } from '../../../utils/utils'

import Spinner from '../../../components/spinner';
import VideoLoader from '../../../components/videoLoader';
import { TableSkeleton } from "../../../components/skeletons";
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
import SplitControl from '../../../components/SplitControl';
import { splitStatusOf } from '../../../utils/splitUtils';
import { ensureSplitNotificationsBatch } from '../../../utils/utils';
import { Split } from 'lucide-react';




const Expenses = () => {

	const { settings, dateSelect, setDateYr, loading, setLoading, ln } = useContext(SettingsContext);
	const { expensesData, valueExp, setValueExp, setIsOpen, isOpen, setExpensesData } = useContext(ExpensesContext);
	const { uidCollection, currentUser, logActivity } = UserAuth();
	const router = useRouter();
	const searchParams = useSearchParams();
	const [totals, setTotals] = useState([])
	const [totalsAll, setTotalsAll] = useState([])
	const [filteredId, setFilteredId] = useState([])
	const [highlightId, setHighlightId] = useState(null)
	const { upsertSourceItems } = useGlobalSearch();
	const [isEditMode, setIsEditMode] = useState(false);
	const [onlyUnsplit, setOnlyUnsplit] = useState(false);

	// Persist a split change on one row: optimistic local update + Firestore patch,
	// reverting the local state if the write fails.
	const persistSplit = useCallback(async (row, split) => {
		const prev = expensesData;
		setExpensesData(prev.map(x => x.id === row.id ? { ...x, split: split || null } : x));
		try {
			await updateExpenseField(uidCollection, row.id, row.date, { split: split || null });
		} catch (e) {
			console.error(e);
			setExpensesData(prev);
		}
	}, [expensesData, uidCollection, setExpensesData]);

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

			// Re-raise standing "needs IMS/GIS split" alerts (idempotent — never duplicates).
			// Batched: one existence query pass instead of one getDoc per pending expense.
			ensureSplitNotificationsBatch(uidCollection,
				dt.filter(z => z.split?.status === 'pending').slice(0, 50).map(z => ({
					entityType: 'expense', entityId: z.id,
					entityLabel: `Expense ${z.expense ? '#' + z.expense : ''}`.trim(),
					amount: Number(z.amount) || 0, currency: z.cur,
				})));
		}

		if (!uidCollection) return;
		Load();

	}, [dateSelect, uidCollection])


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

	const gQ = useCallback((z, y, x) => settings[y][y].find(q => q.id === z)?.[x] || '', [settings])

	const showAmount1 = useCallback((x) => {
		const cur = gQ(x.row.original.cur, 'Currency', 'cur') || 'USD';
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: cur,
			minimumFractionDigits: 2
		}).format(x.getValue())
	}, [gQ])

	const caseInsensitiveEquals = (row, columnId, filterValue) =>
		row.getValue(columnId).toLowerCase() === filterValue.toLowerCase();

	// Memoized: cells read settings/ln (labels, options), the settings-derived
	// showAmount1, and the split cell reads uidCollection/currentUser/logActivity/
	// persistSplit — all deps below.
	const propDefaults = useMemo(() => Object.keys(settings).length === 0 ? [] : [
		{ accessorKey: 'lstSaved', header: getTtl('Last Saved', ln), cell: (props) => <p className="whitespace-nowrap">{dateFormat(props.getValue(), 'dd-mmm-yy HH:MM')}</p>, meta: { excludeFromQuickSum: true } },
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
		{ accessorKey: 'salesInv', header: getTtl('SalesInvoices', ln), meta: { excludeFromQuickSum: true } },
		{ accessorKey: 'poSupplierOrder', header: getTtl('PoOrderNo', ln), meta: { excludeFromQuickSum: true } },
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
			cell: (props) => {
				const isEditMode = !!props.table?.options?.meta?.isEditMode;
				if (isEditMode) return <EditableCell {...props} />;
				return <span>{showAmount1(props)}</span>;
			},
			meta: { filterVariant: 'range' },
		},
		{
			id: 'split',
			accessorFn: (row) => row.split?.status || 'none',
			header: 'IMS / GIS',
			enableColumnFilter: false,
			enableGlobalFilter: false,
			enableSorting: false,
			meta: { excludeFromQuickSum: true },
			size: 170,
			cell: (props) => {
				const r = props.row.original;
				return (
					<SplitControl
						row={r}
						entityType='expense'
						entityLabel={`Expense ${r.expense ? '#' + r.expense : ''}`.trim()}
						amount={Number(r.amount) || 0}
						currency={r.cur}
						uidCollection={uidCollection}
						currentUser={currentUser}
						logActivity={logActivity}
						onPersist={(split) => persistSplit(r, split)}
					/>
				);
			},
		},

		{ accessorKey: 'expense', header: getTtl('Expense Invoice', ln) + '#', cell: EditableCell, meta: { excludeFromQuickSum: true } },
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

	], [settings, ln, uidCollection, currentUser, logActivity, persistSplit, showAmount1]);

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
	// Stable table data + prebuilt Excel report: identical rows/export, recomputed
	// only when their inputs change instead of on every render.
	const tableData = useMemo(
		() => expensesData.map(x => ({ ...x, poSupplierOrder: x.poSupplier?.order })).filter(x => !onlyUnsplit || splitStatusOf(x) === 'pending'),
		[expensesData, onlyUnsplit]
	);

	const excelReport = useMemo(() => {
		const ids = new Set(filteredId);
		return EXD(expensesData.filter(x => ids.has(x.id)).map(x => ({ ...x, poSupplierOrder: x.poSupplier?.order })),
			settings, getTtl('Expenses', ln), ln);
	}, [expensesData, filteredId, settings, ln]);

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
			<div className="mx-auto w-full max-w-full px-1 md:px-2 pb-4 mt-[72px]">
				{Object.keys(settings).length === 0 ? <TableSkeleton /> :
					<>
						<Toast />
						<VideoLoader loading={loading} fullScreen={true} />
						{/* Main Card */}
						<div className="rounded-2xl p-3 sm:p-5 mt-8 border border-[#b8ddf8] w-full bg-[#f8fbff]">

							{/* Header Section */}
							<div className='flex items-center justify-between flex-wrap gap-2 pb-2'>
								<h1 className="text-[var(--chathams-blue)] font-poppins responsiveTextTitle font-medium border-l-4 border-[var(--chathams-blue)] pl-2">
									{getTtl('Expenses', ln)}
								</h1>
								{(() => {
									const pendingCount = expensesData.filter(x => splitStatusOf(x) === 'pending').length;
									return (
										<button
											type='button'
											onClick={() => setOnlyUnsplit(v => !v)}
											title='Show only invoices not yet split between IMS & GIS'
											className='inline-flex items-center gap-1.5 rounded-full transition-colors'
											style={{
												fontSize: '0.66rem', padding: '4px 12px',
												color: onlyUnsplit ? 'white' : 'var(--chathams-blue)',
												background: onlyUnsplit ? 'var(--endeavour)' : '#f8fbff',
												border: '1px solid #b8ddf8',
											}}
										>
											<Split className='w-3.5 h-3.5' />
											Needs IMS/GIS split
											<span className='rounded-full px-1.5' style={{ fontSize: '0.6rem', background: onlyUnsplit ? 'rgba(255,255,255,0.25)' : '#dbeeff', color: onlyUnsplit ? 'white' : 'var(--endeavour)' }}>
												{pendingCount}
											</span>
										</button>
									);
								})()}
							</div>

							{/* Table Component */}
							<Customtable
								data={tableData}
								columns={propDefaults}
								SelectRow={SelectRow}
								invisible={invisible}
								excellReport={excelReport}
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

