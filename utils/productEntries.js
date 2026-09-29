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

/**
 * Give some of a contract's lots a new material name — the rule of the Materials
 * Breakdown's ✎ (contracts/modals/whModal.js renameRowMaterial), applied to a set of lots
 * so the Stocks page can rename a whole stock row from its own window (client,
 * 2026-09-29). "Each row keeps its own name — other rows are never affected":
 *   · the lots sit on a hidden entry nothing else uses → that entry is renamed;
 *   · otherwise (the PO's own line, or an entry other lots share) → the lots move to an
 *     entry of their own, and the PO line and every other lot keep their name;
 *   · a name that brings a hidden entry back to the name of the line it came from folds
 *     it into that line — one line again (duplicateEntries), unless `canFold` says
 *     something else still depends on the entry.
 * `lots`: the contract's purchase lots (their `description` is the entry id).
 * @returns { productsData, lots, entryId, mode: 'none' | 'renamed' | 'split' | 'folded' }
 */
export const renameLots = ({ productsData = [], lots = [], lotIds = [], name, newId, canFold = true }) => {
    const ids = new Set(lotIds);
    const lineIds = [...new Set(lots.filter(l => ids.has(l.id)).map(l => l.description))];
    const entry = lineIds.length === 1 ? productsData.find(p => p?.id === lineIds[0]) : null;
    const nm = String(name ?? '').trim();
    if (!entry || !nm || nm === String(entry.description ?? '').trim()) {
        return { productsData, lots, entryId: entry?.id || null, mode: 'none' };
    }
    const shared = lots.some(l => !ids.has(l.id) && l.description === entry.id);
    let pd, ls, entryId, mode;
    if (entry.import && !shared) {
        pd = productsData.map(p => (p.id === entry.id ? { ...p, description: nm } : p));
        ls = lots;
        entryId = entry.id;
        mode = 'renamed';
    } else {
        const own = {
            ...entry, id: newId, description: nm, import: true,
            importedFrom: entry.importedFrom || { doc: 'rename-split', sourceProduct: entry.id },
        };
        pd = [...productsData, own];
        ls = lots.map(l => (ids.has(l.id) ? { ...l, description: newId } : l));
        entryId = newId;
        mode = 'split';
    }
    const fold = canFold ? duplicateEntries(pd).filter(m => m.from === entryId) : [];
    if (fold.length) {
        const f = foldEntries(pd, ls, fold);
        return { productsData: f.productsData, lots: f.rows, entryId: fold[0].to, mode: 'folded' };
    }
    return { productsData: pd, lots: ls, entryId, mode };
};
