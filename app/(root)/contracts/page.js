'use client';
import { useContext, useEffect } from 'react';
import Customtable from './table';
import { TbLayoutGridAdd } from 'react-icons/tb';
import MyDetailsModal from './modals/dataModal.js'
import { SettingsContext } from "@contexts/useSettingsContext";
import { ContractsContext } from "@contexts/useContractsContext";
import { ExpensesContext } from "@contexts/useExpensesContext";
import { InvoiceContext } from "@contexts/useInvoiceContext";
import MonthSelect from '@components/monthSelect';
import Toast from '@components/toast.js'
import ModalCopyInvoice from '@components/modalCopyInvoice';

import { loadData , getD} from '@utils/utils'
import SignOut from '@components/signOut';
import Spinner from '@components/spinner';
import { UserAuth } from "@contexts/useAuthContext"
import Spin from '@components/spinTable';
import {EXD} from './excel'

const Contracts = () => {

	const { settings, lastAction, dateSelect, setDateYr, setLoading, loading } = useContext(SettingsContext);
	const { valueCon, setValueCon, contractsData, isOpen, setIsOpen,
		addContract, setContractsData } = useContext(ContractsContext);
	const { blankInvoice, setIsInvCreationCNFL } = useContext(InvoiceContext);
	const { blankExpense } = useContext(ExpensesContext);
	const { uidCollection } = UserAuth();

	useEffect(() => {

		const Load = async () => {
			setLoading(true)
			let dt = await loadData(uidCollection, 'contracts', dateSelect);

			setContractsData(dt)
			setLoading(false)
		}

		Load();
	}, [dateSelect])

	let propDefaults = Object.keys(settings).length === 0 ? [] : [
		{ field: 'opDate', header: 'Operation Time', showcol: true },
		{ field: 'lstSaved', header: 'Last Saved', showcol: false },
		{ field: 'order', header: 'PO#', showcol: true },
		{ field: 'date', header: 'Date', showcol: true },
		{ field: 'supplier', header: 'Supplier', showcol: true, arr: settings.Supplier.Supplier },
		{ field: 'shpType', header: 'Shipment', showcol: false, arr: settings.Shipment.Shipment },
		{ field: 'origin', header: 'Origin', showcol: true, arr: settings.Origin.Origin },
		{ field: 'delTerm', header: 'Delivery Terms', showcol: false, arr: settings['Delivery Terms']['Delivery Terms'] },
		{ field: 'pol', header: 'POL', showcol: true, arr: settings.POL.POL },
		{ field: 'pod', header: 'POD', showcol: true, arr: settings.POD.POD },
		{ field: 'packing', header: 'Packing', showcol: false, arr: settings.Packing.Packing },
		{ field: 'contType', header: 'Container Type', showcol: false, arr: settings['Container Type']['Container Type'] },
		{ field: 'size', header: 'Size', showcol: false, arr: settings.Size.Size },
		{ field: 'deltime', header: 'Delivery Time', showcol: true, arr: settings['Delivery Time']['Delivery Time'] },
		{ field: 'cur', header: 'Currency', showcol: true, arr: settings.Currency.Currency },
		{ field: 'qTypeTable', header: 'Quantity', showcol: false, arr: settings.Quantity.Quantity }
	];

	const SelectRow = (row) => {

		setValueCon(row);
		blankInvoice();
		setDateYr(row.date.startDate.substring(0, 4));
		blankExpense();
		setIsInvCreationCNFL(false);
		setIsOpen(true);
	};

	const addNewContract = () => {
		addContract()
		blankInvoice()
	}

	return (
		<div className="lg:container mx-auto px-2 md:px-8 xl:px-10 pb-8 md:pb-0">
			{Object.keys(settings).length === 0 ? <Spinner /> :
				<>
					<SignOut />
					<Toast />
					<ModalCopyInvoice />
					{loading && <Spin />}
					<div className="border border-slate-200 rounded-xl p-4 mt-8 shadow-md relative">
						<div className='flex items-center justify-between flex-wrap pb-2'>
							<div className="text-3xl p-1 pb-2 text-slate-500">Contracts</div>
							<MonthSelect />
						</div>

						<Customtable data={contractsData} propDefaults={propDefaults} SelectRow={SelectRow}
							lastAction={lastAction} name='Contracts'
							excellReport={EXD(contractsData, getD, settings, 'Contracts')} />
					</div>
					<div className="text-left pt-6 ">
						<button
							type="button"
							onClick={addNewContract}
							className="text-white bg-slate-500 hover:bg-slate-400 focus:outline-none font-medium rounded-lg 
													 text-sm px-4 py-3 text-center drop-shadow-xl gap-1.5 items-center flex"
						>
							<TbLayoutGridAdd className="scale-110" />
							New Contract
						</button>
				
					</div>

					{valueCon && <MyDetailsModal isOpen={isOpen} setIsOpen={setIsOpen}
						title={!valueCon.id ? 'New Contract' : `Contract No: ${valueCon.order}`} />}
				</>}
		</div>
	);

};

export default Contracts;

