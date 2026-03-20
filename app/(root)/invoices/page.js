'use client';
import { useContext, useEffect, useState, useCallback } from 'react';
import Customtable from '../contracts/newTable';
import MyDetailsModal from './modals/dataModal.js'
import { SettingsContext } from "../../../contexts/useSettingsContext";
import MonthSelect from '../../../components/monthSelect';
import Toast from '../../../components/toast.js'
import { InvoiceContext } from "../../../contexts/useInvoiceContext";
import { ContractsContext } from "../../../contexts/useContractsContext";
import { ExpensesContext } from "../../../contexts/useExpensesContext";
import Spinner from '../../../components/spinner';
import VideoLoader from '../../../components/videoLoader';
import { UserAuth } from "../../../contexts/useAuthContext"
import { loadData, loadInvoice, loadStockDataPerDescription, filteredArray, sortArr, getD } from '../../../utils/utils'
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
import { updateInvoiceField } from '../../../utils/utils';
import { useGlobalSearch } from '../../../contexts/useGlobalSearchContext';


const Invoices = () => {

	const { invoicesData, setValueInv, valueInv, isOpen, setIsOpen, setInvoicesData } = useContext(InvoiceContext);
	const { settings, dateSelect, setDateYr, setLoading, loading, ln } = useContext(SettingsContext);
	const { blankExpense } = useContext(ExpensesContext);
	const { uidCollection } = UserAuth();
	const { setValueCon } = useContext(ContractsContext);
	const router = useRouter();
	const searchParams = useSearchParams();
	const [alertArr, setAlertArr] = useState([]);
	const [openAlert, setOpenAlert] = useState(true)
	const [filteredData, setFilteredData] = useState([])
	const [highlightId, setHighlightId] = useState(null)
	const { upsertSourceItems } = useGlobalSearch();
	const [isEditMode, setIsEditMode] = useState(false);

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
				totalPrepayment: parseFloat(z.totalPrepayment)
			}))

			setInvoicesData(dt)
			setFilteredData(dt)

			let invArr = []
			let tmpArr = dt.filter(z => z.invType === '1111' && !z.cnORfl)
			tmpArr.forEach(z => {

				let date1 = z.shipData?.eta?.endDate;
				if (!date1) return;

				const date = new Date(date1);

				date.setDate(date.getDate() + 14);
				const today = new Date();

				// Compare if the new date is greater than today
				if (date < today) {
					if (z.alert !== undefined && z.alert) {
						invArr.push(z);
					} else if (z.alert === undefined) {
						invArr.push({ ...z, alert: true });
					}
				}
			})
			setOpenAlert(true)
			setAlertArr(invArr)
			setLoading(false)
		}

		Load();
	}, [dateSelect])

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

	let showAmount = (x) => {
		const isoCurrency =
			settings.Currency?.Currency?.find(c => c.id === x.row.original.cur)?.cur
			|| 'USD'; // safe fallback

		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: isoCurrency,
			minimumFractionDigits: 2
		}).format(x.getValue());
	};

	let propDefaults = Object.keys(settings).length === 0 ? [] : [
		{
			accessorKey: 'opDate',
			header: getTtl('Operation Time', ln),
			cell: (props) => <span className="whitespace-nowrap">{dateFormat(props.getValue(), 'dd-mmm-yy HH:MM')}</span>,
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
			cell: (props) => <span
				className={`${setInvStatus(props) === 'Draft' ? 'text-[var(--endeavour)]' : setInvStatus(props) === 'Final' ? 'text-green-600' : 'text-red-600'} 
			p-1.5 rounded-xl bg-[var(--selago)] px-3 justify-center flex font-medium whitespace-nowrap`}>{setInvStatus(props)}</span>,
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
        const val = props.getValue();
        const isUSD = val === 'USD' || val === '$';
        const isEUR = val === 'EUR' || val === '€';
        const symbol = isUSD ? '$' : isEUR ? '€' : val;
        const bg = isUSD ? '#c2e2bb' : isEUR ? '#d4eafc' : '#e5e7eb';
        const color = 'var(--chathams-blue)';
        return (
            <span
                style={{
                    backgroundColor: bg,
                    color: color,
                    borderRadius: '999px',
                    padding: '3px 14px',
                    fontWeight: 500,
                    fontSize: '13px',
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
			cell: (props) => <span className="whitespace-nowrap">{showAmount(props)}</span>,
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
			accessorKey: 'completed', 
			header: 'Completed',
			cell: (props) => <span className="flex justify-center">{props.getValue() ? <Image
				src="/check.png"
				width={18}
				height={18}
				alt="True"
			/> : <Image
				src="/close.png"
				width={18}
				height={18}
				alt="False"
			/>}</span>, 
			enableColumnFilter: false,
			size: 100
		},
	];

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
			<div className="mx-auto w-full max-w-[98%] px-1 sm:px-2 md:px-3 pb-4 mt-[72px]">
				{Object.keys(settings).length === 0 ? <VideoLoader loading={true} fullScreen={true} /> :
					<>
						<Toast />
						{/* Main Card */}
						<div className="rounded-2xl p-3 sm:p-5 mt-8 border border-[#b8ddf8] w-full backdrop-blur-[2px] bg-[#f8fbff]">
							
							{/* Header Section */}
							<div className='flex items-center justify-between flex-wrap gap-2 pb-2'>
								<h1 className="text-[14px] text-[var(--chathams-blue)] font-poppins responsiveTextTitle border-l-4 border-[var(--chathams-blue)] pl-2" style={{ fontSize: '14px' }}>
									{getTtl('Invoices', ln)}
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
								data={sortArr(getFormatted(invoicesData), 'invoice')} 
								columns={propDefaults} 
								SelectRow={SelectRow}
								invisible={invisible}
								onCellUpdate={onCellUpdate}
								excellReport={EXD(invoicesData.filter(x => filteredData.map(z => z.id).includes(x.id)),
									settings, getTtl('Invoices', ln), ln)}
								setFilteredData={setFilteredData}
								highlightId={highlightId}
							/>
						</div>

						{/* Alert Section */}
						{alertArr.length > 0 && (
							<div className='mt-4 px-2 sm:px-3'>
								<div className="text-sm font-semibold border border-[#b8ddf8] p-4 rounded-2xl shadow-sm bg-white w-full max-w-2xl">
									<div style={{ color: 'var(--chathams-blue)' }}>
										<span className='text-xs sm:text-sm border-l-4 border-[var(--chathams-blue)] pl-2'>Notification for delayed response</span>
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
					</>
				}
			</div>
		</div>
	);
};

export default Invoices;