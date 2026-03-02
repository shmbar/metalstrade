'use client'
import { useContext, useEffect, useState } from 'react'
import { SettingsContext } from "../../../../contexts/useSettingsContext";
import { ContractsContext } from "../../../../contexts/useContractsContext";
import CBox from '../../../../components/combobox.js';
import { getD, sortArr } from '../../../../utils/utils.js';
import Datepicker from "react-tailwindcss-datepicker";
import { Pdf } from './pdf/pdfContract.js';
import ProductsTable from './productsTable.js';
import Remarks from './remarksSelection.js'
import PriceRemarks from './priceRemarks.js'
import { VscSaveAs } from 'react-icons/vsc';
import { VscClose } from 'react-icons/vsc';
import { FaFilePdf } from 'react-icons/fa';
import { VscArchive } from 'react-icons/vsc';
import { HiDocumentDuplicate } from 'react-icons/hi';
import { MdOutlineStorage } from 'react-icons/md';
import { usePathname } from 'next/navigation';
import ModalToDelete from '../../../../components/modalToProceed';
import { validate, ErrDiv, reOrderTableCon } from '../../../../utils/utils'
import { UserAuth } from "../../../../contexts/useAuthContext";
import FilesModal from './filesModal.js'
import PoInvModal from './poInvModal.js'
import WhModal from './whModal.js'
import { MdClear } from 'react-icons/md';
import { RiRefreshLine } from "react-icons/ri";
import { getTtl } from '../../../../utils/languages.js';
import { BsTagsFill } from "react-icons/bs";
import FinalSettlmentModal from './finalSettlmentModal.js';
import CheckBox from '../../../../components/checkbox.js';
import Tltip from '../../../../components/tlTip.js';
import SelectStock from '../../../../components/comboboxSelectStock';

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
			let result = await saveData(uidCollection)
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

	const handleSuppleirtUpdate = (e, i) => {
		setValueCon({ ...valueCon, originSupplier: e?.id });
	}

	return (
		<div className="px-3 md:px-4 py-3">

			<style jsx global>{`
				.contracts-modal-form input.input,
				.contracts-modal-form select,
				.contracts-modal-form textarea {
					height: 26px;
					font-size: 10px;
					padding: 0 6px;
					font-weight: 400;
					color: #0b3d6b;
				}
				.contracts-modal-form textarea {
					height: auto;
					padding: 4px 6px;
				}
				.contracts-modal-form .shadow-md,
				.contracts-modal-form .shadow-lg {
					box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
				}
				.contracts-modal-form button.blackButton,
				.contracts-modal-form button.whiteButton {
					height: 26px;
					font-size: 10px;
					padding: 0 10px;
					font-weight: 500;
				}
				.contracts-modal-form p,
				.contracts-modal-form span,
				.contracts-modal-form label {
					font-size: 10px;
					color: #0b3d6b;
				}
				.contracts-modal-form .text-base {
					font-size: 10px;
				}
				.contracts-modal-form .text-sm {
					font-size: 9px;
				}
				.contracts-modal-form .text-xs {
					font-size: 8px;
				}
				.contracts-modal-form .font-semibold {
					font-weight: 600;
				}
				.contracts-modal-form .font-medium {
					font-weight: 500;
				}
			`}</style>

			<div className='contracts-modal-form grid grid-cols-6 gap-3 pt-1'>
				<div className='col-span-12 md:col-span-3 border border-gray-200 p-3 rounded-lg bg-white shadow-sm'>
					<div className='flex gap-4 items-center'>
						<p className='flex pt-1 text-base font-semibold'>{getTtl('Supplier Name', ln)}:</p>
						<div className='w-72'>
							<CBox data={sups} setValue={setValueCon} value={valueCon} name='supplier' classes='shadow-md' />
							<ErrDiv field='supplier' errors={errors} ln={ln} />
						</div>
						<div className='items-center flex gap-1'>
							<CheckBox size='h-5 w-5 md:h-6 md:w-6' checked={valueCon.showOriginSupplier ?? false}
								onChange={() => setValueCon({ ...valueCon, showOriginSupplier: !valueCon.showOriginSupplier })} />
							<span className='text-sm ml-1'>Original Supplier</span>
						</div>

					</div>
					{supplier && (
						<>
							<p className='pt-2 pl-1 text-xs'>{supplier.street}</p>
							<p className='pt-2 pl-1 text-xs'>{supplier.city}</p>
							<p className='pt-2 pl-1 text-xs'>{supplier.country}</p>
							<p className='pt-2 pl-1 text-xs'>{supplier.other1}</p>
						</>
					)}
					{valueCon.showOriginSupplier &&
						<div className='flex items-center gap-2 w-[20rem]'>
							<p className='flex p-1 pt-2 text-sm whitespace-nowrap font-semibold'>Original Supplier:</p>
							<SelectStock
								data={sortArr(settings.Supplier.Supplier.filter(x => !x.deleted)
									.map(z => ({ ...z, nname: z.nname.trim() })), 'nname')}
								setValue={handleSuppleirtUpdate}
								value={settings.Supplier.Supplier.find(z => z.id === valueCon.originSupplier)}
								idx={0}
								name='nname'
								classes='shadow-md h-7'
								plcHolder='Select Original Supplier'
							/>
						</div>
					}
				</div>
				<div className='hidden md:flex md:col-span-1 border border-gray-200 p-3 rounded-lg bg-white shadow-sm'>

				</div>
				<div className='col-span-12 md:col-span-2 border border-gray-200 p-3 rounded-lg bg-white shadow-sm'>
					<p className='flex items-center text-base font-semibold'>{getTtl('PoOrderNo', ln)}:</p>
					<div className='w-full md:w-48 '>
						<input className="input text-[16px] shadow-lg h-10 rounded-lg px-3" name='order' value={valueCon.order} onChange={handleValue} />
						<ErrDiv field='order' errors={errors} ln={ln} />
					</div>
					<p className='flex items-center text-base mt-3 font-semibold'>{getTtl('Date', ln)}:</p>
					<div className='w-full md:w-48 '>
						<Datepicker useRange={false}
							asSingle={true}
							value={valueCon.dateRange}
							popoverDirection='down'
							onChange={handleDateChange}
							displayFormat={"DD-MMM-YYYY"}
							inputClassName='input w-full text-[16px] shadow-lg h-10 rounded-lg px-3'
						/>
						<ErrDiv field='date' errors={errors} ln={ln} />
					</div>
				</div>
			</div>
			<div className='grid grid-cols-3 gap-3 pt-2'>
				<div className='col-span-12 md:col-span-1 border border-gray-200 p-3 rounded-lg bg-white shadow-sm'>
					<div className='flex gap-4 justify-between'>
						<p className='flex pt-1 text-sm font-medium whitespace-nowrap'>{getTtl('Shipment', ln)}:</p>
						<div className='w-full md:w-44'>
							<CBox data={settings.Shipment.Shipment} setValue={setValueCon} value={valueCon} name='shpType' classes='shadow-md' />
							<ErrDiv field='shpType' errors={errors} ln={ln} />
						</div>
					</div>
					<div className='flex gap-4 justify-between'>
						<p className='flex items-center text-sm font-medium whitespace-nowrap'>{getTtl('Origin', ln)}:</p>
						<div className='w-full md:w-44'>
							<CBox data={[...settings.Origin.Origin, { id: 'empty', origin: '...Empty' }]} setValue={setValueCon} value={valueCon} name='origin' classes='shadow-md' />
						</div>
					</div>
					<div className='flex gap-4 justify-between'>
						<p className='flex items-center text-sm font-medium whitespace-nowrap'>{getTtl('Delivery Terms', ln)}:</p>
						<div className='w-full md:w-44'>
							<CBox data={settings['Delivery Terms']['Delivery Terms']} setValue={setValueCon} value={valueCon} name='delTerm' classes='shadow-md' />
						</div>
					</div>
				</div>

				<div className='col-span-12 md:col-span-1 border border-gray-200 p-3 rounded-lg bg-white shadow-sm'>
					<div className='flex gap-4 justify-between'>
						<p className='flex items-center text-sm font-medium whitespace-nowrap'>{getTtl('POL', ln)}:</p>
						<div className='w-full md:w-44'>
							<CBox data={settings.POL.POL} setValue={setValueCon} value={valueCon} name='pol' classes='shadow-md' />
						</div>
					</div>
					<div className='flex gap-4 justify-between'>
						<p className='flex items-center text-sm font-medium whitespace-nowrap'>{getTtl('POD', ln)}:</p>
						<div className='w-full md:w-44'>
							<CBox data={settings.POD.POD} setValue={setValueCon} value={valueCon} name='pod' classes='shadow-md'
								disabled={firstRule}
							/>
						</div>
					</div>
					<div className='flex gap-4 justify-between'>
						<p className='flex items-center text-sm font-medium whitespace-nowrap'>{getTtl('Packing', ln)}:</p>
						<div className='w-full md:w-44'>
							<CBox data={settings.Packing.Packing} setValue={setValueCon} value={valueCon} name='packing' classes='shadow-md' />
						</div>
					</div>
				</div>

				<div className='col-span-12 md:col-span-1 border border-gray-200 p-3 rounded-lg bg-white shadow-sm'>
					<div className='flex gap-4 justify-between'>
						<p className='flex items-center text-sm font-medium whitespace-nowrap'>{getTtl('Container Type', ln)}:</p>
						<div className='w-full md:w-44'>
							<CBox data={settings['Container Type']['Container Type']} setValue={setValueCon} value={valueCon} name='contType' classes='shadow-md'
								disabled={secondRule} />
						</div>
					</div>
					<div className='flex gap-4 justify-between'>
						<p className='flex items-center text-sm font-medium whitespace-nowrap'>{getTtl('Size', ln)}:</p>
						<div className='w-full md:w-44'>
							<CBox data={settings.Size.Size} setValue={setValueCon} value={valueCon} name='size' classes='shadow-md' />
						</div>
					</div>
					<div className='flex gap-4 justify-between'>
						<p className='flex items-center text-sm font-medium whitespace-nowrap'>{getTtl('Delivery Time', ln)}:</p>
						{!valueCon.isDeltimeText ?
							<div className='w-full md:w-44'>
								<CBox data={[...settings['Delivery Time']['Delivery Time'], { deltime: '..Edit Text', id: 'EditTextDelTime' }]} setValue={setValueCon} value={valueCon} name='deltime' classes='shadow-md' />
							</div>
							:
							<div className='flex pt-1 left-5 relative w-7/12'>
								<input type='text' className="input text-[16px] shadow-lg h-10 text-sm w-full rounded-lg px-3" name='deltime'
									value={valueCon.deltime} onChange={handleValue} />
								<button className='relative right-6 '>
								<MdClear className="h-5 w-5 text-[var(--regent-gray)] hover:text-[var(--endeavour)]"
										onClick={caneclEditText} />
								</button>
							</div>
						}
					</div>
				</div>
			</div>

			<div className='mt-3 w-full border border-[var(--selago)] p-3 rounded-xl bg-white shadow-sm'>
				<p className='flex items-center text-sm font-medium'>{getTtl('Payment Terms', ln)}:</p>
				<div className='w-full '>
					<CBox data={settings['Payment Terms']['Payment Terms']} setValue={setValueCon} value={valueCon} name='termPmnt' classes='shadow-md' />
				</div>
			</div>

			<div className='grid grid-cols-4 gap-4 pt-3'>
				<div className='col-span-12 md:col-span-3 '>
					<div className='w-full border border-gray-200 p-3 rounded-lg bg-white shadow-sm'>
						<ProductsTable value={valueCon} setValue={setValueCon} currency={settings.Currency.Currency}
							quantityTable={settings.Quantity.Quantity} setShowPoInvModal={setShowPoInvModal}
							setShowStockModal={setShowStockModal} setToast={setToast} contractsData={contractsData}
						/>
					</div>
				</div>
				<div className='col-span-12 md:col-span-1 border border-[var(--selago)] p-3 rounded-xl bg-white shadow-sm'>
					<div className='flex gap-4 justify-between'>
						<p className='flex pt-1 text-sm font-medium whitespace-nowrap'>{getTtl('Currency', ln)}:</p>
						<div className='w-full md:w-44'>
							<CBox data={settings.Currency.Currency} setValue={setValueCon} value={valueCon} name='cur' classes='shadow-md' />
							<ErrDiv field='cur' errors={errors} ln={ln} />
						</div>
					</div>
					<div className='flex gap-4 justify-between items-center'>
						<p className='flex items-center text-sm font-medium whitespace-nowrap'>{getTtl('Quantity', ln)}:</p>
						<div className='w-full md:w-44'>
							<CBox data={settings.Quantity.Quantity} setValue={setValueCon} value={valueCon} name='qTypeTable' classes='shadow-md' />
						</div>
					</div>
					<Tltip direction='bottom' tltpText='Contracts storage'>
						<button
							type="button"
							className="blackButton mt-2" onClick={() => setShowFilesModal(true)}
							disabled={!valueCon.id}
						>
							<MdOutlineStorage className='scale-0.9' />
							{getTtl('Attachments', ln)}
						</button>
					</Tltip>
				</div>
			</div>

			<div className='grid grid-cols-4 gap-4 pt-3'>
				<div className='col-span-12 md:col-span-3 '>
					<div className='mt-3 w-full border border-[var(--selago)] p-3 rounded-xl bg-white shadow-sm'>
						<Remarks settings={settings} value={valueCon} setValue={setValueCon} />
					</div>
					<div className='mt-3 w-full border border-[var(--selago)] p-3 rounded-xl bg-white shadow-sm'>
						<PriceRemarks value={valueCon} setValue={setValueCon} />
					</div>
				</div>
				<div className='col-span-12 md:col-span-1 mt-1'>
					<p className='flex text-base text-[var(--regent-gray)] font-semibold whitespace-nowrap mb-1'>{getTtl('Comments', ln)}:</p>
					<textarea rows="5" cols="60" name="comments"
						className="input text-[16px] h-24 text-sm p-2 rounded-lg shadow-lg"
						value={valueCon.comments} onChange={handleValue} />
					<div className='flex leading-7 items-center gap-3 mt-2'>
						<CheckBox size='h-5 w-5 md:h-6 md:w-6' checked={valueCon.completed ?? false}
							onChange={() => setValueCon({ ...valueCon, completed: !valueCon.completed })} />
						<span className='text-base'>Contract completed</span>
					</div>
				</div>

			</div>



			<div className="text-lg font-semibold leading-5 text-[var(--port-gore)] p-4 pl-6 flex gap-4 flex-wrap justify-center md:justify-start ">
				<Tltip direction='top' tltpText='Save/Update contract'>
					<button
						type="button"
						className="blackButton"
						onClick={btnClck}
						disabled={isButtonDisabled}

					>
						<VscSaveAs className='scale-110' />
						{isButtonDisabled ? getTtl('saving', ln) : getTtl('save', ln)}
						{isButtonDisabled && <RiRefreshLine className='animate-spin' />}
					</button>
				</Tltip>
				<Tltip direction='top' tltpText='Close form'>
					<button
						type="button"
						className="whiteButton"
						onClick={() => setIsOpenCon(false)}
					>
						<VscClose className='scale-125' />
						{getTtl('Close', ln)}
					</button>
				</Tltip>
				<Tltip direction='top' tltpText='Create PDF document'>
					<button
						type="button"
						className="whiteButton"
						onClick={() => Pdf(valueCon,
							reOrderTableCon(valueCon.productsData).map(({ ['id']: _, ...rest }) => rest).map(obj => Object.values(obj))
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
						<FaFilePdf />
						PDF
					</button>
				</Tltip>
				{valueCon.id !== '' &&
					<Tltip direction='top' tltpText='Delete Contract'>
						<button
							type="button"
							className="whiteButton"
							onClick={() => setIsDeleteOpen(true)}
						>
							<VscArchive className='scale-110' />
							{getTtl('Delete', ln)}
						</button>
					</Tltip>
				}
				{valueCon.id !== '' && showButton &&
					<Tltip direction='top' tltpText='Duplicate Contract'>
						<button
							type="button"
							className="hidden md:flex whiteButton" onClick={() => setIsDuplicateOpen(true)}

						>
							<HiDocumentDuplicate className='scale-125' />
							{getTtl('Duplicate Contract', ln)}
						</button>
					</Tltip>
				}
				<Tltip direction='top' tltpText='Create Final Settlement Invoice'>
					<button
						type="button"
						className="hidden md:flex whiteButton" onClick={() => setShowFinalSettlmntModal(true)}

					>
						<BsTagsFill className='scale-125' />
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
		</div >


	);
};
//
export default ContractModal;
