// Personal colour themes.
//
// Every themable token in globals.css :root is derived from a single theme hue
// using a fixed signature (hue offset, saturation, lightness) measured from the
// original blue palette. Because only the hue moves and the S/L structure is
// preserved, every preset keeps the same tonal balance and text contrast as the
// shipped design.
//
// 'ocean' is the original palette: applying it removes all inline overrides so
// the stylesheet values in globals.css apply untouched (pixel-exact default).

const TOKEN_SIGNATURE = {
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

// Adding a preset is one line: pick a hue (0-359) and optionally damp the
// saturation. Everything else — all twelve tokens, contrast safety, the swatch in
// the navbar — is derived. Hues are spaced around the wheel so neighbouring
// swatches stay tellable apart.
export const THEMES = [
  { id: 'ocean', label: 'Ocean', hue: 205 },
  { id: 'sky', label: 'Sky', hue: 193 },
  { id: 'teal', label: 'Teal', hue: 175, sat: 0.9 },
  { id: 'emerald', label: 'Emerald', hue: 150, sat: 0.9 },
  { id: 'moss', label: 'Moss', hue: 115, sat: 0.85 },
  { id: 'mustard', label: 'Mustard', hue: 45, sat: 0.95 },
  { id: 'amber', label: 'Amber', hue: 32, sat: 0.95 },
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

// Buttons, badges and table headers put white text on --endeavour and on
// --chathams-blue. Green/teal/amber hues are perceptually much lighter than blue
// at the same HSL lightness, so a fixed lightness would drop those presets below
// readable contrast. These two tokens are therefore darkened automatically until
// white-on-colour clears WCAG AA (4.5:1) — accessibility holds for any hue added
// later, without per-preset tuning.
const WHITE_TEXT_TOKENS = new Set(['endeavour', 'chathams-blue']);
const MIN_CONTRAST_ON_WHITE_TEXT = 4.6;

const relLuminance = ([r, g, b]) =>
  [r, g, b]
    .map(v => {
      const c = v / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    })
    .reduce((acc, c, i) => acc + [0.2126, 0.7152, 0.0722][i] * c, 0);

const contrastWithWhite = rgb => 1.05 / (relLuminance(rgb) + 0.05);

export const DEFAULT_THEME_ID = 'ocean';
export const THEME_STORAGE_KEY = 'ims-theme';

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

// -> { hex: {token: '#rrggbb'}, rgb: {token: 'r, g, b'}, channels: {token: 'H S% L%'} }
export function deriveTokens(theme) {
  const sat = theme.sat ?? 1;
  const hex = {}, rgb = {}, channels = {};
  for (const [token, sig] of Object.entries(TOKEN_SIGNATURE)) {
    const h = Math.round(theme.hue + sig.dh);
    const s = Math.round(sig.s * sat);
    let l = sig.l;
    let rgbArr = hslToRgb(h, s, l);
    if (WHITE_TEXT_TOKENS.has(token)) {
      while (l > 12 && contrastWithWhite(rgbArr) < MIN_CONTRAST_ON_WHITE_TEXT) {
        l -= 1;
        rgbArr = hslToRgb(h, s, l);
      }
    }
    hex[token] = toHex(rgbArr);
    rgb[token] = rgbArr.join(', ');
    channels[token] = `${((h % 360) + 360) % 360} ${s}% ${l}%`;
  }
  return { hex, rgb, channels };
}

// shadcn/Radix HSL-channel tokens that must follow the theme
// (see globals.css — tailwind.config.js reads them as hsl(var(--x))).
const SHADCN_FROM_TOKEN = {
  '--primary': 'endeavour',
  '--ring': 'endeavour',
  '--accent': 'surface-header',
  '--accent-foreground': 'chathams-blue',
};

// Full { '--var': value } map for a theme, or null for the default (which
// means: remove overrides and let the globals.css stylesheet values apply).
// Also used verbatim by the pre-paint boot script via localStorage.
export function themeVarMap(theme) {
  if (theme.id === DEFAULT_THEME_ID) return null;
  const { hex, rgb, channels } = deriveTokens(theme);
  const map = {};
  for (const token of Object.keys(TOKEN_SIGNATURE)) {
    map[`--${token}`] = hex[token];
    map[`--${token}-rgb`] = rgb[token];
  }
  for (const [name, token] of Object.entries(SHADCN_FROM_TOKEN)) {
    map[name] = channels[token];
  }
  return map;
}

const ALL_VAR_NAMES = [
  ...Object.keys(TOKEN_SIGNATURE).flatMap(t => [`--${t}`, `--${t}-rgb`]),
  ...Object.keys(SHADCN_FROM_TOKEN),
];

export function applyTheme(themeOrId) {
  if (typeof document === 'undefined') return;
  const theme =
    typeof themeOrId === 'string'
      ? THEMES.find(t => t.id === themeOrId) || THEMES[0]
      : themeOrId;
  const root = document.documentElement;
  const map = themeVarMap(theme);
  if (!map) {
    for (const name of ALL_VAR_NAMES) root.style.removeProperty(name);
    return;
  }
  for (const [name, value] of Object.entries(map)) root.style.setProperty(name, value);
}

// Swatch colour for the picker UI.
export function themeSwatch(theme) {
  return theme.id === DEFAULT_THEME_ID ? '#0366ae' : deriveTokens(theme).hex.endeavour;
}
