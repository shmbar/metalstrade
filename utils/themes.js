// Personal colour themes + light/dark mode.
//
// Two independent dimensions, combined freely (Telegram model):
//   - theme (hue): 16 presets; every chrome token derives from one hue via a
//     fixed signature (hue offset / saturation / lightness) measured from the
//     original blue palette.
//   - mode: 'light' | 'dark'. Dark keeps the chosen hue but flips the whole
//     base: hue-tinted dark surfaces, light text, dark status-chip variants.
//
// 'ocean' + light is the original palette: applying it removes all inline
// overrides so the globals.css stylesheet values apply untouched (pixel-exact).
//
// Contrast: token lightness is auto-adjusted until WCAG AA (4.5:1) holds for
// the pairings that matter (white on primary; text tokens on dark surfaces),
// so any future preset is safe by construction.

const LIGHT_SIGNATURE = {
  endeavour: { dh: 0, s: 97, l: 35 },
  'chathams-blue': { dh: 11, s: 77, l: 27 },
  'port-gore': { dh: 38, s: 35, l: 23 },
  bunting: { dh: 44, s: 60, l: 19 },
  'rock-blue': { dh: 7, s: 38, l: 73 },
  'regent-gray': { dh: 20, s: 17, l: 58 },
  selago: { dh: 10, s: 74, l: 96 },
  'primary-bright': { dh: 13, s: 71, l: 52 },
  'surface-header': { dh: 3, s: 100, l: 93 },
  'surface-pill': { dh: 9, s: 100, l: 99 },
  'border-cell': { dh: 2, s: 59, l: 90 },
  'border-divider': { dh: 0, s: 82, l: 85 },
};

// Same tokens, dark values. Text-role tokens (port-gore, chathams-blue, …)
// become light; surface-role tokens become hue-tinted darks.
const DARK_SIGNATURE = {
  endeavour: { dh: 0, s: 72, l: 48 },
  'chathams-blue': { dh: 11, s: 50, l: 72 },
  'port-gore': { dh: 38, s: 20, l: 88 },
  bunting: { dh: 44, s: 25, l: 84 },
  'rock-blue': { dh: 7, s: 26, l: 58 },
  'regent-gray': { dh: 20, s: 10, l: 64 },
  selago: { dh: 10, s: 22, l: 19 },
  'primary-bright': { dh: 13, s: 78, l: 62 },
  'surface-header': { dh: 3, s: 26, l: 17 },
  'surface-pill': { dh: 9, s: 20, l: 13 },
  'border-cell': { dh: 2, s: 16, l: 24 },
  'border-divider': { dh: 0, s: 18, l: 30 },
};

// Neutral base layer, dark values — tinted with the theme hue (Telegram-style),
// damped by the theme's sat so Graphite/Stone go properly grey.
const DARK_NEUTRALS = {
  'surface-card': { s: 14, l: 11 },
  'surface-base': { s: 16, l: 8 },
  'surface-muted': { s: 13, l: 16 },
  'border-neutral': { s: 12, l: 24 },
  'border-neutral-strong': { s: 10, l: 33 },
  'text-strong': { s: 12, l: 92 },
  'text-mid': { s: 8, l: 66 },
  'text-faint': { s: 6, l: 48 },
};
const NEUTRAL_RGB_TOKENS = ['surface-card', 'surface-base'];

// Status system, dark values — hue-independent (green must stay green).
const DARK_STATUS = {
  'ok-soft': '#12291b', 'ok-bg': '#143521', 'ok-border': '#1e5e34',
  'ok-text': '#4ade80', 'ok-strong': '#86efac',
  'danger-soft': '#2e1416', 'danger-bg': '#3b191c', 'danger-border': '#7a2e2e',
  'danger-text': '#f87171', 'danger-strong': '#fca5a5',
  'warn-soft': '#2a2110', 'warn-bg': '#382c13', 'warn-border': '#7d5c17',
  'warn-text': '#fbbf24', 'warn-strong': '#fde68a',
  'violet-soft': '#1f1a30', 'violet-bg': '#282045', 'violet-border': '#453781',
  'violet-text': '#a78bfa', 'violet-strong': '#c4b5fd',
  'pink-soft': '#2a1520', 'pink-bg': '#38182a',
  'pink-text': '#f472b6', 'pink-strong': '#f9a8d4',
};

export const THEMES = [
  { id: 'ocean', label: 'Ocean', hue: 205 },
  { id: 'sky', label: 'Sky', hue: 193 },
  { id: 'teal', label: 'Teal', hue: 175, sat: 0.9, darken: 2 },
  { id: 'emerald', label: 'Emerald', hue: 150, sat: 0.9, darken: 3 },
  { id: 'moss', label: 'Moss', hue: 115, sat: 0.85 },
  { id: 'mustard', label: 'Mustard', hue: 45, sat: 0.95 },
  { id: 'amber', label: 'Amber', hue: 32, sat: 0.95, darken: 3 },
  { id: 'copper', label: 'Copper', hue: 16, sat: 0.9 },
  { id: 'rose', label: 'Rose', hue: 340, sat: 0.85 },
  { id: 'plum', label: 'Plum', hue: 322, sat: 0.8 },
  { id: 'fuchsia', label: 'Fuchsia', hue: 300, sat: 0.85 },
  { id: 'violet', label: 'Violet', hue: 262, sat: 0.9 },
  { id: 'indigo', label: 'Indigo', hue: 231, sat: 0.9 },
  { id: 'steel', label: 'Steel', hue: 210, sat: 0.5 },
  { id: 'graphite', label: 'Graphite', hue: 215, sat: 0.14 },
  { id: 'stone', label: 'Stone', hue: 28, sat: 0.16 },
];

export const DEFAULT_THEME_ID = 'ocean';
export const DEFAULT_MODE = 'light';
export const THEME_STORAGE_KEY = 'ims-theme';

// ---------- colour math ----------
function hslToRgb(h, s, l) {
  h = ((h % 360) + 360) % 360;
  s /= 100;
  l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r, g, b;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return [r, g, b].map(v => Math.round((v + m) * 255));
}
const toHex = rgb => '#' + rgb.map(v => v.toString(16).padStart(2, '0')).join('');
const relLum = ([r, g, b]) => {
  const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const contrast = (a, b) => {
  const [x, y] = [relLum(a), relLum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};
const WHITE = [255, 255, 255];

// Nudge lightness until `pair(l)` reaches `target` contrast (or bounds hit).
function fitL(h, s, l, otherRgb, target, step) {
  let rgb = hslToRgb(h, s, l);
  let guard = 40;
  while (contrast(rgb, otherRgb) < target && guard-- > 0) {
    l += step;
    if (l <= 2 || l >= 98) break;
    rgb = hslToRgb(h, s, l);
  }
  return { l, rgb };
}

// ---------- token derivation ----------
// -> { hex, rgb ('r, g, b'), channels ('H S% L%') } keyed by token name
export function deriveTokens(theme, mode = DEFAULT_MODE) {
  const sat = theme.sat ?? 1;
  const darken = theme.darken ?? 0;
  const dark = mode === 'dark';
  const SIG = dark ? DARK_SIGNATURE : LIGHT_SIGNATURE;
  const hex = {}, rgb = {}, channels = {};

  const put = (token, h, s, l, rgbArr) => {
    hex[token] = toHex(rgbArr);
    rgb[token] = rgbArr.join(', ');
    channels[token] = `${((h % 360) + 360) % 360} ${s}% ${Math.round(l)}%`;
  };

  // neutrals first (dark only needs them; light uses stylesheet defaults, but
  // deriving them anyway keeps the return shape uniform for shadcn mapping)
  for (const [token, sig] of Object.entries(DARK_NEUTRALS)) {
    if (dark) {
      const h = Math.round(theme.hue);
      const s = Math.round(sig.s * sat);
      put(token, h, s, sig.l, hslToRgb(h, s, sig.l));
    }
  }
  const darkCardRgb = dark ? hslToRgb(Math.round(theme.hue), Math.round(DARK_NEUTRALS['surface-card'].s * sat), DARK_NEUTRALS['surface-card'].l) : null;

  for (const [token, sig] of Object.entries(SIG)) {
    const h = Math.round(theme.hue + sig.dh);
    const s = Math.round(sig.s * sat);
    let l = sig.l - (!dark && (token === 'endeavour' || token === 'chathams-blue') ? darken : 0);
    let rgbArr = hslToRgb(h, s, l);
    // contrast guards
    if (token === 'endeavour') {
      ({ l, rgb: rgbArr } = fitL(h, s, l, WHITE, 4.5, -1)); // white button text
    } else if (dark && ['chathams-blue', 'port-gore', 'bunting', 'regent-gray'].includes(token)) {
      ({ l, rgb: rgbArr } = fitL(h, s, l, darkCardRgb, 4.5, +1)); // text on dark cards
    }
    put(token, h, s, l, rgbArr);
  }
  return { hex, rgb, channels };
}

// shadcn/Radix HSL-channel tokens (tailwind.config.js reads hsl(var(--x))).
const SHADCN_LIGHT = {
  '--primary': 'endeavour',
  '--ring': 'endeavour',
  '--accent': 'surface-header',
  '--accent-foreground': 'chathams-blue',
};
const SHADCN_DARK = {
  ...SHADCN_LIGHT,
  '--background': 'surface-base',
  '--foreground': 'text-strong',
  '--card': 'surface-card',
  '--card-foreground': 'text-strong',
  '--popover': 'surface-card',
  '--popover-foreground': 'text-strong',
  '--secondary': 'surface-muted',
  '--secondary-foreground': 'text-strong',
  '--muted': 'surface-muted',
  '--muted-foreground': 'text-mid',
  '--border': 'border-neutral',
  '--input': 'border-neutral',
};

// Full { '--var': value } map, or null for (default theme + light mode).
// Also stored verbatim in localStorage for the pre-paint boot script.
export function themeVarMap(theme, mode = DEFAULT_MODE) {
  const dark = mode === 'dark';
  if (!dark && theme.id === DEFAULT_THEME_ID) return null;
  const { hex, rgb, channels } = deriveTokens(theme, mode);
  const map = {};
  for (const token of Object.keys(LIGHT_SIGNATURE)) {
    map[`--${token}`] = hex[token];
    map[`--${token}-rgb`] = rgb[token];
  }
  if (dark) {
    for (const token of Object.keys(DARK_NEUTRALS)) map[`--${token}`] = hex[token];
    for (const token of NEUTRAL_RGB_TOKENS) map[`--${token}-rgb`] = rgb[token];
    for (const [name, value] of Object.entries(DARK_STATUS)) map[`--${name}`] = value;
  }
  const shadcn = dark ? SHADCN_DARK : SHADCN_LIGHT;
  for (const [name, token] of Object.entries(shadcn)) {
    if (channels[token]) map[name] = channels[token];
  }
  return map;
}

const ALL_VAR_NAMES = [
  ...Object.keys(LIGHT_SIGNATURE).flatMap(t => [`--${t}`, `--${t}-rgb`]),
  ...Object.keys(DARK_NEUTRALS).flatMap(t => [`--${t}`, `--${t}-rgb`]),
  ...Object.keys(DARK_STATUS).map(t => `--${t}`),
  ...Object.keys(SHADCN_DARK),
];

export function applyTheme(themeOrId, mode = DEFAULT_MODE) {
  if (typeof document === 'undefined') return;
  const theme =
    typeof themeOrId === 'string'
      ? THEMES.find(t => t.id === themeOrId) || THEMES[0]
      : themeOrId;
  const root = document.documentElement;
  const dark = mode === 'dark';

  root.classList.toggle('dark', dark);
  root.style.colorScheme = dark ? 'dark' : 'light';

  const map = themeVarMap(theme, mode);
  for (const name of ALL_VAR_NAMES) root.style.removeProperty(name);
  if (map) {
    for (const [name, value] of Object.entries(map)) root.style.setProperty(name, value);
  }
}

// Swatch colour for the picker UI (mode-independent — swatches show the hue).
export function themeSwatch(theme) {
  return theme.id === DEFAULT_THEME_ID ? '#0366ae' : deriveTokens(theme, 'light').hex.endeavour;
}
