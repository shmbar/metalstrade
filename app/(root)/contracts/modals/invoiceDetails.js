'use client'
import { useContext, useEffect, useState } from 'react'
import { SettingsContext } from "@contexts/useSettingsContext";
import { InvoiceContext } from "@contexts/useInvoiceContext";
import { ContractsContext } from "@contexts/useContractsContext";
import { ExpensesContext } from "@contexts/useExpensesContext";
import Datepicker from "react-tailwindcss-datepicker";
import { Pdf } from './pdf/pdfInvoice.js';
import { PdfFnlCncl } from './pdfInvoiceFnlCncl.js';
import ProductsTable from './productsTableInvoice.js';
import { v4 as uuidv4 } from 'uuid';
import ModalToDelete from '@components/modalToProceed';
import InvoiceType from './invoiceType.js'
import {
	validate, ErrDiv, reOrderTableInv, loadDataSettings, loadStockDataPerDescription,
	getD, loadInvoice, filteredArray
} from '@utils/utils'
import Expenses from './expenses'
import Payments from './payments.js'
import { UserAuth } from "@contexts/useAuthContext";
import Spinner from '@components/spinner.js';
import Remarks from './remarks.js';
import { usePathname } from 'next/navigation';
import { getTtl } from '@utils/languages.js';
import Tltip from '@components/tlTip.js';
import { Selector } from '@components/selectors/selectShad.js';
import { X, Save, LoaderCircle, Eraser, FileText, Trash, PanelTopOpen, Banknote, Copy, ClipboardCheck } from "lucide-react";


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
		.reduce((accumulator, currentValue) => accumulator + currentValue * 1, 0) * 1000) || '';
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

	const handleChange = (e, name) => {
		setValueInv(prev => {
			const updated = { ...prev, [name]: e }

			if (name === "delTerm" && ["32432", "456", "43214", "567"].includes(e)) {
				updated.pod = ""
			}

			return updated
		})
	}


	const clear = (name) => {
		setValueInv(prev => ({
			...prev, [name]: '',
		}))
	}

	return (
		<div className="px-1">
			{loading && <Spinner />}
			<div className='grid grid-cols-12 gap-3 pt-1'>
				<div className='col-span-12 md:col-span-1  border border-[#b8ddf8] p-2 rounded-2xl'>
					<p className='responsiveText font-medium text-[var(--chathams-blue)] text-[0.75rem]'>{getTtl('Invoices', ln)}:</p>
					{valueCon.invoices.length > 0 &&
						<ul className="flex flex-col mt-1 overflow-auto rounded-2xl divide-y" >
							{valueCon.invoices.map((x, i) => {
								return (
									<li key={i} onClick={() => selectRow(i)}
										className={`items-center py-1 px-1.5 responsiveTextTable
									truncate
									${valueCon.invoices[i]['id'] === valueInv.id && 'font-medium bg-slate-100 '}
									${(isInvCreationCNFL && x.invType !== '1111') ? 'bg-[#f3f4f6] pointer-events-none cursor-not-allowed text-[var(--regent-gray)]' : 'cursor-pointer text-[var(--port-gore)]'}
								
								}
									`}
									>
										{String(x.invoice).padStart(4, "0") + getprefixInv(x)}
									</li>
								)
							})}
						</ul>}
				</div>
				<div className='col-span-12 md:col-span-3 border border-[#b8ddf8] p-2 rounded-2xl'>
					<p className='flex items-center responsiveText font-medium text-[var(--chathams-blue)] text-[0.75rem]'>{getTtl('Consignee', ln)}:</p>
					<div>
						<Selector arr={clts} value={valueInv}
							onChange={(e) => handleChange(e, 'client')}
							name='client'
							clear={clear} />

						<ErrDiv field='client' errors={errors} ln={ln} />
					</div>
					{client && (
						<>
							<p className='pt-2 pl-1 responsiveText'>{client.street}</p>
							<p className='pt-2 pl-1 responsiveText'>{client.city}</p>
							<p className='pt-2 pl-1 responsiveText'>{client.country}</p>
							<p className='pt-2 pl-1 responsiveText'>{client.other1}</p>
						</>
					)}
					{fnl && (
						<>
							<p className='pt-2 pl-1 responsiveText'>{valueInv.client.street}</p>
							<p className='pt-2 pl-1 responsiveText'>{valueInv.client.city}</p>
							<p className='pt-2 pl-1 responsiveText'>{valueInv.client.country}</p>
							<p className='pt-2 pl-1 responsiveText'>{valueInv.client.other1}</p>
						</>
					)}
				</div>
				<div className='col-span-12 md:col-span-2 border border-[#b8ddf8] p-2 rounded-2xl flex flex-col'>
					<p className='responsiveText font-medium indent-1 text-[var(--chathams-blue)] text-[0.75rem]'>{getTtl('Invoice Type', ln)}:</p>
					{!fnl ?
						<div>
							<InvoiceType setSelected={selectInvType} plans={settings.InvTypes.InvTypes} value={valueInv} ln={ln} />
							{(valueInv.invType !== '1111' && valueInv.id === '') &&
								<div className='responsiveText text-red-600 font-medium'>{getTtl('selectOriginalInvoice', ln)}</div>
							}
						</div>
						:
						<p className='pt-2 pl-1 responsiveText'>{valueInv.invType}</p>
					}
				</div>
				<div className='col-span-12 md:col-span-2 border border-[#b8ddf8] p-2 rounded-2xl flex flex-col'>
					<p className='responsiveText font-medium indent-1 text-[var(--chathams-blue)] text-[0.75rem]'>{getTtl('PO', ln)}#:</p>
					{valueInv.productsDataInvoice.length > 0 && <ul className="flex flex-col mt-1 rounded-2xl divide-y" >
						{poArr.map((x, i) => {
							return (
								<li key={i}
									className='items-center py-0.5 px-1.5 responsiveText text-[var(--port-gore)]
									truncate'>
									{x}
								</li>
							)
						})}
					</ul>}

				</div>
				<div className='col-span-12 md:col-span-4 border border-[#b8ddf8] p-2 rounded-2xl flex flex-col gap-1.5'>
					<div className='flex items-center gap-2'>
						<p className='responsiveText font-medium whitespace-nowrap text-[var(--chathams-blue)] text-[0.75rem]'>{getTtl('Date', ln)}:</p>
						<div className='flex-1'>
							{!fnl ?
								<>
									<Datepicker useRange={false}
										asSingle={true}
										value={valueInv.dateRange}
										popoverDirection='down'
										onChange={handleDateChangeDate}
										displayFormat={"DD-MMM-YYYY"}
										inputClassName='input w-full shadow-lg h-7'
									/>
									<ErrDiv field='date' errors={errors} ln={ln} />
								</>
								:
								<p className='pl-1 responsiveText'>{valueInv.date}</p>
							}
						</div>
					</div>
					<div className='flex items-center gap-4 flex-wrap'>
						<div className='flex items-center gap-1.5'>
							<p className='responsiveText font-medium whitespace-nowrap text-[var(--chathams-blue)] text-[0.75rem]'>
								{!fnl ? valueInv.invType === '1111' ? getTtl('Invoice', ln) + ' #:' : valueInv.invType === '2222' ?
									getTtl('Credit Note', ln) + ' #:' : getTtl('Final Note', ln) + ' #:' :
									valueInv.invType + ' No:'}
							</p>
							<p className='responsiveText font-medium text-[var(--port-gore)]'>
								{(valueInv.id === '' && !isInvCreationCNFL) ? String(invNum).padStart(4, "0") + getprefixInv(valueInv) :
									String(valueInv.invoice).padStart(4, "0") + getprefixInv(valueInv)}
							</p>
						</div>
						<div className='flex items-center gap-1.5'>
							<p className='responsiveText font-medium whitespace-nowrap text-[var(--chathams-blue)] text-[0.75rem]'>{getTtl('Status', ln)}:</p>
							<p className='responsiveText font-semibold'>
								{!fnl ? 'Draft' : fnl && !valueInv.canceled ? 'Finalized' : (fnl && valueInv.canceled) && 'Canceled'}
							</p>
						</div>
					</div>
				</div>
			</div>


			<div className='grid grid-cols-1 md:grid-cols-3 gap-3 pt-2'>
				<div className='border border-[#b8ddf8] p-2 rounded-2xl'>
					<div className='flex flex-col md:flex-row gap-2 md:items-center'>
						<p className='flex pt-1 items-center responsiveText font-medium whitespace-nowrap text-[var(--chathams-blue)] text-[0.75rem]'>{getTtl('Shipment', ln)}:</p>
						<div className='flex-1 min-w-0'>
							<Selector arr={settings.Shipment.Shipment} value={valueInv}
								onChange={(e) => handleChange(e, 'shpType')}
								name='shpType'
								clear={clear} />
							<ErrDiv field='shpType' errors={errors} ln={ln} />
						</div>

					</div>

					<div className='flex flex-col md:flex-row gap-2 md:items-center pt-1'>
						<p className='flex items-center responsiveText font-medium whitespace-nowrap text-[var(--chathams-blue)] text-[0.75rem]'>{getTtl('Origin', ln)}:</p>
						<div className='flex-1 min-w-0'>
							<Selector arr={[...settings.Origin.Origin, { id: 'empty', origin: '...Empty' }]}
								value={valueInv}
								onChange={(e) => handleChange(e, 'origin')}
								name='origin'
								clear={clear} />
						</div>
					</div>
					<div className='flex flex-col md:flex-row gap-2 md:items-center pt-1'>
						<p className='flex items-center responsiveText font-medium whitespace-nowrap text-[var(--chathams-blue)] text-[0.75rem]'>{getTtl('Delivery Terms', ln)}:</p>
						<div className='flex-1 min-w-0'>
							<Selector arr={settings['Delivery Terms']['Delivery Terms']} value={valueInv}
								onChange={(e) => handleChange(e, 'delTerm')}
								name='delTerm'
								clear={clear} />
						</div>
					</div>
					<div className='flex flex-col md:flex-row gap-2 md:items-center pt-1'>
						<p className='flex items-center responsiveText font-medium whitespace-nowrap text-[var(--chathams-blue)] text-[0.75rem]'>{getTtl('Delivery Date', ln)}:</p>
						<div className='flex-1 min-w-0'>
							<Datepicker useRange={false}
								asSingle={true}
								value={valueInv.delDate}
								popoverDirection='down'
								onChange={handleDateChangeDelvrDate}
								displayFormat={"DD-MMM-YYYY"}
								inputClassName='input w-full shadow-lg h-8'
							/>
						</div>
					</div>
				</div>

				<div className='border border-[#b8ddf8] p-2 rounded-2xl'>
					<div className='flex flex-col md:flex-row gap-2 md:items-center'>
						<p className='flex items-center responsiveText font-medium whitespace-nowrap text-[var(--chathams-blue)] text-[0.75rem]'>{getTtl('POL', ln)}:</p>
						<div className='flex-1 min-w-0'>
							<Selector arr={settings.POL.POL} value={valueInv}
								onChange={(e) => handleChange(e, 'pol')}
								name='pol'
								clear={clear} />
						</div>
					</div>
					<div className='flex flex-col md:flex-row gap-2 md:items-center pt-1'>
						<p className='flex items-center responsiveText font-medium whitespace-nowrap text-[var(--chathams-blue)] text-[0.75rem]'>{getTtl('POD', ln)}:</p>
						<div className='flex-1 min-w-0'>
							<Selector arr={settings.POD.POD} value={valueInv}
								onChange={(e) => handleChange(e, 'pod')}
								name='pod'
								clear={clear} />
						</div>
					</div>
					{(valueInv.invType === '1111' || valueInv.invType === 'Invoice') &&
						<div className='flex flex-col md:flex-row gap-2 md:items-center pt-1'>
							<p className='flex items-center responsiveText font-medium whitespace-nowrap text-[var(--chathams-blue)] text-[0.75rem]'>{getTtl('Packing', ln)}:</p>
							<div className='flex-1 min-w-0'>
								<Selector arr={settings.Packing.Packing} value={valueInv}
									onChange={(e) => handleChange(e, 'packing')}
									name='packing'
									clear={clear} />
							</div>
						</div>}
				</div>

				<div className='border border-[#b8ddf8] p-2 rounded-2xl'>
					<div className={`flex flex-col md:flex-row gap-2 md:items-center ${fnl ? 'py-0.5' : 'py-1.5'}`}>
						<p className='flex items-center responsiveText font-medium whitespace-nowrap text-[var(--chathams-blue)] text-[0.75rem]'>{getTtl('totalNet', ln)}:</p>
						<p className='responsiveText pr-6 text-[var(--port-gore)]'>
							{NetWTKgs}
						</p>
					</div>
					{(valueInv.invType === '1111' || valueInv.invType === 'Invoice') &&
						<div className={`flex flex-col md:flex-row gap-2 md:items-center ${fnl ? 'py-0.5' : 'py-1.5'}`}>
							<p className={`flex items-center responsiveText ${(secondRule || fifthRule) && 'text-[var(--regent-gray)]'} font-medium whitespace-nowrap text-[var(--chathams-blue)] text-[0.75rem]`}>{getTtl('totalTare', ln)}:</p>
							<p className={`responsiveText pr-6  ${parseInt(TotalTarre) < 0 ? 'text-red-400 font-medium' : 'text-[var(--port-gore)]'}`}>{secondRule || fifthRule ? '' : TotalTarre}</p>
						</div>
					}

					<div className={`flex flex-col md:flex-row gap-2 md:items-center pt-1`}>
						<p className={`flex items-center responsiveText font-medium whitespace-nowrap text-[var(--chathams-blue)] text-[0.75rem] ${(fourthRule || fifthRule) && 'text-[var(--regent-gray)]'}`}>
							{thirdRule ? 'QTY Ingots' : getTtl('totalGross', ln)}:</p>
						<div className='flex items-center'>{(fourthRule || fifthRule) ? '' :
							<div className='w-full px-1'>
								{!fnl ?
									<input type='number' className="input shadow-lg h-8 text-[0.75rem]" name='ttlGross' value={valueInv.ttlGross} onChange={handleValue} />
									:
									<p className='responsiveText pr-5 text-[var(--port-gore)]'>{(valueInv.ttlGross * 1).toLocaleString(locale, options)}</p>
								}
							</div>
						}</div>
					</div>

					{(valueInv.invType === '1111' || valueInv.invType === 'Invoice') &&
						<div className={`flex flex-col md:flex-row gap-2 md:items-center pt-1`}>
							<p className={`flex items-center responsiveText font-medium whitespace-nowrap text-[var(--chathams-blue)] text-[0.75rem] ${(fourthRule || thirdRule) && 'text-[var(--regent-gray)]'}	`}>{getTtl('totalPack', ln)}:</p>
							<div className='flex items-center'>{(fourthRule || thirdRule) ? '' :
								<div className='w-full px-1'>
									{!fnl ?
										<input type='text' className="input shadow-lg h-8 text-[0.75rem]" name='ttlPackages' value={valueInv.ttlPackages} onChange={handleValue} />
										:
										<p className='responsiveText pr-5 text-[var(--port-gore)]'>{valueInv.ttlPackages}</p>
									}
								</div>
							}</div>
						</div>
					}
				</div>
			</div>

			<div className='grid grid-cols-1 md:grid-cols-2 gap-3 mt-2'>
				<div className='flex flex-col md:flex-row border items-start md:items-center border-[#b8ddf8] p-2 rounded-2xl gap-1 md:gap-0'>
					<p className='flex items-center responsiveText font-medium whitespace-nowrap text-[var(--chathams-blue)] text-[0.75rem]'>{getTtl('Bank Account', ln)}:</p>
					<div className='w-full md:pl-4'>
						<Selector arr={settings['Bank Account']['Bank Account']} value={valueInv}
							onChange={(e) => handleChange(e, 'bankNname')}
							name='bankNname'
							clear={clear} />
					</div>
				</div>

				<div className='hidden md:flex col-span-0 md:col-span-1 border items-center border-[#b8ddf8] p-2 rounded-2xl'>
					<p className='flex items-center responsiveText font-medium whitespace-nowrap text-[var(--chathams-blue)] text-[0.75rem]'>HS Code:</p>
					<div className='w-full pl-4'>

						<div className='flex gap-5'>
							<Selector arr={settings.Hs.Hs.map(item => {
								const { hs, ...rest } = item;
								return { hs1: hs, ...rest };
							})}
								value={valueInv}
								onChange={(e) => handleChange(e, 'hs1')}
								name='hs1'
								clear={clear} />

							<Selector arr={settings.Hs.Hs.map(item => {
								const { hs, ...rest } = item;
								return { hs2: hs, ...rest };
							})}
								value={valueInv}
								onChange={(e) => handleChange(e, 'hs2')}
								name='hs2'
								clear={clear} />
						</div>
					</div>
				</div>
			</div>


			<div className='w-full border border-[#b8ddf8] p-2 rounded-2xl mt-2'>
				<ProductsTable value={valueInv} setValue={setValueInv}
					currency={settings.Currency.Currency} uidCollection={uidCollection}
					setDeleteProducts={setDeleteProducts} settings={settings}
					materialsArr={valueCon.productsData.map(x => ({ id: x.id, description: x.description }))}
					certOpen={certOpen} setCertOpen={setCertOpen}
				/>
			</div>


			<div className='grid grid-cols-1 md:grid-cols-8 gap-3 mt-2'>
				<div className='md:col-span-5 border border-[#b8ddf8] p-2 rounded-2xl'>
					<Remarks value={valueInv} setValue={setValueInv} ln={ln} />
				</div>

				<div className='md:col-span-2 border border-[#b8ddf8] p-2 py-1 pb-0 rounded-2xl'>
					<p className='flex responsiveText font-medium text-[var(--chathams-blue)] text-[0.75rem]'>{getTtl('Comments', ln)}:</p>
					<textarea rows="2" name="comments"
						className={`input w-full p-1 !rounded-xl`}
						style={{ fontSize: '0.75rem', fontFamily: 'inherit', height: valueInv.remarks.length === 0 ? '40px' : valueInv.remarks.length * 40 + 'px' }}
						value={valueInv.comments}
						onChange={handleValue}
					/>
				</div>

				<div className='md:col-span-1 border border-[#b8ddf8] p-2 rounded-2xl gap-4'>
					<p className='flex responsiveText font-medium whitespace-nowrap text-[var(--chathams-blue)] text-[0.75rem]'>{getTtl('Currency', ln)}:</p>
					<div className='w-full '>
						<Selector arr={settings.Currency.Currency} value={valueInv}
							onChange={(e) => handleChange(e, 'cur')}
							name='cur'
							clear={clear}
							disabled={valueInv.invType !== '1111'}
						/>
					</div>
					<ErrDiv field='cur' errors={errors} ln={ln} />
				</div>
			</div>


			<Expenses showExpenses={showExpenses} />
			<Payments showPayments={showPayments} />

			<div className="p-3 pl-6 flex gap-4 flex-wrap justify-center md:justify-start ">
				{(!fnl && isSelectedInv) &&
					<Tltip direction='top' tltpText='Save/Update invoice'>
						<button
							className="blackButton py-1"
							onClick={btnClck}
						>
							<Save className='size-4' />
							{isButtonDisabled ? getTtl('saving', ln) : getTtl('save', ln)}
							{isButtonDisabled && <LoaderCircle className='animate-spin' />}

						</button>
					</Tltip>}
				<Tltip direction='top' tltpText='Clear form'>
					<button
						className="whiteButton py-1"
						onClick={clearForm}
					>
						<Eraser className='size-4' />
						{fnl ? 'New' : getTtl('Clear', ln)}
					</button>
				</Tltip>
				<Tltip direction='top' tltpText='Close form'>
					<button
						className="whiteButton py-1"
						onClick={() => setIsOpenCon(false)}
					>
						<X className='size-4' />
						{getTtl('Close', ln)}
					</button>
				</Tltip>
				<Tltip direction='top' tltpText='Create PDF document'>
					<button
						className="whiteButton py-1"
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
						<FileText className='size-4' />
						PDF
					</button>
				</Tltip>
				{(!fnl && valueInv.id !== '') &&
					<Tltip direction='top' tltpText='Delete Invoice'>
						<button
							className="whiteButton py-1"
							onClick={() => setIsDeleteOpen(true)}
						>
							<Trash className='size-4' />
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
							className="whiteButton py-1"
							onClick={() => setShowPmntExp('exp')}
						>
							<PanelTopOpen className='size-4' />
							{getTtl('Expenses', ln)}
						</button>
					</Tltip>}
				{valueInv.id !== '' &&
					<Tltip direction='top' tltpText='Client payments'>
						<button
							className="whiteButton py-1"
							onClick={() => setShowPmntExp('pmnt')}
						>
							<Banknote className='size-4' />
							{getTtl('Payments', ln)}
						</button>
					</Tltip>}
				{(!fnl && valueInv.id !== '' && !copyInvoice) && showButton &&
					<Tltip direction='top' tltpText='Copy invoice data'>
						<button
							className="whiteButton py-1"
							onClick={() => copy_Invoice()}
						>
							<Copy className='size-4' />
							{getTtl('Copy Invoice', ln)}
						</button>
					</Tltip>}

				{(copyInvoice && !valueCon.invoices.map(x => x.id).includes(copyInvValue.id)) && showButton &&
					<Tltip direction='top' tltpText='Paste invoice data'>
						<button
							className="whiteButton py-1 hidden md:flex"
							onClick={() => paste_Invoice(uidCollection, valueCon, setValueCon, contractsData, setContractsData)}
						>
							<ClipboardCheck className='size-4' />
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