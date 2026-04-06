import { NextResponse } from 'next/server'

const API_KEY = process.env.METALS_API_KEY || '3rc1dhplhw4nkgqkeuix54cmg83w2lpvf23o8qt1b0i7m3a2za352hvz465l'
const SYMBOLS = 'LME-NI,LME-XCU,LME-ALU,LME-LEAD,LME-TIN,LME-ZNC,STEEL-SC,TUNGSTEN,LCO,MO'

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
    // Tungsten API rate uses a different internal unit — divide by 10 to get USD/MT
    'TUNGSTEN': { name: 'Tungsten',    symbol: 'W',  order: 8, divisor: 10 },
    'LCO':      { name: 'Cobalt',      symbol: 'Co', order: 9 },
    'MO':       { name: 'Molybdenum',  symbol: 'Mo', order: 10 },
}

// Simple in-memory cache — 30 min TTL
let _cache = null
let _cacheAt = 0
const CACHE_MS = 30 * 60 * 1000

export async function GET() {
    try {
        const now = Date.now()
        if (_cache && now - _cacheAt < CACHE_MS) {
            return NextResponse.json(_cache)
        }

        const url = `https://metals-api.com/api/latest?access_key=${API_KEY}&base=USD&symbols=${SYMBOLS}`
        const res = await fetch(url, { cache: 'no-store' })
        if (!res.ok) throw new Error(`metals-api HTTP ${res.status}`)

        const json = await res.json()
        if (!json.success) throw new Error(json.error?.info || 'metals-api returned success:false')

        const rates = json.rates || {}
        const prices = {}

        Object.entries(METAL_META).forEach(([sym, meta]) => {
            // USD-prefixed key already has the 1/rate value: USD per troy oz
            const usdRate = rates[`USD${sym}`] ?? (rates[sym] ? 1 / rates[sym] : null)
            if (!usdRate) return
            const divisor = meta.divisor ?? 1
            prices[sym] = {
                ...meta,
                unit: 'USD/MT',
                price: Math.round(usdRate * TROY_OZ_PER_MT / divisor * 100) / 100,
            }
        })

        const result = {
            prices,
            timestamp: json.timestamp,
            date: json.date,
            fetchedAt: new Date().toISOString(),
        }

        _cache = result
        _cacheAt = now

        return NextResponse.json(result)
    } catch (err) {
        console.error('[metal-prices]', err.message)
        // Return cached data on error rather than failing completely
        if (_cache) return NextResponse.json({ ..._cache, stale: true })
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
