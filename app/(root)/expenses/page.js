'use client';
import { useContext, useEffect, useState, useCallback, useMemo , useRef } from 'react';
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
import { Split, Wallet, Factory } from 'lucide-react';
import KpiStrip from '../../../components/KpiStrip';
import { NameCell } from '../../../components/Avatar';
import { useUndo } from '@hooks/useUndo';




const Expenses = () => {

	const { settings, dateSelect, setDateYr, loading, setLoading, ln , setToast } = useContext(SettingsContext);
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
				avatar: true,
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
			header: getTtl('Currency', ln),
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
			size: 130,
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
			cell: (props) => <NameCell name={gQ(props.getValue(), 'Supplier', 'nname')} />
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

	// ── Undo of inline cell edits ────────────────────────────────────────────
	// Read through a ref: an undo runs long after the edit that recorded it, by
	// which time the captured `expensesData` is stale.
	const expensesDataRef = useRef(expensesData); expensesDataRef.current = expensesData;
	const { record: recordUndo, undo, count: undoCount, busy: undoBusy, lastLabel: undoLabel } = useUndo();

	const columnLabel = (columnId) => {
		const h = propDefaults.find(c => (c.accessorKey ?? c.id) === columnId)?.header;
		return typeof h === 'string' ? h : columnId;
	};

	// One field on one document — the same call whichever direction it goes.
	const writeCell = async ({ rowId, docDate, columnId, value }) => {
		const prev = expensesDataRef.current;
		setExpensesData(prev.map(x => x.id === rowId ? { ...x, [columnId]: value } : x));
		try {
			await updateExpenseField(uidCollection, rowId, docDate, { [columnId]: value });
			return true;
		} catch (e) {
			console.error(e);
			setExpensesData(prev); // revert on fail
			return false;
		}
	};

	const onCellUpdate = async ({ rowIndex, columnId, value }) => {
		// tableData, NOT expensesData: the table renders tableData, which drops rows
		// when the "unsplit only" filter is on, so rowIndex counts rows in THAT
		// list. Resolving it against the raw array meant that, with the filter
		// active, an inline edit wrote to a different expense than the one clicked.
		const row = tableData[rowIndex];
		if (!row?.id) return;

		// fix numeric
		const newValue = columnId === "amount" ? (parseFloat(value) || 0) : value;
		const before = row[columnId];
		const ok = await writeCell({ rowId: row.id, docDate: row.date, columnId, value: newValue });

		// Only offer to undo a change that actually landed.
		if (ok) {
			recordUndo({
				label: `${columnLabel(columnId)} on expense ${row.expense ?? ''}`.trim(),
				apply: () => writeCell({ rowId: row.id, docDate: row.date, columnId, value: before }),
			});
		}
	};

	// useUndo puts a failed entry back on the stack so the button can retry — but
	// the user has to be told the change was NOT reversed.
	const handleUndo = async () => {
		try {
			const entry = await undo();
			if (entry) setToast({ show: true, text: `Undone — ${entry.label}`, clr: 'success' });
		} catch (e) {
			setToast({ show: true, text: `Could not undo — nothing was changed. (${e?.message || e})`, clr: 'fail' });
		}
	};

	return (
		<div className="w-full " style={{ background: "var(--bg-page)" }}>
			<div className="mx-auto w-full max-w-full px-1 md:px-2 pb-4 mt-[72px]">
				{Object.keys(settings).length === 0 ? <TableSkeleton /> :
					<>
						<Toast />
						<VideoLoader loading={loading} fullScreen={true} />
						{/* Page header */}
						<div className="page-header mt-6 mb-3 px-1">
							<h1 className="text-display">{getTtl('Expenses', ln)}</h1>
							<p className="responsiveTextInput text-[var(--ink-muted)] mt-0.5">Supplier-linked expenses</p>
						</div>

						{/* KPI strip */}
						<KpiStrip items={[
							{ label: getTtl('Expenses', ln) || 'Expenses', value: expensesData.length, icon: Wallet, tone: 'blue' },
							{ label: 'Needs IMS/GIS split', value: expensesData.filter(x => splitStatusOf(x) === 'pending').length, icon: Split, tone: 'amber' },
							{ label: 'Suppliers', value: new Set(expensesData.map(x => x.supplier).filter(Boolean)).size, icon: Factory, tone: 'gray' },
						]} />

						{/* Main Card */}
						<div className="page-card rounded-2xl p-3 sm:p-5 border border-[var(--line)] w-full bg-[var(--bg-card)] shadow-card">

							{/* Header Section */}
							<div className='flex items-center justify-end flex-wrap gap-2 pb-2'>
								{(() => {
									const pendingCount = expensesData.filter(x => splitStatusOf(x) === 'pending').length;
									return (
										<button
											type='button'
											onClick={() => setOnlyUnsplit(v => !v)}
											title='Show only invoices not yet split between IMS & GIS'
											className='inline-flex items-center gap-1.5 rounded-lg transition-colors'
											style={{
												fontSize: 'var(--fs-body)', padding: '4px 12px',
												color: onlyUnsplit ? 'var(--on-brand)' : 'var(--ink-secondary)',
												background: onlyUnsplit ? 'var(--brand)' : 'var(--bg-subtle)',
												border: onlyUnsplit ? '1px solid var(--brand)' : '1px solid var(--line)',
											}}
										>
											<Split className='w-3.5 h-3.5' />
											Needs IMS/GIS split
											<span className='rounded-full px-1.5' style={{ fontSize: 'var(--fs-table)', background: onlyUnsplit ? 'var(--on-brand-soft-strong)' : 'var(--brand-soft)', color: onlyUnsplit ? 'var(--on-brand)' : 'var(--brand)' }}>
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
								undoCount={undoCount}
								onUndo={handleUndo}
								undoBusy={undoBusy}
								undoLabel={undoLabel}
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

