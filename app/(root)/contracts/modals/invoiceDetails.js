'use client'
import { useContext, useEffect, useState } from 'react'
import { SettingsContext } from "@contexts/useSettingsContext";
import { InvoiceContext } from "@contexts/useInvoiceContext";
import { ContractsContext } from "@contexts/useContractsContext";
import { ExpensesContext } from "@contexts/useExpensesContext";
import CBox from '@components/combobox.js'
import { getD, loadInvoice, filteredArray } from '@utils/utils.js';
import Datepicker from "react-tailwindcss-datepicker";
import { Pdf } from './pdf/pdfInvoice.js';
import { PdfFnlCncl } from './pdfInvoiceFnlCncl.js';
import ProductsTable from './productsTableInvoice.js';
import { v4 as uuidv4 } from 'uuid';

import { VscSaveAs } from 'react-icons/vsc';
import { VscClose } from 'react-icons/vsc';
import { FaFilePdf } from 'react-icons/fa';
import { VscArchive } from 'react-icons/vsc';

import { TbStackPush } from 'react-icons/tb';
import { PiCopy } from 'react-icons/pi'
import { MdOutlineWidgets } from 'react-icons/md'
import { GiMoneyStack } from 'react-icons/gi'

import ModalToDelete from '@components/modalToProceed';
import InvoiceType from './invoiceType.js'
import { AiOutlineClear } from 'react-icons/ai';
import { validate, ErrDiv, reOrderTableInv, loadDataSettings, loadStockDataPerDescription } from '@utils/utils'
import Expenses from './expenses'
import Payments from './payments.js'
import { UserAuth } from "@contexts/useAuthContext";
import Spinner from '@components/spinner.js';
import Remarks from './remarks.js';
import { usePathname } from 'next/navigation';
import { RiRefreshLine } from "react-icons/ri";
import { getTtl } from '@utils/languages.js';
import Tltip from '@components/tlTip.js';

const ContractModal = () => {

	const { settings, compData, setLoading, loading, setDateYr, setToast, ln } = useContext(SettingsContext);
	const { valueInv, setValueInv, blankInvoice, delInvoice, copyInvoice, paste_Invoice, copy_Invoice,
		saveData_InvoiceInContracts, finilizeInvoice, cancelInvoice, errors, setErrors,
		copyInvValue, invNum, setInvNum, setIsInvCreationCNFL, isInvCreationCNFL, setDeleteProducts } = useContext(InvoiceContext);
	const { valueCon, setValueCon, contractsData, setContractsData, setIsOpenCon } = useContext(ContractsContext);
	const clts = settings.Client.Client;
	const client = valueInv?.client && clts.find(z => z.id === valueInv.client);
	const [isDeleteOpen, setIsDeleteOpen] = useState(false)
	const [isFinilizeOpen, setIsFinilizeOpen] = useState(false)
	const [isCanceleOpen, setIsCancelOpen] = useState(false)
	const fnl = valueInv?.final
	const [showExpenses, setShowExpenses] = useState(false)
	const [showPayments, setShowPayments] = useState(false)
	const { uidCollection, gisAccount } = UserAuth();
	const { blankExpense } = useContext(ExpensesContext);
	const [isSelectedInv, setIsSelectedInv] = useState(true)
	const [isButtonDisabled, setIsButtonDisabled] = useState(false);
	const pathName = usePathname();
	const [certOpen, setCertOpen] = useState(false)

	const selectInvType = (e) => {
		!fnl && setValueInv({
			...valueInv, invType: e.id,
			packing: e.id !== '1111' ? '' : valueInv.packing,
			percentage: '', totalPrepayment: '', balanceDue: ''
		})

		if (valueInv.id === '') {
			if (e.id !== '1111') {
				setIsInvCreationCNFL(true) //create creditNote / Finalinv 
				setIsSelectedInv(false)
			} else {
				setIsInvCreationCNFL(false)
				setIsSelectedInv(true)
			}
		}
	}

	const showButton = !['/contractsreview', '/inventoryreview', '/invoicesreview'].includes(pathName)


	useEffect(() => {
		if (Object.values(errors).includes(true)) {
			setErrors(validate(valueInv, ['client', 'cur', 'shpType', 'date']))
		}
	}, [valueInv])

	//for disabling fields
	let firstRule = valueInv.delTerm === '32432' || valueInv.delTerm === '456' || valueInv.delTerm === '43214'
		|| valueInv.delTerm === '567';
	let secondRule = valueInv.packing === 'P6' || valueInv.packing === 'Ingots' || valueInv.packing === 'P7'
		|| valueInv.packing === 'Loose'
	let thirdRule = valueInv.packing === 'P6' || valueInv.packing === 'Ingots'
	let fourthRule = valueInv.packing === 'P7' || valueInv.packing === 'Loose'
	let fifthRule = valueInv.packing === 'P13' || valueInv.packing === 'Pieces'

	const handleValue = (e) => {
		setValueInv({ ...valueInv, [e.target.name]: e.target.value })
	}

	const handleDateChangeDate = (newValue) => {
		setValueInv({ ...valueInv, dateRange: newValue, date: newValue.startDate })
	}

	const handleDateChangeDelvrDate = (newValue) => {
		setValueInv({ ...valueInv, delDate: newValue })
	}
	//Total Net WT Kgs:
	const options = { style: 'decimal', minimumFractionDigits: 0, maximumFractionDigits: 2 };
	const locale = 'en-US';
	const NetWTKgsTmp = (valueInv.productsDataInvoice.filter(q => q.qnty !== 's').map(x => x.qnty)
		.reduce((accumulator, currentValue) => accumulator + currentValue * 1, 0) * 1000)|| '';
	const NetWTKgs = NetWTKgsTmp.toLocaleString(locale, options);

	//Total Tarre WT Kgs:
	const TotalTarre = (valueInv.ttlGross - NetWTKgsTmp).toLocaleString(locale, options);

	const selectRow = async (i) => {
		setLoading(true)

		let inv = await loadInvoice(uidCollection, 'invoices', valueCon.invoices[i])

		if (Object.keys(inv).length === 0) return;

		let dt = []
		if (!isInvCreationCNFL) {

			dt = [...inv?.productsDataInvoice]
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
		}

		if (isInvCreationCNFL) {
			let newVal = {
				...inv, invType: valueInv.invType, expenses: [], payments: [], id: '', invoice: inv.invoice,
				cur: inv.cur, totalPrepayment: '', originalInvoice: { id: inv.id, date: inv.dateRange.endDate },
				productsDataInvoice: inv.productsDataInvoice.map(x => ({ ...x, id: uuidv4() }))
			}

			setValueInv(newVal)
		} else {
			setDateYr(valueCon.invoices[i].date.substring(0, 4))
			setValueInv({ ...inv, productsDataInvoice: dt })
			blankExpense();
		}

		setIsSelectedInv(true)
		setCertOpen(false)
		setLoading(false)

	}

	const clearForm = () => {
		setIsInvCreationCNFL(false)
		blankInvoice()
		setIsSelectedInv(true)

		setShowExpenses(false)
		setShowPayments(false)
	}

	let poArr = [...new Set(valueInv.productsDataInvoice.map(x => x.po).filter(x => x !== ''))]

	useEffect(() => {
		const getInvoiceNum = async (x) => {
			let aa = await loadDataSettings(x, 'invoiceNum')
			setInvNum(aa.num + 1)
		}
		valueInv.id === '' && getInvoiceNum(uidCollection)

	}, [valueInv])

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

	const btnClck = async () => {
		if (!isButtonDisabled) {
			setIsButtonDisabled(true);
			let result = await saveData_InvoiceInContracts(valueCon, valueInv, setValueCon, contractsData,
				setContractsData, uidCollection, settings)
			setCertOpen(false)
			if (!result) setIsButtonDisabled(false); //false

			setTimeout(() => {
				setIsButtonDisabled(false);
				result && setToast({ show: true, text: getTtl('Invoice successfully saved!', ln), clr: 'success' })
			}, 2000); // Adjust the delay as needed
		}
	}


	return (
		<div className="px-1">
			{loading && <Spinner />}
			<div className='grid grid-cols-12 gap-3 pt-1'>
				<div className='col-span-12 md:col-span-2  border border-slate-300 p-2 rounded-lg'>
					<p className='text-sm text-slate-600 font-medium'>{getTtl('Invoices', ln)}:</p>
					{valueCon.invoices.length > 0 &&
						<ul className="flex flex-col mt-1 overflow-auto ring-1 ring-black/5 rounded-lg divide-y" >
							{valueCon.invoices.map((x, i) => {
								return (
									<li key={i} onClick={() => selectRow(i)}
										className={`items-center py-1 px-1.5 text-[0.75rem] 
									truncate 
									${valueCon.invoices[i]['id'] === valueInv.id && 'font-medium bg-slate-100 '}
									${(isInvCreationCNFL && x.invType !== '1111') ? 'bg-gray-100 pointer-events-none cursor-not-allowed text-gray-400' : 'cursor-pointer text-slate-700'}
								
								}
									`}
									>
										{String(x.invoice).padStart(4, "0") + getprefixInv(x)}
									</li>
								)
							})}
						</ul>}
				</div>
				<div className='col-span-12 md:col-span-3 border border-slate-300 p-2 rounded-lg'>
					<p className='flex items-center text-sm font-medium'>{getTtl('Consignee', ln)}:</p>
					<div>
						{!fnl ?
							<CBox data={clts} setValue={setValueInv} value={valueInv} name='client' classes='shadow-md' />
							:
							<p className='pt-2 pl-1 text-xs font-medium'>{valueInv.client.client}</p>
						}
						<ErrDiv field='client' errors={errors} ln={ln} />
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
					<p className='text-sm text-slate-600 font-medium indent-1'>{getTtl('Invoice Type', ln)}:</p>
					{!fnl ?
						<div>
							<InvoiceType setSelected={selectInvType} plans={settings.InvTypes.InvTypes} value={valueInv} ln={ln} />
							{(valueInv.invType !== '1111' && valueInv.id === '') &&
								<div className='text-xs text-red-600 font-medium'>{getTtl('selectOriginalInvoice', ln)}</div>
							}
						</div>
						:
						<p className='pt-2 pl-1 text-xs'>{valueInv.invType}</p>
					}
				</div>
				<div className='col-span-12 md:col-span-2 border border-slate-300 p-2 rounded-lg flex flex-col'>
					<p className='text-sm text-slate-600 font-medium indent-1'>{getTtl('PO', ln)}#:</p>
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
				<div className='col-span-12 md:col-span-3 border border-slate-300 p-2 rounded-lg'>
					<div className='flex items-center pt-1'>
						<p className='flex text-xs font-medium'>{getTtl('Date', ln)}:</p>
						<div className='w-full px-2'>
							{!fnl ?
								<>
									<Datepicker useRange={false}
										asSingle={true}
										value={valueInv.dateRange}
										popoverDirection='down'
										onChange={handleDateChangeDate}
										displayFormat={"DD-MMM-YYYY"}
										inputClassName='input w-full text-[15px] shadow-lg h-7 text-xs'
									/>
									<ErrDiv field='date' errors={errors} ln={ln} />
								</>
								:
								<p className='pl-1 text-sm'>{valueInv.date}</p>
							}
						</div>
					</div>
					<div className='flex pt-2'>
						<p className='flex pt-1 text-xs font-medium whitespace-nowrap'>
							{!fnl ? valueInv.invType === '1111' ? getTtl('Invoice', ln) + ' #:' : valueInv.invType === '2222' ?
								getTtl('Credit Note', ln) + ' #:' : getTtl('Final Note', ln) + ' #:' :
								valueInv.invType + ' No:'}</p>
						<div className='w-full px-2 items-end flex'>
							<p className='text-xs '>{(valueInv.id === '' && !isInvCreationCNFL) ? String(invNum).padStart(4, "0") + getprefixInv(valueInv) :
								String(valueInv.invoice).padStart(4, "0") + getprefixInv(valueInv)}</p>
						</div>
					</div>
					<div className='flex pt-2 gap-3'>
						<div className='flex items-center text-xs font-medium whitespace-nowrap'>{getTtl('Status', ln)}:</div>
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
						<p className='flex pt-1 text-sm font-medium whitespace-nowrap'>{getTtl('Shipment', ln)}:</p>
						<div className='w-full md:w-44'>
							{!fnl ?
								<CBox data={settings.Shipment.Shipment} setValue={setValueInv} value={valueInv} name='shpType' classes='shadow-md' />
								:
								<p className=' pl-1 text-sm'>{valueInv.shpType}</p>
							}
							<ErrDiv field='shpType' errors={errors} ln={ln} />
						</div>

					</div>

					<div className='flex gap-4 justify-between'>
						<p className='flex items-center text-sm font-medium whitespace-nowrap'>{getTtl('Origin', ln)}:</p>
						<div className='w-full md:w-44'>
							{!fnl ?
								<CBox data={[...settings.Origin.Origin, { id: 'empty', origin: '...Empty' }]} setValue={setValueInv} value={valueInv} name='origin' classes='shadow-md' />
								:
								<p className=' pl-1 text-sm'>{valueInv.origin}</p>
							}
						</div>
					</div>
					<div className='flex gap-4 justify-between'>
						<p className='flex items-center text-sm font-medium whitespace-nowrap'>{getTtl('Delivery Terms', ln)}:</p>
						<div className='w-full md:w-44'>
							{!fnl ?
								<CBox data={settings['Delivery Terms']['Delivery Terms']} setValue={setValueInv} value={valueInv} name='delTerm' classes='shadow-md' />
								:
								<p className=' pl-1 text-sm'>{valueInv.delTerm}</p>
							}
						</div>
					</div>
					<div className='flex items-center pt-1 justify-between'>
						<p className='flex text-sm font-medium whitespace-nowrap'>{getTtl('Delivery Date', ln)}:</p>
						<div className='w-full md:w-44'>
							{!fnl ?
								<Datepicker useRange={false}
									asSingle={true}
									value={valueInv.delDate}
									popoverDirection='down'
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
						<p className='flex items-center text-sm font-medium whitespace-nowrap'>{getTtl('POL', ln)}:</p>
						<div className='w-full md:w-44'>
							{!fnl ?
								<CBox data={settings.POL.POL} setValue={setValueInv} value={valueInv} name='pol' classes='shadow-md' />
								:
								<p className=' pl-1 text-sm'>{valueInv.pol}</p>
							}
						</div>
					</div>
					<div className='flex gap-4 justify-between'>
						<p className='flex items-center text-sm font-medium whitespace-nowrap'>{getTtl('POD', ln)}:</p>
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
							<p className='flex items-center text-sm font-medium whitespace-nowrap'>{getTtl('Packing', ln)}:</p>
							<div className='w-full md:w-44'>
								{!fnl ?
									<CBox data={settings.Packing.Packing} setValue={setValueInv} value={valueInv} name='packing' classes='shadow-md'
										disabled={valueInv.invType !== '1111'} />
									:
									<p className=' pl-1 text-sm'>{valueInv.packing}</p>
								}
							</div>
						</div>}
				</div>

				<div className='col-span-12 md:col-span-1 border border-slate-300 p-2 rounded-lg'>
					<div className={`flex gap-4 justify-between ${fnl ? 'py-0.5' : 'py-1.5'}`}>
						<p className='flex items-center text-sm font-medium whitespace-nowrap'>{getTtl('totalNet', ln)}:</p>
						<p className='text-sm pr-6 text-slate-700'>
							{NetWTKgs}
						</p>
					</div>
					{(valueInv.invType === '1111' || valueInv.invType === 'Invoice') &&
						<div className={`flex gap-4 justify-between ${fnl ? 'py-0.5' : 'py-1.5'}`}>
							<p className={`flex items-center text-sm ${(secondRule || fifthRule) && 'text-slate-400'} font-medium whitespace-nowrap`}>{getTtl('totalTare', ln)}:</p>
							<p className={`text-sm pr-6  ${parseInt(TotalTarre) < 0 ? 'text-red-400 font-medium' : 'text-slate-700'}`}>{secondRule || fifthRule ? '' : TotalTarre}</p>
						</div>
					}

					<div className={`flex gap-4 justify-between py-1.5`}>
						<p className={`flex items-center text-sm font-medium whitespace-nowrap ${(fourthRule || fifthRule) && 'text-slate-400'}`}>
							{thirdRule ? 'QTY Ingots' : getTtl('totalGross', ln)}:</p>
						<div className='flex items-center text-sm font-medium whitespace-nowrap'>{(fourthRule || fifthRule) ? '' :
							<div className='w-full  px-1'>
								{!fnl ?
									<input type='number' className="input text-[15px] shadow-lg h-7 text-xs" name='ttlGross' value={valueInv.ttlGross} onChange={handleValue} />
									:
									<p className='text-sm pr-5 text-slate-700'>{(valueInv.ttlGross * 1).toLocaleString(locale, options)}</p>
								}
							</div>
						}</div>
					</div>

					{(valueInv.invType === '1111' || valueInv.invType === 'Invoice') &&
						<div className={`flex gap-4 justify-between py-1.5`}>
							<p className={`flex items-center text-sm font-medium whitespace-nowrap ${(fourthRule || thirdRule) && 'text-slate-400'}	`}>{getTtl('totalPack', ln)}:</p>
							<div className='flex items-center text-sm font-medium whitespace-nowrap'>{(fourthRule || thirdRule) ? '' :
								<div className='w-full  px-1'>
									{!fnl ?
										<input type='text' className="input text-[15px] shadow-lg h-7 text-xs" name='ttlPackages' value={valueInv.ttlPackages} onChange={handleValue} />
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
					<p className='flex items-center text-sm font-medium whitespace-nowrap '>{getTtl('Bank Account', ln)}:</p>
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


			<div className='w-full border border-slate-300 p-2 rounded-lg mt-2'>
				<ProductsTable value={valueInv} setValue={setValueInv}
					currency={settings.Currency.Currency} uidCollection={uidCollection}
					setDeleteProducts={setDeleteProducts} settings={settings}
					materialsArr={valueCon.productsData.map(x => ({ id: x.id, description: x.description }))}
					certOpen={certOpen} setCertOpen={setCertOpen}
				/>
			</div>


			<div className='grid grid-cols-8 gap-3 mt-2'>
				<div className='col-span-12 md:col-span-5  border border-slate-300 p-2 rounded-lg'>
					<Remarks value={valueInv} setValue={setValueInv} ln={ln} />
				</div>

				<div className='col-span-12 md:col-span-2  border border-slate-300 p-2 py-1 pb-0 rounded-lg'>
					<p className='flex text-xs text-slate-600 font-medium whitespace-nowrap'>{getTtl('Comments', ln)}:</p>
					<textarea rows="2" cols="60" name="comments"
						className={`input text-[15px]  text-xs p-1`}
						style={{ height: valueInv.remarks.length === 0 ? '40px' : valueInv.remarks.length * 40 + 'px' }}
						value={valueInv.comments}
						onChange={handleValue}
					/>
				</div>

				<div className='col-span-12 md:col-span-1 border border-slate-300 p-2 rounded-lg gap-4'>
					<p className='flex text-xs font-medium whitespace-nowrap'>{getTtl('Currency', ln)}:</p>
					<div className='w-full '>
						{!fnl ?
							<CBox data={settings.Currency.Currency} setValue={setValueInv} value={valueInv} name='cur' classes='shadow-md'
								disabled={valueInv.invType !== '1111'} />
							:
							<p className=' pl-1 text-sm'>{valueInv.cur.cur}</p>
						}
					</div>
					<ErrDiv field='cur' errors={errors} ln={ln} />
				</div>
			</div>


			<Expenses showExpenses={showExpenses} />
			<Payments showPayments={showPayments} />

			<div className="text-lg font-medium leading-5 text-gray-900 p-3 pl-6 flex gap-4 flex-wrap justify-center md:justify-start ">
				{(!fnl && isSelectedInv) &&
					<Tltip direction='top' tltpText='Save/Update invoice'>
						<button
							type="button"
							className="blackButton"
							onClick={btnClck}
						>
							<VscSaveAs className='scale-110' />
							{isButtonDisabled ? getTtl('saving', ln) : getTtl('save', ln)}
							{isButtonDisabled && <RiRefreshLine className='animate-spin' />}

						</button>
					</Tltip>}
				<Tltip direction='top' tltpText='Clear form'>
					<button
						type="button"
						className="whiteButton"
						onClick={clearForm}
					>
						{fnl ? <MdOutlineWidgets className='scale-110' /> : <AiOutlineClear className='scale-110' />}
						{fnl ? 'New' : getTtl('Clear', ln)}
					</button>
				</Tltip>
				<Tltip direction='top' tltpText='Close form'>
					<button
						type="button"
						className="whiteButton" onClick={() => setIsOpenCon(false)}
					>
						<VscClose className='scale-125' />
						{getTtl('Close', ln)}
					</button>
				</Tltip>
				<Tltip direction='top' tltpText='Create PDF document'>
					<button
						type="button"
						className="whiteButton"
						onClick={() => !fnl && valueInv.id ? Pdf(valueInv,
							reOrderTableInv(valueInv.productsDataInvoice).map(({ ['id']: _, ...rest }) => rest).map(obj => Object.values(obj))
								.map((values, index) => {
									const number = values[3]//.toFixed(3);
									const number1 = values[4];
									const number2 = values[5];
									let tmpObj = valueInv.productsDataInvoice[index]

									let description = tmpObj.mtrlStatus === 'select' ? valueCon.productsData.find(x => x.id === tmpObj.descriptionId)?.['description'] :
										tmpObj.descriptionText


									const formattedNumber = number === 's' ? 'Service' : new Intl.NumberFormat('en-US', {
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
							, settings, compData, gisAccount)
							:
							valueInv.id && PdfFnlCncl(valueInv,
								reOrderTableInv(valueInv.productsDataInvoice).map(({ ['id']: _, ...rest }) => rest).map(obj => Object.values(obj))
									.map((values, index) => {
										const number = values[3]//.toFixed(3);
										const number1 = values[4];
										const number2 = values[5];
										let tmpObj = valueInv.productsDataInvoice[index]
										let description = tmpObj.mtrlStatus === 'select' ? valueInv.productsData.find(x => x.id === tmpObj.descriptionId)?.['description'] :
											tmpObj.descriptionText

										const formattedNumber = number === 's' ? 'Service' : new Intl.NumberFormat('en-US', {
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
				</Tltip>
				{(!fnl && valueInv.id !== '') &&
					<Tltip direction='top' tltpText='Delete Invoice'>
						<button
							type="button"
							className="whiteButton" onClick={() => setIsDeleteOpen(true)}

						>
							<VscArchive className='scale-110' />
							{getTtl('Delete', ln)}
						</button>
					</Tltip>}
				{/*(!fnl && valueInv.id !== '') && showButton && <button
					type="button"
					className="flex items-center gap-2 justify-center rounded-md border bg-red-600 px-3 py-2 text-sm font-medium 
						text-white hover:bg-red-400 focus:outline-none drop-shadow-lg" onClick={() => setIsFinilizeOpen(true)}
				>
					<BsFillSendCheckFill className='scale-110' />
					Finalize
				</button>*/}
				{/*(fnl && !valueInv.canceled) && showButton && <button
					type="button"
					className="flex items-center gap-2 justify-center rounded-md border bg-red-600 px-3 py-2 text-sm font-medium 
						text-white hover:bg-red-400 focus:outline-none drop-shadow-lg" onClick={() => setIsCancelOpen(true)}

				>
					<GiCancel className='scale-110' />
					Cancel Invoice
			</button>*/}
				{valueInv.id !== '' &&
					<Tltip direction='top' tltpText='Shipment expenses'>
						<button
							type="button"
							className="whiteButton" onClick={() => setShowPmntExp('exp')}

						>
							<TbStackPush className='scale-125' />
							{getTtl('Expenses', ln)}
						</button>
					</Tltip>}
				{valueInv.id !== '' &&
					<Tltip direction='top' tltpText='Client payments'>
						<button
							type="button"
							className="whiteButton" onClick={() => setShowPmntExp('pmnt')}

						>
							<GiMoneyStack className='scale-125' />
							{getTtl('Payments', ln)}
						</button>
					</Tltip>}
				{(!fnl && valueInv.id !== '' && !copyInvoice) && showButton &&
					<Tltip direction='top' tltpText='Copy invoice data'>
						<button
							type="button"
							className="hidden md:flex whiteButton"
							onClick={() => copy_Invoice()}

						>
							<PiCopy className='scale-125' />
							{getTtl('Copy Invoice', ln)}
						</button>
					</Tltip>}

				{(copyInvoice && !valueCon.invoices.map(x => x.id).includes(copyInvValue.id)) && showButton &&
					<Tltip direction='top' tltpText='Paste invoice data'>
						<button
							type="button"
							className="hidden md:flex items-center gap-2 justify-center rounded-md border bg-slate-200 px-4 py-2 text-sm font-medium 
						text-blue-900 hover:bg-slate-300 focus:outline-none drop-shadow-lg"
							onClick={() => paste_Invoice(uidCollection, valueCon, setValueCon, contractsData, setContractsData)}

						>
							<PiCopy className='scale-125' />
							{getTtl('Paste invoice', ln)}
						</button>
					</Tltip>}

			</div>
			<ModalToDelete isDeleteOpen={isDeleteOpen} setIsDeleteOpen={setIsDeleteOpen}
				ttl={getTtl('delConfirmation', ln)} txt={getTtl('delConfirmationTxtInvoice', ln)}
				doAction={() => delInvoice(uidCollection, valueCon, setValueCon, contractsData, setContractsData)} />
			<ModalToDelete isDeleteOpen={isFinilizeOpen} setIsDeleteOpen={setIsFinilizeOpen}
				ttl='Invoice finalization' txt='To finalize this invoice please confirm to proceed.'
				doAction={() => finilizeInvoice(uidCollection, settings)} />
			<ModalToDelete isDeleteOpen={isCanceleOpen} setIsDeleteOpen={setIsCancelOpen}
				ttl='Invoice cancellation' txt='To cancel this invoice please confirm to proceed.'
				doAction={() => cancelInvoice(uidCollection)} />


		</div >


	);
};
//
export default ContractModal;