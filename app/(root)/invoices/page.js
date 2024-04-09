'use client';
import { useContext, useEffect } from 'react';
import Customtable from '../contracts/newTable';
import MyDetailsModal from './modals/dataModal.js'
import { SettingsContext } from "@contexts/useSettingsContext";
import MonthSelect from '@components/monthSelect';
import Toast from '@components/toast.js'
import { InvoiceContext } from "@contexts/useInvoiceContext";
import { ExpensesContext } from "@contexts/useExpensesContext";
import Spinner from '@components/spinner';
import { UserAuth } from "@contexts/useAuthContext"
import { loadData, loadInvoice, loadStockDataPerDescription, filteredArray, sortArr, getD } from '@utils/utils'
import Spin from '@components/spinTable';
import { EXD } from './excel'
import dateFormat from "dateformat";
import { getTtl } from '@utils/languages';


const Invoices = () => {

	const { invoicesData, setValueInv, valueInv, isOpen, setIsOpen, setInvoicesData } = useContext(InvoiceContext);
	const { settings, dateSelect, setDateYr, setLoading, loading, ln } = useContext(SettingsContext);
	const { blankExpense } = useContext(ExpensesContext);
	const { uidCollection } = UserAuth();

	useEffect(() => {

		const Load = async () => {
			setLoading(true)
			let dt = await loadData(uidCollection, 'invoices', dateSelect);
			dt = dt.map(z => ({ ...z, container: z.productsDataInvoice.map(x => x.container).join(' ') }))

			setInvoicesData(dt)
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

	let propDefaults = Object.keys(settings).length === 0 ? [] : [
		{ accessorKey: 'opDate', header: getTtl('Operation Time', ln), enableSorting: false, cell: (props) => <p>{dateFormat(props.getValue(), 'dd-mmm-yy HH:MM')}</p> },
		{ accessorKey: 'lstSaved', header: getTtl('Last Saved', ln), enableSorting: false, cell: (props) => <p>{dateFormat(props.getValue(), 'dd-mmm-yy HH:MM')}</p> },
		{ accessorKey: 'order', header: getTtl('PO', ln) + '#', cell: (props) => <p>{props.row.original.poSupplier.order}</p> },
		{ accessorKey: 'invoice', header: getTtl('Invoice', ln), cell: (props) => <p>{props.getValue() + getprefixInv(props)}</p> },
		{ accessorKey: 'date', header: getTtl('Date', ln), enableSorting: false, cell: (props) => <p>{dateFormat(props.row.original.final ? props.getValue() : props.getValue()?.startDate, 'dd-mmm-yy')}</p> },
		{
			accessorKey: 'invoiceStatus', header: getTtl('Status', ln), cell: (props) => <p
				className={`${setInvStatus(props) === 'Draft' ? 'text-slate-700' : setInvStatus(props) === 'Final' ? 'text-green-700' : 'text-red-700'} 
			p-1.5 rounded-xl bg-slate-200 px-2 justify-center flex font-medium`}>{setInvStatus(props)}</p>
		},
		{ accessorKey: 'client', header: getTtl('Consignee', ln), },
		{ accessorKey: 'shpType', header: getTtl('Shipment', ln), },
		{ accessorKey: 'origin', header: getTtl('Origin', ln) },
		{ accessorKey: 'delTerm', header: getTtl('Delivery Terms', ln) },
		{ accessorKey: 'pol', header: getTtl('POL', ln) },
		{ accessorKey: 'pod', header: getTtl('POD', ln) },
		{ accessorKey: 'packing', header: getTtl('Packing', ln) },
		{ accessorKey: 'cur', header: getTtl('Currency', ln), },
		{ accessorKey: 'invType', header: getTtl('Invoice Type', ln), },
		{ accessorKey: 'totalAmount', header: getTtl('Total Amount', ln), cell: (props) => <p>{showAmount(props)}</p> },
		{ accessorKey: 'percentage', header: getTtl('Prepayment', ln), cell: (props) => <p>{percent(props)}</p> },
		{ accessorKey: 'totalPrepayment', header: getTtl('Prepaid Amount', ln), cell: (props) => <p>{showAmount(props)}</p> },
		{ accessorKey: 'container', header: getTtl('Container No', ln), cell: (props) => <span className='text-wrap w-40 md:w-64 flex'>{props.getValue()}</span> }
	];

	let invisible = ['lstSaved', 'order', 'shpType', 'invType',
		'percentage', 'totalPrepayment', 'container'].reduce((acc, key) => {
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
					...row, client: gQ(row.client, 'Client', 'nname'),
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
		!tmpRow.final && setDateYr(tmpRow.date.startDate.substring(0, 4));
		blankExpense();
		setIsOpen(true);
		setLoading(false)
	};

	return (
		<div className="container mx-auto px-2 md:px-8 xl:px-10 mt-16 md:mt-0">
			{Object.keys(settings).length === 0 ? <Spinner /> :
				<>

					<Toast />
					{loading && <Spin />}
					<div className="border border-slate-200 rounded-xl p-4 mt-8 shadow-md relative">
						<div className='flex items-center justify-between flex-wrap pb-2'>
							<div className="text-3xl p-1 pb-2 text-slate-500">{getTtl('Invoices', ln)}</div>
							<MonthSelect />
						</div>

						<Customtable data={sortArr(getFormatted(invoicesData), 'invoice')} columns={propDefaults} SelectRow={SelectRow}
							invisible={invisible} excellReport={EXD(invoicesData, settings, getTtl('Invoices', ln), ln)} />

					</div>

					{valueInv && <MyDetailsModal isOpen={isOpen} setIsOpen={setIsOpen}
						title={`${getTtl('Contract No', ln)}: ${valueInv.poSupplier.order}`} />}
				</>}
		</div>
	);
};

export default Invoices;
