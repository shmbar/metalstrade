'use client';
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Download, Printer, Loader2 } from 'lucide-react';

/**
 * In-app PDF viewer. Renders a jsPDF-produced Blob in an iframe so users can
 * review the exact document (looks identical to the file that gets sent) without
 * downloading it. Download / Print are still one click away.
 *
 * Props:
 *   blob      — a PDF Blob (e.g. doc.output('blob') from a jsPDF generator in 'preview' mode)
 *   filename  — suggested name when the user chooses to download
 *   title     — optional header label
 *   onClose   — close handler
 */
const PdfPreview = ({ blob, filename = 'document.pdf', title, onClose }) => {
    const [url, setUrl] = useState(null);
    const [mounted, setMounted] = useState(false);
    const iframeRef = useRef(null);

    useEffect(() => { setMounted(true); }, []);

    // Own the object-URL lifecycle here so it's always revoked on close/unmount.
    useEffect(() => {
        if (!blob) return;
        const objUrl = URL.createObjectURL(blob);
        setUrl(objUrl);
        return () => URL.revokeObjectURL(objUrl);
    }, [blob]);

    // Close on Escape
    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    const download = () => {
        if (!url) return;
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
    };

    const print = () => {
        try {
            iframeRef.current?.contentWindow?.focus();
            iframeRef.current?.contentWindow?.print();
        } catch {
            // Some browsers block programmatic print on blob iframes — fall back to download.
            download();
        }
    };

    if (!mounted) return null;

    const overlay = (
        <div
            className='fixed inset-0 z-[100000] flex items-center justify-center p-3 sm:p-4'
            style={{ background: 'rgba(0,0,0,0.5)' }}
            role='dialog'
            aria-modal='true'
            aria-label='PDF preview'
            onClick={onClose}
        >
            <div
                className='w-full max-w-4xl rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col'
                style={{ border: '1px solid #b8ddf8', height: '92vh' }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className='flex items-center justify-between px-4 py-3 flex-shrink-0' style={{ background: '#dbeeff', borderBottom: '1px solid #b8ddf8' }}>
                    <span className='font-semibold truncate' style={{ fontSize: '0.75rem', color: 'var(--chathams-blue)' }}>
                        {title || filename}
                    </span>
                    <div className='flex items-center gap-2'>
                        <button
                            onClick={download}
                            className='flex items-center gap-1 px-2.5 py-1 rounded-full border transition-colors hover:border-[var(--endeavour)]'
                            style={{ fontSize: '0.65rem', borderColor: '#b8ddf8', color: 'var(--chathams-blue)', background: 'white' }}
                        >
                            <Download className='w-3 h-3' /> Download
                        </button>
                        <button
                            onClick={print}
                            className='flex items-center gap-1 px-2.5 py-1 rounded-full border transition-colors hover:border-[var(--endeavour)]'
                            style={{ fontSize: '0.65rem', borderColor: '#b8ddf8', color: 'var(--chathams-blue)', background: 'white' }}
                        >
                            <Printer className='w-3 h-3' /> Print
                        </button>
                        <button
                            onClick={onClose}
                            aria-label='Close preview'
                            className='p-1 rounded-full hover:bg-[#b8ddf8] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--endeavour)]/40'
                        >
                            <X className='w-4 h-4' style={{ color: 'var(--chathams-blue)' }} />
                        </button>
                    </div>
                </div>

                {/* Viewer */}
                <div className='flex-1 min-h-0' style={{ background: '#525659' }}>
                    {url ? (
                        // #navpanes=0 hints the browser's built-in PDF viewer to open with the
                        // thumbnail/outline sidebar collapsed, so the document fills the frame.
                        <iframe
                            ref={iframeRef}
                            src={`${url}#toolbar=1&navpanes=0`}
                            title='PDF preview'
                            className='w-full h-full'
                            style={{ border: 'none' }}
                        />
                    ) : (
                        <div className='flex items-center justify-center h-full gap-2'>
                            <Loader2 className='w-5 h-5 animate-spin' style={{ color: 'white' }} />
                            <span style={{ fontSize: '0.72rem', color: 'white' }}>Preparing preview…</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    return createPortal(overlay, document.body);
};

export default PdfPreview;
