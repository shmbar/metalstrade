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
 * The ramp rotates hue around the CURRENT brand and walks lightness, so every
 * bar is visibly different while the whole set stays in the theme's family.
 *
 * The contrast fit is not optional. Each bar carries its value in white text, so
 * a bar has to stay dark enough to read on. At brand hues that are inherently
 * light — the Mustard and Moss presets — an un-fitted ramp puts white on pale
 * yellow. Every entry is darkened until white clears WCAG AA.
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

export const brandRamp = (n, fallback = '#6D5CE0') => {
  const base = hexToHsl(cssVar('--endeavour', fallback)) || hexToHsl(fallback);
  const count = Math.max(1, n | 0);
  return Array.from({ length: count }, (_, i) => {
    // Fan the hue across a ±34° arc and dip the lightness toward the middle of
    // the list, so neighbours never land on the same colour.
    const t = count === 1 ? 0 : i / (count - 1);
    const h = base.h - 34 + t * 68;
    const s = Math.min(92, Math.max(38, base.s * (0.78 + 0.30 * (1 - t))));
    let l = 58 - Math.sin(t * Math.PI) * 12;
    let rgb = hslToRgbArr(h, s, l);
    let guard = 100;
    while (contrastWhite(rgb) < 4.5 && guard-- > 0 && l > 2) {
      l -= 1;
      rgb = hslToRgbArr(h, s, l);
    }
    return toHex(rgb);
  });
};
