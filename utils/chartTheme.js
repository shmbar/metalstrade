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
