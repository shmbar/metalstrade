import { NextResponse } from 'next/server'

/* Live metal prices AND live exchange rates for the dashboard, from metals-api.
 *
 * The feed answers every minute — a `latest` call at 16:53:28 UTC came back
 * stamped 16:53:00 — but this route used to hold one answer for 30 minutes, so the
 * strip could be half an hour behind on its best day. It also went on serving that
 * answer indefinitely once metals-api started failing, flagged `stale: true` in a
 * field the ticker never read: that is how a strip ends up showing yesterday.
 *
 * Now:
 *  - one upstream answer per TTL (60 s; METALS_API_TTL_SECONDS overrides it if the
 *    plan's monthly call allowance needs a longer gap);
 *  - metals and currencies come from ONE `latest` call, so live FX costs nothing
 *    extra against that allowance;
 *  - the change figure is today against yesterday, from one `historical` call per
 *    UTC day (see refreshReference);
 *  - `?fresh=1` (the Refresh button) skips the TTL, at most once per 15 s;
 *  - concurrent requests at expiry share one upstream call;
 *  - a failing provider still gets the last good answer served, but it now says
 *    so — `stale: true`, `error`, and the original `timestamp` the ticker prints.
 *
 * force-dynamic + no-store: nothing between here and the browser — Next, Vercel's
 * edge, the browser's HTTP cache — may keep a copy of a live price.
 */
export const dynamic = 'force-dynamic'
export const revalidate = 0

const API_KEY = process.env.METALS_API_KEY || '3rc1dhplhw4nkgqkeuix54cmg83w2lpvf23o8qt1b0i7m3a2za352hvz465l'

const METAL_SYMBOLS = ['LME-NI', 'LME-XCU', 'LME-ALU', 'LME-LEAD', 'LME-TIN', 'LME-ZNC', 'STEEL-SC', 'LCO', 'MO']
// The dashboard's currencies. metals-api quotes them on the same USD base, so
// rates.EUR is euros per 1 USD — the shape useExchangeRates has always returned.
const FX_SYMBOLS = ['EUR', 'GBP', 'ILS', 'RUB', 'AED', 'CNY']

// 1 metric ton = 32,150.746 troy ounces (metals-api /latest uses troy oz as base unit)
const TROY_OZ_PER_MT = 32150.746

const METAL_META = {
    'LME-NI':   { name: 'Nickel',      symbol: 'Ni', order: 1 },
    'LME-XCU':  { name: 'Copper',      symbol: 'Cu', order: 2 },
    'LME-ALU':  { name: 'Aluminium',   symbol: 'Al', order: 3 },
    'LME-LEAD': { name: 'Lead',        symbol: 'Pb', order: 4 },
    'LME-TIN':  { name: 'Tin',         symbol: 'Sn', order: 5 },
    'LME-ZNC':  { name: 'Zinc',        symbol: 'Zn', order: 6 },
    'STEEL-SC': { name: 'Steel Scrap', symbol: 'St', order: 7 },
    'LCO':      { name: 'Cobalt',      symbol: 'Co', order: 8 },
    'MO':       { name: 'Molybdenum',  symbol: 'Mo', order: 9 },
}

const TTL_MS       = Math.max(15, Number(process.env.METALS_API_TTL_SECONDS) || 60) * 1000
const RETRY_GAP_MS = 15 * 1000
const REF_RETRY_MS = 10 * 60 * 1000

let _cache      = null   // last good payload
let _cacheAt    = 0      // when it was fetched
let _attemptAt  = 0      // last upstream attempt, good or bad
let _lastError  = null   // message from the last failed attempt, cleared on success
let _inflight   = null   // shared promise while an upstream call is running
let _ref        = { date: null, rates: {} }   // yesterday's metal rates (troy oz per USD)
let _refTriedAt = 0

const NO_STORE = { 'Cache-Control': 'no-store, max-age=0' }
const send = (body, status = 200) => NextResponse.json(body, { status, headers: NO_STORE })
const current = () => (_lastError ? { ..._cache, stale: true, error: _lastError } : _cache)

function dateStr(offsetDays = 0) {
    const d = new Date(Date.now() + offsetDays * 86400000)
    return d.toISOString().split('T')[0]
}

const toPrice = (rate, divisor = 1) => Math.round((1 / rate) * TROY_OZ_PER_MT / divisor * 100) / 100

async function upstream(path, params) {
    const qs = new URLSearchParams({ access_key: API_KEY, base: 'USD', ...params })
    const res = await fetch(`https://metals-api.com/api/${path}?${qs}`, { cache: 'no-store' })
    if (!res.ok) throw new Error(`metals-api HTTP ${res.status}`)
    const body = await res.json()
    if (!body.success) throw new Error(body.error?.info || body.error?.type || 'metals-api returned success:false')
    return body
}

/* The change figure: today's price against YESTERDAY's, fetched once per UTC day.

   It used to come from the `fluctuation` endpoint, asked for all nine metals in one
   call — which that endpoint refuses ("You can't query fluctuation for more than one
   symbol"), a 400 that was caught and ignored. So the server never once had a change
   figure, and every % on the strip came from each browser's own saved history: two
   people could see different moves for the same metal. Its other fallback was the
   previous cache cycle, which at a 60 s TTL would have passed off a one-minute move
   as the day's.

   LME official prices are set once per trading day (LME-NI came back identical at
   15:03, 16:53 and 17:04 UTC), so the move that means something is day over day —
   and yesterday's rates never change, so one fetch serves every request that day.
   Computed from PRICES, not taken from the provider's change_pct: that is on its
   rate, troy oz per USD, the inverse of a price, so its sign is the opposite. */
async function refreshReference(now) {
    const day = dateStr(-1)
    if (_ref.date === day || now - _refTriedAt < REF_RETRY_MS) return
    _refTriedAt = now
    const rates = _ref.date === null ? { ..._ref.rates } : {}
    try {
        const body = await upstream(day, { symbols: METAL_SYMBOLS.join(',') })
        Object.assign(rates, body.rates || {})
    } catch (_) { /* fall through to one symbol per call */ }
    const missing = METAL_SYMBOLS.filter((s) => !(Number(rates[s]) > 0))
    if (missing.length) {
        const one = await Promise.all(missing.map((s) =>
            upstream(day, { symbols: s }).then((b) => b.rates?.[s]).catch(() => null)))
        missing.forEach((s, i) => { if (Number(one[i]) > 0) rates[s] = Number(one[i]) })
    }
    const complete = METAL_SYMBOLS.every((s) => Number(rates[s]) > 0)
    // A partial set is still used, but not marked done, so the gaps are retried.
    _ref = { date: complete ? day : null, rates, day }
}

async function load() {
    const now = Date.now()
    _attemptAt = now
    try {
        const [latest] = await Promise.all([
            upstream('latest', { symbols: [...METAL_SYMBOLS, ...FX_SYMBOLS].join(',') }),
            refreshReference(now).catch(() => {}),
        ])
        const rates = latest.rates || {}

        const prices = {}
        Object.entries(METAL_META).forEach(([sym, meta]) => {
            const usdRate = rates[`USD${sym}`] ?? (rates[sym] ? 1 / rates[sym] : null)
            if (!usdRate) return
            const divisor = meta.divisor ?? 1
            const price   = Math.round(usdRate * TROY_OZ_PER_MT / divisor * 100) / 100

            let change = null, change_pct = null
            const refRate = Number(_ref.rates[sym])
            if (refRate > 0) {
                const refPrice = toPrice(refRate, divisor)
                change     = Math.round((price - refPrice) * 100) / 100
                change_pct = refPrice !== 0 ? Math.round(((price - refPrice) / refPrice) * 10000) / 100 : null
            }

            prices[sym] = { ...meta, unit: 'USD/MT', price, change, change_pct }
        })

        const fx = { USD: 1 }
        FX_SYMBOLS.forEach((cur) => {
            const r = Number(rates[cur])
            if (r > 0) fx[cur] = r
        })

        _cache = {
            prices,
            fx,
            timestamp: latest.timestamp,        // when metals-api stamped these rates (epoch s)
            date: latest.date,                  // its UTC calendar date — kept for older clients
            changeSince: _ref.day || null,      // the day the change figures are measured from
            fetchedAt: new Date(now).toISOString(),
            stale: false,
        }
        _cacheAt = now
        _lastError = null
        return _cache
    } catch (err) {
        _lastError = err.message
        throw err
    }
}

export async function GET(request) {
    const now = Date.now()
    const wantsFresh = request.nextUrl.searchParams.has('fresh')
    const expired = !_cache || now - _cacheAt >= TTL_MS
    const triedJustNow = now - _attemptAt < RETRY_GAP_MS

    // Inside its TTL (and Refresh not pressed), or the provider was asked under 15 s
    // ago — a burst of Refresh clicks, or a provider that has just failed, is not
    // worth another call against the plan.
    if (_cache && ((!expired && !wantsFresh) || triedJustNow)) return send(current())
    if (!_cache && triedJustNow && _lastError) return send({ error: _lastError }, 502)

    try {
        if (!_inflight) _inflight = load().finally(() => { _inflight = null })
        return send(await _inflight)
    } catch (err) {
        console.error('[metal-prices]', err.message)
        return _cache ? send(current()) : send({ error: err.message }, 502)
    }
}
