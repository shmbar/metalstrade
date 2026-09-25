// A contract's product entries: the PO's own lines, and the HIDDEN entries
// (`import: true`) that the Materials Breakdown makes — one per lot renamed with its ✎
// (importedFrom.doc 'rename-split', which never renames the PO line itself), and one per
// unmatched line of a supplier invoice read into a single-line PO ('supplier-invoice').
// Hidden entries stay off the PO table and PDF but are real stock lines: lots hang on them.
//
// A hidden entry that ends up with the SAME name as the PO line it came from is a
// duplicate. PO 110926-1: "CpTi Powdr" was fixed on the lot with ✎ first — a hidden
// "CpTi Powder" took the lot — and then on the PO line too. The breakdown then offered
// "CpTi Powder" twice, the PO line with nothing under it and the copy holding the
// 0.352 MT, and a sales invoice picking the PO line would have taken stock from a line
// that has none (client, 2026-09-25). PURE — tested directly.

/** How two material names are compared: case, and runs of spaces, do not count. */
export const entryNameKey = (s) => String(s ?? '').toLowerCase().replace(/\s+/g, ' ').trim();

/**
 * The hidden entries that duplicate the PO line they came from → [{ from, to }] (entry
 * ids). Only into the SOURCE line: a renamed lot is folded back into the line it was
 * split from, and a supplier-invoice entry into the PO's single line, never into some
 * other line that happens to share the name — that would move the lot to a different
 * line of the contract.
 */
export const duplicateEntries = (productsData = []) => {
    const list = (productsData || []).filter(Boolean);
    const lines = list.filter(p => !p.import);
    const out = [];
    for (const h of list.filter(p => p.import)) {
        const key = entryNameKey(h.description);
        if (!key) continue;
        const src = h.importedFrom?.sourceProduct;
        const source = src ? lines.find(l => l.id === src)
            : (h.importedFrom?.doc === 'supplier-invoice' && lines.length === 1 ? lines[0] : null);
        if (source && entryNameKey(source.description) === key) out.push({ from: h.id, to: source.id });
    }
    return out;
};

/**
 * Only the merges nothing else depends on: every ledger row naming the hidden entry must
 * be one of the lots being saved now. A sale, a transfer, or another contract's lot on it
 * (line ids travel with copied POs) keeps the entry exactly as it is.
 * `ledgerRows`: every stock-ledger row whose description or descriptionId is a `from` id.
 */
export const safeMerges = (merges = [], ledgerRows = [], savingLotIds = []) => {
    const ours = new Set(savingLotIds);
    return merges.filter(m => (ledgerRows || []).every(r =>
        (r.description !== m.from && r.descriptionId !== m.from) || ours.has(r.id)));
};

/** Apply merges: the lots re-pointed to the PO line, the hidden entries dropped. */
export const foldEntries = (productsData = [], rows = [], merges = []) => {
    const to = new Map(merges.map(m => [m.from, m.to]));
    if (!to.size) return { productsData, rows };
    return {
        productsData: productsData.filter(p => !to.has(p?.id)),
        rows: rows.map(r => (to.has(r.description) ? { ...r, description: to.get(r.description) } : r)),
    };
};
