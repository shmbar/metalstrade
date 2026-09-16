/**
 * WHOLE-APP profiler — every screen's pure core, timed against REAL production data.
 * Read-only; never writes.
 *
 *   SMOKE_EMAIL=… SMOKE_PASSWORD=… npx vitest run --config vitest.smoke.config.js \
 *     __tests__/perf/_profile-app.smoke.ts
 *
 * WHY
 * The client said the app "sometimes gets stuck". One cause was found and fixed
 * (computeInventory, 1,130ms -> 51ms). "Sometimes" implies more than one trigger,
 * and the fix for the first one was only found by measuring PRODUCTION data — the
 * synthetic benchmark said 16ms where reality said 1,130ms, because production has
 * 670 groups against the generator's 117. So every remaining path gets the same
 * treatment rather than a reading of the code.
 *
 * React Native runs JS on one thread. Anything here costing more than ~100ms is a
 * visible stutter on a phone (3-6x slower than this laptop); more than ~500ms is a
 * freeze the user will call a bug.
 *
 * Sorted worst-first so the next thing to fix is the top line.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { performance } from 'node:perf_hooks';

import { computeInventory } from '@/features/stocks/aggregate';
import { computeGradeSummary } from '@/features/stocks/gradeSummary';
import { computeAging } from '@/features/stocks/aging';
import { buildAudit } from '@/features/stocks/audit';
import { computeCashflow, cashflowYearRanges } from '@/features/cashflow/useCashflow';
import { computePnl } from '@/features/dashboard/pnlChain';
import { computeInvoicesReview } from '@/features/review/reviewCore';
import { groupAccounting } from '@/features/accounting/accountingCore';
import { buildShipmentInvoiceMap, buildShipmentRows, filterShipmentRows } from '@/features/shipment/useShipment';

const completeUserEmail = (u: string) =>
  u.includes('@')
    ? u
    : u === 'isims'
      ? 'isims@is.is'
      : u === 'isgis'
        ? 'isgis@is.is'
        : u.slice(-3) === 'ims'
          ? u + '@ims-metals.com'
          : u + '@gismetals.com';

const YEAR = Number(process.env.SMOKE_YEAR) || new Date().getFullYear();

let db: any;
let uid: string;
const D: any = { contracts: [], invoices: [], stocks: [], margins: [], expenses: [], companyExpenses: [], settings: {} };

/** label -> ms, collected then printed worst-first. */
const results: { label: string; ms: number; note: string }[] = [];

function time(label: string, fn: () => any, note = '') {
  let out: any;
  try {
    fn(); // warm up: first call pays JIT
    const t0 = performance.now();
    out = fn();
    results.push({ label, ms: performance.now() - t0, note });
  } catch (e: any) {
    results.push({ label, ms: -1, note: 'ERROR ' + (e?.message || '').slice(0, 60) });
  }
  return out;
}

const load = async () => {
    const { initializeApp } = await import('firebase/app');
    const { getAuth, signInWithEmailAndPassword } = await import('firebase/auth');
    const { getFirestore, collection, getDocs, doc, getDoc } = await import('firebase/firestore');

    const app = initializeApp(
      {
        apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
        storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
      } as any,
      'app-profile'
    );
    const cred = await signInWithEmailAndPassword(
      getAuth(app),
      completeUserEmail(process.env.SMOKE_EMAIL || process.env.IMS_TEST_EMAIL || ''),
      process.env.SMOKE_PASSWORD || process.env.IMS_TEST_PASSWORD || ''
    );
    uid = (await cred.user.getIdTokenResult()).claims.uidCollection as string;
    db = getFirestore(app);

    const coll = async (...seg: string[]) =>
      (await getDocs(collection(db, uid, ...seg))).docs.map((d: any) => ({ id: d.id, ...d.data() }));

    // Same year windows the screens themselves load.
    const years = [YEAR - 1, YEAR];
    for (const y of years) {
      D.contracts.push(...(await coll('data', `contracts_${y}`).catch(() => [])));
      D.invoices.push(...(await coll('data', `invoices_${y}`).catch(() => [])));
      D.expenses.push(...(await coll('data', `expenses_${y}`).catch(() => [])));
      D.margins.push(...(await coll('margins', String(y)).catch(() => [])));
    }
    D.stocks = await coll('data', 'stocks');
    D.companyExpenses = await coll('data', 'companyExpenses').catch(() => []);
    const s = await getDoc(doc(db, uid, 'settings'));
    D.settings = s.exists() ? s.data() : {};

    // Link invoices to contracts the way every screen does.
    const byContract: Record<string, any[]> = {};
    D.invoices.forEach((inv: any) => {
      const cid = inv?.poSupplier?.id;
      if (cid) (byContract[cid] ||= []).push(inv);
    });
    D.contracts = D.contracts.map((c: any) => {
      const groups: Record<string, any[]> = {};
      (byContract[c.id] || []).forEach((inv) => (groups[String(inv.invoice)] ||= []).push(inv));
      return { ...c, invoicesData: Object.values(groups) };
    });

    // eslint-disable-next-line no-console
    console.log(
      `\n  ${D.contracts.length} contracts · ${D.invoices.length} invoices · ${D.stocks.length} lots · ` +
        `${D.expenses.length} expenses · ${D.margins.length} margin months\n`
    );
};

describe('screen shape (how many rows a screen renders at once)', () => {
  beforeAll(load, 300_000);

  it('counts rows per section', () => {
    const st = D.settings;
    const cf: any = computeCashflow({
      invoices: D.invoices, contracts4y: D.contracts, contracts2y: D.contracts,
      expenses: D.expenses, companyExpenses: D.companyExpenses, margins: D.margins,
      cashflowDoc: {}, stocks: D.stocks, settings: st,
    });
    const inv = computeInventory(D.stocks, st);
    const counts: [string, number][] = [
      ['cashflow · Stocks - Paid', cf.stocksPaid.length],
      ['cashflow · Stocks - UnPaid', cf.stocksUnpaid.length],
      ['cashflow · Clients - Payment', cf.clientsNoPayment?.length ?? 0],
      ['cashflow · Clients - Balances', cf.clientsWithBalance?.length ?? 0],
      ['cashflow · Suppliers', cf.suppliers?.length ?? 0],
      ['cashflow · Expenses', cf.expenses?.length ?? 0],
      ['cashflow · Unsold by supplier', cf.unsoldBySupplier.length],
      ['stocks · inventory rows', inv.rows.length],
      ['contracts · cards', D.contracts.length],
      ['invoices · cards', D.invoices.length],
      ['expenses · cards', D.expenses.length],
    ];
    const total = counts.filter(([k]) => k.startsWith('cashflow')).reduce((a, [, n]) => a + n, 0);
    const lines = ['', '  -- rows rendered at once (real data) --'];
    counts.sort((a, b) => b[1] - a[1]).forEach(([k, n]) => lines.push('  ' + k.padEnd(34) + String(n).padStart(5)));
    lines.push('  ' + 'CASHFLOW TOTAL rows in one ScrollView'.padEnd(34) + String(total).padStart(5));
    console.log(lines.join(String.fromCharCode(10)));
    expect(total).toBeGreaterThan(0);
  });
});
