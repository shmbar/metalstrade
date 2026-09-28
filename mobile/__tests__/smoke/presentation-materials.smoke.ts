/**
 * Presentation data, part 2 — material names in the DEMO workspace only.
 *
 * DRY RUN by default: lists every material name, what it would become, and how many
 * documents carry it. Writes nothing.
 *   (from repo root) DIAG_EMAIL=… DIAG_PASSWORD=… npx vitest run --config vitest.smoke.config.js --disableConsoleIntercept mobile/__tests__/smoke/presentation-materials.smoke.ts
 * Apply (owner's go only — this workspace is also App Review's account):
 *   … PRESENTATION_APPLY=1 …
 *
 * Unlike suppliers or warehouses, a material's NAME is copied as text wherever it is used —
 * the contract's lines, every stock lot's snapshot of those lines, invoice lines, sales
 * contracts, Misc invoices, margins rows. So the rename touches exactly the fields that hold
 * a material name (description / descriptionText / descriptionName / material, at the top
 * level and inside productsData / productsDataInvoice / items / lines), and only where the
 * value EQUALS a known material name. Nothing else: "random" is also a Misc-invoice category,
 * and ids, categories and numbers are never matched. Every document is backed up whole first.
 */
import { describe, expect, it } from 'vitest';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { collection, doc, getDocs, writeBatch } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

const DEMO_WORKSPACE = '1wD74Rzav1PZ40MxXStjn9WgtJm2';
const EMAIL = process.env.DIAG_EMAIL;
const PASSWORD = process.env.DIAG_PASSWORD;
const APPLY = process.env.PRESENTATION_APPLY === '1';

// Plausible metals-trade materials, most prominent first.
const MATERIALS = [
  'Nickel 200 Scrap', 'Inconel 718 Turnings', 'Ti-6Al-4V Turnings', 'CP Titanium Grade 2 Solids',
  'Hastelloy C-276 Solids', 'Monel 400 Scrap', 'Stainless 316 Solids', 'Stainless 304 Turnings',
  'Stellite 6 Scrap', 'Tantalum Ingots', 'Molybdenum Scrap', 'Tungsten Carbide Inserts',
  'Nickel Cathodes', 'Ferro Molybdenum 65%', 'Ferro Vanadium 80%', 'Ferro Titanium 70%',
  'Nickel Briquettes', 'Copper Cathodes', 'Aluminium 6063 Extrusions', 'Zirconium Sponge',
  'Niobium Pellets', 'Chrome Metal', 'Manganese Flakes', 'Cobalt Cathodes', 'Nimonic 80A Bars',
  'Waspaloy Turnings', 'Alloy 625 Solids', 'Alloy 825 Pipe', 'Duplex 2205 Solids',
  'Super Duplex 2507 Turnings', 'Hafnium Crystal Bar', 'Titanium Sponge', 'Nickel Powder',
  'Cobalt Powder', 'Silicon Metal 553', 'Magnesium Ingots', 'Bismuth Needles', 'Antimony Ingots',
  'Alloy 600 Solids', 'Alloy 800H Tubes', 'Alloy X-750 Bars', 'Rene 41 Turnings', 'Haynes 188 Scrap',
  'Invar 36 Solids', 'Kovar Scrap', 'Tungsten Heavy Alloy', 'Molybdenum TZM Bars', 'Tantalum Capacitor Scrap',
  'Niobium C-103 Scrap', 'Zirconium 702 Solids', 'Titanium Grade 5 Plate', 'Titanium Grade 12 Solids',
  'Beryllium Copper Scrap', 'Nickel Silver Turnings', 'Ferro Nickel 25%', 'Ferro Tungsten 80%',
  'Ferro Niobium 65%', 'Cobalt Alloy L-605', 'Stainless 17-4PH Solids', 'Stainless 321 Turnings',
  'Stainless 410 Solids', 'Alloy 20 Scrap', 'Nickel Anodes', 'Cobalt Briquettes',
];
// Names that already read as real chemistry ("16.24Ni 6.01Cr Ingots", "46Mo") stay: the Stocks
// spec line reads its figures from them.
const KEEP = /\b\d+(\.\d+)?(Ni|Cr|Mo|Co|Ti|Fe|W|Nb|V|Cu|Al)\b/;
const NAME_KEYS = ['description', 'descriptionText', 'descriptionName', 'material'];
const LINE_ARRAYS = ['productsData', 'productsDataInvoice', 'items', 'lines'];
const nodeModule = (name: string): Promise<any> => import(name);

describe.skipIf(!EMAIL || !PASSWORD)('presentation materials (demo workspace only)', () => {
  it(APPLY ? 'APPLIES the material rename' : 'dry run — prints the plan, writes nothing', async () => {
    const cred = await signInWithEmailAndPassword(auth, EMAIL!, PASSWORD!);
    const uid = String((await cred.user.getIdTokenResult()).claims.uidCollection || '');
    try {
      expect(uid, 'refusing: this account is not in the demo workspace').toBe(DEMO_WORKSPACE);

      // Every collection that can carry a material name.
      const years: number[] = [];
      for (let y = 2015; y <= new Date().getFullYear() + 1; y++) years.push(y);
      const paths: string[][] = [['data', 'stocks'], ['data', 'specialInvoices']];
      for (const y of years) {
        for (const c of ['contracts', 'invoices', 'salescontracts', 'specialInvoices']) paths.push(['data', `${c}_${y}`]);
        paths.push(['margins', String(y)]);
      }
      const docs: { path: string[]; id: string; data: any }[] = [];
      for (const p of paths) {
        const snap = await getDocs(collection(db, uid, ...(p as [string, string]))).catch(() => null);
        snap?.docs.forEach((d) => docs.push({ path: p, id: d.id, data: d.data() }));
      }

      // The material names themselves: what contracts, lots and invoices call their lines.
      const freq = new Map<string, number>();
      const note = (v: unknown) => {
        const s = typeof v === 'string' ? v.trim() : '';
        if (s && s.length < 80) freq.set(s, (freq.get(s) || 0) + 1);
      };
      for (const d of docs) {
        const coll = d.path[1];
        if (coll.startsWith('contracts_')) (d.data.productsData || []).forEach((l: any) => note(l?.description));
        if (coll === 'stocks') {
          note(d.data.descriptionText);
          (d.data.productsData || []).forEach((l: any) => note(l?.description));
        }
        if (coll.startsWith('invoices_')) (d.data.productsDataInvoice || []).forEach((l: any) => note(l?.description));
      }
      // Already realistic (a name from the list, or chemistry) → left alone, so a re-run is a no-op.
      const done = new Set(MATERIALS);
      const names = [...freq.entries()].sort((a, b) => b[1] - a[1]).map(([n]) => n).filter((n) => !KEEP.test(n) && !done.has(n));
      expect(names.length, 'more junk names than realistic ones — extend MATERIALS').toBeLessThanOrEqual(MATERIALS.length);
      const map = new Map<string, string>();
      names.forEach((n, i) => map.set(n, MATERIALS[i % MATERIALS.length] + (i < MATERIALS.length ? '' : ` ${Math.floor(i / MATERIALS.length) + 1}`)));

      // Apply the map to the name fields only, top level and inside the line arrays.
      const rename = (obj: any): { next: any; changed: number } => {
        let changed = 0;
        const fix = (o: any) => {
          if (!o || typeof o !== 'object') return o;
          const out = { ...o };
          for (const k of NAME_KEYS) {
            const v = typeof out[k] === 'string' ? out[k].trim() : null;
            if (v && map.has(v) && map.get(v) !== out[k]) { out[k] = map.get(v); changed++; }
          }
          return out;
        };
        const next = fix(obj);
        for (const a of LINE_ARRAYS) if (Array.isArray(next[a])) next[a] = next[a].map(fix);
        return { next, changed };
      };
      const plan = docs.map((d) => ({ ...d, ...rename(d.data) })).filter((d) => d.changed > 0);
      const byColl = new Map<string, { docs: number; fields: number }>();
      plan.forEach((d) => {
        const k = d.path.join('/').replace(/_\d{4}$|\/\d{4}$/, '_YYYY');
        const e = byColl.get(k) || { docs: 0, fields: 0 };
        e.docs++; e.fields += d.changed; byColl.set(k, e);
      });

      console.log(`\n${APPLY ? 'APPLYING' : 'DRY RUN'} — workspace ${uid.slice(0, 6)}…, ${names.length} material names, ${plan.length} documents`);
      names.forEach((n) => console.log(`  "${n}" (${freq.get(n)}) → "${map.get(n)}"`));
      console.log('\nby collection:');
      byColl.forEach((v, k) => console.log(`  ${k}: ${v.docs} docs, ${v.fields} fields`));

      if (!APPLY || !plan.length) return;

      const [fs, os, path] = await Promise.all(['node:fs', 'node:os', 'node:path'].map(nodeModule));
      const backup = path.join(process.env.PRESENTATION_BACKUP_DIR || os.tmpdir(), `ims-demo-materials-backup-${Date.now()}.json`);
      fs.writeFileSync(backup, JSON.stringify({ workspace: uid, at: new Date().toISOString(), docs: plan.map((d) => ({ path: [uid, ...d.path, d.id], data: d.data })) }));
      expect(fs.statSync(backup).size).toBeGreaterThan(2);
      console.log(`\nbackup: ${backup}`);

      // Only the changed fields, in batches (Firestore caps a batch at 500 writes).
      for (let i = 0; i < plan.length; i += 400) {
        const batch = writeBatch(db);
        plan.slice(i, i + 400).forEach((d) => {
          const patch: Record<string, any> = {};
          for (const k of NAME_KEYS) if (d.next[k] !== d.data[k]) patch[k] = d.next[k];
          for (const a of LINE_ARRAYS) if (Array.isArray(d.next[a]) && JSON.stringify(d.next[a]) !== JSON.stringify(d.data[a])) patch[a] = d.next[a];
          batch.update(doc(db, uid, ...(d.path as [string, string]), d.id), patch);
        });
        await batch.commit();
      }
      console.log('applied.');
    } finally {
      await signOut(auth);
    }
  }, 300_000);
});
