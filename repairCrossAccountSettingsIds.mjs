// repairCrossAccountSettingsIds.mjs — repair contract dropdown values that point at
// a settings entry the account does not have.
//
// Every dropdown on a contract (port of loading, packing, payment terms, …) stores
// a settings id, and those ids are per workspace: IMS and GIS forked from one seed
// list, so the entries they both inherited share an id while anything added since
// carries a uuid that exists on one side only. "Copy to IMS/GIS" used to carry them
// across verbatim, so the copy landed holding an id its new account cannot explain.
//
// The table then printed the raw uuid where a port name belongs — which is what a
// client reported on IMS PO 090426 — and the contract PDF, which blanks anything it
// cannot resolve, printed the field empty. Two IMS contracts went out with no
// payment-terms clause that way.
//
// Three repairs, matching what contractDetails.js now does at copy time:
//   REPOINT     the account already has that same label under its own id → use it
//   ADD-ENTRY   it has no such entry → create it, keeping the id already on the
//               contract, so the two accounts converge on one id for that name
//   ADOPT-TEXT  the value is not an id at all but a label somebody typed → create
//               the entry with a fresh id and point the contract at it
//
// Usage:
//   node repairCrossAccountSettingsIds.mjs                    # dry run, both accounts
//   node repairCrossAccountSettingsIds.mjs --apply            # write
//   node repairCrossAccountSettingsIds.mjs --workspace IMS    # limit to one account

import admin from 'firebase-admin';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

const args = Object.fromEntries(
    process.argv.slice(2).reduce((acc, cur, i, arr) => {
        if (cur.startsWith('--')) acc.push([cur.slice(2), String(arr[i + 1] ?? '').startsWith('--') ? true : arr[i + 1] ?? true]);
        return acc;
    }, [])
);
const { apply, workspace } = args;

admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(readFileSync('./serviceAccountKey.json', 'utf8'))),
});
const db = admin.firestore();

const ACCOUNTS = [
    { name: 'IMS', uid: 'DQ9gNTpvXqh6K9BqMTPTgCfxD2Z2' },
    { name: 'GIS', uid: 'aB3dE7FgHi9JkLmNoPqRsTuVwGIS' },
].filter(a => !workspace || workspace === true || a.name.toLowerCase() === String(workspace).toLowerCase());

// contract field -> settings section holding its options
const FIELDS = {
    shpType: 'Shipment',
    origin: 'Origin',
    delTerm: 'Delivery Terms',
    pol: 'POL',
    pod: 'POD',
    packing: 'Packing',
    contType: 'Container Type',
    size: 'Size',
    deltime: 'Delivery Time',
    termPmnt: 'Payment Terms',
    qTypeTable: 'Quantity',
};

// A settings entry is { id, deleted, <one field naming it> }; the naming field is
// per section ('pol', 'delTerm', …), so read it positionally.
const entryKey = (e) => Object.keys(e || {}).find(k => k !== 'id' && k !== 'deleted');
const entryLabel = (e) => (entryKey(e) ? e[entryKey(e)] : null);
const normLabel = (v) => String(v ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
const SECTION_KEY = {
    Shipment: 'shpType', Origin: 'origin', 'Delivery Terms': 'delTerm', POL: 'pol', POD: 'pod',
    Packing: 'packing', 'Container Type': 'contType', Size: 'size', 'Delivery Time': 'deltime',
    'Payment Terms': 'termPmnt', Quantity: 'qTypeTable',
};

// Values that are placeholders rather than anything a user chose. Adopting these as
// real settings entries would only spread the debris.
const JUNK = /^!?_?new /i;

// 'empty' is not a missing origin — it is an option the contract and invoice forms
// inject themselves ({ id: 'empty', origin: '...Empty' }) to mean "deliberately
// blank", and the PDF checks for it by name before deciding to print an origin at
// all. It belongs in no settings list; adopting it would create an origin called
// "empty" and break that check.
const SENTINELS = new Set(['empty']);

const settingsOf = async (uid) => (await db.doc(`${uid}/settings`).get()).data() || {};
const listOf = (s, section) => (s?.[section]?.[section] || []);

const all = {};
for (const a of [{ name: 'IMS', uid: 'DQ9gNTpvXqh6K9BqMTPTgCfxD2Z2' }, { name: 'GIS', uid: 'aB3dE7FgHi9JkLmNoPqRsTuVwGIS' }]) {
    all[a.name] = await settingsOf(a.uid);
}

let planned = 0;
for (const acc of ACCOUNTS) {
    const other = acc.name === 'IMS' ? 'GIS' : 'IMS';
    const mine = all[acc.name];
    const theirs = all[other];

    console.log(`\n================ ${acc.name} ================`);

    // Settings entries to append to THIS account, keyed by section.
    const additions = {};
    // Contract field rewrites: { collection, docId, field, from, to, why }
    const rewrites = [];

    for (const year of ['2021', '2022', '2023', '2024', '2025', '2026', '2027']) {
        let snap;
        try { snap = await db.collection(`${acc.uid}/data/contracts_${year}`).get(); } catch { continue; }
        if (snap.empty) continue;

        snap.forEach(d => {
            const c = d.data();
            for (const [field, section] of Object.entries(FIELDS)) {
                if (field === 'termPmnt' && c?.isTermPmntText) continue;   // free text by design
                const v = c?.[field];
                if (!v || typeof v !== 'string') continue;
                if (SENTINELS.has(v)) continue;

                const myList = listOf(mine, section);
                if (myList.some(x => String(x?.id) === v)) continue;       // resolves fine

                const pending = additions[section] || [];
                if (pending.some(x => String(x.id) === v)) continue;       // already queued

                const label = entryLabel(listOf(theirs, section).find(x => String(x?.id) === v));

                if (label && !JUNK.test(label)) {
                    // The other account can name it. Prefer this account's own entry
                    // for the same label; otherwise adopt the id so it resolves here.
                    const twin = myList.find(x => normLabel(entryLabel(x)) === normLabel(label));
                    if (twin) {
                        rewrites.push({ coll: `contracts_${year}`, docId: d.id, po: c.order, field, from: v, to: twin.id, why: `REPOINT   -> ${acc.name}'s own id for "${label}"` });
                    } else {
                        additions[section] = [...pending, { id: v, [SECTION_KEY[section]]: label, deleted: false }];
                        console.log(`  ADD-ENTRY  PO ${String(c.order).padEnd(18)} ${field.padEnd(9)} ${section} += "${label}"  (id ${v})`);
                        planned++;
                    }
                    continue;
                }

                if (label) continue;   // junk placeholder — leave it, nothing to preserve

                // Not an id in either account. If it reads as a label, adopt it.
                if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)) {
                    console.log(`  UNKNOWN    PO ${String(c.order).padEnd(18)} ${field.padEnd(9)} = ${v}  (a uuid neither account knows — left alone, needs a human)`);
                    continue;
                }
                const twin = myList.find(x => normLabel(entryLabel(x)) === normLabel(v));
                if (twin) {
                    rewrites.push({ coll: `contracts_${year}`, docId: d.id, po: c.order, field, from: v, to: twin.id, why: `ADOPT-TEXT-> existing "${entryLabel(twin)}"` });
                } else {
                    const id = randomUUID();
                    additions[section] = [...pending, { id, [SECTION_KEY[section]]: v, deleted: false }];
                    rewrites.push({ coll: `contracts_${year}`, docId: d.id, po: c.order, field, from: v, to: id, why: `ADOPT-TEXT-> new ${section} entry "${v}"` });
                }
            }
        });
    }

    for (const r of rewrites) {
        console.log(`  ${r.why.split('->')[0].trim().padEnd(10)} PO ${String(r.po).padEnd(18)} ${r.field.padEnd(9)} ${r.from}  ->  ${r.to}   ${r.why.split('->').slice(1).join('->').trim()}`);
        planned++;
    }

    if (!apply) continue;

    // Settings first: the ids the contracts point at must resolve by the time the
    // rewrites land, and an ADD-ENTRY has no contract write of its own.
    const pairs = [];
    for (const [section, entries] of Object.entries(additions)) {
        const list = listOf(all[acc.name], section);
        const fresh = entries.filter(e => !list.some(x => String(x?.id) === String(e.id)));
        if (fresh.length) pairs.push(new admin.firestore.FieldPath(section, section), [...list, ...fresh]);
    }
    if (pairs.length) {
        await db.doc(`${acc.uid}/settings`).update(...pairs);
        console.log(`  ✓ settings updated (${pairs.length / 2} section(s))`);
    }

    for (const r of rewrites) {
        await db.doc(`${acc.uid}/data/${r.coll}/${r.docId}`).update({ [r.field]: r.to });
        console.log(`  ✓ PO ${r.po} ${r.field} -> ${r.to}`);
    }
}

console.log(`\n${planned} repair(s) ${apply ? 'applied' : 'planned — re-run with --apply to write'}.`);
process.exit(0);
