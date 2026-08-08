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

// Tuned 2026-07-30 after client review ("needs to look sharper, not outdated"):
// modern dashboard treatment — near-neutral surfaces with whisper tints, lighter
// desaturated borders, near-neutral dark text, and a brighter more vivid primary.
// NOTE: Ocean bypasses this entirely (stylesheet defaults), so the app's classic
// blue is unaffected; this signature shapes the other presets.
// Re-measured 2026-08-08 from the SaaS redesign palette (see app/globals.css
// :root). Every value below is the HSL of the corresponding token in the new
// system, expressed relative to the default theme's hue (248). Applying the
// default preset therefore reproduces the stylesheet exactly, and every other
// preset renders the SAME design in its own hue.
const LIGHT_SIGNATURE = {
  endeavour: { dh: 0, s: 68, l: 62 },          /* --brand        #6D5CE0 */
  'chathams-blue': { dh: -2, s: 36, l: 16 },   /* --ink          #1E1B39 */
  'port-gore': { dh: -2, s: 36, l: 16 },       /* --ink          #1E1B39 */
  bunting: { dh: -1, s: 41, l: 12 },           /* deepest ink    #15122B */
  'rock-blue': { dh: 6, s: 28, l: 87 },        /* --line-strong  #DAD6E8 */
  'regent-gray': { dh: -1, s: 10, l: 47 },     /* --ink-muted    #6E6B84 */
  selago: { dh: 2, s: 33, l: 96 },             /* --bg-subtle    #F4F3F9 */
  'primary-bright': { dh: -1, s: 89, l: 73 },  /* brand, lifted  #8B7CF7 */
  'surface-header': { dh: 2, s: 33, l: 96 },   /* --bg-subtle    #F4F3F9 */
  'surface-pill': { dh: 2, s: 33, l: 96 },     /* --bg-subtle    #F4F3F9 */
  'border-cell': { dh: 4, s: 28, l: 93 },      /* --line         #EAE8F2 */
  'border-divider': { dh: 4, s: 28, l: 93 },   /* --line         #EAE8F2 */
};

// Same tokens, dark values. Text-role tokens (port-gore, chathams-blue, …)
// become light; surface-role tokens become hue-tinted darks.
const DARK_SIGNATURE = {
  endeavour: { dh: -1, s: 89, l: 73 },         /* --brand        #8B7CF7 */
  'chathams-blue': { dh: 1, s: 64, l: 95 },    /* --ink          #EDEBFA */
  'port-gore': { dh: 1, s: 64, l: 95 },        /* --ink          #EDEBFA */
  bunting: { dh: 1, s: 64, l: 96 },            /* lightest ink           */
  'rock-blue': { dh: 1, s: 29, l: 29 },        /* --line-strong  #3A3560 */
  'regent-gray': { dh: 1, s: 16, l: 59 },      /* --ink-muted    #8B87A8 */
  selago: { dh: 1, s: 27, l: 17 },             /* --bg-subtle    #232038 */
  'primary-bright': { dh: 0, s: 100, l: 79 },  /* --brand-strong #A497FF */
  'surface-header': { dh: 1, s: 27, l: 17 },   /* --bg-subtle    #232038 */
  'surface-pill': { dh: 1, s: 27, l: 17 },     /* --bg-subtle    #232038 */
  'border-cell': { dh: 0, s: 27, l: 23 },      /* --line         #2E2A4A */
  'border-divider': { dh: 0, s: 27, l: 23 },   /* --line         #2E2A4A */
};

// Neutral base layer, dark values — tinted with the theme hue (Telegram-style),
// damped by the theme's sat so Graphite/Stone go properly grey.
const DARK_NEUTRALS = {
  'surface-card': { s: 33, l: 14 },            /* --bg-card      #1B1830 */
  'surface-base': { s: 29, l: 10 },            /* --bg-page      #131120 */
  'surface-muted': { s: 27, l: 17 },           /* --bg-subtle    #232038 */
  'surface-sunken': { s: 28, l: 21 },          /* --bg-sunken    #2B2745 */
  'border-neutral': { s: 27, l: 23 },          /* --line         #2E2A4A */
  'border-neutral-strong': { s: 29, l: 29 },   /* --line-strong  #3A3560 */
  'text-strong': { s: 64, l: 95 },             /* --ink          #EDEBFA */
  'text-mid': { s: 25, l: 76 },                /* --ink-secondary #B6B2D0 */
  'text-faint': { s: 16, l: 59 },              /* --ink-muted    #8B87A8 */
};
const NEUTRAL_RGB_TOKENS = ['surface-card', 'surface-base'];

// Status system, dark values — hue-independent (green must stay green).
const DARK_STATUS = {
  'ok-soft': '#0E2117', 'ok-bg': '#12291C', 'ok-border': '#1F4630',
  'ok-text': '#5ECC96', 'ok-strong': '#8CE0B4',
  'danger-soft': '#291418', 'danger-bg': '#321A1E', 'danger-border': '#542730',
  'danger-text': '#F0788C', 'danger-strong': '#F7A3B0',
  'warn-soft': '#251D0F', 'warn-bg': '#2E2413', 'warn-border': '#4A3A1D',
  'warn-text': '#E8B95C', 'warn-strong': '#F2D290',
  /* The violet family is the brand family — keep it in step with --brand dark. */
  'violet-soft': '#1C1834', 'violet-bg': '#22203E', 'violet-border': '#3D3768',
  'violet-text': '#A99EF5', 'violet-strong': '#C4BCFF',
  'pink-soft': '#2A1520', 'pink-bg': '#38182A',
  'pink-text': '#F0839F', 'pink-strong': '#F7AEC1',
  /* 6th avatar hue — also needs a dark value or the chip goes dark-on-dark. */
  'teal-text': '#5FD6C4',
};

export const THEMES = [
  /* The default. Its id stays 'ocean' so every preference already saved in
     Firestore keeps resolving (and lands on the new default look); the hue and
     label move to the redesign's violet identity. Users who explicitly picked a
     blue keep it via 'azure' / 'sky' below. */
  { id: 'ocean', label: 'Iris', hue: 248 },
  { id: 'azure', label: 'Azure', hue: 214 },
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
  { id: 'orchid', label: 'Orchid', hue: 285, sat: 0.85 },
  { id: 'indigo', label: 'Indigo', hue: 231, sat: 0.9 },
  { id: 'periwinkle', label: 'Periwinkle', hue: 245, sat: 0.8 },
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
  return theme.id === DEFAULT_THEME_ID ? '#6D5CE0' : deriveTokens(theme, 'light').hex.endeavour;
}
