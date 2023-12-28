'use client'
import { useContext, useEffect, useState } from 'react'
import { SettingsContext } from "@contexts/useSettingsContext";
import { InvoiceContext } from "@contexts/useInvoiceContext";
import CBox from '@components/combobox.js'
import { getD, reOrderTableInv } from '@utils/utils.js';
import Datepicker from "react-tailwindcss-datepicker";
import { Pdf } from '../../contracts/modals/pdfInvoice.js';
import { PdfFnlCncl } from '../../contracts/modals/pdfInvoiceFnlCncl.js';
import ProductsTable from '../../contracts/modals/productsTableInvoice.js';
import ModalToAction from '@components/modalToProceed';
import { VscSaveAs } from 'react-icons/vsc';
import { VscClose } from 'react-icons/vsc';
import { FaFilePdf } from 'react-icons/fa';
import { GiMoneyStack } from 'react-icons/gi'
import { BsFillSendCheckFill } from 'react-icons/bs';
import InvoiceType from './invoiceType.js'
import { GiCancel } from 'react-icons/gi';
import { TbStackPush } from 'react-icons/tb';
import Expenses from '../../contracts/modals/expenses'
import Payments from '../../contracts/modals/payments.js'
import { UserAuth } from "@contexts/useAuthContext";
import Spinner from '@components/spinner.js';
import Remarks from '../../contracts/modals/remarks'
import { validate, ErrDiv } from '@utils/utils'


const InvoiceModal = () => {

	const { settings, compData, loading } = useContext(SettingsContext);
	const { valueInv, setValueInv, setIsOpen,
		saveData_InvoiceInInvoices, finilizeInvoice, cancelInvoice, errors, setErrors, setDeleteProducts } = useContext(InvoiceContext);
	const clts = settings.Client.Client;
	const client = valueInv.client && clts.find(z => z.id === valueInv.client);
	const [isFinilizeOpen, setIsFinilizeOpen] = useState(false)
	const [isCanceleOpen, setIsCancelOpen] = useState(false)
	const [showExpenses, setShowExpenses] = useState(false)
	const [showPayments, setShowPayments] = useState(false)
	const fnl = valueInv.final
	const { uidCollection } = UserAuth();

	const selectInvType = (e) => {

		!fnl && setValueInv({
			...valueInv, invType: e.id,
			packing: (e.id === '2222' || e.id === '3333') ? '' : valueInv.packing,
			percentage: '', totalPrepayment: '', balanceDue: ''
		})

	}

	useEffect(() => {
		if (Object.values(errors).includes(true)) {
			setErrors(validate(valueInv, ['client', 'cur', 'invoice', 'shpType', 'date']))
		}
	}, [valueInv])


	//for disabling fields
	let firstRule = valueInv.delTerm === '32432' || valueInv.delTerm === '456' || valueInv.delTerm === '43214'
		|| valueInv.delTerm === '567';
	let secondRule = valueInv.packing === 'P6' || valueInv.packing === 'Ingots' || valueInv.packing === 'P7'
		|| valueInv.packing === 'Loose'
	let thirdRule = valueInv.packing === 'P6' || valueInv.packing === 'Ingots'
	let fourthRule = valueInv.packing === 'P7' || valueInv.packing === 'Loose'

	const handleValue = (e) => {
		setValueInv({ ...valueInv, [e.target.name]: e.target.value })
	}

	const handleDateChangeDate = (newValue) => {
		setValueInv({ ...valueInv, date: newValue })
	}

	const handleDateChangeDelvrDate = (newValue) => {
		setValueInv({ ...valueInv, delDate: newValue })
	}
	//Total Net WT Kgs:
	const options = { style: 'decimal', minimumFractionDigits: 0, maximumFractionDigits: 2 };
	const locale = 'en-US';
	const NetWTKgsTmp = (valueInv.productsDataInvoice.map(x => x.qnty)
		.reduce((accumulator, currentValue) => accumulator + currentValue * 1, 0) * 1000);
	const NetWTKgs = NetWTKgsTmp.toLocaleString(locale, options);

	//Total Tarre WT Kgs:
	const TotalTarre = (valueInv.ttlGross - NetWTKgsTmp).toLocaleString(locale, options);
	let poArr = [...new Set(valueInv.productsDataInvoice.map(x => x.po).filter(x => x !== ''))]

	const getprefixInv = (x) => {
		return (x.invType === '1111' || x.invType === 'Invoice') ? '' :
			(x.invType === '2222' || x.invType === 'Credit Note') ? 'CN' : 'FN'
	}

	const setShowPmntExp = (val) => {
		if (val === 'exp') {
			if (!showExpenses && !showPayments) {
				setShowExpenses(true)
			}
			if (showExpenses && !showPayments) {
				setShowExpenses(false)
			}
			if (!showExpenses && showPayments) {
				setShowExpenses(true)
				setShowPayments(false)
			}
			if (!showExpenses && showPayments) {
				setShowExpenses(true)
				setShowPayments(false)
			}
		}

		if (val === 'pmnt') {
			if (!showExpenses && !showPayments) {
				setShowPayments(true)
			}
			if (!showExpenses && showPayments) {
				setShowPayments(false)
			}
			if (showExpenses && !showPayments) {
				setShowPayments(true)
				setShowExpenses(false)
			}
		}
	}
	///* materialsArr ={ valueInv.productsData.map(x => ({ id: x.id, description: x.description }))}*/
	return (
		<div className="px-1">
			{loading && <Spinner />}
			<div className='grid grid-cols-12 gap-3 pt-1'>
				<div className='col-span-12 md:col-span-3 border border-slate-300 p-2 rounded-lg'>
					<p className='flex items-center text-sm font-medium'>Consignee:</p>
					<div>
						{!fnl ?
							<CBox data={clts} setValue={setValueInv} value={valueInv} name='client' classes='shadow-md' />
							:
							<p className='pt-2 pl-1 text-xs font-medium'>{valueInv.client.client}</p>
						}
						<ErrDiv field='client' errors={errors} />
					</div>
					{client && (
						<>
							<p className='pt-2 pl-1 text-xs'>{client.street}</p>
							<p className='pt-2 pl-1 text-xs'>{client.city}</p>
							<p className='pt-2 pl-1 text-xs'>{client.country}</p>
							<p className='pt-2 pl-1 text-xs'>{client.other1}</p>
						</>
					)}
					{fnl && (
						<>
							<p className='pt-2 pl-1 text-xs'>{valueInv.client.street}</p>
							<p className='pt-2 pl-1 text-xs'>{valueInv.client.city}</p>
							<p className='pt-2 pl-1 text-xs'>{valueInv.client.country}</p>
							<p className='pt-2 pl-1 text-xs'>{valueInv.client.other1}</p>
						</>
					)}
				</div>
				<div className='col-span-12 md:col-span-2 border border-slate-300 p-2 rounded-lg flex flex-col'>
					<p className='text-sm text-slate-600 font-medium indent-1'>Invoice Type:</p>
					{!fnl ?
						<InvoiceType setSelected={selectInvType} plans={settings.InvTypes.InvTypes} value={valueInv} />
						:
						<p className='pt-2 pl-1 text-xs'>{valueInv.invType}</p>
					}
				</div>
				<div className='col-span-12 md:col-span-3 border border-slate-300 p-2 rounded-lg flex flex-col'>
					<p className='text-sm text-slate-600 font-medium indent-1'>PO#:</p>
					{valueInv.productsDataInvoice.length > 0 && <ul className="flex flex-col mt-1 ring-1 ring-black/5 rounded-lg divide-y" >
						{poArr.map((x, i) => {
							return (
								<li key={i}
									className='items-center py-0.5 px-1.5 text-[0.8rem] text-slate-700
									truncate'>
									{x}
								</li>
							)
						})}
					</ul>}

				</div>
				<div className='col-span-12 md:col-span-4 border border-slate-300 p-2 rounded-lg'>
					<div className='flex items-center pt-1'>
						<p className='flex text-xs font-medium'>Date:</p>
						<div className='w-full px-2'>
							{!fnl ?
								<>
									<Datepicker useRange={false}
										asSingle={true}
										value={valueInv.date}
										popoverDirection='down'
										onChange={handleDateChangeDate}
										displayFormat={"DD-MMM-YYYY"}
										inputClassName='input w-full text-[15px] shadow-lg h-7 text-xs'
									/>
									<ErrDiv field='date' errors={errors} />
								</>
								:
								<p className='pl-1 text-xs'>{valueInv.date}</p>
							}
						</div>
					</div>

					<div className='flex pt-2'>
						<p className='flex items-center text-xs font-medium whitespace-nowrap'>
							{!fnl ? valueInv.invType === '1111' ? 'Invoice No:' : valueInv.invType === '2222' ?
								'Credit Note No:' : 'Final Note No:' :
								valueInv.invType + ' No:'}</p>
						<div className='w-full px-2 items-end flex'>
							<p className='text-xs '>{valueInv.invoice + getprefixInv(valueInv)}</p>
						</div>
					</div>
					<div className='flex pt-2 gap-3'>
						<div className='flex items-center text-xs font-medium whitespace-nowrap'>Status:</div>
						<div className='flex items-center text-xs font-bold whitespace-nowrap'>
							{!fnl ? 'Draft' :
								fnl && !valueInv.canceled ? 'Finalized' :
									(fnl && valueInv.canceled) && 'Canceled'}</div>
					</div>
				</div>
			</div>


			<div className='grid grid-cols-3 gap-3 pt-2'>
				<div className='col-span-12 md:col-span-1 border border-slate-300 p-2 rounded-lg'>
					<div className='flex gap-4 justify-between'>
						<p className='flex items-center text-sm font-medium whitespace-nowrap'>Shipment:</p>
						<div className='w-full md:w-44'>
							{!fnl ?
								<CBox data={settings.Shipment.Shipment} setValue={setValueInv} value={valueInv} name='shpType' classes='shadow-md' />
								:
								<p className=' pl-1 text-sm'>{valueInv.shpType}</p>
							}
							<ErrDiv field='shpType' errors={errors} />
						</div>
					</div>

					<div className='flex gap-4 justify-between'>
						<p className='flex items-center text-sm font-medium whitespace-nowrap'>Origin:</p>
						<div className='w-full md:w-44'>
							{!fnl ?
								<CBox data={settings.Origin.Origin} setValue={setValueInv} value={valueInv} name='origin' classes='shadow-md' />
								:
								<p className=' pl-1 text-sm'>{valueInv.origin}</p>
							}
						</div>
					</div>
					<div className='flex gap-4 justify-between'>
						<p className='flex items-center text-sm font-medium whitespace-nowrap'>Delivery Terms:</p>
						<div className='w-full md:w-44'>
							{!fnl ?
								<CBox data={settings['Delivery Terms']['Delivery Terms']} setValue={setValueInv} value={valueInv} name='delTerm' classes='shadow-md' />
								:
								<p className=' pl-1 text-sm'>{valueInv.delTerm}</p>
							}
						</div>
					</div>
					<div className='flex items-center pt-1 justify-between'>
						<p className='flex text-sm font-medium whitespace-nowrap'>Delivery Date:</p>
						<div className='w-full md:w-44'>
							{!fnl ?
								<Datepicker useRange={false}
									asSingle={true}
									value={valueInv.delDate}
									popoverDirection='up'
									onChange={handleDateChangeDelvrDate}
									displayFormat={"DD-MMM-YYYY"}
									inputClassName='input w-full text-[15px] shadow-lg h-7 text-xs'
								/>
								:
								<p className='pl-1 text-sm'>{valueInv.delDate}</p>
							}
						</div>
					</div>
				</div>

				<div className='col-span-12 md:col-span-1 border border-slate-300 p-2 rounded-lg'>
					<div className='flex gap-4 justify-between'>
						<p className='flex items-center text-sm font-medium whitespace-nowrap'>POL:</p>
						<div className='w-full md:w-44'>
							{!fnl ?
								<CBox data={settings.POL.POL} setValue={setValueInv} value={valueInv} name='pol' classes='shadow-md' />
								:
								<p className=' pl-1 text-sm'>{valueInv.pol}</p>
							}
						</div>
					</div>
					<div className='flex gap-4 justify-between'>
						<p className='flex items-center text-sm font-medium whitespace-nowrap'>POD:</p>
						<div className='w-full md:w-44'>
							{!fnl ?
								<CBox data={settings.POD.POD} setValue={setValueInv} value={valueInv} name='pod' classes='shadow-md'
									disabled={firstRule}
								/>
								:
								<p className=' pl-1 text-sm'>{valueInv.pod}</p>
							}

						</div>
					</div>
					{(valueInv.invType === '1111' || valueInv.invType === 'Invoice') &&
						<div className='flex gap-4 justify-between'>
							<p className='flex items-center text-sm font-medium whitespace-nowrap'>Packing:</p>
							<div className='w-full md:w-44'>
								{!fnl ?
									<CBox data={settings.Packing.Packing} setValue={setValueInv} value={valueInv} name='packing' classes='shadow-md'
										disabled={valueInv.invType === '2222' || valueInv.invType === '3333'} />
									:
									<p className=' pl-1 text-sm'>{valueInv.packing}</p>
								}
							</div>
						</div>}
				</div>

				<div className='col-span-12 md:col-span-1 border border-slate-300 p-2 rounded-lg'>
					<div className={`flex gap-4 justify-between ${fnl ? 'py-0.5' : 'py-1.5'}`}>
						<p className='flex items-center text-sm font-medium whitespace-nowrap'>Total Net WT Kgs:</p>
						<p className='text-sm pr-6 text-slate-700'>
							{NetWTKgs}
						</p>
					</div>
					{(valueInv.invType === '1111' || valueInv.invType === 'Invoice') &&
						<div className={`flex gap-4 justify-between ${fnl ? 'py-0.5' : 'py-1.5'}`}>
							<p className={`flex items-center text-sm ${secondRule && 'text-slate-400'} font-medium whitespace-nowrap`}>Total Tarre   WT Kgs:</p>
							<p className={`text-sm pr-6  ${parseInt(TotalTarre) < 0 ? 'text-red-400 font-medium' : 'text-slate-700'}`}>{secondRule ? '' : TotalTarre}</p>
						</div>
					}
					<div className={`flex gap-4 justify-between ${fnl ? 'py-0.5' : 'py-1.5'}`}>
						<p className={`flex items-center text-sm font-medium whitespace-nowrap ${fourthRule && 'text-slate-400'}`}>{thirdRule ? 'QTY Ingots' : 'Total Gross  WT Kgs'}:</p>
						<div className='flex items-center text-sm font-medium whitespace-nowrap'>{fourthRule ? '' :
							<div className='w-full  px-1'>
								{!fnl ?
									<input className="input text-[15px] shadow-lg h-7 text-xs" name='ttlGross' value={valueInv.ttlGross} onChange={handleValue} />
									:
									<p className='text-sm pr-5 text-slate-700'>{(valueInv.ttlGross * 1).toLocaleString(locale, options)}</p>
								}
							</div>
						}</div>
					</div>
					{(valueInv.invType === '1111' || valueInv.invType === 'Invoice') &&
						<div className={`flex gap-4 justify-between ${fnl ? 'py-0.5' : 'py-1.5'}`}>
							<p className={`flex items-center text-sm font-medium whitespace-nowrap ${(fourthRule || thirdRule) && 'text-slate-400'}	`}>Total Packages:</p>
							<div className='flex items-center text-sm font-medium whitespace-nowrap'>{(fourthRule || thirdRule) ? '' :
								<div className='w-full  px-1'>
									{!fnl ?
										<input className="input text-[15px] shadow-lg h-7 text-xs" name='ttlPackages' value={valueInv.ttlPackages} onChange={handleValue} />
										:
										<p className='text-sm pr-5 text-slate-700'>{valueInv.ttlPackages}</p>
									}
								</div>
							}</div>
						</div>
					}
				</div>
			</div>

			<div className='grid grid-cols-2 gap-3 mt-2'>
				<div className='col-span-12 md:col-span-1 flex border border-slate-300 p-2 rounded-lg'>
					<p className='flex items-center text-sm font-medium whitespace-nowrap '>Bank Account:</p>
					<div className='w-full pl-4'>
						{!fnl ?
							<CBox data={settings['Bank Account']['Bank Account']} setValue={setValueInv} value={valueInv} name='bankNname' classes='shadow-md' />
							:
							<p className=' pl-1 text-sm'>{valueInv.bankName.bankNname}</p>
						}
					</div>
				</div>

				<div className='hidden md:flex col-span-0 md:col-span-1 border border-slate-300 p-2 rounded-lg'>

					<p className='flex items-center text-sm font-medium whitespace-nowrap '>HS Code:</p>
					<div className='w-full pl-4'>
						{!fnl ?
							<div className='flex gap-5'>
								<CBox data={settings.Hs.Hs.map(item => {
									const { hs, ...rest } = item;
									return { hs1: hs, ...rest };
								})} setValue={setValueInv} value={valueInv} name='hs1' classes='shadow-md' />

								<CBox data={settings.Hs.Hs.map(item => {
									const { hs, ...rest } = item;
									return { hs2: hs, ...rest };
								})} setValue={setValueInv} value={valueInv} name='hs2' classes='shadow-md' />
							</div>
							:
							<div className='flex gap-5'>
								<p className=' pl-1 text-sm'>{valueInv.hs1}</p>
								<p className=' pl-1 text-sm'>{valueInv.hs2}</p>
							</div>

						}
					</div>


				</div>
			</div>


			<div className='grid grid-cols-8 gap-3 pt-2'>
				<div className='col-span-12 md:col-span-7 '>
					<div className='w-full border border-slate-300 p-2 rounded-lg'>
						<ProductsTable value={valueInv} setValue={setValueInv}
							currency={settings.Currency.Currency} uidCollection={uidCollection}
							settings={settings} setDeleteProducts={setDeleteProducts}
							materialsArr={valueInv.productsData.map(x => ({ id: x.id, description: x.description }))}

						/>
					</div>
				</div>
				<div className='col-span-12 md:col-span-1 border border-slate-300 p-2 rounded-lg'>
					<div className='gap-4'>
						<p className='flex text-xs font-medium whitespace-nowrap'>Currency:</p>
						<div className='w-full '>
							{!fnl ?
								<CBox data={settings.Currency.Currency} setValue={setValueInv} value={valueInv} name='cur' classes='shadow-md'
									disabled={valueInv.invType !== '1111'} />
								:
								<p className=' pl-1 text-sm'>{valueInv.cur.cur}</p>
							}
							<ErrDiv field='cur' errors={errors} />
						</div>
					</div>
				</div>


			</div>

			<div className='mt-2 w-full border border-slate-300 p-2 rounded-lg'>
				<Remarks value={valueInv} setValue={setValueInv} />
			</div>


			<Expenses showExpenses={showExpenses} />
			<Payments showPayments={showPayments} />


			<div className="text-lg font-medium leading-5 text-gray-900 p-3 pl-6 flex gap-5 flex-wrap justify-center md:justify-start ">
				{!fnl && <button
					type="button"
					className="flex items-center gap-2 justify-center rounded-md border bg-green-100 px-4 py-2 text-sm font-medium 
						text-blue-900 hover:bg-green-300 focus:outline-none drop-shadow-lg"
					onClick={() => saveData_InvoiceInInvoices(uidCollection, settings)}
				>
					<VscSaveAs className='scale-110' />
					Save
				</button>}
				<button
					type="button"
					className="flex items-center gap-2 justify-center rounded-md border bg-red-100 px-4 py-2 text-sm font-medium 
						text-blue-900 hover:bg-red-300 focus:outline-none drop-shadow-lg" onClick={() => setIsOpen(false)}
				>
					<VscClose className='scale-125' />
					Close
				</button>
				<button
					type="button"
					className="flex items-center gap-2 justify-center rounded-md border bg-blue-100 px-4 py-2 text-sm font-medium 
						text-blue-900 hover:bg-blue-300 focus:outline-none drop-shadow-lg"
					onClick={() => !fnl ? Pdf(valueInv,
						reOrderTableInv(valueInv.productsDataInvoice).map(({ ['id']: _, ...rest }) => rest).map(obj => Object.values(obj))
							.map((values, index) => {
								const number = values[3]//.toFixed(3);
								const number1 = values[4];
								const number2 = values[5];
								let tmpObj = valueInv.productsDataInvoice[index]
								let description = tmpObj.isSelection ? valueInv.productsData.find(x => x.id === tmpObj.descriptionId)?.['description'] :
									tmpObj.descriptionText


								const formattedNumber = new Intl.NumberFormat('en-US', {
									minimumFractionDigits: 3
								}).format(number);

								const formattedNumber1 = new Intl.NumberFormat('en-US', {
									style: 'currency',
									currency: valueInv.cur !== '' ? getD(settings.Currency.Currency, valueInv, 'cur') :
										'USD',
									minimumFractionDigits: 2
								}).format(number1);

								const formattedNumber2 = new Intl.NumberFormat('en-US', {
									style: 'currency',
									currency: valueInv.cur !== '' ? getD(settings.Currency.Currency, valueInv, 'cur') :
										'USD',
									minimumFractionDigits: 2
								}).format(number2);

								return [index + 1, values[0], description, values[2], formattedNumber,
									formattedNumber1, formattedNumber2];
							})
						, settings, compData)
						:
						PdfFnlCncl(valueInv,
							reOrderTableInv(valueInv.productsDataInvoice).map(({ ['id']: _, ...rest }) => rest).map(obj => Object.values(obj))
								.map((values, index) => {
									const number = values[3]//.toFixed(3);
									const number1 = values[4];
									const number2 = values[5];
									let tmpObj = valueInv.productsDataInvoice[index]
									let description = tmpObj.isSelection ? valueInv.productsData.find(x => x.id === tmpObj.descriptionId)?.['description'] :
										tmpObj.descriptionText

									const formattedNumber = new Intl.NumberFormat('en-US', {
										minimumFractionDigits: 3
									}).format(number);

									const formattedNumber1 = new Intl.NumberFormat('en-US', {
										style: 'currency',
										currency: valueInv.cur.cur,
										minimumFractionDigits: 2
									}).format(number1);

									const formattedNumber2 = new Intl.NumberFormat('en-US', {
										style: 'currency',
										currency: valueInv.cur.cur,
										minimumFractionDigits: 2
									}).format(number2);

									return [index + 1, values[0], description, values[2], formattedNumber,
										formattedNumber1, formattedNumber2];
								})
							, settings, compData)

					}
				>
					<FaFilePdf />
					PDF
				</button>

				{/*(!fnl && valueInv.id !== '') && <button
					type="button"
					className="flex items-center gap-2 justify-center rounded-md border bg-red-600 px-4 py-2 text-sm font-medium 
						text-white hover:bg-red-400 focus:outline-none drop-shadow-lg" onClick={() => setIsFinilizeOpen(true)}
				>
					<BsFillSendCheckFill className='scale-110' />
					Finalize
				</button>*/}
				{/*(fnl && !valueInv.canceled) && <button
					type="button"
					className="flex items-center gap-2 justify-center rounded-md border bg-red-600 px-4 py-2 text-sm font-medium 
						text-white hover:bg-red-400 focus:outline-none drop-shadow-lg" onClick={() => setIsCancelOpen(true)}

				>
					<GiCancel className='scale-110' />
					Cancel Invoice
			</button>*/}
				{valueInv.id !== '' && <button
					type="button"
					className="flex items-center gap-2 justify-center rounded-md border bg-amber-200 px-4 py-2 text-sm font-medium 
					text-blue-900 hover:bg-amber-400 focus:outline-none drop-shadow-xl" onClick={() => setShowPmntExp('exp')}

				>
					<TbStackPush className='scale-125' />
					Expenses
				</button>}

				{valueInv.id !== '' && <button
					type="button"
					className="flex items-center gap-2 justify-center rounded-md border bg-sky-200 px-3 py-2 text-sm font-medium 
					text-blue-900 hover:bg-sky-400 focus:outline-none drop-shadow-xl" onClick={() => setShowPmntExp('pmnt')}

				>
					<GiMoneyStack className='scale-125' />
					Payments
				</button>}
			</div>

			<ModalToAction isDeleteOpen={isFinilizeOpen} setIsDeleteOpen={setIsFinilizeOpen}
				ttl='Invoice finalization' txt='To finalize this invoice please confirm to proceed.'
				doAction={() => finilizeInvoice(uidCollection, settings)} />
			<ModalToAction isDeleteOpen={isCanceleOpen} setIsDeleteOpen={setIsCancelOpen}
				ttl='Invoice cancellation' txt='To cancel this invoice please confirm to proceed.'
				doAction={() => cancelInvoice(uidCollection)} />

		</div >


	);
};
//
export default InvoiceModal;