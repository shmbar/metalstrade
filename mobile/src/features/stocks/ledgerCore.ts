/*
 * The stock ledger's loading rules, without Firebase: stockLedger.ts wires them to the real
 * listener and read, __tests__/stock-ledger.test.ts drives them with fakes.
 *
 *  - One ledger at a time (one company); asking for another stops the first.
 *  - Loading begins once, and only after the device copy has been restored — before that an
 *    empty query cache says nothing about what is on the phone.
 *  - A copy already held (restored, or still in memory): just listen, and the listener keeps
 *    it current. None held — a cold start: read the ledger once in a plain request, hand it
 *    to whoever waits, THEN listen. Not both at once: two 5 MB downloads only slow each
 *    other down. A failed cold read changes nothing — the listener loads it, as it always did.
 *  - A late answer for a ledger that has been stopped is dropped.
 *  - The listener outlives the last screen by keepAliveMs, so moving between stock screens
 *    costs nothing.
 */

/** Where the ledger's rows live for the screens — the query cache, in the app. */
export interface LedgerCache {
  get(uid: string): unknown;
  set(uid: string, rows: any[]): void;
}

export interface LedgerDeps {
  /** Start the live listener; `onRows` gets every snapshot. Returns an unsubscribe. */
  listen(uid: string, onRows: (rows: any[]) => void, onError: (e: unknown) => void): () => void;
  /** One plain read of the whole ledger — the cold-start path. */
  readOnce(uid: string): Promise<any[]>;
  /** Resolves once the device copy has been read back into the query cache. */
  whenRestored(): Promise<void>;
  setTimer(fn: () => void, ms: number): unknown;
  clearTimer(id: unknown): void;
  keepAliveMs: number;
}

type Waiter = { resolve: (rows: any[]) => void; reject: (e: unknown) => void };

interface Ledger {
  uid: string;
  cache: LedgerCache;
  unsub: () => void;
  rows: any[] | null;
  waiters: Waiter[];
  refs: number;
  idle: unknown;
  started: boolean;
}

export function createLedger(deps: LedgerDeps) {
  let current: Ledger | null = null;

  const stop = () => {
    if (!current) return;
    current.unsub();
    if (current.idle != null) deps.clearTimer(current.idle);
    current = null;
  };

  const deliver = (state: Ledger, rows: any[]) => {
    state.rows = rows;
    state.cache.set(state.uid, rows);
    state.waiters.splice(0).forEach((w) => w.resolve(rows));
  };

  const listen = (state: Ledger) => {
    if (current !== state) return; // signed out or switched company meanwhile
    state.unsub = deps.listen(
      state.uid,
      (rows) => deliver(state, rows),
      (err) => {
        // Permission or transport failure: hand the error to whoever is waiting and let
        // the query fall back to a plain read on its next attempt.
        state.waiters.splice(0).forEach((w) => w.reject(err));
        if (current === state) stop();
      }
    );
  };

  const begin = (state: Ledger) => {
    if (state.started) return;
    state.started = true;
    deps.whenRestored().then(() => {
      if (current !== state) return;
      if (state.rows || state.cache.get(state.uid)) {
        listen(state);
        return;
      }
      deps
        .readOnce(state.uid)
        .then((rows) => {
          if (current === state && !state.rows) deliver(state, rows);
        })
        .catch(() => {})
        .finally(() => listen(state));
    });
  };

  const ledgerFor = (uid: string, cache: LedgerCache): Ledger => {
    if (current?.uid === uid) return current;
    stop();
    current = { uid, cache, unsub: () => {}, rows: null, waiters: [], refs: 0, idle: null, started: false };
    return current;
  };

  return {
    /** Rows as soon as the ledger has them — the first read, or the live copy already held. */
    lotsReady(uid: string, cache: LedgerCache): Promise<any[]> {
      const state = ledgerFor(uid, cache);
      begin(state);
      if (state.rows) return Promise.resolve(state.rows);
      return new Promise<any[]>((resolve, reject) => state.waiters.push({ resolve, reject }));
    },
    /** Keep the ledger live while a screen is mounted; it lingers keepAliveMs after the last one. */
    holdLots(uid: string, cache: LedgerCache): () => void {
      const state = ledgerFor(uid, cache);
      begin(state);
      state.refs += 1;
      if (state.idle != null) {
        deps.clearTimer(state.idle);
        state.idle = null;
      }
      return () => {
        state.refs -= 1;
        if (state.refs > 0 || current !== state) return;
        state.idle = deps.setTimer(() => {
          if (current === state && state.refs === 0) stop();
        }, deps.keepAliveMs);
      };
    },
    stop,
  };
}
