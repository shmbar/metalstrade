'use client';
import { useContext, useEffect } from 'react';
import Customtable from './newTable';
import { TbLayoutGridAdd } from 'react-icons/tb';
import MyDetailsModal from './modals/dataModal.js'
import { SettingsContext } from "@contexts/useSettingsContext";
import { ContractsContext } from "@contexts/useContractsContext";
import { ExpensesContext } from "@contexts/useExpensesContext";
import { InvoiceContext } from "@contexts/useInvoiceContext";
import MonthSelect from '@components/monthSelect';
import Toast from '@components/toast.js'
import ModalCopyInvoice from '@components/modalCopyInvoice';

import { loadData, sortArr, getD } from '@utils/utils'
import Spinner from '@components/spinner';
import { UserAuth } from "@contexts/useAuthContext"
import Spin from '@components/spinTable';
import { EXD } from './excel'
import dateFormat from "dateformat";
import { getTtl } from '@utils/languages';

const Contracts = () => {

	const { settings, dateSelect, setDateYr, setLoading, loading, ln } = useContext(SettingsContext);
	const { valueCon, setValueCon, contractsData, isOpenCon, setIsOpenCon,
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
		{ accessorKey: 'opDate', header: getTtl('Operation Time', ln), enableSorting: false, cell: (props) => <p>{dateFormat(props.getValue(), 'dd-mmm-yy HH:MM')}</p> },
		{ accessorKey: 'lstSaved', header: getTtl('Last Saved', ln), enableSorting: false, cell: (props) => <p>{dateFormat(props.getValue(), 'dd-mmm-yy HH:MM')}</p> },
		{ accessorKey: 'order', header: getTtl('PO', ln) + '#' },
		{ accessorKey: 'date', header: getTtl('Date', ln), enableSorting: false, cell: (props) => <p>{dateFormat(props.getValue().startDate, 'dd-mmm-yy')}</p> },
		{ accessorKey: 'supplier', header: getTtl('Supplier', ln) },
		{ accessorKey: 'shpType', header: getTtl('Shipment', ln) },
		{ accessorKey: 'origin', header: getTtl('Origin', ln) },
		{ accessorKey: 'delTerm', header: getTtl('Delivery Terms', ln) },
		{ accessorKey: 'pol', header: getTtl('POL', ln) },
		{ accessorKey: 'pod', header: getTtl('POD', ln) },
		{ accessorKey: 'packing', header: getTtl('Packing', ln) },
		{ accessorKey: 'contType', header: getTtl('Container Type', ln) },
		{ accessorKey: 'size', header: getTtl('Size', ln) },
		{ accessorKey: 'deltime', header: getTtl('Delivery Time', ln), cell: (props) => <span className='text-wrap w-40 flex '>{props.getValue()}</span> },
		{ accessorKey: 'cur', header: getTtl('Currency', ln) },
		{ accessorKey: 'qTypeTable', header: getTtl('Quantity', ln) }
	];

	let invisible = ['opDate', 'lstSaved', 'shpType',
		'size', 'qTypeTable'].reduce((acc, key) => {
			acc[key] = false;
			return acc;
		}, {});


	const getFormatted = (arr) => {  //convert id's to values

		let newArr = []
		const gQ = (z, y, x) => settings[y][y].find(q => q.id === z)?.[x] || ''

		arr.forEach(row => {
			let formattedRow = {
				...row, supplier: gQ(row.supplier, 'Supplier', 'nname'),
				shpType: gQ(row.shpType, 'Shipment', 'shpType'),
				origin: gQ(row.origin, 'Origin', 'origin'),
				delTerm: gQ(row.delTerm, 'Delivery Terms', 'delTerm'),
				pol: gQ(row.pol, 'POL', 'pol'),
				pod: gQ(row.pod, 'POD', 'pod'),
				packing: gQ(row.packing, 'Packing', 'packing'),
				contType: gQ(row.contType, 'Container Type', 'contType'),
				size: gQ(row.size, 'Size', 'size'),
				deltime: gQ(row.deltime, 'Delivery Time', 'deltime'),
				cur: gQ(row.cur, 'Currency', 'cur'),
				qTypeTable: gQ(row.qTypeTable, 'Quantity', 'qTypeTable'),

			}

			newArr.push(formattedRow)
		})

		return newArr
	}


	const SelectRow = (row) => {
		setValueCon(contractsData.find(x => x.id === row.id));
		blankInvoice();
		setDateYr(row.date.startDate.substring(0, 4));
		blankExpense();
		setIsInvCreationCNFL(false);
		setIsOpenCon(true);
	};

	const addNewContract = () => {
		addContract()
		blankInvoice()
	}



	return (
		<div className="container mx-auto px-2 md:px-8 xl:px-10 pb-8 md:pb-0 mt-16 md:mt-0">
			{Object.keys(settings).length === 0 ? <Spinner /> :
				<>
					<Toast />
					<ModalCopyInvoice />
					{loading && <Spin />}
					<div className="border border-slate-200 rounded-xl p-4 mt-8 shadow-md relative">
						<div className='flex items-center justify-between flex-wrap pb-2'>
							<div className="text-3xl p-1 pb-2 text-slate-500"> {getTtl('Contracts', ln)} </div>
							<MonthSelect />
						</div>

						<Customtable data={sortArr(getFormatted(contractsData), 'order')} columns={propDefaults} SelectRow={SelectRow}
							invisible={invisible} excellReport={EXD(contractsData, settings, getTtl('Contracts', ln), ln)} />
					</div>
					<div className="text-left pt-6 ">
						<button
							type="button"
							onClick={addNewContract}
							className="text-white bg-slate-500 hover:bg-slate-400 focus:outline-none font-medium rounded-lg 
													 text-sm px-4 py-3 text-center drop-shadow-xl gap-1.5 items-center flex"
						>
							<TbLayoutGridAdd className="scale-110" />
							{getTtl('New Contract', ln)}
						</button>

					</div>

					{valueCon && <MyDetailsModal isOpen={isOpenCon} setIsOpen={setIsOpenCon}
						title={!valueCon.id ? getTtl('New Contract', ln) : `${getTtl('Contract No', ln)}: ${valueCon.order}`} />}
				</>}
		</div>
	);

};

export default Contracts;

