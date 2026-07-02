// Polyfills MUST be imported before any code that may transitively load pdfjs-dist
import '../../../../utils/pdfPolyfill';
import OpenAI from 'openai';
import { guardAiRequest } from '../../../../utils/aiGuard';
import { extractPdfText } from '../../../../utils/pdfExtract';

let openai;
function getOpenAI() {
    if (!openai) openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    return openai;
}

export async function POST(request) {
    const guard = await guardAiRequest(request);
    if (guard.error) return Response.json({ error: guard.error }, { status: guard.status });

    try {
        const { fileBase64, mimeType, documentType, suppliers, clients, currencies, expenseTypes, contractIndex } = await request.json();

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
    "unitPrc": number_or_null,
    "analysis": "the element/chemistry spec as written, or null"
  }],
  "scalePricing": "the 'Scale prices' block (per-MT content prices), or null",
  "remarks": "delivery term, payment term and other notes",
  "confidence": { "order": "high|medium|low", "supplier": "high|medium|low", "date": "high|medium|low", "products": "high|medium|low" }
}

EXTRACTION NOTES:
- order = the document's own "Contract No." (e.g. PB062970) — the reference for this purchase. Ignore "Your ref." if blank.
- qnty = the QUANTITY in MT (e.g. 76 from "76.000 MT (+/- 5%)"); unitPrc = the Base price per MT (e.g. 6700 from "6,700.00 USD/MT"). Both plain numbers.
- analysis = the ELEMENT table for that material as a compact string, e.g. "Ni min 42%, Cr min 12%, Mo min 3.5%; Cu max 0.5%, P max 0.03%, Co max 6%, Nb max 2.5%, Ti max 8%". Include every element shown (Nickel/Chrome/Molybdenum minimums and Copper/Phosphor/Cobalt/Niobium/Titan/Tungsten maximums).
- scalePricing = the "Scale prices:" block, e.g. "Ni USD 12,800/MT Ni content; Cr USD 1,850/MT Cr content; Mo USD 30,000/MT Mo content".`;
        } else if (documentType === 'salescontract') {
            // A CLIENT sales contract: the document is a sales agreement issued to / signed with
            // a buyer (client). The contract number is the client's sales-contract reference.
            schemaGuide = `Return JSON for a client sales contract.

CRITICAL EXTRACTION RULES:
- clientName = the BUYER / CUSTOMER the goods are sold TO (the consignee / "Buyer" / "Consignee" / "Sold to" / "Bill to" party). It is NEVER our own company "IMS Metals & Alloys" or "GIS Metals" — those are US, the SELLER on this contract. Choose the OTHER party (the customer), and return its COMPANY NAME (e.g. "Estma Ltd", "Exotech") — not just a street address. If you can only find an address with no company name, leave clientName null rather than returning the address.
- clientId = the id of the closest match in the Known clients list (match by company name, tolerant of spacing/punctuation). If no client clearly matches, return null — do NOT guess or pick our own company.
- contractNo = the client's sales-contract number / reference.

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

CRITICAL EXTRACTION RULES:
- supplierName = the SELLER / issuer of the invoice (the company whose letterhead/logo is at the top, e.g. "ELG Utica Alloys", "Exotech", "Thormet Europe GmbH", "Triart Capital"). It is NEVER the buyer ("IMS Metals & Alloys" or "GIS Metals" — those are us, the bill-to party).
- buyerPoNumber = the purchase-order reference, which appears under MANY different labels: "P.O. No", "PO No", "Cust PO #", "Purchase No", "Your PO", "PO#". Extract whatever value follows any of these (e.g. "280426-4", "0904-26", "PO210426-1", "280426"). If several invoices/POs appear, use the FIRST.
- amount = the TOTAL invoice value owed (grand total / total USD / total amount). If the invoice shows a prepayment and a smaller "balance to pay", still return the FULL total, not the balance.
- NUMBER FORMATS: documents may use European format where "." is the thousands separator and "," is the decimal (e.g. "273.429,00" means 273429.00). Also strip currency symbols and thousands commas (e.g. "$489,876.93" means 489876.93). ALWAYS return amount as a plain JSON number.
- multipleInvoices = true if the document clearly contains MORE THAN ONE separate invoice (different invoice numbers / PO numbers / totals on different pages). Otherwise false. When true, extract only the FIRST invoice's data.

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

        // European suppliers (Oryx, etc.) write dates day-month-year, which was being
        // misread — force day-first parsing and ISO output for every document type.
        const dateRule = `DATES: European suppliers usually write day-month-year — "10-6-2026" = 10 June 2026, "11-6-2026" = 11 June 2026 (NOT month-day). Read the day first, then the month, then the year, and ALWAYS output the "date" field as ISO YYYY-MM-DD.`;

        const systemTextPrompt = `You are a document parsing assistant for a metals trading IMS.
Extract structured data from the document text.
${entityLists}
${dateRule}
Match names to known entities (fuzzy match — "Jinchuan Group" matches "Jinchuan Group Co Ltd").
${schemaGuide}
Return ONLY the JSON object, no extra text.`;

        const systemVisionPrompt = `You are a document parsing assistant for a metals trading IMS.
Extract structured data from the document (image or scanned PDF).
${entityLists}
${dateRule}
Match names to known entities (fuzzy match).
${schemaGuide}
Return ONLY the JSON object, no extra text.`;

        let messages;
        let model;
        if (mimeType === 'application/pdf' && !usePdfVision) {
            // Digital PDF with a text layer. We use gpt-4o (not mini) because
            // supplier invoices have unpredictable layouts and label variants
            // ("Cust PO #", "Your PO", EU-format amounts like 273.429,00) — the
            // accuracy gap on extraction is worth the ~10x cost on small payloads.
            messages = [
                { role: 'system', content: systemTextPrompt },
                { role: 'user', content: extractedText || 'Could not extract text from PDF — return all fields as null.' },
            ];
            model = 'gpt-4o';
        } else if (mimeType === 'application/pdf' && usePdfVision) {
            // Scanned PDF / extraction failed — send the raw PDF to gpt-4o, which OCRs it
            messages = [
                { role: 'system', content: systemVisionPrompt },
                {
                    role: 'user',
                    content: [
                        { type: 'file', file: { filename: 'document.pdf', file_data: `data:application/pdf;base64,${fileBase64}` } },
                        { type: 'text', text: `This is a scanned ${documentType} document. Read it and extract the data.` },
                    ],
                },
            ];
            model = 'gpt-4o';
        } else {
            // Image upload (JPG/PNG) — vision
            messages = [
                { role: 'system', content: systemVisionPrompt },
                {
                    role: 'user',
                    content: [
                        { type: 'image_url', image_url: { url: `data:${mimeType};base64,${fileBase64}` } },
                        { type: 'text', text: `Extract ${documentType} data from this document.` },
                    ],
                },
            ];
            model = 'gpt-4o';
        }

        const response = await getOpenAI().chat.completions.create({
            model,
            temperature: 0,
            max_tokens: 1500,
            response_format: { type: 'json_object' },
            messages,
        });

        guard.recordUsage(response.usage?.total_tokens);
        const result = JSON.parse(response.choices[0].message.content);

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
        });

    } catch (err) {
        console.error('Document reader error:', err);
        return Response.json({ error: err.message || 'Failed to read document' }, { status: 500 });
    }
}
