'use client';
import { useContext, useEffect } from 'react';
import Customtable from '../contracts/table';
import MyDetailsModal from './modals/dataModal.js'
import { SettingsContext } from "@contexts/useSettingsContext";
import MonthSelect from '@components/monthSelect';
import Toast from '@components/toast.js'
import { InvoiceContext } from "@contexts/useInvoiceContext";
import { ExpensesContext } from "@contexts/useExpensesContext";
import SignOut from '@components/signOut';
import Spinner from '@components/spinner';
import { UserAuth } from "@contexts/useAuthContext"
import { loadData, loadInvoice, loadStockDataPerDescription, filteredArray } from '@utils/utils'
import Spin from '@components/spinTable';
import {EXD} from './excel'

const Invoices = () => {

	const { invoicesData, setValueInv, valueInv, isOpen, setIsOpen, setInvoicesData } = useContext(InvoiceContext);
	const { settings, lastAction, dateSelect, setDateYr, setLoading, loading } = useContext(SettingsContext);
	const { blankExpense } = useContext(ExpensesContext);
	const { uidCollection } = UserAuth();

	useEffect(() => {

		const Load = async () => {
			setLoading(true)
			let dt = await loadData(uidCollection, 'invoices', dateSelect);
			setInvoicesData(dt)
			setLoading(false)
		}

		Load();
	}, [dateSelect])


	let propDefaults = Object.keys(settings).length === 0 ? [] : [
		{ field: 'opDate', header: 'Operation Time', showcol: true },
		{ field: 'lstSaved', header: 'Last Saved', showcol: false },
		{ field: 'order', header: 'PO#', showcol: false },
		{ field: 'invoice', header: 'Invoice', showcol: true },
		{ field: 'date', header: 'Date', showcol: true },
		{ field: 'invoiceStatus', header: 'Status', showcol: true },
		{ field: 'client', header: 'Consignee', showcol: true, arr: settings.Client.Client },
		{ field: 'shpType', header: 'Shipment', showcol: false, arr: settings.Shipment.Shipment },
		{ field: 'origin', header: 'Origin', showcol: true, arr: settings.Origin.Origin },
		{ field: 'delTerm', header: 'Delivery Terms', showcol: false, arr: settings['Delivery Terms']['Delivery Terms'] },
		{ field: 'pol', header: 'POL', showcol: true, arr: settings.POL.POL },
		{ field: 'pod', header: 'POD', showcol: true, arr: settings.POD.POD },
		{ field: 'packing', header: 'Packing', showcol: false, arr: settings.Packing.Packing },
		{ field: 'cur', header: 'Currency', showcol: true, arr: settings.Currency.Currency },
		{ field: 'invType', header: 'Invoice Type', showcol: false, arr: settings.InvTypes.InvTypes },
		{ field: 'totalAmount', header: 'Total Amount', showcol: true, },
		{ field: 'percentage', header: 'Prepayment', showcol: false, },
		{ field: 'totalPrepayment', header: 'Prepaid Amount', showcol: false, }
	];


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

		setValueInv({ ...row, productsData: data.productsData, productsDataInvoice: dt });
		!row.final && setDateYr(row.date.startDate.substring(0, 4));
		blankExpense();
		setIsOpen(true);
		setLoading(false)
	};

	return (
		<div className="lg:container mx-auto px-2 md:px-8 xl:px-10 ">
			{Object.keys(settings).length === 0 ? <Spinner /> :
				<>
					<SignOut />
					<Toast />
					{loading && <Spin />}
					<div className="border border-slate-200 rounded-xl p-4 mt-8 shadow-md relative">
						<div className='flex items-center justify-between flex-wrap pb-2'>
							<div className="text-3xl p-1 pb-2 text-slate-500">Invoices</div>
							<MonthSelect />
						</div>

						<Customtable data={invoicesData} propDefaults={propDefaults} SelectRow={SelectRow}
							lastAction={lastAction} name='Invoices' 
							excellReport={EXD(invoicesData, settings, 'Invoices')}/>
					</div>

					{valueInv && <MyDetailsModal isOpen={isOpen} setIsOpen={setIsOpen}
						title={`Contract No: ${valueInv.poSupplier.order}`} />}
				</>}
		</div>
	);
};

export default Invoices;
