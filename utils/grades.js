// Grades — a declared name for material that arrives under many spellings, and the
// chemistry each lot actually carries. PURE: no Firestore, no React, so it is tested
// directly and shared by every screen that groups or shows material.
//
// Why a registry rather than a smarter parser. The IMS stock list holds ~550 distinct
// descriptions for what is commercially a few dozen grades, and the text fold in
// stocks/sumtables/gradeKey.js can only take it to ~420: nothing in a string says that
// "30Ni 18Cr 2Mo Turnings" and "31Ni … Ti Turnings" are one thing, or that
// "42Ni 12Cr 3Mo 3Nb 6Co 2Ti" IS 40Ni. Those are trading decisions, so they are
// recorded, once, as data:
//
//   { id, name: '40Ni', spec: '42Ni 12Cr 3Mo 3Nb 6Co 2Ti',
//     aliases: ['40Ni Refinery Turnings', …],   spellings that mean this grade
//     lineIds: ['<po line id>', …] }             one-off exceptions, see resolveGrade
//
// Nothing about a grade is written onto contracts or stock lots. A lot carries a
// SNAPSHOT of its contract's product lines, so a grade stored there would go stale the
// moment anyone re-mapped a spelling. Resolving live from the registry means a re-map
// moves every past lot at once, on IMS and GIS alike.

// ── Elements ─────────────────────────────────────────────────────────────────
export const ELEMENTS = ['Ni', 'Cr', 'Mo', 'Co', 'Nb', 'Ta', 'Ti', 'Al', 'Fe', 'Cu', 'Mn',
    'Si', 'Sn', 'Zr', 'Hf', 'Mg', 'Ca', 'W', 'V', 'B', 'C', 'S', 'P', 'N'];
const EL = new Map(ELEMENTS.map(e => [e.toLowerCase(), e]));
EL.set('cb', 'Nb');   // columbium, the American name for niobium ("2.25Cb")

// Assays and certificates spell elements out as often as they abbreviate them. Longer
// names first, so "chromium" is not half-eaten by "chrome".
const ELEMENT_NAMES = [
    ['chromium', 'Cr'], ['chrome', 'Cr'], ['nickel', 'Ni'], ['molybdenum', 'Mo'],
    ['cobalt', 'Co'], ['niobium', 'Nb'], ['columbium', 'Nb'], ['tantalum', 'Ta'],
    ['titanium', 'Ti'], ['titan', 'Ti'], ['aluminium', 'Al'], ['aluminum', 'Al'],
    ['iron', 'Fe'], ['copper', 'Cu'], ['manganese', 'Mn'], ['silicon', 'Si'], ['tin', 'Sn'],
    ['zirconium', 'Zr'], ['hafnium', 'Hf'], ['magnesium', 'Mg'], ['tungsten', 'W'],
    ['wolfram', 'W'], ['vanadium', 'V'], ['boron', 'B'], ['carbon', 'C'], ['sulphur', 'S'],
    ['sulfur', 'S'], ['phosphorus', 'P'], ['phosphor', 'P'],
];

// Typed on a Russian keyboard layout: these Cyrillic letters are pixel-identical to Latin
// ones and turn up mid-word in real rows ("13.26Сr" carries a Cyrillic С).
const CYR = 'СРТОАВЕМНКХасреоху';
const LAT = 'CPTOABEMHKXacpeoxy';
export const deCyrillic = (s) => String(s ?? '').replace(/[Ѐ-ӿ]/g, ch => {
    const i = CYR.indexOf(ch);
    return i === -1 ? ch : LAT[i];
});

const num = (s) => {
    let t = String(s).replace(',', '.');
    // ".76Ni", ".12S" — a certificate figure written without its leading zero.
    if (t.startsWith('.')) t = `0${t}`;
    // "010S", "022Nb", "01Ta": a certificate figure that lost its decimal separator.
    // No assay reads 10% sulphur, 22% niobium or 1% tantalum on a tin granule line.
    if (/^0\d+$/.test(t)) t = `0.${t.slice(1)}`;
    return parseFloat(t);
};

/**
 * Chemistry out of free text → { Ni: 42, Cr: 12, … }. Reads both the way descriptions
 * are typed ("42Ni 12Cr 3Mo") and the way certificates are ("Ni min 42%, Cu max 0.5%",
 * "W>3 Co>2,5"). An empty object means no assay was found — never a guess.
 *
 * Symbol-first figures are taken first and cut out, because in
 * "3.5Mo W>3 Co>2,5" a number-first scan would read the "3 Co" across the gap and give
 * cobalt the tungsten figure.
 */
export const parseAssay = (text) => {
    if (!text) return {};
    let s = deCyrillic(text);
    /* A capital O typed for a zero: "O.37Cu" is 0.37% copper, and read as written it
       became 37% — enough to put a lot in the wrong grade and to answer a Cu search
       with it. Only where an O sits directly on a decimal point, which no element
       symbol ever does. */
    s = s.replace(/\bO(?=[.,]\d)/gi, '0');
    for (const [name, sym] of ELEMENT_NAMES) s = s.replace(new RegExp(`\\b${name}\\b`, 'gi'), sym);

    const out = {};
    const put = (rawSym, rawNum) => {
        const sym = EL.get(String(rawSym).toLowerCase());
        const v = num(rawNum);
        if (!sym || !Number.isFinite(v) || v < 0 || v > 100) return false;
        if (!(sym in out)) out[sym] = v;
        return true;
    };

    // "Ni min 42%" · "Cu max 0,5 %" · "W>3" · "Ni: 42" — only with a % or a comparator,
    // otherwise "Ti 6-4 Powder" would read as 6% titanium.
    s = s.replace(
        /\b([A-Za-z]{1,2})(?![A-Za-z])\s*(min(?:imum)?|max(?:imum)?)?\.?\s*(>=|<=|≥|≤|>|<|=|:|~)?\s*([.,]\d+|\d+(?:[.,]\d+)?)\s*(%)?/g,
        (m, sym, minmax, op, n, pct) => ((minmax || op || pct) && put(sym, n) ? ' ' : m));

    // "42Ni" · "1,88C" · "51 Ni" — the symbol must not run on into a word ("4 Powder").
    s.replace(/([.,]\d+|\d+(?:[.,]\d+)?)\s*%?\s*([A-Za-z]{1,2})(?![A-Za-z])/g, (m, n, sym) => { put(sym, n); return m; });
    return out;
};

export const hasAssay = (a) => !!a && Object.keys(a).length > 0;

const fmt = (n) => String(Math.round(n * 100) / 100);

/** { Ni: 42, Cr: 12 } → "42Ni 12Cr", in a fixed element order so two lots line up. */
export const formatAssay = (a) =>
    ELEMENTS.filter(e => a && Number.isFinite(a[e])).map(e => `${fmt(a[e])}${e}`).join(' ');

/**
 * A lot's chemistry: its own recorded analysis first (from the certificate, typed or
 * read by the document reader), else whatever assay its description carries. `source`
 * says which, because "from the description" is the PO's nominal figure, not a
 * measurement of this lot.
 */
export const assayOf = (lot, descriptionText = '') => {
    const fromAnalysis = parseAssay(lot?.analysis);
    if (hasAssay(fromAnalysis)) return { assay: fromAnalysis, source: 'analysis' };
    const fromText = parseAssay(descriptionText);
    if (hasAssay(fromText)) return { assay: fromText, source: 'description' };
    return { assay: {}, source: null };
};

/** Per element, the lowest and highest figure across several assays. */
export const assayRange = (assays = []) => {
    const out = {};
    assays.forEach(a => Object.entries(a || {}).forEach(([e, v]) => {
        if (!Number.isFinite(v)) return;
        const r = out[e] || (out[e] = { min: v, max: v });
        r.min = Math.min(r.min, v);
        r.max = Math.max(r.max, v);
    }));
    return out;
};

/** { Sn: { min: 3.2, max: 5.6 } } → "3.2–5.6Sn" */
export const formatRange = (range) =>
    ELEMENTS.filter(e => range && range[e]).map(e => {
        const { min, max } = range[e];
        return min === max ? `${fmt(min)}${e}` : `${fmt(min)}–${fmt(max)}${e}`;
    }).join(' ');

// ── The registry ─────────────────────────────────────────────────────────────

/**
 * How a spelling is matched: blind to case, spacing, decimal commas and keyboard
 * layout — "IN 718 Turnings (51Ni 21Cr 3Mo)" and "in 718 turnings (51Ni21Cr 3Mo)" are
 * one alias. Deliberately NOT blind to word order or to the figures: a looser key is
 * how "30Ni 18Cr 2Mo" and "40Ni 16Cr 3.5Mo" would collapse into one grade.
 */
export const aliasKey = (description) =>
    deCyrillic(description).toLowerCase().replace(/,/g, '.').replace(/\s+/g, '');

export const buildGradeIndex = (grades = []) => {
    const byAlias = new Map(), byLine = new Map(), byId = new Map();
    for (const g of grades) {
        if (!g || g.deleted) continue;
        byId.set(g.id, g);
        (g.aliases || []).forEach(a => { const k = aliasKey(a); if (k) byAlias.set(k, g); });
        (g.lineIds || []).forEach(id => byLine.set(id, g));
    }
    return { byAlias, byLine, byId };
};

/**
 * The grade a piece of material belongs to. An explicit PO-line assignment wins over
 * the spelling, because it exists precisely for the line that is spelled like one
 * grade and is really another. No match is a valid answer — unclassified material stays
 * exactly as it was.
 */
export const resolveGrade = (index, { description, lineId } = {}) => {
    if (!index) return null;
    return (lineId && index.byLine.get(lineId)) || (description && index.byAlias.get(aliasKey(description))) || null;
};

const copy = (g) => ({ ...g, aliases: [...(g.aliases || [])], lineIds: [...(g.lineIds || [])] });

export const findGradeByName = (grades, name) => {
    const k = String(name ?? '').trim().toLowerCase();
    return k ? (grades || []).find(g => !g.deleted && String(g.name).trim().toLowerCase() === k) || null : null;
};

export const makeGrade = (id, { name, spec = '' }) =>
    ({ id, name: String(name ?? '').trim(), spec: String(spec ?? '').trim(), aliases: [], lineIds: [], deleted: false });

/**
 * Give these spellings to one grade. A spelling belongs to exactly one grade, so it is
 * taken off whichever grade held it before. Returns only the grades that changed, ready
 * to be written.
 */
export const assignAliases = (grades, targetId, spellings = []) => {
    const keys = new Set(spellings.map(aliasKey).filter(Boolean));
    const changed = new Map();
    for (const g of grades) {
        if (g.deleted || g.id === targetId) continue;
        const kept = (g.aliases || []).filter(a => !keys.has(aliasKey(a)));
        if (kept.length !== (g.aliases || []).length) changed.set(g.id, { ...copy(g), aliases: kept });
    }
    const target = grades.find(g => g.id === targetId);
    if (target) {
        const have = new Set((target.aliases || []).map(aliasKey));
        const add = [];
        for (const s of spellings) {
            const k = aliasKey(s);
            if (!k || have.has(k)) continue;
            have.add(k);
            add.push(String(s).trim());
        }
        if (add.length) changed.set(target.id, { ...copy(target), aliases: [...(target.aliases || []), ...add] });
    }
    return [...changed.values()];
};

/**
 * Set the grade of one PO line from its dropdown.
 *
 *   spelling unclaimed          → it becomes an alias, so next month's line fills itself
 *   spelling already this grade → nothing to store; it resolves already
 *   spelling means another grade→ this line is recorded as the exception (lineIds)
 *   targetId null               → the line's explicit assignment is cleared
 *
 * Returns only the grades that changed.
 */
export const assignGradeToLine = (grades, targetId, { lineId, description } = {}) => {
    if (!lineId) return [];
    const changed = new Map();
    const latest = (id) => changed.get(id) || grades.find(g => g.id === id);

    for (const g of grades) {
        if (!g.deleted && (g.lineIds || []).includes(lineId)) {
            changed.set(g.id, { ...copy(g), lineIds: g.lineIds.filter(x => x !== lineId) });
        }
    }
    if (!targetId) return [...changed.values()];

    const target = latest(targetId);
    if (!target || target.deleted) return [...changed.values()];
    const owner = aliasKey(description) ? buildGradeIndex(grades).byAlias.get(aliasKey(description)) : null;

    if (!owner && aliasKey(description)) {
        changed.set(target.id, { ...copy(target), aliases: [...(target.aliases || []), String(description).trim()] });
    } else if (!owner || owner.id !== targetId) {
        changed.set(target.id, { ...copy(target), lineIds: [...(target.lineIds || []).filter(x => x !== lineId), lineId] });
    }
    return [...changed.values()];
};

// ── Suggesting a grade for a spelling nobody has declared yet ────────────────
//
// resolveGrade only knows a spelling it has seen EXACTLY. Next month's PO arrives as
// "IN 718 Chips (51Ni 21Cr 3Mo)" when the registry holds "IN 718 Chips", or as
// "41.6Ni 12.2Cr 3.1Mo 2.8Nb 5.9Co 2.1Ti" for a grade declared as 42Ni 12Cr 3Mo 3Nb 6Co
// 2Ti — and the Grade box sits empty. A suggestion closes that gap. It is only ever
// offered, never applied: one click takes it, and taking it teaches the registry the new
// spelling, so the same text resolves by itself from then on.

// A name with its bracket note set aside: "(51Ni 21Cr 3Mo)", "(300824-1)".
const nameFold = (s) => aliasKey(String(s ?? '').replace(/\([^)]*\)/g, ' '));
const MAJOR = 1;      // below 1% an element is a trace and does not decide a grade
const DEFINING = 5;   // at 5% or more, an element the other side lacks means another alloy
const tolFor = (v) => Math.max(1.5, v * 0.1);

/**
 * What each grade looks like, built once per registry snapshot rather than once per
 * line: its name and spellings folded, and the chemistry envelope of its nominal spec
 * together with every spelling that carries an assay. A grade declared by merging
 * twenty ingot spellings has no spec, but its twenty assays ARE its spec.
 */
export const buildGradeProfiles = (grades) => (grades || []).filter(g => !g.deleted).map(g => {
    const assays = [parseAssay(g.spec), ...(g.aliases || []).map(parseAssay)].filter(hasAssay);
    const range = assayRange(assays);
    return {
        grade: g,
        names: new Set([g.name, ...(g.aliases || [])].map(nameFold).filter(Boolean)),
        range,
        majors: Object.keys(range).filter(e => range[e].max >= MAJOR),
        // Present at 5%+ in EVERY assay of the grade: what the grade is made of.
        defining: Object.keys(range).filter(e => range[e].min >= DEFINING
            && assays.every(x => Number.isFinite(x[e]))),
    };
});

/**
 * The grade a new spelling most likely is → { grade, reason: 'name' | 'chemistry' }, or
 * null when nothing fits well enough to offer. Name first (the same material with a
 * different note), then chemistry: at least two major elements in common, every one of
 * them within tolerance of the grade's envelope, nothing major on either side that the
 * other lacks. Of the grades that fit, the closest.
 */
export const suggestGrade = (profiles, description) => {
    if (!profiles?.length || !String(description ?? '').trim()) return null;

    const fold = nameFold(description);
    const byName = fold ? profiles.find(p => p.names.has(fold)) : null;
    if (byName) return { grade: byName.grade, reason: 'name' };

    const a = parseAssay(description);
    const aMajors = Object.keys(a).filter(e => a[e] >= MAJOR);
    if (aMajors.length < 2) return null;

    let best = null;
    for (const p of profiles) {
        if (!p.majors.length) continue;
        if (aMajors.some(e => a[e] >= DEFINING && !p.range[e])) continue;
        if (p.defining.some(e => !Number.isFinite(a[e]))) continue;
        const shared = p.majors.filter(e => Number.isFinite(a[e]));
        if (shared.length < 2) continue;
        let score = 0;
        const fits = shared.every(e => {
            const { min, max } = p.range[e];
            const t = tolFor(max);
            if (a[e] < min - t || a[e] > max + t) return false;
            score += Math.abs(a[e] - (min + max) / 2) / t;
            return true;
        });
        if (!fits) continue;
        score /= shared.length;
        if (!best || score < best.score) best = { grade: p.grade, score };
    }
    return best ? { grade: best.grade, reason: 'chemistry' } : null;
};

// ── Specs: what each lot actually is, under its grade ────────────────────────
//
// A grade is the trading category — a PO buys 60 MT of 40Ni Turnings, and stock value
// and average cost are asked of 40Ni. But the 60 MT arrives as three 20 MT lots, one at
// 43Ni 15Cr 3Mo 2Nb and one at 41Ni 12Cr 3Mo 1Nb, and a Ta ingot is "99%" or "UMZ". The
// SPEC is that second level: named by hand when it is a producer or a purity, read from
// the lot's analysis when there is one, from the description's own figures when not,
// and the material's name when there is nothing to read at all.

/** The lot's material name, as its own PO line spells it. */
export const lotName = (lot, fallback = '') =>
    lot?.productsData?.find(p => p.id === (lot.descriptionId || lot.description))?.description
    || lot?.descriptionName || fallback;

/**
 * A spec label out of an assay: the elements that make the alloy (5% or more), to the
 * whole percent — "43Ni 15Cr" — because that is how a lot is spoken of, and 42.6 vs 43.1
 * is two lots of one spec, not two specs. A near-pure metal keeps its figure ("99.95Ta");
 * an assay with nothing at 5% names its two largest figures.
 */
export const specFromAssay = (assay) => {
    if (!hasAssay(assay)) return '';
    const present = ELEMENTS.filter(e => Number.isFinite(assay[e]));
    let named = present.filter(e => assay[e] >= DEFINING);
    if (!named.length) {
        const top = new Set([...present].sort((a, b) => assay[b] - assay[a]).slice(0, 2));
        named = present.filter(e => top.has(e));
    }
    return named.map(e => {
        const v = assay[e];
        return `${v >= 90 || v < DEFINING ? fmt(v) : Math.round(v)}${e}`;
    }).join(' ');
};

/** A lot's spec → { label, source: 'spec' | 'analysis' | 'description' | 'name' }. */
export const lotSpec = (lot, descriptionText = '') => {
    const typed = String(lot?.spec ?? '').trim();
    if (typed) return { label: typed, source: 'spec' };
    const { assay, source } = assayOf(lot, descriptionText);
    const derived = specFromAssay(assay);
    if (derived) return { label: derived, source };
    return { label: String(descriptionText ?? '').trim() || '—', source: 'name' };
};

const lotQty = (lot) => {
    const f = parseFloat(lot?.finalqnty);
    return Number.isFinite(f) ? f : (parseFloat(lot?.qnty) || 0);
};

/**
 * One stock position — what is left of it (qnty, value) and the lots it was received as
 * — divided by spec and by the producer it came from (the contract's original supplier).
 *
 * Sales record the line, not the lot, so once part of a mixed line has shipped nobody
 * knows WHICH spec went. What is left is then shared out in proportion to what was
 * received of each, its value in proportion to what each cost, and the parts are marked
 * `estimated`. The shares always add back up to the position exactly — the same total
 * the Stocks table shows for the line.
 */
export const splitBySpec = ({ qnty = 0, value = 0, lots = [], description = '' } = {}) => {
    const q = Number(qnty) || 0;
    const v = Number(value) || 0;
    const parts = new Map();
    let recvQ = 0, recvV = 0;
    for (const lot of lots || []) {
        const lq = lotQty(lot);
        if (!(lq > 0)) continue;
        const { label, source } = lotSpec(lot, lotName(lot, description));
        const origin = lot?.originSupplier || '';
        const key = `${label}|${origin}`;
        const price = parseFloat(lot?.unitPrc);
        const lv = Number.isFinite(price) ? lq * price : 0;
        const p = parts.get(key) || { label, source, origin, received: 0, receivedValue: 0, lots: [] };
        p.received += lq;
        p.receivedValue += lv;
        p.lots.push(lot);
        parts.set(key, p);
        recvQ += lq;
        recvV += lv;
    }
    if (!parts.size) {
        const { label, source } = lotSpec({}, description);
        return [{ label, source, origin: '', received: q, receivedValue: v, lots: [], qnty: q, value: v, estimated: false }];
    }
    const list = [...parts.values()];
    const estimated = list.length > 1 && recvQ > q + 0.0005;
    return list.map(p => ({
        ...p,
        qnty: q * p.received / recvQ,
        value: recvV > 0 ? v * p.receivedValue / recvV : v * p.received / recvQ,
        estimated,
    }));
};

/**
 * A grade's stock by spec: every position under the grade split as above, then the same
 * spec from the same producer added up across lines, suppliers and warehouses. Largest
 * value first; specs with nothing left in stock are dropped.
 * `entries`: [{ qnty, value, lots, description, supplier }] — one per line.
 */
export const specBreakdown = (entries = [], { originName = (id) => id } = {}) => {
    const by = new Map();
    for (const en of entries || []) {
        for (const p of splitBySpec(en)) {
            const key = `${p.label}|${p.origin}`;
            const g = by.get(key) || {
                key, label: p.label, source: p.source, origin: p.origin,
                originName: p.origin ? (originName(p.origin) || p.origin) : '',
                qnty: 0, value: 0, suppliers: new Set(), spellings: new Set(), lots: [], estimated: false,
            };
            g.qnty += p.qnty;
            g.value += p.value;
            if (en.supplier) g.suppliers.add(en.supplier);
            if (en.description) g.spellings.add(en.description);
            g.lots.push(...p.lots);
            g.estimated = g.estimated || p.estimated;
            if (p.source === 'spec') g.source = 'spec';
            by.set(key, g);
        }
    }
    return [...by.values()]
        .filter(g => g.qnty > 0.0005)
        .map(g => ({ ...g, suppliers: [...g.suppliers], spellings: [...g.spellings], avg: g.qnty > 0 ? g.value / g.qnty : 0 }))
        .sort((a, b) => b.value - a.value);
};

// ── Find by spec ─────────────────────────────────────────────────────────────

/**
 * "Ni 28-33 Cr 15-20 Ti>0 Sn" → a constraint per element. Forms: a range (28-33,
 * 28–33, 28 to 33), a bound (>0, >=12, <1.5), a single figure (30, meaning 29.5–30.5),
 * or a bare symbol (the element is present at all). Returns null when nothing in the
 * query names an element, so the caller can treat it as no filter.
 */
export const parseSpecQuery = (query) => {
    const s = deCyrillic(query).replace(/,/g, '.');
    const re = /\b([A-Za-z]{1,2})(?![A-Za-z])\s*(?:(>=|<=|≥|≤|>|<)\s*(\d+(?:\.\d+)?)|(\d+(?:\.\d+)?)\s*(?:-|–|—|to|\.\.)\s*(\d+(?:\.\d+)?)|(\d+(?:\.\d+)?))?/g;
    const spec = {};
    let m;
    while ((m = re.exec(s))) {
        const sym = EL.get(m[1].toLowerCase());
        if (!sym) continue;
        const [, , op, opNum, lo, hi, exact] = m;
        if (op) {
            const n = parseFloat(opNum);
            spec[sym] = op === '>' ? { min: n, minStrict: true }
                : (op === '>=' || op === '≥') ? { min: n }
                    : op === '<' ? { max: n, maxStrict: true } : { max: n };
        } else if (lo !== undefined) {
            const a = parseFloat(lo), b = parseFloat(hi);
            spec[sym] = { min: Math.min(a, b), max: Math.max(a, b) };
        } else if (exact !== undefined) {
            const n = parseFloat(exact);
            spec[sym] = { min: n - 0.5, max: n + 0.5 };
        } else {
            spec[sym] = {};
        }
    }
    return Object.keys(spec).length ? spec : null;
};

export const assayMatches = (assay, spec) => !!spec && Object.entries(spec).every(([el, c]) => {
    const v = assay?.[el];
    if (!Number.isFinite(v)) return false;
    if (c.min !== undefined && (c.minStrict ? !(v > c.min) : !(v >= c.min))) return false;
    if (c.max !== undefined && (c.maxStrict ? !(v < c.max) : !(v <= c.max))) return false;
    return true;
});

/** The parsed query read back, so the user sees what was understood: "Ni 28–33 · Ti >0". */
export const describeSpec = (spec) => !spec ? '' : ELEMENTS.filter(e => spec[e]).map(e => {
    const c = spec[e];
    if (c.min !== undefined && c.max !== undefined) return `${e} ${fmt(c.min)}–${fmt(c.max)}`;
    if (c.min !== undefined) return `${e} ${c.minStrict ? '>' : '≥'}${fmt(c.min)}`;
    if (c.max !== undefined) return `${e} ${c.maxStrict ? '<' : '≤'}${fmt(c.max)}`;
    return e;
}).join(' · ');
