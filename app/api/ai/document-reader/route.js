// Polyfills MUST be imported before any code that may transitively load pdfjs-dist
import '../../../../utils/pdfPolyfill';
import OpenAI from 'openai';
import { guardAiRequest } from '../../../../utils/aiGuard';
import { extractPdfText } from '../../../../utils/pdfExtract';
import { resolveCounterparty } from '../../../../utils/docReaderParties';
import { extractSheetText, isSpreadsheet, isLegacyXls } from '../../../../utils/sheetExtract';

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
        const { fileBase64, pagesBase64, mimeType, fileName, documentType, suppliers, clients, currencies, expenseTypes, contractIndex } = await request.json();

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
        let useSheet = false;     // true → the text came from a spreadsheet grid

        /* Spreadsheets take the TEXT path, never vision: the cells are already
           exact, so there is nothing to OCR. A legacy BIFF .xls is refused by
           name rather than by parse error — exceljs reads OOXML only, and
           "re-save it as .xlsx" is something the user can act on. */
        if (isSpreadsheet(mimeType, fileName)) {
            if (isLegacyXls(mimeType, fileName)) {
                return Response.json({
                    error: 'LEGACY_XLS',
                    message: 'That is an old-format .xls file. Open it and re-save as .xlsx (or CSV), then upload again.',
                }, { status: 400 });
            }
            const buffer = Buffer.from(fileBase64, 'base64');
            const r = await extractSheetText(buffer, mimeType, fileName);
            if (!r.ok) {
                return Response.json({
                    error: 'SHEET_PARSE_FAILED',
                    message: r.reason === 'EMPTY'
                        ? 'That spreadsheet has no readable rows.'
                        : 'Could not read that spreadsheet. Re-save it as .xlsx or CSV and try again.',
                }, { status: 400 });
            }
            extractedText = r.text;
            useSheet = true;
        } else if (mimeType === 'application/pdf') {
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
        } else if (documentType === 'materialtable') {
            // A packing list / analysis certificate names no counterparty we need to
            // match and carries no money — the entity lists would only be noise here.
            entityLists = '';
        } else {
            entityLists = `Known clients: ${clientListStr}\nKnown currencies: ${currencyList}`;
        }

        // Chemistry + scale pricing sit on BOTH sides of the same trade: a supplier's
        // purchase contract, and — when the counterparty is the one who issued the
        // purchase confirmation — our sales contract for the very same material. Written
        // once so the two paths can't drift apart.
        const analysisNote = '- analysis = the ELEMENT table for that material as a compact string, e.g. "Ni min 42%, Cr min 12%, Mo min 3.5%; Cu max 0.5%, P max 0.03%, Co max 6%, Nb max 2.5%, Ti max 8%". Include every element shown (Nickel/Chrome/Molybdenum minimums and Copper/Phosphor/Cobalt/Niobium/Titan/Tungsten maximums).';
        const scalePricingNote = '- scalePricing = the "Scale prices:" block — the per-MT-of-contained-element prices printed under or beside the base price, e.g. "Ni USD 12,800/MT Ni content; Cr USD 1,850/MT Cr content; Mo USD 30,000/MT Mo content". Column text from the price block ("7,880.00 USD/MT", "max. 0.50 %") can land between the "Scale prices:" heading and its own lines in the extracted text — collect the "<Element> <currency> <amount> per MT ... content" lines wherever they appear, not only directly under the heading. Null only if no such lines exist.';
        // Transcription only — the route decides which of the two is the counterparty
        // (see the self-party guard after the model call). The model never has to.
        const partyFields = `  "issuerName": "the company on the letterhead / at the very top — the party that issued this document, verbatim or null",
  "addresseeName": "the company this document is addressed TO (the To: / address block), verbatim or null",`;

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
    "description": "the material line's FULL text as printed, including any chemistry/spec in brackets — 'IN 718 CHIPS (51Ni 21Cr)', never shortened to 'IN 718 CHIPS'; keep bracket content even when the closing bracket is cut off in the scan",
    "qnty": number_or_null,
    "unit": "the quantity unit AS PRINTED: 'MT' / 'KGS' / 'LB' or null",
    "unitPrc": number_or_null,
    "lineTotal": number_or_null,
    "analysis": "the element/chemistry spec as written, or null"
  }],
  "scalePricing": "the 'Scale prices' block (per-MT content prices), or null",
  "remarks": "delivery term, payment term and other notes",
${partyFields}
  "confidence": { "order": "high|medium|low", "supplier": "high|medium|low", "date": "high|medium|low", "products": "high|medium|low" }
}

FIELD NOTES:
- order = the document's own "Contract No." — the reference for this purchase. Ignore "Your ref." if blank.
- qnty/unit/unitPrc/lineTotal = the line's quantity, unit, per-unit price and money total AS PRINTED (e.g. 17399 "LB" × 0.550 = 9569.45) — see UNITS rule, the app converts.
- Extract EVERY material line across ALL pages. A scanned bundle may contain SEVERAL invoices (one per page) — include each page's line(s) as separate products entries, not just the first page.
${analysisNote}
${scalePricingNote}`;
        } else if (documentType === 'salescontract') {
            // A CLIENT sales contract: the document is a sales agreement issued to / signed with
            // a buyer (client). The contract number is the client's sales-contract reference.
            schemaGuide = `Return JSON for a client sales contract (we are the SELLER; the client is the buyer — see PARTIES rule).

FIELD NOTES:
- clientName = the buyer/customer COMPANY NAME (e.g. "Estma Ltd", "Exotech") — never just a street address; if only an address is visible, return null.
- contractNo = the client's sales-contract number / reference (on a purchase confirmation or purchase order: the issuer's own "Contract No." / "Order No", e.g. "PB062972", 3001284).
- qnty in MT and unitPrc per MT (see UNITS rule).
${analysisNote}
${scalePricingNote}

{
  "contractNo": "the sales contract number / reference string or null",
  "clientName": "the buyer/customer company name (never IMS/GIS) or null",
  "clientId": "matched client id or null",
  "date": "YYYY-MM-DD or null",
  "currencyCode": "USD/EUR/etc or null",
  "currencyId": "matched currency id or null",
  "products": [{ "description": "string", "qnty": number_or_null, "unitPrc": number_or_null, "analysis": "the element/chemistry spec as written, or null" }],
  "scalePricing": "the 'Scale prices' block (per-MT content prices), or null",
  "remarks": "any notes or terms from the document",
${partyFields}
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
${partyFields}
  "confidence": { "vendorInvoiceNumber": "high|medium|low", "supplier": "high|medium|low", "amount": "high|medium|low", "date": "high|medium|low", "buyerPoNumber": "high|medium|low" }
}`;
        } else if (documentType === 'materialtable') {
            /* The fifth document type, and the only one that is not a commercial
               paper: a packing list / weight list / analysis (mill) certificate.
               The other four capture chemistry as ONE `analysis` string per product
               line, which is the right shape for a contract line and the wrong shape
               entirely for Material Tables — that page wants a row per bundle with a
               weight and a value in each element column. Hence its own schema rather
               than a flag on an existing one.

               Element keys are the page's own (constants.js DEFAULT_ELEMENTS), so a
               read drops straight into a table with no key translation. */
            schemaGuide = `Return JSON for a packing list / weight list / analysis (mill) certificate — a list of material lots with weights and their element percentages:
{
  "tableName": "what this list is FOR — the grade or material name ('AISI 304 turnings', 'Inconel 625 solids'), or the packing-list / certificate number if no grade is printed. Null if neither.",
  "containerNo": "container, seal, truck or shipment number if printed, else null",
  "unit": "the unit the WEIGHTS are printed in — exactly one of: mt, kgs, lbs",
  "rows": [{
    "material": "the label of this line — bundle/lot/package/heat number, or the material description if the lines are not numbered",
    "weight": number_or_null,
    "elements": { "ni": 24.03, "cr": 8.82, "fe": 57.83 }
  }],
  "confidence": { "tableName": "high|medium|low", "containerNo": "high|medium|low", "unit": "high|medium|low", "rows": "high|medium|low" }
}
HOW TO READ THIS DOCUMENT:
- One entry in "rows" per printed line of material. A 40-line packing list returns 40 rows, across all pages and all sheets.
- READ EVERY ELEMENT COLUMN THE DOCUMENT PRINTS, INCLUDING Fe. Fe (Iron, Железо) is an ordinary column: when there is one, transcribe it like any other. Only leave "fe" null when iron genuinely is not on the document — a superalloy certificate listing Ni/Cr/Mo/Co/W/Nb/Ti usually has none.
- "elements" are PERCENTAGES of the alloy (0-100), never kilograms of contained metal. Documents commonly print BOTH for each element — a "%" column and a mass column ("Ni,%" beside "Ni,кг"; "Cr %" beside "Cr kg"). Always take the % column. If only a contained mass is given, divide by that line's weight and give the percentage.
- Element columns may be headed by symbol (Ni, Cr, Mo, Co, Nb, W, Cu, Ti, Fe, Mn, Si, C, P, S, V, Al) or spelled out in English or Russian (Nickel/Никель, Chrome/Chromium/Хром, Molybdenum/Молибден, Cobalt/Кобальт, Niobium/Columbium/Cb/Ниобий, Tungsten/Wolfram/Вольфрам, Copper/Медь, Titanium/Титан, Iron/Железо, Manganese/Марганец). Cb = Nb. Carbon is often written with the Cyrillic "С", which looks identical to Latin "C" — it is carbon either way.
- "elements" holds ONLY the elements this document actually prints a value for — the example above shows three because that line had three. OMIT a key entirely rather than writing null: a 40-lot assay repeating twenty nulls per row is what makes the answer run out of room and arrive truncated. Allowed keys, lower-case: ni cr mo co nb w cu ti fe mn si c p s v al ta hf zr b n sn pb.
- NEVER carry a value across from a neighbouring column to fill a gap. A blank cell means the element was not measured on that line; leave its key out.
- "weight" is that line's TOTAL net weight. Sheets often print a total beside a per-package breakdown ("Total Weight" then "Weight 1", "Weight 2"…, or "Вес плавки" per heat): take the total, and do NOT emit the parts as separate rows.
- "unit" comes from the weight column's own heading: "kg"/"кг"/"Weight Kg" → kgs; "MT"/"W/T"/"т"/"тн"/"tonnes" → mt; "lb"/"lbs" → lbs. If nothing says, use kgs.
- SUMMARY LINES ARE NOT ROWS. A line labelled Average / Total / Итого / Среднее, or one whose identifier cell is blank while its figures are the average or sum of the lines above it, is a summary — leave it out.
- A sheet may hold SEVERAL header+data blocks (two shipments, or an "Overall" view followed by a "Separate" one). Include every distinct material line exactly ONCE: where two blocks list the same lots twice, take the block that lists each lot once and ignore the repeat.
- A range or a min/max ("Ni 8.0-10.5", "Ni min 8.0") is a specification, not an assay: take the single measured value when one is printed, otherwise the midpoint of a range, otherwise null.
- "material" is the line's own identifier — the lot / heat / bundle / container number ("Lot 302", "6-26-332", "CMAU2795209") or its material description. Never leave it empty when the line has one.`;
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
${partyFields}
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
        const buildRules = (textPath, sheetPath = false) => {
            const lines = [
                /* A spreadsheet is the one input whose layout is not in doubt, so it
                   gets the opposite instruction to a scrambled PDF: trust the grid.
                   It goes FIRST because these rules are priority-ordered and this is
                   the one that must beat any temptation to reconstruct. */
                ...(sheetPath ? ['SPREADSHEET: you are reading a real spreadsheet grid — one line per row, cells separated by tabs, sheets marked "--- Sheet: name ---". Columns are exact: read down them and do not reorder, merge or reconstruct anything. Header rows, subtotal/total rows and blank spacers are NOT data lines. An empty cell means no value — never carry a figure across from the neighbouring column to fill it.'] : []),
                'TRANSCRIBE what is printed. Report each figure as it appears; change a read only when a rule below proves it wrong. If the document is legible and consistent, do not second-guess it.',
                'NUMBER FORMAT — decide once per document, then apply throughout. EU style: dot/space/apostrophe = thousands, comma = decimal ("12.500,00" = 12500.00, "1,00" = 1.00). UK/US style: comma = thousands, dot = decimal ("48,000.000" = 48000). If ambiguous, pick the reading under which qty × price = amount.',
                'QUANTITY vs PRICE: the quantity is the value tied to a unit (MT/TN/KGS/LB); the price is the per-unit money value. Check each line: qty × price ≈ line amount (allow normal rounding). Reassign ONLY if the check fails by orders of magnitude — that means swapped columns or a misparsed format; otherwise keep the printed values. The quantity and its unit belong ONLY in the qnty/unit fields — never repeat them inside the description; description is the material/grade text alone ("12.46 NI, 8.87 CR, 1.33 MO", not "42 MT 12.46 NI…").',
                ...(textPath && !sheetPath ? ['SCRAMBLED TEXT: if the extracted text is visibly scrambled (whole columns arrive as separate blocks, unit tokens like "TN" detached at the end), reconstruct each line using the qty × price = amount identity. Never reshuffle a document whose layout reads normally.'] : []),
                'UNITS — purchase contract: keep the document\'s own unit in "unit"; do NOT convert. Sales contract: convert qnty to MT ("48,000 kgs" = 48 MT; LB × 0.00045359237) and unitPrc to per-MT (per-kg price × 1000), so qty × price still equals the line amount.',
                'DATES: European issuers write day-month-year, US/Canadian month-day-year; any component > 12 settles the order. Use the invoice/issue date, not a sales, delivery or due date. Always output ISO YYYY-MM-DD.',
                'PARTIES: the client/vendor is the counterparty, NEVER our own "IMS Metals" or "GIS Metals" — those are us. BUYER-ISSUED documents invert the roles: a PURCHASE ORDER, PURCHASE CONTRACT or PURCHASE(S) CONFIRMATION, wording like "we confirm having purchased from you" / "our purchases and your sales", or IMS/GIS appearing as the addressee ("TO: IMS Metals…") or under "PURCHASED FROM" — in all of these the letterhead/issuing company is the BUYER (that is the client) and the IMS/GIS party is us, the seller. If the only candidate is IMS/GIS, return null.',
                'Match names against the known-entity lists (fuzzy on spacing/punctuation — "Jinchuan Group" matches "Jinchuan Group Co Ltd"); return null rather than guess.',
            ];
            return 'RULES (priority order — when two rules conflict, the higher one wins):\n'
                + lines.map((l, i) => `${i + 1}. ${l}`).join('\n');
        };

        const buildSystemPrompt = (textPath, sheetPath = false) => `You are a document parsing assistant for a metals trading IMS.
Extract structured data from the ${sheetPath ? 'spreadsheet below' : textPath ? 'document text' : 'document image(s)'}.
${entityLists}
${buildRules(textPath, sheetPath)}
${schemaGuide}
Return ONLY the JSON object, no extra text.`;

        // gpt-4o (not mini) because supplier invoices have unpredictable layouts and
        // label variants — the accuracy gap on extraction is worth the cost on small
        // payloads. Overridable per-deploy without a code change.
        const model = process.env.OPENAI_DOCREADER_MODEL || 'gpt-4o';

        let messages;
        if (useSheet) {
            // Spreadsheet: the grid IS the document. No vision, no reconstruction.
            messages = [
                { role: 'system', content: buildSystemPrompt(true, true) },
                { role: 'user', content: extractedText },
            ];
        } else if (mimeType === 'application/pdf' && !usePdfVision) {
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
            /* Mixed-container invoices (Donald McArthy et al.) carry 20+ material
               lines; headroom so the JSON never truncates mid-array.

               A packing list needs far more of it than an invoice does: 4000 was
               sized for a 20-line invoice and a 40-lot assay blew straight through
               it, coming back cut off mid-object — "Expected ',' or '}' … at
               position 10884" (Sharoon, 2026-09-04). It is a ceiling, not a target,
               so raising it for that path alone costs nothing on the others. */
            max_tokens: documentType === 'materialtable' ? 16000 : 4000,
            response_format: { type: 'json_object' },
            messages,
            // Stay under maxDuration so a hung upstream returns OUR json error,
            // not the platform's bare 504 page.
        }, { timeout: 50_000 });

        guard.recordUsage(response.usage?.total_tokens);

        /* A model that runs out of output room stops mid-value, and JSON.parse then
           reports a column number — which is what reached the user as "Expected ','
           or '}' … at position 10884". finish_reason says exactly what happened, so
           say it in words they can act on instead of surfacing the parser. */
        const choice = response.choices[0];
        if (choice.finish_reason === 'length') {
            return Response.json({
                error: 'DOCUMENT_TOO_LONG',
                message: 'That document has more lines than can be read in one pass. Split it — one sheet, or the first half of the rows — and read each part into its own table.',
            }, { status: 400 });
        }
        let result;
        try {
            result = JSON.parse(choice.message.content);
        } catch {
            return Response.json({
                error: 'BAD_MODEL_JSON',
                message: 'The reader returned a malformed answer for this document. Try it again, or split it into smaller parts.',
            }, { status: 502 });
        }

        // Which of the two named parties is the counterparty is decided in code, not by
        // the model — a buyer-issued purchase confirmation puts OUR name on the page too.
        // A packing list names no counterparty, so there is nothing to resolve.
        if (documentType !== 'materialtable') {
            resolveCounterparty(result, { documentType, suppliers, clients });
        }

        /* Packing list: everything the page will treat as a number is coerced and
           bounded HERE rather than trusted from the model, and the same deterministic
           check the other paths run on qty × price is run on the chemistry — the
           element percentages of one lot cannot exceed 100. A row that breaks it has a
           misread decimal point or a column carried across, so rows drops to low
           confidence and the UI deselects it, forcing a human look rather than a
           silent bad import. */
        if (documentType === 'materialtable') {
            /* The nine the table ships with, then the ones these certificates
               actually print alongside them — Mn, Si, C, P, S, V, Al are on most
               CIS mill certificates, and dropping them silently made the reader
               look like it had misread the sheet. The page creates a column for
               any of the extras that come back. A fixed whitelist, not "whatever
               the model sends": an invented key would become an invented column. */
            const ELEMENT_KEYS = [
                'ni', 'cr', 'mo', 'co', 'nb', 'w', 'cu', 'ti', 'fe',
                'mn', 'si', 'c', 'p', 's', 'v', 'al', 'ta', 'hf', 'zr', 'b', 'n', 'sn', 'pb',
            ];
            const num = (v) => {
                const n = typeof v === 'string' ? Number(v.replace(/[^0-9.\-]/g, '')) : Number(v);
                return Number.isFinite(n) ? n : null;
            };
            const unit = String(result.unit || '').toLowerCase();
            result.unit = ['mt', 'kgs', 'lbs'].includes(unit)
                ? unit
                : unit.startsWith('kg') ? 'kgs' : unit.startsWith('lb') || unit === 'lb' ? 'lbs' : unit.startsWith('t') ? 'mt' : 'kgs';

            let suspect = false;
            result.rows = (Array.isArray(result.rows) ? result.rows : []).map(r => {
                const elements = {};
                let sum = 0;
                /* Carbon is printed with the Cyrillic Es on every Russian sheet in
                   the sample set, and it is visually identical to Latin C — so the
                   model hands back either one depending on the document. */
                const src = {};
                Object.entries(r?.elements || {}).forEach(([k, v]) => {
                    src[String(k).toLowerCase().replace(/С/g, 'c').replace(/с/g, 'c')] = v;
                });
                ELEMENT_KEYS.forEach(k => {
                    const v = num(src[k]);
                    // Out of range is not a number this page can hold — drop it rather
                    // than write a 4,300% nickel into a cell.
                    const ok = v != null && v >= 0 && v <= 100;
                    if (v != null && !ok) suspect = true;
                    elements[k] = ok ? v : null;
                    if (ok) sum += v;
                });
                if (sum > 100.5) suspect = true;
                return { material: String(r?.material || '').trim(), weight: num(r?.weight), elements };
            }).filter(r => r.material || r.weight != null || ELEMENT_KEYS.some(k => r.elements[k] != null));

            if (suspect || !result.rows.length) {
                result.confidence = { ...(result.confidence || {}), rows: 'low' };
            }
        }

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
            // Digits read from cells or a text layer are not OCR — only a rendered
            // page or an uploaded image earns the "check the figures" caution.
            visionUsed: !useSheet && (usePdfVision || mimeType !== 'application/pdf'),
            sheetUsed: useSheet,
        });

    } catch (err) {
        console.error('Document reader error:', err);
        return Response.json({ error: err.message || 'Failed to read document' }, { status: 500 });
    }
}
