// Deleting a contract AND everything it holds, in one action.
//
// This used to be refused outright whenever the contract still held a sales
// invoice, a stock lot or a purchase invoice, so removing one meant emptying it
// by hand — record by record, in the right order, each with its own refusals. A
// contract copied by mistake is a long job for data nobody wants. The refusals
// are replaced by a plan the user confirms in the dialog: what is about to go,
// counted and named, then deleted in one pass.
//
// ONE atomic batch, not a delete per record. Two reasons. Each individual delete
// only resolves once the server acknowledges it, so a contract with a dozen
// children meant a dozen sequential round trips and a spinner that sat there.
// And a half-finished cascade is the worst outcome available: children gone,
// contract still standing, or the reverse. Batched, it either all goes or none
// of it does.

import { delDocsBatch, loadInvoice, loadStockData } from './utils';
import { planContractDeletion, yearBucketOf } from './contractCascadePlan';

export { planContractDeletion };

// A contract LISTS its children, but the list is not proof of ownership: a
// contract duplicated by the IMS/GIS copy carries the same invoices[] and stock[]
// as the original, so it claims records that belong to its twin. Following that
// list blindly would delete the live invoice and the live stock lot while removing
// the spare copy — the worst possible outcome of a tidy-up.
//
// A child names its own parent, and that direction cannot be duplicated: an
// invoice's poSupplier.id and a lot's contractData.id point at exactly one
// contract. So every child is checked before it is deleted, and one that belongs
// to a different contract is left alone and reported.
const belongsToContract = (child, conId) => {
    const owner = child?.poSupplier?.id ?? child?.contractData?.id;
    // No back-reference at all: nothing else claims it, so it goes with its parent.
    return !owner || owner === conId;
};

export const deleteContractCascade = async (uidCollection, con) => {
    const plan = planContractDeletion(con || {});
    const skipped = [];
    const targets = [];
    const notOurs = [];

    // A record whose year cannot be resolved is NOT quietly dropped: deleting a
    // document that isn't there is a success as far as Firestore is concerned, so
    // guessing the bucket would report a clean sweep while leaving the record
    // behind. Collect these and tell the user instead.
    for (const inv of plan.invoices) {
        const y = yearBucketOf(inv.date);
        if (!y) { skipped.push(`sales invoice ${inv.invoice ?? inv.id}`); continue; }
        const live = await loadInvoice(uidCollection, 'invoices', { id: inv.id, date: inv.date });
        if (live?.id && !belongsToContract(live, con.id)) {
            notOurs.push(`sales invoice ${inv.invoice ?? inv.id}`);
            continue;
        }
        targets.push({ collection: `invoices_${y}`, id: inv.id });
    }

    for (const exp of plan.expenses) {
        const y = yearBucketOf(exp.date);
        if (!y) { skipped.push(`expense ${exp.expense ?? exp.id}`); continue; }
        targets.push({ collection: `expenses_${y}`, id: exp.id });
    }

    // Stock lots are one flat collection keyed by id — no year to resolve.
    const liveLots = plan.stockIds.length ? await loadStockData(uidCollection, 'id', plan.stockIds) : [];
    for (const id of plan.stockIds) {
        const lot = liveLots?.find(l => l?.id === id);
        if (lot && !belongsToContract(lot, con.id)) {
            notOurs.push(`stock lot ${String(id).slice(0, 8)}`);
            continue;
        }
        targets.push({ collection: 'stocks', id });
    }

    // Purchase invoices are stored inside the contract document, so they need no
    // delete of their own — they go when it goes.
    const conYear = yearBucketOf(con?.date || con?.dateRange);
    if (!conYear) {
        return { ok: false, plan, skipped: [...skipped, 'the contract itself (its date could not be read)'] };
    }
    targets.push({ collection: `contracts_${conYear}`, id: con.id });

    await delDocsBatch(uidCollection, targets);

    return { ok: true, plan, skipped, notOurs };
};
