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
//   node linkInvoiceToContract.mjs --workspace <uid> --po 0904-26 --invoice 0032
//
//   # 2. Once the dry run names the right two records:
//   node linkInvoiceToContract.mjs --workspace <uid> --po 0904-26 --invoice 0032 --apply
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

// PO numbers are typed by hand and reformatted by the IMS/GIS copy ('090426' vs
// '0904-26'), so compare on the digits and letters alone.
const norm = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');

const scan = async (path, match) => {
    const found = [];
    for (const yr of years) {
        const snap = await db.collection(`${workspace}/data/${path}_${yr}`).get();
        snap.forEach(d => { const v = d.data(); if (match(v)) found.push({ ...v, _bucket: `${path}_${yr}` }); });
    }
    return found;
};

const contracts = await scan('contracts', c => norm(c.order) === norm(po));
const invoices = await scan('invoices', i => norm(i.invoice) === norm(invNo));

const describe = (label, rows, fmt) => {
    console.log(`\n${label}: ${rows.length} found`);
    rows.forEach((r, i) => console.log(`  [${i}] ${fmt(r)}   (${r._bucket}, id ${r.id})`));
};

describe(`Contracts matching PO "${po}"`, contracts, c => `PO ${c.order} · ${c.date} · ${(c.invoices || []).length} invoice(s) attached`);
describe(`Invoices matching "${invNo}"`, invoices, i => `Invoice ${i.invoice} · ${i.date || i.dateRange?.startDate} · total ${i.totalAmount ?? '?'} · currently points at contract ${i.poSupplier?.id || '(none)'}`);

if (contracts.length !== 1 || invoices.length !== 1) {
    console.error(
        `\nRefusing to guess: this links exactly ONE invoice to ONE contract.` +
        `\nNarrow it with --year, or use a fuller invoice number (e.g. 0032FN rather than 0032).`
    );
    process.exit(1);
}

const contract = contracts[0];
const inv = invoices[0];
const invDate = inv.date || inv.dateRange?.startDate || '';
const conDate = contract.dateRange?.startDate || contract.date || '';

// Exactly the shape the app writes when an invoice is created inside a contract
// (hooks/useInvoiceState.js:196) — anything else and the app reads it as broken.
const poSupplier = { id: contract.id, order: contract.order || '', date: conDate };
const entry = { id: inv.id, date: invDate, invType: inv.invType || '1111', invoice: inv.invoice };

console.log('\n── Planned changes ─────────────────────────────────────────────');
console.log(`invoice ${inv.invoice} (${inv._bucket})`);
console.log(`   poSupplier: ${JSON.stringify(inv.poSupplier)}`);
console.log(`            → ${JSON.stringify(poSupplier)}`);
console.log(`contract ${contract.order} (${contract._bucket})`);
console.log(`   invoices[]: ${(contract.invoices || []).length} entr(ies) → adds ${JSON.stringify(entry)}`);

if (!apply) {
    console.log('\nDry run — nothing was written. Re-run with --apply to make these changes.');
    process.exit(0);
}

// Both writes in one atomic batch: a half-applied link is the state we are here
// to repair, so it must not be the state we can leave behind.
const already = (contract.invoices || []).some(x => x?.id === inv.id);
const batch = db.batch();

batch.update(db.doc(`${workspace}/data/${inv._bucket}/${inv.id}`), {
    poSupplier,
    poSupplierOrder: contract.order || '',
});

if (!already) {
    batch.update(db.doc(`${workspace}/data/${contract._bucket}/${contract.id}`), {
        invoices: [...(contract.invoices || []), entry],
    });
}

await batch.commit();
console.log(`\nLinked. Invoice ${inv.invoice} now belongs to PO ${contract.order}${already ? ' (it was already listed on the contract)' : ''}.`);
console.log('Reload the app to see it.');
process.exit(0);
