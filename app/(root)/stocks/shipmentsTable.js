'use client';
import { useState, useEffect, useContext } from 'react';
import { getD } from '@utils/utils.js';
import { SettingsContext } from "@contexts/useSettingsContext";
import { HiArrowDownTray } from 'react-icons/hi2';
import { HiArrowUpTray } from 'react-icons/hi2';
import dateFormat from "dateformat";

import '../contracts/style.css';
import { getTtl } from '@utils/languages';

const getprefixInv = (x) => {
	return (x.invType === '1111' || x.invType === 'Invoice') ? '' :
		(x.invType === '2222' || x.invType === 'Credit Note') ? 'CN' : 'FN'
}

const sortDates = (arr) => {
	return arr.sort((a, b) => {
		const dateA = new Date(a.date);
		const dateB = new Date(b.date);

		return dateA - dateB;
	});

}

const Customtable = ({ data, item }) => {

	const [tableData, setTableData] = useState([])
	const { settings, ln } = useContext(SettingsContext);

	let cols = [
		{ field: 'date', header: getTtl('Date', ln), width: '70px' },
		{ field: 'supplier', header: getTtl('Supplier/Consignee', ln), arr: settings.Supplier.Supplier, width: '150px' },
		{ field: 'description', header: getTtl('Description', ln), width: '150px' },
		{ field: 'invoice', header: getTtl('Invoice', ln) + ' #', },
		{ field: 'qnty', header: getTtl('Weight', ln) },
		{ field: 'type', header: getTtl('Transaction', ln), },
		{ field: 'total', header: getTtl('Total', ln) },
	];

	useEffect(() => {
		let arr = []

		item.data.forEach(obj => {

			let fstItem = {
				date: obj.type === 'in' ?
					obj.indDate?.startDate ? dateFormat(obj.indDate.startDate, 'dd.mm.yy') : '-' :
					dateFormat(obj.date, 'dd.mm.yy'),
				supplier: obj.supplier,
				invoice: obj.invoice !== '' ? obj.type === 'in' && obj.description ? obj.poInvoices.find(x => x.id === obj.poInvoice)?.inv :
					obj.invoice + getprefixInv(obj) : '-',
				qnty: obj.qnty,
				type: obj.invoice !== '' ?
					//Options of invoices
					obj.type === 'in' && obj.description ? 'Purchase' :
						obj.type === 'out' && 'Shipment' :
					'Movement',
				total: 0,
				client: obj.type === 'in' ? null : obj.client,
				description: obj.descriptionName,
				moveType: obj.moveType,
				newStock: obj.newStock ?? '',
				oldStock: obj.oldStock ?? ''
			}

			arr.push(fstItem)

			//Check if there is Final QTY
			if (obj.type === 'in' && obj.finalqnty && obj.finalqnty * 1 !== obj.qnty * 1) {
				let fntItem = {
					date: obj.indDate?.startDate ? dateFormat(obj.indDate.startDate, 'dd.mm.yy') : '-',
					supplier: obj.supplier,
					invoice: obj.poInvoices.find(x => x.id === obj.poInvoice)?.inv,
					qnty: obj.qnty * 1 - obj.finalqnty * 1,
					type: 'Final Settlement',
					total: 0,
					client: '',
					description: obj.descriptionName,
					moveType: obj.moveType,
					newStock: obj.newStock ?? '',
					oldStock: obj.oldStock ?? ''

				}
				arr.push(fntItem)
			}


		})


		let sortedArr = sortDates(arr)
		for (let i = 0; i < sortedArr.length; i++) {
			let value = sortedArr[i].type === 'Purchase' || sortedArr[i].moveType === 'in' ?
				parseFloat(sortedArr[i].qnty).toFixed(3) * 1 : (parseFloat(sortedArr[i].qnty) * -1).toFixed(3) * 1
			let tmp = {
				...sortedArr[i], total: i === 0 ? value :
					(parseFloat(sortedArr[i - 1]['total']) + value).toFixed(3) * 1
			}
			sortedArr[i] = tmp
		}

		setTableData(sortedArr)

	}, [item])

	const showWeight = (x) => {
		const num = Math.abs(Number(x));
		if (isNaN(num)) return "-";
		return new Intl.NumberFormat('en-US', {
			minimumFractionDigits: 3
		}).format(num);
	}


	const showDetail = (obj, x) => {
		const tmp = cols.find(y => y.field === x);

		return x === 'supplier' ? obj.client ?? tmp.arr.find(z => z.id === obj.supplier)['nname'] :
			(x === 'type' && obj[x] === 'Purchase') ?
				<div className='flex items-center gap-1'><HiArrowDownTray className='font-semibold scale-110 text-green-600' /> <span >{obj[x]}</span> </div> :
				(x === 'type' && obj[x] === 'Final Settlement') ?
					<div className='flex items-center gap-1'> <span >{obj[x]}</span> </div> :
					(x === 'type' && (obj[x] !== 'Movement' && parseFloat(obj.qnty) >= 0)) ?
						<div className='flex items-center gap-1'><HiArrowUpTray className='font-semibold scale-110 text-red-600' /> <span >{obj[x]}</span> </div> :
						(x === 'type' && obj.moveType === 'in') ?
							<div className='flex items-center gap-1 group relative cursor-default'>
								<HiArrowDownTray className='font-semibold scale-110 text-green-600' />
								<span >{obj[x]}</span>
								<span className="absolute hidden group-hover:flex -top-2 w-fit p-1
    bg-slate-400 rounded-md text-center text-white responsiveText z-10 whitespace-nowrap -left-36 ">
									<span>{`Moved from:`}&nbsp;</span> <span className='font-semibold'>{`${settings.Stocks.Stocks.find(x => x.id === obj.oldStock)['stock']}`}</span></span>
							</div> :
							(x === 'type' && obj.moveType === 'out') ?
								<div className='flex items-center gap-1 group relative cursor-default'>
									<HiArrowUpTray className='font-semibold scale-110 text-red-600' />
									<span >{obj[x]}</span>
									<span className="absolute hidden group-hover:flex -top-2 w-fit p-1
    bg-slate-400 rounded-md text-center text-white responsiveText z-10 whitespace-nowrap -left-36 ">
										<span>{`Moved to:`}&nbsp;</span> <span className='font-semibold'>{`${settings.Stocks.Stocks.find(x => x.id === obj.newStock)['stock']}`}</span></span>
								</div> :
								x === 'qnty' ?
									<div className={`${obj.type === 'Purchase' || obj.moveType === 'in' || parseFloat(obj.qnty) < 0 ? 'text-green-600' : 'text-red-600'}`}>{showWeight(obj[x])}</div> :
									x === 'total' ? showWeight(obj[x]) :
										obj[x]
	}


	const styledDiv = (obj, key) => {
		return (
			key === 'total' ? 'font-medium text-right' :
				key === 'description' || key === 'supplier' ? 'whitespace-normal' :
					'py-0.5'
		)
	}


	return (
		<div className='mx-4 mb-4 rounded-2xl overflow-hidden border border-[#b8ddf8]' style={{ boxShadow: '0 2px 12px rgba(3,102,174,0.08)' }}>
			<div className="w-full overflow-x-auto">
				<table className="w-full" style={{ borderCollapse: 'collapse', fontFamily: "var(--font-poppins), 'Geist Sans', sans-serif", fontSize: '0.72rem' }}>
					<thead>
						<tr>
							{cols.map((x, k) => (
								<th key={k} style={{
									background: '#dbeeff',
									color: 'var(--chathams-blue)',
									fontWeight: 600,
									fontSize: '0.72rem',
									textAlign: 'center',
									padding: '7px 10px',
									border: '1px solid #b8ddf8',
									whiteSpace: 'normal',
										width: x.width || undefined,
									letterSpacing: '0.04em',
									textTransform: 'uppercase',
								}}>
									{x.header}
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{tableData.map((obj, i) => (
							<tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#f4f9ff' }}>
								{cols.map(x => (
									<td key={x.field} style={{
										padding: '5px 10px',
										border: '1px solid #e8f0f8',
										fontSize: '0.72rem',
										color: 'var(--chathams-blue)',
										textAlign: 'center',
										whiteSpace: x.field === 'description' || x.field === 'supplier' ? 'normal' : 'nowrap',
									width: x.width || undefined,
									}}>
										{showDetail(obj, x.field, { ttl: false })}
									</td>
								))}
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
};

export default Customtable;