/**
 * Dashboard and Cashflow sat on their skeletons (client, 2026-10-05). The measured causes and
 * their fixes, each pinned here against the real modules:
 *  - every bulk read queued behind the 5.3 MB stock ledger on the full SDK's one stream, and
 *    the same year buckets were downloaded again and again → the shared read layer
 *    (data/readCache.ts, data/rangeReads.ts; data/collectionReads.ts is the transport);
 *  - the ledger, live sync and the badge started in the same moment as the first screen
 *    → features/live/launchGate.ts;
 *  - a cold ledger waited 9–12 s for the listener's first answer → features/stocks/ledgerCore.ts;
 *  - Cashflow drew nothing until the ledger was in → splitCashflow (flows vs stock);
 *  - two live-sync watchers named collections that do not exist → liveSyncWatches.
 * The loaders' results are also checked record for record against the old queries on
 * production data by mobile/__tests__/perf/_load-path.smoke.ts (PHASE=equiv).
 */
import { describe, it, expect } from 'vitest';
import { createReadCache } from '@/data/readCache';
import { inDateRange, bucketYears, coversYear, mergeBuckets, chunked, matchingInChunks, Row } from '@/data/rangeReads';
import { createLaunchGate, LAUNCH_QUIET_MS, LAUNCH_CAP_MS } from '@/features/live/launchGate';
import { createLedger, LedgerCache } from '@/features/stocks/ledgerCore';
import { computeCashflow, splitCashflow, CASHFLOW_STOCK_KEYS } from '@/features/cashflow/useCashflow';
import { liveSyncWatches } from '@/features/live/useLiveSync';
import { makeContract, makeInvoice, makePoInvoice, makeSettings, makeStockLot } from './parity/_helpers/fixtures';

// A clock and timer queue the tests move by hand.
function fakeTime() {
  let t = 1_000_000;
  let seq = 0;
  const timers = new Map<number, { at: number; fn: () => void }>();
  const setTimer = (fn: () => void, ms: number) => {
    const id = ++seq;
    timers.set(id, { at: t + ms, fn });
    return id;
  };
  return {
    now: () => t,
    setTimer,
    clearTimer: (id: unknown) => {
      timers.delete(id as number);
    },
    later: (fn: () => void, ms: number) => {
      const id = setTimer(fn, ms);
      return () => timers.delete(id);
    },
    advance(ms: number) {
      const end = t + ms;
      for (;;) {
        const due = [...timers.entries()].filter(([, v]) => v.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
        if (!due) break;
        timers.delete(due[0]);
        t = due[1].at;
        due[1].fn();
      }
      t = end;
    },
    pending: () => timers.size,
  };
}

const flush = () => new Promise((r) => setTimeout(r, 0));

function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('shared reads: one download serves every screen that asks', () => {
  const setup = () => {
    const time = fakeTime();
    const cache = createReadCache<string>({ now: time.now, ttlMs: 120_000, later: (fn, ms) => void time.setTimer(fn, ms) });
    let loads = 0;
    const load = () => {
      loads += 1;
      return Promise.resolve(`read ${loads}`);
    };
    return { time, cache, load, loads: () => loads };
  };

  it('a read already under way is joined, not repeated', async () => {
    const { cache, load, loads } = setup();
    const a = cache.get('invoices_2026', load);
    const b = cache.get('invoices_2026', load);
    expect(a).toBe(b);
    expect(await b).toBe('read 1');
    expect(loads()).toBe(1);
  });

  it('a result is reused for the TTL, then read again', async () => {
    const { time, cache, load, loads } = setup();
    await cache.get('k', load);
    time.advance(119_000);
    expect(await cache.get('k', load)).toBe('read 1');
    time.advance(2_000);
    expect(await cache.get('k', load)).toBe('read 2');
    expect(loads()).toBe(2);
  });

  it('a failed read is never served again', async () => {
    const { cache } = setup();
    await expect(cache.get('k', () => Promise.reject(new Error('offline')))).rejects.toThrow('offline');
    await flush();
    expect(await cache.get('k', () => Promise.resolve('fresh'))).toBe('fresh');
  });

  it('clear() — a save, a pull to refresh — makes the next read a new one', async () => {
    const { cache, load } = setup();
    await cache.get('k', load);
    cache.clear();
    expect(await cache.get('k', load)).toBe('read 2');
  });

  it('a burst of invalidations clears once, so the refetches it starts share their new reads', async () => {
    const { time, cache, load, loads } = setup();
    await cache.get('k', load);
    cache.clearOncePerTick(); // first event of the burst: cleared
    const refetch = cache.get('k', load); // the refetch it triggered
    cache.clearOncePerTick(); // later events in the same tick: the new read survives
    expect(cache.get('k', load)).toBe(refetch);
    expect(loads()).toBe(2);
    time.advance(0); // next tick: a new event clears again
    cache.clearOncePerTick();
    await cache.get('k', load);
    expect(loads()).toBe(3);
  });

  it('peek finds a held or running read and never starts one', async () => {
    const { time, cache, load, loads } = setup();
    expect(cache.peek('k')).toBeUndefined();
    const running = cache.get('k', load);
    expect(cache.peek('k')).toBe(running);
    time.advance(120_000);
    expect(cache.peek('k')).toBeUndefined();
    expect(loads()).toBe(1);
  });

  it('expired results are let go of, not kept in memory', async () => {
    const { time, cache, load } = setup();
    await cache.get('a', load);
    await cache.get('b', load);
    expect(cache.size()).toBe(2);
    time.advance(121_000);
    expect(cache.size()).toBe(0);
  });
});

describe('ranges cut from a whole bucket match what Firestore returns for the range', () => {
  const row = (id: string, date: unknown, extra: Record<string, unknown> = {}): Row => ({ id, data: { id, date, ...extra } });

  it('only string dates inside the bounds, bounds included — a number, a missing date or an object never match', () => {
    const rows = [
      row('a', '2026-01-01'),
      row('b', '2026-12-31'),
      row('c', '2025-12-31'),
      row('d', '2027-01-01'),
      row('e', 20260601),
      row('f', undefined),
      row('g', { seconds: 1 }),
      row('h', '2026-12-31T10:00'), // after '2026-12-31' as a string, as on the server
    ];
    expect(inDateRange(rows, { start: '2026-01-01', end: '2026-12-31' }).map((r) => r.id)).toEqual(['a', 'b']);
  });

  it('in the server\'s order: by date, then by document id', () => {
    const rows = [row('z', '2026-03-01'), row('b', '2026-02-01'), row('a', '2026-03-01'), row('m', '2026-01-15')];
    expect(inDateRange(rows, { start: '2026-01-01', end: '2026-12-31' }).map((r) => r.id)).toEqual(['m', 'b', 'a', 'z']);
  });

  it('the buckets a range spans, and whether it covers a year whole', () => {
    expect(bucketYears({ start: '2023-01-01', end: '2026-12-31' })).toEqual([2023, 2024, 2025, 2026]);
    expect(bucketYears({ start: '', end: '2026-12-31' })).toBeNull();
    expect(coversYear({ start: '2026-01-01', end: '2026-12-31' }, 2026)).toBe(true);
    expect(coversYear({ start: '2023-01-01', end: '2026-12-31' }, 2024)).toBe(true);
    expect(coversYear({ start: '2026-03-01', end: '2026-05-31' }, 2026)).toBe(false);
    expect(coversYear({ start: '2026-01-02', end: '2026-12-31' }, 2026)).toBe(false);
  });

  it('a record found in two buckets counts once — the copy saved last, where the first copy stood', () => {
    const older = { yr: 2025, rows: [row('x', '2025-12-30', { v: 'old', lstSaved: '01-Jan-2026, 10:00' }), row('y', '2025-06-01')] };
    const newer = { yr: 2026, rows: [row('w', '2026-01-02'), row('x', '2026-01-03', { v: 'new', lstSaved: '05-Jan-2026, 10:00' })] };
    const merged = mergeBuckets<any>([older, newer]);
    expect(merged.map((r) => r.id)).toEqual(['x', 'y', 'w']);
    expect(merged[0].v).toBe('new');
    const tagged = mergeBuckets<any>([older, newer], true);
    expect(tagged[0].__yr).toBe('2026'); // the surviving copy keeps ITS bucket
    expect(tagged[1].__yr).toBe('2025');
  });

  it('`in` lookups: unique values, no nulls, 30 at a time — each chunk\'s matches in document order', () => {
    const values = Array.from({ length: 65 }, (_, i) => i + 1);
    const chunks = chunked([...values, 5, null as unknown as number, undefined as unknown as number]);
    expect(chunks.map((c) => c.length)).toEqual([30, 30, 5]);
    const rows = [row('a', '', { invoice: 61 }), row('b', '', { invoice: 2 }), row('c', '', { invoice: '2' }), row('d', '', { invoice: 31 })];
    // chunk 1 (1–30) first, then chunk 2 (31–60), then chunk 3; a string '2' is not the number 2
    expect(matchingInChunks(rows, 'invoice', chunks).map((r) => r.id)).toEqual(['b', 'd', 'a']);
  });
});

describe('background work waits for the first screen', () => {
  const setup = () => {
    const time = fakeTime();
    let busy = false;
    const listeners = new Set<() => void>();
    const gate = createLaunchGate({
      later: time.later,
      isBusy: () => busy,
      onActivity: (fn) => {
        listeners.add(fn);
        return () => listeners.delete(fn);
      },
    });
    const setBusy = (b: boolean) => {
      busy = b;
      listeners.forEach((fn) => fn());
    };
    return { time, gate, setBusy, listeners };
  };

  it('nothing settles before the device copy is restored and a session has begun', () => {
    const { time, gate } = setup();
    time.advance(60_000);
    expect(gate.isSettled()).toBe(false);
    gate.markRestored();
    time.advance(60_000);
    expect(gate.isSettled()).toBe(false); // restored, but nobody is signed in yet
    gate.arm();
    time.advance(LAUNCH_QUIET_MS);
    expect(gate.isSettled()).toBe(true);
  });

  it('settles once nothing has been loading for the quiet period — a new load restarts it', async () => {
    const { time, gate, setBusy } = setup();
    let settledAt = 0;
    gate.whenSettled().then(() => (settledAt = time.now()));
    gate.markRestored();
    gate.arm();
    setBusy(true); // the Dashboard's reads
    time.advance(3_000);
    setBusy(false);
    time.advance(LAUNCH_QUIET_MS - 1);
    setBusy(true); // a second query started within the quiet period
    time.advance(1_000);
    expect(gate.isSettled()).toBe(false);
    const done = time.now();
    setBusy(false);
    time.advance(LAUNCH_QUIET_MS);
    await flush();
    expect(gate.isSettled()).toBe(true);
    expect(settledAt).toBe(done + LAUNCH_QUIET_MS);
  });

  it('a screen that never settles cannot hold the background back past the cap', () => {
    const { time, gate, setBusy } = setup();
    gate.markRestored();
    gate.arm();
    setBusy(true);
    time.advance(LAUNCH_CAP_MS - 1);
    expect(gate.isSettled()).toBe(false);
    time.advance(1);
    expect(gate.isSettled()).toBe(true);
  });

  it('each session waits for its own first screen — a company switch starts over', () => {
    const { time, gate, setBusy, listeners } = setup();
    gate.markRestored();
    gate.arm();
    time.advance(LAUNCH_QUIET_MS);
    expect(gate.isSettled()).toBe(true);
    expect(listeners.size).toBe(0); // stopped watching once settled
    gate.arm();
    expect(gate.isSettled()).toBe(false);
    setBusy(true);
    time.advance(5_000);
    expect(gate.isSettled()).toBe(false);
    setBusy(false);
    time.advance(LAUNCH_QUIET_MS);
    expect(gate.isSettled()).toBe(true);
  });

  it('whenRestored resolves when the copy is back', async () => {
    const { gate } = setup();
    let restored = false;
    gate.whenRestored().then(() => (restored = true));
    await flush();
    expect(restored).toBe(false);
    gate.markRestored();
    await flush();
    expect(restored).toBe(true);
  });
});

describe('the stock ledger: a cold start is read in one request, then kept live', () => {
  const setup = (opts: { held?: any[] } = {}) => {
    const time = fakeTime();
    const restored = deferred<void>();
    const reads: { uid: string; d: ReturnType<typeof deferred<any[]>> }[] = [];
    const listens: { uid: string; onRows: (r: any[]) => void; onError: (e: unknown) => void; unsubbed: boolean }[] = [];
    const data = new Map<string, any[]>(opts.held ? [['ims', opts.held]] : []);
    const cache: LedgerCache = { get: (uid) => data.get(uid), set: (uid, rows) => void data.set(uid, rows) };
    const ledger = createLedger({
      listen: (uid, onRows, onError) => {
        const l = { uid, onRows, onError, unsubbed: false };
        listens.push(l);
        return () => {
          l.unsubbed = true;
        };
      },
      readOnce: (uid) => {
        const d = deferred<any[]>();
        reads.push({ uid, d });
        return d.promise;
      },
      whenRestored: () => restored.promise,
      setTimer: time.setTimer,
      clearTimer: time.clearTimer,
      keepAliveMs: 300_000,
    });
    return { time, restored, reads, listens, data, cache, ledger };
  };

  it('cold: one plain read first, handed to the screen, and only then the listener', async () => {
    const { restored, reads, listens, data, cache, ledger } = setup();
    let rows: any[] | null = null;
    ledger.lotsReady('ims', cache).then((r) => (rows = r));
    await flush();
    expect(reads.length).toBe(0); // nothing before the device copy is back
    restored.resolve();
    await flush();
    expect(reads.map((r) => r.uid)).toEqual(['ims']);
    expect(listens.length).toBe(0); // not two 5 MB downloads at once
    reads[0].d.resolve([{ id: 'lot1' }]);
    await flush();
    expect(rows).toEqual([{ id: 'lot1' }]);
    expect(data.get('ims')).toEqual([{ id: 'lot1' }]);
    expect(listens.length).toBe(1);
    listens[0].onRows([{ id: 'lot1' }, { id: 'lot2' }]); // live from here on
    expect(data.get('ims')).toEqual([{ id: 'lot1' }, { id: 'lot2' }]);
  });

  it('a copy already on the phone: no extra read, just the listener', async () => {
    const { restored, reads, listens, cache, ledger } = setup({ held: [{ id: 'old' }] });
    ledger.holdLots('ims', cache);
    restored.resolve();
    await flush();
    expect(reads.length).toBe(0);
    expect(listens.length).toBe(1);
  });

  it('a failed cold read changes nothing: the listener loads it, as before', async () => {
    const { restored, reads, listens, cache, ledger } = setup();
    let rows: any[] | null = null;
    ledger.lotsReady('ims', cache).then((r) => (rows = r));
    restored.resolve();
    await flush();
    reads[0].d.reject(new Error('lite unavailable'));
    await flush();
    expect(listens.length).toBe(1);
    listens[0].onRows([{ id: 'from listener' }]);
    await flush();
    expect(rows).toEqual([{ id: 'from listener' }]);
  });

  it('a company switch drops the old ledger, and its late answer with it', async () => {
    const { restored, reads, listens, data, cache, ledger } = setup();
    ledger.lotsReady('ims', cache);
    restored.resolve();
    await flush();
    ledger.holdLots('gis', cache);
    await flush();
    reads[0].d.resolve([{ id: 'ims lot' }]);
    await flush();
    expect(data.has('ims')).toBe(false);
    expect(listens.filter((l) => l.uid === 'ims').length).toBe(0);
    expect(reads.map((r) => r.uid)).toEqual(['ims', 'gis']);
  });

  it('the listener outlives the last screen by the keep-alive, and a return in time keeps it', async () => {
    const { time, restored, listens, cache, ledger } = setup({ held: [{ id: 'x' }] });
    const release = ledger.holdLots('ims', cache);
    restored.resolve();
    await flush();
    release();
    time.advance(299_000);
    const again = ledger.holdLots('ims', cache);
    time.advance(10_000);
    expect(listens[0].unsubbed).toBe(false);
    again();
    time.advance(300_000);
    expect(listens[0].unsubbed).toBe(true);
  });

  it('a listener failure is handed to whoever waits', async () => {
    const { restored, reads, listens, cache, ledger } = setup();
    const waiting = ledger.lotsReady('ims', cache);
    restored.resolve();
    await flush();
    reads[0].d.reject(new Error('no'));
    await flush();
    listens[0].onError(new Error('permission-denied'));
    await expect(waiting).rejects.toThrow('permission-denied');
  });
});

describe('Cashflow draws what does not need stock before the ledger arrives', () => {
  const settings = makeSettings();
  const inputs = {
    invoices: [makeInvoice({ id: 'i1', invoice: 1001, totalAmount: 12000, payments: [] })],
    contracts4y: [makeContract({ poInvoices: [makePoInvoice({ id: 'po-a', inv: 'A', invValue: '10000', pmnt: '0', blnc: '10000', payments: [] })] })],
    contracts2y: [makeContract()],
    expenses: [],
    companyExpenses: [],
    margins: [{ remaining: 500 }],
    cashflowDoc: { financed: { initial: [{ title: 'Bank', num: '1000' }] } },
    settings,
  };

  it('the split is exact: every stock figure on one side, everything else on the other', () => {
    const d = computeCashflow({ ...inputs, stocks: [] });
    const { flows, stock } = splitCashflow(d);
    expect(Object.keys(stock).sort()).toEqual([...CASHFLOW_STOCK_KEYS].sort());
    CASHFLOW_STOCK_KEYS.forEach((k) => expect(k in flows).toBe(false));
    expect({ ...flows, ...stock }).toEqual(d);
  });

  it('nothing on the flows side depends on the stock ledger', () => {
    const lots = [makeStockLot({ id: 'l1', qnty: 20, unitPrc: 1000, total: 20000 }), makeStockLot({ id: 'l2', qnty: 5, unitPrc: 900, total: 4500 })];
    const without = splitCashflow(computeCashflow({ ...inputs, stocks: [] }));
    const withLots = splitCashflow(computeCashflow({ ...inputs, stocks: lots }));
    expect(withLots.stock).not.toEqual(without.stock); // the lots do count…
    expect(withLots.flows).toEqual(without.flows); // …and only on the stock side
  });
});

describe('live sync watches collections that exist', () => {
  it('misc invoices are specialInvoices; sales contracts are year-bucketed like contracts', () => {
    expect(liveSyncWatches(2026).map((w) => w.path)).toEqual([
      'invoices_2026',
      'contracts_2026',
      'expenses_2026',
      'companyExpenses',
      'specialInvoices',
      'salescontracts_2026',
    ]);
  });
});
