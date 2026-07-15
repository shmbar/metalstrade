'use client';
import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FileText, Upload, Loader2, X, CheckSquare, Square, AlertTriangle, CheckCircle2, ChevronRight } from 'lucide-react';
import { authedFetch } from '../utils/aiClient';
import { uploadFile } from '../utils/utils';

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

function ReconciliationPanel({ reconcile, linkedContract, extractedCurrency }) {
    if (!reconcile) return null;
    const cur = extractedCurrency || linkedContract?.currency || '';
    const fmt = (n) => Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const pct = (n) => n == null ? '' : `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`;
    const isDrift = (p) => p != null && Math.abs(p) > 0.5;
    const totalDriftBad = isDrift(reconcile.totalPct);

    return (
        <div
            className='rounded-lg mt-3 p-3'
            style={{
                background: totalDriftBad ? '#fef2f2' : '#f0fdf4',
                border: `1px solid ${totalDriftBad ? '#fca5a5' : '#86efac'}`,
            }}
            role='region'
            aria-label='Contract reconciliation'
        >
            <div className='flex items-center justify-between mb-2'>
                <div className='flex items-center gap-1.5'>
                    {totalDriftBad
                        ? <AlertTriangle className='w-3.5 h-3.5' style={{ color: '#991b1b' }} />
                        : <CheckCircle2 className='w-3.5 h-3.5' style={{ color: '#16a34a' }} />
                    }
                    <span className='font-semibold' style={{ fontSize: '0.68rem', color: totalDriftBad ? '#991b1b' : '#15803d' }}>
                        Reconciliation vs contract {linkedContract?.order}
                    </span>
                </div>
                {reconcile.currencyMatch === false && (
                    <span className='px-2 py-0.5 rounded-full' style={{ fontSize: '0.55rem', background: '#fee2e2', color: '#991b1b' }}>
                        ⚠ currency mismatch
                    </span>
                )}
            </div>

            {/* Per-product comparison */}
            {Array.isArray(reconcile.rows) && reconcile.rows.length > 0 && (
                <div className='space-y-1 mb-2'>
                    {reconcile.rows.map((r, i) => {
                        if (!r.contractFound) {
                            return (
                                <div key={i} className='flex items-center gap-1.5 px-2 py-1 rounded' style={{ background: 'white', border: '1px solid #fde68a' }}>
                                    <AlertTriangle className='w-3 h-3 flex-shrink-0' style={{ color: '#d97706' }} />
                                    <span style={{ fontSize: '0.6rem', color: '#92400e' }}>
                                        {r.description}: no matching product on contract — invoice qty {r.qntyInvoice} @ {r.priceInvoice}
                                    </span>
                                </div>
                            );
                        }
                        const qBad = isDrift(r.qntyPct);
                        const pBad = isDrift(r.pricePct);
                        const lineBad = qBad || pBad;
                        return (
                            <div key={i} className='px-2 py-1 rounded' style={{ background: 'white', border: `1px solid ${lineBad ? '#fca5a5' : '#bbf7d0'}` }}>
                                <p className='font-semibold' style={{ fontSize: '0.6rem', color: 'var(--chathams-blue)' }}>{r.description}</p>
                                <div className='flex flex-wrap gap-x-3' style={{ fontSize: '0.58rem', color: 'var(--port-gore)' }}>
                                    <span style={{ color: qBad ? '#991b1b' : '#15803d' }}>
                                        Qty: {r.qntyContract} → {r.qntyInvoice} ({pct(r.qntyPct)})
                                    </span>
                                    <span style={{ color: pBad ? '#991b1b' : '#15803d' }}>
                                        Price: {r.priceContract} → {r.priceInvoice} ({pct(r.pricePct)})
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Total comparison */}
            <div className='flex flex-wrap items-center gap-x-3 gap-y-1 pt-1.5 mt-1 border-t' style={{ borderColor: totalDriftBad ? '#fca5a5' : '#bbf7d0', fontSize: '0.6rem' }}>
                <span style={{ color: 'var(--regent-gray)' }}>
                    Expected: {cur} {fmt(reconcile.expectedTotal)}
                </span>
                <span style={{ color: 'var(--regent-gray)' }}>
                    Invoiced: <strong style={{ color: 'var(--port-gore)' }}>{cur} {fmt(reconcile.invoicedTotal)}</strong>
                </span>
                <span style={{ color: totalDriftBad ? '#991b1b' : '#15803d', fontWeight: 600 }}>
                    Diff: {cur} {fmt(reconcile.totalDiff)} ({pct(reconcile.totalPct)})
                </span>
            </div>
        </div>
    );
}

const DocumentImportOverlay = ({ documentType, suppliers, clients, currencies, expenseTypes, contractIndex, onApply, onClose, anchorId = null }) => {
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
                    expenseTypes: expenseTypes || [],
                    contractIndex: contractIndex || [],
                }),
            });
            const data = await res.json();
            if (!res.ok || data.error) {
                // Distinguish scanned-image PDFs from parse failures so the user
                // gets an accurate, actionable message.
                if (data.error === 'SCANNED_PDF') {
                    throw new Error(data.message || 'PDF has no embedded text. Export it as an image and re-upload.');
                }
                if (data.error === 'PDF_PARSE_FAILED') {
                    throw new Error(data.message || 'Could not read this PDF. Try re-saving it or upload pages as images.');
                }
                throw new Error(data.error || data.message || 'Read failed');
            }
            setResult(data);
            // Pre-select all high/medium confidence fields
            const sel = {};
            const allFields = documentType === 'contract'
                ? ['order', 'supplier', 'date', 'currency', 'products', 'remarks']
                : documentType === 'salescontract'
                    ? ['contractNo', 'client', 'date', 'currency', 'products', 'remarks']
                    : documentType === 'expense'
                        ? ['vendorInvoiceNumber', 'supplier', 'buyerPoNumber', 'date', 'currency', 'amount', 'expenseType', 'comments']
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
        // Deterministic guard against the qty↔price swap (Iberinox-style scrambled PDFs):
        // regardless of what the AI answered, a tonne-denominated line with a "price" of
        // ≤ $50 next to a "quantity" of ≥ 1,000 is a swapped pair (their alloys never cost
        // $1/MT, and no line is 12,500 MT). Swap it back before it reaches the form.
        const fixQtyPriceSwap = (p) => {
            const q = parseFloat(p.qnty), pr = parseFloat(p.unitPrc);
            const unit = String(p.unit || '').toUpperCase();
            const tonneBased = !unit || unit.startsWith('T') || unit.startsWith('MT');
            if (tonneBased && Number.isFinite(q) && Number.isFinite(pr) && pr <= 50 && q >= 1000) {
                return { ...p, qnty: pr, unitPrc: q };
            }
            return p;
        };

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
                out.productsData = result.products.map(fixQtyPriceSwap).map((p, i) => ({
                    id: `doc-${i}`, description: p.description || '', qnty: p.qnty || '', unitPrc: p.unitPrc || '',
                    // unit + line total let the Materials Breakdown convert to MT and
                    // reproduce the exact invoice amount (harmless extras elsewhere).
                    unit: p.unit || '', lineTotal: p.lineTotal ?? '',
                }));
            }
            // `remarks` is a structured ARRAY in this app — never overwrite it with a
            // freeform string. The AI's notes go to the plain-string `comments` field.
            // Chemistry (element analysis) + scale pricing have no structured field yet, so
            // fold them into comments so the extracted detail isn't lost.
            {
                const extra = [];
                if (selected.remarks && result.remarks) extra.push(String(result.remarks));
                (result.products || []).forEach(p => { if (p.analysis) extra.push(`${p.description || 'Material'} — analysis: ${p.analysis}`); });
                if (result.scalePricing) extra.push(`Scale prices: ${result.scalePricing}`);
                if (extra.length) out.comments = extra.join('\n');
            }
        } else if (documentType === 'salescontract') {
            // Client sales contract: map onto the sales-contract shape (contractNo + client + productsData).
            if (selected.contractNo && result.contractNo) out.contractNo = result.contractNo;
            if (selected.client && result.clientId) out.client = result.clientId;
            if (selected.date && result.date) {
                out.dateRange = { startDate: result.date, endDate: result.date };
                out.date = result.date;
            }
            if (selected.currency && result.currencyId) out.cur = result.currencyId;
            if (selected.products && result.products?.length) {
                out.productsData = result.products.map(fixQtyPriceSwap).map((p, i) => ({
                    id: `doc-${i}`, description: p.description || '', qnty: p.qnty || '', unitPrc: p.unitPrc || ''
                }));
            }
            if (selected.remarks && result.remarks) out.comments = String(result.remarks);
        } else if (documentType === 'expense') {
            // Map supplier-invoice fields onto the project's Expense shape.
            // Field names mirror what hooks/useExpensesState.js uses.
            if (selected.vendorInvoiceNumber && result.vendorInvoiceNumber) out.expense = result.vendorInvoiceNumber;
            if (selected.supplier && result.supplierId) out.supplier = result.supplierId;
            if (selected.date && result.date) {
                out.dateRange = { startDate: result.date, endDate: result.date };
                out.date = result.date;
            }
            if (selected.currency && result.currencyId) out.cur = result.currencyId;
            if (selected.amount && result.amount != null) out.amount = String(result.amount);
            if (selected.expenseType && result.expenseTypeId) out.expType = result.expenseTypeId;
            if (selected.comments) {
                const parts = [];
                if (result.buyerPoNumber) parts.push(`Buyer PO: ${result.buyerPoNumber}`);
                if (result.comments) parts.push(result.comments);
                if (parts.length) out.comments = parts.join('\n');
            }
            // Auto-link to the contract the AI matched by PO number (if present and
            // the user kept the buyerPoNumber selected). The Expense form reads
            // `poSupplier` as { id, order, date }.
            if (selected.buyerPoNumber && result.linkedContract) {
                out.poSupplier = {
                    id: result.linkedContract.id,
                    order: result.linkedContract.order,
                    date: result.linkedContract.date || result.date || '',
                };
            }
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
            // `remarks` is a structured ARRAY here too — route the AI string to `comments`.
            if (selected.remarks && result.remarks) out.comments = String(result.remarks);
        }
        // Persist the original document so it appears on the related preview.
        // An explicit anchor (e.g. the contract id from the Materials Breakdown /
        // Purchase Invoices autofill) wins; otherwise an expense import anchors to the
        // AI-linked contract — the supplier-invoice preview reads attachments by contract id.
        const finalAnchor = anchorId || (documentType === 'expense' ? result?.linkedContract?.id : null);
        if (finalAnchor && file) {
            uploadFile(finalAnchor, file, () => { }).catch(() => { });
        }
        onApply(out, file);
        onClose();
    };

    const toggle = (field) => setSelected(prev => ({ ...prev, [field]: !prev[field] }));

    const isContract = documentType === 'contract';
    const isSalesContract = documentType === 'salescontract';
    const isExpense = documentType === 'expense';

    // Mount-gate so the portal only renders client-side (SSR safety).
    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);
    if (!mounted) return null;

    const overlay = (
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
                            {isContract ? 'Autofill contract from supplier proforma' : isSalesContract ? 'Autofill sales contract from client contract' : isExpense ? 'Autofill expense from supplier invoice' : 'Import from Document — Invoice'}
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

                            {/* Multi-invoice warning — this PDF holds more than one invoice */}
                            {isExpense && result.multipleInvoices && (
                                <div className='flex items-start gap-2 p-2.5 rounded-lg mb-1' style={{ background: '#fff3cd', border: '1px solid #ffc107' }}>
                                    <AlertTriangle className='w-3.5 h-3.5 flex-shrink-0 mt-0.5' style={{ color: '#d97706' }} />
                                    <span style={{ fontSize: '0.62rem', color: '#92400e' }}>
                                        This PDF appears to contain more than one invoice. Only the FIRST one was extracted — record the others as separate expenses.
                                    </span>
                                </div>
                            )}

                            {isContract ? (
                                <>
                                    <FieldRow label='PO Number' value={result.order} confidence={result.confidence?.order} selected={selected.order} onToggle={() => toggle('order')} />
                                    <FieldRow label='Supplier' value={result.supplierId ? result.supplierName : result.supplierName ? `${result.supplierName} (no match)` : null} confidence={result.confidence?.supplier} selected={selected.supplier} onToggle={() => toggle('supplier')} />
                                    <FieldRow label='Date' value={result.date} confidence={result.confidence?.date} selected={selected.date} onToggle={() => toggle('date')} />
                                    <FieldRow label='Currency' value={result.currencyId ? result.currencyCode : result.currencyCode ? `${result.currencyCode} (no match)` : null} confidence={result.confidence?.currency} selected={selected.currency} onToggle={() => toggle('currency')} />
                                    <FieldRow label='Products' value={result.products} confidence={result.confidence?.products} selected={selected.products} onToggle={() => toggle('products')} />
                                    <FieldRow label='Notes / comments' value={result.remarks} confidence='medium' selected={selected.remarks} onToggle={() => toggle('remarks')} />
                                </>
                            ) : isSalesContract ? (
                                <>
                                    <FieldRow label='Sales Contract #' value={result.contractNo} confidence={result.confidence?.contractNo} selected={selected.contractNo} onToggle={() => toggle('contractNo')} />
                                    <FieldRow label='Client' value={result.clientId ? result.clientName : result.clientName ? `${result.clientName} (no match)` : null} confidence={result.confidence?.client} selected={selected.client} onToggle={() => toggle('client')} />
                                    <FieldRow label='Date' value={result.date} confidence={result.confidence?.date} selected={selected.date} onToggle={() => toggle('date')} />
                                    <FieldRow label='Currency' value={result.currencyId ? result.currencyCode : result.currencyCode ? `${result.currencyCode} (no match)` : null} confidence={result.confidence?.currency} selected={selected.currency} onToggle={() => toggle('currency')} />
                                    <FieldRow label='Materials' value={result.products} confidence={result.confidence?.products} selected={selected.products} onToggle={() => toggle('products')} />
                                    <FieldRow label='Notes / comments' value={result.remarks} confidence='medium' selected={selected.remarks} onToggle={() => toggle('remarks')} />
                                </>
                            ) : isExpense ? (
                                <>
                                    <FieldRow label='Vendor invoice #' value={result.vendorInvoiceNumber} confidence={result.confidence?.vendorInvoiceNumber} selected={selected.vendorInvoiceNumber} onToggle={() => toggle('vendorInvoiceNumber')} />
                                    <FieldRow label='Vendor (supplier)' value={result.supplierId ? result.supplierName : result.supplierName ? `${result.supplierName} (no match — pick manually)` : null} confidence={result.confidence?.supplier} selected={selected.supplier} onToggle={() => toggle('supplier')} />
                                    <FieldRow
                                        label='Linked contract (auto-matched by PO#)'
                                        value={result.linkedContract
                                            ? `${result.linkedContract.order} — ${result.linkedContract.supplierName || ''}`
                                            : result.buyerPoNumber
                                                ? `Found PO ${result.buyerPoNumber} on document — no matching contract in your data`
                                                : null}
                                        confidence={result.confidence?.buyerPoNumber}
                                        selected={selected.buyerPoNumber}
                                        onToggle={() => toggle('buyerPoNumber')}
                                    />
                                    <FieldRow label='Invoice date' value={result.date} confidence={result.confidence?.date} selected={selected.date} onToggle={() => toggle('date')} />
                                    <FieldRow label='Currency' value={result.currencyId ? result.currencyCode : result.currencyCode ? `${result.currencyCode} (no match)` : null} confidence={result.confidence?.currency} selected={selected.currency} onToggle={() => toggle('currency')} />
                                    <FieldRow label='Amount' value={result.amount != null ? Number(result.amount).toLocaleString() : null} confidence={result.confidence?.amount} selected={selected.amount} onToggle={() => toggle('amount')} />
                                    <FieldRow label='Expense category' value={result.expenseTypeId ? result.expenseTypeName : result.expenseTypeName ? `${result.expenseTypeName} (no match — pick manually)` : null} confidence='medium' selected={selected.expenseType} onToggle={() => toggle('expenseType')} />
                                    <FieldRow label='Comments' value={result.comments} confidence='medium' selected={selected.comments} onToggle={() => toggle('comments')} />
                                </>
                            ) : (
                                <>
                                    <FieldRow label='Invoice Number' value={result.invoice} confidence={result.confidence?.invoice} selected={selected.invoice} onToggle={() => toggle('invoice')} />
                                    <FieldRow label='Client' value={result.clientId ? result.clientName : result.clientName ? `${result.clientName} (no match)` : null} confidence={result.confidence?.client} selected={selected.client} onToggle={() => toggle('client')} />
                                    <FieldRow label='Date' value={result.date} confidence={result.confidence?.date} selected={selected.date} onToggle={() => toggle('date')} />
                                    <FieldRow label='Currency' value={result.currencyId ? result.currencyCode : result.currencyCode ? `${result.currencyCode} (no match)` : null} confidence={result.confidence?.currency} selected={selected.currency} onToggle={() => toggle('currency')} />
                                    <FieldRow label='Products' value={result.products} confidence={result.confidence?.products} selected={selected.products} onToggle={() => toggle('products')} />
                                    <FieldRow label='Notes / comments' value={result.remarks} confidence='medium' selected={selected.remarks} onToggle={() => toggle('remarks')} />
                                </>
                            )}

                            {/* Reconciliation panel — only when expense is auto-linked to a contract */}
                            {isExpense && result.reconcile && (
                                <ReconciliationPanel reconcile={result.reconcile} linkedContract={result.linkedContract} extractedCurrency={result.currencyCode} />
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

    // Portal escapes any parent stacking context (e.g. sticky/fixed parents in
    // the contract or expense modal). Renders directly under document.body so
    // the navbar's z-[10000] can't visually cover the overlay's header.
    return createPortal(overlay, document.body);
};

export default DocumentImportOverlay;
