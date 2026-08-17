/**
 * Real-data profiler for the inventory hot path. Read-only; never writes.
 *
 *   SMOKE_EMAIL=… SMOKE_PASSWORD=… npx vitest run --config vitest.smoke.config.js \
 *     __tests__/perf/_profile-real.smoke.ts
 *
 * WHY IT MEASURES PRODUCTION RATHER THAN FIXTURES
 * The synthetic benchmark next door (inventory.bench.mjs) reported 16 ms at 3,300
 * lots while real data took 1,130 ms. The gap was not row count but GROUP count:
 * production has 670 distinct (warehouse|description) groups against the ~117 the
 * synthetic generator produced, and the old algorithm was O(groups x lots). Trusting
 * the synthetic number would have sent the optimisation at the wrong code entirely.
 * So this stays: any future claim about this path should be made against real data.
 *
 * It also prints the phase breakdown and the document-shape stats, so a regression
 * can be attributed rather than guessed at.
 *
 * Baseline recorded 2026-08-17 (3,249 lots / 670 groups):
 *   group filter loop (old O(n*m))   ~1,000 ms   <- kept below as the reference
 *   computeInventory stocks mode      1,130 ms -> 51 ms after the index
 *   computeInventory cashflow mode    1,188 ms -> 37 ms
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { performance } from 'node:perf_hooks';
import { computeInventory } from '@/features/stocks/aggregate';
import { computeGradeSummary } from '@/features/stocks/gradeSummary';

const completeUserEmail = (u: string) =>
  u.includes('@') ? u : u === 'isims' ? 'isims@is.is' : u === 'isgis' ? 'isgis@is.is' : u.slice(-3) === 'ims' ? u + '@ims-metals.com' : u + '@gismetals.com';

let lots: any[] = [];
let settings: any = {};

describe('profile real inventory', () => {
  beforeAll(async () => {
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
      'profile'
    );
    const cred = await signInWithEmailAndPassword(
      getAuth(app),
      completeUserEmail(process.env.SMOKE_EMAIL || process.env.IMS_TEST_EMAIL || ''),
      process.env.SMOKE_PASSWORD || process.env.IMS_TEST_PASSWORD || ''
    );
    const uid = (await cred.user.getIdTokenResult()).claims.uidCollection as string;
    const db = getFirestore(app);
    const snap = await getDocs(collection(db, uid, 'data', 'stocks'));
    lots = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
    const s = await getDoc(doc(db, uid, 'settings'));
    settings = s.exists() ? s.data() : {};
  }, 180_000);

  it('reports where the time goes', () => {
    const t = (label: string, fn: () => any) => {
      const t0 = performance.now();
      const out = fn();
      // eslint-disable-next-line no-console
      console.log(`    ${label.padEnd(42)} ${(performance.now() - t0).toFixed(0).padStart(7)} ms`);
      return out;
    };

    // ── document shape ──────────────────────────────────────────────────────
    const keyCounts = lots.map((l) => Object.keys(l).length);
    const prodLens = lots.map((l) => (Array.isArray(l.productsData) ? l.productsData.length : 0));
    const jsonSizes = lots.slice(0, 300).map((l) => JSON.stringify(l).length);
    const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
    const max = (a: number[]) => a.reduce((x, y) => (y > x ? y : x), 0);
    // eslint-disable-next-line no-console
    console.log(
      `\n    lots ${lots.length}` +
        `\n    keys/doc          mean ${(sum(keyCounts) / lots.length).toFixed(1)}  max ${max(keyCounts)}` +
        `\n    productsData len  mean ${(sum(prodLens) / lots.length).toFixed(1)}  max ${max(prodLens)}` +
        `\n    JSON bytes/doc    mean ${(sum(jsonSizes) / jsonSizes.length).toFixed(0)}  max ${max(jsonSizes)}\n`
    );

    // ── phase timing ────────────────────────────────────────────────────────
    t('spread + resolveDescriptionName only', () =>
      lots.map((x) => ({
        ...x,
        _n:
          x.type === 'in' && x.description
            ? x.productsData?.find((y: any) => y.id === x.description)?.description || ''
            : x.descriptionText,
      }))
    );

    const uniq = t('unique (stock|description) key build', () => {
      const a = lots
        .filter((q) => q.stock !== '')
        .map((x) => ({ stock: x.stock, description: x.description || x.descriptionId }));
      return Array.from(new Map(a.map((i) => [`${i.stock}|${i.description}`, i])).values());
    });
    // eslint-disable-next-line no-console
    console.log(`    -> ${uniq.length} unique groups  (x ${lots.length} lots = ${(uniq.length * lots.length / 1000).toFixed(0)}k passes)`);

    t('group filter loop ALONE (the O(n*m))', () =>
      uniq.map((item: any) =>
        lots.filter(
          (x) => (x.description === item.description || x.descriptionId === item.description) && x.stock === item.stock
        )
      )
    );

    const inv = t('computeInventory FULL (stocks mode)', () => computeInventory(lots as any, settings));
    t('computeInventory FULL (cashflow mode)', () =>
      computeInventory(lots as any, settings, { minQnty: 0, cashflow: true })
    );
    t('computeGradeSummary', () => computeGradeSummary(inv.rows as any, settings));
    // eslint-disable-next-line no-console
    console.log(`    -> ${inv.rows.length} rows, ${inv.totals.length} totals\n`);

    expect(lots.length).toBeGreaterThan(0);
  });
});
