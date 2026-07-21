// Polyfills MUST be imported before any code that may transitively load pdfjs-dist
import '../../../../utils/pdfPolyfill';
import OpenAI from 'openai';
import { guardAiRequest } from '../../../../utils/aiGuard';
import { extractPdfText } from '../../../../utils/pdfExtract';

// Reading a multi-page / scanned document through gpt-4o routinely takes longer
// than the platform's default function timeout — without this the client saw
// bare 504s ("Server replied 504") on heavier documents.
export const maxDuration = 60;

let openai;
function getOpenAI() {
    if (!openai) openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    return openai;
}

export async function POST(request) {
    const guard = await guardAiRequest(request);
    if (guard.error) return Response.json({ error: guard.error }, { status: guard.status });

    try {
        const { fileBase64, pagesBase64, mimeType, documentType, suppliers, clients, currencies, expenseTypes, contractIndex } = await request.json();

        if (!fileBase64) {
            return Response.json({ error: 'No file provided' }, { status: 400 });
        }

        // Extract text from PDF. ANY failure (scanned image, missing pdfjs worker
        // on Vercel, corrupt PDF, etc.) falls back to sending the raw PDF to
        // gpt-4o — which OCRs both digital and scanned PDFs server-side. This
        // means the feature works on Vercel even when pdfjs's worker isn't
        // bundled in the serverless function (a known Vercel + pdfjs-dist quirk).
        let extractedText = '';
        let usePdfVision = false; // true → send raw PDF to gpt-4o (no local parse)
        if (mimeType === 'application/pdf') {
            const buffer = Buffer.from(fileBase64, 'base64');
            const r = await extractPdfText(buffer);

            if (r.ok) {
                extractedText = r.text;
            } else {
                // EMPTY (scanned) OR FAILED (worker missing / corrupt) — let
                // gpt-4o read the PDF directly. Log the underlying reason so we
                // can still see in the server console which path was taken.
                console.warn('PDF extraction did not return text, falling back to vision:',
                    r.reason || 'unknown', r.message || '', r.attempted || '');
                usePdfVision = true;
            }

            // A "successful" extraction that yields almost nothing is usually garbage
            // OCR or a header-only text layer on an otherwise scanned document.
            // When the client sent rendered page images, prefer reading those.
            if (!usePdfVision && extractedText.trim().length < 200
                && Array.isArray(pagesBase64) && pagesBase64.length) {
                console.warn('PDF text layer too thin (' + extractedText.trim().length + ' chars), using rendered pages instead.');
                usePdfVision = true;
            }
        }

        // Build the list of known entities the AI can match against (per document type)
        const supplierList = (suppliers || []).map(s => `"${s.nname}" (id: ${s.id})`).join(', ');
        const clientListStr = (clients || []).map(c => `"${c.nname}" (id: ${c.id})`).join(', ');
        const currencyList = (currencies || []).map(c => `"${c.cur}" (id: ${c.id})`).join(', ');
        const expenseTypeList = (expenseTypes || []).map(e => `"${e.expType}" (id: ${e.id})`).join(', ');

        let entityLists;
        if (documentType === 'contract') {
            entityLists = `Known suppliers: ${supplierList}\nKnown currencies: ${currencyList}`;
        } else if (documentType === 'salescontract') {
            entityLists = `Known clients: ${clientListStr}\nKnown currencies: ${currencyList}`;
        } else if (documentType === 'expense') {
            entityLists = `Known suppliers (vendors): ${supplierList}\nKnown currencies: ${currencyList}\nKnown expense categories: ${expenseTypeList}`;
        } else {
            entityLists = `Known clients: ${clientListStr}\nKnown currencies: ${currencyList}`;
        }

        let schemaGuide;
        if (documentType === 'contract') {
            schemaGuide = `Return JSON for a purchase contract / purchase confirmation:
{
  "order": "the supplier's Contract No. / reference (e.g. 'PB062970') or null",
  "supplierName": "the issuer/seller company name (e.g. 'Oryx Stainless BV')",
  "supplierId": "matched supplier id or null",
  "date": "YYYY-MM-DD or null",
  "currencyCode": "USD/EUR/etc or null",
  "currencyId": "matched currency id or null",
  "products": [{
    "description": "material name, e.g. 'Cr Ni Mo Turnings'",
    "qnty": number_or_null,
    "unit": "the quantity unit AS PRINTED: 'MT' / 'KGS' / 'LB' or null",
    "unitPrc": number_or_null,
    "lineTotal": number_or_null,
    "analysis": "the element/chemistry spec as written, or null"
  }],
  "scalePricing": "the 'Scale prices' block (per-MT content prices), or null",
  "remarks": "delivery term, payment term and other notes",
  "confidence": { "order": "high|medium|low", "supplier": "high|medium|low", "date": "high|medium|low", "products": "high|medium|low" }
}

FIELD NOTES:
- order = the document's own "Contract No." — the reference for this purchase. Ignore "Your ref." if blank.
- qnty/unit/unitPrc/lineTotal = the line's quantity, unit, per-unit price and money total AS PRINTED (e.g. 17399 "LB" × 0.550 = 9569.45) — see UNITS rule, the app converts.
- Extract EVERY material line across ALL pages. A scanned bundle may contain SEVERAL invoices (one per page) — include each page's line(s) as separate products entries, not just the first page.
- analysis = the ELEMENT table for that material as a compact string, e.g. "Ni min 42%, Cr min 12%, Mo min 3.5%; Cu max 0.5%, P max 0.03%, Co max 6%, Nb max 2.5%, Ti max 8%". Include every element shown (Nickel/Chrome/Molybdenum minimums and Copper/Phosphor/Cobalt/Niobium/Titan/Tungsten maximums).
- scalePricing = the "Scale prices:" block, e.g. "Ni USD 12,800/MT Ni content; Cr USD 1,850/MT Cr content; Mo USD 30,000/MT Mo content".`;
        } else if (documentType === 'salescontract') {
            // A CLIENT sales contract: the document is a sales agreement issued to / signed with
            // a buyer (client). The contract number is the client's sales-contract reference.
            schemaGuide = `Return JSON for a client sales contract (we are the SELLER; the client is the buyer — see PARTIES rule).

FIELD NOTES:
- clientName = the buyer/customer COMPANY NAME (e.g. "Estma Ltd", "Exotech") — never just a street address; if only an address is visible, return null.
- contractNo = the client's sales-contract number / reference (on a purchase order: the issuer's "Order No", e.g. 3001284).
- qnty in MT and unitPrc per MT (see UNITS rule).

{
  "contractNo": "the sales contract number / reference string or null",
  "clientName": "the buyer/customer company name (never IMS/GIS) or null",
  "clientId": "matched client id or null",
  "date": "YYYY-MM-DD or null",
  "currencyCode": "USD/EUR/etc or null",
  "currencyId": "matched currency id or null",
  "products": [{ "description": "string", "qnty": number_or_null, "unitPrc": number_or_null }],
  "remarks": "any notes or terms from the document",
  "confidence": { "contractNo": "high|medium|low", "client": "high|medium|low", "date": "high|medium|low", "products": "high|medium|low" }
}`;
        } else if (documentType === 'expense') {
            // For supplier-invoice → expense flow. The document was sent BY the
            // supplier TO bill our company, so the SELLER is the vendor we want.
            schemaGuide = `Return JSON for a supplier invoice / proforma that will be recorded as an expense.

FIELD NOTES:
- supplierName = the SELLER / issuer of the invoice (the company whose letterhead/logo is at the top, e.g. "ELG Utica Alloys", "Exotech", "Thormet Europe GmbH") — never the bill-to party (see PARTIES rule).
- vendorInvoiceNumber = the number explicitly labeled Invoice No / Invoice # / Rechnung / Faktura. Some suppliers (e.g. ELG) print NO invoice number at all — then use the shipment/sales reference instead ("Sales No.", "Shipment No.", "Sales Order", e.g. "DSO2544"). NEVER assemble it from stray digits: barcodes, customer/account codes, phone, VAT or registration numbers are not invoice numbers. If nothing suitable exists, return null.
- buyerPoNumber = the purchase-order reference, under ANY label: "P.O. No", "PO No", "Cust PO #", "Purchase No", "Your PO", "PO#" (e.g. "280426-4", "0904-26", "PO210426-1"). If several appear, use the FIRST. Monthly storage/terminal invoices often have a blank "YOUR ORDER NUMBER" → null.
- amount = the FULL invoice total owed (grand total / "INVOICE TOTAL" / "Total USD"), as a plain JSON number. Not a prepayment balance, not a prompt-payment discount figure ("190.500,00 x 80% prompt = 152.400,00" → return 190500). Ignore footnote marks ("654.63*" = 654.63).
- amount is MONEY, never a weight or rate: match each value to its COLUMN HEADER and take only the AMOUNT/TOTAL column — an invoice listing 222,254 lbs at rate 5.0500 with "INVOICE TOTAL: $654.63" has amount = 654.63. Prefer the labeled total line over column position (typewriter-style storage invoices misalign columns).
- CREDIT NOTE / CORRECTION ("credit note", "Gutschrift", "Korekta faktury"): return the corrected FINAL total if shown; if only a negative adjustment is stated, return it as a NEGATIVE number.
- multipleInvoices = true if the document clearly contains MORE THAN ONE separate invoice (different invoice numbers / totals on different pages); extract only the FIRST invoice's data.

{
  "vendorInvoiceNumber": "supplier's own invoice number string or null",
  "supplierName": "the SELLER company name (issuer)",
  "supplierId": "matched supplier id or null",
  "buyerPoNumber": "the PO reference (any label) or null",
  "date": "YYYY-MM-DD (invoice issue date — NOT the original PO date) or null",
  "currencyCode": "USD/EUR/etc or null",
  "currencyId": "matched currency id or null",
  "amount": number_or_null,
  "multipleInvoices": true_or_false,
  "expenseTypeName": "best-guess category (e.g. 'Material purchase', 'Freight', 'Customs', 'Insurance') based on what is being billed",
  "expenseTypeId": "matched expense category id or null",
  "comments": "short notes — delivery / payment terms, what was billed, anything useful",
  "confidence": { "vendorInvoiceNumber": "high|medium|low", "supplier": "high|medium|low", "amount": "high|medium|low", "date": "high|medium|low", "buyerPoNumber": "high|medium|low" }
}`;
        } else {
            schemaGuide = `Return JSON for an invoice:
{
  "invoice": "invoice number string or null",
  "clientName": "extracted client name",
  "clientId": "matched client id or null",
  "date": "YYYY-MM-DD or null",
  "currencyCode": "USD/EUR/etc or null",
  "currencyId": "matched currency id or null",
  "products": [{ "description": "string", "qnty": number_or_null, "unitPrc": number_or_null }],
  "remarks": "any notes or payment terms",
  "confidence": { "invoice": "high|medium|low", "client": "high|medium|low", "date": "high|medium|low", "products": "high|medium|low" }
}`;
        }

        // One compact, priority-ordered rule block shared by every path. This replaced an
        // accreted pile of per-case rules that had started to contradict each other —
        // "read every figure twice", digit-swap priming (3↔8, 6↔9) and a ±1-currency
        // self-check tolerance were making the model REWRITE correctly-read digits.
        // Transcription comes first; arithmetic may only override a read when it fails
        // by orders of magnitude. The scrambled-table rule applies ONLY to the
        // text-extraction path (vision sees the real layout, so reshuffling there is harmful).
        const buildRules = (textPath) => {
            const lines = [
                'TRANSCRIBE what is printed. Report each figure as it appears; change a read only when a rule below proves it wrong. If the document is legible and consistent, do not second-guess it.',
                'NUMBER FORMAT — decide once per document, then apply throughout. EU style: dot/space/apostrophe = thousands, comma = decimal ("12.500,00" = 12500.00, "1,00" = 1.00). UK/US style: comma = thousands, dot = decimal ("48,000.000" = 48000). If ambiguous, pick the reading under which qty × price = amount.',
                'QUANTITY vs PRICE: the quantity is the value tied to a unit (MT/TN/KGS/LB); the price is the per-unit money value. Check each line: qty × price ≈ line amount (allow normal rounding). Reassign ONLY if the check fails by orders of magnitude — that means swapped columns or a misparsed format; otherwise keep the printed values. The quantity and its unit belong ONLY in the qnty/unit fields — never repeat them inside the description; description is the material/grade text alone ("12.46 NI, 8.87 CR, 1.33 MO", not "42 MT 12.46 NI…").',
                ...(textPath ? ['SCRAMBLED TEXT: if the extracted text is visibly scrambled (whole columns arrive as separate blocks, unit tokens like "TN" detached at the end), reconstruct each line using the qty × price = amount identity. Never reshuffle a document whose layout reads normally.'] : []),
                'UNITS — purchase contract: keep the document\'s own unit in "unit"; do NOT convert. Sales contract: convert qnty to MT ("48,000 kgs" = 48 MT; LB × 0.00045359237) and unitPrc to per-MT (per-kg price × 1000), so qty × price still equals the line amount.',
                'DATES: European issuers write day-month-year, US/Canadian month-day-year; any component > 12 settles the order. Use the invoice/issue date, not a sales, delivery or due date. Always output ISO YYYY-MM-DD.',
                'PARTIES: the client/vendor is the counterparty, NEVER our own "IMS Metals" or "GIS Metals" — those are us. BUYER-ISSUED documents invert the roles: a PURCHASE ORDER, PURCHASE CONTRACT or PURCHASE(S) CONFIRMATION, wording like "we confirm having purchased from you" / "our purchases and your sales", or IMS/GIS appearing as the addressee ("TO: IMS Metals…") or under "PURCHASED FROM" — in all of these the letterhead/issuing company is the BUYER (that is the client) and the IMS/GIS party is us, the seller. If the only candidate is IMS/GIS, return null.',
                'Match names against the known-entity lists (fuzzy on spacing/punctuation — "Jinchuan Group" matches "Jinchuan Group Co Ltd"); return null rather than guess.',
            ];
            return 'RULES (priority order — when two rules conflict, the higher one wins):\n'
                + lines.map((l, i) => `${i + 1}. ${l}`).join('\n');
        };

        const buildSystemPrompt = (textPath) => `You are a document parsing assistant for a metals trading IMS.
Extract structured data from the ${textPath ? 'document text' : 'document image(s)'}.
${entityLists}
${buildRules(textPath)}
${schemaGuide}
Return ONLY the JSON object, no extra text.`;

        // gpt-4o (not mini) because supplier invoices have unpredictable layouts and
        // label variants — the accuracy gap on extraction is worth the cost on small
        // payloads. Overridable per-deploy without a code change.
        const model = process.env.OPENAI_DOCREADER_MODEL || 'gpt-4o';

        let messages;
        if (mimeType === 'application/pdf' && !usePdfVision) {
            // Digital PDF with a usable text layer.
            messages = [
                { role: 'system', content: buildSystemPrompt(true) },
                { role: 'user', content: extractedText || 'Could not extract text from PDF — return all fields as null.' },
            ];
        } else if (mimeType === 'application/pdf' && usePdfVision) {
            // Scanned PDF / extraction failed. Prefer the client-rendered page images:
            // sent as image_url with detail:'high' they reach the model at full
            // resolution, whereas a raw PDF file part is rasterized provider-side at a
            // DPI we can't control — the source of digit misreads like 2,983→2,948.
            const pages = Array.isArray(pagesBase64) ? pagesBase64.filter(p => typeof p === 'string' && p.length) : [];
            const imageParts = pages.length
                ? pages.map(p => ({ type: 'image_url', image_url: { url: `data:image/jpeg;base64,${p}`, detail: 'high' } }))
                : [{ type: 'file', file: { filename: 'document.pdf', file_data: `data:application/pdf;base64,${fileBase64}` } }];
            messages = [
                { role: 'system', content: buildSystemPrompt(false) },
                {
                    role: 'user',
                    content: [
                        ...imageParts,
                        { type: 'text', text: `This is a scanned ${documentType} document${pages.length > 1 ? ` (${pages.length} pages)` : ''}. Read it and extract the data.` },
                    ],
                },
            ];
        } else {
            // Image upload (JPG/PNG) — vision
            messages = [
                { role: 'system', content: buildSystemPrompt(false) },
                {
                    role: 'user',
                    content: [
                        { type: 'image_url', image_url: { url: `data:${mimeType};base64,${fileBase64}`, detail: 'high' } },
                        { type: 'text', text: `Extract ${documentType} data from this document.` },
                    ],
                },
            ];
        }

        const response = await getOpenAI().chat.completions.create({
            model,
            temperature: 0,
            // Mixed-container invoices (Donald McArthy et al.) carry 20+ material lines;
            // headroom so the JSON never truncates mid-array.
            max_tokens: 4000,
            response_format: { type: 'json_object' },
            messages,
            // Stay under maxDuration so a hung upstream returns OUR json error,
            // not the platform's bare 504 page.
        }, { timeout: 50_000 });

        guard.recordUsage(response.usage?.total_tokens);
        const result = JSON.parse(response.choices[0].message.content);

        // Deterministic line check: when a product line carries qty, price AND total,
        // they must multiply out. Legitimate rounding is bounded by the printed price
        // precision (well under 0.5%), while a single misread digit lands anywhere from
        // ~1% up (the ELG case: 2,948 × 2.000 vs total 5,966 is 1.2% off) — so flag at
        // 0.5% with a 1-currency-unit floor and downgrade products confidence; the UI
        // auto-deselects low-confidence fields, forcing a human look instead of a
        // silent bad import.
        if (Array.isArray(result.products)) {
            const mismatch = result.products.some(p => {
                const q = Number(p.qnty), pr = Number(p.unitPrc), t = Number(p.lineTotal);
                // All three factors must be real non-zero numbers — Number(null) is 0,
                // and a missing qty/price (lump-sum lines) proves nothing about digits.
                if (!Number.isFinite(q) || !Number.isFinite(pr) || !Number.isFinite(t) || !q || !pr || !t) return false;
                return Math.abs(q * pr - t) > Math.max(1, 0.005 * Math.abs(t));
            });
            if (mismatch) {
                result.confidence = { ...(result.confidence || {}), products: 'low' };
                result.lineCheckFailed = true;
            }
        }

        // Safety net: normalize `amount` if the model returned it as a string in a
        // tricky format. Handles "$489,876.93", "273.429,00" (EU), "1 234,56".
        if (documentType === 'expense' && result.amount != null && typeof result.amount !== 'number') {
            const raw = String(result.amount).replace(/[^\d.,-]/g, '').trim();
            let normalized = raw;
            const lastComma = raw.lastIndexOf(',');
            const lastDot = raw.lastIndexOf('.');
            if (lastComma > lastDot) {
                // EU format: comma is decimal, dots are thousands → "273.429,00" → "273429.00"
                normalized = raw.replace(/\./g, '').replace(',', '.');
            } else {
                // US format: dot is decimal, commas are thousands → "489,876.93" → "489876.93"
                normalized = raw.replace(/,/g, '');
            }
            const n = parseFloat(normalized);
            result.amount = Number.isFinite(n) ? n : null;
        }

        // For an expense, try to auto-link the supplier invoice to an existing
        // contract using the buyer's PO number that the supplier referenced.
        // Also build a reconciliation block (qty/price drift) so the UI can
        // flag over-billing before the user approves the expense.
        let linkedContract = null;
        let reconcile = null;
        if (documentType === 'expense' && Array.isArray(contractIndex) && result.buyerPoNumber) {
            const target = String(result.buyerPoNumber).toLowerCase().replace(/[^a-z0-9-]/g, '');
            const matchByOrder = (c) => {
                const ord = String(c.order || '').toLowerCase().replace(/[^a-z0-9-]/g, '');
                if (!ord || !target) return false;
                return ord === target || ord.includes(target) || target.includes(ord);
            };
            const match = contractIndex.find(matchByOrder);
            if (match) {
                linkedContract = {
                    id: match.id,
                    order: match.order,
                    supplier: match.supplier,
                    supplierName: match.supplierName,
                    currency: match.currency,
                    products: match.products || [],
                };

                // Build per-product reconciliation. We can only check qty/price
                // when the supplier's document has product lines AND the contract
                // has matching products by (normalised) description.
                if (Array.isArray(result.products) && result.products.length && Array.isArray(match.products) && match.products.length) {
                    const norm = (s) => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
                    const rows = result.products.map(invP => {
                        const conP = match.products.find(cp => norm(cp.description) === norm(invP.description))
                            || match.products.find(cp => norm(cp.description).includes(norm(invP.description)) || norm(invP.description).includes(norm(cp.description)));
                        if (!conP) return { description: invP.description, qntyInvoice: invP.qnty, priceInvoice: invP.unitPrc, contractFound: false };
                        const qInv = Number(invP.qnty) || 0;
                        const qCon = Number(conP.qnty) || 0;
                        const pInv = Number(invP.unitPrc) || 0;
                        const pCon = Number(conP.unitPrc) || 0;
                        const qDiff = qInv - qCon;
                        const pDiff = pInv - pCon;
                        const qPct = qCon ? (qDiff / qCon) * 100 : null;
                        const pPct = pCon ? (pDiff / pCon) * 100 : null;
                        return {
                            description: invP.description,
                            qntyContract: qCon, qntyInvoice: qInv, qntyDiff: qDiff, qntyPct: qPct,
                            priceContract: pCon, priceInvoice: pInv, priceDiff: pDiff, pricePct: pPct,
                            contractFound: true,
                        };
                    });
                    // Total expected vs total invoiced (in invoice currency)
                    const expectedTotal = rows.reduce((s, r) => s + (r.contractFound ? r.qntyContract * r.priceContract : 0), 0);
                    const invoicedTotal = (result.amount != null)
                        ? Number(result.amount)
                        : rows.reduce((s, r) => s + ((Number(r.qntyInvoice) || 0) * (Number(r.priceInvoice) || 0)), 0);
                    reconcile = {
                        currencyMatch: result.currencyCode && match.currency
                            ? String(result.currencyCode).toUpperCase() === String(match.currency).toUpperCase()
                            : null,
                        rows,
                        expectedTotal,
                        invoicedTotal,
                        totalDiff: invoicedTotal - expectedTotal,
                        totalPct: expectedTotal ? ((invoicedTotal - expectedTotal) / expectedTotal) * 100 : null,
                    };
                }
            }
        }

        return Response.json({
            ...result,
            documentType,
            rawText: extractedText.slice(0, 500),
            linkedContract,
            reconcile,
            // true whenever digits were read visually (scanned PDF pages or an image
            // upload) rather than from a text layer — the UI shows a caution note.
            visionUsed: usePdfVision || mimeType !== 'application/pdf',
        });

    } catch (err) {
        console.error('Document reader error:', err);
        return Response.json({ error: err.message || 'Failed to read document' }, { status: 500 });
    }
}
