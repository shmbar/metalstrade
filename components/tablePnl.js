'use client';
import { useState, useContext } from 'react';
import { getD } from '@utils/utils.js';
import { SettingsContext } from "@contexts/useSettingsContext";

const frmNum = (value, obj, settings) => {
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: obj.final ? obj.cur.cur : getD(settings.Currency.Currency, obj, 'cur'),
		minimumFractionDigits: 2
	}).format(value)

}

const accum = (arr, name) => {
	return arr.reduce((accumulator, currentValue) => {
		return accumulator + parseFloat(currentValue[name] || 0);
	}, 0)
}

const accumExp = (arr, name, val, mult) => {

	return arr.reduce((accumulator, currentValue) => {

		let mltTmp = currentValue.cur === val.cur ? 1 :
			currentValue.cur === 'us' && val.cur === 'eu' ? 1 / mult : mult

		return accumulator + parseInt(currentValue[name] * 1 * mltTmp, 10);
	}, 0)
}

const totalPaymentsData = (data) => {
	let tmp = accum(data.reduce((accumulator, item) => {
		if (item.payments && item.payments.length) {
			accumulator = accumulator.concat(item.payments);
		}
		return accumulator;
	}, []), 'pmnt')

	return tmp;
}

const Customtable = ({ data, propDefaults, val, mult }) => {

	const cols = propDefaults;
	const { settings } = useContext(SettingsContext);

	const getprefixInv = (x) => {
		return (x.invType === '1111' || x.invType === 'Invoice') ? '' :
			(x.invType === '2222' || x.invType === 'Credit Note') ? 'CN' : 'FN'
	}

	const sortedData = (arr) => {
		return arr.map(z => ({
			...z,
			d: z.final ? z.invType === 'Invoice' ? '1111' :
				z.invType === 'Credit Note' ? '2222' : '3333'
				: z.invType
		})).sort((a, b) => {
			const invTypeOrder = { '1111': 1, '2222': 2, '3333': 3 };
			const invTypeA = a.d || '';
			const invTypeB = b.d || '';
			return invTypeOrder[invTypeA] - invTypeOrder[invTypeB]
		})
	}

	const showDetail = (obj, x) => {

		const tmp = cols.find(y => y.field === x);

	
		return x === 'client' ? obj.final ? obj.client.client : settings.Client.Client.find(z => z.id === obj.client)?.nname :
			x === 'invoice' ? obj[x] + getprefixInv(obj) :
				x === 'totalAmount' || x === 'totalPrepayment' || x === 'amount' ? frmNum(obj[x], obj, settings) :
					x === 'prepaidPer' ? isNaN(obj.totalPrepayment / obj.totalAmount) ? '-' : ((obj.totalPrepayment / obj.totalAmount) * 100).toFixed(1) + '%' :
						x === 'inDebt' ? frmNum(obj.totalAmount - obj.totalPrepayment, obj, settings) :
							x === 'payments' ? frmNum(accum(obj.payments, 'pmnt'), obj, settings) :
								x === 'debtaftr' ? data.length === 1 || sortedData(data).findIndex(x => x.id === obj.id) !== (data.length - 1) ? frmNum(obj.totalPrepayment - accum(obj.payments, 'pmnt'), obj, settings) :
									frmNum(obj.totalPrepayment - totalPaymentsData(data), obj, settings)
									:
									x === 'debtBlnc' ? data.length === 1 || sortedData(data).findIndex(x => x.id === obj.id) !== (data.length - 1) ? frmNum(obj.totalAmount - accum(obj.payments, 'pmnt'), obj, settings) :
										frmNum(obj.totalAmount - totalPaymentsData(data), obj, settings)
										:
										x === 'expenses' ? frmNum(accumExp(obj.expenses, 'amount', val, mult), val, settings) :
											(x === 'deviation' && data.length > 1 && obj.invType !== '1111' &&
												sortedData(data).findIndex(x => x.id === obj.id) === (data.length - 1)) ?
												frmNum(accum(data, 'totalAmount') * 1 - sortedData(data)[0].totalAmount * 2, obj, settings) :
												obj[x]
	}


	return (
		<div className="relative border rounded-lg ">

			<div className="overflow-x-auto rounded-lg">
				<table className='w-full'>
					<thead className="bg-slate-500 divide-y divide-gray-200 ">
						<tr className='border-b '>
							{cols.map(x => x.header)
								.map((y, k) => (
									<th
										scope="col"
										key={k}
										className="px-3 py-1 text-left text-[0.6rem] font-medium uppercase text-white"
									>
										{y}
									</th>

								))}
						</tr>
					</thead>
					<tbody className="divide-y divide-gray-200 ">
						{sortedData(data).map((obj, i) => (
							<tr key={i}>
								{cols.map(x => (
									<td key={x.field} data-label={x.header} className={`table_cell px-3 py-0.5 text-[0.6rem] items-center
									${data.length === (i + 1) && 'font-medium'}`} >
										<div className='py-1'>
											{showDetail(obj, x.field)}
										</div>
									</td>
								))}
							</tr>
						))}
						{data.length > 1 && <tr>
							{cols.map(x => (
								<td key={x.field} data-label={x.header} className='table_cell px-3 py-0.5 text-[0.6rem] items-center' >
									<div className='py-1 font-medium'>
										{x.field === 'expenses' ? frmNum(accumExp(data.reduce((accumulator, item) => {
											if (item.expenses && item.expenses.length) {
												accumulator = accumulator.concat(item.expenses);
											}
											return accumulator;
										}, []), 'amount', val, mult), val, settings) :
											x.field === 'payments' ? frmNum(totalPaymentsData(data), data[0], settings) : ''}
									</div>
								</td>
							))}
						</tr>}
					</tbody>
				</table>
			</div>
		</div>
	);
};

export default Customtable;