export const dynamic = 'force-dynamic';
import OpenAI from 'openai';
import { guardAiRequest } from '../../../../utils/aiGuard';

let openai;
function getOpenAI() {
    if (!openai) openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    return openai;
}

// One briefing per user per day (facts hash) — repeat opens are served from
// memory instead of re-calling the model.
const memCache = new Map();
const CACHE_TTL = 6 * 60 * 60 * 1000;

// The client sends DETERMINISTIC facts it computed from its own books (overdue
// totals, payments, ETAs, price moves). The model only phrases them — it never
// invents or recalculates numbers.
export async function POST(request) {
    const guard = await guardAiRequest(request);
    if (guard.error) return Response.json({ error: guard.error }, { status: guard.status });

    try {
        const { facts } = await request.json();
        if (!facts || typeof facts !== 'object') {
            return Response.json({ error: 'facts object is required' }, { status: 400 });
        }

        const day = new Date().toISOString().slice(0, 10);
        const key = `${guard.uid || 'anon'}:${day}:${JSON.stringify(facts).length}`;
        const cached = memCache.get(key);
        if (cached && cached.exp > Date.now()) return Response.json({ briefing: cached.briefing, cached: true });

        const response = await getOpenAI().chat.completions.create({
            model: 'gpt-4o-mini',
            temperature: 0.4,
            max_tokens: 220,
            response_format: { type: 'json_object' },
            messages: [
                {
                    role: 'system',
                    content: `You write a short morning briefing for a metals trader, based ONLY on the facts provided.
Rules:
- 2 to 4 sentences, plain language, no headers or bullet points.
- Use the exact numbers given — never recompute, round differently, or invent figures.
- Lead with whatever needs attention most (overdue money first if present).
- Skip facts that are empty or zero; if nothing needs attention say so briefly and positively.
- Address the reader by first name if given. No emojis.
Return JSON: {"briefing": "..."}`,
                },
                { role: 'user', content: JSON.stringify(facts) },
            ],
        });

        const parsed = JSON.parse(response.choices[0].message.content || '{}');
        const briefing = String(parsed.briefing || '').trim();
        if (!briefing) return Response.json({ error: 'Empty briefing' }, { status: 500 });

        memCache.set(key, { briefing, exp: Date.now() + CACHE_TTL });
        if (memCache.size > 200) memCache.delete(memCache.keys().next().value);

        return Response.json({ briefing });
    } catch (err) {
        console.error('daily-briefing error:', err);
        return Response.json({ error: err.message || 'Briefing failed' }, { status: 500 });
    }
}
