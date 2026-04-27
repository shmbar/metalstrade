'use client';
import { Dialog, DialogContent } from '../../../components/ui/dialog';
import dateFormat from 'dateformat';
import { getD, reOrderTableInv } from '../../../utils/utils';
import { Pdf as InvoicePdf } from '../contracts/modals/pdf/pdfInvoice';
import { FaFilePdf } from 'react-icons/fa';

const getprefixInv = (x) => {
    if (!x?.invType) return '';
    return (x.invType === '1111' || x.invType === 'Invoice') ? '' :
        (x.invType === '2222' || x.invType === 'Credit Note') ? 'CN' : 'FN';
};

const getInvTypeLabel = (x) => {
    if (!x?.invType) return 'Invoice No:';
    return (x.invType === '1111' || x.invType === 'Invoice') ? 'Invoice No:' :
        (x.invType === '2222' || x.invType === 'Credit Note') ? 'Credit Note No:' : 'Final Note No:';
};

const getShipTitle = (shpType) => {
    if (shpType === '323') return 'Container No';
    if (shpType === '434') return 'Truck No';
    if (shpType === '565') return 'Container pls';
    if (shpType === '787') return 'Flight No';
    return 'Ref No';
};

// ── Supplier full document preview ─────────────────────────────────────────────
function SupplierDocPreview({ inv, onClose, settings, gisAccount }) {
    const supps = settings?.Supplier?.Supplier || [];
    const supplier = supps.find(s => s.id === inv.supplier);
    const c = inv.contractData || {};

    const currencyCode = settings?.Currency?.Currency
        ? (getD(settings.Currency.Currency, inv, 'cur') || (inv.cur === 'us' ? 'USD' : 'EUR'))
        : (inv.cur === 'us' ? 'USD' : 'EUR');

    const fmtAmt = (v) => new Intl.NumberFormat('en-US', {
        style: 'currency', currency: currencyCode, minimumFractionDigits: 2,
    }).format(v || 0);

    const fmtQty = (v) => v === 's' ? 'Service' : new Intl.NumberFormat('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(v || 0);
    const fmtNum = (v) => new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(v || 0);

    const products = (c.productsData || []).filter(x => !x.import);
    const hasLinePrices = products.some(p => (p.unitPrc * 1 || 0) > 0);

    const getDescription = (item) => {
        if (item.mtrlStatus === 'select' || item.isSelection) {
            return c.productsData?.find(x => x.id === item.descriptionId)?.description || item.descriptionText || item.description || '';
        }
        return item.descriptionText || item.description || '';
    };

    const invNo = String(inv.invoice || '').padStart(4, '0');
    const invDate = c.date || inv.orderData?.date || '';

    const shipDisplay = settings ? getD(settings.Shipment?.Shipment || [], c, 'shpType') : '';
    const originDisplay = settings ? getD(settings.Origin?.Origin || [], c, 'origin') : '';
    const delTermDisplay = settings ? getD(settings['Delivery Terms']?.['Delivery Terms'] || [], c, 'delTerm') : '';
    const polDisplay = settings ? getD(settings.POL?.POL || [], c, 'pol') : '';
    const podDisplay = settings ? getD(settings.POD?.POD || [], c, 'pod') : '';
    const packingDisplay = settings ? getD(settings.Packing?.Packing || [], c, 'packing') : '';
    const qTypeDisplay = settings ? getD(settings.Quantity?.Quantity || [], c, 'qTypeTable') : 'MT';

    const NetWTKgsTmp = products.filter(q => q.qnty !== 's').reduce((acc, x) => acc + (x.qnty * 1 || 0), 0) * 1000;
    const NetWTKgs = fmtNum(NetWTKgsTmp);
    const TotalGross = fmtNum(c.ttlGross);
    const TotalTarre = fmtNum((c.ttlGross || 0) - NetWTKgsTmp);

    const total = inv.invValue * 1 || 0;
    const paid = inv.pmnt * 1 || 0;
    const balance = inv.blnc != null ? (inv.blnc * 1) : (total - paid);

    const watermark = gisAccount ? '/logo/gisBlur.jpg' : '/logo/imsblur1.jpeg';

    const status = balance === 0 ? 'PAID' : paid > 0 ? 'PARTIALLY PAID' : 'UNPAID';
    const statusBg = balance === 0 ? '#dcfce7' : paid > 0 ? '#fef3c7' : '#fee2e2';
    const statusFg = balance === 0 ? '#16a34a' : paid > 0 ? '#d97706' : '#dc2626';

    const TH = 'text-left text-[10px] font-semibold py-1 px-2';
    const TH_R = 'text-right text-[10px] font-semibold py-1 px-2';
    const TD = 'text-left text-[10px] py-1 px-2 align-top';
    const TD_R = 'text-right text-[10px] py-1 px-2 align-top';

    return (
        <Dialog open={!!inv} onOpenChange={onClose}>
            <DialogContent className="p-0 overflow-hidden flex flex-col" style={{
                maxWidth: 'min(95vw, 860px)',
                maxHeight: '92vh',
                borderRadius: '16px',
                border: '1px solid #d8e8f5',
                boxShadow: '0 24px 80px rgba(3,102,174,0.18)',
                fontFamily: "var(--font-poppins), 'Poppins', sans-serif",
            }}>
                {/* Status ribbon — sits OUTSIDE the document */}
                <div style={{
                    background: '#f8fbff',
                    borderBottom: '1px solid #d8e8f5',
                    padding: '8px 16px 8px 16px',
                    paddingRight: '44px',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    fontSize: '11px',
                    fontFamily: "var(--font-poppins), 'Poppins', sans-serif",
                    flexShrink: 0,
                }}>
                    <div className="flex gap-3 items-center">
                        <span style={{ color: 'var(--regent-gray)', fontWeight: '600', letterSpacing: '0.5px' }}>SUPPLIER INVOICE {invNo}</span>
                        <span style={{ color: '#cbd5e1' }}>•</span>
                        <span><span style={{ color: 'var(--regent-gray)' }}>Paid:</span> <strong style={{ color: 'var(--chathams-blue)' }}>{fmtAmt(paid)}</strong></span>
                        <span style={{ color: '#cbd5e1' }}>•</span>
                        <span><span style={{ color: 'var(--regent-gray)' }}>Balance:</span> <strong style={{ color: balance > 0 ? '#dc2626' : '#16a34a' }}>{fmtAmt(balance)}</strong></span>
                    </div>
                    <span style={{
                        padding: '3px 10px', borderRadius: '12px',
                        fontSize: '10px', fontWeight: '700',
                        background: statusBg, color: statusFg,
                    }}>{status}</span>
                </div>

                <div className="overflow-y-auto flex-1" style={{ background: '#e8eff6' }}>
                    <div className="mx-auto my-4" style={{
                        background: '#fff',
                        width: 'calc(100% - 32px)',
                        maxWidth: '800px',
                        boxShadow: '0 2px 16px rgba(0,0,0,0.10)',
                        borderRadius: '4px',
                        padding: '32px 36px 28px',
                        color: '#203764',
                        position: 'relative',
                    }}>

                        {/* Watermark */}
                        <img src={watermark} alt="" style={{
                            position: 'absolute',
                            top: '55%', left: '50%', transform: 'translate(-50%, -50%)',
                            width: '420px', opacity: 0.07, pointerEvents: 'none', zIndex: 0,
                        }} />

                        <div style={{ position: 'relative', zIndex: 1 }}>

                        {/* Supplier (From) + Invoice details */}
                        <div className="flex justify-between items-start mb-4">
                            <div style={{ minWidth: '200px' }}>
                                <p style={{ fontSize: '10px', fontWeight: '700', borderBottom: '1px solid #203764', display: 'inline-block', paddingBottom: '1px', marginBottom: '4px' }}>
                                    From (Supplier):
                                </p>
                                <p style={{ fontSize: '10px', fontWeight: '700' }}>{supplier?.nname || inv.supplierName || ''}</p>
                                <p style={{ fontSize: '10px' }}>{supplier?.street || ''}</p>
                                <p style={{ fontSize: '10px' }}>{supplier?.city || ''}</p>
                                <p style={{ fontSize: '10px' }}>{supplier?.country || ''}</p>
                                <p style={{ fontSize: '10px' }}>{supplier?.other1 || ''}</p>
                            </div>
                            <div style={{ minWidth: '220px' }}>
                                <table style={{ fontSize: '10px', borderCollapse: 'collapse' }}>
                                    <tbody>
                                        <tr>
                                            <td style={{ fontWeight: '700', paddingRight: '12px', paddingBottom: '3px' }}>Invoice No:</td>
                                            <td style={{ paddingBottom: '3px' }}>{invNo}</td>
                                        </tr>
                                        <tr>
                                            <td style={{ fontWeight: '700', paddingRight: '12px', paddingBottom: '3px' }}>Contract #:</td>
                                            <td style={{ paddingBottom: '3px' }}>{inv.order || ''}</td>
                                        </tr>
                                        <tr>
                                            <td style={{ fontWeight: '700', paddingRight: '12px', paddingBottom: '3px' }}>Date:</td>
                                            <td style={{ paddingBottom: '3px' }}>{invDate ? dateFormat(invDate, 'dd.mm.yy') : ''}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Shipment (from contract) */}
                        {(shipDisplay || originDisplay || delTermDisplay || polDisplay || podDisplay || packingDisplay || c.ttlGross) && (
                            <div style={{ border: '1px solid #c8dff0', borderRadius: '4px', marginBottom: '12px' }}>
                                <table style={{ width: '100%', fontSize: '10px', borderCollapse: 'collapse' }}>
                                    <tbody>
                                        <tr style={{}}>
                                            <td style={{ padding: '4px 10px', fontWeight: '700', width: '14%' }}>Shipment:</td>
                                            <td style={{ padding: '4px 10px', width: '19%' }}>{shipDisplay}</td>
                                            <td style={{ padding: '4px 10px', fontWeight: '700', width: '8%' }}>POL:</td>
                                            <td style={{ padding: '4px 10px', width: '19%' }}>{polDisplay}</td>
                                            <td style={{ padding: '4px 10px', fontWeight: '700', width: '22%' }}>Net WT Kgs:</td>
                                            <td style={{ padding: '4px 10px', textAlign: 'right', width: '18%' }}>{NetWTKgsTmp > 0 ? NetWTKgs : ''}</td>
                                        </tr>
                                        <tr style={{}}>
                                            <td style={{ padding: '4px 10px', fontWeight: '700' }}>Origin:</td>
                                            <td style={{ padding: '4px 10px' }}>{originDisplay}</td>
                                            <td style={{ padding: '4px 10px', fontWeight: '700' }}>POD:</td>
                                            <td style={{ padding: '4px 10px' }}>{podDisplay}</td>
                                            <td style={{ padding: '4px 10px', fontWeight: '700' }}>Tare WT Kgs:</td>
                                            <td style={{ padding: '4px 10px', textAlign: 'right' }}>{c.ttlGross ? TotalTarre : ''}</td>
                                        </tr>
                                        <tr>
                                            <td style={{ padding: '4px 10px', fontWeight: '700' }}>Delivery Terms:</td>
                                            <td style={{ padding: '4px 10px' }}>{delTermDisplay}</td>
                                            <td style={{ padding: '4px 10px', fontWeight: '700' }}>Packing:</td>
                                            <td style={{ padding: '4px 10px' }}>{packingDisplay}</td>
                                            <td style={{ padding: '4px 10px', fontWeight: '700' }}>Gross WT Kgs:</td>
                                            <td style={{ padding: '4px 10px', textAlign: 'right' }}>{c.ttlGross ? TotalGross : ''}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Products from contract */}
                        {products.length > 0 && (
                            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '4px', fontSize: '10px' }}>
                                <thead>
                                    <tr style={{ background: '#096eb6', color: '#fff' }}>
                                        <th className={TH} style={{ width: '5%' }}>#</th>
                                        <th className={TH} style={{ width: hasLinePrices ? '60%' : '78%' }}>Description</th>
                                        <th className={TH_R} style={{ width: hasLinePrices ? '13%' : '17%' }}>Quantity<br />{qTypeDisplay || 'MT'}</th>
                                        {hasLinePrices && <th className={TH_R} style={{ width: '11%' }}>Unit Price<br />{currencyCode}</th>}
                                        {hasLinePrices && <th className={TH_R} style={{ width: '11%' }}>Total<br />{currencyCode}</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {products.map((item, i) => {
                                        const lineTotal = (item.qnty * 1 || 0) * (item.unitPrc * 1 || 0);
                                        return (
                                            <tr key={i}>
                                                <td className={TD}>{i + 1}</td>
                                                <td className={TD}>{getDescription(item)}</td>
                                                <td className={TD_R}>{fmtQty(item.qnty)}</td>
                                                {hasLinePrices && <td className={TD_R}>{fmtAmt(item.unitPrc)}</td>}
                                                {hasLinePrices && <td className={TD_R}>{fmtAmt(lineTotal)}</td>}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}

                        {/* Invoice total — matches PDF (just Total Amount) */}
                        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '8px', fontSize: '10px' }}>
                            <tbody>
                                <tr>
                                    <td colSpan={3} />
                                    <td className={TD_R} style={{ fontWeight: '700', paddingTop: '6px', borderTop: '1px solid #203764', width: '15%' }}>Total Amount:</td>
                                    <td className={TD_R} style={{ fontWeight: '700', paddingTop: '6px', borderTop: '1px solid #203764', width: '15%' }}>{fmtAmt(total)}</td>
                                </tr>
                            </tbody>
                        </table>

                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

// ── Client full document preview ───────────────────────────────────────────────
function ClientDocPreview({ inv, onClose, settings, compData, gisAccount }) {
    const clts = settings?.Client?.Client || [];
    const client = clts.find(c => c.id === inv.client);

    const currencyCode = settings?.Currency?.Currency
        ? (getD(settings.Currency.Currency, inv, 'cur') || (inv.cur === 'us' ? 'USD' : 'EUR'))
        : (inv.cur === 'us' ? 'USD' : 'EUR');

    const fmtAmt = (v) => new Intl.NumberFormat('en-US', {
        style: 'currency', currency: currencyCode, minimumFractionDigits: 2,
    }).format(v || 0);

    const fmtQty = (v) => v === 's' ? 'Service' : new Intl.NumberFormat('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(v || 0);
    const fmtNum = (v) => new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(v || 0);

    const products = inv.productsDataInvoice || [];

    const getDescription = (item) => {
        if (item.mtrlStatus === 'select' || item.isSelection) {
            return inv.productsData?.find(x => x.id === item.descriptionId)?.description || item.descriptionText || '';
        }
        return item.descriptionText || '';
    };

    const invNo = String(inv.invoice || '').padStart(4, '0') + getprefixInv(inv);
    const invDate = inv.date || inv.poSupplier?.date || inv.dateRange?.startDate || '';
    const poList = [...new Set(products.map(x => x.po).filter(Boolean))];

    const shipDisplay = settings ? getD(settings.Shipment?.Shipment || [], inv, 'shpType') : '';
    const originDisplay = settings ? getD(settings.Origin?.Origin || [], inv, 'origin') : '';
    const delTermDisplay = settings ? getD(settings['Delivery Terms']?.['Delivery Terms'] || [], inv, 'delTerm') : '';
    const polDisplay = settings ? getD(settings.POL?.POL || [], inv, 'pol') : '';
    const podDisplay = settings ? getD(settings.POD?.POD || [], inv, 'pod') : '';
    const packingDisplay = settings ? getD(settings.Packing?.Packing || [], inv, 'packing') : '';

    const NetWTKgsTmp = products.filter(q => q.qnty !== 's').reduce((acc, x) => acc + (x.qnty * 1 || 0), 0) * 1000;
    const NetWTKgs = fmtNum(NetWTKgsTmp);
    const TotalTarre = fmtNum((inv.ttlGross || 0) - NetWTKgsTmp);
    const TotalGross = fmtNum(inv.ttlGross);

    const secondRule = inv.packing === 'P6' || inv.packing === 'P7';
    const thirdRule = inv.packing === 'P6';
    const fourthRule = inv.packing === 'P7';
    const fifthRule = inv.packing === 'P13';
    const isInvoice = inv.invType === '1111' || inv.invType === 'Invoice';
    const isCN = inv.invType === '2222' || inv.invType === 'Credit Note';

    const watermark = gisAccount ? '/logo/gisBlur.jpg' : '/logo/imsblur1.jpeg';

    // Status calc for ribbon
    const totalAmt = inv.totalAmount * 1 || 0;
    const totalPaid = (inv.payments || []).reduce((s, p) => s + (p.pmnt * 1 || 0), 0);
    const dbBalance = inv.debtBlnc != null ? (inv.debtBlnc * 1) : (totalAmt - totalPaid);
    const cStatus = dbBalance === 0 ? 'PAID' : totalPaid > 0 ? 'PARTIALLY PAID' : 'UNPAID';
    const cStatusBg = dbBalance === 0 ? '#dcfce7' : totalPaid > 0 ? '#fef3c7' : '#fee2e2';
    const cStatusFg = dbBalance === 0 ? '#16a34a' : totalPaid > 0 ? '#d97706' : '#dc2626';

    const TH = 'text-left text-[10px] font-semibold py-1 px-2';
    const TH_R = 'text-right text-[10px] font-semibold py-1 px-2';
    const TD = 'text-left text-[10px] py-1 px-2 align-top';
    const TD_R = 'text-right text-[10px] py-1 px-2 align-top';
    const TD_C = 'text-center text-[10px] py-1 px-2 align-top';

    const handleDownload = () => {
        if (!settings || !compData) return;
        const arrTable = reOrderTableInv(products)
            .map(({ ['id']: _, ...rest }) => rest)
            .map(obj => Object.values(obj))
            .map((values, index) => {
                const qty = values[3];
                const unitPrice = values[4];
                const lineTotal = values[5];
                const tmp = products[index];
                const description = (tmp.mtrlStatus === 'select' || tmp.isSelection)
                    ? inv.productsData?.find(x => x.id === tmp.descriptionId)?.description
                    : tmp.descriptionText;

                const fmtQ = qty === 's' ? 'Service' : new Intl.NumberFormat('en-US', { minimumFractionDigits: 3 }).format(qty);
                const fmtU = new Intl.NumberFormat('en-US', { style: 'currency', currency: currencyCode, minimumFractionDigits: 2 }).format(unitPrice);
                const fmtT = new Intl.NumberFormat('en-US', { style: 'currency', currency: currencyCode, minimumFractionDigits: 2 }).format(lineTotal);

                return [index + 1, values[0], description, values[2], fmtQ, fmtU, fmtT];
            });
        InvoicePdf(inv, arrTable, settings, compData, gisAccount);
    };

    return (
        <Dialog open={!!inv} onOpenChange={onClose}>
            <DialogContent className="p-0 overflow-hidden flex flex-col" style={{
                maxWidth: 'min(95vw, 860px)',
                maxHeight: '92vh',
                borderRadius: '16px',
                border: '1px solid #d8e8f5',
                boxShadow: '0 24px 80px rgba(3,102,174,0.18)',
                fontFamily: "var(--font-poppins), 'Poppins', sans-serif",
            }}>
                {/* Status ribbon — sits OUTSIDE the document */}
                <div style={{
                    background: '#f8fbff',
                    borderBottom: '1px solid #d8e8f5',
                    padding: '8px 16px 8px 16px',
                    paddingRight: '44px',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    fontSize: '11px',
                    fontFamily: "var(--font-poppins), 'Poppins', sans-serif",
                    flexShrink: 0,
                }}>
                    <div className="flex gap-3 items-center">
                        <span style={{ color: 'var(--regent-gray)', fontWeight: '600', letterSpacing: '0.5px' }}>{getInvTypeLabel(inv).replace(':', '').toUpperCase()} {invNo}</span>
                        <span style={{ color: '#cbd5e1' }}>•</span>
                        <span><span style={{ color: 'var(--regent-gray)' }}>Paid:</span> <strong style={{ color: 'var(--chathams-blue)' }}>{fmtAmt(totalPaid)}</strong></span>
                        <span style={{ color: '#cbd5e1' }}>•</span>
                        <span><span style={{ color: 'var(--regent-gray)' }}>Balance:</span> <strong style={{ color: dbBalance > 0 ? '#dc2626' : '#16a34a' }}>{fmtAmt(dbBalance)}</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handleDownload}
                            title="Download PDF"
                            style={{
                                display: 'inline-flex', alignItems: 'center', gap: '5px',
                                padding: '4px 12px', borderRadius: '20px',
                                background: 'var(--endeavour)', color: '#fff',
                                fontSize: '10px', fontWeight: '600', cursor: 'pointer',
                                border: 'none', letterSpacing: '0.3px',
                            }}
                        >
                            <FaFilePdf size={11} /> Download PDF
                        </button>
                        <span style={{
                            padding: '3px 10px', borderRadius: '12px',
                            fontSize: '10px', fontWeight: '700',
                            background: cStatusBg, color: cStatusFg,
                        }}>{cStatus}</span>
                    </div>
                </div>

                {/* Scrollable document area */}
                <div className="overflow-y-auto flex-1" style={{ background: '#e8eff6' }}>
                    <div className="mx-auto my-4" style={{
                        background: '#fff',
                        width: 'calc(100% - 32px)',
                        maxWidth: '800px',
                        boxShadow: '0 2px 16px rgba(0,0,0,0.10)',
                        borderRadius: '4px',
                        padding: '32px 36px 28px',
                        color: '#203764',
                        position: 'relative',
                    }}>

                        {/* Watermark */}
                        <img src={watermark} alt="" style={{
                            position: 'absolute',
                            top: '55%', left: '50%', transform: 'translate(-50%, -50%)',
                            width: '420px', opacity: 0.07, pointerEvents: 'none', zIndex: 0,
                        }} />

                        <div style={{ position: 'relative', zIndex: 1 }}>

                        {/* ── Consignee + Invoice details ── */}
                        <div className="flex justify-between items-start mb-4">
                            <div style={{ minWidth: '200px' }}>
                                <p style={{ fontSize: '10px', fontWeight: '700', borderBottom: '1px solid #203764', display: 'inline-block', paddingBottom: '1px', marginBottom: '4px' }}>
                                    Consignee:
                                </p>
                                <p style={{ fontSize: '10px', fontWeight: '700' }}>{client?.nname || inv.clientName || ''}</p>
                                <p style={{ fontSize: '10px' }}>{client?.street || ''}</p>
                                <p style={{ fontSize: '10px' }}>{client?.city || ''}</p>
                                <p style={{ fontSize: '10px' }}>{client?.country || ''}</p>
                                <p style={{ fontSize: '10px' }}>{client?.other1 || ''}</p>
                            </div>
                            <div style={{ minWidth: '220px' }}>
                                <table style={{ fontSize: '10px', borderCollapse: 'collapse' }}>
                                    <tbody>
                                        <tr>
                                            <td style={{ fontWeight: '700', paddingRight: '12px', paddingBottom: '3px' }}>{getInvTypeLabel(inv)}</td>
                                            <td style={{ paddingBottom: '3px' }}>{invNo}</td>
                                        </tr>
                                        <tr>
                                            <td style={{ fontWeight: '700', paddingRight: '12px', paddingBottom: '3px' }}>Date:</td>
                                            <td style={{ paddingBottom: '3px' }}>{invDate ? dateFormat(invDate, 'dd.mm.yy') : ''}</td>
                                        </tr>
                                        {poList.length > 0 && (
                                            <tr>
                                                <td style={{ fontWeight: '700', paddingRight: '12px', paddingBottom: '3px', verticalAlign: 'top' }}>PO#:</td>
                                                <td style={{ paddingBottom: '3px' }}>
                                                    {poList.map((p, i) => <div key={i}>{p}</div>)}
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* ── Shipment details ── */}
                        <div style={{ marginBottom: '16px', fontSize: '10px', display: 'flex', gap: '8px', color: '#203764' }}>
                            {/* Left: Shipment / Origin / Delivery Terms */}
                            <div style={{ flex: '0 0 27%' }}>
                                {shipDisplay && <div style={{ display: 'flex', gap: '6px', paddingBottom: '4px' }}><span style={{ fontWeight: '700', whiteSpace: 'nowrap' }}>Shipment:</span><span>{shipDisplay}</span></div>}
                                {originDisplay && <div style={{ display: 'flex', gap: '6px', paddingBottom: '4px' }}><span style={{ fontWeight: '700', whiteSpace: 'nowrap' }}>Origin:</span><span>{originDisplay}</span></div>}
                                {delTermDisplay && <div style={{ display: 'flex', gap: '6px', paddingBottom: '4px' }}><span style={{ fontWeight: '700', whiteSpace: 'nowrap' }}>Delivery Terms:</span><span>{delTermDisplay}</span></div>}
                            </div>
                            {/* Middle: POL / POD / Packing */}
                            <div style={{ flex: '0 0 27%' }}>
                                {polDisplay && <div style={{ display: 'flex', gap: '6px', paddingBottom: '4px' }}><span style={{ fontWeight: '700', whiteSpace: 'nowrap' }}>POL:</span><span>{polDisplay}</span></div>}
                                {podDisplay && <div style={{ display: 'flex', gap: '6px', paddingBottom: '4px' }}><span style={{ fontWeight: '700', whiteSpace: 'nowrap' }}>POD:</span><span>{podDisplay}</span></div>}
                                {isInvoice && packingDisplay && <div style={{ display: 'flex', gap: '6px', paddingBottom: '4px' }}><span style={{ fontWeight: '700', whiteSpace: 'nowrap' }}>Packing:</span><span>{packingDisplay}</span></div>}
                            </div>
                            {/* Right: WT values stacked */}
                            <div style={{ flex: '1' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '4px' }}><span style={{ fontWeight: '700', whiteSpace: 'nowrap' }}>Total Net WT Kgs:</span><span>{NetWTKgsTmp > 0 ? NetWTKgs : ''}</span></div>
                                {!secondRule && !fifthRule && isInvoice && <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '4px' }}><span style={{ fontWeight: '700', whiteSpace: 'nowrap' }}>Total Tarre WT Kgs:</span><span>{TotalTarre}</span></div>}
                                {!fourthRule && !fifthRule && inv.ttlGross && <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '4px' }}><span style={{ fontWeight: '700', whiteSpace: 'nowrap' }}>{thirdRule ? 'QTY Ingots:' : 'Total Gross WT Kgs:'}</span><span>{TotalGross}</span></div>}
                                {isInvoice && !secondRule && inv.ttlPackages && <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '4px' }}><span style={{ fontWeight: '700', whiteSpace: 'nowrap' }}>Total Packages:</span><span style={{ textAlign: 'right' }}>{inv.ttlPackages}</span></div>}
                            </div>
                        </div>

                        {/* ── Products table ── */}
                        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '4px', fontSize: '10px' }}>
                            <thead>
                                <tr style={{ background: '#096eb6', color: '#fff' }}>
                                    <th className={TH} style={{ width: '4%' }}>#</th>
                                    <th className={TH} style={{ width: '13%' }}>PO#</th>
                                    <th className={TH} style={{ width: '38%' }}>Description</th>
                                    <th className={TH_R} style={{ width: '14%' }}>{getShipTitle(inv.shpType)}</th>
                                    <th className={TH_R} style={{ width: '10%' }}>Quantity<br />MT</th>
                                    <th className={TH_R} style={{ width: '10%' }}>Unit Price<br />{currencyCode}</th>
                                    <th className={TH_R} style={{ width: '11%' }}>Total<br />{currencyCode}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {products.map((item, i) => (
                                    <tr key={i}>
                                        <td className={TD}>{i + 1}</td>
                                        <td className={TD}>{item.po || ''}</td>
                                        <td className={TD}>{getDescription(item)}</td>
                                        <td className={TD_C}>{item.container || ''}</td>
                                        <td className={TD_R}>{fmtQty(item.qnty)}</td>
                                        <td className={TD_R}>{fmtAmt(item.unitPrc)}</td>
                                        <td className={TD_R}>{fmtAmt(item.total)}</td>
                                    </tr>
                                ))}
                                {/* Total rows */}
                                <tr>
                                    <td colSpan={5} />
                                    <td className={TD_R} style={{ fontWeight: '700', paddingTop: '6px', borderTop: '1px solid #203764', whiteSpace: 'nowrap' }}>Total Amount:</td>
                                    <td className={TD_R} style={{ fontWeight: '700', paddingTop: '6px', borderTop: '1px solid #203764' }}>{fmtAmt(inv.totalAmount)}</td>
                                </tr>
                                {isInvoice && inv.percentage && (
                                    <tr>
                                        <td colSpan={5} />
                                        <td className={TD_R} style={{ fontWeight: '700' }}>Prepayment:</td>
                                        <td className={TD_R} style={{ fontWeight: '700' }}>
                                            {inv.percentage}%&nbsp;&nbsp;{fmtAmt(inv.totalPrepayment)}
                                        </td>
                                    </tr>
                                )}
                                {(isCN || (!isInvoice && !isCN)) && inv.totalPrepayment && (
                                    <tr>
                                        <td colSpan={5} />
                                        <td className={TD_R} style={{ fontWeight: '700' }}>Prepaid Amount:</td>
                                        <td className={TD_R} style={{ fontWeight: '700' }}>{fmtAmt(inv.totalPrepayment)}</td>
                                    </tr>
                                )}
                                {(isCN || (!isInvoice && !isCN)) && inv.balanceDue != null && (
                                    <tr>
                                        <td colSpan={5} />
                                        <td className={TD_R} style={{ fontWeight: '700' }}>Balance Due:</td>
                                        <td className={TD_R} style={{ fontWeight: '700' }}>{fmtAmt(inv.balanceDue)}</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>

                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

// ── Main export ────────────────────────────────────────────────────────────────
export default function InvPopup({ inv, onClose, settings, compData, gisAccount }) {
    if (!inv) return null;

    if (inv._type === 'client') {
        return <ClientDocPreview inv={inv} onClose={onClose} settings={settings} compData={compData} gisAccount={gisAccount} />;
    }

    return <SupplierDocPreview inv={inv} onClose={onClose} settings={settings} gisAccount={gisAccount} />;
}
