import { NextResponse } from 'next/server'

/* EUR -> USD, from a real currency API.
 *
 * The page used to call openexchangerates directly from the browser with
 * NEXT_PUBLIC_OPENEXCHANGERATES_APP_ID, which is still the literal placeholder
 * `PASTE_...` in .env. Every call 401'd and the client helper answered `1`, so
 * "EUR / USD" read 1.000 while the ECB rate was 1.1578 (2026-09-02) — a ~16%
 * error carried into every euro conversion on Formulas AND into euroToUSD on
 * saved contracts. Rates now come from keyless ECB reference data; the key is
 * only consulted when someone has actually filled one in.
 *
 * Server-side so no key is ever shipped to the browser and one cache serves
 * every user — same shape as /api/metal-prices.
 */

const OXR_KEY = process.env.OPENEXCHANGERATES_APP_ID || process.env.NEXT_PUBLIC_OPENEXCHANGERATES_APP_ID
// A placeholder is not a key. Without this guard the chain wastes a request and
// a round-trip on every load to be told 401 again.
const hasOxrKey = !!OXR_KEY && !/^PASTE|_HERE$|^your/i.test(OXR_KEY) && OXR_KEY.length > 16

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

// ECB publishes once per business day, so a historical rate never changes and is
// cached for the life of the process; only `latest` needs a TTL.
const _cache = new Map()
const LATEST_TTL_MS = 30 * 60 * 1000

const round4 = (n) => Math.round(n * 10000) / 10000

/* 1. ECB reference rates via Frankfurter — keyless, and the rate European
      contracts are actually written against. A weekend or holiday resolves
      back to the last publishing day, which is what a contract dated on a
      Saturday should use anyway. */
async function fromFrankfurter(date) {
    const path = date ? date : 'latest'
    const res = await fetch(`https://api.frankfurter.dev/v1/${path}?base=EUR&symbols=USD`, { cache: 'no-store' })
    if (!res.ok) throw new Error(`frankfurter HTTP ${res.status}`)
    const json = await res.json()
    const rate = json?.rates?.USD
    if (!rate) throw new Error('frankfurter returned no USD rate')
    return { rate: round4(rate), date: json.date, source: 'ecb/frankfurter' }
}

/* 2. exchangerate-api's open endpoint — keyless, latest only. */
async function fromOpenErApi(date) {
    if (date) throw new Error('open.er-api has no historical endpoint')
    const res = await fetch('https://open.er-api.com/v6/latest/EUR', { cache: 'no-store' })
    if (!res.ok) throw new Error(`open.er-api HTTP ${res.status}`)
    const json = await res.json()
    const rate = json?.rates?.USD
    if (json?.result !== 'success' || !rate) throw new Error('open.er-api returned no USD rate')
    return { rate: round4(rate), date: (json.time_last_update_utc || '').slice(5, 16), source: 'exchangerate-api' }
}

/* 3. openexchangerates, only if a genuine key is configured. Its historical
      endpoint is a paid feature, so this can still fail on a free plan. */
async function fromOxr(date) {
    if (!hasOxrKey) throw new Error('no openexchangerates key configured')
    const path = date ? `historical/${date}.json` : 'latest.json'
    const res = await fetch(`https://openexchangerates.org/api/${path}?app_id=${OXR_KEY}`, { cache: 'no-store' })
    if (!res.ok) throw new Error(`openexchangerates HTTP ${res.status}`)
    const json = await res.json()
    const eur = json?.rates?.EUR
    if (!eur) throw new Error('openexchangerates returned no EUR rate')
    // Free plans are USD-based: EUR/USD is the reciprocal of USD->EUR.
    return { rate: round4(1 / eur), date: date || new Date(json.timestamp * 1000).toISOString().slice(0, 10), source: 'openexchangerates' }
}

export async function GET(request) {
    const raw = request.nextUrl.searchParams.get('date')
    const today = new Date().toISOString().slice(0, 10)
    // A future date has no published rate — ask for the latest instead.
    const date = raw && DATE_RE.test(raw) && raw < today ? raw : null
    const key = date || 'latest'

    const hit = _cache.get(key)
    if (hit && (date || Date.now() - hit.cachedAt < LATEST_TTL_MS)) {
        return NextResponse.json({ ...hit.payload, cached: true })
    }

    const errors = []
    for (const provider of [fromFrankfurter, fromOpenErApi, fromOxr]) {
        try {
            const out = await provider(date)
            const payload = { ...out, requested: raw || today, fetchedAt: new Date().toISOString() }
            _cache.set(key, { payload, cachedAt: Date.now() })
            return NextResponse.json(payload)
        } catch (err) {
            errors.push(err.message)
        }
    }

    console.error('[fx]', errors.join(' | '))
    // Serving a stale real rate beats serving an invented one.
    if (hit) return NextResponse.json({ ...hit.payload, stale: true })
    return NextResponse.json({ error: errors.join(' | ') || 'no rate available' }, { status: 502 })
}
