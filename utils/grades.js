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
        /\b([A-Za-z]{1,2})(?![A-Za-z])\s*(min(?:imum)?|max(?:imum)?)?\.?\s*(>=|<=|≥|≤|>|<|=|:|~)?\s*(\d+(?:[.,]\d+)?)\s*(%)?/g,
        (m, sym, minmax, op, n, pct) => ((minmax || op || pct) && put(sym, n) ? ' ' : m));

    // "42Ni" · "1,88C" · "51 Ni" — the symbol must not run on into a word ("4 Powder").
    s.replace(/(\d+(?:[.,]\d+)?)\s*%?\s*([A-Za-z]{1,2})(?![A-Za-z])/g, (m, n, sym) => { put(sym, n); return m; });
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
