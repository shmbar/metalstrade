'use client'
import { useContext, useEffect, useState } from 'react'
import { SettingsContext } from "@contexts/useSettingsContext";
import { ContractsContext } from "@contexts/useContractsContext";
import Datepicker from "react-tailwindcss-datepicker";
import { Pdf } from './pdf/pdfContract.js';
import ProductsTable from './productsTable.js';
import Remarks from './remarksSelection.js'
import PriceRemarks from './priceRemarks.js'
import { usePathname } from 'next/navigation';
import ModalToDelete from '@components/modalToProceed';
import { validate, ErrDiv, reOrderTableCon, getD, sortArr } from '@utils/utils'
import { UserAuth } from "@contexts/useAuthContext";
import FilesModal from './filesModal.js'
import PoInvModal from './poInvModal.js'
import WhModal from './whModal.js'
import { getTtl } from '@utils/languages.js';
import FinalSettlmentModal from './finalSettlmentModal.js';
import CheckBox from '@components/checkbox.js';
import Tltip from '@components/tlTip.js';
import { Selector } from '@components/selectors/selectShad';
import { X, Save, LoaderCircle, FileText, Trash, Copy, SendToBack, Database } from "lucide-react"

const ContractModal = () => {

	const { settings, compData, setToast, ln } = useContext(SettingsContext);
	const { valueCon, setValueCon, saveData, delContract, setIsOpenCon,
		errors, setErrors, duplicate, contractsData, isButtonDisabled, setIsButtonDisabled } = useContext(ContractsContext);
	const sups = settings.Supplier.Supplier;
	const supplier = valueCon.supplier && sups.find(z => z.id === valueCon.supplier);
	const [isDeleteOpen, setIsDeleteOpen] = useState(false)
	const [isDuplicateOpen, setIsDuplicateOpen] = useState(false)
	const { uidCollection, gisAccount } = UserAuth();
	const [showFilesModal, setShowFilesModal] = useState(false)
	const [showPoInvModal, setShowPoInvModal] = useState(false)
	const [showStockModal, setShowStockModal] = useState(false)
	const [showFinalSettlmntModal, setShowFinalSettlmntModal] = useState(false);

	const pathName = usePathname();


	const showButton = !['/contractsreview', '/inventoryreview', '/invoicesreview'].includes(pathName)

	useEffect(() => {
		if (Object.values(errors).includes(true)) {
			setErrors(validate(valueCon, ['client', 'cur', 'order', 'shpType', 'date']))
		}
	}, [valueCon])

	let firstRule = valueCon.delTerm === '2345' || valueCon.delTerm === '8768' || valueCon.delTerm === '324'
	let secondRule = valueCon.shpType === '434'

	const handleValue = (e) => {
		setValueCon({ ...valueCon, [e.target.name]: e.target.value })
	}


	const handleDateChange = (newValue) => {
		setValueCon({ ...valueCon, dateRange: newValue, date: newValue.startDate })
	}

	const btnClck = async () => {


		if (!isButtonDisabled) {
			setIsButtonDisabled(true);
			let result = await saveData(uidCollection, gisAccount)
			if (!result) setIsButtonDisabled(false); //false

			setTimeout(() => {
				setIsButtonDisabled(false);
				result && setToast({ show: true, text: getTtl('Contract successfully saved!', ln), clr: 'success' })
			}, 3000); // Adjust the delay as needed
		}
	}

	const caneclEditText = () => {
		setValueCon({ ...valueCon, 'isDeltimeText': false, 'deltime': '' })
	}

	const handleChange = (e, name) => {
		setValueCon(prev => {
			const updated = { ...prev, [name]: e }

			if (name === "shpType" && e === "434") {
				updated.contType = ""
			}

			if (name === "delTerm" && ["2345", "8768", "324"].includes(e)) {
				updated.pod = ""
			}


			if (name === 'deltime' && e === 'EditTextDelTime') {
				updated.deltime = ''
				updated.isDeltimeText = true
			}


			return updated
		})
	}


	const clear = (name) => {
		setValueCon(prev => ({
			...prev, [name]: '',
		}))
	}

	return (
		<div className="px-1">

			<div className='grid grid-cols-1 md:grid-cols-6 gap-3 pt-1'>
				<div className='md:col-span-3 border-2 border-[#b8ddf8] p-2 rounded-2xl'>
					<div className='flex flex-col md:flex-row gap-3 items-start md:items-center'>
						<p className='flex responsiveText font-medium text-[var(--chathams-blue)] text-[0.75rem]'>{getTtl('Supplier Name', ln)}:</p>
						<div className='flex-1 min-w-0'>
							<Selector arr={sups} value={valueCon}
								onChange={(e) => handleChange(e, 'supplier')}
								name='supplier'
								clear={clear} />
							<ErrDiv field='supplier' errors={errors} ln={ln} />
						</div>
						<div className='items-center flex gap-1'>
							<CheckBox size='size-5' checked={valueCon.showOriginSupplier ?? false}
								onChange={() => setValueCon({ ...valueCon, showOriginSupplier: !valueCon.showOriginSupplier })} />
							<span className='responsiveText'>Original Supplier</span>
						</div>

					</div>
					{supplier && (
						<>
							<p className='pt-2 pl-1 responsiveText'>{supplier.street}</p>
							<p className='pt-2 pl-1 responsiveText'>{supplier.city}</p>
							<p className='pt-2 pl-1 responsiveText'>{supplier.country}</p>
							<p className='pt-2 pl-1 responsiveText'>{supplier.other1}</p>
						</>
					)}
					{valueCon.showOriginSupplier &&
						<div className='flex items-center gap-2 w-full'>
							<p className='flex p-1 pt-2 items-center responsiveText whitespace-nowrap font-medium text-[var(--chathams-blue)]'>Original Supplier:</p>
							<div className='flex-1 min-w-0 max-w-[18rem]'>
								<Selector
									arr={settings.Supplier.Supplier
										.map(z => ({ ...z, originSupplier: z.id }))}
									value={valueCon}
									onChange={(e) => handleChange(e, 'originSupplier')}
									name='originSupplier'
									secondaryName='nname'
									clear={clear} />
							</div>
						</div>
					}
				</div>
				<div className='hidden md:flex md:col-span-1 border-2 border-[#b8ddf8] p-2 rounded-2xl'>

				</div>
				<div className='md:col-span-2 border-2 border-[#b8ddf8] p-2 rounded-2xl'>
					<p className='flex items-center responsiveText font-medium text-[var(--chathams-blue)] text-[0.75rem]'>{getTtl('PoOrderNo', ln)}:</p>
					<div className='w-full responsiveText'>
						<input className="border-2 border-[#b8ddf8] rounded-full px-3 py-1 h-7 text-[0.75rem] focus:outline-none focus:ring-1 focus:ring-blue-200 w-full" style={{ fontSize: 'inherit', fontFamily: 'inherit' }} name='order' value={valueCon.order} onChange={handleValue} />
						<ErrDiv field='order' errors={errors} ln={ln} />
					</div>
					<p className='flex items-center responsiveText mt-3 font-medium text-[var(--chathams-blue)] text-[0.75rem]'>{getTtl('Date', ln)}:</p>
					<div className='w-full '>
						<Datepicker useRange={false}
							asSingle={true}
							value={valueCon.dateRange}
							popoverDirection='down'
							onChange={handleDateChange}
							displayFormat={"DD-MMM-YYYY"}
							inputClassName='border-2 border-[#b8ddf8] rounded-full px-3 py-1 h-7 text-[0.75rem] focus:outline-none focus:ring-1 focus:ring-blue-200 w-full'
						/>
						<ErrDiv field='date' errors={errors} ln={ln} />
					</div>
				</div>
			</div>
			<div className='grid grid-cols-1 md:grid-cols-3 gap-3 pt-2'>
				<div className='border-2 border-[#b8ddf8] p-2 rounded-2xl'>
					<div className='flex  gap-2 md:items-center justify-between'>
						<p className='flex responsiveText items-center font-medium whitespace-nowrap text-[var(--chathams-blue)] text-[0.75rem]'>{getTtl('Shipment', ln)}:</p>
						<div className='flex-1 min-w-0 max-w-[15rem]'>
							<Selector arr={settings.Shipment.Shipment} value={valueCon}
								onChange={(e) => handleChange(e, 'shpType')}
								name='shpType'
								clear={clear} />
							<ErrDiv field='shpType' errors={errors} ln={ln} />
						</div>
					</div>
					<div className='flex flex-row gap-2 items-center pt-2 justify-between'>
						<p className='flex responsiveText items-center font-medium whitespace-nowrap text-[var(--chathams-blue)] text-[0.75rem]'>{getTtl('Origin', ln)}:</p>
						<div className='flex-1 min-w-0 max-w-[15rem]'>
							<Selector arr={[...settings.Origin.Origin, { id: 'empty', origin: '...Empty' }]} value={valueCon}
								onChange={(e) => handleChange(e, 'origin')}
								name='origin'
								clear={clear} />
						</div>
					</div>
					<div className='flex flex-row gap-2 items-center pt-2 justify-between'>
						<p className='flex responsiveText items-center font-medium whitespace-nowrap text-[var(--chathams-blue)] text-[0.75rem]'>{getTtl('Delivery Terms', ln)}:</p>
						<div className='flex-1 min-w-0 max-w-[15rem]'>
							<Selector arr={settings['Delivery Terms']['Delivery Terms']} value={valueCon}
								onChange={(e) => handleChange(e, 'delTerm')}
								name='delTerm'
								clear={clear} />
						</div>
					</div>
				</div>

				<div className='border-2 border-[#b8ddf8] p-2 rounded-2xl'>
					<div className='flex gap-2 md:items-center justify-between'>
						<p className='flex responsiveText items-center font-medium whitespace-nowrap text-[var(--chathams-blue)] text-[0.75rem]'>{getTtl('POL', ln)}:</p>
						<div className='flex-1 min-w-0 max-w-[15rem]'>
							<Selector arr={settings.POL.POL} value={valueCon}
								onChange={(e) => handleChange(e, 'pol')}
								name='pol'
								clear={clear} />
						</div>
					</div>
					<div className='flex flex-row gap-2 items-center pt-2 justify-between'>
						<p className='flex responsiveText items-center font-medium whitespace-nowrap text-[var(--chathams-blue)] text-[0.75rem]'>{getTtl('POD', ln)}:</p>
						<div className='flex-1 min-w-0 max-w-[15rem]'>
							<Selector arr={settings.POD.POD} value={valueCon}
								onChange={(e) => handleChange(e, 'pod')}
								name='pod'
								clear={clear} disabled={firstRule} />
						</div>
					</div>
					<div className='flex flex-row gap-2 items-center pt-2 justify-between'>
						<p className='flex responsiveText items-center font-medium whitespace-nowrap text-[var(--chathams-blue)] text-[0.75rem]'>{getTtl('Packing', ln)}:</p>
						<div className='flex-1 min-w-0 max-w-[15rem]'>
							<Selector arr={settings.Packing.Packing} value={valueCon}
								onChange={(e) => handleChange(e, 'packing')}
								name='packing'
								clear={clear} />
						</div>
					</div>
				</div>

				<div className='border-2 border-[#b8ddf8] p-2 rounded-2xl'>
					<div className='flex gap-2 md:items-center justify-between'>
						<p className='flex responsiveText items-center font-medium whitespace-nowrap text-[var(--chathams-blue)] text-[0.75rem]'>{getTtl('Container Type', ln)}:</p>
						<div className='flex-1 min-w-0  max-w-[15rem]'>
							<Selector arr={settings['Container Type']['Container Type']} value={valueCon}
								onChange={(e) => handleChange(e, 'contType')}
								name='contType' disabled={secondRule}
								clear={clear} />
						</div>
					</div>
					<div className='flex flex-row gap-2 items-center pt-2 justify-between'>
						<p className='flex responsiveText items-center font-medium whitespace-nowrap text-[var(--chathams-blue)] text-[0.75rem]'>{getTtl('Size', ln)}:</p>
						<div className='flex-1 min-w-0 max-w-[15rem]'>
							<Selector arr={settings.Size.Size} value={valueCon}
								onChange={(e) => handleChange(e, 'size')}
								name='size'
								clear={clear} />
						</div>
					</div>
					<div className='flex flex-row gap-2 items-center pt-2 justify-between'>
						<p className='flex responsiveText font-medium whitespace-nowrap text-[var(--chathams-blue)] text-[0.75rem]'>{getTtl('Delivery Time', ln)}:</p>
						{!valueCon.isDeltimeText ?
							<div className='flex-1 min-w-0 max-w-[15rem]'>
								<Selector arr={[...settings['Delivery Time']['Delivery Time'], { deltime: '..Edit Text', id: 'EditTextDelTime' }]}
									value={valueCon}
									onChange={(e) => handleChange(e, 'deltime')}
									name='deltime'
									clear={clear} />
							</div>
							:
							<div className='flex relative w-[16rem] responsiveText'>
								<input type='text' className="input shadow-lg h-[1.86rem] w-full rounded-full" style={{ fontSize: 'inherit', fontFamily: 'inherit' }} name='deltime'
									value={valueCon.deltime} onChange={handleValue} />
								<button className='relative right-6 '>
									<X className="size-4 text-[var(--regent-gray)]" onClick={caneclEditText} />
								</button>
							</div>
						}
					</div>
				</div>
			</div>

			<div className='mt-2 w-full border-2 border-[#b8ddf8] p-2 rounded-2xl'>
				<p className='flex items-center responsiveText font-medium text-[var(--chathams-blue)] text-[0.75rem]'>{getTtl('Payment Terms', ln)}:</p>
				<div className='w-full '>
					<Selector arr={settings['Payment Terms']['Payment Terms']} value={valueCon}
						onChange={(e) => handleChange(e, 'termPmnt')}
						name='termPmnt'
						clear={clear} />
				</div>
			</div>

			<div className='grid grid-cols-1 md:grid-cols-4 gap-3 pt-2'>
				<div className='md:col-span-3'>
					<div className='w-full border-2 border-[#b8ddf8] p-2 rounded-2xl'>
						<ProductsTable value={valueCon} setValue={setValueCon} currency={settings.Currency.Currency}
							quantityTable={settings.Quantity.Quantity} setShowPoInvModal={setShowPoInvModal}
							setShowStockModal={setShowStockModal} setToast={setToast} contractsData={contractsData}
						/>
					</div>
				</div>
				<div className='md:col-span-1 border-2 border-[#b8ddf8] p-2 rounded-2xl'>
					<div className='flex flex-col gap-0.5'>
						<p className='flex responsiveText font-medium text-[var(--chathams-blue)] text-[0.75rem]'>{getTtl('Currency', ln)}:</p>
						<div className='flex-1 min-w-0'>
							<Selector arr={settings.Currency.Currency} value={valueCon}
								onChange={(e) => handleChange(e, 'cur')}
								name='cur'
								clear={clear} />
							<ErrDiv field='cur' errors={errors} ln={ln} />
						</div>
					</div>
					<div className='flex flex-col gap-0.5 pt-1'>
						<p className='flex responsiveText font-medium text-[var(--chathams-blue)] text-[0.75rem]'>{getTtl('Quantity', ln)}:</p>
						<div className='flex-1 min-w-0'>
							<Selector arr={settings.Quantity.Quantity} value={valueCon}
								onChange={(e) => handleChange(e, 'qTypeTable')}
								name='qTypeTable'
								clear={clear} />
						</div>
					</div>
					<Tltip direction='bottom' tltpText='Contracts storage'>
						<button
							className={`blackButton py-1 mt-2 ${!valueCon.id ? 'opacity-50 cursor-not-allowed' : ''}`}
							onClick={() => setShowFilesModal(true)}
							disabled={!valueCon.id}
						>
							<Database className='size-4' />
							{getTtl('Attachments', ln)}
						</button>
					</Tltip>
				</div>
			</div>

			<div className='grid grid-cols-1 md:grid-cols-4 gap-3 pt-2'>
				<div className='md:col-span-3'>
					<div className='mt-2 w-full border-2 border-[#b8ddf8] p-2 rounded-2xl'>
						<Remarks settings={settings} value={valueCon} setValue={setValueCon} />
					</div>
					<div className='mt-2 w-full border-2 border-[#b8ddf8] p-2 rounded-2xl'>
						<PriceRemarks value={valueCon} setValue={setValueCon} />
					</div>
				</div>
				<div className='md:col-span-1 mt-1'>
					<p className='flex responsiveText font-medium text-[var(--chathams-blue)] text-[0.75rem]'>{getTtl('Comments', ln)}:</p>
					<textarea rows="5" name="comments"
						className="input h-24 p-1 !rounded-xl resize-none w-full"
						style={{ fontSize: '0.75rem', fontFamily: 'inherit' }}
						value={valueCon.comments} onChange={handleValue} />
					<div className='flex leading-7 items-center gap-2 mt-2'>
						<CheckBox size='size-5' checked={valueCon.completed ?? false}
							onChange={() => setValueCon({ ...valueCon, completed: !valueCon.completed })} />
						<span className='responsiveText'>Contract completed</span>
					</div>
				</div>

			</div>



			<div className="p-3 flex gap-2 flex-wrap justify-start flex-row">
				<Tltip direction='top' tltpText='Save/Update contract'>
					<button
						className="blackButton py-1"
						onClick={btnClck}
						disabled={isButtonDisabled}
					>
						<Save className='size-4' />
						{isButtonDisabled ? getTtl('saving', ln) : getTtl('save', ln)}
						{isButtonDisabled && <LoaderCircle className='animate-spin' />}
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
						onClick={() => Pdf(valueCon,
							reOrderTableCon(valueCon.productsData.filter(x => !x.import)).map(({ ['id']: _, ...rest }) => rest).map(obj => Object.values(obj))
								.map((values, index) => {
									const number = values[1]//.toFixed(3);
									const number1 = values[2];

									const formattedNumber = new Intl.NumberFormat('en-US', {
										minimumFractionDigits: 3
									}).format(number);

									const formattedNumber1 = isNaN(number1 * 1) ? number1 :
										new Intl.NumberFormat('en-US', {
											style: 'currency',
											currency: valueCon.cur !== '' ? getD(settings.Currency.Currency, valueCon, 'cur') :
												'USD',
											minimumFractionDigits: 2
										}).format(number1);

									return [index + 1, values[0], formattedNumber, formattedNumber1];
								})
							, settings, compData, gisAccount)}
					>
						<FileText className='size-4' />
						PDF
					</button>
				</Tltip>
				{valueCon.id !== '' &&
					<Tltip direction='top' tltpText='Delete Contract'>
						<button
							className="whiteButton py-1"
							onClick={() => setIsDeleteOpen(true)}
						>
							<Trash className='size-4' />
							{getTtl('Delete', ln)}
						</button>
					</Tltip>
				}
				{valueCon.id !== '' && showButton &&
					<Tltip direction='top' tltpText='Duplicate Contract'>
						<button
							className="whiteButton py-1 flex"
							onClick={() => setIsDuplicateOpen(true)}
						>
							<Copy className='size-4' />
							{getTtl('Duplicate Contract', ln)}
						</button>
					</Tltip>
				}
				<Tltip direction='top' tltpText='Create Final Settlement Invoice'>
					<button
						className="whiteButton py-1 flex"
						onClick={() => setShowFinalSettlmntModal(true)}
					>
						<SendToBack className='size-4' />
						{getTtl('FinalSettlmnt', ln)}
					</button>
				</Tltip>
			</div>
			<ModalToDelete isDeleteOpen={isDeleteOpen} setIsDeleteOpen={setIsDeleteOpen}
				ttl={getTtl('delConfirmation', ln)} txt={getTtl('delConfirmationTxtContract', ln)}
				doAction={() => delContract(uidCollection)} />
			<ModalToDelete isDeleteOpen={isDuplicateOpen} setIsDeleteOpen={setIsDuplicateOpen}
				ttl={getTtl('Duplicate Contract', ln)} txt={getTtl('duplicateConfirmationTxt', ln)}
				doAction={() => duplicate(uidCollection)} />

			{
				showFilesModal && <FilesModal isOpen={showFilesModal} setIsOpen={setShowFilesModal}
					valueCon={valueCon} setToast={setToast} />
			}
			{
				showPoInvModal && <PoInvModal isOpen={showPoInvModal} setIsOpen={setShowPoInvModal}
					setShowStockModal={setShowStockModal}
				/>
			}
			{
				showStockModal && <WhModal isOpen={showStockModal} setIsOpen={setShowStockModal}
					setShowPoInvModal={setShowPoInvModal}
				/>
			}
			{
				setShowFinalSettlmntModal && <FinalSettlmentModal isOpen={showFinalSettlmntModal} setIsOpen={setShowFinalSettlmntModal}
					setShowPoInvModal={setShowFinalSettlmntModal}
				/>
			}
		</div>


	);
};
//
export default ContractModal;