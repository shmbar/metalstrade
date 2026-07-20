'use client';
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle } from '../../../components/ui/dialog';
import dateFormat from 'dateformat';
import { getD, reOrderTableInv, getAllfiles, uploadFile } from '../../../utils/utils';
import { Pdf as InvoicePdf } from '../contracts/modals/pdf/pdfInvoice';
import { FaFilePdf } from 'react-icons/fa';
import { FileUploader } from 'react-drag-drop-files';

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

    const [files, setFiles] = useState([]);
    const [loadingFiles, setLoadingFiles] = useState(true);

    const contractId = inv.orderData?.id;
    useEffect(() => {
        let active = true;
        if (!contractId) { setLoadingFiles(false); return; }
        setLoadingFiles(true);
        (async () => {
            try {
                const arr = await getAllfiles(contractId);
                if (active) setFiles(Array.isArray(arr) ? arr : []);
            } catch {
                if (active) setFiles([]);
            } finally {
                if (active) setLoadingFiles(false);
            }
        })();
        return () => { active = false; };
    }, [contractId]);

    const isPdf = (n = '') => /\.pdf(\?|$)/i.test(n);
    const isImage = (n = '') => /\.(png|jpe?g|gif|webp|bmp)(\?|$)/i.test(n);
    const primaryFile = files.find(f => isPdf(f.name)) || files.find(f => isImage(f.name)) || files[0] || null;

    const [uploading, setUploading] = useState(false);
    const [uploadErr, setUploadErr] = useState('');
    const handleUpload = async (file) => {
        setUploadErr('');
        if (!file) return;
        if (!contractId) { setUploadErr('Cannot attach — this invoice has no contract reference.'); return; }
        setUploading(true);
        try {
            await uploadFile(contractId, file, setFiles);
            // Re-list from storage so what's shown matches what actually persisted — a failed
            // write must not leave the popup claiming "no invoice" after a drop, and a real
            // file must survive a reopen.
            const arr = await getAllfiles(contractId);
            setFiles(Array.isArray(arr) ? arr : []);
        } catch (e) {
            console.error('invoice upload failed:', e);
            setUploadErr('Upload failed — ' + (e?.message || 'please try again.'));
        } finally {
            setUploading(false);
        }
    };

    const invNo = String(inv.invoice || '').padStart(4, '0');
    const invDate = c.date || inv.orderData?.date || '';

    const total = inv.invValue * 1 || 0;
    const paid = inv.pmnt * 1 || 0;
    const balance = inv.blnc != null ? (inv.blnc * 1) : (total - paid);

    const watermark = gisAccount ? '/logo/gisBlur.jpg' : '/logo/imsblur1.jpeg';

    const status = balance === 0 ? 'PAID' : paid > 0 ? 'PARTIALLY PAID' : 'UNPAID';
    const statusBg = balance === 0 ? '#dcfce7' : paid > 0 ? '#fef3c7' : '#fee2e2';
    const statusFg = balance === 0 ? '#16a34a' : paid > 0 ? '#d97706' : '#dc2626';

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
                <DialogTitle className="sr-only">Supplier Invoice {invNo}</DialogTitle>
                {/* Status ribbon — sits OUTSIDE the document */}
                <div style={{
                    background: '#f8fbff',
                    borderBottom: '1px solid #d8e8f5',
                    padding: '8px 16px 8px 16px',
                    paddingRight: '44px',
                    display: 'flex', justifyContent: 'flex-start', gap: '6px', alignItems: 'center',
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
                        <div className="flex justify-between items-start mb-4 flex-wrap gap-x-6 gap-y-2">
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
                            <div style={{ minWidth: '220px', display: 'flex', justifyContent: 'flex-end' }}>
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

                        {/* Original uploaded supplier invoice — or a clean summary if none */}
                        {loadingFiles ? (
                            <div style={{ textAlign: 'center', fontSize: '11px', color: 'var(--regent-gray)', padding: '40px 0' }}>
                                Loading original invoice…
                            </div>
                        ) : primaryFile ? (
                            <div>
                                {isPdf(primaryFile.name) ? (
                                    // #navpanes=0 asks the browser's built-in PDF viewer (Chrome/Edge PDFium,
                                    // Firefox pdf.js) to start with the thumbnail/outline sidebar collapsed,
                                    // so the file fills the frame instead of opening with that panel pinned
                                    // open. It's a viewer hint, not guaranteed on every browser, but covers
                                    // the common ones and the user can still open the panel themselves.
                                    <iframe title={primaryFile.name} src={`${primaryFile.url}#toolbar=1&navpanes=0`}
                                        style={{ width: '100%', height: '68vh', border: '1px solid #d8e8f5', borderRadius: '6px', background: '#fff' }} />
                                ) : isImage(primaryFile.name) ? (
                                    <img src={primaryFile.url} alt={primaryFile.name}
                                        style={{ display: 'block', maxWidth: '100%', margin: '0 auto', borderRadius: '6px', border: '1px solid #d8e8f5' }} />
                                ) : (
                                    <div style={{ fontSize: '11px', color: 'var(--regent-gray)', padding: '12px 0' }}>
                                        This file type can’t be previewed inline — open it with the link below.
                                    </div>
                                )}
                                <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    {files.map((f, i) => (
                                        <a key={i} href={f.url} target="_blank" rel="noreferrer"
                                            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '10px', color: 'var(--endeavour)' }}>
                                            <FaFilePdf size={11} /> {f.name}{f === primaryFile ? ' (shown above)' : ''}
                                        </a>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div>
                                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '8px', fontSize: '10px' }}>
                                    <tbody>
                                        <tr>
                                            <td colSpan={3} />
                                            <td className="text-left text-[10px] px-2" style={{ borderTop: '1px solid #203764', padding: '6px 8px 4px', whiteSpace: 'nowrap', width: '18%' }}>Total Amount:</td>
                                            <td className="text-right text-[10px] px-2" style={{ borderTop: '1px solid #203764', padding: '6px 8px 4px', width: '15%' }}>{fmtAmt(total)}</td>
                                        </tr>
                                        <tr>
                                            <td colSpan={3} />
                                            <td className="text-left text-[10px] px-2" style={{ padding: '4px 8px', whiteSpace: 'nowrap' }}>Paid:</td>
                                            <td className="text-right text-[10px] px-2" style={{ padding: '4px 8px' }}>{fmtAmt(paid)}</td>
                                        </tr>
                                        <tr>
                                            <td colSpan={3} />
                                            <td className="text-left text-[10px] px-2" style={{ padding: '4px 8px', whiteSpace: 'nowrap' }}>Balance:</td>
                                            <td className="text-right text-[10px] px-2" style={{ padding: '4px 8px', color: balance > 0 ? '#dc2626' : '#16a34a' }}>{fmtAmt(balance)}</td>
                                        </tr>
                                    </tbody>
                                </table>
                                <p style={{ marginTop: '24px', textAlign: 'center', fontSize: '11px', color: 'var(--regent-gray)' }}>
                                    No original invoice uploaded for this contract.
                                </p>
                                <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'center' }}>
                                    <FileUploader handleChange={handleUpload} name="file" types={['PDF', 'PNG', 'JPG', 'JPEG']} disabled={uploading || !contractId} />
                                </div>
                                {uploading && <p style={{ marginTop: '8px', textAlign: 'center', fontSize: '10px', color: 'var(--endeavour)' }}>Uploading…</p>}
                                {uploadErr && <p style={{ marginTop: '8px', textAlign: 'center', fontSize: '10px', color: '#dc2626' }}>{uploadErr}</p>}
                            </div>
                        )}

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

    const TH = 'text-left text-[10px] font-semibold py-2 px-2 text-white';
    const TH_R = 'text-right text-[10px] font-semibold py-2 px-2 text-white';
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
                <DialogTitle className="sr-only">{getInvTypeLabel(inv).replace(':', '')} {invNo}</DialogTitle>
                {/* Status ribbon — sits OUTSIDE the document */}
                <div style={{
                    background: '#f8fbff',
                    borderBottom: '1px solid #d8e8f5',
                    padding: '8px 16px 8px 16px',
                    paddingRight: '44px',
                    display: 'flex', justifyContent: 'flex-start', gap: '6px', alignItems: 'center',
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
                        <div className="flex justify-between items-start mb-4 flex-wrap gap-x-6 gap-y-2">
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
                            <div style={{ minWidth: '220px', display: 'flex', justifyContent: 'flex-end' }}>
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
                        <div style={{ marginBottom: '48px', fontSize: '10px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', color: '#203764' }}>
                            {/* Left: Shipment / Origin / Delivery Terms */}
                            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                                <table style={{ borderCollapse: 'collapse' }}>
                                    <tbody>
                                        {shipDisplay && <tr><td style={{ fontWeight: '700', paddingRight: '10px', paddingBottom: '3px', whiteSpace: 'nowrap' }}>Shipment:</td><td style={{ paddingBottom: '3px', whiteSpace: 'nowrap' }}>{shipDisplay}</td></tr>}
                                        {originDisplay && <tr><td style={{ fontWeight: '700', paddingRight: '10px', paddingBottom: '3px', whiteSpace: 'nowrap' }}>Origin:</td><td style={{ paddingBottom: '3px', whiteSpace: 'nowrap' }}>{originDisplay}</td></tr>}
                                        {delTermDisplay && <tr><td style={{ fontWeight: '700', paddingRight: '10px', paddingBottom: '3px', whiteSpace: 'nowrap' }}>Delivery Terms:</td><td style={{ paddingBottom: '3px', whiteSpace: 'nowrap' }}>{delTermDisplay}</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                            {/* Middle: POL / POD / Packing */}
                            <div style={{ display: 'flex', justifyContent: 'center' }}>
                                <table style={{ borderCollapse: 'collapse' }}>
                                    <tbody>
                                        {polDisplay && <tr><td style={{ fontWeight: '700', paddingRight: '10px', paddingBottom: '3px', whiteSpace: 'nowrap' }}>POL:</td><td style={{ paddingBottom: '3px', whiteSpace: 'nowrap' }}>{polDisplay}</td></tr>}
                                        {podDisplay && <tr><td style={{ fontWeight: '700', paddingRight: '10px', paddingBottom: '3px', whiteSpace: 'nowrap' }}>POD:</td><td style={{ paddingBottom: '3px', whiteSpace: 'nowrap' }}>{podDisplay}</td></tr>}
                                        {isInvoice && packingDisplay && <tr><td style={{ fontWeight: '700', paddingRight: '10px', paddingBottom: '3px', whiteSpace: 'nowrap' }}>Packing:</td><td style={{ paddingBottom: '3px', whiteSpace: 'nowrap' }}>{packingDisplay}</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                            {/* Right: WT values */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                <table style={{ borderCollapse: 'collapse' }}>
                                    <tbody>
                                        <tr><td style={{ fontWeight: '700', paddingRight: '10px', paddingBottom: '3px', whiteSpace: 'nowrap' }}>Total Net WT Kgs:</td><td style={{ paddingBottom: '3px' }}>{NetWTKgsTmp > 0 ? NetWTKgs : ''}</td></tr>
                                        {!secondRule && !fifthRule && isInvoice && <tr><td style={{ fontWeight: '700', paddingRight: '10px', paddingBottom: '3px', whiteSpace: 'nowrap' }}>Total Tarre WT Kgs:</td><td style={{ paddingBottom: '3px' }}>{TotalTarre}</td></tr>}
                                        {!fourthRule && !fifthRule && inv.ttlGross && <tr><td style={{ fontWeight: '700', paddingRight: '10px', paddingBottom: '3px', whiteSpace: 'nowrap' }}>{thirdRule ? 'QTY Ingots:' : 'Total Gross WT Kgs:'}</td><td style={{ paddingBottom: '3px' }}>{TotalGross}</td></tr>}
                                        {isInvoice && !secondRule && inv.ttlPackages && <tr><td style={{ fontWeight: '700', paddingRight: '10px', paddingBottom: '3px', whiteSpace: 'nowrap' }}>Total Packages:</td><td style={{ paddingBottom: '3px' }}>{inv.ttlPackages}</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* ── Products table ── */}
                        <table className="inv-preview-table" style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '4px', fontSize: '10px' }}>
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
                                    <td colSpan={4} style={{ border: 'none' }} />
                                    <td className="text-left text-[10px] px-2" style={{ borderTop: '1px solid #203764', padding: '6px 8px 4px', whiteSpace: 'nowrap' }}>Total Amount:</td>
                                    <td style={{ borderTop: '1px solid #203764', padding: '6px 8px 4px' }} />
                                    <td className="text-right text-[10px] px-2" style={{ borderTop: '1px solid #203764', padding: '6px 8px 4px' }}>{fmtAmt(inv.totalAmount)}</td>
                                </tr>
                                {isInvoice && inv.percentage && (
                                    <tr>
                                        <td colSpan={4} style={{ border: 'none' }} />
                                        <td className="text-left text-[10px] px-2" style={{ paddingTop: '4px', paddingBottom: '8px' }}>Prepayment:</td>
                                        <td className="text-right text-[10px] px-2" style={{ paddingTop: '4px', paddingBottom: '8px' }}>{inv.percentage}%</td>
                                        <td className="text-right text-[10px] px-2" style={{ paddingTop: '4px', paddingBottom: '8px' }}>{fmtAmt(Math.round((inv.totalPrepayment || 0) * 100) / 100)}</td>
                                    </tr>
                                )}
                                {(isCN || (!isInvoice && !isCN)) && inv.totalPrepayment && (
                                    <tr>
                                        <td colSpan={4} style={{ border: 'none' }} />
                                        <td className="text-left text-[10px] px-2" style={{ paddingTop: '4px', paddingBottom: '4px', whiteSpace: 'nowrap' }}>Prepaid Amount:</td>
                                        <td style={{ paddingTop: '4px', paddingBottom: '4px' }} />
                                        <td className="text-right text-[10px] px-2" style={{ paddingTop: '4px', paddingBottom: '4px' }}>{fmtAmt(Math.round((inv.totalPrepayment || 0) * 100) / 100)}</td>
                                    </tr>
                                )}
                                {(isCN || (!isInvoice && !isCN)) && inv.balanceDue != null && (
                                    <tr>
                                        <td colSpan={4} style={{ border: 'none' }} />
                                        <td className="text-left text-[10px] px-2" style={{ paddingTop: '4px', paddingBottom: '8px', whiteSpace: 'nowrap' }}>Balance Due:</td>
                                        <td style={{ paddingTop: '4px', paddingBottom: '8px' }} />
                                        <td className="text-right text-[10px] px-2" style={{ paddingTop: '4px', paddingBottom: '8px' }}>{fmtAmt(Math.round((inv.totalAmount || 0) * 100) / 100 - Math.round((inv.totalPrepayment || 0) * 100) / 100)}</td>
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
