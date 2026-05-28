// Generic global filter for TanStack tables that resolves select-backed
// columns (those with meta.options of { value, label }) from id → label
// before matching, so users can search by the visible text rather than
// the raw id stored in the row.
export const labelAwareGlobalFilter = (row, columnId, filterValue) => {
  const search = String(filterValue ?? '').toLowerCase().trim();
  if (!search) return true;

  const raw = row.getValue(columnId);
  const column = row.getAllCells().find(c => c.column.id === columnId)?.column;
  const options = column?.columnDef?.meta?.options;

  const resolved = Array.isArray(options)
    ? options.find(o => String(o.value) === String(raw))?.label ?? raw
    : raw;

  return String(resolved ?? '').toLowerCase().includes(search);
};
