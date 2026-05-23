import OpenAI from 'openai';
import { guardAiRequest } from '../../../../utils/aiGuard';

let openai;
function getOpenAI() {
    if (!openai) openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    return openai;
}

// Identical descriptions get categorized the same way — cache for 1 hour.
// Keyed by description + category-list-hash so adding new categories invalidates entries.
const CACHE_TTL = 60 * 60 * 1000;
const cache = new Map();

function hashKey(description, categories) {
    const catSig = categories.map(c => `${c.id}:${c.label}`).sort().join('|');
    return `${description.trim().toLowerCase()}::${catSig}`;
}

export async function POST(request) {
    const guard = await guardAiRequest(request);
    if (guard.error) return Response.json({ error: guard.error }, { status: guard.status });

    try {
        const { description, categories } = await request.json();

        if (!description?.trim()) {
            return Response.json({ error: 'No description provided' }, { status: 400 });
        }
        if (description.trim().length < 3) {
            return Response.json({ error: 'Description too short — please add more detail' }, { status: 400 });
        }
        if (!categories?.length) {
            return Response.json({ error: 'No categories provided' }, { status: 400 });
        }

        // Cache lookup — same description + same category list = same answer
        const cacheKey = hashKey(description, categories);
        const cached = cache.get(cacheKey);
        if (cached && Date.now() - cached.ts < CACHE_TTL) {
            return Response.json({ ...cached.data, cached: true });
        }

        const categoryList = categories
            .map(c => `- id: "${c.id}" → label: "${c.label}"`)
            .join('\n');

        const response = await getOpenAI().chat.completions.create({
            // gpt-4o for domain-specific synonyms ("tugboat" → Freight,
            // "broker's commission" → Commission). mini occasionally guessed
            // a wrong but plausible category on freight/handling terms.
            model: 'gpt-4o',
            temperature: 0,
            max_tokens: 120,
            response_format: { type: 'json_object' },
            messages: [
                {
                    role: 'system',
                    content: `You are an expense categorization assistant for a metals trading company.
Given an expense description and a list of available categories, return the best matching category.

Available categories:
${categoryList}

Respond with ONLY valid JSON in this exact shape:
{ "categoryId": "<id from list>", "confidence": "high" | "medium" | "low" }

Rules:
- categoryId MUST be one of the ids from the list above — never invent a new id
- confidence "high" = clear match, "medium" = reasonable match, "low" = best guess
- If no category fits at all, pick the closest one and set confidence "low"`
                },
                {
                    role: 'user',
                    content: `Expense description: "${description.trim()}"`
                }
            ]
        });

        guard.recordUsage(response.usage?.total_tokens);
        const result = JSON.parse(response.choices[0].message.content);

        // Validate that returned id actually exists in the list
        const validId = categories.find(c => c.id === result.categoryId);
        if (!validId) {
            return Response.json({ error: 'AI returned an invalid category id' }, { status: 500 });
        }

        const payload = { categoryId: result.categoryId, confidence: result.confidence || 'medium' };
        cache.set(cacheKey, { data: payload, ts: Date.now() });
        return Response.json(payload);

    } catch (err) {
        console.error('Categorize expense error:', err);
        return Response.json({ error: 'Failed to categorize expense' }, { status: 500 });
    }
}
