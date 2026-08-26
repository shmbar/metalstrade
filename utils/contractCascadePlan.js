// The pure half of the contract cascade delete: what a contract owns, and which
// year bucket each of its records lives in. Kept out of pureHelpers.js on purpose
// — that module is mirrored byte-for-byte into the mobile app, and deleting a
// contract is a web-only action mobile would carry as dead code. Kept out of
// contractCascade.js too, so this can be unit-tested without booting Firebase.

import { toIsoDate } from './pureHelpers';

// Sales invoices, expense invoices and stock lots are documents of their own.
// Purchase invoices live INSIDE the contract document and go when it goes; they
// are listed anyway so the confirmation dialog can name them among the rest.
export const planContractDeletion = (con = {}) => {
    const invoices = (con.invoices || []).filter(x => x?.id);
    const expenses = (con.expenses || []).filter(x => x?.id);
    // Stock is stored as a list of ids. Anything that is not a non-empty string
    // cannot address a document, and would throw while building the reference.
    const stockIds = (con.stock || []).filter(x => typeof x === 'string' && x);
    const poInvoices = (con.poInvoices || []).filter(x => x?.id);
    return {
        invoices, expenses, stockIds, poInvoices,
        total: invoices.length + expenses.length + stockIds.length + poInvoices.length,
    };
};

// Year bucket for a record being deleted. Dates reach us as ISO ('2026-04-09'),
// as the finalized 'dd-mmm-yyyy' form, or as a { startDate } range. Guessing is
// not an option here: Firestore treats deleting a missing document as success, so
// a wrong year removes NOTHING and still reports that it worked. Anything that
// does not resolve returns '', and the caller reports it as skipped instead.
export const yearBucketOf = (value) => {
    const raw = typeof value === 'string' ? value : (value?.startDate || value?.date || '');
    const iso = toIsoDate(raw) || raw;
    return /^\d{4}/.test(iso) ? String(iso).slice(0, 4) : '';
};
