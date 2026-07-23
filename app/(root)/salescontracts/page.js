'use client';
import { useContext, useEffect, useState, useMemo } from 'react';
import { TbLayoutGridAdd } from 'react-icons/tb';
import { NumericFormat } from 'react-number-format';
import dateFormat from 'dateformat';
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

// Total contracted weight of a sales contract = sum of its product-line quantities.
const contractQty = (c) => (c.productsData || []).reduce((s, r) => s + (parseFloat(r.qnty) || 0), 0);

// Shipped weight on an invoice = sum of its line quantities (service lines 's' excluded).
const invoiceQty = (inv) => (inv.productsDataInvoice || [])
    .reduce((s, r) => s + (r.qnty === 's' ? 0 : (parseFloat(r.qnty) || 0)), 0);

const SalesContracts = () => {

    const { settings, dateSelect, setDateYr, setLoading, ln } = useContext(SettingsContext);
    const { valueSC, setValueSC, salesContractsData, setSalesContractsData,
        isOpenSC, setIsOpenSC, addSalesContract } = useContext(SalesContractsContext);
    const { uidCollection } = UserAuth();

    const [filteredData, setFilteredData] = useState([]);
    const [highlightId, setHighlightId] = useState(null);
    // Shipped weight per sales-contract id, derived from linked invoices.
    const [shippedByContract, setShippedByContract] = useState({});
    // Invoice numbers the contract was shipped with (FN/CN suffixed), same source.
    const [invoicesByContract, setInvoicesByContract] = useState({});

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
            // invoiced quantity per linked sales-contract id.
            const years = dt.map(c => (c.dateRange?.startDate || c.date || '').substring(0, 4)).filter(Boolean);
            const map = {};
            const invMap = {};
            const suffix = (t) => (t === '1111' || t === 'Invoice' || !t) ? '' : (t === '2222' || t === 'Credit Note') ? 'CN' : 'FN';
            if (years.length) {
                const minY = Math.min(...years.map(Number));
                const maxY = Math.max(...years.map(Number));
                const invoices = await loadData(uidCollection, 'invoices', { start: `${minY}-01-01`, end: `${maxY}-12-31` });
                invoices
                    .filter(inv => inv.salesContractId && !inv.canceled)
                    .forEach(inv => {
                        map[inv.salesContractId] = (map[inv.salesContractId] || 0) + invoiceQty(inv);
                        if (inv.invoice !== undefined && inv.invoice !== '') {
                            (invMap[inv.salesContractId] ||= []).push(`${inv.invoice}${suffix(inv.invType)}`);
                        }
                    });
            }
            setShippedByContract(map);
            setInvoicesByContract(invMap);
            setLoading(false);
        };
        Load();
    }, [dateSelect, uidCollection]);

    const propDefaults = useMemo(() => {
        if (Object.keys(settings).length === 0) return [];
        return [
            { accessorKey: 'contractNo', header: 'Contract #', meta: { excludeFromQuickSum: true } },
            {
                accessorKey: 'client', header: getTtl('Consignee', ln),
                cell: (props) => <span>{gQ(props.getValue(), 'Client', 'nname') || gQ(props.getValue(), 'Client', 'client')}</span>,
                meta: { excludeFromQuickSum: true }
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
                    return <span style={{ color: v > 0.0001 ? '#b45309' : '#15803d', fontWeight: 600 }}>
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
                    const tone = v === 'Fully shipped' ? ['#dcfce7', '#166534', '#bbf7d0']
                        : v === 'Partial' ? ['#dbeafe', '#1e40af', '#bfdbfe']
                            : ['#fef9c3', '#92400e', '#fde68a'];
                    return <span className="rounded-full responsiveTextTable font-medium" style={{
                        background: tone[0], color: tone[1], border: `1px solid ${tone[2]}`, padding: '2px 12px', whiteSpace: 'nowrap'
                    }}>{v}</span>;
                },
                enableColumnFilter: false,
            },
        ];
    }, [settings, ln, shippedByContract, invoicesByContract]);

    const invisible = {};

    const SelectRow = (row) => {
        const itm = salesContractsData.find(x => x.id === row.id) || row;
        setValueSC(itm);
        setDateYr(itm.dateRange?.startDate?.substring(0, 4));
        setIsOpenSC(true);
    };

    return (
        <div className="w-full" style={{ background: "#f8fbff" }}>
            <div className="mx-auto w-full max-w-full px-1 md:px-2 pb-4 mt-[72px]">
                {Object.keys(settings).length === 0 ? <TableSkeleton /> :
                    <>
                        <Toast />
                        <div className="rounded-2xl p-3 sm:p-5 mt-8 border border-[#b8ddf8] w-full bg-[#f8fbff]">
                            <div className='flex items-center justify-between flex-wrap gap-2 pb-2'>
                                <h1 className="text-[var(--chathams-blue)] responsiveTextTitle font-medium border-l-4 border-[var(--chathams-blue)] pl-2">
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
