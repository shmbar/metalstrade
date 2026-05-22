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

// Normalizes a numeric input — accepts numbers OR strings like "10.5", "10,5", " 10.5 % ".
// Returns null if not a finite number.
function toNum(v) {
    if (v == null || v === '') return null;
    if (typeof v === 'number') return Number.isFinite(v) ? v : null;
    let s = String(v).replace(/[%\s]/g, '').trim();      // drop % and whitespace
    if (s.indexOf('.') === -1 && s.indexOf(',') !== -1) {  // "10,5" → "10.5"
        s = s.replace(',', '.');
    } else {
        s = s.replace(/,/g, '');                            // "1,234.5" → "1234.5"
    }
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : null;
}

// Deterministic pass/fail: actual must lie within [min - tolerance, max + tolerance].
// Either bound can be absent. tolerance defaults to 0.
function evaluateElement(actual, min, max, tolerance) {
    const a = toNum(actual);
    const lo = toNum(min);
    const hi = toNum(max);
    const tol = toNum(tolerance) || 0;
    if (a == null) return { pass: false, reason: 'no value extracted' };
    if (lo != null && a < lo - tol) return { pass: false, reason: `below min ${lo}${tol ? ` (tolerance ±${tol})` : ''}` };
    if (hi != null && a > hi + tol) return { pass: false, reason: `above max ${hi}${tol ? ` (tolerance ±${tol})` : ''}` };
    return { pass: true, reason: 'within spec' };
}

function formatSpec(s) {
    const lo = toNum(s.min);
    const hi = toNum(s.max);
    const tolStr = s.tolerance && toNum(s.tolerance) ? ` ±${toNum(s.tolerance)}` : '';
    if (lo != null && hi != null) return `${lo}–${hi}%${tolStr}`;
    if (lo != null) return `≥ ${lo}%${tolStr}`;
    if (hi != null) return `≤ ${hi}%${tolStr}`;
    return '—';
}

export async function POST(request) {
    const guard = await guardAiRequest(request);
    if (guard.error) return Response.json({ error: guard.error }, { status: guard.status });

    try {
        const { fileBase64, mimeType, contractSpec, materialContext } = await request.json();

        if (!fileBase64) {
            return Response.json({ error: 'No file provided' }, { status: 400 });
        }

        // Build prompt — AI only extracts. We compute pass/fail in JS so tolerance is honored
        // and the comparison is deterministic (no GPT rounding errors).
        const specHint = contractSpec?.length
            ? `\nElements of interest (extract these specifically if present): ${contractSpec.map(s => s.element).join(', ')}.`
            : '';

        const materialHint = materialContext
            ? `\nExpected material(s) per contract: ${materialContext}. Use this to disambiguate elements (e.g. a "0.05" near "C" likely refers to carbon).`
            : '';

        const systemPrompt = `You are a metallurgical certificate analyst. Extract chemical composition elements from the certificate.${specHint}${materialHint}

Return ONLY valid JSON in this exact shape:
{
  "certificateNumber": "string or null",
  "date": "string or null",
  "material": "string or null",
  "extractedElements": [{"element": "Ni", "value": 62.5, "unit": "%"}]
}

Rules:
- "value" MUST be a number, not a string
- element symbols only (Ni, Cr, Mo, etc.) — not full names
- omit elements you can't find rather than guessing`;

        let messages;

        if (mimeType === 'application/pdf') {
            const buffer = Buffer.from(fileBase64, 'base64');
            const r = await extractPdfText(buffer);
            if (r.ok) {
                // Digital PDF with text layer
                messages = [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: `Certificate text:\n${r.text}` },
                ];
            } else {
                // EMPTY (scanned) OR FAILED (worker missing on Vercel / corrupt PDF)
                // → fall back to gpt-4o OCR of the raw PDF. This keeps the feature
                // working even when pdfjs's worker isn't bundled in the serverless
                // function.
                console.warn('PDF extraction did not return text, falling back to vision:',
                    r.reason || 'unknown', r.message || '', r.attempted || '');
                messages = [
                    { role: 'system', content: systemPrompt },
                    {
                        role: 'user',
                        content: [
                            { type: 'file', file: { filename: 'certificate.pdf', file_data: `data:application/pdf;base64,${fileBase64}` } },
                            { type: 'text', text: 'This is a mill certificate (may be digital or scanned). Read it and extract all chemical composition elements.' },
                        ],
                    },
                ];
            }
        } else {
            messages = [
                { role: 'system', content: systemPrompt },
                {
                    role: 'user',
                    content: [
                        { type: 'image_url', image_url: { url: `data:${mimeType};base64,${fileBase64}` } },
                        { type: 'text', text: 'Extract all chemical composition elements from this certificate.' },
                    ],
                },
            ];
        }

        const response = await getOpenAI().chat.completions.create({
            model: 'gpt-4o',
            temperature: 0,
            max_tokens: 1500,
            response_format: { type: 'json_object' },
            messages,
        });

        guard.recordUsage(response.usage?.total_tokens);
        const aiResult = JSON.parse(response.choices[0].message.content);

        // Build pass/fail results deterministically in JS using the user's tolerance values
        const results = (contractSpec || []).map(spec => {
            const extracted = aiResult.extractedElements?.find(
                e => String(e.element).toLowerCase() === String(spec.element).toLowerCase()
            );
            const actual = extracted ? toNum(extracted.value) : null;
            const { pass, reason } = evaluateElement(actual, spec.min, spec.max, spec.tolerance);
            return {
                element: spec.element,
                spec: formatSpec(spec),
                actual,
                pass,
                reason,
            };
        });

        return Response.json({
            certificateNumber: aiResult.certificateNumber || null,
            date: aiResult.date || null,
            material: aiResult.material || null,
            extractedElements: aiResult.extractedElements || [],
            results,
        });

    } catch (err) {
        console.error('Cert checker error:', err);
        return Response.json({ error: err.message || 'Failed to analyze certificate' }, { status: 500 });
    }
}
