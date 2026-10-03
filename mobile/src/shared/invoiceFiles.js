/* Which of a contract's uploaded files is THIS supplier invoice.
   PURE: no Firebase — the listing lives in utils/utils.js getAllfiles.

   A PO's files all live in one storage folder (`<contractId>/`), with nothing but
   their names to say which invoice each one is. The Cashflow preview used to show the
   folder's FIRST PDF for every invoice of the PO, so with invoices 146, 147, 153 and
   154 all uploaded, opening 147 showed 146 — and uploading 147 again changed nothing,
   because 146 still listed first (PO 010926, reported 2026-09-24).

   So the file is picked by its name: the one carrying this invoice's number. What the
   number looks like in a name varies by supplier — "Invoice No. 147 dd. 08.09.2026",
   "Rechnung Nr. 153 vom 17. September 2026" — so:
     - dates are removed first, so "08.09.2026" cannot pass for invoice 2026;
     - a number right after an invoice word (No, Nr, Invoice, Rechnung, …) is a strong
       match; the number anywhere else in the name is a weak one;
     - a weak match is not trusted for a number under 3 characters: invoice 17 is not
       "…vom 17. September…";
     - of equal matches, the newest upload wins — a re-upload is a correction.
   And when nothing matches, NOTHING is shown rather than another invoice's PDF. */

const KEYWORDS = new Set(['no', 'nr', 'nro', 'num', 'number', 'inv', 'invoice', 'rechnung', 'rg', 're',
    'facture', 'factura', 'fattura', 'faktura', 'bill', 'n', 'nº', 'no.']);

const DATE = /\b\d{1,2}[./-]\d{1,2}[./-]\d{2,4}\b/g;

const tokensOf = (s) => String(s ?? '').replace(DATE, ' ').match(/[\p{L}\p{N}]+/gu) || [];

// Leading zeros do not make a different invoice: "0040" is invoice 40.
const norm = (t) => {
    const x = String(t).toLowerCase();
    return /^\d+$/.test(x) ? x.replace(/^0+(?=\d)/, '') : x;
};

/** The part of an invoice number to look for in a file name: its first token with a
    digit in it ("496 ( Lobis)" → 496, "DSO2473 R88" → DSO2473, "AR250722.11" → AR250722). */
export const invoiceKey = (invoiceNo) => {
    const t = tokensOf(invoiceNo).find(x => /\d/.test(x));
    return t ? norm(t) : '';
};

/** 2 = the number follows an invoice word, 1 = the number is in the name, 0 = no match. */
export const matchScore = (fileName, invoiceNo) => {
    const key = invoiceKey(invoiceNo);
    if (!key) return 0;
    const toks = tokensOf(String(fileName ?? '').replace(/\.[a-z0-9]+$/i, ''));
    let best = 0;
    toks.forEach((t, i) => {
        if (norm(t) !== key) return;
        const prev = i > 0 ? toks[i - 1].toLowerCase() : '';
        best = Math.max(best, KEYWORDS.has(prev) ? 2 : 1);
    });
    return best === 1 && key.length < 3 ? 0 : best;
};

const stamp = (f) => {
    const t = Date.parse(f?.updated || '');
    return Number.isFinite(t) ? t : 0;
};

/**
 * The file for this invoice → the file, or null when none is named for it.
 * files: [{ name, url, updated? }].
 */
export const pickInvoiceFile = (files = [], invoiceNo) => {
    let best = null, bestScore = 0;
    (files || []).forEach((f, i) => {
        const s = matchScore(f?.name, invoiceNo);
        if (!s) return;
        const better = s > bestScore
            || (s === bestScore && (stamp(f) > stamp(best) || (stamp(f) === stamp(best) && i > best._i)));
        if (better) { best = { ...f, _i: i }; bestScore = s; }
    });
    if (!best) return null;
    const { _i, ...file } = best;
    return files[_i] ?? file;
};

/** A name that will find its way back to this invoice: kept as is when it already
    carries the number, else prefixed with it. */
export const nameForInvoice = (fileName, invoiceNo) =>
    matchScore(fileName, invoiceNo) === 2 || !invoiceKey(invoiceNo)
        ? fileName
        : `Invoice ${String(invoiceNo).trim()} - ${fileName}`;
