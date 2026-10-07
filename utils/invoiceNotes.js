/* A Credit / Final Note and its original invoice point at each other: the note carries
   `originalInvoice` { id, date } (set when the note is created), the original carries
   `cnORfl` { id, date } — the pointer Accounting follows to load a note issued after the
   original's period (utils.js loadInvoicesBookedIn). It is refreshed when the note is
   created, re-dated or deleted (hooks/useInvoiceState.js).

   Refreshing it must never stop the note itself from being saved. The save used to look the
   original up only by number among THIS contract's invoices and hand whatever it found — or
   undefined — straight to updateDocument, which then threw: nothing was saved and the Save
   button stayed on "Saving" (GIS #40, 2026-10-07: "could not change the date … saving button
   gets stuck"). Pure: the write is passed in, so this can be tested without Firebase. */

// Where the original of a note might be, best first: the note's own pointer (it names the
// exact record), then the contract's entry under the same number, whichever way its type is
// written ('1111', or the label 'Invoice' older records carry). Only references that can
// address a record — an id and a date — are kept, each once.
export const originalRefsOf = (note, contract) => {
    const sameNumber = (x) => !!x && x.invoice * 1 === note?.invoice * 1 && ['1111', 'Invoice'].includes(x.invType);
    return [note?.originalInvoice, (contract?.invoices || []).find(sameNumber)]
        .filter((r, i, all) => !!r?.id && typeof r.date === 'string' && !!r.date
            && all.findIndex(o => o?.id === r.id) === i);
};

// Point the original at the note. `update(ref, patch)` patches the record wherever it is and
// resolves truthy when it found it (utils.js updateDocumentAnyYear); `pointer` is the note's
// { id, date }, or deleteField() to clear the link when the note is deleted. Resolves true
// when the original was updated, false when it could not be found or written. Never throws —
// a link left as it was is logged, and the caller's save carries on.
export const relinkOriginal = async (update, note, contract, pointer) => {
    for (const ref of originalRefsOf(note, contract)) {
        try {
            if (await update(ref, { cnORfl: pointer })) return true;
        } catch (e) {
            console.warn(`Invoice #${note?.invoice}: could not update the original invoice's link to this note:`, e?.message || e);
        }
    }
    console.warn(`Invoice #${note?.invoice}: the original invoice behind this note was not found; its link to the note was left as it was.`);
    return false;
};
