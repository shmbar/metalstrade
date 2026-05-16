export const dynamic = 'force-dynamic';
import OpenAI from 'openai';
import { guardAiRequest } from '../../../../utils/aiGuard';
import { db } from '../../../../utils/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getRates, convert } from '../../../../utils/fxRates';

let openai;
function getOpenAI() {
    if (!openai) openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    return openai;
}

// Two-tier cache:
//   L1: in-memory Map — instant hit for the warm Node process
//   L2: Firestore doc at {uid}/aiCache/forecast — survives cold starts, shared across instances
// Both TTL at 15 minutes.
const memCache = new Map();
const CACHE_TTL = 15 * 60 * 1000;

async function readL2Cache(uid, horizon, todayStr) {
    if (!uid) return null;
    try {
        const ref = doc(db, uid, 'aiCache', 'forecast', String(horizon), todayStr);
        const snap = await getDoc(ref);
        if (!snap.exists()) return null;
        const { data, ts } = snap.data();
        if (!ts || Date.now() - ts > CACHE_TTL) return null;
        return data;
    } catch {
        return null;
    }
}

async function writeL2Cache(uid, horizon, todayStr, data) {
    if (!uid) return;
    try {
        const ref = doc(db, uid, 'aiCache', 'forecast', String(horizon), todayStr);
        await setDoc(ref, { data, ts: Date.now() });
    } catch {
        // Non-fatal — cache write failure shouldn't break the response
    }
}

function addDays(date, days) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
}

function computeForecast(invoices, expenses, horizon, today) {
    const cutoff = addDays(today, horizon);

    // Projected inflow: unpaid final invoices due within horizon
    // Convention in this app: invoice's `delDate` (delivery date) is the payment due date
    const inflowItems = invoices.filter(inv => {
        if (!inv.isFinal || inv.canceled || inv.paymentStatus === 'Paid') return false;
        if (!inv.dueDate) return false;
        const due = new Date(inv.dueDate);
        return due >= today && due <= cutoff;
    });

    // Projected outflow: unpaid expenses scheduled within horizon
    // Expenses represent ALL supplier payments owed (per project's accounting model)
    const outflowExpItems = expenses.filter(exp => {
        if (!exp.amount || exp.isPaid) return false;
        if (!exp.date) return false;
        const d = new Date(exp.date);
        return d >= today && d <= cutoff;
    });

    // Also include overdue items (past due, still unpaid) — they should be counted in the
    // forecast horizon since they're still cash that needs to move
    const overdueInflow = invoices.filter(inv => {
        if (!inv.isFinal || inv.canceled || inv.paymentStatus === 'Paid') return false;
        if (!inv.dueDate) return false;
        return new Date(inv.dueDate) < today;
    });
    const overdueOutflow = expenses.filter(exp => {
        if (!exp.amount || exp.isPaid) return false;
        if (!exp.date) return false;
        return new Date(exp.date) < today;
    });

    // Group by currency
    const inflow = {};
    const overdueInflowByCur = {};
    inflowItems.forEach(inv => {
        const cur = inv.currency || 'USD';
        inflow[cur] = (inflow[cur] || 0) + (inv.balanceDue || 0);
    });
    overdueInflow.forEach(inv => {
        const cur = inv.currency || 'USD';
        overdueInflowByCur[cur] = (overdueInflowByCur[cur] || 0) + (inv.balanceDue || 0);
    });

    const outflow = {};
    const overdueOutflowByCur = {};
    outflowExpItems.forEach(exp => {
        const cur = exp.currency || 'USD';
        outflow[cur] = (outflow[cur] || 0) + (parseFloat(exp.amount) || 0);
    });
    overdueOutflow.forEach(exp => {
        const cur = exp.currency || 'USD';
        overdueOutflowByCur[cur] = (overdueOutflowByCur[cur] || 0) + (parseFloat(exp.amount) || 0);
    });

    const net = {};
    const allCurs = [...new Set([...Object.keys(inflow), ...Object.keys(outflow)])];
    allCurs.forEach(cur => {
        net[cur] = (inflow[cur] || 0) - (outflow[cur] || 0);
    });

    return {
        inflow,
        outflow,
        net,
        overdueInflow: overdueInflowByCur,
        overdueOutflow: overdueOutflowByCur,
        sources: {
            invoiceCount: inflowItems.length,
            expenseCount: outflowExpItems.length,
            overdueInvoiceCount: overdueInflow.length,
            overdueExpenseCount: overdueOutflow.length,
        }
    };
}

export async function POST(request) {
    const guard = await guardAiRequest(request);
    if (guard.error) return Response.json({ error: guard.error }, { status: guard.status });

    try {
        const { horizon, invoices, expenses, uid, baseCurrency } = await request.json();

        if (![30, 60, 90].includes(horizon)) {
            return Response.json({ error: 'Invalid horizon. Must be 30, 60, or 90' }, { status: 400 });
        }

        const base = (baseCurrency || 'USD').toUpperCase();

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString().split('T')[0];

        const cacheKey = `${uid}:${horizon}:${todayStr}`;

        // L1 — memory
        const memHit = memCache.get(cacheKey);
        if (memHit && Date.now() - memHit.ts < CACHE_TTL) {
            return Response.json({ ...memHit.data, cacheSource: 'memory' });
        }

        // L2 — Firestore (survives cold starts)
        const l2Hit = await readL2Cache(uid, horizon, todayStr);
        if (l2Hit) {
            memCache.set(cacheKey, { data: l2Hit, ts: Date.now() });
            return Response.json({ ...l2Hit, cacheSource: 'firestore' });
        }

        const forecast = computeForecast(invoices || [], expenses || [], horizon, today);

        // FX: convert all per-currency totals to base for an at-a-glance net
        const rates = await getRates(base);
        const sumInBase = (byCur) => Object.entries(byCur).reduce(
            (s, [cur, amt]) => s + convert(amt, cur, base, rates), 0
        );
        const baseTotals = {
            inflow: sumInBase(forecast.inflow),
            outflow: sumInBase(forecast.outflow),
            overdueInflow: sumInBase(forecast.overdueInflow),
            overdueOutflow: sumInBase(forecast.overdueOutflow),
        };
        baseTotals.net = baseTotals.inflow - baseTotals.outflow;

        // Build summary string for GPT
        const inflowStr = Object.entries(forecast.inflow).map(([c, v]) => `${c} ${v.toFixed(2)}`).join(', ') || 'none';
        const outflowStr = Object.entries(forecast.outflow).map(([c, v]) => `${c} ${v.toFixed(2)}`).join(', ') || 'none';
        const netStr = Object.entries(forecast.net).map(([c, v]) => `${c} ${v.toFixed(2)}`).join(', ') || 'balanced';

        const aiResponse = await getOpenAI().chat.completions.create({
            model: 'gpt-4o-mini',
            temperature: 0.2,
            max_tokens: 250,
            response_format: { type: 'json_object' },
            messages: [
                {
                    role: 'system',
                    content: `You are a cash flow analyst for a metals trading company. Given a ${horizon}-day forecast, return JSON:
{ "confidence": "high"|"medium"|"low", "assumptions": ["string","string","string"], "risks": ["string","string"] }
Keep each point under 12 words. Max 3 assumptions, max 2 risks.`
                },
                {
                    role: 'user',
                    content: `${horizon}-day forecast.
Projected inflow (unpaid invoices due in window): ${inflowStr}
Projected outflow (unpaid expenses due in window): ${outflowStr}
Net: ${netStr}
Already overdue (still uncollected): inflow ${Object.entries(forecast.overdueInflow).map(([c, v]) => `${c} ${v.toFixed(2)}`).join(', ') || 'none'}, outflow ${Object.entries(forecast.overdueOutflow).map(([c, v]) => `${c} ${v.toFixed(2)}`).join(', ') || 'none'}
Source: ${forecast.sources.invoiceCount} due invoices, ${forecast.sources.expenseCount} due expenses, ${forecast.sources.overdueInvoiceCount} overdue invoices, ${forecast.sources.overdueExpenseCount} overdue expenses.`
                }
            ]
        });

        guard.recordUsage(aiResponse.usage?.total_tokens);
        const ai = JSON.parse(aiResponse.choices[0].message.content);

        const result = {
            horizon,
            inflow: forecast.inflow,
            outflow: forecast.outflow,
            net: forecast.net,
            overdueInflow: forecast.overdueInflow,
            overdueOutflow: forecast.overdueOutflow,
            sources: forecast.sources,
            confidence: ai.confidence || 'medium',
            assumptions: ai.assumptions || [],
            risks: ai.risks || [],
            generatedAt: todayStr,
            baseCurrency: base,
            baseTotals, // single-currency totals for a unified view
        };

        memCache.set(cacheKey, { data: result, ts: Date.now() });
        await writeL2Cache(uid, horizon, todayStr, result);
        return Response.json({ ...result, cacheSource: 'fresh' });

    } catch (err) {
        console.error('Cash forecast error:', err);
        return Response.json({ error: 'Failed to generate forecast' }, { status: 500 });
    }
}
