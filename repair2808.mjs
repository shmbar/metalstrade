// Repair for GIS PO 2808-26 / invoice 46: the 5.202 MT of 625 AM Turnings was sold
// under the 58Ni line's id (9c815f14) while the stock sits under the 625 AM import
// line (c14a819b), so the sale never consumed the stock. Repoint the out-movement
// and the invoice line at the id the stock actually carries.
//
//   node repair2808.mjs           -> dry run, prints what would change
//   node repair2808.mjs --apply   -> writes the two fields
import { readFileSync } from 'node:fs';
const genv = (k) => { for (const f of ['.env.local', '.env']) { try { const l = readFileSync(f, 'utf8').split(/\r?\n/).find(x => x.startsWith(k + '=')); if (l) return l.slice(l.indexOf('=') + 1).trim(); } catch { } } return null; };
const { initializeApp } = await import('firebase/app');
const { getAuth, signInWithEmailAndPassword } = await import('firebase/auth');
const { getFirestore, collection, getDocs, doc, updateDoc } = await import('firebase/firestore');
let email = genv('IMS_TEST_EMAIL'); if (!email.includes('@')) email += '@ims-metals.com';
const app = initializeApp({ apiKey: genv('NEXT_PUBLIC_API_KEY'), authDomain: genv('NEXT_PUBLIC_AUTH_DOMAIN'), projectId: genv('NEXT_PUBLIC_PROJECT_ID') });
await signInWithEmailAndPassword(getAuth(app), email, genv('IMS_TEST_PASSWORD'));
const db = getFirestore(app);
const APPLY = process.argv.includes('--apply');

const GIS = 'aB3dE7FgHi9JkLmNoPqRsTuVwGIS';
const WRONG = '9c815f14';   // 58Ni 20Cr 8Mo 3.54Nb Turnings — the PO's own line
const RIGHT_FULL = 'c14a819b';
const OUT_LOT = 'd046852f';
const INVOICE = '46';

// resolve full ids from the live data — never write against a guessed id
const lots = (await getDocs(collection(db, GIS, 'data', 'stocks'))).docs.map(d => ({ id: d.id, ...d.data() }));
const outLot = lots.find(l => l.id.startsWith(OUT_LOT));
const inLot = lots.find(l => l.type === 'in' && String(l.description || '').startsWith(RIGHT_FULL) && l.stock === outLot?.stock);
if (!outLot || !inLot) { console.log('could not resolve lots — aborting', { outLot: !!outLot, inLot: !!inLot }); process.exit(1); }
const RIGHT = inLot.description;

let invDoc = null, invCol = null;
for (const c of ['invoices_2026', 'invoices_2025']) {
    const d = (await getDocs(collection(db, GIS, 'data', c))).docs.find(x => String(x.data().invoice) === INVOICE);
    if (d) { invDoc = { id: d.id, ...d.data() }; invCol = c; break; }
}
if (!invDoc) { console.log('invoice 46 not found — aborting'); process.exit(1); }
const lineIdx = (invDoc.productsDataInvoice || []).findIndex(p => String(p.descriptionId || '').startsWith(WRONG) && Math.abs(parseFloat(p.qnty) - 5.202) < 0.0005);
if (lineIdx < 0) { console.log('invoice line not found — aborting'); process.exit(1); }

console.log(`${APPLY ? 'APPLYING' : 'DRY RUN'}\n`);
console.log(`1. stocks/${outLot.id}`);
console.log(`     descriptionId : ${outLot.descriptionId}  ->  ${RIGHT}`);
console.log(`     (out, qty ${outLot.qnty}, inv ${outLot.invoice}) now nets against in-lot ${inLot.id.slice(0, 8)} (qty ${inLot.qnty})`);
console.log(`2. ${invCol}/${invDoc.id}  productsDataInvoice[${lineIdx}]`);
console.log(`     descriptionId : ${invDoc.productsDataInvoice[lineIdx].descriptionId}  ->  ${RIGHT}`);
console.log(`     (so a future re-save of invoice 46 rebuilds the out-movement against the right line)`);
console.log(`\nExpected after: description ${RIGHT.slice(0, 8)} nets 5.202 - 5.202 = 0; description ${WRONG} has no lots left.`);

if (!APPLY) { console.log('\n(dry run — pass --apply to write)'); process.exit(0); }

await updateDoc(doc(db, GIS, 'data', 'stocks', outLot.id), { descriptionId: RIGHT });
const newLines = invDoc.productsDataInvoice.map((p, i) => i === lineIdx ? { ...p, descriptionId: RIGHT } : p);
await updateDoc(doc(db, GIS, 'data', invCol, invDoc.id), { productsDataInvoice: newLines });
console.log('\nwritten.');
process.exit(0);
