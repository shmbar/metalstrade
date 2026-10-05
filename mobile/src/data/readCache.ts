// One read of a thing, shared by everyone who asks for it. Pure — the clock and the
// timers are injected, so __tests__/read-layer.test.ts drives it directly.
//
// Why it exists (measured on production data, 2026-10-05): the same records were downloaded
// again and again — the Dashboard read this year's invoices twice and then 4 years of them;
// Cashflow read the same 4 years again, and 2 years of contracts on top of the 4 it had just
// asked for. Every screen that needs a year of invoices or contracts now shares one read of
// that year: a request already in flight is joined, and a result less than TTL old is reused.
//
// What keeps it honest:
//  - clear() when a save starts and again when it lands (data/writes.ts), so a read that
//    began before a write is never handed to a screen refreshing after it;
//  - clearOncePerTick() on any query invalidation (query/client.ts) — a teammate's save
//    arriving through live sync, a mutation's own invalidation. One event of a burst clears;
//    the refetches that follow in the same tick share fresh reads instead of each starting
//    their own;
//  - a failed read is forgotten at once, never served again;
//  - TTL equals the query client's staleTime, so nothing is reused for longer than the app
//    already considers data fresh.

export interface ReadCache<T> {
  /** The cached or in-flight read for `key`, or a new one from `load`. */
  get(key: string, load: () => Promise<T>): Promise<T>;
  /** The cached or in-flight read for `key` if there is one — never starts a read. */
  peek(key: string): Promise<T> | undefined;
  /** Forget everything now. */
  clear(): void;
  /** Forget everything, at most once per tick — for bursts of invalidation events. */
  clearOncePerTick(): void;
  size(): number;
}

export function createReadCache<T>(deps: {
  now: () => number;
  ttlMs: number;
  /** Run `fn` after `ms` (0 = the next tick). */
  later: (fn: () => void, ms: number) => void;
}): ReadCache<T> {
  const entries = new Map<string, { at: number; promise: Promise<T> }>();
  let clearedThisTick = false;

  const sweep = () => {
    const t = deps.now();
    for (const [key, e] of entries) if (t - e.at >= deps.ttlMs) entries.delete(key);
  };

  return {
    get(key, load) {
      const hit = entries.get(key);
      if (hit && deps.now() - hit.at < deps.ttlMs) return hit.promise;
      const promise = load();
      const entry = { at: deps.now(), promise };
      entries.set(key, entry);
      promise.catch(() => {
        if (entries.get(key) === entry) entries.delete(key);
      });
      // Results are megabytes; do not keep one in memory after it stopped being reusable.
      deps.later(sweep, deps.ttlMs + 1000);
      return promise;
    },
    peek(key) {
      const hit = entries.get(key);
      return hit && deps.now() - hit.at < deps.ttlMs ? hit.promise : undefined;
    },
    clear() {
      entries.clear();
    },
    clearOncePerTick() {
      if (clearedThisTick) return;
      clearedThisTick = true;
      entries.clear();
      deps.later(() => {
        clearedThisTick = false;
      }, 0);
    },
    size: () => entries.size,
  };
}
