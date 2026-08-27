// fixInvoiceLineProduct.mjs — point an invoice line back at the right material row.
//
// Stock deducts an out-movement from a contract's material by id:
//   cashflow/funcs.js →  l.descriptionId === prod.id
// so a line naming the wrong material row deducts from the wrong contract, and the
// quantity reappears on the one it should have left.
//
// This matters most for an invoice and its final note, which share LINE IDS. Stock
// movements are stored keyed by line id (utils.js saveStockIn), so the pair writes
// to the SAME movement record and whichever document is saved last defines it.
// Re-picking material on one of them silently rewrites the other's stock effect.
//
// This sets the line's descriptionId on the invoice document AND on the movement
// it produced, so both agree no matter which document is saved next.
//
// Usage:
//   node fixInvoiceLineProduct.mjs --workspace <uid> --doc <invoiceDocId> \
//        --line <lineId> --product <descriptionId> [--year 2026] [--apply]

import admin from 'firebase-admin';
import { readFileSync } from 'node:fs';

const args = Object.fromEntries(
    process.argv.slice(2).reduce((acc, cur, i, arr) => {
        if (cur.startsWith('--')) acc.push([cur.slice(2), arr[i + 1]?.startsWith('--') ? true : arr[i + 1] ?? true]);
        return acc;
    }, [])
);
const { workspace, doc: docId, line: lineId, product, year = '2026', apply } = args;

if (!workspace || !docId || !lineId || !product) {
    console.error('Usage: node fixInvoiceLineProduct.mjs --workspace <uid> --doc <invoiceDocId> --line <lineId> --product <descriptionId> [--year YYYY] [--apply]');
    process.exit(1);
}

admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(readFileSync('./serviceAccountKey.json', 'utf8'))),
});
const db = admin.firestore();

const invRef = db.doc(`${workspace}/data/invoices_${year}/${docId}`);
const invSnap = await invRef.get();
if (!invSnap.exists) { console.error(`No invoice ${docId} in invoices_${year}.`); process.exit(1); }
const inv = invSnap.data();

const lines = inv.productsDataInvoice || [];
const idx = lines.findIndex(p => String(p?.id || '').startsWith(lineId));
if (idx === -1) { console.error(`Invoice ${inv.invoice} has no line starting "${lineId}".`); process.exit(1); }
const line = lines[idx];

// The material row must actually exist on some contract, or we would just be
// swapping one dangling reference for another.
let owner = null;
for (const yr of [2026, 2025, 2024, 2023]) {
    const cs = await db.collection(`${workspace}/data/contracts_${yr}`).get();
    cs.forEach(d => {
        const c = d.data();
        if ((c.productsData || []).some(p => p?.id === product)) owner = { order: c.order, bucket: `contracts_${yr}` };
    });
    if (owner) break;
}
if (!owner) { console.error(`No contract owns material row ${product}. Refusing to point a line at nothing.`); process.exit(1); }

// The movement this line produced, keyed by the line id.
const stocks = await db.collection(`${workspace}/data/stocks`).get();
const movements = [];
stocks.forEach(d => { if (String(d.id).startsWith(lineId)) movements.push({ _docId: d.id, ...d.data() }); });

console.log(`\ninvoice ${inv.invoice} [${inv.invType}] · line ${idx + 1} · qnty ${line.qnty} · ${String(line.descriptionText || '').slice(0, 40)}`);
console.log(`  descriptionId ${line.descriptionId}  →  ${product}   (PO ${owner.order}, ${owner.bucket})`);
for (const m of movements) {
    console.log(`movement ${String(m._docId).slice(0, 8)} · type ${m.type} · qnty ${m.qnty} · invoice ${m.invoice} [${m.invType}]`);
    console.log(`  descriptionId ${m.descriptionId}  →  ${product}`);
}
if (!movements.length) console.log('(no stock movement found for this line — only the invoice will be updated)');

if (!apply) {
    console.log('\nDry run — nothing was written. Re-run with --apply.');
    process.exit(0);
}

const batch = db.batch();
batch.update(invRef, {
    productsDataInvoice: lines.map((p, i) => (i === idx ? { ...p, descriptionId: product } : p)),
});
for (const m of movements) {
    batch.update(db.doc(`${workspace}/data/stocks/${m._docId}`), { descriptionId: product });
}
await batch.commit();

console.log(`\nDone. Line ${idx + 1} of invoice ${inv.invoice} and ${movements.length} movement(s) now point at ${product} (PO ${owner.order}).`);
process.exit(0);
