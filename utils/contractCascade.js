// Deleting a contract AND everything it holds, in one action.
//
// This used to be refused outright whenever the contract still held a sales
// invoice, a stock lot or a purchase invoice, so removing one meant emptying it
// by hand — record by record, in the right order, each with its own refusals. A
// contract copied by mistake is a long job for data nobody wants. The refusals
// are replaced by a plan the user confirms in the dialog: what is about to go,
// counted and named, then deleted in one pass.
//
// Children are deleted BEFORE the contract itself, so a failure part-way leaves
// the contract standing as the anchor to retry from, rather than orphans with
// nothing left pointing at them.

import { delDoc, delStock } from './utils';
import { planContractDeletion, yearBucketOf } from './contractCascadePlan';

export { planContractDeletion };

export const deleteContractCascade = async (uidCollection, con) => {
    const plan = planContractDeletion(con || {});
    const skipped = [];

    for (const inv of plan.invoices) {
        const y = yearBucketOf(inv.date);
        if (!y) { skipped.push(`sales invoice ${inv.invoice ?? inv.id}`); continue; }
        await delDoc(uidCollection, 'invoices', { ...inv, date: y });
    }

    for (const exp of plan.expenses) {
        const y = yearBucketOf(exp.date);
        if (!y) { skipped.push(`expense ${exp.expense ?? exp.id}`); continue; }
        await delDoc(uidCollection, 'expenses', { ...exp, date: y });
    }

    // Stock lots are one flat collection keyed by id — a single batch, no year.
    if (plan.stockIds.length) await delStock(uidCollection, plan.stockIds);

    const conYear = yearBucketOf(con?.date || con?.dateRange);
    if (!conYear) {
        skipped.push('the contract itself');
        return { ok: false, plan, skipped };
    }
    const ok = await delDoc(uidCollection, 'contracts', { ...con, date: conYear });

    return { ok: !!ok, plan, skipped };
};
