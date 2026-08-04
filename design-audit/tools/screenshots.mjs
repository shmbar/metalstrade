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
  // Browser/framework chatter that is not a UI defect
  /favicon|ResizeObserver loop|Download the React DevTools|\[Fast Refresh\]|Vercel Speed Insights/i.test(t) ||
  // Requests we abort ourselves by navigating away or resizing mid-flight.
  // Firestore keeps long-lived Listen channels open; every navigation cancels
  // them. Without this, one route reports dozens of "failures" that are just
  // the harness doing its job — which is what happened on the first run with
  // request capture enabled.
  /net::ERR_ABORTED/i.test(t) ||
  /firestore\.googleapis\.com.*(Listen|Write)\/channel/i.test(t) ||
  // Next.js prefetches routes speculatively; a cancelled prefetch is not a bug
  /_next\/static\/chunks\/.*\.js$/i.test(t) && /ERR_ABORTED/i.test(t)
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
// "Failed to load resource" on its own is useless — capture WHICH resource, and
// with what status, or the finding cannot be acted on.
page.on('requestfailed', (r) => {
  const u = r.url();
  if (isNoise(u)) return;
  problems.push({ ...current, kind: 'reqfailed', text: `${r.failure()?.errorText || 'failed'} :: ${u.slice(0, 160)}` });
});
page.on('response', (r) => {
  if (r.status() < 400) return;
  const u = r.url();
  if (isNoise(u)) return;
  problems.push({ ...current, kind: `http-${r.status()}`, text: u.slice(0, 180) });
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
async function signIn() {
  await page.goto(`${BASE}/signin`, { waitUntil: 'networkidle', timeout: 60000 });
  const e = page.locator('input[type="email"]').first();
  const p = page.locator('input[type="password"]').first();
  await e.fill(email);
  await p.fill(password);
  if ((await e.inputValue()) !== email || !(await p.inputValue())) return false;
  // Tick "Remember me" so Firebase uses LOCAL persistence. Without it the app
  // uses browserSessionPersistence, which is far easier to lose over a long run.
  await page.locator('input[type="checkbox"]').first().check().catch(() => { });
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  try {
    await page.waitForURL(/\/(contracts|dashboard|accounting)/, { timeout: 60000 });
    await page.waitForTimeout(2000);
    return true;
  } catch { return false; }
}

/* Wait until the page has actually rendered its data.
 *
 * The first run screenshotted 6 routes mid-"Loading…" because it waited a flat
 * 1.5s. Poll for the loader to disappear instead. */
async function waitForContent(timeout = 45000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    const loading = await page.evaluate(() => {
      const t = document.body.innerText || '';
      // the app's own full-page loader
      if (/^\s*Loading…?\s*$/i.test(t.trim())) return true;
      if (t.trim().length < 40 && /loading/i.test(t)) return true;
      return false;
    }).catch(() => false);
    if (!loading) return true;
    await page.waitForTimeout(500);
  }
  return false;
}

console.log(`Signing in at ${BASE} …`);
if (!await signIn()) {
  console.error('  ✗ login did not land on an app route.');
  console.error(`    current URL: ${page.url()}`);
  console.error(`    Check the credentials, or that the server is up on ${BASE}`);
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
      // networkidle can never settle on pages with live Firestore listeners
      await page.goto(`${BASE}/${route}`, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => { });
    }

    // Bounced to the login page? Re-authenticate and retry once.
    // Run 1 lost the session partway through and silently screenshotted the
    // sign-in screen for the remaining 44 route-visits — 100 useless images
    // that looked like a completed pass.
    if (/\/signin/.test(page.url())) {
      console.log('    (session dropped — re-authenticating)');
      if (!await signIn()) {
        problems.push({ route, mode, width: 0, kind: 'auth-lost', text: 'session lost and could not re-authenticate' });
        console.log(`  ✗ ${route}  (session lost)`);
        continue;
      }
      await page.goto(`${BASE}/${route}`, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => { });
    }

    if (!await waitForContent()) {
      problems.push({ route, mode, width: 0, kind: 'stuck-loading', text: 'still showing the loading indicator after 45s' });
    }
    await page.waitForTimeout(1200);   // let the last paint settle

    // Never screenshot the login page as if it were the route.
    if (/\/signin/.test(page.url())) {
      problems.push({ route, mode, width: 0, kind: 'auth-lost', text: 'still on /signin after re-auth — not captured' });
      console.log(`  ✗ ${route}  (not captured)`);
      continue;
    }

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
