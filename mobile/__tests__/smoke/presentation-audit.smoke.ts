/**
 * READ-ONLY: inventory every test-looking string the demo workspace would put in an
 * App Store screenshot. Performs no writes.
 *   (from repo root) DIAG_EMAIL=… DIAG_PASSWORD=… npx vitest run --config vitest.smoke.config.js mobile/__tests__/smoke/presentation-audit.smoke.ts
 */
import { describe, it } from 'vitest';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc, getDocs, collection } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

const EMAIL = process.env.DIAG_EMAIL;
const PASSWORD = process.env.DIAG_PASSWORD;
const TESTY = /\b(test|testing|demo|dummy|sample|fake|lorem|asdf|qwe|xxx|temp|tmp|foo|bar)\b|^\s*(\d)\1{2,}\s*$|^[a-z]{1,3}$/i;

describe.skipIf(!EMAIL || !PASSWORD)('presentation audit (read-only)', () => {
  it('lists test-looking text', async () => {
    const cred = await signInWithEmailAndPassword(auth, EMAIL!, PASSWORD!);
    const uid = String((await cred.user.getIdTokenResult()).claims.uidCollection);
    const hits: string[] = [];
    const check = (where: string, v: any) => {
      if (typeof v === 'string' && v.trim() && TESTY.test(v.trim())) hits.push(`${where}: "${v}"`);
    };
    check('auth.displayName', cred.user.displayName);
    check('auth.email', cred.user.email);
    const comp = (await getDoc(doc(db, uid, 'cmpnyData'))).data() || {};
    Object.entries(comp).forEach(([k, v]) => check(`company.${k}`, v));
    const settings = (await getDoc(doc(db, uid, 'settings'))).data() || {};
    for (const key of Object.keys(settings)) {
      const list = settings[key]?.[key];
      if (!Array.isArray(list)) continue;
      list.filter((x: any) => !x?.deleted).forEach((x: any) => ['nname', 'supplier', 'client', 'stock', 'cur', 'expType'].forEach((f) => check(`settings.${key}.${f}`, x?.[f])));
    }
    const y = new Date().getFullYear();
    let counts: Record<string, number> = {};
    for (const coll of [`contracts_${y}`, `contracts_${y - 1}`, `invoices_${y}`, `invoices_${y - 1}`, `expenses_${y}`, 'companyExpenses', 'specialinvoices', 'salescontracts', 'stocks']) {
      const snap = await getDocs(collection(db, uid, 'data', coll)).catch(() => null);
      counts[coll] = snap ? snap.size : 0;
      snap?.docs.forEach((d) => {
        const r: any = d.data();
        ['order', 'invoice', 'comments', 'remark', 'description', 'descriptionText', 'expType', 'contractNo', 'client', 'supplier', 'title', 'notes'].forEach((f) => check(`${coll}.${f}`, r?.[f]));
        (r.productsData || []).forEach((p: any) => check(`${coll}.product`, p?.description));
      });
    }
    const people = await getDocs(collection(db, uid, 'data', 'activity')).catch(() => null);
    const names = new Set<string>();
    people?.docs.forEach((d) => names.add(String((d.data() as any).actorName || '')));
    names.forEach((n) => check('activity.actorName', n));
    console.log('\nworkspace ' + uid.slice(0, 6) + '… record counts: ' + JSON.stringify(counts));
    const nm = (k: string) => ((settings as any)[k]?.[k] || []).filter((x: any) => !x?.deleted).map((x: any) => x.nname || x.supplier || x.client || x.stock).join(' | ');
    console.log('SUPPLIERS: ' + nm('Supplier'));
    console.log('CLIENTS: ' + nm('Client'));
    console.log('WAREHOUSES: ' + nm('Stocks'));
    console.log('COMPANY: ' + (comp as any).name + ' / ' + (comp as any).email);
    const uniq = [...new Set(hits)];
    console.log('test-looking strings: ' + uniq.length);
    uniq.slice(0, 80).forEach((h) => console.log('  ' + h));
    await signOut(auth);
  }, 180_000);
});
