// Pricing-formula math — transcribed VERBATIM from the web app's formulas tabs
// (fenicr.js:899, stainless.js:588, supperalloys.js:638 — the live blocks, not the
// commented legacy ones). Verified expression-by-expression 2026-07-06.

const n = (v: any) => {
  const x = parseFloat(v);
  return Number.isFinite(x) ? x : 0;
};

// The web rounds Fe to 2dp via toFixed(2) BEFORE using it in the price math —
// match that exactly so results agree to the cent even on >2dp inputs.
//
// SUBTRACTION ORDER IS LOAD-BEARING. Web writes `(100 - ni - cr - mo).toFixed(2)`
// (fenicr.js:899, stainless.js:588, supperalloys.js:638) — it subtracts each element
// from 100 one at a time. Summing the elements first and taking 100 − sum is the same
// number in real arithmetic but a DIFFERENT double: with ni/cr/mo = 8.505/18.005/0.505,
// the sequential form is 72.98500000000001 (→ 72.99) and the summed form is exactly
// 72.985 (→ 72.98, because toFixed rounds the tie down at that binary value). That cent
// then flows into the Fe term of both the cost and the sales price. The formulas page
// strips input to /[^0-9.]/ with no decimal cap (formulas/page.js:87), so 3dp assays are
// typeable and this is reachable. Reduce with `-`, never sum-then-subtract.
const feOf = (elements: number[]) =>
  Number(elements.reduce((acc, e) => acc - e, 100).toFixed(2));

export interface Field {
  key: string;
  label: string;
  scope: 'general' | 'tab';
  suffix?: string;
}

/**
 * The turnings discount — web fenicr.js:87-90 and stainless.js:96-99.
 *
 * It used to be a bare 0.92 / 0.9 in the source with nothing on screen saying so, so
 * the figure could not be checked or changed without a deploy (Zak, 2026-08-25). It
 * reads from the saved formula state now and falls back to the number that WAS
 * hard-coded, so existing data quotes exactly what it did before until someone edits
 * it. Stored as a PERCENT, hence the /100 at each call site.
 *
 * The fallback is per-side on FeNiCr (92 cost, 90 price) and a single 92 on
 * Stainless. That 92/90 split is why web passes a fallback per call rather than
 * using one constant — the two tabs have always disagreed, and preserving that is
 * the point.
 */
export const turnPct = (src: any, name: string, fallback: number): number => {
  const v = src?.[name];
  return v === '' || v === null || v === undefined || Number.isNaN(Number(v)) ? fallback : Number(v);
};

// ── FeNiCr ───────────────────────────────────────────────────────────────────
export function computeFenicr(value: any) {
  const f = value?.fenicr || {};
  const g = value?.general || {};
  const ni = n(f.ni), cr = n(f.cr), mo = n(f.mo);
  const fe = feOf([ni, cr, mo]);

  const cost =
    (ni * n(g.nilme) * n(f.formulaNiCost)) / 10000 +
    (cr * n(f.crPrice)) / 100 +
    (mo * n(f.moPrice)) / 100 +
    (fe * n(f.fePrice)) / 100;

  // Division grouping is web's, left to right (fenicr.js:906-909). `a/100*b/100`
  // and `(a/100)*(b/100)` agree mathematically but not in the last floating-point
  // bits, and these figures are read against the web page to the cent.
  const sales =
    (((ni * n(g.nilme)) / 100) * n(f.formulaNiPrice)) / 100 +
    (((cr / 100) * n(g.chargeCrLb) * n(g.mt) * n(f.crPriceArgus)) / 100) +
    (mo / 100) * ((n(g.MoOxideLb) * n(f.moPriceArgus) * n(g.mt)) / 100) +
    (fe * n(f.fePrice1)) / 100;

  const euro = n(g.euroRate);
  return {
    fe,
    cost,
    costTurnings: (cost * turnPct(f, 'turningsCost', 92)) / 100,
    costEuro: euro ? cost / euro : 0,
    sales,
    // FeNiCr sales turnings is x0.90 (fenicr.js:1101) — deliberately NOT the same
    // factor as the Stainless tab, which uses 0.92. Web is inconsistent between the
    // two tabs and this mirrors it exactly.
    salesTurnings: (sales * turnPct(f, 'turningsPrice', 90)) / 100,
    salesEuro: euro ? sales / euro : 0,
  };
}

// ── Stainless (same structure as FeNiCr) ──────────────────────────────────────
export function computeStainless(value: any) {
  const s = value?.stainless || {};
  const g = value?.general || {};
  const ni = n(s.ni), cr = n(s.cr), mo = n(s.mo);
  const fe = feOf([ni, cr, mo]);

  const cost =
    (ni * n(g.nilme) * n(s.formulaNiCost)) / 10000 +
    (cr * n(s.crPrice)) / 100 +
    (mo * n(s.moPrice)) / 100 +
    (fe * n(s.fePrice)) / 100;

  // Same left-to-right division grouping as web (stainless.js:595-598).
  const sales =
    (((ni * n(g.nilme)) / 100) * n(s.formulaNiPrice)) / 100 +
    (((cr / 100) * n(g.chargeCrLb) * n(g.mt) * n(s.crPriceArgus)) / 100) +
    (mo / 100) * ((n(g.MoOxideLb) * n(s.moPriceArgus) * n(g.mt)) / 100) +
    (fe * n(s.fePrice1)) / 100;

  const euro = n(g.euroRate);
  return {
    fe,
    cost,
    costTurnings: (cost * turnPct(s, 'turningsCost', 92)) / 100,
    costEuro: euro ? cost / euro : 0,
    sales,
    // Stainless sales turnings is x0.92 on web (stainless.js:1028), NOT the 0.90
    // the FeNiCr tab uses. Mobile applied 0.90 here, so every Stainless sales
    // turnings figure read 2.174% low against the web page.
    salesTurnings: (sales * turnPct(s, 'turningsPrice', 92)) / 100,
    salesEuro: euro ? sales / euro : 0,
  };
}

// ── SuperAlloys — base solids price × Ints formulas (cost + sales sections) ────
const SA_ELEMENTS = ['ni', 'cr', 'mo', 'nb', 'co', 'w', 'hf', 'ta'] as const;
export function computeSuperalloys(value: any) {
  const s = value?.supperalloys || {};
  const g = value?.general || {};
  const el: Record<string, number> = {};
  SA_ELEMENTS.forEach((e) => (el[e] = n(s[e])));
  // SA_ELEMENTS is in web's own subtraction order (supperalloys.js:638-640).
  const fe = feOf(SA_ELEMENTS.map((e) => el[e]));

  const mt = n(g.mt);
  const base =
    (el.ni * (mt ? n(g.nilme) / mt : 0)) / 100 +
    (el.cr * n(s.crPrice)) / 100 +
    (el.mo * n(s.moPrice)) / 100 +
    (el.nb * n(s.nbPrice)) / 100 +
    (el.co * n(s.coPrice)) / 100 +
    (el.w * n(s.wPrice)) / 100 +
    (el.hf * n(s.hfPrice)) / 100 +
    (el.ta * n(s.taPrice)) / 100;

  // Web derives both sections from the base: × formulaIntsCost / formulaIntsPrice.
  const euro = n(g.euroRate);
  const cost = (base * n(s.formulaIntsCost)) / 100;
  const price = (base * n(s.formulaIntsPrice)) / 100;
  return {
    fe,
    base,
    cost,
    costPerMT: cost * mt,
    costEuro: euro ? cost / euro : 0,
    price,
    pricePerMT: price * mt,
    priceEuro: euro ? price / euro : 0,
  };
}

// ── field definitions per tab ─────────────────────────────────────────────────
export const GENERAL_FIELDS: Field[] = [
  { key: 'nilme', label: 'Ni LME', scope: 'general', suffix: '$' },
  { key: 'mt', label: 'MT', scope: 'general' },
  { key: 'euroRate', label: 'EUR rate', scope: 'general' },
  { key: 'chargeCrLb', label: 'Charge Cr / lb', scope: 'general' },
  { key: 'MoOxideLb', label: 'Mo Oxide / lb', scope: 'general' },
];

export const FENICR_FIELDS: Field[] = [
  { key: 'ni', label: 'Ni %', scope: 'tab' },
  { key: 'cr', label: 'Cr %', scope: 'tab' },
  { key: 'mo', label: 'Mo %', scope: 'tab' },
  { key: 'formulaNiCost', label: 'Formula × Ni (cost) %', scope: 'tab' },
  { key: 'crPrice', label: 'Cr price', scope: 'tab' },
  { key: 'moPrice', label: 'Mo price', scope: 'tab' },
  { key: 'fePrice', label: 'Fe price', scope: 'tab' },
  { key: 'formulaNiPrice', label: 'Formula × Ni (sales) %', scope: 'tab' },
  { key: 'crPriceArgus', label: 'Cr price (Argus) %', scope: 'tab' },
  { key: 'moPriceArgus', label: 'Mo price (Argus) %', scope: 'tab' },
  { key: 'fePrice1', label: 'Fe price (sales)', scope: 'tab' },
];

// Stainless shares FeNiCr's field set (different namespace).
export const STAINLESS_FIELDS = FENICR_FIELDS;

export const SUPERALLOYS_FIELDS: Field[] = [
  { key: 'ni', label: 'Ni %', scope: 'tab' },
  { key: 'cr', label: 'Cr %', scope: 'tab' },
  { key: 'mo', label: 'Mo %', scope: 'tab' },
  { key: 'nb', label: 'Nb %', scope: 'tab' },
  { key: 'co', label: 'Co %', scope: 'tab' },
  { key: 'w', label: 'W %', scope: 'tab' },
  { key: 'hf', label: 'Hf %', scope: 'tab' },
  { key: 'ta', label: 'Ta %', scope: 'tab' },
  { key: 'crPrice', label: 'Cr price', scope: 'tab' },
  { key: 'moPrice', label: 'Mo price', scope: 'tab' },
  { key: 'nbPrice', label: 'Nb price', scope: 'tab' },
  { key: 'coPrice', label: 'Co price', scope: 'tab' },
  { key: 'wPrice', label: 'W price', scope: 'tab' },
  { key: 'hfPrice', label: 'Hf price', scope: 'tab' },
  { key: 'taPrice', label: 'Ta price', scope: 'tab' },
  { key: 'formulaIntsCost', label: 'Formula Ints (cost) %', scope: 'tab' },
  { key: 'formulaIntsPrice', label: 'Formula Ints (sales) %', scope: 'tab' },
];

export type FormulaTab = 'fenicr' | 'stainless' | 'supperalloys';
