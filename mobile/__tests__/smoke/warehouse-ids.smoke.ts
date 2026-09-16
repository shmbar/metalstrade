/**
 * READ-ONLY diagnosis: which stock lots point at a warehouse id that Settings → Stocks
 * does not contain, and where (if anywhere) that id is defined instead.
 *
 * Run (credentials only in the environment, never in a file):
 *   DIAG_EMAIL=… DIAG_PASSWORD=… (from repo root) npx vitest run --config vitest.smoke.config.js mobile/__tests__/smoke/warehouse-ids.smoke.ts
 * Skipped unless both are set. Performs no writes.
 */
import { describe, it } from 'vitest';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc, getDocs, collection } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

const EMAIL = process.env.DIAG_EMAIL;
const PASSWORD = process.env.DIAG_PASSWORD;
const GIS = 'aB3dE7FgHi9JkLmNoPqRsTuVwGIS';

const tryRead = async <T>(fn: () => Promise<T>): Promise<T | string> => {
  try {
    return await fn();
  } catch (e: any) {
    return `unreadable (${e?.code || e?.message})`;
  }
};

describe.skipIf(!EMAIL || !PASSWORD)('warehouse id diagnosis (read-only)', () => {
  it('reports unresolved warehouse ids', async () => {
    const cred = await signInWithEmailAndPassword(auth, EMAIL!, PASSWORD!);
    const token = await cred.user.getIdTokenResult();
    const uid = String(token.claims.uidCollection);
    console.log('workspace', uid === GIS ? 'GIS' : uid.slice(0, 6) + '…');

    const settings = (await getDoc(doc(db, uid, 'settings'))).data() as any;
    const own = (settings?.Stocks?.Stocks || []) as any[];
    const ownIds = new Set(own.map((s) => s.id));
    console.log('Settings → Stocks entries:', own.length, '(deleted flagged:', own.filter((s) => s.deleted).length + ')');

    const lots = (await getDocs(collection(db, uid, 'data', 'stocks'))).docs.map((d) => d.data() as any);
    const missing = new Map<string, { lots: number; total: number; sample: any }>();
    for (const l of lots) {
      if (!l.stock || ownIds.has(l.stock)) continue;
      const m = missing.get(l.stock) || { lots: 0, total: 0, sample: l };
      m.lots += 1;
      m.total += Number(l.total) || 0;
      missing.set(l.stock, m);
    }
    console.log('lots:', lots.length, '· lots with an unknown warehouse id:', [...missing.values()].reduce((a, m) => a + m.lots, 0));

    const gisSettings = await tryRead(async () => (await getDoc(doc(db, GIS, 'settings'))).data() as any);
    const gisStocks = typeof gisSettings === 'string' ? null : ((gisSettings?.Stocks?.Stocks || []) as any[]);
    const sharedSettings = await tryRead(async () => (await getDoc(doc(db, 'SHARED_STOCK', 'settings'))).data() as any);
    console.log('GIS settings:', typeof gisSettings === 'string' ? gisSettings : `${gisStocks?.length} warehouses`);
    console.log('SHARED_STOCK settings:', typeof sharedSettings === 'string' ? sharedSettings : sharedSettings ? 'present' : 'none');

    // Ids seen on a device, by prefix: where are they defined, and how are they flagged?
    for (const prefix of String(process.env.DIAG_IDS || '').split(',').filter(Boolean)) {
      const where = (list: any[] | null, label: string) =>
        (list || [])
          .filter((s) => String(s.id).startsWith(prefix))
          .map((s) => `${label}: "${s.nname || s.stock}" deleted=${!!s.deleted} keys=${Object.keys(s).sort().join(',')}`);
      const lotsHere = lots.filter((l) => String(l.stock).startsWith(prefix));
      console.log(`\n${prefix}: ${[...where(own, 'IMS'), ...where(gisStocks, 'GIS')].join(' | ') || 'not in any settings'} · IMS lots=${lotsHere.length}`);
    }

    for (const [id, m] of missing) {
      const inGis = gisStocks?.find((s) => s.id === id);
      const s = m.sample;
      const nameish = Object.fromEntries(Object.entries(s).filter(([k, v]) => /name|stock|ware|wh/i.test(k) && typeof v === 'string' && String(v).length < 80));
      console.log(
        `\n${id.slice(0, 8)}… lots=${m.lots} total=${Math.round(m.total)} inGIS=${inGis ? `yes → "${inGis.nname || inGis.stock}"` : 'no'}`,
        '\n  lot fields:', Object.keys(s).sort().join(','),
        '\n  name-like:', JSON.stringify(nameish),
        '\n  contract:', s.order || s.poSupplier?.order || '', 'supplier:', s.supplier || '', 'date:', s.date || s.indDate?.startDate || ''
      );
    }
    await signOut(auth);
  }, 120_000);
});
