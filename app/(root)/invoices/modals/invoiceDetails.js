'use client'
import { useContext, useEffect, useState } from 'react'
import { SettingsContext } from "../../../../contexts/useSettingsContext";
import { InvoiceContext } from "../../../../contexts/useInvoiceContext";
import { getD, reOrderTableInv } from '../../../../utils/utils.js';
import Datepicker from "react-tailwindcss-datepicker";
import { Pdf } from '../../contracts/modals/pdf/pdfInvoice.js';
import { PdfFnlCncl } from '../../contracts/modals/pdfInvoiceFnlCncl.js';
import ProductsTable from '../../contracts/modals/productsTableInvoice.js';
import ModalToAction from '../../../../components/modalToProceed';
import { VscSaveAs } from 'react-icons/vsc';
import { VscClose } from 'react-icons/vsc';
import { FaFilePdf } from 'react-icons/fa';
import { GiMoneyStack } from 'react-icons/gi'
import InvoiceType from './invoiceType.js'
import { FaFileContract } from "react-icons/fa";
import { TbStackPush } from 'react-icons/tb';
import Expenses from '../../contracts/modals/expenses'
import Payments from '../../contracts/modals/payments.js'
import { UserAuth } from "../../../../contexts/useAuthContext";
import Spinner from '../../../../components/spinner.js';
import Remarks from '../../contracts/modals/remarks'
import { validate, ErrDiv } from '../../../../utils/utils'
import { RiRefreshLine } from "react-icons/ri";
import { getTtl } from '../../../../utils/languages.js';
import { useRouter } from 'next/navigation.js';
import { ContractsContext } from "../../../../contexts/useContractsContext";
import dateFormat from 'dateformat';
import Tltip from '../../../../components/tlTip.js';
import { Selector } from '../../../../components/selectors/selectShad.js';

const InvoiceModal = () => {

	const { settings, compData, loading, setToast, ln, setDateSelect } = useContext(SettingsContext);
	const { valueInv, setValueInv, setIsOpen,
		saveData_InvoiceInInvoices, finilizeInvoice, cancelInvoice, errors, setErrors, setDeleteProducts } = useContext(InvoiceContext);
	const clts = settings.Client.Client;
	const client = valueInv.client && clts.find(z => z.id === valueInv.client);
	const [isFinilizeOpen, setIsFinilizeOpen] = useState(false)
	const [isCanceleOpen, setIsCancelOpen] = useState(false)
	const [showExpenses, setShowExpenses] = useState(false)
	const [showPayments, setShowPayments] = useState(false)
	const fnl = valueInv.final
	const { uidCollection, gisAccount } = UserAuth();
	const [isButtonDisabled, setIsButtonDisabled] = useState(false);
	const router = useRouter();
	const { setValueCon, setIsOpenCon, valueCon } = useContext(ContractsContext);


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

	//Total Net WT Kgs:
	const options = { style: 'decimal', minimumFractionDigits: 0, maximumFractionDigits: 2 };
	const locale = 'en-US';
	const NetWTKgsTmp = (valueInv.productsDataInvoice.filter(q => q.qnty !== 's').map(x => x.qnty)
		.reduce((accumulator, currentValue) => accumulator + currentValue * 1, 0) * 1000) || '';
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

	const saveData = async () => {

		if (!isButtonDisabled) {
			setIsButtonDisabled(true);
			let result = await saveData_InvoiceInInvoices(uidCollection, settings)
			if (!result) setIsButtonDisabled(false); //false

			setTimeout(() => {
				setIsButtonDisabled(false);
				result && setToast({ show: true, text: 'Invoice successfully saved!', clr: 'success' })
			}, 2000); // Adjust the delay as needed
		}
	}

	const moveToContracts = async () => {

		setIsOpen(false)

		let fstDay = new Date(valueInv.poSupplier.date);
		fstDay.setDate(1);
		fstDay = dateFormat(fstDay, 'yyyy-mm-dd')

		let lstDay = new Date(valueInv.poSupplier.date);
		lstDay.setMonth(lstDay.getMonth() + 1);
		lstDay.setDate(0);
		lstDay = dateFormat(lstDay, 'yyyy-mm-dd')

		setDateSelect({
			start: fstDay,
			end: lstDay
		})
		router.push("/contracts");

		setIsOpenCon(true)
	}

	return (
		<div className="px-1">
			{loading && <Spinner />}
			<div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-1.5 pt-1'>
				<div className='sm:col-span-2 lg:col-span-3 border-2 border-[#b8ddf8] p-2 rounded-2xl'>
					<p className='flex items-center responsiveText text-[var(--port-gore)] font-medium'>{getTtl('Consignee', ln)}:</p>
					<div>
						{!fnl ?
							<Selector arr={clts} value={valueInv}
								onChange={(e) => handleChange(e, 'client')}
								name='client'
								clear={clear} />
							:
							<p className='pt-2 pl-1 responsiveText font-medium text-[var(--port-gore)]'>{valueInv.client.client}</p>
						}
						<ErrDiv field='client' errors={errors} />
					</div>
					{client && (
						<>
							<p className='pl-1 responsiveText text-[var(--regent-gray)]'>{client.street}</p>
							<p className='pl-1 responsiveText text-[var(--regent-gray)]'>{client.city}</p>
							<p className='pl-1 responsiveText text-[var(--regent-gray)]'>{client.country}</p>
							<p className='pl-1 responsiveText text-[var(--regent-gray)]'>{client.other1}</p>
						</>
					)}
					{fnl && (
						<>
							<p className='pl-1 responsiveText text-[var(--regent-gray)]'>{valueInv.client.street}</p>
							<p className='pl-1 responsiveText text-[var(--regent-gray)]'>{valueInv.client.city}</p>
							<p className='pl-1 responsiveText text-[var(--regent-gray)]'>{valueInv.client.country}</p>
							<p className='pl-1 responsiveText text-[var(--regent-gray)]'>{valueInv.client.other1}</p>
						</>
					)}
				</div>
				<div className='lg:col-span-2 border-2 border-[#b8ddf8] p-2 rounded-2xl flex flex-col'>
					<p className='responsiveText text-[var(--port-gore)] font-medium indent-1'>{getTtl('Invoice Type', ln)}:</p>
					{!fnl ?
						<InvoiceType setSelected={selectInvType} plans={settings.InvTypes.InvTypes} value={valueInv} ln={ln} />
						:
						<p className='pt-2 pl-1 responsiveText text-[var(--port-gore)]'>{valueInv.invType}</p>
					}
				</div>
				<div className='lg:col-span-3 border-2 border-[#b8ddf8] p-2 rounded-2xl flex flex-col'>
					<p className='responsiveText text-[var(--port-gore)] font-medium indent-1'>{getTtl('PO', ln)}#:</p>
					{valueInv.productsDataInvoice.length > 0 && <ul className="flex flex-col mt-1 ring-1 ring-[#b8ddf8] rounded-xl divide-y divide-[#b8ddf8]" >
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
				<div className='sm:col-span-2 lg:col-span-4 border-2 border-[#b8ddf8] p-2 rounded-2xl flex flex-col gap-1.5'>
					<div className='flex items-center gap-2'>
						<p className='responsiveText font-medium whitespace-nowrap text-[var(--port-gore)]'>{getTtl('Date', ln)}:</p>
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
									<ErrDiv field='date' errors={errors} />
								</>
								:
								<p className='pl-1 responsiveText text-[var(--port-gore)]'>{valueInv.date}</p>
							}
						</div>
					</div>
					<div className='flex items-center gap-4 flex-wrap'>
						<div className='flex items-center gap-1.5'>
							<p className='responsiveText font-medium whitespace-nowrap text-[var(--port-gore)]'>
								{!fnl ? valueInv.invType === '1111' ? getTtl('Invoice', ln) + ' #:' : valueInv.invType === '2222' ?
									getTtl('Credit Note', ln) + ' #:' : getTtl('Final Note', ln) + ' #:' :
									valueInv.invType + ' No:'}
							</p>
							<p className='responsiveText font-medium text-[var(--port-gore)]'>
								{String(valueInv.invoice).padStart(4, "0") + getprefixInv(valueInv)}
							</p>
						</div>
						<div className='flex items-center gap-1.5'>
							<p className='responsiveText font-medium whitespace-nowrap text-[var(--port-gore)]'>{getTtl('Status', ln)}:</p>
							<p className='responsiveText font-semibold'>
								{!fnl ? 'Draft' : fnl && !valueInv.canceled ? 'Finalized' : (fnl && valueInv.canceled) && 'Canceled'}
							</p>
						</div>
					</div>
				</div>
			</div>


			<div className='grid grid-cols-1 md:grid-cols-3 gap-1.5 pt-1'>
				<div className='border-2 border-[#b8ddf8] p-2 rounded-2xl'>
					<div className='flex flex-col gap-0.5'>
						<p className='responsiveText text-[var(--port-gore)] font-medium'>{getTtl('Shipment', ln)}:</p>
						<div>
							{!fnl ?
								<>
									<Selector arr={settings.Shipment.Shipment} value={valueInv}
										onChange={(e) => handleChange(e, 'shpType')}
										name='shpType'
										clear={clear} />
									<ErrDiv field='shpType' errors={errors} />
								</>
								:
								<p className='pl-1 responsiveText text-[var(--port-gore)]'>{valueInv.shpType}</p>
							}
						</div>
					</div>
					<div className='flex flex-col gap-0.5 pt-1'>
						<p className='responsiveText text-[var(--port-gore)] font-medium'>{getTtl('Origin', ln)}:</p>
						<div>
							{!fnl ?
								<Selector arr={[...settings.Origin.Origin, { id: 'empty', origin: '...Empty' }]} value={valueInv}
									onChange={(e) => handleChange(e, 'origin')}
									name='origin'
									clear={clear} />
								:
								<p className='pl-1 responsiveText text-[var(--port-gore)]'>{valueInv.origin}</p>
							}
						</div>
					</div>
					<div className='flex flex-col gap-0.5 pt-1'>
						<p className='responsiveText text-[var(--port-gore)] font-medium'>{getTtl('Delivery Terms', ln)}:</p>
						<div>
							{!fnl ?
								<Selector arr={settings['Delivery Terms']['Delivery Terms']} value={valueInv}
									onChange={(e) => handleChange(e, 'delTerm')}
									name='delTerm'
									clear={clear} />
								:
								<p className='pl-1 responsiveText text-[var(--port-gore)]'>{valueInv.delTerm}</p>
							}
						</div>
					</div>
					<div className='flex flex-col gap-0.5 pt-1'>
						<p className='responsiveText text-[var(--port-gore)] font-medium'>{getTtl('Delivery Date', ln)}:</p>
						<div>
							{!fnl ?
								<Datepicker useRange={false}
									asSingle={true}
									value={valueInv.delDate}
									popoverDirection='down'
									onChange={handleDateChangeDelvrDate}
									displayFormat={"DD-MMM-YYYY"}
									inputClassName='input w-full shadow-lg h-7'
								/>
								:
								<p className='pl-1 responsiveText text-[var(--port-gore)]'>{valueInv.delDate}</p>
							}
						</div>
					</div>
				</div>

				<div className='border-2 border-[#b8ddf8] p-2 rounded-2xl'>
					<div className='flex flex-col gap-0.5'>
						<p className='responsiveText text-[var(--port-gore)] font-medium'>{getTtl('POL', ln)}:</p>
						<div>
							{!fnl ?
								<Selector arr={settings.POL.POL} value={valueInv}
									onChange={(e) => handleChange(e, 'pol')}
									name='pol'
									clear={clear} />
								:
								<p className='pl-1 responsiveText text-[var(--port-gore)]'>{valueInv.pol}</p>
							}
						</div>
					</div>
					<div className='flex flex-col gap-0.5 pt-1'>
						<p className='responsiveText text-[var(--port-gore)] font-medium'>{getTtl('POD', ln)}:</p>
						<div>
							{!fnl ?
								<Selector arr={settings.POD.POD} value={valueInv}
									onChange={(e) => handleChange(e, 'pod')}
									name='pod'
									clear={clear} />
								:
								<p className='pl-1 responsiveText text-[var(--port-gore)]'>{valueInv.pod}</p>
							}
						</div>
					</div>
					{(valueInv.invType === '1111' || valueInv.invType === 'Invoice') &&
						<div className='flex flex-col gap-0.5 pt-1'>
							<p className='responsiveText text-[var(--port-gore)] font-medium'>{getTtl('Packing', ln)}:</p>
							<div>
								{!fnl ?
									<Selector arr={settings.Packing.Packing} value={valueInv}
										onChange={(e) => handleChange(e, 'packing')}
										name='packing'
										clear={clear}
										disabled={valueInv.invType === '2222' || valueInv.invType === '3333'} />
									:
									<p className='pl-1 responsiveText text-[var(--port-gore)]'>{valueInv.packing}</p>
								}
							</div>
						</div>}
				</div>

				<div className='border-2 border-[#b8ddf8] p-2 rounded-2xl'>
					<div className={`flex gap-2 justify-between ${fnl ? 'py-0' : 'py-0.5'}`}>
						<p className='flex items-center responsiveText text-[var(--port-gore)] font-medium'>{getTtl('totalNet', ln)}:</p>
						<p className='responsiveText pr-2 text-[var(--port-gore)]'>
							{NetWTKgs}
						</p>
					</div>
					{(valueInv.invType === '1111' || valueInv.invType === 'Invoice') &&
						<div className={`flex gap-2 justify-between ${fnl ? 'py-0' : 'py-0.5'}`}>
							<p className={`flex items-center responsiveText ${(secondRule || fifthRule) && 'text-[var(--regent-gray)]'} font-medium text-[var(--port-gore)]`}>{getTtl('totalTare', ln)}:</p>
							<p className={`responsiveText pr-6 ${parseInt(TotalTarre) < 0 ? 'text-red-400 font-medium' : 'text-[var(--port-gore)]'}`}>{secondRule || fifthRule ? '' : TotalTarre}</p>
						</div>
					}
					<div className={`flex gap-2 justify-between ${fnl ? 'py-0' : 'py-0.5'}`}>
						<p className={`flex items-center responsiveText font-medium text-[var(--port-gore)] ${(fourthRule || fifthRule) && 'text-[var(--regent-gray)]'}`}>{thirdRule ? 'QTY Ingots' : getTtl('totalGross', ln)}:</p>
						<div className='flex items-center responsiveText font-medium whitespace-nowrap'>{(fourthRule || fifthRule) ? '' :
							<div className='px-1'>
								{!fnl ?
									<input className="input shadow-lg h-7 text-[0.75rem] w-20" name='ttlGross' value={valueInv.ttlGross} onChange={handleValue} />
									:
									<p className='responsiveText pr-5 text-[var(--port-gore)]'>{(valueInv.ttlGross * 1).toLocaleString(locale, options)}</p>
								}
							</div>
						}</div>
					</div>
					{(valueInv.invType === '1111' || valueInv.invType === 'Invoice') &&
						<div className={`flex gap-2 justify-between ${fnl ? 'py-0' : 'py-0.5'}`}>
							<p className={`flex items-center responsiveText font-medium text-[var(--port-gore)] ${(fourthRule || thirdRule) && 'text-[var(--regent-gray)]'}`}>{getTtl('totalPack', ln)}:</p>
							<div className='flex items-center responsiveText font-medium whitespace-nowrap'>{(fourthRule || thirdRule) ? '' :
								<div className='px-1'>
									{!fnl ?
										<input className="input shadow-lg h-7 text-[0.75rem] w-20" name='ttlPackages' value={valueInv.ttlPackages} onChange={handleValue} />
										:
										<p className='responsiveText pr-5 text-[var(--port-gore)]'>{valueInv.ttlPackages}</p>
									}
								</div>
							}</div>
						</div>
					}
				</div>
			</div>

			<div className='grid grid-cols-1 md:grid-cols-2 gap-1.5 mt-1'>
				<div className='flex border-2 border-[#b8ddf8] p-2 rounded-2xl'>
					<p className='flex items-center responsiveText text-[var(--port-gore)] font-medium whitespace-nowrap'>{getTtl('Bank Account', ln)}:</p>
					<div className='w-full pl-4'>
						{!fnl ?
							<Selector arr={settings['Bank Account']['Bank Account']} value={valueInv}
								onChange={(e) => handleChange(e, 'bankNname')}
								name='bankNname'
								clear={clear} />
							:
							<p className=' pl-1 responsiveText text-[var(--port-gore)]'>{valueInv.bankName.bankNname}</p>
						}
					</div>
				</div>

				<div className='hidden md:flex border-2 border-[#b8ddf8] p-2 rounded-2xl'>
					<p className='flex items-center responsiveText text-[var(--port-gore)] font-medium whitespace-nowrap'>HS Code:</p>
					<div className='w-full pl-4'>
						{!fnl ?
							<div className='flex gap-5'>
								<Selector arr={settings.Hs.Hs.map(item => {
									const { hs, ...rest } = item;
									return { hs1: hs, ...rest };
								})} value={valueInv}
									onChange={(e) => handleChange(e, 'hs1')}
									name='hs1'
									clear={clear} />

								<Selector arr={settings.Hs.Hs.map(item => {
									const { hs, ...rest } = item;
									return { hs2: hs, ...rest };
								})} value={valueInv}
									onChange={(e) => handleChange(e, 'hs2')}
									name='hs2'
									clear={clear} />
							</div>
							:
							<div className='flex gap-5'>
								<p className=' pl-1 responsiveText text-[var(--port-gore)]'>{valueInv.hs1}</p>
								<p className=' pl-1 responsiveText text-[var(--port-gore)]'>{valueInv.hs2}</p>
							</div>
						}
					</div>
				</div>
			</div>


			<div className='grid grid-cols-1 lg:grid-cols-8 gap-1.5 pt-1'>
				<div className='lg:col-span-7'>
					<div className='w-full border-2 border-[#b8ddf8] p-2 rounded-2xl'>
						<ProductsTable value={valueInv} setValue={setValueInv}
							currency={settings.Currency.Currency} uidCollection={uidCollection}
							settings={settings} setDeleteProducts={setDeleteProducts}
							materialsArr={valueInv.productsData.map(x => ({ id: x.id, description: x.description }))}
						/>
					</div>
				</div>
				<div className='border-2 border-[#b8ddf8] p-2 rounded-2xl'>
					<div className='gap-1.5'>
						<p className='flex responsiveText text-[var(--port-gore)] font-medium'>{getTtl('Currency', ln)}:</p>
						<div className='w-full '>
							{!fnl ?
								<>
									<Selector arr={settings.Currency.Currency} value={valueInv}
										onChange={(e) => handleChange(e, 'cur')}
										name='cur'
										clear={clear}
										disabled={valueInv.invType !== '1111'} />
									<ErrDiv field='cur' errors={errors} />
								</>
								:
								<p className=' pl-1 responsiveText text-[var(--port-gore)]'>{valueInv.cur.cur}</p>
							}
						</div>
					</div>
				</div>
			</div>

			<div className='grid grid-cols-1 md:grid-cols-8 gap-1.5 mt-1'>
				<div className='md:col-span-5 w-full border-2 border-[#b8ddf8] p-2 rounded-2xl'>
					<Remarks value={valueInv} setValue={setValueInv} ln={ln} />
				</div>
				<div className='md:col-span-3 h-fit border-2 border-[#b8ddf8] p-2 py-1 pb-0 rounded-2xl'>
					<p className='flex responsiveText text-[var(--port-gore)] font-medium'>{getTtl('Comments', ln)}:</p>
					<textarea rows="1" name="comments"
						className="input w-full h-8 p-1 !rounded-xl"
						style={{ fontSize: '0.75rem', fontFamily: 'inherit' }}
						value={valueInv.comments}
						onChange={handleValue}
					/>
				</div>
			</div>

			<Expenses showExpenses={showExpenses} />
			<Payments showPayments={showPayments} />


			<div className="p-1.5 pl-2 flex gap-2 flex-wrap justify-center md:justify-start">
				{!fnl &&
					<Tltip direction='top' tltpText='Save/Update invoice'>
						<button
							type="button"
							className="blackButton py-1"
							onClick={saveData}
						>
							<VscSaveAs className='size-4' />
							{isButtonDisabled ? getTtl('saving', ln) : getTtl('save', ln)}
							{isButtonDisabled && <RiRefreshLine className='animate-spin' />}
						</button>
					</Tltip>}
				<Tltip direction='top' tltpText='Close form'>
					<button
						type="button"
						className="whiteButton py-1" onClick={() => setIsOpen(false)}
					>
						<VscClose className='size-4' />
						{getTtl('Close', ln)}
					</button>
				</Tltip>
				<Tltip direction='top' tltpText='Create PDF document'>
					<button
						type="button"
						className="whiteButton py-1"
						onClick={() => !fnl ? Pdf(valueInv,
							reOrderTableInv(valueInv.productsDataInvoice).map(({ ['id']: _, ...rest }) => rest).map(obj => Object.values(obj))
								.map((values, index) => {
									const number = values[3];
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
							PdfFnlCncl(valueInv,
								reOrderTableInv(valueInv.productsDataInvoice).map(({ ['id']: _, ...rest }) => rest).map(obj => Object.values(obj))
									.map((values, index) => {
										const number = values[3];
										const number1 = values[4];
										const number2 = values[5];
										let tmpObj = valueInv.productsDataInvoice[index]
										let description = tmpObj.mtrlStatus === 'select' ? valueInv.productsData.find(x => x.id === tmpObj.descriptionId)?.['description'] :
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
						<FaFilePdf className='size-4' />
						PDF
					</button>
				</Tltip>
				{valueInv.id !== '' &&
					<Tltip direction='top' tltpText='Shipment expenses'>
						<button
							type="button"
							className="whiteButton py-1" onClick={() => setShowPmntExp('exp')}
						>
							<TbStackPush className='size-4' />
							{getTtl('Expenses', ln)}
						</button>
					</Tltip>
				}
				<Tltip direction='top' tltpText='Client payments'>
					{valueInv.id !== '' && <button
						type="button"
						className="whiteButton py-1" onClick={() => setShowPmntExp('pmnt')}
					>
						<GiMoneyStack className='size-4' />
						{getTtl('Payments', ln)}
					</button>}
				</Tltip>
				<Tltip direction='top' tltpText='Switch to the contract of this invoice'>
					<button
						type="button"
						className="whiteButton py-1"
						onClick={() => moveToContracts()}
					>
						<FaFileContract className='size-4' />
						{getTtl('Contract', ln)}
					</button>
				</Tltip>
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
