// Server-side guard for /api/ai/* and /api/assistant routes.
// Provides three layers of protection that work without firebase-admin:
//   1. Auth: verifies Firebase ID token via the public identitytoolkit REST API
//   2. Rate limit: per-user sliding-window cap on request count
//   3. Cost ceiling: per-user daily OpenAI token budget circuit breaker
//
// All state is in-memory — fine for a single Node instance. For serverless or
// multi-instance deployments, swap the Maps for Firestore-backed counters.

const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const RATE_MAX = parseInt(process.env.AI_RATE_LIMIT_PER_HOUR || '60', 10);
const DAILY_TOKEN_BUDGET = parseInt(process.env.AI_DAILY_TOKEN_BUDGET || '200000', 10); // ~$0.60/day on gpt-4o-mini

const TOKEN_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const tokenCache = new Map(); // idToken -> { uid, email, exp }
const buckets = new Map();    // uid -> { timestamps: number[], tokens: number, day: 'YYYY-MM-DD' }

function getBucket(uid) {
    let b = buckets.get(uid);
    const today = new Date().toISOString().slice(0, 10);
    if (!b) {
        b = { timestamps: [], tokens: 0, day: today };
        buckets.set(uid, b);
    } else if (b.day !== today) {
        b.tokens = 0;
        b.day = today;
    }
    return b;
}

async function verifyIdToken(idToken) {
    const cached = tokenCache.get(idToken);
    if (cached && cached.exp > Date.now()) return { uid: cached.uid, email: cached.email };

    const apiKey = process.env.NEXT_PUBLIC_API_KEY;
    if (!apiKey) return { error: 'Server auth not configured (NEXT_PUBLIC_API_KEY missing)' };

    try {
        const res = await fetch(
            `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idToken }),
            }
        );
        if (!res.ok) return { error: 'Invalid auth token' };
        const data = await res.json();
        const user = data.users?.[0];
        if (!user?.localId) return { error: 'Invalid auth token' };

        tokenCache.set(idToken, {
            uid: user.localId,
            email: user.email || null,
            exp: Date.now() + TOKEN_CACHE_TTL,
        });
        return { uid: user.localId, email: user.email || null };
    } catch {
        return { error: 'Auth verification failed' };
    }
}

/**
 * Run before any OpenAI call in a route handler.
 * Returns either { uid, email, recordUsage(totalTokens) } or { error, status }.
 *
 * Usage:
 *   const guard = await guardAiRequest(request);
 *   if (guard.error) return Response.json({ error: guard.error }, { status: guard.status });
 *   ... call OpenAI ...
 *   guard.recordUsage(response.usage?.total_tokens);
 */
export async function guardAiRequest(request) {
    const authHeader = request.headers.get('authorization') || '';
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    if (!idToken) return { error: 'Authentication required', status: 401 };

    const verified = await verifyIdToken(idToken);
    if (verified.error) return { error: verified.error, status: 401 };

    const bucket = getBucket(verified.uid);
    const now = Date.now();
    bucket.timestamps = bucket.timestamps.filter(t => now - t < RATE_WINDOW_MS);

    if (bucket.timestamps.length >= RATE_MAX) {
        return {
            error: `Rate limit reached (${RATE_MAX} AI requests/hour). Try again in a few minutes.`,
            status: 429,
        };
    }
    if (bucket.tokens >= DAILY_TOKEN_BUDGET) {
        return {
            error: `Daily AI token budget reached (${DAILY_TOKEN_BUDGET.toLocaleString()} tokens). Resets at 00:00 UTC.`,
            status: 429,
        };
    }

    bucket.timestamps.push(now);

    return {
        uid: verified.uid,
        email: verified.email,
        recordUsage: (totalTokens) => {
            if (totalTokens && Number.isFinite(totalTokens)) bucket.tokens += totalTokens;
        },
    };
}

/** For SSE error responses — wraps an error message as an SSE-compatible payload. */
export function sseErrorResponse(message, status = 401) {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
        start(controller) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: message })}\n\n`));
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
        },
    });
    return new Response(stream, {
        status,
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        },
    });
}
