/**
 * Presentation data for App Store screenshots — the DEMO workspace only.
 *
 * DRY RUN by default: prints every rename it would make and writes nothing.
 *   (from repo root) DIAG_EMAIL=… DIAG_PASSWORD=… npx vitest run --config vitest.smoke.config.js mobile/__tests__/smoke/presentation-cleanup.smoke.ts
 * Apply (only with the owner's go — this workspace is also App Review's account):
 *   … PRESENTATION_APPLY=1 npx vitest run …
 *
 * What it changes: display names and contact details of suppliers, clients, warehouses and
 * the company profile — the text that appears on almost every screen. Records point at
 * these entries by id, so renaming them re-labels every contract, invoice and stock lot
 * without touching a single transaction. PO and invoice numbers are NOT renamed: they are
 * lookup keys (invoice ↔ PO links, expense ↔ invoice numbers); the dry run only lists the
 * test-looking ones.
 *
 * Safety: refuses any workspace except the demo one, before reading anything else; writes a
 * JSON backup of every document it will change first, and aborts if the backup fails.
 */
import { describe, expect, it } from 'vitest';
import { signInWithEmailAndPassword, signOut, updateProfile } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

const DEMO_WORKSPACE = '1wD74Rzav1PZ40MxXStjn9WgtJm2';
const EMAIL = process.env.DIAG_EMAIL;
const PASSWORD = process.env.DIAG_PASSWORD;
const APPLY = process.env.PRESENTATION_APPLY === '1';
const TESTY = /\b(test|testing|demo|dummy|sample|fake|lorem|asdf|qwe|xxx|temp|tmp|foo|bar|zzz)\b|^\s*(\d)\1{2,}\s*$|^[a-z]{1,4}$/i;

// Invented names. Plausible for the trade, deliberately not any customer of the app.
const SUPPLIERS = [
  ['Northfield Alloys Ltd', 'Northfield'],
  ['Baltic Metal Supply AS', 'Baltic Metal'],
  ['Harbour Scrap Partners BV', 'Harbour Scrap'],
  ['Eastgate Metals GmbH', 'Eastgate'],
  ['Riverside Nickel SA', 'Riverside'],
  ['Coastline Recycling Oy', 'Coastline'],
  ['Summit Ferroalloys Ltd', 'Summit'],
  ['Granite Steel Scrap AB', 'Granite'],
  ['Westmark Metals SRL', 'Westmark'],
  ['Highbridge Alloys Ltd', 'Highbridge'],
];
const CLIENTS = [
  ['Sunridge Stainless Ltd', 'Sunridge'],
  ['Orion Foundry Group', 'Orion Foundry'],
  ['Belmont Castings SA', 'Belmont'],
  ['Sequoia Alloy Works', 'Sequoia'],
  ['Meridian Steelworks', 'Meridian'],
  ['Alder Precision Metals', 'Alder'],
  ['Crestline Forge GmbH', 'Crestline'],
  ['Pinecrest Melt Shop', 'Pinecrest'],
  ['Kestrel Special Steels', 'Kestrel'],
  ['Lakeshore Tube Mills', 'Lakeshore'],
];
const WAREHOUSES = [
  ['Rotterdam Terminal', 'Rotterdam', 'Netherlands'],
  ['Antwerp Warehouse', 'Antwerp', 'Belgium'],
  ['Hamburg Depot', 'Hamburg', 'Germany'],
  ['Gdansk Yard', 'Gdansk', 'Poland'],
  ['Tallinn Port Store', 'Tallinn', 'Estonia'],
  ['Koper Terminal', 'Koper', 'Slovenia'],
  ['Genoa Warehouse', 'Genoa', 'Italy'],
  ['Valencia Depot', 'Valencia', 'Spain'],
];
const PEOPLE = ['A. Lindqvist', 'M. Novak', 'J. Hartmann', 'L. Moreau', 'K. Tamm', 'S. Ferreira', 'P. Kowalski', 'E. Rossi', 'T. Berg', 'R. Duarte'];
// The review account's display name ("Welcome back Test", "Test User" on More). Its email
// and password stay exactly as given to App Review.
const DISPLAY_NAME = 'Alex Morgan';
const COMPANY = { name: 'Northstar Metals OÜ', street: 'Harbour Road 12', city: 'Tallinn', country: 'Estonia' };

// Node built-ins, loaded untyped: the mobile tsconfig targets React Native and has no Node types.
const nodeModule = (name: string): Promise<any> => import(name);

const pick = <T,>(list: T[], i: number): T => list[i % list.length];
const suffix = (list: unknown[], i: number) => (i < list.length ? '' : ` ${Math.floor(i / list.length) + 1}`);

type Change = { where: string; field: string; from: string; to: string };

const renameEntries = (list: any[], kind: 'Supplier' | 'Client' | 'Stocks', changes: Change[]) =>
  list.map((x, i) => {
    const next = { ...x };
    const set = (field: string, to: string) => {
      const from = String(x?.[field] ?? '');
      if (from === to || (from === '' && to === '')) return;
      next[field] = to;
      changes.push({ where: `${kind}[${x.id}]`, field, from, to });
    };
    if (kind === 'Stocks') {
      const [name, city, country] = pick(WAREHOUSES, i);
      set('stock', name + suffix(WAREHOUSES, i));
      set('nname', city + suffix(WAREHOUSES, i));
      set('country', country);
      set('address', `Dock ${i + 1}, ${city}`);
      set('phone', '');
      set('other', '');
      return next;
    }
    const names = kind === 'Supplier' ? SUPPLIERS : CLIENTS;
    const [full, short] = pick(names, i);
    set(kind === 'Supplier' ? 'supplier' : 'client', full + suffix(names, i));
    set('nname', short + suffix(names, i));
    set('street', `Industrial Park ${i + 1}`);
    set('poc', pick(PEOPLE, i));
    for (const f of ['email', 'phone', 'mobile', 'fax', 'other1', 'other2']) set(f, '');
    return next;
  });

describe.skipIf(!EMAIL || !PASSWORD)('presentation cleanup (demo workspace only)', () => {
  it(APPLY ? 'APPLIES the rename' : 'dry run — prints the plan, writes nothing', async () => {
    const cred = await signInWithEmailAndPassword(auth, EMAIL!, PASSWORD!);
    const uid = String((await cred.user.getIdTokenResult()).claims.uidCollection || '');
    try {
      // The only line that matters: never touch any other workspace.
      expect(uid, 'refusing: this account is not in the demo workspace').toBe(DEMO_WORKSPACE);

      const settingsRef = doc(db, uid, 'settings');
      const companyRef = doc(db, uid, 'cmpnyData');
      const settings: any = (await getDoc(settingsRef)).data() || {};
      const company: any = (await getDoc(companyRef)).data() || {};

      const changes: Change[] = [];
      if ((cred.user.displayName || '') !== DISPLAY_NAME) changes.push({ where: 'auth', field: 'displayName', from: cred.user.displayName || '', to: DISPLAY_NAME });
      const next: Record<string, any[]> = {};
      for (const kind of ['Supplier', 'Client', 'Stocks'] as const) {
        const list = settings?.[kind]?.[kind];
        if (Array.isArray(list)) next[kind] = renameEntries(list, kind, changes);
      }
      const companyNext: Record<string, string> = {};
      for (const [k, v] of Object.entries(COMPANY)) {
        if (company[k] !== undefined && company[k] !== v) {
          companyNext[k] = v;
          changes.push({ where: 'company', field: k, from: String(company[k]), to: v });
        }
      }
      for (const k of ['email', 'phone', 'mobile', 'fax', 'website', 'iban', 'swift', 'bank', 'vat', 'eori', 'regNo']) {
        if (typeof company[k] === 'string' && company[k]) {
          companyNext[k] = '';
          changes.push({ where: 'company', field: k, from: company[k], to: '' });
        }
      }

      // Record-level text is listed, not changed (see header).
      const listed: string[] = [];
      const y = new Date().getFullYear();
      for (const coll of [`contracts_${y}`, `contracts_${y - 1}`, `invoices_${y}`, `invoices_${y - 1}`, `expenses_${y}`, 'companyExpenses', 'salescontracts', 'specialinvoices']) {
        const snap = await getDocs(collection(db, uid, 'data', coll)).catch(() => null);
        snap?.docs.forEach((d) => {
          const r: any = d.data();
          for (const f of ['order', 'invoice', 'comments', 'remark', 'description', 'descriptionText', 'contractNo', 'notes']) {
            const v = r?.[f];
            if (typeof v === 'string' && v.trim() && TESTY.test(v.trim())) listed.push(`${coll}/${d.id}.${f}: "${v}"`);
          }
        });
      }

      console.log(`\n${APPLY ? 'APPLYING' : 'DRY RUN'} — workspace ${uid.slice(0, 6)}…, ${changes.length} field changes`);
      for (const c of changes) console.log(`  ${c.where}.${c.field}: "${c.from}" → "${c.to}"`);
      console.log(`\nTest-looking record text (not changed, ${listed.length}):`);
      listed.slice(0, 60).forEach((l) => console.log('  ' + l));

      if (!APPLY || !changes.length) return;

      const [fs, os, path] = await Promise.all(['node:fs', 'node:os', 'node:path'].map(nodeModule));
      const backup = path.join(process.env.PRESENTATION_BACKUP_DIR || os.tmpdir(), `ims-demo-backup-${Date.now()}.json`);
      fs.writeFileSync(backup, JSON.stringify({ workspace: uid, at: new Date().toISOString(), settings: { Supplier: settings.Supplier, Client: settings.Client, Stocks: settings.Stocks }, company, displayName: cred.user.displayName }, null, 2));
      expect(fs.statSync(backup).size).toBeGreaterThan(2);
      console.log(`\nbackup: ${backup}`);

      const patch: Record<string, any> = {};
      for (const [kind, list] of Object.entries(next)) patch[`${kind}.${kind}`] = list;
      await updateDoc(settingsRef, patch);
      if (Object.keys(companyNext).length) await updateDoc(companyRef, companyNext);
      if ((cred.user.displayName || '') !== DISPLAY_NAME) await updateProfile(cred.user, { displayName: DISPLAY_NAME });
      console.log('applied.');
    } finally {
      await signOut(auth);
    }
  }, 180_000);
});
