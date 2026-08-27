// deleteContractDocOnly.mjs — delete a duplicated contract WITHOUT its children.
//
// A contract duplicated by a copy flow carries the same invoices[] and stock[]
// lists as the original, so it claims records that belong to the other one. A
// cascade delete follows those lists and would destroy the live invoice and stock.
// This deletes the contract document alone.
//
// The safety test is direction: a child names its parent (invoice.poSupplier.id,
// lot.contractData.id, expense.poSupplier.id). If NOTHING names this contract, it
// owns nothing, and removing it cannot orphan anything. If something does name it,
// this is the live copy — the script refuses and says what pointed at it.
//
// Usage:
//   node deleteContractDocOnly.mjs --workspace <uid> --contract <id> [--apply]

import admin from 'firebase-admin';
import { readFileSync } from 'node:fs';

const args = Object.fromEntries(
    process.argv.slice(2).reduce((acc, cur, i, arr) => {
        if (cur.startsWith('--')) acc.push([cur.slice(2), arr[i + 1]?.startsWith('--') ? true : arr[i + 1] ?? true]);
        return acc;
    }, [])
);
const { workspace, contract: contractId, apply } = args;

if (!workspace || !contractId) {
    console.error('Usage: node deleteContractDocOnly.mjs --workspace <uid> --contract <id> [--apply]');
    process.exit(1);
}

admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(readFileSync('./serviceAccountKey.json', 'utf8'))),
});
const db = admin.firestore();

const YEARS = [2026, 2025, 2024, 2023];

let target = null;
for (const yr of YEARS) {
    const snap = await db.doc(`${workspace}/data/contracts_${yr}/${contractId}`).get();
    if (snap.exists) { target = { ...snap.data(), _bucket: `contracts_${yr}` }; break; }
}
if (!target) { console.error(`No contract ${contractId} found.`); process.exit(1); }

console.log(`\ncontract ${contractId} (${target._bucket})`);
console.log(`  PO ${target.order} · date ${target.date} · lstSaved ${target.lstSaved || '-'}`);
console.log(`  it CLAIMS: ${(target.invoices || []).length} invoice(s), ${(target.stock || []).length} stock lot(s), ${(target.poInvoices || []).length} purchase invoice(s)`);

// Who actually points back at it?
const referrers = [];
for (const yr of YEARS) {
    const invs = await db.collection(`${workspace}/data/invoices_${yr}`).get();
    invs.forEach(d => { const v = d.data(); if (v.poSupplier?.id === contractId) referrers.push(`invoice ${v.invoice} [${v.invType}] (invoices_${yr})`); });
    const exps = await db.collection(`${workspace}/data/expenses_${yr}`).get();
    exps.forEach(d => { const v = d.data(); if (v.poSupplier?.id === contractId) referrers.push(`expense ${v.expense} (expenses_${yr})`); });
}
const lots = await db.collection(`${workspace}/data/stocks`).get();
lots.forEach(d => { const v = d.data(); if (v.contractData?.id === contractId) referrers.push(`stock lot ${String(v.id).slice(0, 8)} (${v.qnty} MT)`); });

console.log(`  POINTS BACK at it: ${referrers.length}`);
referrers.forEach(r => console.log(`     ${r}`));

if (referrers.length) {
    console.error(
        `\nRefusing: ${referrers.length} record(s) belong to this contract, so it is not the spare copy.` +
        `\nDeleting it would orphan them. Check the other duplicate instead.`
    );
    process.exit(1);
}

console.log('\nNothing points at this contract — it owns no records, and the ones it lists belong to its twin.');

if (!apply) {
    console.log('Dry run — nothing was deleted. Re-run with --apply.');
    process.exit(0);
}

await db.doc(`${workspace}/data/${target._bucket}/${contractId}`).delete();
console.log(`Deleted contract document ${contractId}. Its listed invoices and stock were left untouched.`);
process.exit(0);
