// linkInvoiceToContract.mjs — re-attach a sales invoice to a contract.
//
// Needed when an invoice outlives the contract it belonged to (a contract deleted
// while its invoices were still hanging off it). The invoice still holds a
// poSupplier pointing at a contract id that no longer exists, so the app reports
// "Contract can not be accessed!" and the invoice cannot be opened, corrected or
// deleted — every route to it goes through its contract.
//
// A link is TWO records, and both have to agree:
//   • the invoice's  poSupplier = { id, order, date }  → points at the contract
//   • the contract's invoices[] entry { id, date, invType, invoice } → lists it back
// Writing only one leaves the same broken state in the other direction.
//
// ─── Credentials ─────────────────────────────────────────────────────────────
// Uses ./serviceAccountKey.json, same as createSuperAdmin.mjs.
//
// ─── Usage ───────────────────────────────────────────────────────────────────
//   # 1. See what it finds — writes NOTHING without --apply:
//   node linkInvoiceToContract.mjs --workspace <uid> --po 0904-26 --invoice 0032,0032FN
//
//   # 2. Once the dry run names the right two records:
//   node linkInvoiceToContract.mjs --workspace <uid> --po 0904-26 --invoice 0032,0032FN --apply
//
// Add --year 2026 to narrow the search (it scans the last 4 years by default).

import admin from 'firebase-admin';
import { readFileSync } from 'node:fs';

const args = Object.fromEntries(
    process.argv.slice(2).reduce((acc, cur, i, arr) => {
        if (cur.startsWith('--')) acc.push([cur.slice(2), arr[i + 1]?.startsWith('--') ? true : arr[i + 1] ?? true]);
        return acc;
    }, [])
);

const { workspace, po, invoice: invNo, year, apply } = args;

if (!workspace || !po || !invNo) {
    console.error('Usage: node linkInvoiceToContract.mjs --workspace <uid> --po <order> --invoice <number> [--year YYYY] [--apply]');
    process.exit(1);
}

admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(readFileSync('./serviceAccountKey.json', 'utf8'))),
});
const db = admin.firestore();

// Records are stored one collection per year (contracts_2026, invoices_2026, …).
const thisYear = new Date().getFullYear();
const years = year ? [Number(year)] : [thisYear, thisYear - 1, thisYear - 2, thisYear - 3];

// Compare on digits and letters alone, without leading zeros. Two reasons: PO
// numbers are typed by hand and reformatted by the IMS/GIS copy ('090426' vs
// '0904-26'), and invoice numbers are STORED as numbers (32) while the app pads
// them for display (0032) — so the number you read off the screen never matches
// the stored value literally.
const norm = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '').replace(/^0+/, '');

const scan = async (path, match) => {
    const found = [];
    for (const yr of years) {
        const snap = await db.collection(`${workspace}/data/${path}_${yr}`).get();
        snap.forEach(d => { const v = d.data(); if (match(v)) found.push({ ...v, _bucket: `${path}_${yr}` }); });
    }
    return found;
};

// An invoice and its final note are separate records that belong to the same PO,
// so --invoice takes a list: "0032,0032FN". They are linked in ONE batch rather
// than one run each, because each run rewrites the contract's whole invoices[]
// array — two runs against a contract read before either finished would drop one.
const wanted = String(invNo).split(',').map(s => s.trim()).filter(Boolean);

const contracts = await scan('contracts', c => norm(c.order) === norm(po));
const invoices = await scan('invoices', i => wanted.some(w => norm(i.invoice) === norm(w)));

console.log(`\nContracts matching PO "${po}": ${contracts.length} found`);
contracts.forEach((c, i) => console.log(`  [${i}] PO ${c.order} · ${c.date} · ${(c.invoices || []).length} invoice(s) attached   (${c._bucket}, id ${c.id})`));

console.log(`\nInvoices matching ${wanted.join(', ')}: ${invoices.length} found`);
invoices.forEach((v, i) => console.log(
    // invType is what the app renders as the CN/FN suffix — the suffix is never
    // part of the stored number, so "0032FN" is invoice 32 with a final-note type.
    `  [${i}] Invoice ${v.invoice} [${v.invType ?? 'no type'}] · ${v.date || v.dateRange?.startDate} · total ${v.totalAmount ?? '?'}` +
    ` · client ${v.client || '(none)'} · currently points at contract ${v.poSupplier?.id || '(none)'}   (${v._bucket}, id ${v.id})`
));

if (contracts.length !== 1) {
    console.error(`\nRefusing to guess: expected exactly ONE contract for PO "${po}", found ${contracts.length}. Narrow it with --year.`);
    process.exit(1);
}

// Every number asked for must match exactly one record — a missing one means the
// invoice is not where we think it is, and a doubled one means the duplicate
// problem again. Either way, stop rather than link the wrong record.
for (const w of wanted) {
    const hits = invoices.filter(v => norm(v.invoice) === norm(w));
    if (hits.length !== 1) {
        console.error(`\nRefusing to guess: "${w}" matched ${hits.length} invoices, expected exactly 1.`);
        process.exit(1);
    }
}

const contract = contracts[0];
const conDate = contract.dateRange?.startDate || contract.date || '';

// Exactly the shape the app writes when an invoice is created inside a contract
// (hooks/useInvoiceState.js:196) — anything else and the app reads it as broken.
const poSupplier = { id: contract.id, order: contract.order || '', date: conDate };

const entries = invoices.map(v => ({
    id: v.id,
    date: v.date || v.dateRange?.startDate || '',
    invType: v.invType || '1111',
    invoice: v.invoice,
}));

console.log('\n── Planned changes ─────────────────────────────────────────────');
for (const v of invoices) {
    console.log(`invoice ${v.invoice} (${v._bucket})`);
    console.log(`   poSupplier: ${JSON.stringify(v.poSupplier)}`);
    console.log(`            → ${JSON.stringify(poSupplier)}`);
}
const missing = entries.filter(e => !(contract.invoices || []).some(x => x?.id === e.id));
console.log(`contract ${contract.order} (${contract._bucket})`);
console.log(`   invoices[]: ${(contract.invoices || []).length} entr(ies) → adds ${missing.length}: ${JSON.stringify(missing)}`);

if (!apply) {
    console.log('\nDry run — nothing was written. Re-run with --apply to make these changes.');
    process.exit(0);
}

// Every write in one atomic batch: a half-applied link is the state we are here
// to repair, so it must not be the state we can leave behind.
const batch = db.batch();

for (const v of invoices) {
    batch.update(db.doc(`${workspace}/data/${v._bucket}/${v.id}`), {
        poSupplier,
        poSupplierOrder: contract.order || '',
    });
}

if (missing.length) {
    batch.update(db.doc(`${workspace}/data/${contract._bucket}/${contract.id}`), {
        invoices: [...(contract.invoices || []), ...missing],
    });
}

await batch.commit();
console.log(`\nLinked ${invoices.map(v => v.invoice).join(' and ')} to PO ${contract.order}.`);
console.log('Reload the app to see it.');
process.exit(0);
