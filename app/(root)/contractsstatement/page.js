'use client';
import { useContext, useEffect, useState } from 'react';
import Customtable from './table';

//import MyDetailsModal from './modals/dataModal.js'
import { SettingsContext } from "@contexts/useSettingsContext";
import { ContractsContext } from "@contexts/useContractsContext";
import MonthSelect from '@components/monthSelect';
import Toast from '@components/toast.js'
import ModalCopyInvoice from '@components/modalCopyInvoice';

import { loadData, getInvoices, loadStockData } from '@utils/utils'
import SignOut from '@components/signOut';
import Spinner from '@components/spinner';
import { UserAuth } from "@contexts/useAuthContext"
import Spin from '@components/spinTable';


const loadInvoices = async (uidCollection, con) => {

	let yrs = [...new Set(con.invoices.map(x => x.date.substring(0, 4)))]
	let arrTmp = [];
	for (let i = 0; i < yrs.length; i++) {
		let yr = yrs[i]
		let tmpDt = [...new Set(con.invoices.filter(x => x.date.substring(0, 4) === yr).map(y => y.invoice))]
		let obj = { yr: yr, arrInv: tmpDt }
		arrTmp.push(obj)
	}

	let tmpInv = await getInvoices(uidCollection, 'invoices', arrTmp)
	return tmpInv

}


const getInvArray = (obj) => {
	let invArr = []
	for (let i = 0; i < obj.invoices.length; i++) {
		let tmpArr = obj.invoices.filter(x => x.invoice === obj.invoices[i]['invoice'])
		if (tmpArr.length === 1) {
			invArr.push(tmpArr[0]['id'])
		} else {
			let findObjWithHighINVTYPE = tmpArr.reduce((prev, current) => {
				return prev.invType > current.invType ? prev : current;
			});
			invArr.push(findObjWithHighINVTYPE.id)
		}
	}

	return [...new Set(invArr)];
}
const Contracts = () => {

	const { settings, lastAction, dateSelect, setDateYr, setLoading, loading } = useContext(SettingsContext);
	const { contractsData, setContractsData } = useContext(ContractsContext);
	const { uidCollection } = UserAuth();
	const [filteredData, setFilteredData] = useState([]);
	const [dataTable, setDataTable] = useState([])

	useEffect(() => {

		const Load = async () => {
			setLoading(true)
			let dt = await loadData(uidCollection, 'contracts', dateSelect);
			setContractsData(dt)
		}

		Object.keys(settings).length !== 0 && Load();
	}, [dateSelect, settings])


	useEffect(() => {

		const loadInv = async () => {
			let dt = [...contractsData]
			dt = await Promise.all(
				dt.map(async (x) => {
					const Invoices = await loadInvoices(uidCollection, x)
				//	const Stock = await loadStockData(uidCollection, 'id', x.stock)
					
					return {
						...x,
						invoicesData: Invoices,
				//		stcokData: Stock,
					};
				})
			);

			dt = setCurFilterData(dt)
			setDataTable(dt)
			setFilteredData(dt)
			setLoading(false)
		}

		loadInv()
	}, [contractsData])


	const setCurFilterData = (arr) => {

		let newArr = []

		arr.forEach(obj => {

			let newObj = {};
			let total = 0;
			
		//	let materialsArr = [...new Set(obj.stcokData.map(x => x.description))]
			let materialsArr = [...new Set(obj.productsData.map(x => x.id))]

			materialsArr.forEach(x => {
				/*obj.stcokData.forEach(y => {
					if (y.description === x) { // I thought the qnty should be taken from the stock and not from the contract
						total += parseFloat(y.qnty)
					
				})*/
			
				total = obj.productsData.find(q=> q.id===x)['qnty']

				let totalShipped = 0;
				let totalClients = [];
				let totalPo = [];
				let totalDestination = [];
				// get the final invoices array
				
				let invTypeArr = getInvArray(obj)
				obj.invoicesData.forEach(z => {
					if (invTypeArr.includes(z.id)) {
						z.productsDataInvoice.forEach(f => {
							if (f.descriptionId === x) {
								totalShipped += parseFloat(f.qnty)
								let clnt = z.final ? z.client.nname : (settings.Client.Client).find(x => x.id === z.client).nname
								let pod = z.final ? z.pod : (settings.POD.POD).find(x => x.id === z.pod)?.['pod']
								totalPo.push(f.po)
								totalClients.push(clnt)
								totalDestination.push(pod)
							}
						})
					}
				})

				newObj = {
					supplier: obj.supplier, date: obj.date, order: obj.order, poWeight: total,
					comments: obj.comments, description: obj.productsData.find(z => z.id === x).description,
					unitPrc: obj.productsData.find(z => z.id === x).unitPrc, cur: obj.cur,
					shiipedWeight: totalShipped, remaining: total - totalShipped,
					client: totalClients.map((item, index) => {
						return <div key={index}>{item}</div>
					}), totalPo: totalPo.map((item, index) => {
						return <div key={index}>{item}</div>
					}), destination: totalDestination.map((item, index) => {
						return <div key={index}>{item}</div>
					}), id: obj.productsData.find(z => z.id === x).id, client1: [...new Set(totalClients)].join(' '),
					totalPo1: [...new Set(totalPo)].join(' '), destination1: [...new Set(totalDestination)].join(' ')
				}
				newArr.push(newObj)
			})
		});

		return newArr
	}



	let propDefaults = Object.keys(settings).length === 0 ? [] : [
		{ field: 'supplier', header: 'Supplier', showcol: true, arr: settings.Supplier.Supplier },
		{ field: 'date', header: 'Date', showcol: true },
		{ field: 'order', header: 'PO Supplier- IMS#', showcol: true },
		{ field: 'poWeight', header: 'PO Weight MT', showcol: true, },
		{ field: 'description', header: 'Material', showcol: true },
		{ field: 'unitPrc', header: 'Purchase Price', showcol: true, arr: settings.Currency.Currency },
		{ field: 'salesPrice', header: 'Sales Price', showcol: false, },
		{ field: 'shiipedWeight', header: 'Shipped Weight MT', showcol: true, },
		{ field: 'remaining', header: 'Remaining Weight MT', showcol: true, },
		{ field: 'client', header: 'Client', showcol: true, },
		{ field: 'totalPo', header: 'PO Client', showcol: true, },
		{ field: 'destination', header: 'Destination', showcol: true },
		{ field: 'comments', header: 'Comments/Status', showcol: true },

	];


	return (
		<div className="lg:container mx-auto px-2 md:px-8 xl:px-10 pb-8 md:pb-0">
			{Object.keys(settings).length === 0 ? <Spinner /> :
				<>
					<SignOut />
					<Toast />
					<ModalCopyInvoice />
					{loading && <Spin />}
					<div className="border border-slate-200 rounded-xl p-4 mt-8 shadow-md relative">
						<div className='flex items-center justify-between flex-wrap pb-2'>
							<div className="text-3xl p-1 pb-2 text-slate-500">Contracts Statement</div>
							<MonthSelect />
						</div>

						<Customtable data={loading ? [] : dataTable} propDefaults={propDefaults}
							lastAction={lastAction} name='Contracts statement'
							filteredData={filteredData} setFilteredData={setFilteredData}
							setCurFilterData={setCurFilterData} />
					</div>
				</>}
		</div>
	);

};

export default Contracts;

