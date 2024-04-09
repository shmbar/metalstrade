'use client';
import { useContext, useEffect, useState, useRef } from 'react';
import Customtable from './newTable';

//import MyDetailsModal from './modals/dataModal.js'
import { SettingsContext } from "@contexts/useSettingsContext";
import { ContractsContext } from "@contexts/useContractsContext";
import MonthSelect from '@components/monthSelect';
import Toast from '@components/toast.js'

import { loadData, getInvoices } from '@utils/utils'
import Spinner from '@components/spinner';
import { UserAuth } from "@contexts/useAuthContext"
import Spin from '@components/spinTable';
import { EXD } from './excel'
import dateFormat from "dateformat";
import { getTtl } from '@utils/languages';
import { MdOutlineArrowForwardIos } from "react-icons/md";
import { IoIosArrowDown } from "react-icons/io";


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

	const { settings, lastAction, dateSelect, setDateYr, setLoading, loading, ln } = useContext(SettingsContext);
	const { contractsData, setContractsData } = useContext(ContractsContext);
	const { uidCollection } = UserAuth();
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
			setLoading(false)
		}

		loadInv()
	}, [contractsData])


	const setCurFilterData = (arr) => {

		let newArr = []

		arr.forEach(obj => {

			let newObj = {};
			let total = 0;

			let materialsArr = [...new Set(obj.productsData.map(x => x.id))]

			materialsArr.forEach(x => {

				total = obj.productsData.find(q => q.id === x)['qnty']

				let totalShipped = 0;
				let totalClients = [];
				let totalPo = [];
				let totalDestination = [];
				// get the final invoices array

				let invTypeArr = getInvArray(obj)

				obj.invoicesData.forEach(z => {
					if (invTypeArr.includes(z.id)) {

						const countPOs = z.productsDataInvoice.filter(el => !isNaN(el) && el !== '').length;
						z.productsDataInvoice.forEach(f => {
							if (f.descriptionId === x) {
								totalShipped += parseFloat(f.qnty)
								let clnt = z.final ? z.client.nname : (settings.Client.Client).find(x => x.id === z.client).nname
								let pod = z.final ? z.pod : (settings.POD.POD).find(x => x.id === z.pod)?.['pod']
								totalPo.push(countPOs > 1 ? (f.po).trim() : (z.productsDataInvoice[0].po).trim())
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
					client: [...new Set(totalClients)],
					totalPo: [...new Set(totalPo)],
					destination: [...new Set(totalDestination)],
					/* for searching */
					id: obj.productsData.find(z => z.id === x).id, client1: [...new Set(totalClients)].join(' '),
					totalPo1: [...new Set(totalPo)].join(' '), destination1: [...new Set(totalDestination)].join(' ')
				}
				newArr.push(newObj)
			})
		});

		return newArr
	}

	let showWeight = (x) => {
		return new Intl.NumberFormat('en-US', {
			minimumFractionDigits: 3
		}).format(x)
	}

	let showAmount = (x) => {
		return Number(x.getValue()) ? new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: x.row.original.cur,
			minimumFractionDigits: 2
		}).format(x.getValue())
			: x.getValue()
	}

	let propDefaults = Object.keys(settings).length === 0 ? [] : [
		{
			accessorKey: 'expander', header: '', enableSorting: false,
			enableColumnPinning: true,
			enablePinning: true,
			cell: ({ row, getValue }) => (
				<div className='w-4'>
					<>
						{row.getCanExpand() ? (
							<button
								{...{
									onClick: row.getToggleExpandedHandler(),
									style: { cursor: 'pointer' },
								}}
							>
								{row.getIsExpanded() ? <IoIosArrowDown className='scale-125' /> : <MdOutlineArrowForwardIos />}
							</button>
						) : (
							<span className='pl-4'>🔵</span>
						)}
					</>
				</div>
			),
		},
		{
			accessorKey: 'date', header: getTtl('Date', ln), enableSorting: false, cell: (props) => <p>{dateFormat(props.getValue().startDate, 'dd-mmm-yy')}</p>
		},
		{
			accessorKey: 'order', header: getTtl('PO', ln) + '#'
		},
		{ accessorKey: 'supplier', header: getTtl('Supplier', ln) },
		{ accessorKey: 'poWeight', header: getTtl('Quantity', ln), cell: (props) => <p>{showWeight(props.getValue())}</p> },
		{ accessorKey: 'description', header: getTtl('Description', ln), cell: (props) => <p className='text-wrap w-20  md:w-64'>{props.getValue()}</p> },
		{ accessorKey: 'unitPrc', header: getTtl('purchaseValue', ln), cell: (props) => <p>{showAmount(props)}</p> },
		{ accessorKey: 'salesPrice', header: 'Sales Price' },
		{ accessorKey: 'shiipedWeight', header: getTtl('Shipped Weight', ln) + ' MT', cell: (props) => <p>{showWeight(props.getValue())}</p> },
		{
			accessorKey: 'remaining', header: getTtl('Remaining Weight', ln) + ' MT', cell: (props) => <p className={`${props.getValue() < 0 ? 'text-red-400 font-semibold' : ''}`}>
				{props.getValue() > 0 ? showWeight(props.getValue()) : showWeight(props.getValue() * -1)}</p>
		},
		{
			accessorKey: 'client', header: getTtl('Consignee', ln), cell: (props) => <span>{props.getValue()}</span>
		},
		{
			accessorKey: 'totalPo', header: getTtl('PO Client', ln), cell: (props) => <span>{props.getValue()}</span>
		},
		{
			accessorKey: 'destination', header: getTtl('Destination', ln), cell: (props) => <span>{props.getValue()}</span>
		},
		{ accessorKey: 'comments', header: getTtl('Comments/Status', ln) },
	];

	let invisible = ['salesPrice'].reduce((acc, key) => {
		acc[key] = false;
		return acc;
	}, {});

	const getFormatted = (arr) => {  //convert id's to values

		let newArr = []
		const gQ = (z, y, x) => settings[y][y].find(q => q.id === z)?.[x] || ''

		arr.forEach(row => {
			let formattedRow = {
				...row,
				supplier: gQ(row.supplier, 'Supplier', 'nname'),
				cur: gQ(row.cur, 'Currency', 'cur'),
			}

			newArr.push(formattedRow)
		})

		return newArr
	}

	const groupedArrayInvoice = (arrD) => {

		const groupedArray1 = arrD.sort((a, b) => {
			return a.order - b.order;
		}).reduce((result, obj) => {

			const group = result.find((group) => group[0]?.order === obj.order);

			if (group) {
				group.push(obj);
			} else {
				result.push([obj]);
			}

			return result;
		}, []); // Initialize result as an empty array

		let newArr = []
		for (let i of groupedArray1) {

			newArr.push({
				...i[0],
				poWeight: i.reduce((total, obj) => {
					return total + obj.poWeight * 1;
				}, 0),
				unitPrc: '',
				description: getTtl('Details expanded', ln),
				shiipedWeight: i.reduce((total, obj) => {
					return total + obj.shiipedWeight * 1;
				}, 0),
				remaining: i.reduce((total, obj) => {
					return total + obj.remaining * 1;
				}, 0),
				client: getTtl('Details expanded', ln),
				totalPo: getTtl('Details expanded', ln),
				destination: getTtl('Details expanded', ln),
				subRows: i.map(z => ({
					...z, client: z.client.map((item, index) => {
						return <div key={index}>{item}</div>
					}),
					totalPo: z.totalPo.map((item, index) => {
						return <div key={index}>{item}</div>
					}),
					destination: z.destination.map((item, index) => {
						return <div key={index}>{item}</div>
					}),
				}))
			})
		}

		return newArr;
	};

	return (
		<div className="container mx-auto px-2 md:px-8 xl:px-10 pb-8 md:pb-0 mt-16 md:mt-0">
			{Object.keys(settings).length === 0 ? <Spinner /> :
				<>
					<Toast />

					{loading && <Spin />}
					<div className="border border-slate-200 rounded-xl p-4 mt-8 shadow-md relative">
						<div className='flex items-center justify-between flex-wrap pb-2'>
							<div className="text-3xl p-1 pb-2 text-slate-500">{getTtl('Contracts Statement', ln)}</div>
							<MonthSelect />
						</div>

						<Customtable data={loading ? [] : groupedArrayInvoice(getFormatted(dataTable))} columns={propDefaults}
							excellReport={EXD(dataTable, settings, getTtl('Contracts Statement', ln), ln)}
							invisible={invisible} ln={ln} />
					</div>
				</>}
		</div>
	);

};

export default Contracts;

