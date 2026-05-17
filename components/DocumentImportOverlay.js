'use client';
import { useState, useRef } from 'react';
import { FileText, Upload, Loader2, X, CheckSquare, Square, AlertTriangle, CheckCircle2, ChevronRight } from 'lucide-react';
import { authedFetch } from '../utils/aiClient';

const ACCEPTED = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];

function ConfidencePill({ level }) {
    if (!level) return null;
    const s = { high: ['#d1fae5', '#065f46'], medium: ['#fef3c7', '#92400e'], low: ['#fee2e2', '#991b1b'] }[level] || ['#f3f4f6', '#374151'];
    return <span className='px-1.5 py-0.5 rounded-full font-medium' style={{ fontSize: '0.55rem', background: s[0], color: s[1] }}>{level}</span>;
}

function FieldRow({ label, value, confidence, selected, onToggle }) {
    if (value == null || value === '') return null;
    const displayVal = Array.isArray(value)
        ? `${value.length} product${value.length !== 1 ? 's' : ''} extracted`
        : String(value);
    return (
        <div
            onClick={onToggle}
            className='flex items-start justify-between gap-2 px-3 py-2 cursor-pointer rounded-lg transition-colors'
            style={{ background: selected ? '#f0fdf4' : '#f8fbff', border: `1px solid ${selected ? '#86efac' : '#dbeeff'}`, marginBottom: '4px' }}
        >
            <div className='flex items-start gap-2 min-w-0'>
                <div className='mt-0.5 flex-shrink-0'>
                    {selected
                        ? <CheckSquare className='w-3.5 h-3.5' style={{ color: '#16a34a' }} />
                        : <Square className='w-3.5 h-3.5' style={{ color: '#b8ddf8' }} />
                    }
                </div>
                <div className='min-w-0'>
                    <p className='font-semibold' style={{ fontSize: '0.6rem', color: 'var(--chathams-blue)' }}>{label}</p>
                    <p className='break-words' style={{ fontSize: '0.68rem', color: 'var(--port-gore)' }}>{displayVal}</p>
                </div>
            </div>
            <ConfidencePill level={confidence} />
        </div>
    );
}

const DocumentImportOverlay = ({ documentType, suppliers, clients, currencies, onApply, onClose }) => {
    const [file, setFile] = useState(null);
    const [reading, setReading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [dragging, setDragging] = useState(false);
    const [selected, setSelected] = useState({});
    const inputRef = useRef(null);

    const toBase64 = (f) => new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result.split(',')[1]);
        r.onerror = rej;
        r.readAsDataURL(f);
    });

    const handleFile = async (f) => {
        if (!f) return;
        if (!ACCEPTED.includes(f.type)) { setError('Only PDF, JPG, and PNG files are supported.'); return; }
        if (f.size > 10 * 1024 * 1024) { setError('File must be under 10 MB.'); return; }
        setFile(f);
        setResult(null);
        setError(null);
        setReading(true);
        try {
            const b64 = await toBase64(f);
            const res = await authedFetch('/api/ai/document-reader', {
                method: 'POST',
                body: JSON.stringify({
                    fileBase64: b64,
                    mimeType: f.type,
                    documentType,
                    suppliers: suppliers || [],
                    clients: clients || [],
                    currencies: currencies || [],
                }),
            });
            const data = await res.json();
            if (!res.ok || data.error) {
                // Surface a friendly message for the scanned-PDF case
                if (data.error === 'SCANNED_PDF') {
                    throw new Error(data.message || 'PDF has no embedded text. Export it as an image and re-upload.');
                }
                throw new Error(data.error || data.message || 'Read failed');
            }
            setResult(data);
            // Pre-select all high/medium confidence fields
            const sel = {};
            const allFields = documentType === 'contract'
                ? ['order', 'supplier', 'date', 'currency', 'products', 'remarks']
                : ['invoice', 'client', 'date', 'currency', 'products', 'remarks'];
            allFields.forEach(f => {
                const conf = data.confidence?.[f] || data.confidence?.supplier || data.confidence?.client;
                sel[f] = conf !== 'low';
            });
            setSelected(sel);
        } catch (e) {
            setError(e.message || 'Failed to read document');
        } finally {
            setReading(false);
        }
    };

    const handleApply = () => {
        if (!result) return;
        const out = {};
        if (documentType === 'contract') {
            if (selected.order && result.order) out.order = result.order;
            if (selected.supplier) {
                if (result.supplierId) out.supplier = result.supplierId;
            }
            if (selected.date && result.date) {
                out.dateRange = { startDate: result.date, endDate: result.date };
                out.date = result.date;
            }
            if (selected.currency && result.currencyId) out.cur = result.currencyId;
            if (selected.products && result.products?.length) {
                out.productsData = result.products.map((p, i) => ({
                    id: `doc-${i}`, description: p.description || '', qnty: p.qnty || '', unitPrc: p.unitPrc || ''
                }));
            }
            if (selected.remarks && result.remarks) out.remarks = result.remarks;
        } else {
            if (selected.invoice && result.invoice) out.invoice = result.invoice;
            if (selected.client && result.clientId) out.client = result.clientId;
            if (selected.date && result.date) {
                out.dateRange = { startDate: result.date, endDate: result.date };
                out.date = result.date;
            }
            if (selected.currency && result.currencyId) out.cur = result.currencyId;
            if (selected.products && result.products?.length) {
                // Invoice form reads `productsDataInvoice` (not `productsData`)
                out.productsDataInvoice = result.products.map((p, i) => ({
                    id: `doc-${i}`, description: p.description || '', descriptionId: '', qnty: p.qnty || '', unitPrc: p.unitPrc || '', stock: ''
                }));
            }
            if (selected.remarks && result.remarks) out.remarks = result.remarks;
        }
        onApply(out);
        onClose();
    };

    const toggle = (field) => setSelected(prev => ({ ...prev, [field]: !prev[field] }));

    const isContract = documentType === 'contract';

    return (
        <div
            className='fixed inset-0 z-[100000] flex items-center justify-center p-3 sm:p-4'
            style={{ background: 'rgba(0,0,0,0.5)' }}
            role='dialog'
            aria-modal='true'
            aria-labelledby='doc-import-title'
        >
            <div className='w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden' style={{ border: '1px solid #b8ddf8', maxHeight: '92vh' }}>
                {/* Header */}
                <div className='flex items-center justify-between px-4 py-3' style={{ background: '#dbeeff', borderBottom: '1px solid #b8ddf8' }}>
                    <div className='flex items-center gap-2'>
                        <FileText className='w-4 h-4' style={{ color: 'var(--endeavour)' }} />
                        <span id='doc-import-title' className='font-semibold' style={{ fontSize: '0.75rem', color: 'var(--chathams-blue)' }}>
                            Import from Document — {isContract ? 'Contract' : 'Invoice'}
                        </span>
                    </div>
                    <button
                        onClick={onClose}
                        aria-label='Close document import'
                        className='p-1 rounded-full hover:bg-[#b8ddf8] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--endeavour)]/40'
                    >
                        <X className='w-4 h-4' style={{ color: 'var(--chathams-blue)' }} />
                    </button>
                </div>

                <div className='overflow-y-auto p-4 space-y-3' style={{ maxHeight: 'calc(90vh - 110px)' }}>

                    {/* Drop zone */}
                    {!result && (
                        <div
                            onDragOver={e => { e.preventDefault(); setDragging(true); }}
                            onDragLeave={() => setDragging(false)}
                            onDrop={e => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}
                            onClick={() => !reading && inputRef.current?.click()}
                            onKeyDown={e => { if ((e.key === 'Enter' || e.key === ' ') && !reading) { e.preventDefault(); inputRef.current?.click(); } }}
                            role='button'
                            tabIndex={0}
                            aria-label='Upload document — drop a PDF, JPG or PNG here, or click to browse'
                            className='rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-[var(--endeavour)]/30'
                            style={{
                                border: `2px dashed ${dragging ? 'var(--endeavour)' : '#b8ddf8'}`,
                                background: dragging ? '#dbeeff' : '#f8fbff',
                                minHeight: '100px', padding: '20px'
                            }}
                        >
                            <input ref={inputRef} type='file' accept='.pdf,.jpg,.jpeg,.png' className='hidden'
                                onChange={e => handleFile(e.target.files[0])} />
                            {reading ? (
                                <div className='flex flex-col items-center gap-2'>
                                    <Loader2 className='w-6 h-6 animate-spin' style={{ color: 'var(--endeavour)' }} />
                                    <p style={{ fontSize: '0.68rem', color: 'var(--chathams-blue)' }}>Reading document…</p>
                                </div>
                            ) : (
                                <>
                                    <Upload className='w-6 h-6 mb-1' style={{ color: '#b8ddf8' }} />
                                    <p className='font-medium' style={{ fontSize: '0.68rem', color: 'var(--chathams-blue)' }}>Drop document or click to upload</p>
                                    <p style={{ fontSize: '0.58rem', color: 'var(--regent-gray)' }}>PDF, JPG, PNG · max 10 MB</p>
                                </>
                            )}
                        </div>
                    )}

                    {/* Error */}
                    {error && (
                        <div className='flex items-center gap-2 p-2.5 rounded-lg' style={{ background: '#fee2e2', border: '1px solid #fca5a5' }}>
                            <AlertTriangle className='w-3.5 h-3.5 flex-shrink-0' style={{ color: '#991b1b' }} />
                            <span style={{ fontSize: '0.65rem', color: '#991b1b' }}>{error}</span>
                        </div>
                    )}

                    {/* Extracted fields */}
                    {result && (
                        <div className='space-y-1'>
                            <div className='flex items-center justify-between mb-2'>
                                <div className='flex items-center gap-1.5'>
                                    <CheckCircle2 className='w-3.5 h-3.5' style={{ color: '#16a34a' }} />
                                    <span className='font-semibold' style={{ fontSize: '0.68rem', color: 'var(--chathams-blue)' }}>
                                        Fields extracted — select which to apply
                                    </span>
                                </div>
                                <button onClick={() => { setFile(null); setResult(null); setError(null); }}
                                    className='flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs hover:border-[var(--endeavour)] transition-colors'
                                    style={{ fontSize: '0.58rem', borderColor: '#b8ddf8', color: 'var(--chathams-blue)' }}>
                                    Try another file
                                </button>
                            </div>

                            {isContract ? (
                                <>
                                    <FieldRow label='PO Number' value={result.order} confidence={result.confidence?.order} selected={selected.order} onToggle={() => toggle('order')} />
                                    <FieldRow label='Supplier' value={result.supplierId ? result.supplierName : result.supplierName ? `${result.supplierName} (no match)` : null} confidence={result.confidence?.supplier} selected={selected.supplier} onToggle={() => toggle('supplier')} />
                                    <FieldRow label='Date' value={result.date} confidence={result.confidence?.date} selected={selected.date} onToggle={() => toggle('date')} />
                                    <FieldRow label='Currency' value={result.currencyId ? result.currencyCode : result.currencyCode ? `${result.currencyCode} (no match)` : null} confidence={result.confidence?.currency} selected={selected.currency} onToggle={() => toggle('currency')} />
                                    <FieldRow label='Products' value={result.products} confidence={result.confidence?.products} selected={selected.products} onToggle={() => toggle('products')} />
                                    <FieldRow label='Remarks' value={result.remarks} confidence='medium' selected={selected.remarks} onToggle={() => toggle('remarks')} />
                                </>
                            ) : (
                                <>
                                    <FieldRow label='Invoice Number' value={result.invoice} confidence={result.confidence?.invoice} selected={selected.invoice} onToggle={() => toggle('invoice')} />
                                    <FieldRow label='Client' value={result.clientId ? result.clientName : result.clientName ? `${result.clientName} (no match)` : null} confidence={result.confidence?.client} selected={selected.client} onToggle={() => toggle('client')} />
                                    <FieldRow label='Date' value={result.date} confidence={result.confidence?.date} selected={selected.date} onToggle={() => toggle('date')} />
                                    <FieldRow label='Currency' value={result.currencyId ? result.currencyCode : result.currencyCode ? `${result.currencyCode} (no match)` : null} confidence={result.confidence?.currency} selected={selected.currency} onToggle={() => toggle('currency')} />
                                    <FieldRow label='Products' value={result.products} confidence={result.confidence?.products} selected={selected.products} onToggle={() => toggle('products')} />
                                    <FieldRow label='Remarks' value={result.remarks} confidence='medium' selected={selected.remarks} onToggle={() => toggle('remarks')} />
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                {result && (
                    <div className='flex items-center justify-between px-4 py-3' style={{ borderTop: '1px solid #b8ddf8', background: '#f8fbff' }}>
                        <p style={{ fontSize: '0.58rem', color: 'var(--regent-gray)' }}>
                            Unmatched entities won&apos;t be applied. Verify after import.
                        </p>
                        <div className='flex gap-2'>
                            <button onClick={onClose} className='px-3 py-1.5 rounded-full border transition-colors hover:border-[var(--endeavour)]'
                                style={{ fontSize: '0.65rem', borderColor: '#b8ddf8', color: 'var(--chathams-blue)' }}>
                                Cancel
                            </button>
                            <button onClick={handleApply}
                                className='flex items-center gap-1 px-3 py-1.5 rounded-full text-white font-medium transition-all'
                                style={{ fontSize: '0.65rem', background: 'var(--endeavour)' }}>
                                Apply Selected <ChevronRight className='w-3 h-3' />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DocumentImportOverlay;
