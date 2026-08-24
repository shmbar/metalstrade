'use client';import { useContext, useEffect, useState, useMemo, useRef } from 'react';

import { NumericFormat } from 'react-number-format';
import { useRouter } from 'next/navigation';
import dateFormat from 'dateformat';
import { NameCell } from '../../../components/Avatar';
import Customtable from '../contracts/newTable';
import MyDetailsModal from './modals/dataModal.js';
import { SettingsContext } from "../../../contexts/useSettingsContext";
import { SalesContractsContext } from "../../../contexts/useSalesContractsContext";
import { UserAuth } from "../../../contexts/useAuthContext";
import { loadData } from '../../../utils/utils';
import { getTtl } from '../../../utils/languages';
import Toast from '../../../components/toast.js';
import { TableSkeleton } from "../../../components/skeletons";
import Tltip from '../../../components/tlTip';
import { TbLayoutGridAdd } from "react-icons/tb";
import { invoiceQtyBySalesContract } from '../../../utils/salesLink';

// Total contracted weight of a sales contract = sum of its product-line quantities.
const contractQty = (c) => (c.productsData || []).reduce((s, r) => s + (parseFloat(r.qnty) || 0), 0);

// Shipped weight now comes from utils/salesLink, which splits an invoice's line
// quantities across the client POs those lines are sold against. The local
// whole-invoice invoiceQty() it replaced could only credit one contract.

const SalesContracts = () => {

    const { settings, dateSelect, setDateYr, setLoading, ln } = useContext(SettingsContext);
    const { valueSC, setValueSC, salesContractsData, setSalesContractsData,
        isOpenSC, setIsOpenSC, addSalesContract } = useContext(SalesContractsContext);
    const { uidCollection } = UserAuth();
    const router = useRouter();
    /* Rows open on double-click (contracts/newTable.js), but the Purchase Contract cell is a
       link that navigates on single click — so double-clicking that one cell fired the link
       AND opened the row, landing you on /contracts instead of on the sales contract. Hold the
       navigation for one double-click interval and drop it if a second click arrives. */
    const poNavTimer = useRef(null);
    useEffect(() => () => clearTimeout(poNavTimer.current), []);

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
                        <button type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                clearTimeout(poNavTimer.current);
                                poNavTimer.current = setTimeout(() => router.push(`/contracts?openId=${link.id}`), 250);
                            }}
                            onDoubleClick={() => clearTimeout(poNavTimer.current)}
                            title={link.derived ? 'From the sales invoice this contract shipped under' : 'Linked on this sales contract'}
                            className="underline underline-offset-2"
                            style={{ color: 'var(--chathams-blue)', fontWeight: 500, fontStyle: link.derived ? 'italic' : 'normal' }}>
                            {link.order}
                        </button>
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
                cell: (props) => <span>{gQ(props.getValue(), 'Currency', 'cur')}</span>,
                meta: { excludeFromQuickSum: true }
            },
            {
                id: 'qty', header: getTtl('Quantity', ln),
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
                id: 'shipped', header: 'Shipped',
                accessorFn: (c) => shippedByContract[c.id] || 0,
                cell: (props) => <NumericFormat value={props.getValue()} displayType="text" thousandSeparator decimalScale={3} fixedDecimalScale />,
            },
            {
                id: 'remaining', header: 'Remaining to ship',
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
                    return v
                        ? <span className="block max-w-40 truncate mx-auto" title={v} style={{ color: 'var(--chathams-blue)', fontWeight: 500 }}>{v}</span>
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
    }, [settings, ln, shippedByContract, invoicesByContract, poById, poFromInvoices, router]);

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
                                            <TbLayoutGridAdd className="w-3.5 h-3.5 flex-shrink-0" />
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
                    </>
                }
            </div>
        </div>
    );
};

export default SalesContracts;
