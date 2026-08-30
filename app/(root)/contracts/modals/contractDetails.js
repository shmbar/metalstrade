'use client'
import { useContext, useEffect, useState } from 'react'
import { SettingsContext } from "@contexts/useSettingsContext";
import { ContractsContext } from "@contexts/useContractsContext";
import { InvoiceContext } from "@contexts/useInvoiceContext";
import Datepicker from "react-tailwindcss-datepicker";
import { Pdf } from './pdf/pdfContract.js';
import ProductsTable from './productsTable.js';
import Remarks from './remarksSelection.js'
import PriceRemarks from './priceRemarks.js'
import { usePathname } from 'next/navigation';
import ModalToDelete from '@components/modalToProceed';
import { validate, ErrDiv, reOrderTableCon, getD, sortArr, saveDatatoServer, loadStockData, saveStockIn, loadInvoice, loadData, loadDataSettings, appendSettingsEntries, saveMultipleData, setNewInvoiceNum } from '@utils/utils'
import { UserAuth } from "@contexts/useAuthContext";
import FilesModal from './filesModal.js'
import PoInvModal from './poInvModal.js'
import WhModal from './whModal.js'
import { getTtl } from '@utils/languages.js';
import FinalSettlmentModal from './finalSettlmentModal.js';
import CheckBox from '@components/checkbox.js';
import Tltip from '@components/tlTip.js';
import { Selector } from '@components/selectors/selectShad';
import { X, Save, Copy, History } from 'lucide-react';
import DocumentImportOverlay from '@components/DocumentImportOverlay';
import PdfPreview from '@components/PdfPreview';
import Modal from '@components/modal';
import ActivityLog from '@components/ActivityLog';
import CommentThread from '@components/CommentThread';
import { v4 as uuidv4 } from 'uuid';
import { BtnIcon } from '@components/buttonIcons';
import { planContractDeletion } from '@utils/contractCascade';
import { translateIdFields } from '@utils/crossAccountSettings';

// Deleting a contract now takes everything inside it, so the confirmation has to
// name what that is. A count alone ("3 records") is not something anyone can check
// against what they meant to delete — the numbers of the invoices are.
const DeletionSummary = ({ con }) => {
	const plan = planContractDeletion(con || {});
	if (!plan.total) return null;

	const nameList = (arr, field, max = 4) => {
		const names = arr.map(x => String(x?.[field] ?? '').trim()).filter(Boolean);
		if (!names.length) return '';
		const shown = names.slice(0, max).join(', ');
		return names.length > max ? `${shown} +${names.length - max} more` : shown;
	};

	const rows = [
		['Sales invoices', plan.invoices.length, nameList(plan.invoices, 'invoice')],
		['Expense invoices', plan.expenses.length, nameList(plan.expenses, 'expense')],
		['Purchase invoices', plan.poInvoices.length, nameList(plan.poInvoices, 'inv')],
		['Stock lots', plan.stockIds.length, ''],
	].filter(([, n]) => n > 0);

	return (
		<div className='mt-3 rounded-lg border border-[var(--line)] bg-[var(--bg-subtle)] px-3 py-2'>
			<p className='responsiveText font-medium text-[var(--ink)]'>
				This will also delete:
			</p>
			<ul className='mt-1.5 flex flex-col gap-1'>
				{rows.map(([label, n, names]) => (
					<li key={label} className='responsiveText text-[var(--ink-secondary)] flex gap-2'>
						<span className='numeric font-medium text-[var(--ink)]'>{n}</span>
						<span>{label}{names ? ` — ${names}` : ''}</span>
					</li>
				))}
			</ul>
			<p className='responsiveTextTable text-[var(--ink-muted)] mt-2'>
				This cannot be undone.
			</p>
		</div>
	);
};

const ContractModal = () => {

	const { settings, compData, setToast, ln } = useContext(SettingsContext);
	const { valueCon, setValueCon, saveData, delContract, setIsOpenCon,
		errors, setErrors, duplicate, contractsData, isButtonDisabled, setIsButtonDisabled } = useContext(ContractsContext);
	const { setValueInv } = useContext(InvoiceContext);
	const sups = settings.Supplier.Supplier;
	const supplier = valueCon.supplier && sups.find(z => z.id === valueCon.supplier);
	const [isDeleteOpen, setIsDeleteOpen] = useState(false)
	const [isDuplicateOpen, setIsDuplicateOpen] = useState(false)
	const { uidCollection, gisAccount, logActivity } = UserAuth();
	const [showFilesModal, setShowFilesModal] = useState(false)
	const [showPoInvModal, setShowPoInvModal] = useState(false)
	const [showStockModal, setShowStockModal] = useState(false)
	const [showFinalSettlmntModal, setShowFinalSettlmntModal] = useState(false);
	const [showDocImport, setShowDocImport] = useState(false);
	const [pdfPreview, setPdfPreview] = useState(null);
	const [showHistory, setShowHistory] = useState(false);
	const [showComments, setShowComments] = useState(false);

	// Build the PO product-table rows exactly as the PO PDF generator expects them.
	// Shared by both the Preview and the Download (PDF) buttons so they can't drift.
	const buildPoTable = () =>
		reOrderTableCon(valueCon.productsData.filter(x => !x.import)).map(({ ['id']: _, ...rest }) => rest)
			.map((row, index) => {
				// Keep the positional read the table has always used (description, qnty, unitPrc
				// are the first three keys) while still reaching contentPrc by name.
				const values = Object.values(row);
				const number = values[1];
				const number1 = values[2];
				const formattedNumber = new Intl.NumberFormat('en-US', { minimumFractionDigits: 3 }).format(number);
				// Priced on element content: print whatever basis was typed into the cell, and
				// fall back to deferring to the Price Remarks below. Stored prices are left alone.
				const formattedNumber1 = valueCon.priceMode === 'content'
					? (String(row.contentPrc ?? '').trim() || 'See below*') :
					isNaN(number1 * 1) ? number1 :
						new Intl.NumberFormat('en-US', {
							style: 'currency',
							currency: valueCon.cur !== '' ? getD(settings.Currency.Currency, valueCon, 'cur') : 'USD',
							minimumFractionDigits: 2
						}).format(number1);
				return [index + 1, values[0], formattedNumber, formattedNumber1];
			});

	// Open the PO as an in-app preview (looks exactly like the supplier's PDF, no download).
	const openPoPreview = async () => {
		const res = await Pdf(valueCon, buildPoTable(), settings, compData, gisAccount, 'preview');
		if (res?.blob) setPdfPreview({ blob: res.blob, filename: res.filename });
	};

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
			const wasNew = !valueCon.id; // new contracts start with id '' (assigned on save)
			setIsButtonDisabled(true);
			let result = await saveData(uidCollection)
			if (!result) setIsButtonDisabled(false); //false

			setTimeout(() => {
				setIsButtonDisabled(false);
				result && setToast({ show: true, text: getTtl('Contract successfully saved!', ln), clr: 'success' })
				result && logActivity({
					type: wasNew ? 'contract.created' : 'contract.updated',
					entityType: 'contract', entityId: valueCon.id || '',
					entityLabel: `PO ${valueCon.order ?? ''}`, action: wasNew ? 'created' : 'updated',
					message: `Contract PO ${valueCon.order ?? ''} ${wasNew ? 'created' : 'updated'}`,
					notify: wasNew, severity: 'info', // notify on creation only — updates aren't noise-worthy
				})
			}, 3000); // Adjust the delay as needed
		}
	}

	const caneclEditText = () => {
		setValueCon({ ...valueCon, 'isDeltimeText': false, 'deltime': '' })
	}

	const caneclEditTextPmnt = () => {
		setValueCon({ ...valueCon, 'isTermPmntText': false, 'termPmnt': '' })
	}

	const autoOrderPattern = /^\d{6}-\d+-\w*$/;

	const handleChange = (e, name) => {
		setValueCon(prev => {
			const updated = { ...prev, [name]: e }

			if (name === 'supplier' && autoOrderPattern.test(prev.order)) {
				const sup = sups.find(z => z.id === e);
				const prefix = prev.order.replace(/-[^-]*$/, '');
				const supCode = sup ? sup.supplier.substring(0, 3).toUpperCase() : '';
				updated.order = `${prefix}-${supCode}`;
			}

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

			if (name === 'termPmnt' && e === 'EditTextTermPmnt') {
				updated.termPmnt = ''
				updated.isTermPmntText = true
			}


			return updated
		})
	}


	const clear = (name) => {
		setValueCon(prev => ({
			...prev, [name]: '',
		}))
	}

	// The counterparty's supplier id inside the OTHER account. These constants are
	// what this copy has always stamped, but an id only means something in the
	// account that holds it — when the target's supplier list has no record with
	// this id, the copied contract arrives belonging to nobody and its balances
	// pile up in Cashflow under a nameless row. So look the counterparty up in the
	// target's own settings and keep the constant only as the fallback.
	const counterpartSupplierId = (targetSettings) => {
		const fallback = gisAccount ? 'f891ad09-aa67-4ba4-83f0-abe7040e0dd2' : '0dfe23d3-3199-4556-a178-07ad52529e37';
		const name = gisAccount ? 'gis' : 'ims';
		const list = targetSettings?.Supplier?.Supplier || [];
		if (list.some(z => z?.id === fallback)) return fallback;
		const hit = list.find(z => `${z?.nname || ''} ${z?.supplier || ''}`.toLowerCase().includes(name));
		return hit?.id || fallback;
	};

	// Every other dropdown on a contract stores a settings id too, and those ids are
	// per workspace in exactly the same way. translateIdFields explains the whole
	// problem and decides what to carry across; it lives in @utils/crossAccountSettings
	// because it is what gets written into the OTHER account.

	const CopyIMSGIS = async () => {

		const now = new Date();
		const formatted = now.toLocaleString('en-GB', {
			day: '2-digit',
			month: 'short',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
			hour12: false
		}).replace(',', '');

		const uid = gisAccount ? 'DQ9gNTpvXqh6K9BqMTPTgCfxD2Z2' : 'aB3dE7FgHi9JkLmNoPqRsTuVwGIS'

		// Read once: both the counterparty lookup and the dropdown translation below
		// need the target account's own settings.
		let targetSettings = {};
		try { targetSettings = await loadDataSettings(uid, 'settings') || {}; } catch { targetSettings = {}; }
		const { values: translatedIds, additions: missingSettings } = translateIdFields(valueCon, settings, targetSettings);

		let indvData = await Promise.all(
			valueCon.invoices?.map(inv =>
				loadInvoice(!gisAccount ? 'DQ9gNTpvXqh6K9BqMTPTgCfxD2Z2' : 'aB3dE7FgHi9JkLmNoPqRsTuVwGIS',
					'invoices', inv)
			)
		) || [];

	
		const getInvoiceNum = async (x) => {
			let aa = await loadDataSettings(x, 'invoiceNum')
			return aa.num + 1;
		}

		const invoices1 = await Promise.all(
			indvData.map(async (inv) => {
				const invoiceNum = await getInvoiceNum(uid);

				return {
					date: inv.date || '',
					id: inv.id || '',
					invType: "1111",
					invoice: invoiceNum,
				};
			})
		);


		// One purchase-invoice line per invoice NUMBER. A source contract that
		// carries the same invoice twice (a re-import, or a stale duplicate of the
		// contract itself) otherwise copies both lines across and doubles the
		// counterparty's balance in the target account — the same guard the PDF
		// import and the mirror pull already apply before adding a line.
		const seenInvNo = new Set();
		const poInvoices = valueCon.invoices.map((invoice, indx) => ({
			blnc: indvData[indx]?.balanceDue || indvData[indx]?.totalAmount,
			id: indvData[indx]?.id || '',
			inv: invoice.invoice,
			invRef: [],
			invValue: indvData[indx]?.totalAmount || 0,
			payments: [],
		})).filter(p => {
			const key = String(p.inv || '').toLowerCase().replace(/[^a-z0-9]/g, '');
			if (!key) return true;               // unnumbered line — nothing to match on
			if (seenInvNo.has(key)) return false;
			seenInvNo.add(key);
			return true;
		});

		const newCon = {
			...valueCon,
			...translatedIds,
			'supplier': counterpartSupplierId(targetSettings),
			'order': gisAccount ? valueCon.order?.replace("-", "") : valueCon.order?.slice(0, -2) + "-" + valueCon.order?.slice(-2),
			'poInvoices': poInvoices.length ? poInvoices : [], 'expenses': [], lstSaved: formatted,
			invoices: invoices1,
		}


		indvData = indvData.map(x => ({
			...x, expenses: [], invoice: invoices1.find(inv => inv.id === x.id)?.invoice || '',
			// poSupplier points at the CONTRACT this invoice belongs to — it is what
			// every "open the contract" route resolves. This wrote the supplier's id
			// instead, so a copied invoice pointed at a contract that does not exist
			// and the target account answered "Contract can not be accessed!".
			poSupplier: {
				date: newCon.dateRange?.startDate || newCon.date || '',
				id: newCon.id || '',
				order: newCon.order || '',
			},
			poSupplierOrder: newCon.order || '',
			payments: [], client: ''
		}));

	
		// Refuse to open a SECOND contract in the target account for a PO it already
		// holds. Re-copying the same contract is fine — it keeps its id and lands on
		// the same document — but when this side has the PO twice (a duplicated
		// contract), copying each one puts two contracts over there, both feeding
		// their purchase invoices into the counterparty's balances. Nothing is
		// written before this check.
		const copyYr = newCon.dateRange?.startDate?.substring(0, 4);
		if (copyYr) {
			const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
			const already = (await loadData(uid, 'contracts', { start: `${copyYr}-01-01`, end: `${copyYr}-12-31` }) || [])
				.find(c => c?.id !== newCon.id && norm(c?.order) === norm(newCon.order));
			if (already) {
				setToast({
					show: true, clr: 'fail',
					text: `${gisAccount ? 'IMS' : 'GIS'} already has PO ${newCon.order} as a different contract — copy cancelled so it isn't recorded twice`,
				});
				return;
			}
		}

		// Only now that the copy is going ahead: give the target account the list
		// entries it was missing, so the ids stamped on the contract below resolve
		// to a name there. Best-effort — a contract that lands with one unnamed
		// port is better than no contract at all.
		if (Object.keys(missingSettings).length) {
			try { await appendSettingsEntries(uid, missingSettings); }
			catch (e) { console.warn('Could not top up target settings lists:', e?.message || e); }
		}

		let success = await saveDatatoServer(uid, 'contracts', newCon)
		await saveMultipleData(uid, 'invoices', indvData)
		await setNewInvoiceNum(uid)

		success && setToast({ show: true, text: 'Data successfully copied!', clr: 'success' })

		let stockData = valueCon.stock.length > 0 ? await loadStockData(uidCollection, 'id', valueCon.stock) : []

		stockData = stockData.map(x => ({
			...x, client: '', poInvoice: '', poInvoices: [], status: '',
			'supplier': newCon.supplier,   // same party the copied contract landed under
			salesPo: '', spInv: false
		}))

		await saveStockIn(uid, stockData)
	}

	// One-click: build a draft sales invoice from this contract's data so the
	// user doesn't have to retype supplier, currency, shipment terms and product
	// lines. They still need to set client + invoice number on the Invoices tab.
	const createInvoiceFromContract = () => {
		if (!valueCon?.id) {
			setToast({ show: true, text: 'Save this contract first before creating an invoice from it.', clr: 'fail' });
			return;
		}
		const products = (valueCon.productsData || [])
			.filter(p => p && (p.description || p.qnty || p.unitPrc))
			.map((p) => {
				const qty = parseFloat(p.qnty) || 0;
				const price = parseFloat(p.unitPrc) || 0;
				return {
					id: uuidv4(),
					descriptionId: '',
					container: '',
					description: p.description || '',
					qnty: p.qnty || '',
					unitPrc: p.unitPrc || '',
					total: qty * price || '',
					stock: '',
					stockValue: '',
					mtrlStatus: '',
				};
			});

		const draft = {
			id: '',
			opDate: '',
			lstSaved: '',
			invoice: '',
			date: '',
			dateRange: { startDate: null, endDate: null },
			invoiceStatus: '',
			client: '',
			shpType: valueCon.shpType || '',
			origin: valueCon.origin || '',
			delTerm: valueCon.delTerm || '',
			pol: valueCon.pol || '',
			pod: valueCon.pod || '',
			packing: valueCon.packing || '',
			delDate: { startDate: null, endDate: null },
			cur: valueCon.cur || '',
			ttlGross: '',
			ttlPackages: '',
			productsDataInvoice: products,
			invType: '1111',
			totalAmount: products.reduce((s, p) => s + (Number(p.total) || 0), 0) || '',
			percentage: '',
			totalPrepayment: '',
			bankNname: '',
			final: false,
			canceled: false,
			balanceDue: '',
			expenses: [],
			poSupplier: {
				id: valueCon.id,
				order: valueCon.order || '',
				date: valueCon.dateRange?.startDate || valueCon.date || '',
			},
			remarks: [],
			hs1: valueCon.hs1 || '',
			hs2: valueCon.hs2 || '',
			payments: [],
			shipData: { rcvd: '', outrnamnt: '', fnlzing: '2587', status: '', etd: '', eta: '' },
			comments: '',
			annexVII: { enabled: false, templateId: '' },
			isf: { enabled: false, templateId: '' },
		};

		setValueInv(draft);
		setToast({
			show: true,
			text: `Draft invoice created from ${valueCon.order || 'contract'} — open the Invoices tab to set client + invoice number and save.`,
			clr: 'success'
		});
	};


	const panelCls = 'border border-[var(--line)] rounded-2xl bg-[var(--bg-card)] p-3';
	const titleCls = 'responsiveTextTitle font-semibold mb-2 text-[var(--ink)] font-display';
	const labelCls = 'responsiveText font-medium text-[var(--ink-muted)] mb-1';
	// One control class for the whole form — the datepicker used to carry its own copy
	// that differed from .input in padding and type size, inside the same card.
	const inputCls = 'input';

	return (
		<div className="px-1">
			<div className='grid grid-cols-1 md:grid-cols-5 gap-2.5 pt-1'>
				<div className={`md:col-span-3 ${panelCls}`}>
					<p className={titleCls}>Parties</p>
					<p className={labelCls}>{getTtl('Supplier Name', ln)}</p>
					<div className='flex flex-col md:flex-row gap-3 items-start md:items-center'>
						<div className='flex-1 min-w-0 w-full'>
							<Selector arr={sups} value={valueCon}
								onChange={(e) => handleChange(e, 'supplier')}
								name='supplier'
								clear={clear} />
							<ErrDiv field='supplier' errors={errors} ln={ln} />
						</div>
						<div className='items-center flex gap-1 shrink-0'>
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
						<div className='flex flex-col pt-2.5 w-full'>
							<p className={labelCls}>Original Supplier</p>
							<div className='w-full min-w-0 max-w-[18rem]'>
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
				<div className={`md:col-span-2 ${panelCls}`}>
					<p className={titleCls}>Order</p>
					<p className={labelCls}>{getTtl('PoOrderNo', ln)}</p>
					<div className='w-full'>
						<input className="input" name='order' value={valueCon.order} onChange={handleValue} />
						<ErrDiv field='order' errors={errors} ln={ln} />
					</div>
					<p className={`${labelCls} mt-3`}>{getTtl('Date', ln)}</p>
					<div className='w-full '>
						<Datepicker useRange={false}
							asSingle={true}
							value={valueCon.dateRange}
							popoverDirection='down'
							onChange={handleDateChange}
							displayFormat={"DD-MMM-YYYY"}
							inputClassName={inputCls}
						/>
						<ErrDiv field='date' errors={errors} ln={ln} />
					</div>
				</div>
			</div>
			<div className='grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-2'>
				<div className={panelCls}>
					<p className={titleCls}>Shipping</p>
					<div className='flex flex-col'>
						<p className={labelCls}>{getTtl('Shipment', ln)}</p>
						<div className='w-full min-w-0'>
							<Selector arr={settings.Shipment.Shipment} value={valueCon}
								onChange={(e) => handleChange(e, 'shpType')}
								name='shpType'
								clear={clear} />
							<ErrDiv field='shpType' errors={errors} ln={ln} />
						</div>
					</div>
					<div className='flex flex-col pt-2.5'>
						<p className={labelCls}>{getTtl('Origin', ln)}</p>
						<div className='w-full min-w-0'>
							<Selector arr={[...settings.Origin.Origin, { id: 'empty', origin: '...Empty' }]} value={valueCon}
								onChange={(e) => handleChange(e, 'origin')}
								name='origin'
								clear={clear} />
						</div>
					</div>
					<div className='flex flex-col pt-2.5'>
						<p className={labelCls}>{getTtl('Delivery Terms', ln)}</p>
						<div className='w-full min-w-0'>
							<Selector arr={settings['Delivery Terms']['Delivery Terms']} value={valueCon}
								onChange={(e) => handleChange(e, 'delTerm')}
								name='delTerm'
								clear={clear} />
						</div>
					</div>
				</div>

				<div className={panelCls}>
					<p className={titleCls}>Ports & Packing</p>
					<div className='flex flex-col'>
						<p className={labelCls}>{getTtl('POL', ln)}</p>
						<div className='w-full min-w-0'>
							<Selector arr={settings.POL.POL} value={valueCon}
								onChange={(e) => handleChange(e, 'pol')}
								name='pol'
								clear={clear} />
						</div>
					</div>
					<div className='flex flex-col pt-2.5'>
						<p className={labelCls}>{getTtl('POD', ln)}</p>
						<div className='w-full min-w-0'>
							<Selector arr={settings.POD.POD} value={valueCon}
								onChange={(e) => handleChange(e, 'pod')}
								name='pod'
								clear={clear} disabled={firstRule} />
						</div>
					</div>
					<div className='flex flex-col pt-2.5'>
						<p className={labelCls}>{getTtl('Packing', ln)}</p>
						<div className='w-full min-w-0'>
							<Selector arr={settings.Packing.Packing} value={valueCon}
								onChange={(e) => handleChange(e, 'packing')}
								name='packing'
								clear={clear} />
						</div>
					</div>
				</div>

				<div className={panelCls}>
					<p className={titleCls}>Container & Delivery</p>
					<div className='flex flex-col'>
						<p className={labelCls}>{getTtl('Container Type', ln)}</p>
						<div className='w-full min-w-0'>
							<Selector arr={settings['Container Type']['Container Type']} value={valueCon}
								onChange={(e) => handleChange(e, 'contType')}
								name='contType' disabled={secondRule}
								clear={clear} />
						</div>
					</div>
					<div className='flex flex-col pt-2.5'>
						<p className={labelCls}>{getTtl('Size', ln)}</p>
						<div className='w-full min-w-0'>
							<Selector arr={settings.Size.Size} value={valueCon}
								onChange={(e) => handleChange(e, 'size')}
								name='size'
								clear={clear} />
						</div>
					</div>
					<div className='flex flex-col pt-2.5'>
						<p className={labelCls}>{getTtl('Delivery Time', ln)}</p>
						{!valueCon.isDeltimeText ?
							<div className='w-full min-w-0'>
								<Selector arr={[...settings['Delivery Time']['Delivery Time'], { deltime: '..Edit Text', id: 'EditTextDelTime' }]}
									value={valueCon}
									onChange={(e) => handleChange(e, 'deltime')}
									name='deltime'
									clear={clear} />
							</div>
							:
							<div className='relative w-full responsiveText'>
								<input type='text' className="input pr-7" style={{ fontFamily: 'inherit' }} name='deltime'
									value={valueCon.deltime} onChange={handleValue} />
								<button className='absolute right-2 top-1/2 -translate-y-1/2'>
									<X className="size-4 text-[var(--ink-muted)]" onClick={caneclEditText} />
								</button>
							</div>
						}
					</div>
				</div>
			</div>

			<div className={`mt-2 w-full ${panelCls}`}>
				<p className={labelCls}>{getTtl('Payment Terms', ln)}</p>
				<div className='w-full '>
					{!valueCon.isTermPmntText ?
						<Selector arr={[...settings['Payment Terms']['Payment Terms'], { termPmnt: '..Edit Text', id: 'EditTextTermPmnt' }]}
							value={valueCon}
							onChange={(e) => handleChange(e, 'termPmnt')}
							name='termPmnt'
							clear={clear} />
						:
						<div className='flex relative w-full responsiveText'>
							<textarea rows="2" className="input p-1 !rounded-lg resize-none w-full pr-7" style={{ fontFamily: 'inherit' }} name='termPmnt'
								value={valueCon.termPmnt} onChange={handleValue} />
							<button type='button' className='absolute right-2 top-2' onClick={caneclEditTextPmnt}>
								<X className="size-4 text-[var(--ink-muted)]" />
							</button>
						</div>
					}
				</div>
			</div>

			<div className='grid grid-cols-1 md:grid-cols-4 gap-2.5 pt-2'>
				<div className='md:col-span-3'>
					<div className={`w-full ${panelCls}`}>
						<ProductsTable value={valueCon} setValue={setValueCon} currency={settings.Currency.Currency}
							quantityTable={settings.Quantity.Quantity} setShowPoInvModal={setShowPoInvModal}
							setShowStockModal={setShowStockModal} setToast={setToast} contractsData={contractsData}
						/>
					</div>
				</div>
				<div className={`md:col-span-1 ${panelCls}`}>
					<div className='flex flex-col'>
						<p className={labelCls}>{getTtl('Currency', ln)}</p>
						<div className='w-full min-w-0'>
							<Selector arr={settings.Currency.Currency} value={valueCon}
								onChange={(e) => handleChange(e, 'cur')}
								name='cur'
								clear={clear} />
							<ErrDiv field='cur' errors={errors} ln={ln} />
						</div>
					</div>
					<div className='flex flex-col pt-2.5'>
						<p className={labelCls}>{getTtl('Quantity', ln)}</p>
						<div className='w-full min-w-0'>
							<Selector arr={settings.Quantity.Quantity} value={valueCon}
								onChange={(e) => handleChange(e, 'qTypeTable')}
								name='qTypeTable'
								clear={clear} />
						</div>
					</div>
				</div>
			</div>

			<div className='grid grid-cols-1 md:grid-cols-4 gap-2.5 pt-2'>
				<div className='md:col-span-3'>
					<div className={`mt-2 w-full ${panelCls}`}>
						<Remarks settings={settings} value={valueCon} setValue={setValueCon} />
					</div>
					<div className={`mt-2 w-full ${panelCls}`}>
						<PriceRemarks value={valueCon} setValue={setValueCon} />
					</div>
				</div>
				<div className={`md:col-span-1 mt-2 ${panelCls}`}>
					<p className={labelCls}>{getTtl('Comments', ln)}</p>
					<textarea rows="5" name="comments"
						className="input h-24 p-1 !rounded-lg resize-none w-full"
						style={{ fontFamily: 'inherit' }}
						value={valueCon.comments} onChange={handleValue} />
					<div className='flex leading-7 items-center gap-2 mt-2'>
						<CheckBox size='size-5' checked={valueCon.completed ?? false}
							onChange={() => setValueCon({ ...valueCon, completed: !valueCon.completed })} />
						<span className='responsiveText'>Contract completed</span>
					</div>
				</div>

			</div>



			<div className="sticky bottom-0 z-sticky bg-[var(--bg-card)] mt-3 flex flex-wrap justify-end gap-2 pt-3 pb-2 border-t border-[var(--line)]">
				<Tltip direction='top' tltpText='Preview the PO exactly as the supplier receives it — no download'>
						<button
							className="whiteButton py-1"
							onClick={openPoPreview}
						>
							<BtnIcon action="preview" />
							Preview
						</button>
					</Tltip>
					{valueCon.id !== '' && (
						<Tltip direction='top' tltpText='View the activity / change history for this contract'>
							<button className="whiteButton py-1" onClick={() => setShowHistory(true)}>
								<BtnIcon action="history" />
								History
							</button>
						</Tltip>
					)}
					{valueCon.id !== '' && (
						<Tltip direction='top' tltpText='Comments & team discussion for this contract'>
							<button className="whiteButton py-1" onClick={() => setShowComments(true)}>
								<BtnIcon action="comments" />
								Comments
							</button>
						</Tltip>
					)}
					{/* buildPoTable, not a second copy of it: this button carried its own
					    inline version that predated per-content pricing, so it read the
					    (empty) unit price and printed $0.00 where Preview correctly showed
					    the content basis or "See below*" — the same PO produced two
					    different PDFs depending on which button you pressed. */}
					<Tltip direction='top' tltpText='Create PDF document'>
					<button
						className="whiteButton py-1"
						onClick={() => Pdf(valueCon, buildPoTable(), settings, compData, gisAccount)}
					>
						<BtnIcon action="pdf" />
						PDF
					</button>
				</Tltip>
				<Tltip direction='top' tltpText='Contracts storage'>
					<button
						className={`whiteButton py-1 ${!valueCon.id ? 'opacity-50 cursor-not-allowed' : ''}`}
						onClick={() => setShowFilesModal(true)}
						disabled={!valueCon.id}
					>
						<BtnIcon action="attachments" />
						{getTtl('Attachments', ln)}
					</button>
				</Tltip>
				{/* Destructive action sits far left, away from Save. mr-auto on the
				    wrapper pushes every following control to the right edge. */}
				{valueCon.id !== '' &&
					<span className="mr-auto">
						<Tltip direction='top' tltpText='Delete Contract'>
							<button
								className="whiteButton py-1 !text-[var(--bad-text)] hover:!bg-[var(--bad-bg)] hover:!border-[var(--bad-border)]"
								onClick={() => setIsDeleteOpen(true)}
							>
								<BtnIcon action="delete" />
								{getTtl('Delete', ln)}
							</button>
						</Tltip>
					</span>
				}
				{valueCon.id !== '' && showButton &&
					<Tltip direction='top' tltpText='Duplicate Contract'>
						<button
							className="whiteButton py-1 flex"
							onClick={() => setIsDuplicateOpen(true)}
						>
							<BtnIcon action="duplicate" />
							{getTtl('Duplicate Contract', ln)}
						</button>
					</Tltip>
				}
				<Tltip direction='top' tltpText='Create Final Settlement Invoice'>
					<button
						className="whiteButton py-1 flex"
						onClick={() => setShowFinalSettlmntModal(true)}
					>
						<BtnIcon action="settlement" />
						{getTtl('FinalSettlmnt', ln)}
					</button>
				</Tltip>
				<Tltip direction='top' tltpText={`Copy contract to ${!gisAccount ? "GIS" : "IMS"}`}>
					<button
						className="whiteButton py-1 flex"
						onClick={() => CopyIMSGIS()}
					>
						<BtnIcon action="copy" />
						{!gisAccount ? "Copy to GIS" : "Copy to IMS"}
					</button>
				</Tltip>
				<Tltip direction='top' tltpText='Drop a supplier proforma / contract PDF to pre-fill this form. For supplier invoices billing an existing contract, use the Expense form (Expenses tab) — that flow also auto-reconciles against the contract.'>
					<button
						className="whiteButton py-1 flex"
						onClick={() => setShowDocImport(true)}
					>
						<BtnIcon action="autofill" />
						Autofill from supplier proforma
					</button>
				</Tltip>
				{valueCon.id !== '' && (
					<Tltip direction='top' tltpText="Create a draft sales invoice pre-filled with this contract's products, currency and shipment terms. You can then add the client + invoice number on the Invoices tab.">
						<button
							className="whiteButton py-1 flex"
							onClick={createInvoiceFromContract}
						>
							<BtnIcon action="invoice" />
							Invoice from this contract
						</button>
					</Tltip>
				)}
				<Tltip direction='top' tltpText='Close form'>
					<button
						className="whiteButton py-1"
						onClick={() => setIsOpenCon(false)}
					>
						<BtnIcon action="close" />
						{getTtl('Close', ln)}
					</button>
				</Tltip>
				<Tltip direction='top' tltpText='Save/Update contract'>
					<button
						className="blackButton py-1 disabled:opacity-50 disabled:cursor-not-allowed"
						onClick={btnClck}
						disabled={isButtonDisabled}
					>
						<BtnIcon action={isButtonDisabled ? 'saving' : 'save'} spin={isButtonDisabled} />
						{isButtonDisabled ? getTtl('saving', ln) : getTtl('save', ln)}
					</button>
				</Tltip>
			</div>
			{showDocImport && (
				<DocumentImportOverlay
					documentType='contract'
					suppliers={settings.Supplier?.Supplier || []}
					clients={[]}
					currencies={settings.Currency?.Currency || []}
					onApply={(fields) => {
						setValueCon(prev => ({ ...prev, ...fields }));
						const labels = Object.keys(fields || {}).map(k => ({
							order: 'PO No', supplier: 'Supplier', cur: 'Currency',
							productsData: 'Products', comments: 'Comments', date: 'Date', dateRange: 'Date',
						}[k])).filter(Boolean);
						const uniq = [...new Set(labels)];
						setToast({
							show: true,
							text: uniq.length
								? `Applied to the form: ${uniq.join(', ')}. Review the fields, then click Save to store the contract.`
								: 'Nothing applied — no fields matched. If supplier/currency showed "no match", pick them manually.',
							clr: uniq.length ? 'success' : 'fail',
						});
					}}
					onClose={() => setShowDocImport(false)}
				/>
			)}
			<ModalToDelete isDeleteOpen={isDeleteOpen} setIsDeleteOpen={setIsDeleteOpen}
				ttl={getTtl('delConfirmation', ln)} txt={getTtl('delConfirmationTxtContract', ln)}
				details={<DeletionSummary con={valueCon} />}
				doAction={() => delContract(uidCollection)} />
			{pdfPreview && (
				<PdfPreview
					blob={pdfPreview.blob}
					filename={pdfPreview.filename}
					title={pdfPreview.filename}
					onClose={() => setPdfPreview(null)}
				/>
			)}
			<ModalToDelete isDeleteOpen={isDuplicateOpen} setIsDeleteOpen={setIsDuplicateOpen}
				ttl={getTtl('Duplicate Contract', ln)} txt={getTtl('duplicateConfirmationTxt', ln)}
				doAction={() => duplicate(uidCollection)} />
			{showHistory && (
				<Modal isOpen={showHistory} setIsOpen={setShowHistory} title='Activity / History' size='md'>
					<ActivityLog entityType='contract' entityId={valueCon.id} />
				</Modal>
			)}
			{showComments && (
				<Modal isOpen={showComments} setIsOpen={setShowComments} title={`Comments — PO ${valueCon.order ?? ''}`} size='md'>
					<CommentThread entityType='contract' entityId={valueCon.id} entityLabel={`PO ${valueCon.order ?? ''}`} />
				</Modal>
			)}

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
