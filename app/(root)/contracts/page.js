'use client';
import { useContext, useEffect, useState, useCallback } from 'react';
import Customtable from './newTable';
import { TbLayoutGridAdd } from 'react-icons/tb';
import { IoAnalyticsOutline } from "react-icons/io5";
import MyDetailsModal from './modals/dataModal.js'
import { SettingsContext } from "../../../contexts/useSettingsContext";
import { ContractsContext } from "../../../contexts/useContractsContext";
import { ExpensesContext } from "../../../contexts/useExpensesContext";
import { InvoiceContext } from "../../../contexts/useInvoiceContext";
import MonthSelect from '../../../components/monthSelect';
import Toast from '../../../components/toast.js'
import ModalCopyInvoice from '../../../components/modalCopyInvoice';
import useInlineEdit from '../../../hooks/useInlineEdit';
import { loadData, sortArr, getD, saveDataSettings } from '../../../utils/utils'
import Spinner from '../../../components/spinner';
import VideoLoader from '../../../components/videoLoader';
import { UserAuth } from "../../../contexts/useAuthContext"
import Spin from '../../../components/spinTable';
import { EXD } from './excel'
import dateFormat from "dateformat";
import { getTtl } from '../../../utils/languages';
import DateRangePicker from '../../../components/dateRangePicker';
import Tooltip from '../../../components/tooltip';
import { useRouter, useSearchParams } from 'next/navigation';
import Modal from '../../../components/modal';
import DlayedResponse from './modals/delayedResponse';
import Image from 'next/image';
import Tltip from '../../../components/tlTip';
import EditableCell from '../../../components/table/inlineEditing/EditableCell';
import EditableSelectCell from '../../../components/table/inlineEditing/EditableSelectCell';
import { updateContractField } from '../../../utils/utils';
import { useGlobalSearch } from '../../../contexts/useGlobalSearchContext';

const Contracts = () => {

	const { settings, dateSelect, setDateYr, setLoading, loading, ln, compData, updateCompanyData } = useContext(SettingsContext);
	const { valueCon, setValueCon, contractsData, isOpenCon, setIsOpenCon,
		addContract, setContractsData } = useContext(ContractsContext);
	const { blankInvoice, setIsInvCreationCNFL } = useContext(InvoiceContext);
	const { blankExpense } = useContext(ExpensesContext);
	const { uidCollection } = UserAuth();
	const router = useRouter();
	const searchParams = useSearchParams();
	const [alertArr, setAlertArr] = useState([]);
	const [openAlert, setOpenAlert] = useState(true)
	const [filteredData, setFilteredData] = useState([])
	const [highlightId, setHighlightId] = useState(null)
	const { upsertSourceItems } = useGlobalSearch();

	// Inline editing hook
	//	const { updateField } = useInlineEdit('contracts', setContractsData);

	// Handle inline cell save
	// const handleCellSave = useCallback(async (rowData, field, value) => {
	// 	const originalItem = contractsData.find(c => c.id === rowData.id);
	// 	if (originalItem) {
	// 		await updateField(originalItem, field, value);
	// 	}
	// }, [contractsData, updateField]);

	// Handle openId from URL (from shipment page or global search) - highlight row and open modal
	useEffect(() => {
		const openId = searchParams.get('openId');
		if (openId && contractsData.length > 0) {
			const item = contractsData.find(c => c.id === openId);
			if (item) {
				setHighlightId(openId);
				setTimeout(() => setHighlightId(null), 3000);
				SelectRow(item);
				router.replace('/contracts', { scroll: false });
			}
		}
	}, [searchParams, contractsData]);


	useEffect(() => {
		const Load = async () => {
			setLoading(true)
			let dt = await loadData(uidCollection, 'contracts', dateSelect);

			setContractsData(dt)
			setFilteredData(dt)

			// Alert Logic
			let invArr = []
			let tmpArr = dt.filter(z => z.poInvoices.length === 0)
			tmpArr.forEach(z => {
				let date1 = z.dateRange?.endDate;
				if (!date1) return;

				const date = new Date(date1);
				date.setDate(date.getDate() + 14);
				const today = new Date();

				if (date < today) {
					if (z.alert !== undefined && z.alert) {
						invArr.push(z);
					} else if (z.alert === undefined) {
						invArr.push({ ...z, alert: true });
					}
				}
			})

			setOpenAlert(true)
			setAlertArr(invArr)
			setLoading(false)
		}

		if (!uidCollection) return;
		Load();
		
	}, [dateSelect, uidCollection])

	useEffect(() => {
		if (!contractsData || !contractsData.length || Object.keys(settings).length === 0) {
			upsertSourceItems('contracts', []);
			return;
		}

		const items = contractsData.map(c => ({
			key: `contract_${c.id}`,
			route: '/contracts',
			rowId: c.id,
			title: `Contract • PO ${c.order || ''}`,
			subtitle: `${gQ(c.supplier, 'Supplier', 'nname') || ''} • ${c.pol || ''}-${c.pod || ''}`,
			searchText: [
				c.order,
				gQ(c.supplier, 'Supplier', 'nname'),
				c.pol,
				c.pod,
				c.packing,
				c.contType,
				c.size,
			].filter(Boolean).join(' ')
		}));

		upsertSourceItems('contracts', items);
	}, [contractsData, settings]);

	const gQ = (z, y, x) => settings[y][y].find(q => q.id === z)?.[x] || ''

	const showQTY = (x) => {
		return x.row.original.productsData.length !== 0 ? new Intl.NumberFormat('en-US', {
			minimumFractionDigits: 1
		}).format(x.row.original.productsData.reduce((sum, item) => sum + parseInt(item.qnty, 10), 0)) +
			' ' + gQ(x.row.original.qTypeTable, 'Quantity', 'qTypeTable') : '-'
	}

	let propDefaults = Object.keys(settings).length === 0 ? [] : [
		{ accessorKey: 'opDate', header: getTtl('Operation Time', ln), cell: (props) => <p>{dateFormat(props.getValue(), 'dd.mm.yy - HH:MM')}</p>, meta: { excludeFromQuickSum: true } },
		{ accessorKey: 'lstSaved', header: getTtl('Last Saved', ln), cell: (props) => <p>{dateFormat(props.getValue(), 'dd-mmm-yy HH:MM')}</p>, meta: { excludeFromQuickSum: true } },
		{ accessorKey: 'order', header: getTtl('PO', ln) + '#', meta: { excludeFromQuickSum: true } },
		{
			accessorKey: 'date', header: getTtl('Date', ln), cell: (props) => <p>{dateFormat(props.getValue(), 'dd.mm.yy')}</p>,
			meta: { filterVariant: 'dates' },
			filterFn: 'dateBetweenFilterFn'
		},
		{
			accessorKey: 'supplier',
			header: getTtl('Supplier', ln),
			cell: EditableSelectCell,
			meta: {
				filterVariant: 'selectSupplier',
				options: (settings.Supplier?.Supplier ?? [])
					.filter(s => !s.deleted)
					.sort((a, b) => (a.nname || '').localeCompare(b.nname || ''))
					.map(s => ({ value: s.id, label: s.nname }))
			}
		},
		{
			accessorKey: 'originSupplier',
			header: 'Original supplier',
			cell: EditableSelectCell,
			meta: {
				options: (settings.Supplier?.Supplier ?? [])
					.filter(s => !s.deleted)
					.sort((a, b) => (a.nname || '').localeCompare(b.nname || ''))
					.map(s => ({ value: s.id, label: s.nname }))
			}
		},
		{
			accessorKey: 'shpType',
			header: getTtl('Shipment', ln),
			cell: EditableSelectCell,
			meta: {
				options: settings.Shipment?.Shipment?.map(s => ({
					value: s.id,
					label: s.shpType
				})) ?? []
			}
		},
		{
			accessorKey: 'origin',
			header: getTtl('Origin', ln),
			cell: EditableSelectCell,
			meta: {
				options: settings.Origin?.Origin?.map(o => ({
					value: o.id,
					label: o.origin
				})) ?? []
			}
		},
		{
			accessorKey: 'delTerm',
			header: getTtl('Delivery Terms', ln),
			cell: EditableSelectCell,
			meta: {
				options: settings['Delivery Terms']?.['Delivery Terms']?.map(d => ({
					value: d.id,
					label: d.delTerm
				})) ?? []
			}
		},
		{
			accessorKey: 'pol', header: getTtl('POL', ln),
			cell: EditableSelectCell,
			meta: { options: settings.POL?.POL?.map(p => ({ value: p.id, label: p.pol })) ?? [] }
		},
		{
			accessorKey: 'pod', header: getTtl('POD', ln),
			cell: EditableSelectCell,
			meta: { options: settings.POD?.POD?.map(p => ({ value: p.id, label: p.pod })) ?? [] }
		},
		{
			accessorKey: 'packing', header: getTtl('Packing', ln),
			cell: EditableSelectCell,
			meta: { options: settings.Packing?.Packing?.map(p => ({ value: p.id, label: p.packing })) ?? [] }
		},
		{
			accessorKey: 'contType', header: getTtl('Container Type', ln),
			cell: EditableSelectCell,
			meta: { options: settings['Container Type']?.['Container Type']?.map(c => ({ value: c.id, label: c.contType })) ?? [] }
		},
		{
			accessorKey: 'size', header: getTtl('Size', ln),
			cell: EditableSelectCell,
			meta: { options: settings.Size?.Size?.map(s => ({ value: s.id, label: s.size })) ?? [] }
		},
		{
			accessorKey: 'deltime', header: getTtl('Delivery Time', ln),
			size: 110, minSize: 90, maxSize: 130,
			cell: EditableSelectCell,
			meta: { options: settings['Delivery Time']?.['Delivery Time']?.map(d => ({ value: d.id, label: d.deltime })) ?? [] }
		},
		{
			accessorKey: 'cur',
			header: getTtl('Currency', ln),
			cell: (props) => <span>{gQ(props.getValue(), 'Currency', 'cur')}</span>,
			meta: { excludeFromQuickSum: true }
		},
		{ accessorKey: 'qTypeTable', header: getTtl('QTY', ln), cell: (props) => <span>{showQTY(props)}</span> },
		{
			accessorKey: 'completed', header: 'Completed',
			cell: (props) => <span>{props.getValue() ? <Image
				src="/check.png"
				width={18}
				height={18}
				alt="True"
			/> : <Image
				src="/close.png"
				width={18}
				height={18}
				alt="False"
			/>}</span>,
			enableColumnFilter: false
		},
	];

	let invisible = ['opDate', 'lstSaved', 'shpType', 'originSupplier',
		'size', 'qTypeTable', 'cur'].reduce((acc, key) => {
			acc[key] = false;
			return acc;
		}, {});

	const SelectRow = (row) => {
		let itm = contractsData.find(x => x.id === row.id)
		itm = itm.finalSRemarks == null ? { ...itm, finalSRemarks: [] } : itm

		setValueCon(itm);
		blankInvoice();
		setDateYr(row.dateRange?.startDate?.substring(0, 4));
		blankExpense();
		setIsInvCreationCNFL(false);
		setIsOpenCon(true);
	};

	const addNewContract = () => {
		addContract()
		blankInvoice()
	}

	const onCellUpdate = async ({ rowIndex, columnId, value }) => {
		const row = contractsData[rowIndex];
		if (!row?.id) return;

		// Do not allow editing completed contracts
		if (row.completed) return;

		const prev = contractsData;
		const next = prev.map((x, i) =>
			i === rowIndex ? { ...x, [columnId]: value } : x
		);
		setContractsData(next);

		try {
			await updateContractField(
				uidCollection,
				row.id,
				row.dateRange?.startDate ?? row.date,
				{ [columnId]: value }
			);
		} catch (e) {
			console.error(e);
			setContractsData(prev);
		}
	};

	return (
		<div className="w-full " style={{ background: "#f8fbff" }}>
			<div className="mx-auto w-full max-w-full px-1 md:px-2 pb-4 mt-[72px]">
				{Object.keys(settings).length === 0 ? <VideoLoader loading={true} fullScreen={true} /> :
					<>
						<Toast />
						<ModalCopyInvoice />

						{/* Main Card */}
						<div className="rounded-2xl p-3 sm:p-5 mt-8 border border-[#b8ddf8] w-full bg-[#f8fbff]">

							{/* Header Section */}
							<div className='flex items-center justify-between flex-wrap gap-2 pb-2'>
								<h1 className="text-[var(--chathams-blue)] responsiveTextTitle font-medium border-l-4 border-[var(--chathams-blue)] pl-2">
									{getTtl('Contracts', ln)}
								</h1>

								{/* <div className='flex items-center gap-2 group'>
								<div className="relative">
									<DateRangePicker />
								</div>
								<Tooltip txt='Select Dates Range' />
							</div> */}
							</div>

							{/* Table Component */}

							<Customtable
								data={contractsData.sort((a, b) => b.date.localeCompare(a.date))}
								columns={propDefaults}
								SelectRow={SelectRow}
								invisible={invisible}
								excellReport={EXD(contractsData.filter(x => filteredData.map(z => z.id).includes(x.id)),
									settings, getTtl('Contracts', ln), ln)}
								setFilteredData={setFilteredData}
								highlightId={highlightId}
								onCellUpdate={onCellUpdate}
								extraActions={
									<>
										<Tltip direction='bottom' tltpText='Create new Contract'>
											<button
												type="button"
												onClick={addNewContract}
												className="whiteButton whitespace-nowrap"

											>
												<TbLayoutGridAdd className="w-3.5 h-3.5 flex-shrink-0" />
												<span>{getTtl('New Contract', ln)}</span>
											</button>
										</Tltip>
										<Tltip direction='bottom' tltpText='Quantities analysis report'>
											<button
												type="button"
												onClick={() => router.push('/analysis')}
												className="whiteButton whitespace-nowrap"

											>
												<IoAnalyticsOutline className="w-3.5 h-3.5 flex-shrink-0" />
												<span>{getTtl('Weight Analysis', ln)}</span>
											</button>
										</Tltip>
									</>
								}
							/>
						</div>

						{/* Alert Section */}
						{alertArr.length > 0 && (
							<div className='mt-4 px-2 sm:px-3'>
								<div className="responsiveText font-medium border border-[#b8ddf8] p-4 rounded-2xl shadow-sm bg-white w-full max-w-2xl">
									<div style={{ color: 'var(--chathams-blue)' }}>
										<span className='responsiveText border-l-4 border-[var(--chathams-blue)] pl-2'>Notification for delayed response</span>
										<DlayedResponse alertArr={alertArr} setAlertArr={setAlertArr} />
									</div>
								</div>
							</div>
						)}

						{/* Modals */}
						{valueCon && (
							<MyDetailsModal
								isOpen={isOpenCon}
								setIsOpen={setIsOpenCon}
								title={!valueCon.id ? getTtl('New Contract', ln) : `${getTtl('Contract No', ln)}: ${valueCon.order}`}
							/>
						)}

						{alertArr.length > 0 && (
							<Modal
								isOpen={openAlert}
								setIsOpen={setOpenAlert}
								title='Notification for delayed response'
								w='max-w-2xl'
							>
								<DlayedResponse alertArr={alertArr} setAlertArr={setAlertArr} />
							</Modal>
						)}
					</>
				}
			</div>
		</div>
	);
};

export default Contracts;