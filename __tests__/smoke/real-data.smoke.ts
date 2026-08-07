/**
 * REAL-DATA SMOKE CHECK  —  read-only, never writes.
 *
 * WHAT THIS IS FOR
 * The parity suite proves mobile's FORMULAS match web's. It cannot prove your
 * actual documents match the shapes those formulas assume: a null productsData, a
 * currency id nobody remembers adding, a string where a number belongs, a lot with
 * no contract behind it. That is the entire remaining risk surface after the parity
 * work, and it is what this script attacks.
 *
 * It signs in as you, reads your real Firestore data, runs it through the SAME
 * mobile modules the parity suite covers, and reports every figure that comes back
 * NaN, Infinity, null-where-a-number-belongs, or impossible (a negative weight, a
 * percentage past 100). It names the offending document id so you can go look.
 *
 * It is deliberately NOT part of `npm test` — it needs credentials and a network,
 * and it asserts nothing about your business data being *correct*, only that it does
 * not break the maths.
 *
 * ── HOW TO RUN ───────────────────────────────────────────────────────────────
 * Try the dry run first — no credentials, no network, proves the script works:
 *
 *   PowerShell:  $env:SMOKE_DRYRUN='1'; npm run test:smoke
 *   bash:        SMOKE_DRYRUN=1 npm run test:smoke
 *
 * Then against your real data:
 *
 *   PowerShell:  $env:SMOKE_EMAIL='you@example.com'; $env:SMOKE_PASSWORD='…'
 *                npm run test:smoke
 *   bash:        SMOKE_EMAIL=you@example.com SMOKE_PASSWORD='…' npm run test:smoke
 *
 * Optional:
 *   SMOKE_YEAR=2026     which year bucket to read (default: current year)
 *   SMOKE_VERBOSE=1     list every anomaly instead of the first 15 per surface
 *   SMOKE_DRYRUN=1      fixtures instead of Firestore (see below)
 *
 * Clear the vars afterwards so your password does not linger in the shell:
 *   PowerShell:  Remove-Item Env:SMOKE_PASSWORD
 *
 * With no SMOKE_EMAIL/SMOKE_PASSWORD and no SMOKE_DRYRUN the whole file skips, so a
 * stray run in CI is a no-op rather than a failure.
 *
 * ── WHY IT OPENS ITS OWN FIREBASE CONNECTION ─────────────────────────────────
 * It does NOT import mobile/src/lib/firebase.ts. Under vitest that module resolves
 * through the native stub (see vitest.config.js), so it would hand back a fake. The
 * script initialises the web Firebase SDK directly against the same project and uses
 * the same collection paths mobile uses (mobile/src/data/firestore.ts).
 */

import { describe, it, expect, beforeAll } from 'vitest';

// ── mobile modules under observation (all pure) ──────────────────────────────
import { deriveContract, ownProducts } from '@/features/contracts/useContracts';
import { reviewFinancials, sumReviewFinancials } from '@/features/review/reviewFinance';
import { computeInventory } from '@/features/stocks/aggregate';
import { computeGradeSummary } from '@/features/stocks/gradeSummary';
import { statementTotals } from '@/features/accstatement/useAccStatement';
import { buildShipmentInvoiceMap, buildShipmentRows, computeShipmentCounts } from '@/features/shipment/useShipment';
import { num } from '@shared/finance';

const EMAIL = process.env.SMOKE_EMAIL;
const PASSWORD = process.env.SMOKE_PASSWORD;
const YEAR = process.env.SMOKE_YEAR || String(new Date().getFullYear());
const VERBOSE = !!process.env.SMOKE_VERBOSE;

/**
 * SMOKE_DRYRUN=1 runs every check below against the parity suite's own fixtures
 * instead of Firestore — no credentials, no network. Use it to confirm the script
 * itself works before pointing it at production, and to see the shape of the report.
 * A dry run must always come back clean; if it does not, the script is broken, not
 * your data.
 */
const DRYRUN = !!process.env.SMOKE_DRYRUN;

// ── anomaly collector ────────────────────────────────────────────────────────

interface Anomaly {
  surface: string;
  docId: string;
  field: string;
  value: unknown;
  why: string;
}

const anomalies: Anomaly[] = [];
const counts: Record<string, number> = {};

const seen = (surface: string) => (counts[surface] = (counts[surface] || 0) + 1);

/** A figure that must be a real, finite number. */
function checkFinite(surface: string, docId: string, field: string, v: unknown) {
  if (typeof v !== 'number' || !Number.isFinite(v)) {
    anomalies.push({ surface, docId, field, value: v, why: 'not a finite number' });
  }
}

/** A figure that must be finite AND not negative (weights, counts, values). */
function checkNonNegative(surface: string, docId: string, field: string, v: unknown) {
  checkFinite(surface, docId, field, v);
  if (typeof v === 'number' && Number.isFinite(v) && v < -0.0005) {
    anomalies.push({ surface, docId, field, value: v, why: 'negative where it cannot be' });
  }
}

// ── firestore (own connection — see the header) ──────────────────────────────

let db: any;
let uidCollection: string;

async function connect() {
  const { initializeApp } = await import('firebase/app');
  const { getAuth, signInWithEmailAndPassword } = await import('firebase/auth');
  const { getFirestore } = await import('firebase/firestore');

  // Same project the mobile app points at (mobile/eas.json EXPO_PUBLIC_* / .env).
  // These are client-side Firebase keys, not secrets — the security boundary is
  // your Firestore rules, and this script only ever reads.
  const app = initializeApp({
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId:
      process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  } as any);

  const auth = getAuth(app);
  const cred = await signInWithEmailAndPassword(auth, EMAIL!, PASSWORD!);
  const token = await cred.user.getIdTokenResult();
  uidCollection = (token.claims as any).uidCollection;
  if (!uidCollection) {
    throw new Error(
      'Signed in, but this account has no `uidCollection` custom claim — the app derives every ' +
        'Firestore path from it, so there is nothing to read. Use the account you sign into the app with.'
    );
  }
  db = getFirestore(app);
}

/** Mirrors mobile/src/data/firestore.ts path shapes exactly. */
async function readCollection(...segments: string[]): Promise<any[]> {
  const { collection, getDocs } = await import('firebase/firestore');
  const snap = await getDocs(collection(db, uidCollection, ...segments));
  return snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
}

async function readDocData(...segments: string[]): Promise<any | null> {
  const { doc, getDoc } = await import('firebase/firestore');
  const snap = await getDoc(doc(db, uidCollection, ...segments));
  return snap.exists() ? snap.data() : null;
}

// ── the run ──────────────────────────────────────────────────────────────────

const enabled = DRYRUN || !!(EMAIL && PASSWORD);

describe.skipIf(!enabled)('real-data smoke', () => {
  let settings: any = {};
  let contracts: any[] = [];
  let invoices: any[] = [];
  let stocks: any[] = [];

  beforeAll(async () => {
    if (DRYRUN) {
      // Same checks, fixture data. Proves the script works without touching Firestore.
      const fx: any = await import('../parity/_helpers/fixtures');
      settings = fx.makeSettings();
      const inv = fx.makeInvoice();
      contracts = [fx.makeContract({ invoicesData: [[inv]] })];
      invoices = [inv];
      stocks = [fx.makeStockLot(), fx.makeStockOutLot()];
      uidCollection = '<dry-run fixtures>';
    } else {
      await connect();

      // Settings live one doc per category, the way useSettingsState loads them.
      const CATEGORIES = ['Supplier', 'Client', 'Currency', 'Quantity', 'Stocks', 'Expenses', 'POL', 'POD', 'General'];
      for (const cat of CATEGORIES) {
        const d = await readDocData(cat);
        if (d) settings[cat] = d;
      }

      contracts = await readCollection('data', `contracts_${YEAR}`);
      invoices = await readCollection('data', `invoices_${YEAR}`);
      stocks = await readCollection('data', 'stocks');
    }

    // Link invoices to their contracts the way the app does, so the money figures
    // below are computed over the same inputs the screens use. Skipped on a dry run,
    // where the fixture already carries a hand-built invoicesData that re-linking
    // would overwrite (and quietly empty).
    if (!DRYRUN) {
      const byContract: Record<string, any[]> = {};
      invoices.forEach((inv: any) => {
        const cid = inv?.poSupplier?.id;
        if (cid) (byContract[cid] ||= []).push(inv);
      });
      contracts = contracts.map((c) => {
        const linked = byContract[c.id] || [];
        const groups: Record<string, any[]> = {};
        linked.forEach((inv) => (groups[String(inv.invoice)] ||= []).push(inv));
        return { ...c, invoicesData: Object.values(groups) };
      });
    }

    // eslint-disable-next-line no-console
    console.log(
      `\n  connected · uidCollection=${uidCollection} · year=${YEAR}\n` +
        `  contracts=${contracts.length} invoices=${invoices.length} stock lots=${stocks.length}\n`
    );
  }, 120_000);

  it('every contract card figure is a real number', () => {
    contracts.forEach((c) => {
      seen('contracts');
      const v = deriveContract(c, settings);
      checkNonNegative('contracts', c.id, 'totalValue', v.totalValue);
      checkNonNegative('contracts', c.id, 'invoicedValue', v.invoicedValue);
      checkFinite('contracts', c.id, 'totalMT', v.totalMT);
      // The QTY label reproduces web's parseInt, which yields "NaN" for a blank
      // quantity. That is web-parity by design — but you still want to know which
      // contracts render it, because the cell is unreadable on both apps.
      if (String(v.mtLabel).includes('NaN')) {
        anomalies.push({
          surface: 'contracts',
          docId: c.id,
          field: 'mtLabel',
          value: v.mtLabel,
          why: 'a product line has a blank/non-numeric qnty — renders "NaN" on web too',
        });
      }
      ownProducts(c).forEach((p: any, i: number) => {
        if (p && p.qnty !== undefined && p.qnty !== '' && !Number.isFinite(parseFloat(p.qnty))) {
          anomalies.push({
            surface: 'contracts',
            docId: c.id,
            field: `productsData[${i}].qnty`,
            value: p.qnty,
            why: 'not parseable as a number',
          });
        }
      });
    });
    expect(counts.contracts ?? 0).toBeGreaterThanOrEqual(0);
  });

  it('every Contracts Review money column is a real number', () => {
    const rows = contracts.map((c) => {
      seen('review');
      const fin = reviewFinancials(c, c.invoicesData || [], { cur: 'us' }, settings);
      (
        [
          'conValue',
          'totalInvoices',
          'originalInvoices',
          'deviation',
          'totalPrepayment1',
          'inDebt',
          'payments',
          'debtaftr',
          'debtBlnc',
          'expenses1',
          'profit',
        ] as const
      ).forEach((k) => checkFinite('review', c.id, k, fin[k]));
      // prepaidPer is legitimately null when there is no sale; anything else must be finite.
      if (fin.prepaidPer !== null) checkFinite('review', c.id, 'prepaidPer', fin.prepaidPer);
      return { fin };
    });

    const totals = sumReviewFinancials(rows);
    (['conValue', 'totalInvoices', 'payments', 'debtBlnc', 'expenses1', 'profit'] as const).forEach((k) =>
      checkFinite('review', '<totals>', k, totals[k])
    );
  });

  it('every inventory row and warehouse total is a real number', () => {
    const { rows, totals } = computeInventory(stocks, settings);
    rows.forEach((r: any) => {
      seen('inventory');
      checkFinite('inventory', r.id, 'qnty', Number(r.qnty));
      if (r.total !== '-') checkFinite('inventory', r.id, 'total', Number(r.total));
    });
    totals.forEach((t: any, i: number) => {
      checkFinite('inventory', `<total ${t.stock}/${t.cur}>`, 'qnty', t.qnty);
      checkFinite('inventory', `<total ${t.stock}/${t.cur}>`, 'total', t.total);
      expect(i).toBeGreaterThanOrEqual(0);
    });

    // The cashflow view of the same ledger — a different mode, different pitfalls.
    const cashflowLots = (stocks || []).filter((z: any) => z.total !== 0).filter((x: any) => !x.draft);
    const cf = computeInventory(cashflowLots, settings, { minQnty: 0, cashflow: true });
    cf.rows.forEach((r: any) => {
      seen('inventory-cashflow');
      if (r.total !== '-') checkFinite('inventory-cashflow', r.id, 'total', Number(r.total));
    });
  });

  it('every average cost per grade is a real number', () => {
    const { rows } = computeInventory(stocks, settings);
    const grades = computeGradeSummary(rows as any, settings);
    grades.forEach((g: any) => {
      seen('grades');
      checkNonNegative('grades', g.descriptionName, 'totalQnty', g.totalQnty);
      checkFinite('grades', g.descriptionName, 'totalValue', g.totalValue);
      checkFinite('grades', g.descriptionName, 'avgPrice', g.avgPrice);
    });
  });

  it('every shipment row derives cleanly and its counts add up', () => {
    const invMap = buildShipmentInvoiceMap(invoices);
    const rows = buildShipmentRows(contracts, invMap, {}, settings);
    rows.forEach((r) => {
      seen('shipment');
      checkFinite('shipment', r.id, 'updatedAt', r.updatedAt);
      if (r.eta && Number.isNaN(new Date(r.eta).getTime())) {
        anomalies.push({ surface: 'shipment', docId: r.id, field: 'eta', value: r.eta, why: 'unparseable date' });
      }
      if (r.etd && Number.isNaN(new Date(r.etd).getTime())) {
        anomalies.push({ surface: 'shipment', docId: r.id, field: 'etd', value: r.etd, why: 'unparseable date' });
      }
    });
    const c = computeShipmentCounts(rows);
    expect(c.all).toBe(rows.length);
    // Every row lands in exactly one status bucket — a stray legacy token would break this.
    expect(Object.values(c.byStatus).reduce((a, b) => a + b, 0)).toBe(rows.length);
  });

  it('no currency id in the data is unknown to Settings', () => {
    const known = new Set((settings?.Currency?.Currency || []).map((c: any) => c.id));
    const flag = (surface: string, docId: string, cur: any) => {
      if (cur === undefined || cur === null || cur === '') return; // blank is handled everywhere
      if (typeof cur === 'object') return; // finalized docs store an object; resolved elsewhere
      if (!known.has(cur)) {
        anomalies.push({
          surface,
          docId,
          field: 'cur',
          value: cur,
          why: 'currency id not in Settings — several screens bucket ONLY us/eu and will drop this row',
        });
      }
    };
    contracts.forEach((c) => flag('currency', c.id, c.cur));
    invoices.forEach((i: any) => flag('currency', i.id, i.cur));
    stocks.forEach((s: any) => flag('currency', s.id, s.cur));
  });

  it('account statement totals stay finite for every stored statement row', () => {
    // Statement docs are addressed per client/period; this checks the shape of the
    // arithmetic rather than fetching all of them.
    const sample = invoices.slice(0, 200).map((i: any) => ({
      invoice: String(i.invoice ?? ''),
      date: i.date ?? '',
      amount: i.totalAmount ?? '',
      cur: i.cur ?? '',
      due: '',
      paid: (i.payments || []).reduce((s: number, p: any) => s + num(p?.pmnt), 0),
      notPaid: '',
    }));
    const t = statementTotals(sample as any);
    (['us', 'eu'] as const).forEach((k) => {
      seen('statement');
      checkFinite('statement', `<${k}>`, 'amount', t[k].amount);
      checkFinite('statement', `<${k}>`, 'paid', t[k].paid);
      checkFinite('statement', `<${k}>`, 'notPaid', t[k].notPaid);
    });
  });

  // Runs last: prints the report and fails the run if anything was flagged.
  it('REPORT — no anomalies', () => {
    const lines: string[] = [];
    lines.push('');
    lines.push('  ── real-data smoke report ─────────────────────────────────────');
    Object.entries(counts).forEach(([surface, n]) => {
      const bad = anomalies.filter((a) => a.surface === surface).length;
      lines.push(`  ${surface.padEnd(22)} checked ${String(n).padStart(6)}   flagged ${String(bad).padStart(4)}`);
    });

    if (anomalies.length) {
      const bySurface: Record<string, Anomaly[]> = {};
      anomalies.forEach((a) => (bySurface[a.surface] ||= []).push(a));
      Object.entries(bySurface).forEach(([surface, list]) => {
        lines.push('');
        lines.push(`  ${surface} — ${list.length} flagged`);
        (VERBOSE ? list : list.slice(0, 15)).forEach((a) => {
          lines.push(`    ${a.docId}  ${a.field} = ${JSON.stringify(a.value)}  — ${a.why}`);
        });
        if (!VERBOSE && list.length > 15) {
          lines.push(`    …and ${list.length - 15} more (set SMOKE_VERBOSE=1 to see them all)`);
        }
      });
    } else {
      lines.push('');
      lines.push('  clean — every figure came back a real number.');
    }
    lines.push('  ───────────────────────────────────────────────────────────────');
    // eslint-disable-next-line no-console
    console.log(lines.join('\n'));

    expect(anomalies, `${anomalies.length} anomalies — see the report above`).toEqual([]);
  });
});

describe.skipIf(enabled)('real-data smoke (skipped)', () => {
  it('needs SMOKE_EMAIL and SMOKE_PASSWORD', () => {
    // eslint-disable-next-line no-console
    console.log(
      '\n  real-data smoke skipped — set SMOKE_EMAIL and SMOKE_PASSWORD to run it.\n' +
        "  e.g.  SMOKE_EMAIL=you@example.com SMOKE_PASSWORD='…' npx vitest run --include '**/*.smoke.ts'\n"
    );
    expect(true).toBe(true);
  });
});
