'use client';
import { useContext, useEffect, useState } from 'react';
import Customtable from '../contracts/newTable';
import MyDetailsModal from './modals/dataModal.js'
import { SettingsContext } from "@contexts/useSettingsContext";
import MonthSelect from '@components/monthSelect';
import Toast from '@components/toast.js'
import { InvoiceContext } from "@contexts/useInvoiceContext";
import { ContractsContext } from "@contexts/useContractsContext";
import { ExpensesContext } from "@contexts/useExpensesContext";
import Spinner from '@components/spinner';
import { UserAuth } from "@contexts/useAuthContext"
import { loadData, loadInvoice, loadStockDataPerDescription, filteredArray, sortArr, getD } from '@utils/utils'
import Spin from '@components/spinTable';
import { EXD } from './excel'
import dateFormat from "dateformat";
import { getTtl } from '@utils/languages';
import DateRangePicker from '@components/dateRangePicker';
import Modal from '@components/modal';
import DlayedResponse from './modals/delayedResponse';
import Image from 'next/image';
import Tooltip from '@components/tooltip';


const Invoices = () => {

	const { invoicesData, setValueInv, valueInv, isOpen, setIsOpen, setInvoicesData } = useContext(InvoiceContext);
	const { settings, dateSelect, setDateYr, setLoading, loading, ln } = useContext(SettingsContext);
	const { blankExpense } = useContext(ExpensesContext);
	const { uidCollection } = UserAuth();
	const { setValueCon } = useContext(ContractsContext);
	const [alertArr, setAlertArr] = useState([]);
	const [openAlert, setOpenAlert] = useState(true)
	const [filteredData, setFilteredData] = useState([])

	useEffect(() => {

		const Load = async () => {
			setLoading(true)
			let dt = await loadData(uidCollection, 'invoices', dateSelect);

			dt = dt.map(z => ({
				...z, container: z.productsDataInvoice.map(x => x.container).join(' '),
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

		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: x.row.original.cur,
			minimumFractionDigits: 2
		}).format(x.getValue())
	}
	const aaa = (x) => {
		console.log(x)
	}
	let propDefaults = Object.keys(settings).length === 0 ? [] : [
		{ accessorKey: 'opDate', header: getTtl('Operation Time', ln), cell: (props) => <p>{dateFormat(props.getValue(), 'dd-mmm-yy HH:MM')}</p> },
		{ accessorKey: 'lstSaved', header: getTtl('Last Saved', ln), cell: (props) => <p>{dateFormat(props.getValue(), 'dd-mmm-yy HH:MM')}</p> },
		{ accessorKey: 'order', header: getTtl('PO', ln) + '#', cell: (props) => <p>{props.row.original.poSupplier.order}</p> },
		{ accessorKey: 'invoice', header: getTtl('Invoice', ln), cell: (props) => <p>{(String(props.getValue()).toString()).padStart(4, "0") + getprefixInv(props)}</p> },
		{
			accessorKey: 'date', header: getTtl('Date', ln), cell: (props) => <p>{dateFormat(props.row.original.final ? props.getValue() : props.getValue(), 'dd-mmm-yy')}</p>,
			meta: {
				filterVariant: 'dates',
			},
			filterFn: 'dateBetweenFilterFn'
		},
		{
			accessorKey: 'invoiceStatus', header: getTtl('Status', ln), cell: (props) => <p
				className={`${setInvStatus(props) === 'Draft' ? 'text-slate-700' : setInvStatus(props) === 'Final' ? 'text-green-700' : 'text-red-700'} 
			p-1.5 rounded-xl bg-slate-200 px-2 justify-center flex font-medium`}>{setInvStatus(props)}</p>
		},
		{
			accessorKey: 'client', header: getTtl('Consignee', ln), meta: {
				filterVariant: 'selectClient',
			},
		},
		{ accessorKey: 'shpType', header: getTtl('Shipment', ln), },
		{ accessorKey: 'origin', header: getTtl('Origin', ln) },
		{ accessorKey: 'delTerm', header: getTtl('Delivery Terms', ln) },
		{ accessorKey: 'pol', header: getTtl('POL', ln) },
		{ accessorKey: 'pod', header: getTtl('POD', ln) },
		{ accessorKey: 'packing', header: getTtl('Packing', ln) },
		{ accessorKey: 'cur', header: getTtl('Currency', ln), },
		{ accessorKey: 'invType', header: getTtl('Invoice Type', ln), },
		{
			accessorKey: 'totalAmount', header: getTtl('Total Amount', ln), cell: (props) => <p>{showAmount(props)}</p>,
			meta: {
				filterVariant: 'range',
			},
		},
		{ accessorKey: 'percentage', header: getTtl('Prepayment', ln), cell: (props) => <p>{percent(props)}</p> },
		{
			accessorKey: 'totalPrepayment', header: getTtl('Prepaid Amount', ln), cell: (props) => <p>{showAmount(props)}</p>,
			meta: {
				filterVariant: 'range',
			},
		},
		{
			accessorKey: 'balanceDue', header: getTtl('Balance', ln), cell: (props) => <p>{showAmount(props)}</p>,
			meta: {
				filterVariant: 'range',
			},
		},
		{ accessorKey: 'container', header: getTtl('Container No', ln), cell: (props) => <span className='text-wrap w-40 md:w-64 flex'>{props.getValue()}</span> },
		{
			accessorKey: 'etd', header: 'ETD', cell: (props) => <span>{props.row.original.shipData?.etd?.startDate ?
				dateFormat(props.row.original.shipData?.etd?.startDate, 'dd-mmm-yy') : ''}</span>
		},
		{
			accessorKey: 'eta', header: 'ETA', cell: (props) => <span>{props.row.original.shipData?.eta?.startDate ?
				dateFormat(props.row.original.shipData?.eta?.startDate, 'dd-mmm-yy') : ''}</span>
		},
		{
			accessorKey: 'completed', header: 'Completed',
			cell: (props) => <span>{props.getValue() ? <Image
				src="/check.png"
				width={18}
				height={18}
				alt="True"
			/> : <Image
				src="/close.png"
				width={18}
				height={18}
				alt="False"
			/>}</span>, enableColumnFilter: false,
		},
	];

	let invisible = ['lstSaved', 'order', 'shpType', 'invType',
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


	return (
		<div className="container mx-auto px-2 md:px-8 xl:px-10 mt-16 md:mt-0">
			{Object.keys(settings).length === 0 ? <Spinner /> :
				<>

					<Toast />
					{/*loading && <Spin />*/}
					<div className="border border-slate-200 rounded-xl p-4 mt-8 shadow-md relative">
						<div className='flex items-center justify-between flex-wrap pb-2'>
							<div className="text-3xl p-1 pb-2 text-slate-500">{getTtl('Invoices', ln)}</div>
							<div className='flex group'>
								<DateRangePicker />
								<Tooltip txt='Select Dates Range' />
							</div>

						</div>

						<Customtable data={sortArr(getFormatted(invoicesData), 'invoice')} columns={propDefaults} SelectRow={SelectRow}
							invisible={invisible}
							excellReport={EXD(invoicesData.filter(x => filteredData.map(z => z.id).includes(x.id)),
								settings, getTtl('Invoices', ln), ln)}
							setFilteredData={setFilteredData}
						/>

					</div>

					{alertArr.length ? <div className='mt-14'>
						<div className="text-lg font-medium leading-5 text-gray-900 border-2
						 border-slate-200 p-2 max-w-4xl mb-10 rounded-xl shadow-md"
						>
							<div className='text-slate-600 '>
								<span className='p-2'>Notification for delayed response</span>
								<DlayedResponse alertArr={alertArr} setAlertArr={setAlertArr} />
							</div>

						</div >
					</div> : ''}

					{valueInv && <MyDetailsModal isOpen={isOpen} setIsOpen={setIsOpen}
						title={`${getTtl('Contract No', ln)}: ${valueInv.poSupplier.order}`} />}

					{alertArr.length ? <Modal isOpen={openAlert} setIsOpen={setOpenAlert} title='Notification for delayed response' w='max-w-4xl'>
						<DlayedResponse alertArr={alertArr} setAlertArr={setAlertArr} />
					</Modal> : null}
				</>}
		</div>
	);
};

export default Invoices;
