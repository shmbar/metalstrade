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
        const { invoice, clientEmail, companyName, language } = await request.json();

        if (!invoice) {
            return Response.json({ error: 'Invoice data required' }, { status: 400 });
        }

        const langNote = language && language !== 'English'
            ? `Write the email in ${language}.`
            : 'Write the email in English.';

        const response = await getOpenAI().chat.completions.create({
            model: 'gpt-4o-mini',
            temperature: 0.6,
            max_tokens: 400,
            response_format: { type: 'json_object' },
            messages: [
                {
                    role: 'system',
                    content: `You are a professional accounts receivable specialist for ${companyName || 'our company'}.
Write a payment reminder email that is polite, firm, and professional.
${langNote}
Return JSON: { "subject": "string", "body": "string" }
Email body requirements:
- Address client by name if available
- Reference invoice number and amount outstanding
- State the due date clearly
- Request payment within 5 business days
- Include company name as sender
- Maximum 150 words in the body
- No HTML — plain text only`
                },
                {
                    role: 'user',
                    content: `Generate a payment reminder for:
Invoice #${invoice.number}
Client: ${invoice.client}
Amount due: ${invoice.currency} ${Number(invoice.balanceDue || 0).toFixed(2)}
Due date: ${invoice.dueDate || 'overdue'}
Payment status: ${invoice.paymentStatus}
Our company: ${companyName || 'IMS Trading'}`
                }
            ]
        });

        guard.recordUsage(response.usage?.total_tokens);
        const result = JSON.parse(response.choices[0].message.content);
        return Response.json({ subject: result.subject, body: result.body });

    } catch (err) {
        console.error('Generate reminder error:', err);
        return Response.json({ error: err.message || 'Failed to generate reminder' }, { status: 500 });
    }
}
