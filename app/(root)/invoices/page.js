'use client';
import { useContext, useEffect, useState, useCallback, useMemo } from 'react';
import Customtable from '../contracts/newTable';
import MyDetailsModal from './modals/dataModal.js'
import { SettingsContext } from "../../../contexts/useSettingsContext";
import MonthSelect from '../../../components/monthSelect';
import Toast from '../../../components/toast.js'
import { InvoiceContext } from "../../../contexts/useInvoiceContext";
import { ContractsContext } from "../../../contexts/useContractsContext";
import { ExpensesContext } from "../../../contexts/useExpensesContext";
import Spinner from '../../../components/spinner';
import { TableSkeleton } from "../../../components/skeletons";
import { UserAuth } from "../../../contexts/useAuthContext"
import { loadData, loadInvoice, loadStockDataPerDescription, filteredArray, sortArr, getD, resolveDueDate } from '../../../utils/utils'
import Spin from '../../../components/spinTable';
import { EXD } from './excel'
import dateFormat from "dateformat";
import { getTtl } from '../../../utils/languages';
import DateRangePicker from '../../../components/dateRangePicker';
import Modal from '../../../components/modal';
import DlayedResponse from './modals/delayedResponse';
import Image from 'next/image';
import Tooltip from '../../../components/tooltip';
import useInlineEdit from '../../../hooks/useInlineEdit';
import { useRouter, useSearchParams } from 'next/navigation';
import EditableCell from '../../../components/table/inlineEditing/EditableCell';
import EditableSelectCell from '../../../components/table/inlineEditing/EditableSelectCell';
import { updateInvoiceField, ensureSplitNotificationsBatch } from '../../../utils/utils';
import { useGlobalSearch } from '../../../contexts/useGlobalSearchContext';
import dynamic from 'next/dynamic';
// Loaded on demand: ReminderModal statically imports jsPDF, which otherwise lands in
// this page's first-load bundle. It only renders when the user opens a reminder.
const ReminderModal = dynamic(() => import('../../../components/invoices/ReminderModal'), { ssr: false });
import StatusBadge from '../../../components/StatusBadge';
import { Bell, Split } from 'lucide-react';
import SplitControl from '../../../components/SplitControl';
import { splitStatusOf } from '../../../utils/splitUtils';


const Invoices = () => {

	const { invoicesData, setValueInv, valueInv, isOpen, setIsOpen, setInvoicesData } = useContext(InvoiceContext);
	const { settings, dateSelect, setDateYr, setLoading, loading, ln, compData } = useContext(SettingsContext);
	const { blankExpense } = useContext(ExpensesContext);
	const { uidCollection, currentUser, logActivity } = UserAuth();
	const { setValueCon } = useContext(ContractsContext);
	const router = useRouter();
	const searchParams = useSearchParams();
	const [alertArr, setAlertArr] = useState([]);
	const [openAlert, setOpenAlert] = useState(true)
	const [filteredData, setFilteredData] = useState([])
	const [highlightId, setHighlightId] = useState(null)
	const { upsertSourceItems } = useGlobalSearch();
	const [isEditMode, setIsEditMode] = useState(false);
	const [reminderInvoice, setReminderInvoice] = useState(null);
	const [onlyUnsplit, setOnlyUnsplit] = useState(false);

	// Persist a split change on one invoice: optimistic local update + Firestore
	// patch, reverting the local state if the write fails.
	const persistSplit = useCallback(async (row, split) => {
		const prev = invoicesData;
		setInvoicesData(prev.map(x => x.id === row.id ? { ...x, split: split || null } : x));
		try {
			await updateInvoiceField(uidCollection, row.id, row.dateRange?.startDate ?? row.date, { split: split || null });
		} catch (e) {
			console.error(e);
			setInvoicesData(prev);
		}
	}, [invoicesData, uidCollection, setInvoicesData]);

	const gQ = (z, y, x) => settings?.[y]?.[y]?.find(q => q.id === z)?.[x] || '';

	// Inline editing hook
	const { updateField } = useInlineEdit('invoices', setInvoicesData);

	// Handle inline cell save
	const handleCellSave = useCallback(async (rowData, field, value) => {
		const originalItem = invoicesData.find(i => i.id === rowData.id);
		if (originalItem) {
			await updateField(originalItem, field, value);
		}
	}, [invoicesData, updateField]);

	// Handle openId from URL (from global search) - highlight row only
	useEffect(() => {
		const openId = searchParams.get('openId');
		if (openId && invoicesData.length > 0) {
			const item = invoicesData.find(i => i.id === openId);
			if (item) {
				// Highlight the row
				setHighlightId(openId);
				setTimeout(() => setHighlightId(null), 3000);
				// Clear the URL parameter
				router.replace('/invoices', { scroll: false });
			}
		}
	}, [searchParams, invoicesData]);

	useEffect(() => {

		const Load = async () => {
			setLoading(true)
			let dt = await loadData(uidCollection, 'invoices', dateSelect);

			dt = dt.map(z => ({
				...z, container: z.productsDataInvoice.map(x => x.container).join(' '),
				poSupplierOrder: z.poSupplier?.order || '',
				etdDate: z.shipData?.etd?.endDate || '',
				etaDate: z.shipData?.eta?.endDate || '',
				fnlzing: z.shipData?.fnlzing || '',
				totalPrepayment: parseFloat(z.totalPrepayment)
			}))

			setInvoicesData(dt)
			setFilteredData(dt)

			// "Notification for delayed response" (invoices) turned off per request — no longer
			// surfaced, so it can't pop up. (Re-enable by rebuilding alertArr from overdue ETAs.)
			setAlertArr([])
			setLoading(false)

			// Re-raise standing "needs IMS/GIS split" alerts (idempotent — never duplicates).
			// Batched: one existence query pass instead of one getDoc per pending invoice.
			ensureSplitNotificationsBatch(uidCollection,
				dt.filter(z => z.split?.status === 'pending').slice(0, 50).map(z => ({
					entityType: 'invoice', entityId: z.id,
					entityLabel: `Invoice #${String(z.invoice ?? '').padStart(4, '0')}`,
					amount: Number(z.totalAmount) || 0, currency: z.cur,
				})));
		}

		if (!uidCollection) return;
		Load();
		
	}, [dateSelect, uidCollection])

	useEffect(() => {
		if (!invoicesData || !invoicesData.length || Object.keys(settings).length === 0) {
			upsertSourceItems('invoices', []);
			return;
		}

		const items = invoicesData.map(inv => ({
			key: `invoice_${inv.id}`,
			route: '/invoices',
			rowId: inv.id,

			title: `Invoice • ${String(inv.invoice ?? '').padStart(4, '0')}`,
			subtitle: `${gQ(inv.client, 'Client', 'nname') || ''} • ${inv.container || ''} • ${inv.pol || ''}-${inv.pod || ''}`,

			searchText: [
				inv.invoice,
				gQ(inv.client, 'Client', 'nname'),
				inv.container,
				inv.pol,
				inv.pod,
				inv.packing,
				inv.order,
			].filter(Boolean).join(' ')
		}));

		upsertSourceItems('invoices', items);
	}, [invoicesData, settings]);

	const setInvStatus = (z) => {
		let q = z.row.original;

		return !q.final && !q.final ? 'Draft' :
			q.final && !q.canceled ? 'Final' :
				q.final && q.canceled ? 'Canceled' : ''
	}

	const getprefixInv = (x) => {
		let q = x.row.original;

		return (q.invType === '1111' || q.invType === 'Invoice') ? '' :
			(q.invType === '2222' || q.invType === 'Credit Note') ? 'CN' : 'FN'
	}

	const percent = (x) => {
		let q = x.row.original;
		return (q.invType !== '1111' && q.invType !== "Invoice") ? '-' : x.getValue() === '' ? '' : x.getValue() + '%'
	}

	const showAmount = useCallback((x) => {
		const isoCurrency =
			settings.Currency?.Currency?.find(c => c.id === x.row.original.cur)?.cur
			|| 'USD'; // safe fallback

		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: isoCurrency,
			minimumFractionDigits: 2
		}).format(x.getValue());
	}, [settings]);

	// Memoized: deps list every piece of state the cells read — settings/ln (labels,
	// options), invoicesData (the reminder cell looks up the raw invoice by id),
	// uidCollection/currentUser/logActivity/persistSplit (split + reminder cells) and
	// the settings-derived showAmount. setInvStatus/getprefixInv/percent read no state.
	const propDefaults = useMemo(() => Object.keys(settings).length === 0 ? [] : [
		{
			accessorKey: 'opDate',
			header: getTtl('Operation Time', ln),
			cell: (props) => <span className="whitespace-nowrap">{dateFormat(props.getValue(), 'dd.mm.yy - HH:MM')}</span>,
			meta: { excludeFromQuickSum: true },
			size: 150
		},
		{
			accessorKey: 'lstSaved',
			header: getTtl('Last Saved', ln),
			cell: (props) => <span className="whitespace-nowrap">{dateFormat(props.getValue(), 'dd-mmm-yy HH:MM')}</span>,
			meta: { excludeFromQuickSum: true },
			size: 150
		},
		{
			accessorKey: 'poSupplierOrder',
			header: getTtl('PO', ln) + '#',
			cell: (props) => <span className="whitespace-nowrap">{props.getValue()}</span>,
			meta: { excludeFromQuickSum: true },
			size: 100
		},
		{
			accessorKey: 'invoice',
			header: getTtl('Invoice', ln),
			cell: (props) => <span className="whitespace-nowrap">{(String(props.getValue()).toString()).padStart(4, "0") + getprefixInv(props)}</span>,
			meta: { excludeFromQuickSum: true },
			size: 100
		},
		{
			accessorKey: 'date',
			header: getTtl('Date', ln),
			cell: (props) => <span className="whitespace-nowrap">{dateFormat(props.row.original.final ? props.getValue() : props.getValue(), 'dd.mm.yy')}</span>,
			meta: {
				filterVariant: 'dates',
			},
			filterFn: 'dateBetweenFilterFn',
			size: 120
		},
		{
			accessorKey: 'invoiceStatus',
			header: getTtl('Status', ln),
			cell: (props) => <StatusBadge label={setInvStatus(props)} />,
			size: 100
		},
		{
			accessorKey: 'client',
			header: getTtl('Consignee', ln),
			cell: EditableSelectCell,
			meta: {
				filterVariant: 'selectClient',
				options: settings.Client?.Client?.map(c => ({
					value: c.id,
					label: c.nname
				})) ?? []
			},
			size: 150
		},
		{
			accessorKey: 'shpType',
			header: getTtl('Shipment', ln),
			cell: EditableSelectCell,
			meta: {
				options: settings.Shipment?.Shipment?.map(s => ({
					value: s.id,
					label: s.shpType
				})) ?? []
			},
			size: 130
		},
		{
			accessorKey: 'origin',
			header: getTtl('Origin', ln),
			cell: EditableSelectCell,
			meta: {
				options: settings.Origin?.Origin?.map(o => ({
					value: o.id,
					label: o.origin
				})) ?? []
			},
			size: 120
		},
		{
			accessorKey: 'delTerm',
			header: getTtl('Delivery Terms', ln),
			cell: EditableSelectCell,
			meta: {
				options: settings['Delivery Terms']?.['Delivery Terms']?.map(d => ({
					value: d.id,
					label: d.delTerm
				})) ?? []
			},
			size: 140
		},
		{
			accessorKey: 'pol',
			header: getTtl('POL', ln),
			cell: EditableSelectCell,
			meta: { options: settings.POL?.POL?.map(p => ({ value: p.id, label: p.pol })) ?? [] },
			size: 100
		},
		{
			accessorKey: 'pod',
			header: getTtl('POD', ln),
			cell: EditableSelectCell,
			meta: { options: settings.POD?.POD?.map(p => ({ value: p.id, label: p.pod })) ?? [] },
			size: 100
		},
		{
			accessorKey: 'packing',
			header: getTtl('Packing', ln),
			cell: EditableSelectCell,
			meta: { options: settings.Packing?.Packing?.map(p => ({ value: p.id, label: p.packing })) ?? [] },
			size: 120
		},
		{
			accessorKey: 'cur',
			header: '$/€',
			cell: (props) => {
				const id = props.getValue();
				const cur = settings?.Currency?.Currency?.find(c => c.id === id)?.cur || id || '';
				const isUSD = cur === 'USD' || cur === '$' || cur.toLowerCase() === 'us';
				const isEUR = cur === 'EUR' || cur === '€' || cur.toLowerCase() === 'eu';
				const symbol = isUSD ? '$' : isEUR ? '€' : cur;
				const bg = isUSD ? '#dcfce7' : isEUR ? '#dbeeff' : '#e5e7eb';
				const border = isUSD ? '1px solid #bbf7d0' : isEUR ? '1px solid #b8ddf8' : '1px solid #d1d5db';
				const color = isUSD ? '#166534' : 'var(--chathams-blue)';
				return (
					<span
						style={{
							backgroundColor: bg,
							color: color,
							border: border,
							borderRadius: '999px',
							padding: '3px 14px',
							fontWeight: 500,
							fontSize: '0.8rem',
							display: 'inline-flex',
							alignItems: 'center',
							justifyContent: 'center',
							minWidth: '36px',
							whiteSpace: 'nowrap',
						}}
					>
						{symbol}
					</span>
				);
			},
			size: 100
		},
		{
			accessorKey: 'invType',
			header: getTtl('Invoice Type', ln),
			size: 130
		},
		{
			accessorKey: 'totalAmount',
			header: getTtl('Total Amount', ln),
			cell: (props) => <span className="whitespace-nowrap">{showAmount(props)}</span>,
			meta: {
				filterVariant: 'range',
			},
			size: 130
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
						entityType='invoice'
						entityLabel={`Invoice #${String(r.invoice ?? '').padStart(4, '0')}`}
						amount={Number(r.totalAmount) || 0}
						currency={r.cur}
						uidCollection={uidCollection}
						currentUser={currentUser}
						logActivity={logActivity}
						onPersist={(split) => persistSplit(r, split)}
					/>
				);
			},
		},
		{
			accessorKey: 'percentage',
			header: getTtl('Prepayment', ln),
			cell: (props) => <span className="whitespace-nowrap">{percent(props)}</span>,
			meta: { excludeFromQuickSum: true },
			size: 120
		},
		{
			accessorKey: 'totalPrepayment',
			header: getTtl('Prepaid Amount', ln),
			cell: (props) => <span className="whitespace-nowrap">{showAmount(props)}</span>,
			meta: {
				filterVariant: 'range',
			},
			size: 140
		},
		{
			accessorKey: 'balanceDue',
			header: getTtl('Balance', ln),
			cell: (props) => <span className={`whitespace-nowrap ${Number(props.getValue()) > 0 ? 'text-red-600' : ''}`}>{showAmount(props)}</span>,
			meta: {
				filterVariant: 'range',
			},
			size: 120
		},
		{
			accessorKey: 'container',
			header: getTtl('Container No', ln),
			cell: (props) => <span className='whitespace-nowrap'>{props.getValue()}</span>,
			meta: { excludeFromQuickSum: true },
			size: 200
		},
		{
			accessorKey: 'etdDate',
			header: 'ETD',
			cell: (props) => <span className="whitespace-nowrap">{props.getValue() ? dateFormat(props.getValue(), 'dd.mm.yy') : ''}</span>,
			meta: { excludeFromQuickSum: true },
			size: 110
		},
		{
			accessorKey: 'etaDate',
			header: 'ETA',
			cell: (props) => <span className="whitespace-nowrap">{props.getValue() ? dateFormat(props.getValue(), 'dd.mm.yy') : ''}</span>,
			meta: { excludeFromQuickSum: true },
			size: 110
		},
		{
			// Shipment finalized (shipData.fnlzing: '4568' = Yes, '2587' = No).
			// Distinct from the "Status" column (document Draft/Final/Canceled) and
			// from "Shipment" (shipment type) — this is whether the FINAL invoice has
			// been issued. Same source of truth used on Cashflow + the statements.
			accessorKey: 'fnlzing',
			header: getTtl('Finalizing', ln),
			cell: (props) => {
				const yes = props.getValue() === '4568';
				// Same status-indicator language as the Cashflow finalized chips:
				// soft tint + 1px inset ring + matching status dot.
				const tone = yes
					? { dot: '#10b981', text: '#047857', bg: '#ecfdf5', ring: '#a7f3d0' }
					: { dot: '#f59e0b', text: '#b45309', bg: '#fffbeb', ring: '#fde68a' };
				return (
					<span
						className="inline-flex items-center gap-1.5 rounded-full responsiveTextTable font-semibold leading-none whitespace-nowrap"
						style={{
							color: tone.text,
							backgroundColor: tone.bg,
							boxShadow: `inset 0 0 0 1px ${tone.ring}`,
							padding: '4px 10px',
						}}
					>
						<span className="rounded-full shrink-0" style={{ width: 6, height: 6, backgroundColor: tone.dot }} />
						{yes ? 'Yes' : 'No'}
					</span>
				);
			},
			enableColumnFilter: false,
			meta: { excludeFromQuickSum: true },
			size: 110
		},
		{
			accessorKey: 'completed',
			header: 'Completed',
			cell: (props) => {
				const value = props.getValue();
				return (
					<div className="flex justify-center">
						<div
							className="px-3 py-1 rounded-xl responsiveTextTable font-normal"
							style={{
								backgroundColor: value ? '#dcfce7' : '#fce7f3',
								color: value ? '#166534' : '#be185d',
								border: `1px solid ${value ? '#bbf7d0' : '#fbcfe8'}`
							}}
						>
							{value ? 'Completed' : 'Incompleted'}
						</div>
					</div>
				);
			},
			enableColumnFilter: false,
			size: 100
		},
		{
			id: 'reminder',
			header: '',
			enableColumnFilter: false,
			enableSorting: false,
			size: 44,
			cell: (props) => {
				const row = props.row.original;
				// Issued = not a draft and not canceled (matches Cashflow debt logic)
				const isCanceled = !!row.canceled;
				const isIssued = row.draft !== true && !isCanceled;
				const totalAmt = parseFloat(row.totalAmount) || 0;
				const totalPaid = (row.payments || []).reduce((s, p) => s + (parseFloat(p.pmnt) || 0), 0);
				const balanceDue = row.debtBlnc != null ? parseFloat(row.debtBlnc) : totalAmt - totalPaid;
				const isUnpaid = balanceDue > 0;
				const isOverdue = (() => {
					const dueDate = resolveDueDate(row);
					return dueDate && new Date(dueDate) < new Date();
				})();
				if (!isIssued || !isUnpaid) return null;

				// 24h cooldown — prevent users from accidentally spamming clients
				const lastReminder = row.reminders?.length ? row.reminders[row.reminders.length - 1] : null;
				const hoursSinceLastReminder = lastReminder?.sentAt
					? (Date.now() - new Date(lastReminder.sentAt).getTime()) / 36e5
					: Infinity;
				const onCooldown = hoursSinceLastReminder < 24;
				const cooldownHoursLeft = onCooldown ? Math.ceil(24 - hoursSinceLastReminder) : 0;

				// Cadence — flag invoices that haven't been nudged in N days (user-configured)
				const cadenceDays = parseFloat(settings?.ReminderCadence?.days);
				const cadence = Number.isFinite(cadenceDays) && cadenceDays > 0 ? cadenceDays : 7;
				const daysSinceLastReminder = hoursSinceLastReminder / 24;
				// "Due for follow-up" only after first reminder was sent — never before
				const dueForFollowup = lastReminder && !onCooldown && daysSinceLastReminder >= cadence;
				// "Never reminded but overdue" — also gets a dot to nudge the user
				const neverReminded = !lastReminder && isOverdue;
				const showFollowupDot = dueForFollowup || neverReminded;

				const clientList = settings?.Client?.Client || [];
				// `row.client` has been replaced with the client NAME by getFormatted, so the
				// original ID is lost. Look up the unformatted invoice to recover the real
				// client id (and email). Fall back to matching by nname for finalized rows
				// where the original is structurally different.
				const rawInv = invoicesData.find(x => x.id === row.id);
				const rawClientId = rawInv && typeof rawInv.client === 'string'
					? rawInv.client
					: rawInv?.client?.id;
				const clientObj = clientList.find(c => c.id === rawClientId)
					|| clientList.find(c => c.nname === row.client);
				const currencyList = settings?.Currency?.Currency || [];
				const currency = currencyList.find(c => c.id === row.cur)?.cur || row.cur || 'USD';

				const titleText = onCooldown
					? `Reminder sent recently — wait ${cooldownHoursLeft}h before sending again`
					: dueForFollowup
						? `Due for follow-up — last reminder sent ${Math.round(daysSinceLastReminder)} days ago (cadence ${cadence}d)`
						: neverReminded
							? 'Overdue and never reminded — send a payment reminder'
							: isOverdue ? 'Overdue — send payment reminder' : 'Send payment reminder';

				return (
					<button
						onClick={e => {
							e.stopPropagation();
							if (onCooldown) return;
							setReminderInvoice({ ...row, number: row.invoice, balanceDue: balanceDue > 0 ? balanceDue : 0, currency, paymentStatus: balanceDue <= 0 ? 'Paid' : totalPaid > 0 ? 'Partially Paid' : 'Unpaid', client: clientObj?.nname || row.client || 'Client', clientEmail: clientObj?.email || '', uidCollection });
						}}
						disabled={onCooldown}
						title={titleText}
						aria-label={titleText}
						className='relative p-1 rounded-full transition-colors hover:opacity-80 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[var(--endeavour)]/30'
						style={{
							color: onCooldown ? '#9ca3af' : isOverdue ? '#ef4444' : '#f59e0b',
							opacity: onCooldown ? 0.4 : 1,
						}}
					>
						<Bell className='w-3.5 h-3.5' />
						{showFollowupDot && !onCooldown && (
							<span
								className='absolute -top-0.5 -right-0.5 rounded-full'
								aria-hidden='true'
								style={{
									width: '6px',
									height: '6px',
									background: '#ef4444',
									boxShadow: '0 0 0 1.5px white',
								}}
							/>
						)}
					</button>
				);
			},
		},
	], [settings, ln, invoicesData, uidCollection, currentUser, logActivity, persistSplit, showAmount]);

	let invisible = ['lstSaved', 'shpType', 'invType',
		'percentage', 'totalPrepayment', 'balanceDue', 'container'].reduce((acc, key) => {
			acc[key] = false;
			return acc;
		}, {});

	const getFormatted = (arr) => {  //convert id's to values

		let newArr = []
		const gQ = (z, y, x) => settings[y][y].find(q => q.id === z)?.[x] || ''

		arr.forEach(row => {

			let formattedRow = row.final ? {
				...row,
				client: row.client.nname,
				cur: row.cur.cur
			} :
				{
					...row,
					client: gQ(row.client, 'Client', 'nname'),
					shpType: gQ(row.shpType, 'Shipment', 'shpType'),
					origin: gQ(row.origin, 'Origin', 'origin'),
					delTerm: gQ(row.delTerm, 'Delivery Terms', 'delTerm'),
					pol: gQ(row.pol, 'POL', 'pol'),
					pod: gQ(row.pod, 'POD', 'pod'),
					packing: gQ(row.packing, 'Packing', 'packing'),
					cur: gQ(row.cur, 'Currency', 'cur'),
					invType: gQ(row.invType, 'InvTypes', 'invType'),
				}

			newArr.push(formattedRow)
		})

		return newArr;
	}

	const SelectRow = async (row) => {

		setLoading(true)
		let data = await loadInvoice(uidCollection, 'contracts', row.poSupplier)
		setValueCon(data)

		let dt = [...row.productsDataInvoice]
		dt = await Promise.all(
			dt.map(async (x) => {
				let stocks = await loadStockDataPerDescription(uidCollection, x.stock,
					x.description ? x.description : x.descriptionId)
				stocks = filteredArray(stocks)
				let total = 0;
				stocks.forEach(obj => {
					total += obj.type === 'in' ? parseFloat(obj.qnty) : parseFloat(obj.qnty) * -1
				})

				return {
					...x,
					stockValue: total,
				};
			})
		);

		let tmpRow = invoicesData.find(x => x.id === row.id)
		tmpRow = { ...tmpRow, productsData: data.productsData, productsDataInvoice: dt }

		setValueInv(tmpRow);
		!tmpRow.final && setDateYr(tmpRow.dateRange?.startDate?.substring(0, 4));
		blankExpense();
		setIsOpen(true);
		setLoading(false)
	};

	// Stable table data + prebuilt Excel report: same formatting, sort and export rows
	// as before, recomputed only when their inputs change instead of on every render.
	// Settings guard: getFormatted reads settings.Client/etc, and invoices can finish
	// loading before settings on a hard page load — the old inline expression sat
	// behind the page's settings ternary and never ran that early.
	const tableData = useMemo(
		() => Object.keys(settings).length === 0 ? [] :
			sortArr(getFormatted(invoicesData), 'invoice').filter(x => !onlyUnsplit || splitStatusOf(x) === 'pending'),
		// getFormatted only reads `settings`, covered below
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[invoicesData, settings, onlyUnsplit]
	);

	const excelReport = useMemo(() => {
		const ids = new Set(filteredData.map(z => z.id));
		return EXD(invoicesData.filter(x => ids.has(x.id)), settings, getTtl('Invoices', ln), ln);
	}, [invoicesData, filteredData, settings, ln]);

	const onCellUpdate = async ({ rowIndex, columnId, value }) => {
		const row = invoicesData[rowIndex];
		if (!row?.id) return;

		// 🚫 Do not allow editing finalized invoices
		if (row.final) return;

		const prev = invoicesData;
		const next = prev.map((x, i) =>
			i === rowIndex ? { ...x, [columnId]: value } : x
		);
		setInvoicesData(next);

		try {
			await updateInvoiceField(
				uidCollection,
				row.id,
				row.dateRange?.startDate ?? row.date,
				{ [columnId]: value }
			);
		} catch (e) {
			console.error(e);
			setInvoicesData(prev); // revert on error
		}
	};

	return (
		<div className="w-full " style={{ background: "#f8fbff" }}>
			<div className="mx-auto w-full max-w-full px-1 md:px-2 pb-4 mt-[72px]">
				{Object.keys(settings).length === 0 ? <TableSkeleton /> :
					<>
						<Toast />
						{/* Main Card */}
						<div className="rounded-2xl p-3 sm:p-5 mt-8 border border-[#b8ddf8] w-full bg-[#f8fbff]">

							{/* Header Section */}
							<div className='flex items-center justify-between flex-wrap gap-2 pb-2'>
								<h1 className="text-[var(--chathams-blue)] font-poppins responsiveTextTitle font-medium border-l-4 border-[var(--chathams-blue)] pl-2">
									{getTtl('Invoices', ln)}
								</h1>
								{(() => {
									const pendingCount = invoicesData.filter(x => splitStatusOf(x) === 'pending').length;
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
								onCellUpdate={onCellUpdate}
								excellReport={excelReport}
								setFilteredData={setFilteredData}
								highlightId={highlightId}
							/>
						</div>

						{/* Alert Section */}
						{alertArr.length > 0 && (
							<div className='mt-4 px-2 sm:px-3'>
								<div className="responsiveText font-medium border border-[#b8ddf8] p-4 rounded-2xl shadow-sm bg-white w-full max-w-2xl">
									<div style={{ color: 'var(--chathams-blue)' }}>
										<span className='responsiveText border-l-4 border-[var(--chathams-blue)] pl-2'>Notification for delayed response</span>
										<DlayedResponse alertArr={alertArr} setAlertArr={setAlertArr} />
									</div>
								</div>
							</div>
						)}

						{/* Modals */}
						{valueInv && (
							<MyDetailsModal
								isOpen={isOpen}
								setIsOpen={setIsOpen}
								title={`${getTtl('Contract No', ln)}: ${valueInv.poSupplier.order}`}
							/>
						)}

						{alertArr.length > 0 && (
							<Modal
								isOpen={openAlert}
								setIsOpen={setOpenAlert}
								title='Notification for delayed response'
								w='max-w-2xl'
							>
								<DlayedResponse alertArr={alertArr} setAlertArr={setAlertArr} />
							</Modal>
						)}

						{reminderInvoice && (
							<ReminderModal
								invoice={reminderInvoice}
								clientEmail={reminderInvoice.clientEmail || ''}
								companyName={compData?.name || ''}
								language={ln}
								onClose={() => setReminderInvoice(null)}
							/>
						)}
					</>
				}
			</div>
		</div>
	);
};

export default Invoices;