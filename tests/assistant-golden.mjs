// Golden-question suite for the AI Assistant.
//
// Logs into the running app, scrapes ground-truth numbers from the app's OWN
// pages (Stocks grade table, Margins profit stat, contract count), then asks the
// Assistant a fixed set of canonical questions and asserts each answer against
// that ground truth (numeric) or against required structure (sections, units,
// currency amounts). Any drift — a broken tool, a prompt regression, a model
// that starts inventing conversions — fails the run.
//
// Run:
//   1. npx playwright install chromium          (once)
//   2. Start the app (npm run dev, or next start)
//   3. IMS_TEST_USER=... IMS_TEST_PASS=... [IMS_TEST_URL=http://localhost:3000] \
//      npm run test:assistant
//
// Notes:
//   • READ-ONLY: navigation + chat questions only; never clicks Save/Delete/payments.
//   • Each assistant question is a real OpenAI round trip — expect ~4-6 minutes
//     and normal API usage for ~12 questions.
//   • Credentials come from env vars only. Never hardcode them here.

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const BASE = process.env.IMS_TEST_URL || 'http://localhost:3000';
const USER = process.env.IMS_TEST_USER;
const PASS = process.env.IMS_TEST_PASS;
if (!USER || !PASS) {
  console.error('Set IMS_TEST_USER and IMS_TEST_PASS env vars (never hardcode credentials).');
  process.exit(2);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ART = path.join(__dirname, 'artifacts');
fs.mkdirSync(ART, { recursive: true });

const num = (s) => parseFloat(String(s).replace(/[,$€\s]/g, '')) || 0;
const approx = (a, b, tol = 0.51) => Math.abs(a - b) <= tol;
// Tolerant of model phrasing: "USD 5,000", "USD: 5,000", "$5,000", "€ 5,000".
const CURRENCY_RE = /(USD|EUR|\$|€)[:\s]{0,2}-?[\d,]+(\.\d+)?/;

// The quick-action buttons render as static text after the chat messages; cut
// them (and everything after) so (a) chrome is never mistaken for an answer and
// (b) a question that equals a quick-action label resolves to the chat bubble,
// not the button.
const stripChrome = (s) =>
  s.split(/Show overdue invoices\s*\n\s*Which client owes the most\?/)[0];

async function ask(page, q) {
  const input = page.locator('textarea, input[type="text"]').last();
  await input.fill(q);
  await input.press('Enter');
  // Wait for the streamed answer to appear AND stabilise (2 identical reads of a
  // NON-EMPTY post-question delta — tool round trips can take 15s+ before the
  // first token, so an empty/chrome-only delta must never count as stable).
  let prev = null, stable = 0;
  for (let i = 0; i < 45; i++) {
    await page.waitForTimeout(1500);
    const body = stripChrome(await page.locator('body').innerText());
    const idx = body.lastIndexOf(q);
    const after = idx >= 0 ? body.slice(idx + q.length).trim() : '';
    // require some content beyond the question's own timestamp line
    const meaningful = after.replace(/\d{1,2}:\d{2}\s*(AM|PM)?/gi, '').trim();
    if (meaningful.length > 20) {
      if (after === prev) { if (++stable >= 2) return after; }
      else { stable = 0; prev = after; }
    }
  }
  return prev || '';
}

async function resetChat(page) {
  const r = page.locator('button:has-text("Reset")').first();
  if (await r.count()) { await r.click().catch(() => {}); await page.waitForTimeout(1000); }
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1600, height: 950 } });
  page.on('pageerror', (e) => console.log('  [pageerror]', String(e).slice(0, 160)));

  // ---- login ----
  await page.goto(BASE + '/signin', { waitUntil: 'load', timeout: 45000 });
  await page.locator('input').first().fill(USER);
  await page.locator('input[type="password"]').first().fill(PASS);
  await page.locator('button:has-text("Sign In")').first().click();
  await page.waitForURL((u) => !String(u).includes('/signin'), { timeout: 30000 });
  console.log('login: OK');

  // ---- ground truth 1: top grade + net qty from the Stocks page ----
  await page.goto(BASE + '/stocks', { waitUntil: 'load', timeout: 45000 });
  await page.waitForTimeout(10000);
  const grade = await page.evaluate(() => {
    const h = [...document.querySelectorAll('*')].find((el) =>
      el.childElementCount === 0 && /Avg Cost Price per Grade/i.test(el.textContent || ''));
    if (!h) return null;
    const table = h.closest('div')?.parentElement?.querySelector('table')
      || h.parentElement?.querySelector('table');
    const row = table?.querySelector('tbody tr');
    if (!row) return null;
    const cells = [...row.querySelectorAll('td')].map((td) => td.innerText.trim());
    return { desc: cells[0], qty: cells[1] };
  });
  if (!grade) { console.error('BLOCKED: could not scrape the Stocks grade table.'); process.exit(2); }
  const stockQty = num(grade.qty);
  console.log(`ground truth (stocks): "${grade.desc}" = ${stockQty}`);

  // ---- ground truth 2: Profits stat from the Margins page ----
  await page.goto(BASE + '/margins', { waitUntil: 'load', timeout: 45000 });
  await page.waitForTimeout(9000);
  const marginsBody = await page.locator('body').innerText();
  const profitMatch = marginsBody.match(/Profits:?\s*\$?\s*(-?[\d,]+(?:\.\d+)?)/i);
  const profitTruth = profitMatch ? num(profitMatch[1]) : null;
  console.log('ground truth (margins Profits):', profitTruth);

  // ---- assistant page + ground truth 3: contracts chip count ----
  await page.goto(BASE + '/apps/Assistant', { waitUntil: 'load', timeout: 45000 });
  await page.waitForTimeout(12000);
  const chipMatch = (await page.locator('body').innerText()).match(/(\d+)\s*Contracts/);
  const contractCount = chipMatch ? parseInt(chipMatch[1], 10) : null;
  console.log('ground truth (contracts chip):', contractCount);

  // ---- the golden questions ----
  const results = [];
  const run = async (name, question, assertFn, { noReset = false } = {}) => {
    if (!noReset) await resetChat(page);
    let answer = await ask(page, question);
    // One retry on transient API failures (rate limits under back-to-back questions).
    if (/encountered an error|Failed to process/i.test(answer)) {
      await page.waitForTimeout(8000);
      await resetChat(page);
      answer = await ask(page, question);
    }
    let pass = false, note = '';
    try { const r = assertFn(answer); pass = r === true || r?.pass; note = r?.note || ''; }
    catch (e) { note = 'assert threw: ' + e.message; }
    results.push({ name, pass, note, sample: answer.trim().replace(/\s+/g, ' ').slice(0, 160) });
    await page.screenshot({ path: path.join(ART, `${results.length}-${name.replace(/\W+/g, '_')}.png`) });
    console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${note ? '  — ' + note : ''}`);
  };

  // 1+2: stock quantity matches the Stocks page, and the "in MT" follow-up
  //      repeats the SAME number instead of inventing a /1000 conversion.
  await run('stock-qty-matches-page', `How much ${grade.desc} do I have in stock?`, (a) => {
    const hit = (a.match(/-?[\d,]+\.\d+|-?[\d,]+/g) || []).map(num).some((n) => approx(n, stockQty));
    return { pass: hit, note: `expect ≈ ${stockQty}` };
  });
  await run('stock-unit-follow-up', 'In MT', (a) => {
    const nums = (a.match(/-?[\d,]+\.\d+|-?[\d,]+/g) || []).map(num);
    const sameNum = nums.some((n) => approx(n, stockQty));
    const converted = nums.some((n) => n > 0 && approx(n, stockQty / 1000, stockQty / 1000 * 0.01));
    return { pass: sameNum && !converted && /MT|metric/i.test(a), note: 'must repeat same number, no /1000' };
  }, { noReset: true }); // follow-up needs the prior turn in context

  // 3: profit total matches the Margins page Profits stat
  if (profitTruth != null) {
    await run('profit-matches-margins-page', 'What is my total profit?', (a) => {
      const hit = (a.match(/-?[\d,]+\.\d+|-?[\d,]+/g) || []).map(num).some((n) => approx(n, profitTruth, 1));
      return { pass: hit, note: `expect ≈ ${profitTruth}` };
    });
  }

  // 4: contract breakdown total equals the loaded contract count
  if (contractCount != null) {
    await run('contract-count-matches-chip', 'Contract status breakdown', (a) =>
      ({ pass: new RegExp(`Total:?\\s*${contractCount}\\s*contracts`, 'i').test(a) || a.includes(`${contractCount} contracts`), note: `expect total ${contractCount}` }));
  }

  // 5-12: structural contracts — required sections/annotations/amounts present
  // "Nd overdue" annotations are only required when a red DUE section exists —
  // a wording like "here are the overdue invoices" over a BALANCE-only list is fine.
  await run('overdue-sections-preserved', 'Show overdue invoices', (a) => {
    const hasSections = /DUE INVOICES|BALANCE INVOICES|No unpaid invoices/i.test(a);
    const hasDueSection = /🔴|DUE INVOICES —/i.test(a);
    const keepsOverdueDays = /\d+\s*d(ays)?\s+overdue/i.test(a);
    return { pass: hasSections && (!hasDueSection || keepsOverdueDays), note: 'sections + per-line "Nd overdue" when due items exist' };
  });
  await run('debt-ranking-has-amounts', 'Which client owes the most?', (a) =>
    CURRENCY_RE.test(a) || /No outstanding balances/i.test(a));
  await run('revenue-summary', 'What are my sales this year?', (a) =>
    (/invoiced|sales/i.test(a) && CURRENCY_RE.test(a)) || /No final invoices/i.test(a));
  await run('unpaid-expenses', 'Show unpaid expenses', (a) =>
    /unpaid expense/i.test(a) || /No unpaid expenses/i.test(a));
  await run('margin-alerts', 'Any margin alerts?', (a) => /margin/i.test(a));
  await run('cash-forecast', 'What is my cash forecast?', (a) =>
    /net|inflow|outflow|forecast/i.test(a));
  await run('shipments', 'Where are my shipments?', (a) =>
    /ETD|ETA|shipment/i.test(a));
  await run('monthly-sales', 'Show monthly sales', (a) =>
    /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/.test(a) || /No final invoices/i.test(a));

  // ---- report ----
  const failed = results.filter((r) => !r.pass);
  console.log('\n================ GOLDEN QUESTION RESULTS ================');
  results.forEach((r) => console.log(`${r.pass ? '✅' : '❌'} ${r.name}${r.note ? ` (${r.note})` : ''}\n     ${r.sample}`));
  console.log(`\n${results.length - failed.length}/${results.length} passed. Screenshots in tests/artifacts/.`);
  await browser.close();
  process.exit(failed.length ? 1 : 0);
})().catch((e) => { console.error('HARNESS FAILURE:', e); process.exit(2); });
