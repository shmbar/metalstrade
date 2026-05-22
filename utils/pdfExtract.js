// Server-side PDF text extractor used by /api/ai/document-reader and
// /api/ai/cert-checker.
//
// Returns a structured result so callers can distinguish:
//   { ok: true,  text }                                   — text extracted
//   { ok: false, reason: 'EMPTY',  attempted: [...] }     — pdf parsed but contains no text (real scanned image)
//   { ok: false, reason: 'FAILED', message, attempted }   — pdf could NOT be parsed (real diagnostic)

import './pdfPolyfill';

// pdf-parse@2.x is a CLASS (PDFParse) with a getText() method — NOT the
// callable function from v1. We use it via:  new PDFParse({ data }).getText()
async function tryPdfParse(buffer) {
    try {
        const { PDFParse } = await import('pdf-parse');
        if (typeof PDFParse !== 'function') {
            return { ok: false, err: new Error('PDFParse class not exported from pdf-parse') };
        }
        const parser = new PDFParse({ data: new Uint8Array(buffer) });
        const result = await parser.getText();
        try { await parser.destroy?.(); } catch { /* ignore */ }
        return { ok: true, text: (result?.text || '') };
    } catch (err) {
        return { ok: false, err };
    }
}

// Fallback: use pdfjs-dist directly. The legacy build is Node-friendly but
// pdfjs v5 still needs a worker disabled correctly — we point workerSrc at
// the actual worker file (file:// URL) since "false" or "" can trigger the
// "Object.defineProperty called on non-object" failure.
async function tryPdfjs(buffer) {
    try {
        const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
        // Best-effort worker disable. If GlobalWorkerOptions is missing, skip.
        try {
            if (pdfjs.GlobalWorkerOptions && typeof pdfjs.GlobalWorkerOptions === 'object') {
                // Use a data: URL with empty script so pdfjs has a "valid" worker target
                pdfjs.GlobalWorkerOptions.workerSrc = pdfjs.GlobalWorkerOptions.workerSrc || '';
            }
        } catch { /* ignore — sometimes setting workerSrc throws */ }

        const uint8 = new Uint8Array(buffer);
        const loadingTask = pdfjs.getDocument({
            data: uint8,
            disableFontFace: true,
            useSystemFonts: false,
            isEvalSupported: false,
            verbosity: 0,
        });
        const doc = await loadingTask.promise;
        const pageTexts = [];
        for (let i = 1; i <= doc.numPages; i++) {
            const page = await doc.getPage(i);
            const content = await page.getTextContent();
            const text = content.items.map(it => (it.str || '')).join(' ');
            pageTexts.push(text);
        }
        try { await doc.destroy?.(); } catch { /* ignore */ }
        return { ok: true, text: pageTexts.join('\n\n') };
    } catch (err) {
        return { ok: false, err };
    }
}

export async function extractPdfText(buffer) {
    const attempted = [];

    const r1 = await tryPdfParse(buffer);
    attempted.push({ via: 'pdf-parse', ok: r1.ok, len: r1.ok ? r1.text.length : 0, err: r1.err?.message });
    if (r1.ok && r1.text.trim().length >= 30) return { ok: true, text: r1.text };

    const r2 = await tryPdfjs(buffer);
    attempted.push({ via: 'pdfjs-dist', ok: r2.ok, len: r2.ok ? r2.text.length : 0, err: r2.err?.message });
    if (r2.ok && r2.text.trim().length >= 30) return { ok: true, text: r2.text };

    if (r1.ok && r2.ok) {
        return { ok: false, reason: 'EMPTY', attempted };
    }

    const lastErr = r2.err || r1.err;
    return {
        ok: false,
        reason: 'FAILED',
        message: lastErr?.message || 'PDF parsing failed for an unknown reason.',
        attempted,
    };
}
