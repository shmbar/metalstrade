'use client'
import { useContext, useEffect, useState } from 'react'
import { SettingsContext } from "@contexts/useSettingsContext";
import { ContractsContext } from "@contexts/useContractsContext";
import CBox from '@components/combobox.js'
import { getD } from '@utils/utils.js';
import Datepicker from "react-tailwindcss-datepicker";
import { Pdf } from './pdfContract.js';
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
import ModalToDelete from '@components/modalToProceed';
import { validate, ErrDiv, reOrderTableCon } from '@utils/utils'
import { UserAuth } from "@contexts/useAuthContext";
import FilesModal from './filesModal.js'
import PoInvModal from './poInvModal.js'
import WhModal from './whModal.js'
import { MdClear } from 'react-icons/md';

const ContractModal = () => {

	const { settings, compData, setToast } = useContext(SettingsContext);
	const { valueCon, setValueCon, saveData, delContract, setIsOpen,
		errors, setErrors, duplicate, contractsData } = useContext(ContractsContext);
	const sups = settings.Supplier.Supplier;
	const supplier = valueCon.supplier && sups.find(z => z.id === valueCon.supplier);
	const [isDeleteOpen, setIsDeleteOpen] = useState(false)
	const [isDuplicateOpen, setIsDuplicateOpen] = useState(false)
	const { uidCollection } = UserAuth();
	const [isButtonDisabled, setIsButtonDisabled] = useState(false);
	const [showFilesModal, setShowFilesModal] = useState(false)
	const [showPoInvModal, setShowPoInvModal] = useState(false)
	const [showStockModal, setShowStockModal] = useState(false)
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
		setValueCon({ ...valueCon, date: newValue })
	}

	const btnClck = () => {
		if (!isButtonDisabled) {
			setIsButtonDisabled(true);
			saveData(uidCollection)

			setTimeout(() => {
				setIsButtonDisabled(false);
			}, 3000); // Adjust the delay as needed
		}
	}

	const caneclEditText=()=>{
		setValueCon({ ...valueCon, 'isDeltimeText': false, 'deltime': '' })
	}

	return (
		<div className="px-1">

			<div className='grid grid-cols-6 gap-3 pt-1'>
				<div className='col-span-12 md:col-span-3 border border-slate-300 p-2 rounded-lg'>
					<div className='flex gap-4 justify-between'>
						<p className='flex pt-1 text-sm font-medium'>Supplier Name:</p>
						<div className='w-72'>
							<CBox data={sups} setValue={setValueCon} value={valueCon} name='supplier' classes='shadow-md' />
							<ErrDiv field='supplier' errors={errors} />
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
				</div>
				<div className='hidden md:flex md:col-span-1 border border-slate-300 p-2 rounded-lg'>

				</div>
				<div className='col-span-12 md:col-span-2 border border-slate-300 p-2 rounded-lg'>
					<p className='flex items-center text-sm font-medium'>Purchase Order No:</p>
					<div className='w-full md:w-48 '>
						<input className="input text-[15px] shadow-lg h-9" name='order' value={valueCon.order} onChange={handleValue} />
						<ErrDiv field='order' errors={errors} />
					</div>
					<p className='flex items-center text-sm mt-3 font-medium'>Date:</p>
					<div className='w-full md:w-48 '>
						<Datepicker useRange={false}
							asSingle={true}
							value={valueCon.date}
							popoverDirection='down'
							onChange={handleDateChange}
							displayFormat={"DD-MMM-YYYY"}
							inputClassName='input w-full text-[15px] shadow-lg h-9'
						/>
						<ErrDiv field='date' errors={errors} />
					</div>
				</div>
			</div>
			<div className='grid grid-cols-3 gap-3 pt-2'>
				<div className='col-span-12 md:col-span-1 border border-slate-300 p-2 rounded-lg'>
					<div className='flex gap-4 justify-between'>
						<p className='flex pt-1 text-sm font-medium whitespace-nowrap'>Shipment:</p>
						<div className='w-full md:w-44'>
							<CBox data={settings.Shipment.Shipment} setValue={setValueCon} value={valueCon} name='shpType' classes='shadow-md' />
							<ErrDiv field='shpType' errors={errors} />
						</div>
					</div>
					<div className='flex gap-4 justify-between'>
						<p className='flex items-center text-sm font-medium whitespace-nowrap'>Origin:</p>
						<div className='w-full md:w-44'>
							<CBox data={settings.Origin.Origin} setValue={setValueCon} value={valueCon} name='origin' classes='shadow-md' />
						</div>
					</div>
					<div className='flex gap-4 justify-between'>
						<p className='flex items-center text-sm font-medium whitespace-nowrap'>Delivery Terms:</p>
						<div className='w-full md:w-44'>
							<CBox data={settings['Delivery Terms']['Delivery Terms']} setValue={setValueCon} value={valueCon} name='delTerm' classes='shadow-md' />
						</div>
					</div>
				</div>

				<div className='col-span-12 md:col-span-1 border border-slate-300 p-2 rounded-lg'>
					<div className='flex gap-4 justify-between'>
						<p className='flex items-center text-sm font-medium whitespace-nowrap'>POL:</p>
						<div className='w-full md:w-44'>
							<CBox data={settings.POL.POL} setValue={setValueCon} value={valueCon} name='pol' classes='shadow-md' />
						</div>
					</div>
					<div className='flex gap-4 justify-between'>
						<p className='flex items-center text-sm font-medium whitespace-nowrap'>POD:</p>
						<div className='w-full md:w-44'>
							<CBox data={settings.POD.POD} setValue={setValueCon} value={valueCon} name='pod' classes='shadow-md'
								disabled={firstRule}
							/>
						</div>
					</div>
					<div className='flex gap-4 justify-between'>
						<p className='flex items-center text-sm font-medium whitespace-nowrap'>Packing:</p>
						<div className='w-full md:w-44'>
							<CBox data={settings.Packing.Packing} setValue={setValueCon} value={valueCon} name='packing' classes='shadow-md' />
						</div>
					</div>
				</div>

				<div className='col-span-12 md:col-span-1 border border-slate-300 p-2 rounded-lg'>
					<div className='flex gap-4 justify-between'>
						<p className='flex items-center text-sm font-medium whitespace-nowrap'>Container Type:</p>
						<div className='w-full md:w-44'>
							<CBox data={settings['Container Type']['Container Type']} setValue={setValueCon} value={valueCon} name='contType' classes='shadow-md'
								disabled={secondRule} />
						</div>
					</div>
					<div className='flex gap-4 justify-between'>
						<p className='flex items-center text-sm font-medium whitespace-nowrap'>Size:</p>
						<div className='w-full md:w-44'>
							<CBox data={settings.Size.Size} setValue={setValueCon} value={valueCon} name='size' classes='shadow-md' />
						</div>
					</div>
					<div className='flex gap-4 justify-between'>
						<p className='flex items-center text-sm font-medium whitespace-nowrap'>Delivery Time:</p>
						{!valueCon.isDeltimeText ?
							<div className='w-full md:w-44'>
								<CBox data={[...settings['Delivery Time']['Delivery Time'], { deltime: '..Edit Text', id: 'EditTextDelTime' }]} setValue={setValueCon} value={valueCon} name='deltime' classes='shadow-md' />
							</div>
							:
							<div className='flex pt-1 left-5 relative w-7/12'>
								<input type='text' className="input text-[15px] shadow-lg h-[1.86rem] text-xs w-full rounded-lg" name='deltime'
									value={valueCon.deltime} onChange={handleValue}	 />
								<button className='relative right-6 '>
									<MdClear className="h-5 w-5 text-gray-300  hover:text-gray-500"
									onClick={caneclEditText} />
								</button>
							</div>
						}
					</div>
				</div>
			</div>

			<div className='mt-2 w-full border border-slate-300 p-2 rounded-lg'>
				<p className='flex items-center text-sm font-medium'>Payment Terms:</p>
				<div className='w-full '>
					<CBox data={settings['Payment Terms']['Payment Terms']} setValue={setValueCon} value={valueCon} name='termPmnt' classes='shadow-md' />
				</div>
			</div>

			<div className='grid grid-cols-4 gap-3 pt-2'>
				<div className='col-span-12 md:col-span-3 '>
					<div className='w-full border border-slate-300 p-2 rounded-lg'>
						<ProductsTable value={valueCon} setValue={setValueCon} currency={settings.Currency.Currency}
							quantityTable={settings.Quantity.Quantity} setShowPoInvModal={setShowPoInvModal}
							setShowStockModal={setShowStockModal} setToast={setToast} contractsData={contractsData}
						/>
					</div>
				</div>
				<div className='col-span-12 md:col-span-1 border border-slate-300 p-2 rounded-lg'>
					<div className='flex gap-4 justify-between'>
						<p className='flex pt-1 text-sm font-medium whitespace-nowrap'>Currency:</p>
						<div className='w-full md:w-44'>
							<CBox data={settings.Currency.Currency} setValue={setValueCon} value={valueCon} name='cur' classes='shadow-md' />
							<ErrDiv field='cur' errors={errors} />
						</div>
					</div>
					<div className='flex gap-4 justify-between'>
						<p className='flex items-center text-sm font-medium whitespace-nowrap'>Quantity:</p>
						<div className='w-full md:w-44'>
							<CBox data={settings.Quantity.Quantity} setValue={setValueCon} value={valueCon} name='qTypeTable' classes='shadow-md' />
						</div>
					</div>

					<button
						type="button"
						className="mt-2 flex items-center gap-1 justify-center rounded-md border bg-slate-200 px-3 py-1 text-sm font-medium 
						text-blue-900 hover:bg-slate-300 focus:outline-none drop-shadow-lg" onClick={() => setShowFilesModal(true)}
						disabled={!valueCon.id}
					>
						<MdOutlineStorage className='scale-0.9' />
						Attachments
					</button>
				</div>
			</div>

			<div className='grid grid-cols-4 gap-3 pt-2'>
				<div className='col-span-12 md:col-span-3 '>
					<div className='mt-2 w-full border border-slate-300 p-2 rounded-lg'>
						<Remarks settings={settings} value={valueCon} setValue={setValueCon} />
					</div>
					<div className='mt-2 w-full border border-slate-300 p-2 rounded-lg'>
						<PriceRemarks value={valueCon} setValue={setValueCon} />
					</div>
				</div>
				<div className='col-span-12 md:col-span-1 mt-1'>
					<p className='flex text-xs text-slate-600 font-medium whitespace-nowrap'>Comments:</p>
					<textarea rows="5" cols="60" name="comments"
						className="input text-[15px] h-24 text-xs p-1"
						value={valueCon.comments} onChange={handleValue} />
				</div>

			</div>



			<div className="text-lg font-medium leading-5 text-gray-900 p-3 pl-6 flex gap-4 flex-wrap justify-center md:justify-start ">
				<button
					type="button"
					className="flex items-center gap-2 justify-center rounded-md border bg-green-100 px-3 py-2 text-sm font-medium 
						text-blue-900 hover:bg-green-300 focus:outline-none drop-shadow-lg"
					onClick={btnClck}
					disabled={isButtonDisabled}
				>
					<VscSaveAs className='scale-110' />
					Save
				</button>
				<button
					type="button"
					className="flex items-center gap-2 justify-center rounded-md border bg-red-100 px-3 py-2 text-sm font-medium 
						text-blue-900 hover:bg-red-300 focus:outline-none drop-shadow-lg"
					onClick={() => setIsOpen(false)}
				>
					<VscClose className='scale-125' />
					Close
				</button>
				<button
					type="button"
					className="flex items-center gap-2 justify-center rounded-md border bg-blue-100 px-3 py-2 text-sm font-medium 
						text-blue-900 hover:bg-blue-300 focus:outline-none drop-shadow-lg"
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
						, settings, compData)}
				>
					<FaFilePdf />
					PDF
				</button>
				{valueCon.id !== '' &&
					<button
						type="button"
						className="flex items-center gap-2 justify-center rounded-md border bg-orange-100 px-3 py-2 text-sm font-medium 
						text-blue-900 hover:bg-orange-300 focus:outline-none drop-shadow-lg"
						onClick={() => setIsDeleteOpen(true)}
					>
						<VscArchive className='scale-110' />
						Delete Contract
					</button>}
				{valueCon.id !== '' && showButton &&
					<button
						type="button"
						className="hidden md:flex items-center gap-2 justify-center rounded-md border bg-slate-200 px-3 py-2 text-sm font-medium 
						text-blue-900 hover:bg-slate-300 focus:outline-none drop-shadow-lg" onClick={() => setIsDuplicateOpen(true)}

					>
						<HiDocumentDuplicate className='scale-125' />
						Duplicate Contract
					</button>
				}
			</div>
			<ModalToDelete isDeleteOpen={isDeleteOpen} setIsDeleteOpen={setIsDeleteOpen}
				ttl='Delete Confirmation' txt='Deleting this contract is irreversible. Please confirm to proceed.'
				doAction={() => delContract(uidCollection)} />
			<ModalToDelete isDeleteOpen={isDuplicateOpen} setIsDeleteOpen={setIsDuplicateOpen}
				ttl='Duplication' txt='To duplicate the existed contract please confirm to proceed.'
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
		</div >


	);
};
//
export default ContractModal;