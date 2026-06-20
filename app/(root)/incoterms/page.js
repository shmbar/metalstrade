'use client'

// Incoterms® 2020 reference page — a read-only lookup so the team can quickly check
// who is responsible for what under each delivery term. Static reference data (no
// Firestore): the 11 official Incoterms 2020, grouped by transport mode, with risk
// transfer point and the seller/buyer split for carriage, insurance and clearance.
import { useMemo, useState } from 'react'
import { Search, Ship, Globe2, ChevronRight } from 'lucide-react'

// mode: 'any'  = any mode of transport (incl. multimodal / containers)
//       'sea'  = sea & inland waterway only
const INCOTERMS = [
    {
        code: 'EXW', name: 'Ex Works', mode: 'any',
        desc: "Seller makes the goods available at its own premises (or another named place). The buyer bears all costs and risks of taking the goods from there — the minimum obligation for the seller.",
        risk: "At the seller's premises, when the goods are placed at the buyer's disposal (not loaded).",
        carriage: 'Buyer — arranges and pays all transport',
        insurance: 'Not required',
        exportC: 'Buyer', importC: 'Buyer',
    },
    {
        code: 'FCA', name: 'Free Carrier', mode: 'any',
        desc: "Seller delivers the goods, cleared for export, to the carrier nominated by the buyer at the named place. Risk passes at that handover.",
        risk: "When goods are handed to the buyer's carrier (loaded, if delivery is at the seller's premises).",
        carriage: 'Buyer — main carriage',
        insurance: 'Not required',
        exportC: 'Seller', importC: 'Buyer',
    },
    {
        code: 'CPT', name: 'Carriage Paid To', mode: 'any',
        desc: "Seller pays for carriage to the named destination, but risk transfers to the buyer as soon as the goods are handed to the first carrier.",
        risk: 'When goods are handed to the first carrier (at origin).',
        carriage: 'Seller — pays to the named destination',
        insurance: 'Not required',
        exportC: 'Seller', importC: 'Buyer',
    },
    {
        code: 'CIP', name: 'Carriage and Insurance Paid To', mode: 'any',
        desc: "As CPT, but the seller also buys insurance covering the buyer's risk. Under the 2020 rules the seller must provide all-risk cover (Institute Cargo Clauses A).",
        risk: 'When goods are handed to the first carrier (at origin).',
        carriage: 'Seller — pays to the named destination',
        insurance: 'Seller — all-risk cover (ICC A)',
        exportC: 'Seller', importC: 'Buyer',
    },
    {
        code: 'DAP', name: 'Delivered at Place', mode: 'any',
        desc: "Seller delivers when the goods are placed at the buyer's disposal at the named destination, ready for unloading. The seller bears all risk up to that point.",
        risk: 'At the named destination, ready for unloading (seller does not unload).',
        carriage: 'Seller — to the named destination',
        insurance: 'Not required (seller bears risk to destination)',
        exportC: 'Seller', importC: 'Buyer',
    },
    {
        code: 'DPU', name: 'Delivered at Place Unloaded', mode: 'any',
        desc: "Seller delivers when the goods, once unloaded, are placed at the buyer's disposal at the named place. The only Incoterm that requires the seller to unload.",
        risk: 'At the named place, once the goods are unloaded.',
        carriage: 'Seller — to the named place, including unloading',
        insurance: 'Not required',
        exportC: 'Seller', importC: 'Buyer',
    },
    {
        code: 'DDP', name: 'Delivered Duty Paid', mode: 'any',
        desc: "Seller delivers the goods cleared for import at the named destination and pays all duties and taxes — the maximum obligation for the seller.",
        risk: 'At the named destination, ready for unloading.',
        carriage: 'Seller — to the named destination',
        insurance: 'Not required',
        exportC: 'Seller', importC: 'Seller — incl. duties & taxes',
    },
    {
        code: 'FAS', name: 'Free Alongside Ship', mode: 'sea',
        desc: "Seller delivers when the goods are placed alongside the vessel (e.g. on the quay) at the named port of shipment.",
        risk: 'When goods are placed alongside the vessel at the port of shipment.',
        carriage: 'Buyer — main carriage',
        insurance: 'Not required',
        exportC: 'Seller', importC: 'Buyer',
    },
    {
        code: 'FOB', name: 'Free on Board', mode: 'sea',
        desc: "Seller delivers when the goods are on board the vessel nominated by the buyer at the named port of shipment.",
        risk: 'When goods are on board the vessel at the port of shipment.',
        carriage: 'Buyer — main carriage',
        insurance: 'Not required',
        exportC: 'Seller', importC: 'Buyer',
    },
    {
        code: 'CFR', name: 'Cost and Freight', mode: 'sea',
        desc: "Seller pays the cost and freight to bring the goods to the destination port, but risk transfers once the goods are on board at origin.",
        risk: 'When goods are on board the vessel at the port of shipment.',
        carriage: 'Seller — pays freight to the destination port',
        insurance: 'Not required',
        exportC: 'Seller', importC: 'Buyer',
    },
    {
        code: 'CIF', name: 'Cost, Insurance and Freight', mode: 'sea',
        desc: "As CFR, but the seller also provides marine insurance covering the buyer's risk. Under the 2020 rules minimum cover (Institute Cargo Clauses C) is required.",
        risk: 'When goods are on board the vessel at the port of shipment.',
        carriage: 'Seller — pays freight to the destination port',
        insurance: 'Seller — minimum cover (ICC C)',
        exportC: 'Seller', importC: 'Buyer',
    },
]

const MODE_FILTERS = [
    { key: 'all', label: 'All' },
    { key: 'any', label: 'Any mode of transport' },
    { key: 'sea', label: 'Sea & inland waterway' },
]

const ModeTag = ({ mode }) => {
    const sea = mode === 'sea'
    return (
        <span className="inline-flex items-center gap-1 rounded-full font-medium whitespace-nowrap"
            style={{ fontSize: '0.6rem', padding: '2px 8px', background: sea ? '#eff6ff' : '#f0fdf4', color: sea ? 'var(--endeavour)' : '#15803d', boxShadow: `inset 0 0 0 1px ${sea ? '#bfdbfe' : '#bbf7d0'}` }}>
            {sea ? <Ship className="w-2.5 h-2.5" /> : <Globe2 className="w-2.5 h-2.5" />}
            {sea ? 'Sea / inland waterway' : 'Any mode'}
        </span>
    )
}

// One responsibility row — Seller obligations are tinted blue, Buyer amber, so the
// split can be read at a glance.
const Row = ({ label, value }) => {
    const who = /^Seller/.test(value) ? 'seller' : /^Buyer/.test(value) ? 'buyer' : 'none'
    const color = who === 'seller' ? 'var(--endeavour)' : who === 'buyer' ? '#b45309' : 'var(--port-gore)'
    return (
        <div className="flex items-start justify-between gap-3 py-1 border-b border-[#eef5fc] last:border-0">
            <span className="responsiveTextTable text-[var(--regent-gray)] whitespace-nowrap">{label}</span>
            <span className="responsiveTextTable text-right font-medium" style={{ color }}>{value}</span>
        </div>
    )
}

const IncotermCard = ({ t }) => (
    <div className="rounded-2xl border border-[#b8ddf8] bg-white overflow-hidden shadow-sm flex flex-col">
        <div className="flex items-center gap-3 px-4 py-3" style={{ background: '#dbeeff' }}>
            <span className="grid place-items-center rounded-lg font-bold text-white shrink-0"
                style={{ background: 'var(--endeavour)', width: 46, height: 36, fontSize: '0.95rem', letterSpacing: '0.02em' }}>
                {t.code}
            </span>
            <div className="min-w-0">
                <div className="responsiveText font-semibold text-[var(--chathams-blue)] leading-tight truncate">{t.name}</div>
                <div className="mt-0.5"><ModeTag mode={t.mode} /></div>
            </div>
        </div>
        <div className="px-4 py-3 flex flex-col gap-3 grow">
            <p className="responsiveTextTable text-[var(--port-gore)] leading-snug">{t.desc}</p>
            <div className="rounded-xl bg-[#f8fbff] border border-[#d8e8f5] px-3 py-1.5">
                <Row label="Risk transfers" value={t.risk} />
                <Row label="Carriage" value={t.carriage} />
                <Row label="Insurance" value={t.insurance} />
                <Row label="Export clearance" value={t.exportC} />
                <Row label="Import clearance" value={t.importC} />
            </div>
        </div>
    </div>
)

const Incoterms = () => {
    const [query, setQuery] = useState('')
    const [mode, setMode] = useState('all')

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase()
        return INCOTERMS.filter(t =>
            (mode === 'all' || t.mode === mode) &&
            (q === '' || t.code.toLowerCase().includes(q) || t.name.toLowerCase().includes(q) || t.desc.toLowerCase().includes(q))
        )
    }, [query, mode])

    return (
        <div className="mx-auto w-full max-w-full px-1 md:px-2 pb-4 mt-[72px]" style={{ background: '#f8fbff' }}>
            <div className="rounded-2xl p-3 sm:p-5 mt-8 border border-[#b8ddf8] shadow-xl w-full bg-[#f8fbff]">
                {/* Header */}
                <div className="flex flex-col gap-1 mb-4">
                    <h1 className="text-[var(--chathams-blue)] responsiveTextTitle font-medium border-l-4 border-[var(--chathams-blue)] pl-2">
                        Incoterms® 2020
                    </h1>
                    <p className="responsiveTextTable text-[var(--regent-gray)] pl-3">
                        The 11 international delivery terms — who carries the cost and the risk, and where it transfers between seller and buyer.
                    </p>
                </div>

                {/* Controls */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--regent-gray)]" />
                        <input
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            placeholder="Search code, name or description…"
                            className="w-full rounded-full bg-white border border-[#d8e8f5] pl-8 pr-3 h-8 responsiveTextTable text-[var(--chathams-blue)] focus:outline-none focus:border-[var(--endeavour)]"
                            style={{ fontFamily: 'inherit' }}
                        />
                    </div>
                    <div className="flex items-center gap-1 flex-wrap">
                        {MODE_FILTERS.map(f => (
                            <button key={f.key} type="button" onClick={() => setMode(f.key)}
                                className="rounded-full font-medium transition-colors"
                                style={{
                                    fontSize: '0.68rem', padding: '5px 12px',
                                    background: mode === f.key ? 'var(--endeavour)' : 'white',
                                    color: mode === f.key ? 'white' : 'var(--chathams-blue)',
                                    border: `1px solid ${mode === f.key ? 'var(--endeavour)' : '#d8e8f5'}`,
                                }}>
                                {f.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Legend */}
                <div className="flex items-center gap-4 mb-3 pl-1">
                    <span className="inline-flex items-center gap-1.5 responsiveTextTable text-[var(--regent-gray)]">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--endeavour)' }} /> Seller&apos;s responsibility
                    </span>
                    <span className="inline-flex items-center gap-1.5 responsiveTextTable text-[var(--regent-gray)]">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#b45309' }} /> Buyer&apos;s responsibility
                    </span>
                </div>

                {/* Cards */}
                {filtered.length === 0 ? (
                    <div className="responsiveText text-[var(--regent-gray)] py-10 text-center">No Incoterm matches “{query}”.</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                        {filtered.map(t => <IncotermCard key={t.code} t={t} />)}
                    </div>
                )}

                {/* Footnote */}
                <p className="responsiveTextTable text-[var(--regent-gray)] mt-5 pl-1 flex items-start gap-1">
                    <ChevronRight className="w-3 h-3 mt-0.5 shrink-0" />
                    Incoterms® is a trademark of the International Chamber of Commerce (ICC). This page is a quick internal reference and does not replace the official ICC rules or the wording agreed in each contract.
                </p>
            </div>
        </div>
    )
}

export default Incoterms
