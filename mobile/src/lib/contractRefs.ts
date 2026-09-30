// A PO's own lists of invoices and expenses point at other records. An entry with no id
// points at nothing, and one id listed twice counts that record twice in the PO's totals —
// PO 050626 held both (a blank expense entry, and B1049000 listed twice). Saving the PO
// tidies its own lists; the records themselves are untouched.
//
// Port of the `tidyRefs` step in web hooks/useContractsState.js saveData (2026-09-30):
// entries without an id are dropped, each id is kept once (its first entry), order kept.
// Same test as web — any truthy id. Pure; the parity suite runs it beside web's own copy.
export function tidyRefs<T>(list: T[] | null | undefined): T[] {
  const seen = new Set<unknown>();
  return (Array.isArray(list) ? list : []).filter((r) => {
    const id = (r as { id?: unknown } | null | undefined)?.id;
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}
