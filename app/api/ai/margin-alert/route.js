export const dynamic = 'force-dynamic';
import OpenAI from 'openai';
import { guardAiRequest, sseErrorResponse } from '../../../../utils/aiGuard';

let openai;
function getOpenAI() {
    if (!openai) openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    return openai;
}

function sseText(text) { return `data: ${JSON.stringify({ text })}\n\n`; }
function sseDone() { return 'data: [DONE]\n\n'; }

const SSE_HEADERS = {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
};

export async function POST(request) {
    const guard = await guardAiRequest(request);
    if (guard.error) return sseErrorResponse(guard.error, guard.status);

    const encoder = new TextEncoder();

    try {
        const { alertedItems, threshold } = await request.json();

        if (!alertedItems?.length) {
            return Response.json({ error: 'No alerted items provided' }, { status: 400 });
        }

        // Margin table values arrive as strings (text inputs) — coerce before any math.
        // Field meanings in this app's margins table:
        //   purchase  = Quantity in metric tons (column header is "Qty (MT)")
        //   margin    = per-unit margin in the account currency ($/MT)
        //   totalMargin = qty × per-unit margin = total profit
        //   shipped/openShip = shipped vs unshipped quantity (MT)
        const num = (v) => {
            const n = parseFloat(v);
            return Number.isFinite(n) ? n : 0;
        };

        // Sort by total margin ascending (worst first) and cap the list so the
        // streamed explanation never gets truncated mid-sentence.
        const MAX_ITEMS = 20;
        const sorted = [...alertedItems]
            .map(item => ({
                description: item.description || 'Unnamed item',
                supplier: item.supplier || '',
                client: item.client || '',
                month: item.month || '',
                qty: num(item.qty != null ? item.qty : item.purchase),
                perUnitMargin: num(item.perUnitMargin != null ? item.perUnitMargin : item.margin),
                totalMargin: num(item.totalMarginVal != null ? item.totalMarginVal : item.totalMargin),
                shipped: num(item.shipped),
                openShip: num(item.openShip),
            }))
            .sort((a, b) => a.totalMargin - b.totalMargin);
        const shown = sorted.slice(0, MAX_ITEMS);
        const omitted = sorted.length - shown.length;

        const itemSummaries = shown.map((it, i) =>
            `${i + 1}. "${it.description}"${it.supplier ? ` (Supplier: ${it.supplier})` : ''}${it.client ? ` (Client: ${it.client})` : ''}${it.month ? ` [Month ${it.month}]` : ''} — Qty: ${it.qty} MT, Per-unit margin: ${it.perUnitMargin.toFixed(2)}, Total margin: ${it.totalMargin.toFixed(2)}, Shipped: ${it.shipped} MT, Open (unshipped): ${it.openShip} MT`
        ).join('\n');

        const stream = await getOpenAI().chat.completions.create({
            model: 'gpt-4o-mini',
            temperature: 0.3,
            max_tokens: 1200,
            stream: true,
            stream_options: { include_usage: true },
            messages: [
                {
                    role: 'system',
                    content: `You are a financial analyst for a metals trading company.
You are given contract line items whose TOTAL MARGIN (profit) is at or below an alert threshold.
Note: there is no cost/revenue column, so do NOT invent a "margin percentage".
"Total margin" is the actual profit. "Per-unit margin" is profit per metric ton.
For each item, in ONE short sentence, state the likely reason the profit is low/zero
(e.g. zero per-unit margin entered, large unshipped quantity tying up value, tiny quantity)
and what to check. Use "- " bullets. No tables. Same item in different months is NOT a duplicate.`
                },
                {
                    role: 'user',
                    content: `Threshold: total margin ≤ ${threshold}. ${sorted.length} item(s) flagged${omitted > 0 ? `, showing the ${MAX_ITEMS} lowest` : ''}:\n\n${itemSummaries}${omitted > 0 ? `\n\n(${omitted} more lower-priority items omitted.)` : ''}\n\nGive one concise bullet per item.`
                }
            ]
        });

        const readable = new ReadableStream({
            async start(controller) {
                for await (const chunk of stream) {
                    const text = chunk.choices[0]?.delta?.content || '';
                    if (text) controller.enqueue(encoder.encode(sseText(text)));
                    if (chunk.usage?.total_tokens) guard.recordUsage(chunk.usage.total_tokens);
                }
                controller.enqueue(encoder.encode(sseDone()));
                controller.close();
            }
        });

        return new Response(readable, { headers: SSE_HEADERS });

    } catch (err) {
        console.error('Margin alert API error:', err);
        const encoder2 = new TextEncoder();
        const errStream = new ReadableStream({
            start(controller) {
                controller.enqueue(encoder2.encode(`data: ${JSON.stringify({ error: 'Failed to analyze margins' })}\n\n`));
                controller.enqueue(encoder2.encode('data: [DONE]\n\n'));
                controller.close();
            }
        });
        return new Response(errStream, { headers: SSE_HEADERS });
    }
}
