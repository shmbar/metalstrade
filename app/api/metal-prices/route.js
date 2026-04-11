import { NextResponse } from 'next/server'

const API_KEY = process.env.METALS_API_KEY || '3rc1dhplhw4nkgqkeuix54cmg83w2lpvf23o8qt1b0i7m3a2za352hvz465l'
const SYMBOLS = 'LME-NI,LME-XCU,LME-ALU,LME-LEAD,LME-TIN,LME-ZNC,STEEL-SC,LCO,MO'

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

// Simple in-memory cache — 30 min TTL
let _cache      = null
let _cacheAt    = 0
let _prevPrices = null   // previous fetch cycle — used as change fallback
const CACHE_MS  = 30 * 60 * 1000

function dateStr(offsetDays = 0) {
    const d = new Date(Date.now() + offsetDays * 86400000)
    return d.toISOString().split('T')[0]
}

export async function GET() {
    try {
        const now = Date.now()
        if (_cache && now - _cacheAt < CACHE_MS) {
            return NextResponse.json(_cache)
        }

        // Save current prices before overwriting — used as fallback for change calc
        if (_cache?.prices) _prevPrices = _cache.prices

        // ── 1. Fetch current prices ────────────────────────────────────────────
        const url = `https://metals-api.com/api/latest?access_key=${API_KEY}&base=USD&symbols=${SYMBOLS}`
        const res = await fetch(url, { cache: 'no-store' })
        if (!res.ok) throw new Error(`metals-api HTTP ${res.status}`)

        const json = await res.json()
        if (!json.success) throw new Error(json.error?.info || 'metals-api returned success:false')

        const rates = json.rates || {}

        // ── 2. Fetch 24-hour fluctuation (best-effort, non-fatal) ─────────────
        let fluctRates = {}
        try {
            const yesterday = dateStr(-1)
            const today     = dateStr(0)
            const fluctUrl  = `https://metals-api.com/api/fluctuation?access_key=${API_KEY}&base=USD&symbols=${SYMBOLS}&start_date=${yesterday}&end_date=${today}`
            const fluctRes  = await fetch(fluctUrl, { cache: 'no-store' })
            if (fluctRes.ok) {
                const fluctJson = await fluctRes.json()
                if (fluctJson.success && fluctJson.fluctuation) fluctRates = fluctJson.rates || {}
            }
        } catch (_) { /* no change data — not fatal */ }

        // ── 3. Build prices ────────────────────────────────────────────────────
        const prices = {}

        Object.entries(METAL_META).forEach(([sym, meta]) => {
            const usdRate = rates[`USD${sym}`] ?? (rates[sym] ? 1 / rates[sym] : null)
            if (!usdRate) return
            const divisor = meta.divisor ?? 1
            const price   = Math.round(usdRate * TROY_OZ_PER_MT / divisor * 100) / 100

            // 24h change from fluctuation endpoint
            let change = null, change_pct = null
            const f = fluctRates[sym]
            if (f && f.start_rate && f.start_rate !== 0) {
                const startPrice = Math.round((1 / f.start_rate) * TROY_OZ_PER_MT / divisor * 100) / 100
                change     = Math.round((price - startPrice) * 100) / 100
                change_pct = Math.round(f.change_pct * 100) / 100
            } else if (_prevPrices?.[sym]?.price != null) {
                // Fallback: calculate change from previous cached price cycle
                const prev = _prevPrices[sym].price
                change     = Math.round((price - prev) * 100) / 100
                change_pct = prev !== 0 ? Math.round(((price - prev) / prev) * 10000) / 100 : null
            }

            prices[sym] = { ...meta, unit: 'USD/MT', price, change, change_pct }
        })

        const result = {
            prices,
            timestamp: json.timestamp,
            date: json.date,
            fetchedAt: new Date().toISOString(),
        }

        _cache   = result
        _cacheAt = now

        return NextResponse.json(result)
    } catch (err) {
        console.error('[metal-prices]', err.message)
        if (_cache) return NextResponse.json({ ..._cache, stale: true })
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
