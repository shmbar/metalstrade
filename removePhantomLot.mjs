// removePhantomLot.mjs — remove a duplicated stock lot.
//
// The cross-account copy (Copy to IMS/GIS) recreates a contract's stock rows in
// the target account, stamped with the counterparty as supplier. Run against a
// contract whose stock already exists there and the warehouse ends up holding the
// same physical lot twice: the Cashflow groups by warehouse × description, so the
// row shows double the tonnage and its supplier column reads "Mixed (2)".
//
// The copy's lot also carries a purchase-invoice id that is not on the contract,
// so the paid/unpaid check falls back to the stale snapshot stored on the lot —
// which says zero paid — and drags the whole row into "Stocks - UnPaid" even when
// the real invoice is paid.
//
// Usage:
//   node removePhantomLot.mjs --workspace <uid> --lot <id-or-prefix>   # dry run
//   node removePhantomLot.mjs --workspace <uid> --lot <id-or-prefix> --apply

import admin from 'firebase-admin';
import { readFileSync } from 'node:fs';

const args = Object.fromEntries(
    process.argv.slice(2).reduce((acc, cur, i, arr) => {
        if (cur.startsWith('--')) acc.push([cur.slice(2), arr[i + 1]?.startsWith('--') ? true : arr[i + 1] ?? true]);
        return acc;
    }, [])
);
const { workspace, lot: prefix, apply } = args;

if (!workspace || !prefix) {
    console.error('Usage: node removePhantomLot.mjs --workspace <uid> --lot <id-or-prefix> [--apply]');
    process.exit(1);
}

admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(readFileSync('./serviceAccountKey.json', 'utf8'))),
});
const db = admin.firestore();

const snap = await db.collection(`${workspace}/data/stocks`).get();
const hits = [];
snap.forEach(d => { if (String(d.id).startsWith(prefix)) hits.push({ _docId: d.id, ...d.data() }); });

if (hits.length !== 1) {
    console.error(`Expected exactly one lot starting "${prefix}", found ${hits.length}. Aborting rather than guessing.`);
    process.exit(1);
}
const lot = hits[0];

console.log(`\nLot ${lot._docId}`);
console.log(`  order      ${lot.order}`);
console.log(`  quantity   ${lot.qnty}`);
console.log(`  supplier   ${lot.supplier}`);
console.log(`  warehouse  ${lot.stock}`);
console.log(`  poInvoice  ${lot.poInvoice}`);

// A lot that a contract still claims must never be deleted from under it — that
// would leave the contract pointing at nothing, which is the failure mode this
// whole exercise has been cleaning up.
for (const yr of [2026, 2025, 2024, 2023]) {
    let claimed = null;
    const cs = await db.collection(`${workspace}/data/contracts_${yr}`).get();
    cs.forEach(d => { const c = d.data(); if ((c.stock || []).includes(lot._docId)) claimed = c.order; });
    if (claimed) {
        console.error(`\nRefusing: contract ${claimed} still lists this lot in its stock[]. Remove it there first.`);
        process.exit(1);
    }
}
console.log('\nNo contract lists this lot — safe to remove.');

if (!apply) {
    console.log('Dry run — nothing was deleted. Re-run with --apply.');
    process.exit(0);
}

await db.doc(`${workspace}/data/stocks/${lot._docId}`).delete();
console.log(`Deleted lot ${lot._docId}.`);
process.exit(0);
