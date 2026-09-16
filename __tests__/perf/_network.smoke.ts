/**
 * READ-ONLY: what each screen has to DOWNLOAD before it can draw, with real data.
 * The compute profile said the maths is fast (52ms worst), so "the app feels stuck"
 * had to be measured here instead.
 *   SMOKE_EMAIL=… SMOKE_PASSWORD=… npx vitest run --config vitest.smoke.config.js __tests__/perf/_network.smoke.ts
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { performance } from 'node:perf_hooks';

const completeUserEmail = (u: string) =>
  u.includes('@') ? u : u.slice(-3) === 'ims' ? u + '@ims-metals.com' : u + '@gismetals.com';

let db: any, uid: string, F: any;
const rows: { label: string; ms: number; docs: number; kb: number }[] = [];

describe.skipIf(!process.env.SMOKE_EMAIL)('network profile', () => {
  beforeAll(async () => {
    const { initializeApp } = await import('firebase/app');
    const { getAuth, signInWithEmailAndPassword } = await import('firebase/auth');
    F = await import('firebase/firestore');
    const app = initializeApp({
      apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
    } as any, 'net-profile');
    const cred = await signInWithEmailAndPassword(
      getAuth(app),
      completeUserEmail(process.env.SMOKE_EMAIL || ''),
      process.env.SMOKE_PASSWORD || ''
    );
    uid = (await cred.user.getIdTokenResult()).claims.uidCollection as string;
    db = F.getFirestore(app);
  }, 300_000);

  it('times every collection a screen waits for', async () => {
    const y = new Date().getFullYear();
    const grab = async (label: string, ...seg: string[]) => {
      const t0 = performance.now();
      const snap = await F.getDocs(F.collection(db, uid, ...seg)).catch(() => null);
      const ms = performance.now() - t0;
      const docs = snap ? snap.docs.length : 0;
      const kb = snap ? Math.round(JSON.stringify(snap.docs.map((d: any) => d.data())).length / 1024) : 0;
      rows.push({ label, ms, docs, kb });
    };
    await grab('stocks (all lots)', 'data', 'stocks');
    await grab(`contracts_${y}`, 'data', `contracts_${y}`);
    await grab(`contracts_${y - 1}`, 'data', `contracts_${y - 1}`);
    await grab(`invoices_${y}`, 'data', `invoices_${y}`);
    await grab(`invoices_${y - 1}`, 'data', `invoices_${y - 1}`);
    await grab(`expenses_${y}`, 'data', `expenses_${y}`);
    await grab('companyExpenses', 'data', 'companyExpenses');
    await grab('specialinvoices', 'data', 'specialinvoices');
    await grab('salescontracts', 'data', 'salescontracts');

    const t0 = performance.now();
    await F.getDoc(F.doc(db, uid, 'settings'));
    rows.push({ label: 'settings doc', ms: performance.now() - t0, docs: 1, kb: 0 });

    rows.sort((a, b) => b.ms - a.ms);
    const lines = ['', '  -- what a screen waits for (laptop wifi; a phone on 4G is 2-5x slower) --'];
    rows.forEach((r) => lines.push('  ' + r.label.padEnd(24) + String(Math.round(r.ms)).padStart(6) + ' ms  ' + String(r.docs).padStart(5) + ' docs  ' + String(r.kb).padStart(6) + ' KB'));
    lines.push('  ' + 'TOTAL'.padEnd(24) + String(Math.round(rows.reduce((a, r) => a + r.ms, 0))).padStart(6) + ' ms  ' + String(rows.reduce((a, r) => a + r.docs, 0)).padStart(5) + ' docs  ' + String(rows.reduce((a, r) => a + r.kb, 0)).padStart(6) + ' KB');
    console.log(lines.join(String.fromCharCode(10)));
    expect(rows.length).toBeGreaterThan(0);
  }, 300_000);
});
