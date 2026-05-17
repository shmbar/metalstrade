import OpenAI from 'openai';
import { guardAiRequest } from '../../../../utils/aiGuard';

let openai;
function getOpenAI() {
    if (!openai) openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    return openai;
}

export async function POST(request) {
    const guard = await guardAiRequest(request);
    if (guard.error) return Response.json({ error: guard.error }, { status: guard.status });

    try {
        const { fileBase64, mimeType, documentType, suppliers, clients, currencies } = await request.json();

        if (!fileBase64) {
            return Response.json({ error: 'No file provided' }, { status: 400 });
        }

        // Extract text from PDF
        let extractedText = '';
        if (mimeType === 'application/pdf') {
            const pdfParse = (await import('pdf-parse')).default;
            const buffer = Buffer.from(fileBase64, 'base64');
            try {
                const pdfData = await pdfParse(buffer);
                extractedText = pdfData.text || '';
            } catch {
                extractedText = '';
            }

            // Scanned PDF detection — if pdf-parse returned almost nothing, it's an image-based PDF.
            // OpenAI's image_url input doesn't accept PDFs directly, so we return a clear,
            // actionable error rather than letting the AI hallucinate nulls.
            if (extractedText.trim().length < 30) {
                return Response.json({
                    error: 'SCANNED_PDF',
                    message: 'This PDF appears to be a scanned image with no embedded text. Please export each page as a JPG or PNG and upload that instead — the AI will read it via Vision.',
                }, { status: 422 });
            }
        }

        const entityLists = documentType === 'contract'
            ? `Known suppliers: ${(suppliers || []).map(s => `"${s.nname}" (id: ${s.id})`).join(', ')}\nKnown currencies: ${(currencies || []).map(c => `"${c.cur}" (id: ${c.id})`).join(', ')}`
            : `Known clients: ${(clients || []).map(c => `"${c.nname}" (id: ${c.id})`).join(', ')}\nKnown currencies: ${(currencies || []).map(c => `"${c.cur}" (id: ${c.id})`).join(', ')}`;

        const schemaGuide = documentType === 'contract'
            ? `Return JSON for a contract/purchase order:
{
  "order": "PO number string or null",
  "supplierName": "extracted supplier name",
  "supplierId": "matched supplier id or null",
  "date": "YYYY-MM-DD or null",
  "currencyCode": "USD/EUR/etc or null",
  "currencyId": "matched currency id or null",
  "products": [{ "description": "string", "qnty": number_or_null, "unitPrc": number_or_null }],
  "remarks": "any notes or terms from the document",
  "confidence": { "order": "high|medium|low", "supplier": "high|medium|low", "date": "high|medium|low", "products": "high|medium|low" }
}`
            : `Return JSON for an invoice:
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

        const messages = mimeType === 'application/pdf'
            ? [
                {
                    role: 'system',
                    content: `You are a document parsing assistant for a metals trading IMS.
Extract structured data from the document text.
${entityLists}
Match names to known entities (fuzzy match — "Jinchuan Group" matches "Jinchuan Group Co Ltd").
${schemaGuide}
Return ONLY the JSON object, no extra text.`
                },
                {
                    role: 'user',
                    content: extractedText || 'Could not extract text from PDF — return all fields as null.'
                }
            ]
            : [
                {
                    role: 'system',
                    content: `You are a document parsing assistant for a metals trading IMS.
Extract structured data from the document image.
${entityLists}
${schemaGuide}
Return ONLY the JSON object, no extra text.`
                },
                {
                    role: 'user',
                    content: [
                        {
                            type: 'image_url',
                            image_url: { url: `data:${mimeType};base64,${fileBase64}` }
                        },
                        { type: 'text', text: `Extract ${documentType} data from this document.` }
                    ]
                }
            ];

        const response = await getOpenAI().chat.completions.create({
            model: mimeType === 'application/pdf' ? 'gpt-4o-mini' : 'gpt-4o',
            temperature: 0,
            max_tokens: 1500,
            response_format: { type: 'json_object' },
            messages,
        });

        guard.recordUsage(response.usage?.total_tokens);
        const result = JSON.parse(response.choices[0].message.content);
        return Response.json({ ...result, documentType, rawText: extractedText.slice(0, 500) });

    } catch (err) {
        console.error('Document reader error:', err);
        return Response.json({ error: err.message || 'Failed to read document' }, { status: 500 });
    }
}
