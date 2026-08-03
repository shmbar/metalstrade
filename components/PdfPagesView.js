'use client';
import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';

// Renders a PDF's pages as plain images via pdf.js — bypassing the browser's
// built-in PDF viewer entirely. The viewer's chrome (thumbnail sidebar, dark
// toolbar) kept appearing in previews because the "#navpanes=0" URL hints are
// only advisory: Chrome partially honors them, Safari ignores them completely.
// Rendering to images gives the same clean result in every browser, including
// Lockdown-Mode Safari. Falls back to a plain iframe if rendering fails.
const PdfPagesView = ({ src, height = '68vh' }) => {
    const [pages, setPages] = useState(null); // null = loading, [] = failed → iframe fallback
    const aliveRef = useRef(true);

    useEffect(() => {
        aliveRef.current = true;
        setPages(null);
        let loadingTask = null;
        (async () => {
            try {
                const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
                pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
                const resp = await fetch(src);
                const data = new Uint8Array(await resp.arrayBuffer());
                loadingTask = pdfjs.getDocument({ data });
                const doc = await loadingTask.promise;
                const out = [];
                const maxPages = Math.min(doc.numPages, 30);
                for (let i = 1; i <= maxPages; i++) {
                    if (!aliveRef.current) return;
                    const page = await doc.getPage(i);
                    const base = page.getViewport({ scale: 1 });
                    const scale = Math.min(1400 / base.width, 3);
                    const viewport = page.getViewport({ scale });
                    const canvas = document.createElement('canvas');
                    canvas.width = Math.ceil(viewport.width);
                    canvas.height = Math.ceil(viewport.height);
                    const ctx = canvas.getContext('2d');
                    await page.render({ canvasContext: ctx, canvas, viewport }).promise;
                    out.push(canvas.toDataURL('image/jpeg', 0.9));
                    // Progressive: show pages as they render so big files feel fast.
                    if (aliveRef.current) setPages([...out]);
                }
            } catch (e) {
                console.warn('PDF page view failed, falling back to iframe:', e?.message || e);
                if (aliveRef.current) setPages([]);
            } finally {
                try { loadingTask?.destroy()?.catch?.(() => { }); } catch { /* already destroyed */ }
            }
        })();
        return () => { aliveRef.current = false; };
    }, [src]);

    if (pages === null) {
        return (
            <div className='flex items-center justify-center gap-2 rounded-lg border'
                style={{ height, borderColor: 'var(--border-cell)', background: 'var(--surface-card)' }}>
                <Loader2 className='w-4 h-4 animate-spin' style={{ color: 'var(--endeavour)' }} />
                <span style={{ fontSize: 'var(--fs-body)', color: 'var(--regent-gray)' }}>Rendering document…</span>
            </div>
        );
    }

    if (pages.length === 0) {
        return (
            <iframe title='document' src={`${src}#toolbar=1&navpanes=0`}
                style={{ width: '100%', height, border: '1px solid var(--border-cell)', borderRadius: '6px', background: 'var(--surface-card)' }} />
        );
    }

    return (
        <div className='overflow-y-auto rounded-lg border' style={{ height, borderColor: 'var(--border-cell)', background: '#eef2f6' }}>
            {pages.map((p, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={p} alt={`Page ${i + 1}`}
                    style={{ display: 'block', width: '100%', maxWidth: '900px', margin: '10px auto', boxShadow: '0 1px 4px rgba(var(--shadow-rgb), 0.15)', background: 'var(--surface-card)' }} />
            ))}
        </div>
    );
};

export default PdfPagesView;
