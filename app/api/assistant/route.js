export const dynamic = 'force-dynamic';
import OpenAI from 'openai';
import { guardAiRequest, sseErrorResponse } from '../../../utils/aiGuard';
import { SYSTEM_PROMPT, TOOLS, executeTool } from '../../../utils/assistantTools';

let openai;
function getOpenAI() {
    if (!openai) openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    return openai;
}


const SSE_HEADERS = {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
};

function sseText(text) {
    return `data: ${JSON.stringify({ text })}\n\n`;
}

function sseDone() {
    return 'data: [DONE]\n\n';
}

/* Follow-up questions offered under an answer, by the tool that produced it.
   Only questions another tool can actually answer: offering "Draft a payment
   reminder" when the chat cannot draft one is a button that fails on click.
   `focus` is the top name a ranking tool found (the client who owes the most). */
const FOLLOW_UPS = {
    get_client_debt_ranking: (f) => [f && `Show ${f}'s invoices`, 'Show overdue invoices', 'Show pending invoices'],
    get_overdue_invoices: () => ['Which client owes the most?', 'Show pending invoices'],
    get_pending_invoices: () => ['Show overdue invoices', 'Which client owes the most?'],
    get_client_invoices: () => ['Which client owes the most?', 'Show overdue invoices'],
    get_revenue_summary: () => ['Monthly sales this year', 'What is my profit this month?'],
    get_monthly_sales: () => ['Revenue summary', 'What is my profit this month?'],
    get_profit_info: () => ['Monthly sales this year', 'Show margin alerts'],
    get_expense_summary: () => ['Show unpaid expenses', 'Supplier summary'],
    get_unpaid_expenses: () => ['Expense totals', 'Supplier summary'],
    get_contract_status_breakdown: () => ['Show recent contracts', 'Shipment status'],
    get_recent_contracts: () => ['Contract status breakdown', 'Shipment status'],
    get_shipment_status: () => ['Contract status breakdown', 'Show recent contracts'],
    get_stock_summary: () => ['Supplier summary', 'Contract status breakdown'],
    get_supplier_summary: (f) => [f && `Show contracts from ${f}`, 'Show recent contracts', 'Stock summary'],
    get_cash_forecast: () => ['Show overdue invoices', 'Show unpaid expenses'],
    get_margin_alerts: () => ['What is my profit this month?', 'Monthly sales this year'],
    get_recent_reminders: () => ['Show overdue invoices', 'Which client owes the most?'],
};

export async function POST(request) {
    const guard = await guardAiRequest(request);
    if (guard.error) return sseErrorResponse(guard.error, guard.status);

    const encoder = new TextEncoder();

    try {
        const { messages, currentData, currentPage, dateRange } = await request.json();

        if (!messages || !Array.isArray(messages)) {
            return new Response(JSON.stringify({ error: 'Messages array is required' }), { status: 400 });
        }

        const today = new Date().toISOString().split('T')[0];
        const pageNote = currentPage ? `\nUser is currently viewing: ${currentPage}` : '';
        const dateRangeNote = dateRange?.startDate && dateRange?.endDate
            ? `\nLoaded data covers: ${dateRange.startDate} to ${dateRange.endDate}. If the user asks about a time period outside this range (e.g. "last year" when only this year is loaded), tell them the data isn't in the current view and ask them to change the date range filter in the app header.`
            : '';

        const systemContext = SYSTEM_PROMPT + `\n\n## SESSION CONTEXT\nToday: ${today}${pageNote}${dateRangeNote}\nData loaded: ${currentData?.contracts?.length || 0} contracts, ${currentData?.invoices?.length || 0} invoices, ${currentData?.expenses?.length || 0} expenses, ${currentData?.stocks?.length || 0} stock records, ${currentData?.margins?.length || 0} margin months`;

        const apiMessages = [
            { role: 'system', content: systemContext },
            ...messages.map(m => ({ role: m.role, content: m.content }))
        ];

        // Phase 1: tool detection. gpt-4o picks the right tool more reliably
        // for fuzzy questions like "which client owes the most" and avoids the
        // wrong-tool errors mini made (e.g. answering "no unpaid" when the data
        // had unpaid records under a different field shape).
        const toolResponse = await getOpenAI().chat.completions.create({
            model: 'gpt-4o',
            messages: apiMessages,
            tools: TOOLS,
            tool_choice: 'auto',
            temperature: 0.2,
        });

        guard.recordUsage(toolResponse.usage?.total_tokens);
        const toolMessage = toolResponse.choices[0].message;

        // Phase 2a: tool was called — execute and stream final answer
        if (toolMessage.tool_calls?.length > 0) {
            // Tools may return either a plain string (legacy) OR { text, sources }.
            // We normalise both here: `text` is what the model sees, `sources`
            // is what the UI renders as clickable citation chips.
            // Scope honesty: range-dependent answers state the loaded date window so
            // neither the user nor the model mistakes a filtered slice for all-time
            // truth. Lookup-by-id and all-time tools are excluded (stock summary
            // carries its own "all-time" note).
            const NO_RANGE_NOTE = new Set(['get_record_by_number', 'get_stock_summary']);
            const rangeNote = dateRange?.startDate && dateRange?.endDate
                ? `\n\n(Data range: ${dateRange.startDate} → ${dateRange.endDate} — change the date filter in the app header to widen it.)`
                : '';

            const allSources = [];
            let ranking = null;
            const followUps = [];
            const toolResults = toolMessage.tool_calls.map(tc => {
                const raw = executeTool(
                    tc.function.name,
                    JSON.parse(tc.function.arguments || '{}'),
                    currentData || {}
                );
                const { text, sources = [], ranking: r = null, focus = null } = typeof raw === 'string'
                    ? { text: raw, sources: [] }
                    : raw;
                if (Array.isArray(sources)) allSources.push(...sources);
                if (!ranking && r?.rows?.length > 1) ranking = r;
                followUps.push(...(FOLLOW_UPS[tc.function.name]?.(focus) || []));
                const content = NO_RANGE_NOTE.has(tc.function.name) || !rangeNote
                    ? text
                    : text + rangeNote;
                return { tool_call_id: tc.id, role: 'tool', content };
            });

            // Dedupe by `${type}:${id}` so two tools citing the same invoice
            // don't render two pills.
            const seen = new Set();
            const uniqueSources = allSources.filter(s => {
                if (!s?.id) return false;
                const key = `${s.type}:${s.id}`;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            });

            const finalStream = await getOpenAI().chat.completions.create({
                model: 'gpt-4o',
                messages: [...apiMessages, toolMessage, ...toolResults],
                temperature: 0.4,
                max_tokens: 800,
                stream: true,
                stream_options: { include_usage: true },
            });

            const readable = new ReadableStream({
                async start(controller) {
                    for await (const chunk of finalStream) {
                        const text = chunk.choices[0]?.delta?.content || '';
                        if (text) controller.enqueue(encoder.encode(sseText(text)));
                        if (chunk.usage?.total_tokens) guard.recordUsage(chunk.usage.total_tokens);
                    }
                    // Emit the answer's structure just before [DONE]: citation chips,
                    // a ranking to draw as bars, and follow-up questions. The client
                    // merges these into the final assistant message.
                    const nextQuestions = [...new Set(followUps.filter(Boolean))].slice(0, 3);
                    if (uniqueSources.length || ranking || nextQuestions.length) {
                        controller.enqueue(encoder.encode(
                            `data: ${JSON.stringify({ sources: uniqueSources, ranking, followUps: nextQuestions })}\n\n`
                        ));
                    }
                    controller.enqueue(encoder.encode(sseDone()));
                    controller.close();
                }
            });

            return new Response(readable, { headers: SSE_HEADERS });
        }

        // Phase 2b: no tool needed — answer already in toolMessage.content, send as single SSE chunk
        const directText = toolMessage.content || 'I could not generate a response. Please try again.';
        const readable = new ReadableStream({
            start(controller) {
                controller.enqueue(encoder.encode(sseText(directText)));
                controller.enqueue(encoder.encode(sseDone()));
                controller.close();
            }
        });

        return new Response(readable, { headers: SSE_HEADERS });

    } catch (error) {
        console.error('Assistant API Error:', error);
        const errMsg = error.code === 'invalid_api_key'
            ? 'Invalid OpenAI API key. Please check your configuration.'
            : 'Failed to process your request. Please try again.';

        const encoder2 = new TextEncoder();
        const errStream = new ReadableStream({
            start(controller) {
                controller.enqueue(encoder2.encode(`data: ${JSON.stringify({ error: errMsg })}\n\n`));
                controller.enqueue(encoder2.encode('data: [DONE]\n\n'));
                controller.close();
            }
        });
        return new Response(errStream, { headers: SSE_HEADERS });
    }
}
