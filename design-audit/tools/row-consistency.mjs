/* Controls sitting in the same row should look like the same kind of control.
 *
 * The gates check the SOURCE and font-census checks that every size is ON the
 * ladder. Neither catches the thing Zak has now reported three times: an element
 * that is perfectly on-ladder but on the WRONG RUNG for the company it keeps —
 *
 *   Search = 10px/500   Quick Sum = 10px/500   USD = 12px/400   <- one of these
 *
 * This groups visible controls into visual rows and flags a row whose controls
 * disagree on size, weight, or ink.
 *
 * Ink is only compared between controls that share a background. A filled
 * primary button next to an outline secondary is SUPPOSED to have different
 * text colour, and flagging that would bury the real findings in noise.
 */
import { chromium } from 'playwright';
import fs from 'fs';

const BASE = process.env.IMS_BASE || 'http://localhost:3002';
const WIDTH = Number(process.env.IMS_WIDTH || 1440);
const ROW_TOL = 8;      // px: how far apart two controls can sit and still be "a row"
const MIN_ROW = 2;      // a row needs at least this many controls to be comparable

const env = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)
    .filter(l => l.includes('=') && !l.trim().startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
);
const EMAIL = env.IMS_TEST_EMAIL, PASSWORD = env.IMS_TEST_PASSWORD;

const APP = ['dashboard','contracts','salescontracts','shipment','invoices','expenses','accounting',
  'ContractsReview&Statement','InvoicesReview&Statement','accstatement','stocks','storagecosts',
  'specialinvoices','companyexpenses','materialtables','incoterms','activity','margins','cashflow',
  'formulas','settings','analysis'];

/* Secondary tabs to open before scanning. A route only ever renders its default
   tab, so anything living on the second one is invisible to this check — which
   is exactly where the "Expanded mode" toggle sat when Zak found it at 14px in a
   row of 10px controls. These are clicked by label after the default scan. */
const TABS = {
  'ContractsReview&Statement': ['Contracts Statement'],
  'InvoicesReview&Statement': ['Invoices Statement'],
  settings: ['Setup', 'Suppliers', 'Clients', 'Bank Account', 'Stocks', 'Documents', 'Email Setup', 'Users'],
};

const SCAN = ({ tol, minRow }) => {
  const px = v => Math.round(parseFloat(v));
  const items = [];
  // A status colour is meaning, not styling — a red total next to a blue one is
  // the app doing its job. Resolve the tokens so they can be excluded by value.
  const rs = getComputedStyle(document.documentElement);
  const STATUS = ['--ok-text','--ok-strong','--danger-text','--danger-strong','--warn-text','--warn-strong']
    .map(n => rs.getPropertyValue(n).trim().toLowerCase()).filter(Boolean);
  const hex2rgb = h => { const m = /^#?([0-9a-f]{6})$/i.exec(h); if (!m) return h;
    const n = parseInt(m[1], 16); return `rgb(${n >> 16 & 255}, ${n >> 8 & 255}, ${n & 255})`; };
  const STATUS_RGB = new Set(STATUS.map(hex2rgb));

  for (const el of document.querySelectorAll('button, input, select, textarea, [role="combobox"], a')) {
    const r = el.getBoundingClientRect();
    if (!r.height || r.width < 8) continue;
    if (r.left < 240) continue;                    // the sidebar is its own component
    if (el.closest('[role="dialog"]')) continue;   // modals are measured separately
    // Data rows are not control rows. A delete "x" is SUPPOSED to look unlike the
    // cell inputs beside it, and every table row would otherwise report itself —
    // 134 findings on the first run, of which almost all were this.
    if (el.closest('table, tbody, thead, [role="row"]')) continue;
    // An active tab is meant to differ from its inactive siblings.
    const st = el.getAttribute('data-headlessui-state') || '';
    if (el.getAttribute('aria-selected') === 'true' || /selected|active|checked/.test(st)) continue;
    let own = '';
    for (const n of el.childNodes) if (n.nodeType === 3 && n.nodeValue.trim()) own += n.nodeValue.trim();
    const label = (own || el.value || el.placeholder || '').trim();
    if (!label) continue;                          // icon-only controls have no type to compare
    const cs = getComputedStyle(el);
    // walk up for the painted background (controls are often transparent themselves)
    let bg = cs.backgroundColor, p = el;
    while (p && (bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent')) { p = p.parentElement; if (p) bg = getComputedStyle(p).backgroundColor; }
    items.push({ label: label.slice(0, 20), top: Math.round(r.top), left: Math.round(r.left),
      size: px(cs.fontSize), weight: cs.fontWeight, color: cs.color, bg,
      status: STATUS_RGB.has(cs.color.toLowerCase()) });
  }
  // group into visual rows
  items.sort((a, b) => a.top - b.top || a.left - b.left);
  const rows = [];
  for (const it of items) {
    const row = rows.find(r => Math.abs(r.top - it.top) <= tol);
    if (row) { row.items.push(it); row.top = Math.min(row.top, it.top); }
    else rows.push({ top: it.top, items: [it] });
  }
  const findings = [];
  for (const row of rows) {
    if (row.items.length < minRow) continue;
    const uniq = k => [...new Set(row.items.map(i => i[k]))];
    const sizes = uniq('size'), weights = uniq('weight');
    // ink: only compare controls that share a background, and never compare a
    // status colour — red means "negative", not "styled differently".
    const byBg = {};
    for (const i of row.items) { if (i.status) continue; (byBg[i.bg] = byBg[i.bg] || []).push(i); }
    const inkClash = Object.values(byBg)
      .filter(g => g.length >= 2 && new Set(g.map(i => i.color)).size > 1);
    if (sizes.length > 1 || weights.length > 1 || inkClash.length) {
      findings.push({
        top: row.top,
        kinds: [sizes.length > 1 && 'size', weights.length > 1 && 'weight', inkClash.length && 'ink'].filter(Boolean),
        items: row.items.map(i => `${i.label}=${i.size}px/${i.weight}/${i.color}`),
      });
    }
  }
  return findings;
};

const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: WIDTH, height: 950 } })).newPage();

await page.goto(`${BASE}/signin`, { waitUntil: 'networkidle', timeout: 90000 });
await page.locator('input[type="email"]').first().fill(EMAIL);
await page.locator('input[type="password"]').first().fill(PASSWORD);
await page.getByRole('button', { name: 'Sign In', exact: true }).click();
await page.waitForTimeout(7000);
if (/\/signin/.test(page.url())) { console.error('LOGIN FAILED'); process.exit(1); }

let total = 0;
for (const route of APP) {
  await page.goto(`${BASE}/${route}`, { waitUntil: 'domcontentloaded', timeout: 90000 }).catch(() => {});
  let prev = -1, stable = 0;
  for (let i = 0; i < 50; i++) {
    const s = await page.evaluate(() => ({ skel: !!document.querySelector('.skel'), n: document.body.innerText.trim().length }));
    if (!s.skel && s.n > 400 && s.n === prev) { if (++stable >= 2) break; } else stable = 0;
    prev = s.n; await page.waitForTimeout(500);
  }
  const views = [['', null], ...(TABS[route] || []).map(t => [t, t])];
  for (const [viewName, tabLabel] of views) {
    if (tabLabel) {
      try {
        await page.getByText(tabLabel, { exact: true }).first().click({ timeout: 8000 });
        await page.waitForTimeout(2500);
      } catch { console.log(`  ${route.padEnd(28)} (tab "${tabLabel}" not reachable — skipped)`); continue; }
    }
    const label = viewName ? `${route} > ${viewName}` : route;
    const f = await page.evaluate(SCAN, { tol: ROW_TOL, minRow: MIN_ROW });
    if (!f.length) { console.log(`  ${label.padEnd(46)} clean`); continue; }
    total += f.length;
    console.log(`  ${label.padEnd(46)} ${f.length} row(s) disagree`);
    for (const x of f) console.log(`      y${String(x.top).padStart(4)} [${x.kinds.join('+')}]  ${x.items.join('   ')}`);
  }
}
console.log(`\n${total} inconsistent row(s) across ${APP.length} pages`);
await browser.close();
