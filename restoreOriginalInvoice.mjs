// restoreOriginalInvoice.mjs — rebuild an original invoice from its final note.
//
// A final note REVISES an original invoice: the two share an invoice number and a
// PO, and the app deliberately values a final note at zero unless its original is
// there beside it (app/(root)/cashflow/funcs.js — a lone final note counts as 0
// while its payments still count, so the balance shows as minus the full amount).
// When the original is deleted, that is exactly what goes wrong on the Cashflow.
//
// The final note is a faithful copy of the original apart from what the revision
// changed, so it is the best source to rebuild from: same client, same PO, same
// product lines, same shape. This restores the original with its ORIGINAL id —
// taken from the final note's own `originalInvoice` pointer — so that pointer and
// the shipment link keep resolving instead of dangling a second time.
//
// Payments are deliberately NOT copied. They live on the final note, and the
// balance is computed across the pair, so duplicating them would double-count.
//
// ─── Usage ───────────────────────────────────────────────────────────────────
//   node restoreOriginalInvoice.mjs --workspace <uid> --fn 32 \
//        --total 559645.72 --date 2026-05-13 --zero-lines 8,9
//
//   --total       the original's total, from the paper invoice
//   --date        the original's invoice date (YYYY-MM-DD)
//   --zero-lines  1-based line numbers the final note ADDED (charges that were
//                 zero on the original); their qty/price/total are zeroed
//   --po          attach to this PO's contract instead of the final note's
//   --apply       write. Without it, nothing is written.

import admin from 'firebase-admin';
import { readFileSync } from 'node:fs';

const args = Object.fromEntries(
    process.argv.slice(2).reduce((acc, cur, i, arr) => {
        if (cur.startsWith('--')) acc.push([cur.slice(2), arr[i + 1]?.startsWith('--') ? true : arr[i + 1] ?? true]);
        return acc;
    }, [])
);
const { workspace, fn, total, date, 'zero-lines': zeroLines, apply } = args;

if (!workspace || !fn || !total || !date) {
    console.error('Usage: node restoreOriginalInvoice.mjs --workspace <uid> --fn <invoiceNo> --total <amount> --date <YYYY-MM-DD> [--zero-lines 8,9] [--apply]');
    process.exit(1);
}

admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(readFileSync('./serviceAccountKey.json', 'utf8'))),
});
const db = admin.firestore();

const norm = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '').replace(/^0+/, '');
const thisYear = new Date().getFullYear();
const years = [thisYear, thisYear - 1, thisYear - 2, thisYear - 3];
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

// Find the final note by number.
let note = null;
for (const yr of years) {
    const snap = await db.collection(`${workspace}/data/invoices_${yr}`).get();
    snap.forEach(d => {
        const v = d.data();
        if (norm(v.invoice) === norm(fn) && !['1111', 'Invoice'].includes(v.invType)) {
            note = { ...v, _bucket: `invoices_${yr}` };
        }
    });
}
if (!note) { console.error(`No final note numbered "${fn}" found.`); process.exit(1); }

const originalId = note.originalInvoice?.id;
if (!originalId) { console.error('That final note has no originalInvoice pointer — nothing to restore it as.'); process.exit(1); }

// Refuse to overwrite an original that is actually still there.
const targetBucket = `invoices_${String(date).slice(0, 4)}`;
if ((await db.doc(`${workspace}/data/${targetBucket}/${originalId}`).get()).exists) {
    console.error(`The original (${originalId}) already exists in ${targetBucket}. Nothing to restore.`);
    process.exit(1);
}

const zeroed = new Set(String(zeroLines || '').split(',').map(s => parseInt(s, 10)).filter(Boolean));

// Build the original FROM the final note: same everything, except what the
// revision changed and what belongs only to a final note.
const lines = (note.productsDataInvoice || []).map((p, i) => (
    zeroed.has(i + 1) ? { ...p, qnty: p.qnty, unitPrc: 0, total: 0, eqUnitPrc: '' } : { ...p }
));

const original = {
    ...note,
    id: originalId,
    invType: '1111',
    invoice: note.invoice,
    date,
    dateRange: { startDate: date, endDate: date },
    m: String(date).slice(5, 7),
    totalAmount: round2(total),
    totalPrepayment: round2((Number(total) * (Number(note.percentage) || 0)) / 100),
    productsDataInvoice: lines,
    payments: [],            // they live on the final note; the pair is summed
    balanceDue: '',
    lstSaved: '',
    checked: false,
};
delete original.originalInvoice;  // this IS the original
delete original.debtBlnc;         // a stale computed leftover, recomputed on load
delete original._bucket;

const lineSum = round2(lines.reduce((t, p) => t + (Number(p.total) || 0), 0));

console.log('\n── Restoring original invoice ──────────────────────────────────');
console.log(`from final note  : ${note.invoice} [${note.invType}] ${note.date} · total ${note.totalAmount} (${note._bucket})`);
console.log(`restoring as     : ${original.invoice} [1111] ${original.date} · total ${original.totalAmount} · id ${originalId}`);
console.log(`into             : ${targetBucket}`);
console.log(`PO               : ${original.poSupplier?.order} (${String(original.poSupplier?.id || '').slice(0, 8)})`);
console.log(`prepayment       : ${note.percentage}% → ${original.totalPrepayment}`);
console.log(`payments         : none (both remain on the final note)`);
console.log('\nlines:');
lines.forEach((p, i) => console.log(
    `  ${i + 1}. ${zeroed.has(i + 1) ? 'ZEROED  ' : '        '}qnty ${p.qnty} × ${p.unitPrc} = ${p.total}  | ${String(p.descriptionText || '').slice(0, 40)}`
));
console.log(`  lines sum: ${lineSum}  ${lineSum === round2(total) ? '✓ matches the total' : `✗ DOES NOT match the stated total ${round2(total)}`}`);

if (lineSum !== round2(total)) {
    console.error('\nRefusing to write: the line items do not add up to the total given.');
    console.error('Check --zero-lines against the paper invoice.');
    process.exit(1);
}

// The contract must list the invoice back, or it is orphaned in the other direction.
let contract = null;
for (const yr of years) {
    const snap = await db.doc(`${workspace}/data/contracts_${yr}/${original.poSupplier?.id}`).get();
    if (snap.exists) { contract = { ...snap.data(), _bucket: `contracts_${yr}` }; break; }
}
const entry = { id: originalId, date, invType: '1111', invoice: original.invoice };
const needsEntry = contract && !(contract.invoices || []).some(x => x?.id === originalId);
console.log(`\ncontract ${contract ? `${contract.order} (${contract._bucket})` : '(NOT FOUND — invoice will be restored but not listed)'}`);
if (contract) console.log(`   invoices[]: ${(contract.invoices || []).length} → ${needsEntry ? `adds ${JSON.stringify(entry)}` : 'already lists it'}`);

if (!apply) {
    console.log('\nDry run — nothing was written. Re-run with --apply.');
    process.exit(0);
}

const batch = db.batch();
batch.set(db.doc(`${workspace}/data/${targetBucket}/${originalId}`), original);
if (needsEntry) {
    batch.update(db.doc(`${workspace}/data/${contract._bucket}/${contract.id}`), {
        invoices: [...(contract.invoices || []), entry],
    });
}
await batch.commit();

console.log(`\nRestored invoice ${original.invoice} (${original.totalAmount}) alongside its final note.`);
console.log('Reload the app — the pair should now balance to zero.');
process.exit(0);
