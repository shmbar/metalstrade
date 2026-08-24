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
	getD, loadInvoice, filteredArray, loadData
} from '@utils/utils'
import Expenses from './expenses'
import Payments from './payments.js'
import { UserAuth } from "@contexts/useAuthContext";
import Spinner from '@components/spinner.js';
import Remarks from './remarks.js';
import AnnexVII from './annexVII.js';
import ISF from './isf.js';
import { usePathname } from 'next/navigation';
import { getTtl } from '@utils/languages.js';
import Tltip from '@components/tlTip.js';
import { Selector } from '@components/selectors/selectShad.js';
import DocumentImportOverlay from '@components/DocumentImportOverlay';
import Modal from '@components/modal';
import ActivityLog from '@components/ActivityLog';
import CommentThread from '@components/CommentThread';
import { X, Save, Eraser, FileText, FileUp, Trash, PanelTopOpen, Banknote, Copy, ClipboardCheck, ChevronDown, ChevronUp, ScrollText, History, MessageSquare } from "lucide-react";
import LoadingButton from '../../../../components/LoadingButton'
import { invoiceQtyBySalesContract, salesContractIdsOf, withSalesContractLabels } from '@utils/salesLink';
import SalesSplitSummary from '@components/invoices/SalesSplitSummary';

// Settings-style form spec (shared with the standalone Invoices modal)
const labelCls = 'responsiveText font-medium text-[var(--ink-muted)] mb-1';
const panelCls = 'border border-[var(--line)] rounded-2xl bg-[var(--bg-card)] p-3';
const panelTtl = 'responsiveTextTitle font-semibold mb-3 text-[var(--ink)] font-display';


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
	const { uidCollection, gisAccount, logActivity } = UserAuth();
	const { blankExpense } = useContext(ExpensesContext);
	const [isSelectedInv, setIsSelectedInv] = useState(true)
	const [isButtonDisabled, setIsButtonDisabled] = useState(false);
	const pathName = usePathname();
	const [certOpen, setCertOpen] = useState(false)
	const [docsOpen, setDocsOpen] = useState(false)
	const [showDocImport, setShowDocImport] = useState(false)
	const [showHistory, setShowHistory] = useState(false)
	const [showComments, setShowComments] = useState(false)

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
				...inv, invType: valueInv.invType, expenses: [], completed: false, payments: [], id: '', invoice: inv.invoice,
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
				result && logActivity({
					type: 'invoice.saved', entityType: 'invoice', entityId: valueInv.id || '',
					entityLabel: `Invoice #${valueInv.invoice ?? ''}`, action: 'saved',
					message: `Invoice #${valueInv.invoice ?? ''} saved` + (valueCon?.order ? ` (PO ${valueCon.order})` : ''),
				})
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

	// ── Sales-contract link ──────────────────────────────────────────────────
	// Linking an invoice to a client's Sales Contract (clientContractNo → salesContractId)
	// is what marks that sales contract as shipped. The same control exists on the standalone
	// Invoices page; mirrored here so invoices made from the PO also update the sales contract.
	const [salesContracts, setSalesContracts] = useState([]);
	// Invoiced (shipped) qty per sales-contract id, from other linked invoices —
	// used to hide fully shipped POs from the link dropdown.
	const [shippedBySc, setShippedBySc] = useState({});
	useEffect(() => {
		const load = async () => {
			if (!uidCollection) return;
			const yr = parseInt(String(valueInv.dateRange?.startDate || valueInv.date || '').substring(0, 4));
			const y = isNaN(yr) ? new Date().getFullYear() : yr;
			setSalesContracts(await loadData(uidCollection, 'salescontracts', { start: `${y - 1}-01-01`, end: `${y + 1}-12-31` }));

			const invs = await loadData(uidCollection, 'invoices', { start: `${y - 1}-01-01`, end: `${y + 1}-12-31` });
			// Per LINE — see the matching note in invoices/modals/invoiceDetails.js.
			const map = {};
			(invs || [])
				.filter(i => i && !i.canceled && i.id !== valueInv.id)
				.forEach(i => {
					const byScTmp = invoiceQtyBySalesContract(i);
					for (const scId of Object.keys(byScTmp)) {
						map[scId] = (map[scId] || 0) + byScTmp[scId];
					}
				});
			setShippedBySc(map);
		};
		load();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [uidCollection, valueInv.id]);

	const normalizeNo = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
	// Guard: only real, non-empty ids — a Radix <Select.Item value=""> throws and white-screens
	// the whole app, which can happen if a sales contract is malformed/half-deleted.
	// Same-client contracts FIRST, but the rest stay pickable: hard-filtering by client id
	// made a sales contract invisible whenever its client didn't exactly match the invoice's
	// (duplicate client entries, or an AI import with no matched client).
	const scAll = (Array.isArray(salesContracts) ? salesContracts : [])
		.filter(sc => sc && sc.id)
		.map(sc => ({ ...sc, contractNo: sc.contractNo || '(no number)' }));
	// The dropdown hides fully shipped POs and other buyers' POs (the unfiltered
	// list was growing into a mess) — with escape hatches so nothing needed is ever
	// invisible: contracts with NO client recorded stay (AI imports), the currently
	// linked contract always stays, and if the client filter would empty the list we
	// fall back to every unshipped contract.
	const scQty = (sc) => (sc.productsData || []).reduce((s, r) => s + (parseFloat(r.qnty) || 0), 0);
	const fullyShipped = (sc) => { const q = scQty(sc); return q > 0 && (shippedBySc[sc.id] || 0) >= q - 0.0001; };
	const notShipped = scAll.filter(sc => !fullyShipped(sc) || sc.id === valueInv.salesContractId);
	let scOptions;
	if (!valueInv.client) {
		scOptions = notShipped;
	} else {
		const mine = notShipped.filter(sc => !sc.client || sc.client === valueInv.client || sc.id === valueInv.salesContractId);
		scOptions = mine.length ? mine : notShipped;
	}
	// Options for the PER-LINE Sales PO picker — see the matching note in
	// invoices/modals/invoiceDetails.js.
	const scLineOptions = withSalesContractLabels([
		...scOptions,
		...salesContractIdsOf(valueInv)
			.filter(id => !scOptions.some(o => o.id === id))
			.map(id => scAll.find(sc => sc.id === id))
			.filter(Boolean),
	], settings.Client?.Client ?? []);
	// Header picker gets the same "number · buyer" labels — see the note in
	// invoices/modals/invoiceDetails.js.
	const scOptionsLabelled = withSalesContractLabels(scOptions, settings.Client?.Client ?? []);
	const autoMatchSalesContract = (typed) => {
		const target = normalizeNo(typed);
		if (!target) return '';
		const pool = salesContracts.filter(sc => !valueInv.client || sc.client === valueInv.client);
		const hit = pool.find(sc => normalizeNo(sc.contractNo) === target)
			|| salesContracts.find(sc => normalizeNo(sc.contractNo) === target);
		return hit?.id || '';
	};
	const handleClientContractNo = (e) => {
		const v = e.target.value;
		setValueInv(prev => ({ ...prev, clientContractNo: v, salesContractId: autoMatchSalesContract(v) }));
	};
	const handleSalesContractPick = (id) => {
		const sc = salesContracts.find(x => x.id === id);
		setValueInv(prev => ({ ...prev, salesContractId: id, clientContractNo: sc?.contractNo ?? prev.clientContractNo }));
	};

	return (
		<div className="overflow-x-auto">
			<div className="px-1 min-w-[900px]">
				{loading && <Spinner />}

				{/* Annex VII / ISF Documents — collapsible */}
				<div className="mb-2">
					<button
						onClick={() => setDocsOpen(v => !v)}
						className="flex items-center gap-2 w-full px-3 py-1.5 rounded-lg border border-[var(--line)]
							bg-[var(--bg-subtle)] responsiveTextInput font-medium text-[var(--chathams-blue)] hover:bg-[var(--selago)] transition-all"
					>
						<ScrollText size={13} />
						<span>Annex VII / ISF Documents</span>
						<span className="ml-auto">{docsOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}</span>
					</button>
					{docsOpen && (
						<div className="mt-2 flex flex-col gap-2">
							<AnnexVII valueInv={valueInv} setValueInv={setValueInv} compData={compData} settings={settings} valueCon={valueCon} />
							<ISF valueInv={valueInv} setValueInv={setValueInv} compData={compData} settings={settings} valueCon={valueCon} />
						</div>
					)}
				</div>

				<div className='grid grid-cols-12 gap-3 pt-1'>
					<div className={`col-span-1 ${panelCls}`}>
						<p className={panelTtl}>{getTtl('Invoices', ln)}</p>
						{valueCon.invoices.length > 0 &&
							<ul className="flex flex-col overflow-auto rounded-2xl divide-y max-h-32" >
								{valueCon.invoices.map((x, i) => {
									return (
										<li key={i} onClick={() => selectRow(i)}
											className={`shrink-0 items-center py-1 px-1.5 responsiveTextTable truncate
									${valueCon.invoices[i]['id'] === valueInv.id && 'font-medium bg-slate-100 '}
									${(isInvCreationCNFL && x.invType !== '1111') ? 'bg-[var(--neutral-bg)] pointer-events-none cursor-not-allowed text-[var(--regent-gray)]' : 'cursor-pointer text-[var(--port-gore)]'}
								
								}
									`}
										>
											{String(x.invoice).padStart(4, "0") + getprefixInv(x)}
										</li>
									)
								})}
							</ul>}
					</div>
					<div className={`col-span-3 ${panelCls}`}>
						<p className={labelCls}>{getTtl('Consignee', ln)}</p>
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
						{/* Sales-contract link — sets salesContractId so the client's Sales Contract registers this as shipped. */}
						{!fnl ?
							<div className='mt-2 flex flex-col gap-1.5'>
								<div className='flex flex-col'>
									<p className={labelCls}>Client Contract #</p>
									<input className="input" name='clientContractNo'
										value={valueInv.clientContractNo || ''} onChange={handleClientContractNo} />
								</div>
								<div>
									{valueInv.salesContractId ?
										// Auto-matched from the Client Contract # — compact confirmation instead of
										// repeating the same number (shows the sales-contract # only if it differs).
										<span className='responsiveText font-medium flex items-center gap-1.5' style={{ color: 'var(--ok-text)' }}>
											✓ Linked to sales contract{(() => { const n = (Array.isArray(salesContracts) ? salesContracts : []).find(s => s.id === valueInv.salesContractId)?.contractNo; return n && n !== valueInv.clientContractNo ? ` · ${n}` : ''; })()}
											<button type='button' onClick={() => clear('salesContractId')} title='Unlink' className='text-[var(--regent-gray)] hover:text-red-500'>✕</button>
										</span>
										:
										<>
											<Selector arr={scOptionsLabelled} value={valueInv}
												onChange={handleSalesContractPick}
												name='salesContractId' secondaryName='scLabel'
												clear={clear} />
											{valueInv.clientContractNo &&
												<p className='responsiveText text-[var(--regent-gray)] pl-1 pt-0.5'>No auto-match — pick one or create it.</p>}
										</>
									}
									<SalesSplitSummary inv={valueInv} contracts={scAll} />
								</div>
							</div>
							:
							<div className='mt-2 flex flex-col'>
								<p className={labelCls}>Client Contract #</p>
								<p className='responsiveText text-[var(--ink)]'>{(Array.isArray(salesContracts) ? salesContracts : []).find(s => s.id === valueInv.salesContractId)?.contractNo || valueInv.clientContractNo || '—'}</p>
								<SalesSplitSummary inv={valueInv} contracts={scAll} />
							</div>
						}
						{fnl && (
							<>
								<p className='pt-2 pl-1 responsiveText'>{valueInv.client.street}</p>
								<p className='pt-2 pl-1 responsiveText'>{valueInv.client.city}</p>
								<p className='pt-2 pl-1 responsiveText'>{valueInv.client.country}</p>
								<p className='pt-2 pl-1 responsiveText'>{valueInv.client.other1}</p>
							</>
						)}
					</div>
					<div className={`col-span-2 ${panelCls} flex flex-col`}>
						<p className={labelCls}>{getTtl('Invoice Type', ln)}</p>
						{!fnl ?
							<div>
								<InvoiceType setSelected={selectInvType} plans={settings.InvTypes.InvTypes} value={valueInv} ln={ln} />
								{(valueInv.invType !== '1111' && valueInv.id === '') &&
									<div className='responsiveText text-red-600 font-medium'>{getTtl('selectOriginalInvoice', ln)}</div>
								}
							</div>
							:
							<p className='responsiveText text-[var(--ink)]'>{valueInv.invType}</p>
						}
					</div>
					<div className={`col-span-2 ${panelCls} flex flex-col`}>
						<p className={panelTtl}>{getTtl('PO', ln)}#</p>
						{valueInv.productsDataInvoice.length > 0 && <ul className="flex flex-col rounded-2xl divide-y max-h-20 overflow-y-auto" >
							{poArr.map((x, i) => {
								return (
									<li key={i}
										className='shrink-0 items-center py-0.5 px-1.5 responsiveText text-[var(--port-gore)]
									truncate'>
										{x}
									</li>
								)
							})}
						</ul>}

					</div>
					<div className={`col-span-4 ${panelCls} flex flex-col gap-3`}>
						<div className='flex flex-col'>
							<p className={labelCls}>{getTtl('Date', ln)}</p>
							{!fnl ?
								<>
									<Datepicker useRange={false}
										asSingle={true}
										value={valueInv.dateRange}
										popoverDirection='down'
										onChange={handleDateChangeDate}
										displayFormat={"DD-MMM-YYYY"}
										inputClassName='input'
									/>
									<ErrDiv field='date' errors={errors} ln={ln} />
								</>
								:
								<p className='responsiveText text-[var(--ink)]'>{valueInv.date}</p>
							}
						</div>
						<div className='flex items-start gap-6 flex-wrap'>
							<div className='flex flex-col'>
								<p className={labelCls}>
									{!fnl ? valueInv.invType === '1111' ? getTtl('Invoice', ln) + ' #:' : valueInv.invType === '2222' ?
										getTtl('Credit Note', ln) + ' #:' : getTtl('Final Note', ln) + ' #:' :
										valueInv.invType + ' No:'}
								</p>
								<p className='responsiveText font-medium text-[var(--ink)]'>
									{(valueInv.id === '' && !isInvCreationCNFL) ? String(invNum).padStart(4, "0") + getprefixInv(valueInv) :
										String(valueInv.invoice).padStart(4, "0") + getprefixInv(valueInv)}
								</p>
							</div>
							<div className='flex flex-col'>
								<p className={labelCls}>{getTtl('Status', ln)}</p>
								<p className='responsiveText font-medium'>
									{!fnl ? 'Draft' : fnl && !valueInv.canceled ? 'Finalized' : (fnl && valueInv.canceled) && 'Canceled'}
								</p>
							</div>
						</div>
					</div>
				</div>


				<div className='grid grid-cols-1 md:grid-cols-3 gap-3 pt-2'>
					<div className={`${panelCls} flex flex-col gap-3`}>
						<div className='flex flex-col'>
							<p className={labelCls}>{getTtl('Shipment', ln)}</p>
							<Selector arr={settings.Shipment.Shipment} value={valueInv}
								onChange={(e) => handleChange(e, 'shpType')}
								name='shpType'
								clear={clear} />
							<ErrDiv field='shpType' errors={errors} ln={ln} />
						</div>

						<div className='flex flex-col'>
							<p className={labelCls}>{getTtl('Origin', ln)}</p>
							<Selector arr={[...settings.Origin.Origin, { id: 'empty', origin: '...Empty' }]}
								value={valueInv}
								onChange={(e) => handleChange(e, 'origin')}
								name='origin'
								clear={clear} />
						</div>
						<div className='flex flex-col'>
							<p className={labelCls}>{getTtl('Delivery Terms', ln)}</p>
							<Selector arr={settings['Delivery Terms']['Delivery Terms']} value={valueInv}
								onChange={(e) => handleChange(e, 'delTerm')}
								name='delTerm'
								clear={clear} />
						</div>
						<div className='flex flex-col'>
							<p className={labelCls}>{getTtl('Delivery Date', ln)}</p>
							<Datepicker useRange={false}
								asSingle={true}
								value={valueInv.delDate}
								popoverDirection='down'
								onChange={handleDateChangeDelvrDate}
								displayFormat={"DD-MMM-YYYY"}
								inputClassName='input'
							/>
						</div>
					</div>

					<div className={`${panelCls} flex flex-col gap-3`}>
						<div className='flex flex-col'>
							<p className={labelCls}>{getTtl('POL', ln)}</p>
							<Selector arr={settings.POL.POL} value={valueInv}
								onChange={(e) => handleChange(e, 'pol')}
								name='pol'
								clear={clear} />
						</div>
						<div className='flex flex-col'>
							<p className={labelCls}>{getTtl('POD', ln)}</p>
							<Selector arr={settings.POD.POD} value={valueInv}
								onChange={(e) => handleChange(e, 'pod')}
								name='pod'
								clear={clear} />
						</div>
						{(valueInv.invType === '1111' || valueInv.invType === 'Invoice') &&
							<div className='flex flex-col'>
								<p className={labelCls}>{getTtl('Packing', ln)}</p>
								<Selector arr={settings.Packing.Packing} value={valueInv}
									onChange={(e) => handleChange(e, 'packing')}
									name='packing'
									clear={clear} />
							</div>}
					</div>

					<div className={`${panelCls} flex flex-col gap-3`}>
						<div className='flex flex-col'>
							<p className={labelCls}>{getTtl('totalNet', ln)}</p>
							<p className='responsiveText text-[var(--ink)]'>
								{NetWTKgs}
							</p>
						</div>
						{(valueInv.invType === '1111' || valueInv.invType === 'Invoice') &&
							<div className='flex flex-col'>
								<p className={`${labelCls} ${(secondRule || fifthRule) ? 'opacity-50' : ''}`}>{getTtl('totalTare', ln)}</p>
								<p className={`responsiveText ${parseInt(TotalTarre) < 0 ? 'text-red-400 font-medium' : 'text-[var(--ink)]'}`}>{secondRule || fifthRule ? '' : TotalTarre}</p>
							</div>
						}

						<div className='flex flex-col'>
							<p className={`${labelCls} ${(fourthRule || fifthRule) ? 'opacity-50' : ''}`}>
								{thirdRule ? 'QTY Ingots' : getTtl('totalGross', ln)}</p>
							<div>{(fourthRule || fifthRule) ? '' :
								<div className='w-full'>
									{!fnl ?
										<input type='number' className="input" style={{ fontFamily: 'inherit' }} name='ttlGross' value={valueInv.ttlGross} onChange={handleValue} />
										:
										<p className='responsiveText text-[var(--ink)]'>{(valueInv.ttlGross * 1).toLocaleString(locale, options)}</p>
									}
								</div>
							}</div>
						</div>

						{(valueInv.invType === '1111' || valueInv.invType === 'Invoice') &&
							<div className='flex flex-col'>
								<p className={`${labelCls} ${(fourthRule || thirdRule) ? 'opacity-50' : ''}`}>{getTtl('totalPack', ln)}</p>
								<div>{(fourthRule || thirdRule) ? '' :
									<div className='w-full'>
										{!fnl ?
											<input type='text' className="input" style={{ fontFamily: 'inherit' }} name='ttlPackages' value={valueInv.ttlPackages} onChange={handleValue} />
											:
											<p className='responsiveText text-[var(--ink)]'>{valueInv.ttlPackages}</p>
										}
									</div>
								}</div>
							</div>
						}
					</div>
				</div>

				<div className='grid grid-cols-1 md:grid-cols-2 gap-3 mt-2'>
					<div className={`${panelCls} flex flex-col`}>
						<p className={labelCls}>{getTtl('Bank Account', ln)}</p>
						<Selector arr={settings['Bank Account']['Bank Account']} value={valueInv}
							onChange={(e) => handleChange(e, 'bankNname')}
							name='bankNname'
							clear={clear} />
					</div>

					<div className={`col-span-1 ${panelCls} flex flex-col`}>
						<p className={labelCls}>HS Code</p>
						<div className='flex gap-2 w-full'>
							<div className='flex-1 min-w-0'>
								<Selector arr={settings.Hs.Hs.map(item => {
									const { hs, ...rest } = item;
									return { hs1: hs, ...rest };
								})}
									value={valueInv}
									onChange={(e) => handleChange(e, 'hs1')}
									name='hs1'
									clear={clear} />
							</div>
							<div className='flex-1 min-w-0'>
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


				<div className={`w-full ${panelCls} mt-2`}>
					<ProductsTable value={valueInv} setValue={setValueInv}
						currency={settings.Currency.Currency} uidCollection={uidCollection}
						setDeleteProducts={setDeleteProducts} settings={settings}
						materialsArr={(valueCon.productsData || []).map(x => ({ id: x.id, description: x.description }))}
						certOpen={certOpen} setCertOpen={setCertOpen}
						salesContracts={scLineOptions}
					/>
				</div>


				<div className='grid grid-cols-1 md:grid-cols-8 gap-3 mt-2'>
					<div className={`md:col-span-5 ${panelCls}`}>
						<Remarks value={valueInv} setValue={setValueInv} ln={ln} />
					</div>

					<div className={`md:col-span-2 ${panelCls} flex flex-col`}>
						<p className={labelCls}>{getTtl('Comments', ln)}</p>
						<textarea rows="2" name="comments"
							className='input p-1'
							style={{ fontSize: 'var(--fs-input)', fontFamily: 'inherit', height: valueInv.remarks.length === 0 ? '40px' : valueInv.remarks.length * 40 + 'px' }}
							value={valueInv.comments}
							onChange={handleValue}
						/>
					</div>

					<div className={`md:col-span-1 ${panelCls} flex flex-col`}>
						<p className={labelCls}>{getTtl('Currency', ln)}</p>
						<Selector arr={settings.Currency.Currency} value={valueInv}
							onChange={(e) => handleChange(e, 'cur')}
							name='cur'
							clear={clear}
							disabled={valueInv.invType !== '1111'}
						/>
						<ErrDiv field='cur' errors={errors} ln={ln} />
					</div>
				</div>


				<Expenses showExpenses={showExpenses} />
				<Payments showPayments={showPayments} />

				<div className="sticky bottom-0 z-sticky bg-[var(--bg-card)] mt-3 flex flex-wrap justify-end gap-2 pt-3 pb-2 border-t border-[var(--line)]">
					<Tltip direction='top' tltpText='Clear form'>
						<button
							className="whiteButton py-1"
							onClick={clearForm}
						>
							<Eraser className='size-4' />
							{fnl ? 'New' : getTtl('Clear', ln)}
						</button>
					</Tltip>
					{(!fnl && showButton) &&
						<Tltip direction='top' tltpText='Upload a customer PO (PDF/JPG/PNG) — AI extracts client, currency, products and dates to pre-fill this invoice. Review before saving.'>
							<button
								className="whiteButton py-1"
								onClick={() => setShowDocImport(true)}
							>
								<FileUp className='size-4' />
								Autofill from customer PO
							</button>
						</Tltip>}
					<Tltip direction='top' tltpText='Close form'>
						<button
							className="whiteButton py-1"
							onClick={() => setIsOpenCon(false)}
						>
							<X className='size-4' />
							{getTtl('Close', ln)}
						</button>
					</Tltip>
					{valueInv.id !== '' && (
						<Tltip direction='top' tltpText='View the activity / change history for this invoice'>
							<button className="whiteButton py-1" onClick={() => setShowHistory(true)}>
								<History className='size-4' />
								History
							</button>
						</Tltip>
					)}
					{valueInv.id !== '' && (
						<Tltip direction='top' tltpText='Comments & team discussion for this invoice'>
							<button className="whiteButton py-1" onClick={() => setShowComments(true)}>
								<MessageSquare className='size-4' />
								Comments
							</button>
						</Tltip>
					)}
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
											let description = tmpObj.mtrlStatus === 'select' ? (valueInv.productsData || []).find(x => x.id === tmpObj.descriptionId)?.['description'] :
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
					className="flex items-center gap-2 justify-center rounded-lg border bg-[var(--danger-text)] px-3 py-2 responsiveTextTable font-medium
						text-[var(--on-brand)] hover:bg-red-400 focus:outline-none drop-shadow-lg" onClick={() => setIsFinilizeOpen(true)}
				>
					<BsFillSendCheckFill className='scale-110' />
					Finalize
				</button>*/}
					{/*(fnl && !valueInv.canceled) && showButton && <button
					type="button"
					className="flex items-center gap-2 justify-center rounded-lg border bg-[var(--danger-text)] px-3 py-2 responsiveTextTable font-medium
						text-[var(--on-brand)] hover:bg-red-400 focus:outline-none drop-shadow-lg" onClick={() => setIsCancelOpen(true)}

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

					{(!fnl && isSelectedInv) &&
						<Tltip direction='top' tltpText='Save/Update invoice'>
							<LoadingButton onClick={btnClck} disabled={isButtonDisabled}>
								<Save className='size-4' />
								{isButtonDisabled ? getTtl('saving', ln) : getTtl('save', ln)}
							</LoadingButton>
						</Tltip>}

				</div>
				<ModalToDelete isDeleteOpen={isDeleteOpen} setIsDeleteOpen={setIsDeleteOpen}
					ttl={getTtl('delConfirmation', ln)} txt={getTtl('delConfirmationTxtInvoice', ln)}
					doAction={() => delInvoice(uidCollection, valueCon, setValueCon, contractsData, setContractsData)} />
				<ModalToDelete isDeleteOpen={isFinilizeOpen} setIsDeleteOpen={setIsFinilizeOpen}
					ttl='Invoice finalization' txt='To finalize this invoice please confirm to proceed.'
					doAction={() => {
						finilizeInvoice(uidCollection, settings);
						logActivity({
							type: 'invoice.finalized', entityType: 'invoice', entityId: valueInv.id || '',
							entityLabel: `Invoice #${valueInv.invoice ?? ''}`, action: 'finalized',
							message: `Invoice #${valueInv.invoice ?? ''} finalized` + (valueCon?.order ? ` (PO ${valueCon.order})` : ''),
							notify: true, severity: 'success',
						});
					}} />
				<ModalToDelete isDeleteOpen={isCanceleOpen} setIsDeleteOpen={setIsCancelOpen}
					ttl='Invoice cancellation' txt='To cancel this invoice please confirm to proceed.'
					doAction={() => cancelInvoice(uidCollection)} />

				{showHistory && (
					<Modal isOpen={showHistory} setIsOpen={setShowHistory} title='Activity / History' size='md'>
						<ActivityLog entityType='invoice' entityId={valueInv.id} />
					</Modal>
				)}
				{showComments && (
					<Modal isOpen={showComments} setIsOpen={setShowComments} title={`Comments — Invoice #${valueInv.invoice ?? ''}`} size='md'>
						<CommentThread entityType='invoice' entityId={valueInv.id} entityLabel={`Invoice #${valueInv.invoice ?? ''}`} />
					</Modal>
				)}

				{showDocImport && (
					<DocumentImportOverlay
						documentType='invoice'
						suppliers={[]}
						clients={settings.Client?.Client || []}
						currencies={settings.Currency?.Currency || []}
						onApply={(fields) => {
							const mapped = { ...fields };
							// Our invoice number is auto-generated — never overwrite it with the
							// customer's PO/invoice number.
							delete mapped.invoice;
							// Remap AI products into the invoice row shape (free-text descriptions
							// via descriptionText + mtrlStatus 'edit', since a customer PO's line
							// items won't match our material IDs).
							if (Array.isArray(fields.productsDataInvoice) && fields.productsDataInvoice.length) {
								mapped.productsDataInvoice = fields.productsDataInvoice.map(p => {
									const qnty = String(p.qnty ?? '') || '0';
									const unitPrc = String(p.unitPrc ?? '') || '0';
									const total = Math.round(((parseFloat(qnty) || 0) * (parseFloat(unitPrc) || 0)) * 100) / 100;
									return {
										id: uuidv4(), po: '', descriptionId: '', container: '',
										qnty, unitPrc, total,
										descriptionText: p.description || '', mtrlStatus: 'edit',
										stock: '', stockValue: '',
									};
								});
								mapped.totalAmount = mapped.productsDataInvoice.reduce((s, p) => s + (Number(p.total) || 0), 0);
							}
							setValueInv(prev => ({ ...prev, ...mapped }));
							const labels = Object.keys(mapped).map(k => ({
								client: 'Client', cur: 'Currency', productsDataInvoice: 'Products',
								comments: 'Comments', date: 'Date', dateRange: 'Date', totalAmount: 'Total',
							}[k])).filter(Boolean);
							const uniq = [...new Set(labels)];
							setToast({
								show: true,
								text: uniq.length
									? `Applied to the invoice: ${uniq.join(', ')}. Review the fields, then click Save.`
									: 'Nothing applied — no fields matched. If client/currency showed "no match", pick them manually.',
								clr: uniq.length ? 'success' : 'fail',
							});
						}}
						onClose={() => setShowDocImport(false)}
					/>
				)}

			</div>
		</div>


	);
};
//
export default ContractModal;