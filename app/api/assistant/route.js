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
            const toolResults = toolMessage.tool_calls.map(tc => {
                const raw = executeTool(
                    tc.function.name,
                    JSON.parse(tc.function.arguments || '{}'),
                    currentData || {}
                );
                const { text, sources = [] } = typeof raw === 'string'
                    ? { text: raw, sources: [] }
                    : raw;
                if (Array.isArray(sources)) allSources.push(...sources);
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
                    // Emit citation chips just before [DONE]. The client merges
                    // these into the final assistant message state.
                    if (uniqueSources.length) {
                        controller.enqueue(encoder.encode(
                            `data: ${JSON.stringify({ sources: uniqueSources })}\n\n`
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
