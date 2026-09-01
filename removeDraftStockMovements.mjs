// removeDraftStockMovements.mjs — take back the weight that draft invoices moved.
//
// A draft invoice has not shipped, so it must not appear in the stock ledger. The
// save path now refuses to write movements for one, but rows written before that
// are still sitting in the ledger subtracting weight from the warehouse — and they
// only clear when someone happens to re-save that invoice.
//
// A movement is matched to its invoice by the id it was written under: the stock
// document id IS the invoice line id (utils.js saveStockIn). So a row is removable
// exactly when its id belongs to a line of an invoice currently marked draft.
//
// Usage:
//   node removeDraftStockMovements.mjs --workspace <uid>            # dry run
//   node removeDraftStockMovements.mjs --workspace <uid> --apply

import admin from 'firebase-admin';
import { readFileSync } from 'node:fs';

const args = Object.fromEntries(
    process.argv.slice(2).reduce((acc, cur, i, arr) => {
        if (cur.startsWith('--')) acc.push([cur.slice(2), arr[i + 1]?.startsWith('--') ? true : arr[i + 1] ?? true]);
        return acc;
    }, [])
);
const { workspace, apply } = args;

if (!workspace) {
    console.error('Usage: node removeDraftStockMovements.mjs --workspace <uid> [--apply]');
    process.exit(1);
}

admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(readFileSync('./serviceAccountKey.json', 'utf8'))),
});
const db = admin.firestore();

const YEARS = [2026, 2025, 2024, 2023];

// Every line of every draft invoice, and which invoice it came from.
const draftLine = new Map();
for (const yr of YEARS) {
    const snap = await db.collection(`${workspace}/data/invoices_${yr}`).get();
    snap.forEach(d => {
        const v = d.data();
        if (v.draft !== true) return;
        (v.productsDataInvoice || []).forEach(p => {
            if (typeof p?.id === 'string' && p.id) draftLine.set(p.id, { invoice: v.invoice, type: v.invType, date: v.date });
        });
    });
}
console.log(`draft invoice lines found: ${draftLine.size}`);

const doomed = [];
const stocks = await db.collection(`${workspace}/data/stocks`).get();
stocks.forEach(d => {
    const v = d.data();
    if (v.type !== 'out') return;             // only shipments, never an 'in' lot
    const owner = draftLine.get(d.id);
    if (!owner) return;
    doomed.push({ docId: d.id, qnty: Number(v.qnty) || 0, owner, descriptionId: v.descriptionId });
});

console.log(`\nstock movements belonging to draft invoices: ${doomed.length}`);
let total = 0;
for (const r of doomed) {
    total += r.qnty;
    console.log(`  ${String(r.qnty).padStart(9)} MT · invoice ${r.owner.invoice} [${r.owner.type}] ${r.owner.date}` +
        ` · row ${r.docId.slice(0, 8)} · material ${String(r.descriptionId || '').slice(0, 8)}`);
}
console.log(`  weight to be returned to stock: ${total.toFixed(3)} MT`);

if (!doomed.length) { console.log('\nNothing to do.'); process.exit(0); }

if (!apply) {
    console.log('\nDry run — nothing was deleted. Re-run with --apply.');
    process.exit(0);
}

// Batched, 450 at a time — the same cap every other write here respects.
for (let i = 0; i < doomed.length; i += 450) {
    const batch = db.batch();
    doomed.slice(i, i + 450).forEach(r => batch.delete(db.doc(`${workspace}/data/stocks/${r.docId}`)));
    await batch.commit();
}
console.log(`\nRemoved ${doomed.length} movement(s). ${total.toFixed(3)} MT is back in stock.`);
console.log('Clearing the Draft tick and saving the invoice writes them again.');
process.exit(0);
