// Canvas charts (chart.js) cannot parse 'var(--x)' — the canvas API needs real
// colour strings. These helpers resolve the CURRENT value of a theme token at
// chart-config build time, so charts follow the active theme and mode.
//
// The chart pages call useTheme() so they re-render on a theme/mode switch,
// which rebuilds the configs through these helpers with fresh values.

export const cssVar = (name, fallback) => {
  if (typeof window === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
};

// rgba() from a token's RGB-triplet twin, e.g. cssVarRgba('--rock-blue-rgb', 0.2)
export const cssVarRgba = (name, alpha, fallback) => {
  if (typeof window === 'undefined') return fallback;
  const trip = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return trip ? `rgba(${trip}, ${alpha})` : fallback;
};

/* ── Chart series palettes ────────────────────────────────────────────────────
 * Design-audit note: these are the ONE place in the app where colour is
 * deliberately NOT themed. A series palette has to keep its own hue spacing to
 * stay distinguishable — re-pointing it at the brand tokens would collapse ten
 * series into ten shades of one colour. They were previously scattered inline
 * through dashboard/page.js, which made "is this a themed colour or a mistake?"
 * unanswerable by a scan. Centralising them here makes the C4 gate exhaustive:
 * a colour literal anywhere else is now unambiguously a defect.
 */
export const RANKING_PALETTE = [
  '#38BDF8', '#22B0F0', '#7DD3F8', '#4F46E5',
  '#7C6FE0', '#1477C0', '#2D3FB8', '#6366F1',
  '#0A5EA8', '#8B7FE8',
];

// Single-series accents used by individual chart cards.
export const CHART_ACCENT = {
  costs: '#f43f5e',
  storage: '#0ea5e9',
};

/* ── Themed ranking ramp ──────────────────────────────────────────────────────
 * For the HTML ranking bars (Contracts / Consignees / Expenses by Type /
 * Most-Sold Material). Unlike the fixed palettes above, these rows are already
 * labelled by name, so colour identifies nothing — it is decoration, and
 * decoration has to follow the theme.
 *
 * The ramp is a SHADE ladder, not a hue fan: it walks lightness from deep to
 * soft while hue barely moves, so the whole set reads as one colour in several
 * strengths. It used to fan hue across ±34°, which at the violet brand ran from
 * azure (214°) to magenta (282°) — the top bar of every ranking card came out a
 * blue that exists nowhere else in the app. Bar LENGTH already carries the
 * ranking, so the hue spread bought no encoding and cost the colour scheme.
 *
 * The contrast fit is not optional. Each bar carries its value in white text, so
 * a bar has to stay dark enough to read on. Rather than pick a lightness and
 * darken it until it complies, the ladder is anchored to the lightest value this
 * brand hue CAN carry white text at, and grows downward from there — so the
 * inherently light presets (Mustard, Moss) still get a real ladder instead of
 * collapsing into one clamped shade.
 */
const hexToHsl = (hex) => {
  const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(String(hex).trim());
  if (!m) return null;
  const [r, g, b] = [1, 2, 3].map((i) => parseInt(m[i], 16) / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  const l = (max + min) / 2;
  if (!d) return { h: 0, s: 0, l: l * 100 };
  const s = d / (1 - Math.abs(2 * l - 1));
  let h;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return { h: (h * 60 + 360) % 360, s: s * 100, l: l * 100 };
};

const hslToRgbArr = (h, s, l) => {
  h = ((h % 360) + 360) % 360; s /= 100; l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const t = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x]
    : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return t.map((v) => Math.round((v + m) * 255));
};

const lum = ([r, g, b]) => {
  const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const contrastWhite = (rgb) => 1.05 / (lum(rgb) + 0.05);
const toHex = ([r, g, b]) => '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');

// Lightest this hue can go while white text on it still clears WCAG AA.
const readableCeiling = (h, s) => {
  let l = 66;
  while (l > 6 && contrastWhite(hslToRgbArr(h, s, l)) < 4.5) l -= 1;
  return l;
};

// Saturation is eased off as the ladder lightens, so the pale end reads as a
// tint rather than a neon. These are the two ends of that easing.
const SAT_DEEP = 0.90;
const SAT_PALE = 0.72;

export const brandRamp = (n, fallback = '#6D5CE0') => {
  const base = hexToHsl(cssVar('--endeavour', fallback)) || hexToHsl(fallback);
  const count = Math.max(1, n | 0);
  // Fit the ceiling at the ramp's WEAKEST saturation — that is the entry closest
  // to failing, so pinning to it keeps the pale end off the contrast guard and
  // stops the last rows collapsing onto the same shade.
  const hi = readableCeiling(base.h, base.s * SAT_PALE);
  const span = Math.min(16, Math.max(8, hi * 0.3));
  const lo = Math.max(6, hi - span);

  return Array.from({ length: count }, (_, i) => {
    const t = count === 1 ? 0 : i / (count - 1);
    // Hue drifts ~12° in total: enough that neighbours aren't identical, far too
    // little to leave the brand family.
    const h = base.h - 5 + t * 12;
    const s = Math.min(88, Math.max(30, base.s * (SAT_DEEP - (SAT_DEEP - SAT_PALE) * t)));
    // Row 0 is the largest value, so the ladder runs deep → soft.
    let l = lo + (hi - lo) * t;
    let rgb = hslToRgbArr(h, s, l);
    let guard = 100;   // safety net; the ceiling fit should mean this never fires
    while (contrastWhite(rgb) < 4.5 && guard-- > 0 && l > 2) {
      l -= 1;
      rgb = hslToRgbArr(h, s, l);
    }
    return toHex(rgb);
  });
};
