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
