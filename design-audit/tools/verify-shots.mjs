/* Verify the screenshot pass actually captured the app.
 *
 * Run 1 of the visual pass produced 200 files and reported success. 100 of them
 * were the login page and 6 were a "Loading…" spinner — the session had dropped
 * partway through and the harness kept shooting. Counting files proved nothing.
 *
 * So: check the IMAGES, not the count.
 *   - the login page renders at a near-identical byte size every time, so a
 *     cluster of same-size files is the signature of a dropped session
 *   - a spinner-only page is tiny
 *   - light and dark of the same route must differ, or the theme never switched
 *
 * Usage: node design-audit/tools/verify-shots.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const DIR = 'design-audit/screenshots';
const files = fs.readdirSync(DIR).filter(f => f.endsWith('.png'));

if (!files.length) { console.error('No screenshots found in ' + DIR); process.exit(1); }

const meta = files.map(f => {
  const m = f.match(/^(.*)__(light|dark)__(\d+)\.png$/);
  return m ? { f, route: m[1], mode: m[2], width: +m[3], size: fs.statSync(path.join(DIR, f)).size } : null;
}).filter(Boolean);

const fail = [];

// 1. Duplicate-size clusters at the same width = the same page shot repeatedly.
for (const w of [...new Set(meta.map(m => m.width))]) {
  const at = meta.filter(m => m.width === w);
  const bySize = {};
  at.forEach(m => { (bySize[m.size] ||= []).push(m); });
  for (const [size, group] of Object.entries(bySize)) {
    if (group.length >= 4) {
      fail.push(`${group.length} files at ${w}px share byte size ${size} — almost certainly the same page ` +
        `(login or an error screen): ${group.slice(0, 4).map(g => g.route).join(', ')}${group.length > 4 ? ', …' : ''}`);
    }
  }
}

// 2. Tiny files = spinner or blank.
const tiny = meta.filter(m => m.size < 12 * 1024);
if (tiny.length) {
  fail.push(`${tiny.length} file(s) under 12KB — likely a spinner or blank page: ` +
    tiny.slice(0, 6).map(t => t.f).join(', ') + (tiny.length > 6 ? ', …' : ''));
}

// 3. light vs dark must differ per route/width, else the theme never applied.
const same = [];
for (const m of meta.filter(x => x.mode === 'light')) {
  const d = meta.find(x => x.route === m.route && x.width === m.width && x.mode === 'dark');
  if (d && d.size === m.size) same.push(`${m.route}@${m.width}`);
}
if (same.length) {
  fail.push(`${same.length} route/width pair(s) identical in light and dark — the theme did not switch: ` +
    same.slice(0, 6).join(', ') + (same.length > 6 ? ', …' : ''));
}

console.log(`${files.length} screenshots · ${new Set(meta.map(m => m.route)).size} routes · ` +
  `${new Set(meta.map(m => m.mode)).size} themes · ${new Set(meta.map(m => m.width)).size} widths`);
console.log('');
if (fail.length) {
  console.log('INVALID — this pass cannot be trusted:');
  fail.forEach(f => console.log('  ✗ ' + f));
  process.exitCode = 1;
} else {
  console.log('✓ every screenshot is distinct, non-trivial, and differs between themes');
}
