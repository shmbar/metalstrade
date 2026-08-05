/* Font census — every rendered text size on every page, at one width.
 *
 * Zak: "still some fonts too large, some too small, some uneven, same issue in
 * some pages." The gates only prove the SOURCE is on the ladder; they cannot
 * see what a browser actually paints once inheritance, !important overrides and
 * third-party components have had their turn. This measures the paint.
 *
 * For each element that owns a text node (a leaf — so a container is not counted
 * for text its child renders), it records the computed font-size, the tag, the
 * class list and a sample of the text. Then it reports, per page, every distinct
 * size and how many elements carry it.
 *
 * At 1440px the ladder's xl step is in force, so the ONLY legitimate sizes are:
 *   10 caption · 11 table · 12 body · 13 input · 14 title · 17 page · 22 stat
 *   25 display · 36 hero
 * Anything else is off-ladder by definition and is reported with examples.
 */
import { chromium } from 'playwright';
import fs from 'fs';

const BASE = process.env.IMS_BASE || 'http://localhost:3002';
const WIDTH = Number(process.env.IMS_WIDTH || 1440);
const LADDER = [10, 11, 12, 13, 14, 17, 22, 25, 36];

const env = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)
    .filter(l => l.includes('=') && !l.trim().startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
);
const EMAIL = env.IMS_TEST_EMAIL, PASSWORD = env.IMS_TEST_PASSWORD;
if (!EMAIL || !PASSWORD) { console.error('missing IMS_TEST_EMAIL / IMS_TEST_PASSWORD'); process.exit(1); }

const APP = ['dashboard','contracts','salescontracts','shipment','invoices','expenses',
  'accounting','ContractsReview&Statement','InvoicesReview&Statement','accstatement','stocks',
  'storagecosts','specialinvoices','companyexpenses','materialtables','incoterms','activity',
  'margins','cashflow','formulas','settings','analysis'];
const PUBLIC = ['', 'about', 'features', 'blog', 'contact', 'landing'];

const CENSUS = () => {
  const out = [];
  const seen = new WeakSet();
  const walk = (el) => {
    if (seen.has(el)) return; seen.add(el);
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return;
    // does THIS element own a non-empty text node? (leaf-ish test)
    let own = '';
    for (const n of el.childNodes) if (n.nodeType === 3 && n.nodeValue.trim()) own += n.nodeValue.trim() + ' ';
    own = own.trim();
    if (own && el.getClientRects().length) {
      out.push({
        px: Math.round(parseFloat(cs.fontSize) * 10) / 10,
        w: cs.fontWeight,
        tag: el.tagName.toLowerCase(),
        cls: (typeof el.className === 'string' ? el.className : '').slice(0, 70),
        txt: own.slice(0, 34),
      });
    }
    for (const c of el.children) walk(c);
  };
  walk(document.body);
  // placeholders and inputs carry text the walk cannot see. Checkboxes and
  // radios are excluded: they render no glyph, so their font-size is inert and
  // counting it reports a phantom off-ladder size (their `value` is "on").
  for (const el of document.querySelectorAll('input,textarea,select')) {
    if (!el.getClientRects().length) continue;
    if (el.tagName === 'INPUT' && /^(checkbox|radio|range|color|file|hidden)$/i.test(el.type)) continue;
    const cs = getComputedStyle(el);
    out.push({ px: Math.round(parseFloat(cs.fontSize) * 10) / 10, w: cs.fontWeight,
      tag: el.tagName.toLowerCase() + ':field',
      cls: (typeof el.className === 'string' ? el.className : '').slice(0, 70),
      txt: (el.placeholder || el.value || '').slice(0, 34) });
  }
  return out;
};

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: WIDTH, height: 950 } });
const page = await ctx.newPage();

async function login() {
  await page.goto(`${BASE}/signin`, { waitUntil: 'networkidle', timeout: 90000 });
  await page.locator('input[type="email"]').first().fill(EMAIL);
  await page.locator('input[type="password"]').first().fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await page.waitForURL(u => !/\/signin/.test(u.toString()), { timeout: 90000 }).catch(() => {});
  await page.waitForTimeout(3500);
  return !/\/signin/.test(page.url());
}

/* Absence of `.skel` is NOT enough. Several pages (specialinvoices,
 * companyexpenses, incoterms) render no skeleton at all and populate straight
 * from Firestore, so "no skeleton" is true while the page is still empty — a
 * census run against that reports 1 text node and looks like the page broke.
 * Wait for the text-node count to stop changing instead: two equal readings in
 * a row, and never accept a page that is still showing a skeleton. */
const settled = async () => {
  let prev = -1, stable = 0;
  for (let i = 0; i < 60; i++) {
    const s = await page.evaluate(() => ({
      skel: !!document.querySelector('.skel'),
      n: document.body.innerText.trim().length,
    }));
    if (!s.skel && s.n > 400 && s.n === prev) { if (++stable >= 2) return true; }
    else stable = 0;
    prev = s.n;
    await page.waitForTimeout(500);
  }
  return false;
};

const results = {};
const rejected = [];

console.log(`logging in @ ${WIDTH}px ...`);
if (!await login()) { console.error('LOGIN FAILED'); process.exit(1); }
console.log('ok:', page.url(), '\n');

for (const kind of ['public', 'app']) {
  for (const r of (kind === 'public' ? PUBLIC : APP)) {
    const url = `${BASE}/${r}`;
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
    } catch { rejected.push({ r, why: 'navigation timeout' }); continue; }
    await page.waitForTimeout(2800);
    if (kind === 'app' && /\/signin/.test(page.url())) {
      if (!await login()) { rejected.push({ r, why: 'auth lost' }); continue; }
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
      await page.waitForTimeout(2800);
    }
    if (!await settled()) { rejected.push({ r, why: 'still skeleton' }); continue; }
    await page.evaluate(async () => {
      const h = document.body.scrollHeight;
      for (let y = 0; y < h; y += 700) { window.scrollTo(0, y); await new Promise(s => setTimeout(s, 90)); }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(700);
    const rows = await page.evaluate(CENSUS);
    if (rows.length < 12) { rejected.push({ r, why: `only ${rows.length} text nodes — page likely empty` }); continue; }
    results[r || '(home)'] = rows;
    const sizes = [...new Set(rows.map(x => x.px))].sort((a, b) => a - b);
    const off = sizes.filter(s => !LADDER.includes(s));
    console.log(`  ${(r || '(home)').padEnd(28)} ${String(rows.length).padStart(5)} els  ${String(sizes.length).padStart(2)} sizes  ${off.length ? 'OFF-LADDER: ' + off.join(', ') : 'all on ladder'}`);
  }
}

fs.writeFileSync('C:/tmp/font-census.json', JSON.stringify({ width: WIDTH, results, rejected }, null, 1));
console.log(`\n${Object.keys(results).length} pages measured, ${rejected.length} rejected`);
for (const x of rejected) console.log(`  REJECTED ${x.r}: ${x.why}`);
await browser.close();
