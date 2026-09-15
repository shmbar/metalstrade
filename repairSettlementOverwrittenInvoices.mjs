// repairSettlementOverwrittenInvoices.mjs — undo a final settlement that overwrote
// supplier invoice values with PO prices.
//
// Confirming a final settlement sets each purchase invoice's value to the sum of its
// settlement rows' `finaltotal` (finalSettlmentModal.js). Those rows are pre-filled
// with the lot's price, which is the PO CONTRACT price — so a settlement confirmed
// without the real final prices entered replaces what the supplier actually invoiced
// with quantity × PO price. On invoices already paid in full, that reopens a balance
// nobody owes: Thormet PO 300126, confirmed 2026-09-11 12:58 UTC, reopened ten
// invoices for $291,760.84 in total.
//
// An invoice is called overwritten only when ALL of these hold:
//   • its value equals the settlement total for it, to the cent — the settlement wrote it
//   • it now shows a balance
//   • it carries a 100% payment row equal to what was paid — the percentage is computed
//     against the value at the moment the payment was entered, so this is the record's
//     own evidence that the value then was exactly the amount paid
//
// Nothing is lost by the repair: the settled totals remain on the settlement rows.
//
// Usage:
//   node repairSettlementOverwrittenInvoices.mjs                       # audit both accounts
//   node repairSettlementOverwrittenInvoices.mjs --po 300126           # audit one PO
//   node repairSettlementOverwrittenInvoices.mjs --workspace <uid> --po 300126 --apply
//
// Signs in as the app user from .env.local, like repair2808.mjs.

import { readFileSync } from 'node:fs';

const args = Object.fromEntries(
    process.argv.slice(2).reduce((acc, cur, i, arr) => {
        if (cur.startsWith('--')) acc.push([cur.slice(2), arr[i + 1]?.startsWith('--') ? true : arr[i + 1] ?? true]);
        return acc;
    }, [])
);

const genv = (k) => { for (const f of ['.env.local', '.env']) { try { const l = readFileSync(f, 'utf8').split(/\r?\n/).find(x => x.startsWith(k + '=')); if (l) return l.slice(l.indexOf('=') + 1).trim(); } catch { } } return null; };
const { initializeApp } = await import('firebase/app');
const { getAuth, signInWithEmailAndPassword } = await import('firebase/auth');
const { getFirestore, collection, getDocs, doc, updateDoc } = await import('firebase/firestore');
let email = genv('IMS_TEST_EMAIL'); if (!email.includes('@')) email += '@ims-metals.com';
const app = initializeApp({ apiKey: genv('NEXT_PUBLIC_API_KEY'), authDomain: genv('NEXT_PUBLIC_AUTH_DOMAIN'), projectId: genv('NEXT_PUBLIC_PROJECT_ID') });
await signInWithEmailAndPassword(getAuth(app), email, genv('IMS_TEST_PASSWORD'));
const db = getFirestore(app);

const ACCOUNTS = { IMS: 'DQ9gNTpvXqh6K9BqMTPTgCfxD2Z2', GIS: 'aB3dE7FgHi9JkLmNoPqRsTuVwGIS' };
const accounts = args.workspace
    ? Object.fromEntries(Object.entries(ACCOUNTS).filter(([, ws]) => ws === args.workspace))
    : ACCOUNTS;
if (args.workspace && !Object.keys(accounts).length) { console.error(`Unknown workspace ${args.workspace}`); process.exit(1); }

if (args.apply && (!args.workspace || !args.po)) {
    console.error('--apply repairs one contract at a time: pass both --workspace and --po.');
    process.exit(1);
}

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const norm = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '').replace(/^0+/, '');

let grandCount = 0, grandSum = 0;

for (const [name, ws] of Object.entries(accounts)) {
    // Settlement totals per contract + purchase invoice, exactly as the confirm sums them.
    const settled = new Map();
    (await getDocs(collection(db, ws, 'data', 'stocks'))).docs.forEach(d => {
        const l = d.data();
        if (l.type === 'out' || !l.poInvoice || !l.contractData?.id || l.finaltotal == null) return;
        const key = `${l.contractData.id}::${l.poInvoice}`;
        settled.set(key, (settled.get(key) || 0) + (parseFloat(l.finaltotal) || 0));
    });

    console.log(`\n===== ${name} =====`);
    let found = 0;

    for (const yr of [2026, 2025, 2024, 2023]) {
        const docs = (await getDocs(collection(db, ws, 'data', `contracts_${yr}`))).docs;
        for (const d of docs) {
            const c = d.data();
            if (args.po && norm(c.order) !== norm(args.po)) continue;

            const flagged = [];
            for (const p of c.poInvoices || []) {
                const s = settled.get(`${c.id}::${p.id}`);
                if (s == null) continue;
                const value = round2(p.invValue), paid = round2(p.pmnt), blnc = round2(p.blnc);
                if (Math.abs(value - round2(s)) > 0.01) continue;   // not written by a settlement
                if (blnc <= 0.011) continue;                         // nothing reopened
                const full = (p.payments || []).find(x =>
                    Math.abs((parseFloat(x.pmntPerc) || 0) - 100) < 0.05 && Math.abs(round2(x.pmnt) - paid) < 0.01);
                if (!full) continue;                                 // no evidence it was once paid in full
                flagged.push({ p, value, paid, blnc, date: full.pmntDate?.startDate || '-' });
            }
            if (!flagged.length) continue;

            found += flagged.length;
            const sum = flagged.reduce((t, f) => t + f.blnc, 0);
            grandCount += flagged.length; grandSum += sum;
            console.log(`\nPO ${c.order} (contracts_${yr}) — ${flagged.length} invoice(s), ${sum.toFixed(2)} reopened`);
            for (const f of flagged) {
                console.log(`   inv ${String(f.p.inv).padEnd(10)} paid in full ${f.date}: ${f.paid.toFixed(2).padStart(11)}`
                    + `  → settlement set ${f.value.toFixed(2).padStart(11)}  (balance ${f.blnc.toFixed(2)})`);
            }

            if (args.apply) {
                const ids = new Set(flagged.map(f => f.p.id));
                const poInvoices = c.poInvoices.map(p => ids.has(p.id)
                    ? { ...p, invValue: round2(p.pmnt), blnc: 0 }
                    : p);
                await updateDoc(doc(db, ws, 'data', `contracts_${yr}`, c.id), { poInvoices });
                console.log(`   restored ${flagged.length} invoice value(s) to the amount paid; balances cleared.`);
                console.log('   NOTE: the settlement still holds PO prices. Re-confirming it will overwrite these again');
                console.log('         until the real final prices are entered on it.');
            }
        }
    }
    if (!found) console.log('no settlement-overwritten invoices found');
}

console.log(`\nTOTAL: ${grandCount} invoice(s), ${grandSum.toFixed(2)} in reopened balances.`);
if (!args.apply && grandCount) console.log('Dry run — nothing was written.');
process.exit(0);
