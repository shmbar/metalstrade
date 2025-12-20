'use client';
import { useContext, useEffect, useState, useRef } from 'react';
import Customtable from './newTable';
import Customtable1 from './newTable1';
//import MyDetailsModal from './modals/dataModal.js'
import { SettingsContext } from "@contexts/useSettingsContext";
import { ContractsContext } from "@contexts/useContractsContext";
import MonthSelect from '@components/monthSelect';
import Toast from '@components/toast.js'
import TableTotals from './totals/tableTotals';
import { loadData, getInvoices, sortArr, loadStockData } from '@utils/utils'
import Spinner from '@components/spinner';
import { UserAuth } from "@contexts/useAuthContext"
import Spin from '@components/spinTable';
import { EXD } from './excel'
import dateFormat from "dateformat";
import { getTtl } from '@utils/languages';
import { MdOutlineArrowForwardIos } from "react-icons/md";
import { IoIosArrowDown } from "react-icons/io";
import DateRangePicker from '@components/dateRangePicker';
import Tooltip from '@components/tooltip';
import { Switch } from "@/components/ui/switch"


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

const arrayIncludesString = (row, columnId, filterValue) => {
	const cellValue = row.getValue(columnId);
	if (!Array.isArray(cellValue)) return false;
	if (!filterValue) return true;

	const search = filterValue.toLowerCase();

	return cellValue.some(item => {
		if (item === null || item === undefined) return false;
		return item.toString().toLowerCase().includes(search);
	});
};


const Contracts = () => {

	const { settings, lastAction, dateSelect, setDateYr, setLoading, loading, ln } = useContext(SettingsContext);
	const { contractsData, setContractsData } = useContext(ContractsContext);
	const { uidCollection } = UserAuth();
	const [dataTable, setDataTable] = useState([])
	const [totals, setTotals] = useState([])
	const [filteredData, setFilteredData] = useState([])
	const [enabledSwitch, setEnabledSwitch] = useState(true)

	useEffect(() => {

		const Load = async () => {
			setLoading(true)
			let dt = await loadData(uidCollection, 'contracts', dateSelect);
			setContractsData(dt)
		}

		Object.keys(settings).length !== 0 && Load();
	}, [dateSelect, settings])

	const gQ = (z, y, x) => settings[y][y].find(q => q.id === z)?.[x] || ''

	useEffect(() => {

		const loadInv = async () => {
			let dt = [...contractsData]
			dt = await Promise.all(
				dt.map(async (x) => {
					const Invoices = await loadInvoices(uidCollection, x)
					const Stock = await loadStockData(uidCollection, 'id', x.stock)

					return {
						...x,
						invoicesData: Invoices,
						stcokData: Stock,
					};
				})
			);

			dt = setCurFilterData(dt)

			const groupedTotals = dt.reduce((acc, { supplier, poWeight, shiipedWeight, cur, remaining }) => {

				let key = cur === "us" ? "totalsUs" : "totalsEU";

				acc[key] ??= []; // Initialize array if not present
				let existing = acc[key].find(z => z.supplier === supplier);

				if (existing) {
					existing.poWeight = (Number(existing.poWeight) || 0) + (Number(poWeight) || 0);
					existing.shiipedWeight = (Number(existing.shiipedWeight) || 0) + (Number(shiipedWeight) || 0);
					existing.remaining = existing.poWeight - existing.shiipedWeight

				} else {
					acc[key].push({ supplier, poWeight, shiipedWeight, remaining, cur });
				}

				return acc;
			}, { totalsUs: [], totalsEU: [] });

			const totals = [...groupedTotals.totalsUs, ...groupedTotals.totalsEU];

			setTotals(totals);

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

			let materialsArr = [...new Set(obj.productsData.map(x => x.id))]

			materialsArr.forEach(x => {

				total = obj.productsData.find(q => q.id === x)['qnty']

				let totalShipped = 0;
				let totalClients = [];
				let totalPo = [];
				let totalDestination = [];
				let totalInvoices = [];
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
								totalInvoices.push(z.invoice)
							}
						})
					}
				})

				let objTmp = obj.stcokData.filter(c => c.description === x).filter(v => v.qnty * 1 !== 0)
				newObj = {
					supplier: obj.supplier, originSupplier: obj.originSupplier, 
					date: obj.date, order: obj.order, poWeight: total,
					comments: obj.comments, description: obj.productsData.find(z => z.id === x).description,
					unitPrc: obj.productsData.find(z => z.id === x).unitPrc, cur: obj.cur,
					shiipedWeight: totalShipped, remaining: total - totalShipped,
					client: totalClients.length > 0 ? [...new Set(totalClients)] : objTmp.map(x => (settings.Client.Client.find(d => d.id === x.client)?.nname ?? '')),
					totalPo: totalPo.length > 0 ? [...new Set(totalPo)] : objTmp.map(x => x.qnty + '-' + (x.salesPo ?? '')),
					destination: [...new Set(totalDestination)],
					invoiceNum: [...new Set(totalInvoices)],
					/* for searching */
					id: obj.productsData.find(z => z.id === x).id, client1: [...new Set(totalClients)].join(' '),
					totalPo1: [...new Set(totalPo)].join(' '), destination1: [...new Set(totalDestination)].join(' '),
					status: objTmp.map(x => x.qnty + '-' + (x.status ?? '')),
					qntyReceived: objTmp.reduce((total, obj1) => {
						return total + obj1.qnty * 1;
					}, 0)
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
			enableColumnFilter: false,
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
			accessorKey: 'date', header: getTtl('Date', ln), cell: (props) => <p>{dateFormat(props.getValue(), 'dd-mmm-yy')}</p>,
			meta: {
				filterVariant: 'dates',
			},
			filterFn: 'dateBetweenFilterFn'
		},
		{
			accessorKey: 'order', header: getTtl('PO', ln) + '#'
		},
		{
			accessorKey: 'supplier', header: getTtl('Supplier', ln),
			meta: {
				filterVariant: 'selectSupplier',
			},
		},
		{
			accessorKey: 'originSupplier', header: 'Original supplier',
		},
		{
			accessorKey: 'client', header: getTtl('Consignee', ln),
			filterFn: arrayIncludesString,
			cell: (props) => {
				return enabledSwitch ? props.getValue() : (
					<div className="flex flex-col">
						{props.getValue().map((client, index) => (
							<div key={index}>{client}</div>
						))}
					</div>
				);
			},
		},
		{ accessorKey: 'poWeight', header: getTtl('Quantity', ln), cell: (props) => <p>{showWeight(props.getValue())}</p> },
		{ accessorKey: 'description', header: getTtl('Description', ln), cell: (props) => <p className='text-wrap w-20  md:w-64'>{props.getValue()}</p> },
		{ accessorKey: 'unitPrc', header: getTtl('purchaseValue', ln), cell: (props) => <p>{showAmount(props)}</p> },
		// { accessorKey: 'salesPrice', header: 'Sales Price' },
		{ accessorKey: 'shiipedWeight', header: getTtl('Shipped Weight', ln) + ' MT', cell: (props) => <p>{showWeight(props.getValue())}</p> },
		{
			accessorKey: 'remaining', header: getTtl('Remaining Weight', ln) + ' MT', cell: (props) => <p className={`${props.getValue() < 0 ? 'text-red-400 font-semibold' : ''}`}>
				{props.getValue() > 0 ? showWeight(props.getValue()) : showWeight(props.getValue() * -1)}</p>
		},
		{
			accessorKey: 'qntyReceived', header: 'Mat. Table', cell: (props) => <span>
				{(() => {
					const v = props.getValue();
					return v === 'Details expanded' ? v : v === 0 ? '-' : showWeight(v);
				})()
				}</span>
		},
		{
			accessorKey: 'status', header: getTtl('Status', ln),
			filterFn: arrayIncludesString,
			cell: (props) => {
				return enabledSwitch ? props.getValue() : (
					<div className="flex flex-col">
						{props.getValue().map((status, index) => (
							<div key={index}>{status}</div>
						))}
					</div>
				);
			},
		},
		{
			accessorKey: 'totalPo', header: getTtl('PO Client', ln),
			filterFn: arrayIncludesString,
			cell: (props) => {
				return enabledSwitch ? props.getValue() : (
					<div className="flex flex-col">
						{props.getValue().map((totalPo, index) => (
							<div key={index}>{totalPo}</div>
						))}
					</div>
				);
			},
		},
		{
			accessorKey: 'destination', header: getTtl('Destination', ln),
			filterFn: arrayIncludesString,
			cell: (props) => {
				return enabledSwitch ? props.getValue() : (
					<div className="flex flex-col">
						{props.getValue().map((destination, index) => (
							<div key={index}>{destination}</div>
						))}
					</div>
				);
			},
		},
		{
			accessorKey: 'invoiceNum', header: getTtl('Invoice', ln),
			filterFn: arrayIncludesString, // doesnt work here since the invoic is number
			cell: (props) => {
				return enabledSwitch ? props.getValue() : (
					<div className="flex flex-col">
						{props.getValue().map((invoiceNum, index) => (
							<div key={index}>{invoiceNum}</div>
						))}
					</div>
				);
			},
		},
		{ accessorKey: 'comments', header: getTtl('Comments/Status', ln), cell: (props) => <span className='w-[560px] flex text-wrap'>{props.getValue()}</span> },
	];

	let invisible = ['salesPrice', 'originSupplier'].reduce((acc, key) => {
		acc[key] = false;
		return acc;
	}, {});

	const getFormatted = (arr) => {  //convert id's to values

		let newArr = []

		arr.forEach(row => {
			let formattedRow = {
				...row,
				supplier: gQ(row.supplier, 'Supplier', 'nname'),
				originSupplier: gQ(row.originSupplier, 'Supplier', 'nname'),
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
				qntyReceived: getTtl('Details expanded', ln),
				client: getTtl('Details expanded', ln),
				totalPo: getTtl('Details expanded', ln),
				destination: getTtl('Details expanded', ln),
				status: getTtl('Details expanded', ln),
				invoiceNum: getTtl('Details expanded', ln),
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
					invoiceNum: z.invoiceNum.map((item, index) => {
						return <div key={index}>{item}</div>
					}),
					status: z.status.map((item, index) => {
						return <div key={index}>{item}</div>
					}),
				}))
			})
		}

		return newArr;
	};

	let colsTotals = Object.keys(settings).length === 0 ? [] : [
		{
			accessorKey: 'supplier', header: getTtl('Vendor', ln),
			cell: (props) => <p>{gQ(props.getValue('supplier'), 'Supplier', 'nname')}</p>
		},
		{ accessorKey: 'poWeight', header: getTtl('Quantity', ln), cell: (props) => <p>{showWeight(props.getValue())}</p> },
		{ accessorKey: 'shiipedWeight', header: getTtl('Shipped Weight', ln) + ' MT', cell: (props) => <p>{showWeight(props.getValue())}</p> },
		{
			accessorKey: 'remaining', header: getTtl('Remaining Weight', ln) + ' MT', cell: (props) => <p className={`${props.getValue() < 0 ? 'text-red-400 font-semibold' : ''}`}>
				{props.getValue() > 0 ? showWeight(props.getValue()) : showWeight(props.getValue() * -1)}</p>
		},
	];


	const TableModes = () => {
		return (
			<div className='flex items-center gap-2'>
				<p>{enabledSwitch ? 'Expanded mode' : 'Table mode'}</p>
				<Switch checked={enabledSwitch} onCheckedChange={() => setEnabledSwitch(prev => !prev)} />
			</div>
		)
	}

	return (
		<div className="container mx-auto px-2 md:px-8 xl:px-10 pb-8 md:pb-0 mt-16 md:mt-0">
			{Object.keys(settings).length === 0 ? <Spinner /> :
				<>
					<Toast />

					{loading && <Spin />}
					<div className="border border-slate-200 rounded-xl p-4 mt-8 shadow-md relative">
						<div className='flex items-center justify-between flex-wrap pb-2'>
							<div className="text-3xl p-1 pb-2 text-slate-500">{getTtl('Contracts Statement', ln)}</div>
							<div className='flex group'>
								<DateRangePicker />
								<Tooltip txt='Select Dates Range' />
							</div>
						</div>
						{enabledSwitch ?
							<Customtable data={loading ? [] : groupedArrayInvoice(getFormatted(dataTable))} columns={propDefaults}
								excellReport={EXD(dataTable.filter(x => filteredData.map(z => z.id).includes(x.id)), settings, getTtl('Contracts Statement', ln), ln)}
								invisible={invisible} ln={ln}
								setFilteredData={setFilteredData}
								tableModes={<TableModes />} type='contractStatementTableModes'
							/>
							:
							<Customtable1 data={loading ? [] : (getFormatted(dataTable))} columns={propDefaults.slice(1)}
								excellReport={EXD(dataTable.filter(x => filteredData.map(z => z.id).includes(x.id)), settings, getTtl('Contracts Statement', ln), ln)}
								invisible={invisible} ln={ln}
								setFilteredData={setFilteredData}
								tableModes={<TableModes />} type='contractStatementTableModes'
							/>

						}

						<div className='pt-8'>
							<TableTotals data={sortArr(totals.map(z => ({ ...z, spName: gQ(z.supplier, 'Supplier', 'nname') })), 'spName')} columns={colsTotals} expensesData={dataTable}
								settings={settings} />
						</div>
					</div>
				</>}
		</div>
	);

};

export default Contracts;

