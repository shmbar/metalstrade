/* Contrast audit across EVERY theme preset x mode.
 *
 * 19 presets x 2 modes = 38 combinations. Eyeballing one of them proves nothing
 * about the other 37, and the tokens added during this audit (--brand-deep,
 * --on-brand-muted) are DERIVED from --endeavour, so they change with the hue.
 *
 * utils/themes.js already fits its own tokens to WCAG AA. The tokens added here
 * were never checked, so this closes that gap — and it checks the pairings the
 * engine does not: text sitting on a brand surface.
 *
 * Usage: node design-audit/tools/theme-contrast.mjs
 */
import { THEMES, deriveTokens } from '../../utils/themes.js';

const hexToRgb = (h) => {
  h = h.replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
};
const relLum = ([r, g, b]) => {
  const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const contrast = (a, b) => {
  const [x, y] = [relLum(a), relLum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};
// color-mix(in srgb, A pct%, B) — sRGB is a plain per-channel interpolation
const mix = (a, b, pct) => a.map((v, i) => Math.round(v * pct + b[i] * (1 - pct)));
// a translucent white composited over an opaque backdrop
const over = (fg, alpha, bg) => fg.map((v, i) => Math.round(v * alpha + bg[i] * (1 - alpha)));

const WHITE = [255, 255, 255];
const DEEP_MIX = hexToRgb('#0a1020');   // the second stop of --brand-deep
const AA = 4.5, AA_LARGE = 3.0;

const rows = [];
for (const theme of THEMES) {
  for (const mode of ['light', 'dark']) {
    const { hex } = deriveTokens(theme, mode);
    const endeavour = hexToRgb(hex.endeavour);
    const brandDeep = mix(endeavour, DEEP_MIX, 0.55);          // --brand-deep
    const onBrandMuted = over(WHITE, 0.78, brandDeep);          // --on-brand-muted composited

    rows.push({
      theme: theme.id, mode,
      // white body/heading text on the brand hero + on brand-deep surfaces
      whiteOnDeep: contrast(WHITE, brandDeep),
      // the muted secondary copy on the same surface
      mutedOnDeep: contrast(onBrandMuted, brandDeep),
      // white label on a plain --endeavour button (the engine fits this one, so
      // it is a regression check on the engine itself)
      whiteOnEndeavour: contrast(WHITE, endeavour),
    });
  }
}

const bad = rows.filter(r =>
  r.whiteOnDeep < AA || r.mutedOnDeep < AA_LARGE || r.whiteOnEndeavour < AA);

console.log(`${rows.length} combinations checked (${THEMES.length} presets x 2 modes)\n`);
console.log('pairing                              min    worst theme/mode');
const summarise = (key, target) => {
  const w = rows.reduce((a, r) => r[key] < a[key] ? r : a);
  const ok = w[key] >= target;
  console.log(`${key.padEnd(36)} ${w[key].toFixed(2).padStart(5)}  ${w.theme}/${w.mode}  ${ok ? 'PASS' : 'FAIL'} (need ${target})`);
};
summarise('whiteOnDeep', AA);
summarise('mutedOnDeep', AA_LARGE);
summarise('whiteOnEndeavour', AA);

if (bad.length) {
  console.log(`\n${bad.length} FAILING combination(s):`);
  bad.forEach(r => console.log(
    `  ${r.theme}/${r.mode}: whiteOnDeep=${r.whiteOnDeep.toFixed(2)} ` +
    `mutedOnDeep=${r.mutedOnDeep.toFixed(2)} whiteOnEndeavour=${r.whiteOnEndeavour.toFixed(2)}`));
  process.exitCode = 1;
} else {
  console.log('\n✓ every preset passes in both modes');
}
