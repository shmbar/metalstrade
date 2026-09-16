/**
 * A party's display name from its Settings list — port of web cashflow/funcs.js entityName.
 *
 * A row must never come out as a raw database id. Old builds printed
 * "b6f14654-c111-4905-…" in Cashflow → Stocks - Paid for the warehouse "Seagull": the
 * warehouse existed, but the phone's Settings copy had not loaded, and the lookup fell
 * back to the id. So:
 *   - found            → nname, else its full name, else "Unnamed <kind>"
 *   - lists not loaded → "…" (the name is coming, not missing)
 *   - loaded, no match → "Unknown <kind> · <id stub>" — web's wording; the stub is the
 *                        only handle left for tracking a deleted entry down.
 */
export function entityName(list: any[] | undefined | null, id: string | undefined | null, kind = 'record', loaded = true): string {
  if (!id) return `No ${kind}`;
  const rec = (list || []).find((z: any) => z?.id === id);
  if (rec) return rec.nname || rec.supplier || rec.client || rec.stock || `Unnamed ${kind}`;
  if (!loaded) return '…';
  return `Unknown ${kind} · ${String(id).slice(0, 8)}`;
}
