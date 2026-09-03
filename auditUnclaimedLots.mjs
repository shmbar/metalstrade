// auditUnclaimedLots.mjs — find stock lots no contract admits to owning.
//
// A contract keeps a list of its lots in `stock[]`, and each lot names its contract
// in `contractData.id`. Both are written together, so they normally agree. When they
// do not — the lot names a contract that exists, and that contract's list does not
// mention the lot — the lot is a duplicate left by a copy flow. Two have been found
// this way (Seagull PO 240726, 110 MT; PO 210826-TIM Mo Bars, 10 MT), each doubling
// the tonnage of a real lot beside it.
//
// READ-ONLY. It names candidates; removePhantomLot.mjs removes one, and repeats the
// same safety check before it does.
//
// Deliberately narrow, because "not in stock[]" alone is not proof:
//   • 'out' rows are movements, never listed in stock[] — skipped.
//   • a lot whose contract is missing entirely is orphaned, a different problem —
//     reported separately, not as a duplicate.
//   • only a lot that has a TWIN (same contract, same material) is called a likely
//     duplicate; an unclaimed lot standing alone might simply have lost its listing,
//     and deleting it would destroy real stock.
//
// Usage: node auditUnclaimedLots.mjs [--workspace <uid>]

import admin from 'firebase-admin';
import { readFileSync } from 'node:fs';

const args = Object.fromEntries(
    process.argv.slice(2).reduce((acc, cur, i, arr) => {
        if (cur.startsWith('--')) acc.push([cur.slice(2), arr[i + 1]?.startsWith('--') ? true : arr[i + 1] ?? true]);
        return acc;
    }, [])
);

admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(readFileSync('./serviceAccountKey.json', 'utf8'))),
});
const db = admin.firestore();

const ALL = { GIS: 'aB3dE7FgHi9JkLmNoPqRsTuVwGIS', IMS: 'DQ9gNTpvXqh6K9BqMTPTgCfxD2Z2' };
const accounts = args.workspace ? { [args.workspace]: args.workspace } : ALL;

for (const [name, ws] of Object.entries(accounts)) {
    const st = (await db.doc(`${ws}/settings`).get()).data() || {};
    const supName = (id) => (st.Supplier?.Supplier || []).find(x => x.id === id)?.nname || String(id || '').slice(0, 8);
    const whName = (id) => (st.Stocks?.Stocks || []).find(x => x.id === id)?.nname
        || (st.Stocks?.Stocks || []).find(x => x.id === id)?.stock || String(id || '').slice(0, 8);

    // Every contract, by id, with the lots it claims.
    const contracts = new Map();
    for (const yr of [2026, 2025, 2024, 2023]) {
        (await db.collection(`${ws}/data/contracts_${yr}`).get()).forEach(d => {
            const c = d.data();
            contracts.set(c.id, { order: c.order, claims: new Set(c.stock || []), materials: c.productsData || [] });
        });
    }

    const unclaimed = [];
    const orphaned = [];
    const byContractMaterial = new Map();

    (await db.collection(`${ws}/data/stocks`).get()).forEach(d => {
        const v = d.data();
        if (v.type === 'out') return;                     // a movement, not a holding
        const conId = v.contractData?.id;
        if (!conId) return;                               // hand-added stock, no parent to check
        const con = contracts.get(conId);
        if (!con) { orphaned.push({ id: d.id, order: v.order, qnty: v.qnty }); return; }

        const key = `${conId}::${v.descriptionId || v.description || ''}`;
        (byContractMaterial.get(key) || byContractMaterial.set(key, []).get(key)).push({ id: d.id, ...v });

        if (!con.claims.has(d.id)) unclaimed.push({ id: d.id, con, key, ...v });
    });

    console.log(`\n===== ${name} =====`);
    console.log(`lots not listed by the contract they name: ${unclaimed.length}`);

    for (const l of unclaimed) {
        const siblings = byContractMaterial.get(l.key) || [];
        const mat = l.con.materials.find(m => m.id === l.descriptionId);
        const held = siblings.reduce((t, s) => t + (Number(s.qnty) || 0), 0);
        const bought = Number(mat?.qnty);

        // A duplicate is a SECOND lot of the same material in the SAME warehouse,
        // pushing the total past what the contract bought. Both halves matter:
        //
        //   • Same warehouse. The same quantity in two DIFFERENT warehouses is a
        //     transfer — the material moved, and both rows are real. Two lots of
        //     9.648 at Access and DWP are one parcel, not two.
        //   • Over the contract quantity. Material legitimately arrives in several
        //     lots; that is a split delivery, and the total still reconciles.
        //
        // Miss either test and this would recommend deleting real stock, which is
        // far worse than leaving a duplicate in place.
        const sameWarehouse = siblings.filter(s => s.stock === l.stock);
        const overBought = Number.isFinite(bought) && held > bought + 0.011;
        const duplicate = sameWarehouse.length > 1 && overBought;

        console.log(
            `  ${duplicate ? 'DUPLICATE       ' : 'unlisted (check) '} · ${String(l.qnty).padStart(9)} MT` +
            ` · PO ${l.con.order} · ${supName(l.supplier)} @ ${whName(l.stock)}` +
            ` · lot ${l.id.slice(0, 8)}`
        );
        console.log(`        material "${mat?.description ?? '(not on the contract)'}" — bought ${bought ?? '?'},` +
            ` ${siblings.length} lot(s) hold ${held.toFixed(3)}` +
            ` (${sameWarehouse.length} in this warehouse)`);
        if (duplicate) {
            console.log(`        remove with: node removePhantomLot.mjs --workspace ${ws} --lot ${l.id.slice(0, 8)} --apply`);
        } else if (sameWarehouse.length <= 1) {
            console.log(`        probably a transfer or a re-listing — do NOT delete without checking`);
        } else {
            console.log(`        total is within what was bought — leave alone`);
        }
    }

    if (orphaned.length) {
        console.log(`\nlots naming a contract that no longer exists: ${orphaned.length}`);
        orphaned.forEach(o => console.log(`  ${String(o.qnty).padStart(9)} MT · PO ${o.order} · lot ${o.id.slice(0, 8)}`));
    }
}
process.exit(0);
