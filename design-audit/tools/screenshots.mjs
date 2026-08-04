/* Visual-pass harness — design-audit Phase 4, manual gates.
 *
 * Walks every in-scope route in BOTH themes at FOUR widths, screenshots each,
 * and records any console error the page throws. That is 25 routes x 2 themes
 * x 4 widths = 200 checks; nobody does that honestly by hand, which is why the
 * visual half of this audit kept getting skipped.
 *
 * Playwright is already a devDependency — this adds no new package.
 *
 * Usage:
 *   1. npm run dev                       (in another terminal)
 *   2. put credentials in .env.local     (gitignored):
 *        IMS_TEST_EMAIL=you@example.com
 *        IMS_TEST_PASSWORD=...
 *   3. npm run design:screenshots
 *
 * Optional env: IMS_BASE_URL (default http://localhost:3000)
 *               IMS_ROUTES   (comma-separated, to shoot a subset)
 *
 * Output: design-audit/screenshots/<route>__<mode>__<width>.png
 *         design-audit/screenshots/SUMMARY.md   (console errors per route)
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.IMS_BASE_URL || 'http://localhost:3000';
const EMAIL = process.env.IMS_TEST_EMAIL;
const PASSWORD = process.env.IMS_TEST_PASSWORD;
const OUT = 'design-audit/screenshots';

// Load .env.local without adding a dotenv dependency.
for (const f of ['.env.local', '.env']) {
  if (!fs.existsSync(f)) continue;
  for (const line of fs.readFileSync(f, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
}

const email = EMAIL || process.env.IMS_TEST_EMAIL;
const password = PASSWORD || process.env.IMS_TEST_PASSWORD;

if (!email || !password) {
  console.error(`
  Missing credentials.

  Add to .env.local (already gitignored — they will NOT be committed):
    IMS_TEST_EMAIL=you@example.com
    IMS_TEST_PASSWORD=...

  Use a test account if you have one. The harness toggles dark mode, which is
  saved against the signed-in member — it restores the original setting when it
  finishes, but a test account avoids the question entirely.
`);
  process.exit(2);
}

const ROUTES = (process.env.IMS_ROUTES || [
  'dashboard', 'contracts', 'salescontracts', 'shipment', 'invoices', 'expenses',
  'accounting', 'ContractsReview&Statement', 'InvoicesReview&Statement',
  'accstatement', 'stocks', 'storagecosts', 'specialinvoices', 'companyexpenses',
  'materialtables', 'incoterms', 'activity', 'margins', 'cashflow', 'formulas',
  'settings', 'apps/Assistant',
  // reachable by URL but not in the sidebar — in scope by Zak's decision
  'analysis', 'contractsstatement', 'invoicesstatement',
].join(',')).split(',').map(s => s.trim()).filter(Boolean);

const WIDTHS = [1440, 1024, 768, 390];
const MODES = ['light', 'dark'];

fs.mkdirSync(OUT, { recursive: true });

const problems = [];   // { route, mode, width, kind, text }
const shots = [];

const isNoise = (t) => (
  // Firebase/network chatter that is not a UI defect
  /favicon|ResizeObserver loop|Download the React DevTools|\[Fast Refresh\]/i.test(t)
);

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

let current = { route: '(login)', mode: 'light', width: 1440 };
page.on('console', (msg) => {
  if (msg.type() !== 'error') return;
  const t = msg.text();
  if (isNoise(t)) return;
  problems.push({ ...current, kind: 'console', text: t.slice(0, 300) });
});
page.on('pageerror', (err) => {
  const t = String(err && err.message || err);
  if (isNoise(t)) return;
  problems.push({ ...current, kind: 'pageerror', text: t.slice(0, 300) });
});

async function currentMode() {
  return await page.evaluate(() => document.documentElement.classList.contains('dark') ? 'dark' : 'light');
}

async function setMode(target) {
  await page.setViewportSize({ width: 1440, height: 900 });   // the toggle is md+ only
  if (await currentMode() === target) return true;
  const btn = page.locator('[aria-label="Switch to dark mode"], [aria-label="Switch to light mode"]').first();
  try {
    await btn.waitFor({ state: 'visible', timeout: 10000 });
    await btn.click();
    await page.waitForFunction(
      (m) => (document.documentElement.classList.contains('dark') ? 'dark' : 'light') === m,
      target, { timeout: 10000 });
    await page.waitForTimeout(400);   // let the repaint settle
    return true;
  } catch {
    console.warn(`  ! could not switch to ${target} mode`);
    return false;
  }
}

// ── sign in ──────────────────────────────────────────────────────────────────
console.log(`Signing in at ${BASE} …`);
await page.goto(`${BASE}/signin`, { waitUntil: 'domcontentloaded' });
await page.locator('input[type="email"]').first().fill(email);
await page.locator('input[type="password"]').first().fill(password);
await page.locator('button[type="submit"], form button').first().click();
try {
  await page.waitForURL(/\/(contracts|dashboard|accounting)/, { timeout: 45000 });
} catch {
  console.error('  ✗ login did not land on an app route — wrong credentials, or the dev server is not running.');
  console.error(`    current URL: ${page.url()}`);
  await browser.close();
  process.exit(1);
}
console.log('  ✓ signed in\n');

const originalMode = await currentMode();

// ── walk ─────────────────────────────────────────────────────────────────────
for (const mode of MODES) {
  console.log(`── ${mode} mode ──`);
  await setMode(mode);

  for (const route of ROUTES) {
    const safe = route.replace(/[^a-zA-Z0-9]+/g, '-');
    current = { route, mode, width: 1440 };
    try {
      await page.goto(`${BASE}/${route}`, { waitUntil: 'networkidle', timeout: 60000 });
    } catch {
      // networkidle can never settle on pages with live listeners; fall back
      await page.goto(`${BASE}/${route}`, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => { });
    }
    await page.waitForTimeout(1500);   // let data render

    for (const width of WIDTHS) {
      current = { route, mode, width };
      await page.setViewportSize({ width, height: width < 500 ? 844 : 900 });
      await page.waitForTimeout(350);

      // horizontal overflow is a defect the client would see immediately
      const overflow = await page.evaluate(() =>
        document.documentElement.scrollWidth - document.documentElement.clientWidth);
      if (overflow > 2) {
        problems.push({ route, mode, width, kind: 'h-overflow', text: `page scrolls horizontally by ${overflow}px` });
      }

      const file = path.join(OUT, `${safe}__${mode}__${width}.png`);
      await page.screenshot({ path: file, fullPage: true }).catch(() => { });
      shots.push(file);
    }
    const bad = problems.filter(p => p.route === route && p.mode === mode).length;
    console.log(`  ${bad ? '✗' : '✓'} ${route}${bad ? `  (${bad} issue${bad > 1 ? 's' : ''})` : ''}`);
  }
  console.log('');
}

// restore whatever the account had before we started
await setMode(originalMode);
await browser.close();

// ── summary ──────────────────────────────────────────────────────────────────
const byKind = problems.reduce((a, p) => { a[p.kind] = (a[p.kind] || 0) + 1; return a; }, {});
let md = `# Visual pass — results\n\n`;
md += `Base: \`${BASE}\` · ${ROUTES.length} routes × ${MODES.length} themes × ${WIDTHS.length} widths\n\n`;
md += `**${shots.length} screenshots** written to \`design-audit/screenshots/\`.\n\n`;
md += problems.length
  ? `## ${problems.length} issue(s) found\n\n${Object.entries(byKind).map(([k, v]) => `- \`${k}\`: ${v}`).join('\n')}\n\n` +
  `| Route | Mode | Width | Kind | Detail |\n|---|---|---|---|---|\n` +
  problems.map(p => `| ${p.route} | ${p.mode} | ${p.width} | ${p.kind} | ${p.text.replace(/\|/g, '\\|')} |`).join('\n') + '\n'
  : `## No console errors and no horizontal overflow on any route, in either theme, at any width.\n`;
md += `\n---\n\nScreenshots still need a human eye for the things no script can judge:\n` +
  `cards being equal height in a grid, columns not jumping, text truncation, and whether\n` +
  `dark mode actually reads well. This harness makes that a review, not an expedition.\n`;

fs.writeFileSync(path.join(OUT, 'SUMMARY.md'), md);

console.log(`${shots.length} screenshots → ${OUT}`);
console.log(problems.length ? `${problems.length} issue(s) — see ${OUT}/SUMMARY.md` : 'No console errors, no horizontal overflow.');
process.exitCode = problems.length ? 1 : 0;
