'use client';import { useContext, useEffect, useState, useMemo, useCallback } from 'react';

import { NumericFormat } from 'react-number-format';
import { useRouter } from 'next/navigation';
import dateFormat from 'dateformat';
import { NameCell } from '../../../components/Avatar';
import Customtable from '../contracts/newTable';
import MyDetailsModal from './modals/dataModal.js';
import PurchaseContractModal from '../contracts/modals/dataModal.js';
import { SettingsContext } from "../../../contexts/useSettingsContext";
import { SalesContractsContext } from "../../../contexts/useSalesContractsContext";
import { ContractsContext } from "../../../contexts/useContractsContext";
import { InvoiceContext } from "../../../contexts/useInvoiceContext";
import { ExpensesContext } from "../../../contexts/useExpensesContext";
import { UserAuth } from "../../../contexts/useAuthContext";
import { loadData, loadDocsByIdBatched } from '../../../utils/utils';
import { getTtl } from '../../../utils/languages';
import Toast from '../../../components/toast.js';
import { TableSkeleton } from "../../../components/skeletons";
import Tltip from '../../../components/tlTip';
import TruncatedCell from '@components/table/TruncatedCell';
import { ExternalLink } from 'lucide-react';
import { invoiceQtyBySalesContract } from '../../../utils/salesLink';
import { BtnIcon } from '@components/buttonIcons';
import CurrencyChip from '@components/CurrencyChip';

// Total contracted weight of a sales contract = sum of its product-line quantities.
const contractQty = (c) => (c.productsData || []).reduce((s, r) => s + (parseFloat(r.qnty) || 0), 0);

// Shipped weight now comes from utils/salesLink, which splits an invoice's line
// quantities across the client POs those lines are sold against. The local
// whole-invoice invoiceQty() it replaced could only credit one contract.

const SalesContracts = () => {

    const { settings, dateSelect, setDateYr, setLoading, ln } = useContext(SettingsContext);
    const { valueSC, setValueSC, salesContractsData, setSalesContractsData,
        isOpenSC, setIsOpenSC, addSalesContract } = useContext(SalesContractsContext);
    const { valueCon, setValueCon, isOpenCon, setIsOpenCon, setContractsData } = useContext(ContractsContext);
    const { blankInvoice, setIsInvCreationCNFL } = useContext(InvoiceContext);
    const { blankExpense } = useContext(ExpensesContext);
    const { uidCollection } = UserAuth();
    const router = useRouter();
    /* Rows open on double-click (contracts/newTable.js), and the Purchase Contract cell used
       to be a link that navigated on single click — so one gesture over that cell had two
       meanings and the cell had to guess which it was. It guessed by holding the navigation
       for 250ms and dropping it if a second click arrived, but Windows' GetDoubleClickTime
       defaults to 500ms and Chrome takes the OS value: an ordinary double-click there
       navigated before its second click had even landed, so the sales-contract popup opened
       and was instantly thrown away by a navigation already in flight. That is the "it jumps
       back to Contracts" report.

       A longer hold only moves the edge. The interval is a user setting with no API to read,
       so every timeout is a guess that some machine loses — measured with real mouse events,
       a 500ms hold still navigated on a 450ms double-click — and each correct guess costs
       half a second of lag on an ordinary link click.

       So the gesture is no longer ambiguous: the PO number is now plain text, double-
       clickable like every other cell, and the link control moved onto its own small button
       beside it. A click there means one thing only, it happens immediately, and it
       swallows dblclick so it can never open the row as well. No timer, no race.

       That control no longer navigates, either. Routing to /contracts?openId= tore the user
       off this page — the table, its filters and the date range all reloaded — just to read
       one PO, which still read as "it jumps back to Contracts". The purchase-contract popup
       is the same shared ContractsContext modal the Contracts page renders, so it opens here
       instead, over the sales-contract table, and closing it leaves the page exactly as it
       was. Navigation survives only as the fallback for a PO outside the loaded window that
       cannot be fetched by id. */

    const [filteredData, setFilteredData] = useState([]);
    const [highlightId, setHighlightId] = useState(null);
    // Shipped weight per sales-contract id, derived from linked invoices.
    const [shippedByContract, setShippedByContract] = useState({});
    // Invoice numbers the contract was shipped with (FN/CN suffixed), same source.
    const [invoicesByContract, setInvoicesByContract] = useState({});
    // Purchase contracts in range, by id — resolves a linked PO's current order number
    // and supplier instead of trusting what was denormalized at link time.
    const [poById, setPoById] = useState({});
    // Fallback source of the PO link: the one the contract actually shipped under, per
    // its sales invoices. Only reaches the table when no PO was linked by hand.
    const [poFromInvoices, setPoFromInvoices] = useState({});

    const gQ = (z, y, x) => settings?.[y]?.[y]?.find(q => q.id === z)?.[x] || '';

    useEffect(() => {
        const Load = async () => {
            if (!uidCollection) return;
            setLoading(true);
            const dt = await loadData(uidCollection, 'salescontracts', dateSelect);
            setSalesContractsData(dt);
            setFilteredData(dt);

            // Derive shipped quantities: load invoices across the year(s) the contracts span
            // (their shipments may fall in a later month than the contract date) and total the
            // invoiced quantity per linked sales-contract id. The same pass records the first
            // PO an invoice shipped under, which stands in for the manual link when there is
            // none, and the purchase contracts themselves resolve that PO to a supplier.
            const years = dt.map(c => (c.dateRange?.startDate || c.date || '').substring(0, 4)).filter(Boolean);
            const map = {};
            const invMap = {};
            const poMap = {};
            const conMap = {};
            const suffix = (t) => (t === '1111' || t === 'Invoice' || !t) ? '' : (t === '2222' || t === 'Credit Note') ? 'CN' : 'FN';
            if (years.length) {
                const minY = Math.min(...years.map(Number));
                const maxY = Math.max(...years.map(Number));
                // Purchase contracts reach back an extra year: cargo bought late one year and
                // sold on early the next is the normal case, and its PO has to resolve here.
                const [invoices, purchaseContracts] = await Promise.all([
                    loadData(uidCollection, 'invoices', { start: `${minY}-01-01`, end: `${maxY}-12-31` }),
                    loadData(uidCollection, 'contracts', { start: `${minY - 1}-01-01`, end: `${maxY}-12-31` }),
                ]);
                // An invoice can cover more than one client PO, with the split recorded on
                // its LINES, so shipped tonnage is credited per line rather than dumping
                // the invoice total onto a single contract. utils/salesLink falls back to
                // the invoice-level link for untagged rows, so an invoice that has not
                // been split still lands entirely on the same contract as before.
                invoices
                    .filter(inv => inv && !inv.canceled)
                    .forEach(inv => {
                        const byScTmp = invoiceQtyBySalesContract(inv);
                        for (const scId of Object.keys(byScTmp)) {
                            map[scId] = (map[scId] || 0) + byScTmp[scId];
                            if (inv.invoice !== undefined && inv.invoice !== '') {
                                const label = `${inv.invoice}${suffix(inv.invType)}`;
                                // One invoice number per contract even when several of its
                                // lines point at the same PO.
                                const list = (invMap[scId] ||= []);
                                if (!list.includes(label)) list.push(label);
                            }
                            if (inv.poSupplier?.id && !poMap[scId]) {
                                poMap[scId] = inv.poSupplier;
                            }
                        }
                    });
                (purchaseContracts || []).forEach(c => { if (c?.id) conMap[c.id] = c; });
            }
            setShippedByContract(map);
            setInvoicesByContract(invMap);
            setPoFromInvoices(poMap);
            setPoById(conMap);
            setLoading(false);
        };
        Load();
    }, [dateSelect, uidCollection]);

    /* Opens a linked purchase contract in the Contracts popup without leaving this page.
       The modal reads the shared ContractsContext, so the whole selection the Contracts page
       makes has to be reproduced here — including contractsData, which is not cosmetic:
       useContractsState.saveData decides "new or existing" by looking the open contract up in
       that list, so an empty one would save an edited PO under a fresh uuid. The POs this page
       already loaded are the list. */
    const openPurchaseContract = useCallback(async (link) => {
        let con = poById[link.id];
        // A PO outside this page's window (an invoice can point at one) is fetched by id —
        // the link carries the date the year-partitioned collection needs to find it.
        if (!con && link.date) {
            const index = await loadDocsByIdBatched(uidCollection, 'contracts', [{ id: link.id, date: link.date }]);
            con = index[link.id];
        }
        if (!con) { router.push(`/contracts?openId=${link.id}`); return; }

        const others = Object.values(poById).filter(c => c.id !== con.id);
        setContractsData([...others, con]);
        setValueCon(con.finalSRemarks == null ? { ...con, finalSRemarks: [] } : con);
        setDateYr(con.dateRange?.startDate?.substring(0, 4));
        blankInvoice();
        blankExpense();
        setIsInvCreationCNFL(false);
        setIsOpenCon(true);
    }, [poById, uidCollection, router, setContractsData, setValueCon, setDateYr,
        blankInvoice, blankExpense, setIsInvCreationCNFL, setIsOpenCon]);

    /* Editing the PO in that popup — its order number above all — has to show in the column
       that opened it. Navigating used to hide this: you came back to a page that had reloaded.
       Staying put means the row would otherwise keep the number the PO had before the edit
       until the next load, so the closed popup folds its contract back into the map. */
    useEffect(() => {
        if (isOpenCon) return;
        setPoById(prev => (valueCon?.id && prev[valueCon.id]) ? { ...prev, [valueCon.id]: valueCon } : prev);
    }, [isOpenCon]);

    const propDefaults = useMemo(() => {
        if (Object.keys(settings).length === 0) return [];

        // Where the cargo came from: the PO linked by hand on the sales contract, falling
        // back to the one its sales invoices shipped under. `derived` marks that second
        // case so a hand-made link is never confused with one the invoices inferred.
        const poLinkFor = (c) => {
            const manual = c.poSupplier?.id ? c.poSupplier : null;
            const src = manual || poFromInvoices[c.id];
            if (!src?.id) return null;
            const con = poById[src.id];
            return {
                id: src.id,
                order: con?.order || src.order || '',
                // Which year-partition the PO lives in, for the fetch-by-id fallback.
                date: con?.dateRange?.startDate || con?.date || src.date || '',
                supplier: gQ(con?.supplier || src.supplier, 'Supplier', 'nname'),
                derived: !manual,
            };
        };

        return [
            { accessorKey: 'contractNo', header: 'Contract #', meta: { excludeFromQuickSum: true } },
            {
                accessorKey: 'client', header: getTtl('Consignee', ln),
                cell: (props) => <NameCell name={gQ(props.getValue(), 'Client', 'nname') || gQ(props.getValue(), 'Client', 'client')} />,
                meta: {
                    excludeFromQuickSum: true,
                    // The row stores a client ID, and labelAwareGlobalFilter resolves an id to
                    // its label ONLY through meta.options. Without these the global search was
                    // matching against the raw id, so typing a buyer's name returned nothing —
                    // the reported "why can't we search sales POs by buyer/consignee?".
                    options: (settings.Client?.Client ?? [])
                        .filter(c => c && c.id)
                        .map(c => ({ value: c.id, label: c.nname || c.client || '' })),
                    // …and a proper per-column dropdown, the same control the Invoices and
                    // Invoices Review tables already give this field.
                    filterVariant: 'selectClient',
                },
            },
            {
                id: 'poOrder', header: 'Purchase Contract',
                accessorFn: (c) => poLinkFor(c)?.order || '',
                cell: (props) => {
                    const link = poLinkFor(props.row.original);
                    if (!link?.order) return <span style={{ color: 'var(--regent-gray)' }}>—</span>;
                    return (
                        <span className="inline-flex items-center gap-1">
                            {/* Text, not a control: this has to stay double-clickable so the row
                                still opens the sales contract from here like it does anywhere
                                else. Italic still marks a link the invoices inferred. */}
                            <Tltip direction='top' tltpText={link.derived ? 'From the sales invoice this contract shipped under' : 'Linked on this sales contract'}>
                                <span style={{ color: 'var(--chathams-blue)', fontWeight: 500, fontStyle: link.derived ? 'italic' : 'normal' }}>
                                    {link.order}
                                </span>
                            </Tltip>
                            <Tltip direction='top' tltpText={`Open purchase contract ${link.order}`}>
                                <button type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        openPurchaseContract(link);
                                    }}
                                    /* Stops the row seeing a double-click on this control, so it can
                                       never navigate and open the popup at the same time. */
                                    onDoubleClick={(e) => e.stopPropagation()}
                                    aria-label={`Open purchase contract ${link.order}`}
                                    className="shrink-0 rounded p-0.5 transition-colors hover:bg-[var(--bg-subtle)]"
                                    style={{ color: 'var(--endeavour)' }}>
                                    <ExternalLink className="w-3 h-3" />
                                </button>
                            </Tltip>
                        </span>
                    );
                },
                meta: { excludeFromQuickSum: true },
            },
            {
                id: 'supplier', header: getTtl('Supplier', ln),
                accessorFn: (c) => poLinkFor(c)?.supplier || '',
                cell: (props) => (
                    <NameCell
                        name={props.getValue()}
                        fallback={<span style={{ color: 'var(--regent-gray)' }}>—</span>}
                    />
                ),
                meta: { excludeFromQuickSum: true },
            },
            {
                accessorKey: 'date', header: getTtl('Date', ln),
                cell: (props) => <span>{props.getValue() ? dateFormat(props.getValue(), 'dd.mm.yy') : ''}</span>,
                meta: { filterVariant: 'dates' }, filterFn: 'dateBetweenFilterFn'
            },
            {
                accessorKey: 'cur', header: getTtl('Currency', ln),
                cell: (props) => <CurrencyChip cur={props.getValue()} />,
                meta: { excludeFromQuickSum: true }
            },
            {
                id: 'qty', header: getTtl('Quantity', ln), meta: { money: false },
                accessorFn: (c) => contractQty(c),
                cell: (props) => <NumericFormat value={props.getValue()} displayType="text" thousandSeparator decimalScale={3} fixedDecimalScale />,
            },
            {
                id: 'total', header: getTtl('Total Amount', ln),
                accessorFn: (c) => (c.productsData || []).reduce((s, r) => s + (parseFloat(r.qnty) || 0) * (parseFloat(r.unitPrc) || 0), 0),
                cell: (props) => <NumericFormat value={props.getValue()} displayType="text" thousandSeparator
                    prefix={props.row.original.cur === 'us' ? '$' : props.row.original.cur === 'eu' ? '€' : ''} decimalScale={2} fixedDecimalScale />,
            },
            {
                id: 'shipped', header: 'Shipped', meta: { money: false },
                accessorFn: (c) => shippedByContract[c.id] || 0,
                cell: (props) => <NumericFormat value={props.getValue()} displayType="text" thousandSeparator decimalScale={3} fixedDecimalScale />,
            },
            {
                id: 'remaining', header: 'Remaining to ship', meta: { money: false },
                accessorFn: (c) => contractQty(c) - (shippedByContract[c.id] || 0),
                cell: (props) => {
                    const v = props.getValue();
                    return <span style={{ color: v > 0.0001 ? 'var(--warn-text)' : 'var(--ok-text)', fontWeight: 600 }}>
                        <NumericFormat value={v} displayType="text" thousandSeparator decimalScale={3} fixedDecimalScale />
                    </span>;
                },
            },
            {
                id: 'shippedInvoices', header: 'Sales Invoices',
                accessorFn: (c) => (invoicesByContract[c.id] || []).join(', '),
                cell: (props) => {
                    const v = props.getValue();
                    // Was `max-w-40 truncate` inside an always-on tooltip: a 160px cap
                    // cannot know how wide the column ended up, so an invoice number
                    // ellipsized — and raised a tooltip — in a column with room for it.
                    // TruncatedCell truncates at the COLUMN's width, tooltips only when
                    // the text really does not fit, and lets the value be copied.
                    return v
                        ? <TruncatedCell value={v} className="text-center"
                            style={{ color: 'var(--chathams-blue)', fontWeight: 500 }} />
                        : <span style={{ color: 'var(--regent-gray)' }}>—</span>;
                },
                enableColumnFilter: false,
                meta: { excludeFromQuickSum: true },
            },
            {
                id: 'shipStatus', header: getTtl('Status', ln),
                accessorFn: (c) => {
                    const qty = contractQty(c);
                    const shipped = shippedByContract[c.id] || 0;
                    if (qty > 0 && shipped >= qty - 0.0001) return 'Fully shipped';
                    if (shipped > 0.0001) return 'Partial';
                    return 'Outstanding';
                },
                cell: (props) => {
                    const v = props.getValue();
                    const tone = v === 'Fully shipped' ? ['var(--ok-bg)', 'var(--ok-text)', 'var(--ok-border)']
                        : v === 'Partial' ? ['var(--brand-soft)', 'var(--brand-strong)', 'var(--brand-border)']
                            : ['var(--warn-bg)', 'var(--warn-text)', 'var(--warn-border)'];
                    return <span className="rounded-full responsiveTextTable font-medium" style={{
                        background: tone[0], color: tone[1], border: `1px solid ${tone[2]}`, padding: '2px 12px', whiteSpace: 'nowrap'
                    }}>{v}</span>;
                },
                enableColumnFilter: false,
            },
        ];
    }, [settings, ln, shippedByContract, invoicesByContract, poById, poFromInvoices, openPurchaseContract]);

    const invisible = {};

    const SelectRow = (row) => {
        const itm = salesContractsData.find(x => x.id === row.id) || row;
        setValueSC(itm);
        setDateYr(itm.dateRange?.startDate?.substring(0, 4));
        setIsOpenSC(true);
    };

    return (
        <div className="w-full" style={{ background: "var(--bg-subtle)" }}>
            <div className="mx-auto w-full max-w-full px-1 md:px-2 pb-4 mt-[72px]">
                {Object.keys(settings).length === 0 ? <TableSkeleton /> :
                    <>
                        <Toast />
                        <div className="page-card rounded-2xl p-3 sm:p-5 mt-8 border border-[var(--line)] shadow-card w-full bg-[var(--bg-card)]">
                            <div className='flex items-center justify-between flex-wrap gap-2 pb-2'>
                                <h1 className="text-display">
                                    Sales Contracts
                                </h1>
                            </div>

                            <Customtable
                                data={salesContractsData.slice().sort((a, b) => (b.contractNo || '').localeCompare(a.contractNo || '', undefined, { numeric: true }))}
                                columns={propDefaults}
                                SelectRow={SelectRow}
                                invisible={invisible}
                                setFilteredData={setFilteredData}
                                highlightId={highlightId}
                                extraActions={
                                    <Tltip direction='bottom' tltpText='Create new sales contract'>
                                        <button type="button" onClick={addSalesContract} className="whiteButton whitespace-nowrap">
                                            <BtnIcon action="newRecord" />
                                            <span>New Sales Contract</span>
                                        </button>
                                    </Tltip>
                                }
                            />
                        </div>

                        {valueSC && (
                            <MyDetailsModal
                                isOpen={isOpenSC}
                                setIsOpen={setIsOpenSC}
                                title={!valueSC.id ? 'New Sales Contract' : `Sales Contract: ${valueSC.contractNo}`}
                            />
                        )}

                        {/* The linked purchase contract, opened over this page instead of on
                            /contracts. Same component and same context the Contracts page uses,
                            so every tab in it — invoices, shipments, inventory — behaves
                            identically; only the page underneath is different. */}
                        {valueCon && (
                            <PurchaseContractModal
                                isOpen={isOpenCon}
                                setIsOpen={setIsOpenCon}
                                title={`${getTtl('Contract No', ln)}: ${valueCon.order}`}
                            />
                        )}
                    </>
                }
            </div>
        </div>
    );
};

export default SalesContracts;
