/**
 * READ-ONLY: the loading path of Dashboard and Cashflow, request by request, on real data —
 * what each screen asks Firestore for, in what order, how big and how long, then what it
 * costs to compute and to keep on the device.
 *
 *   SMOKE_EMAIL=… SMOKE_PASSWORD=… PHASE=before|after|equiv   (from the repo root)
 *   npx vitest run --config vitest.smoke.config.js --reporter=verbose mobile/__tests__/perf/_load-path.smoke.ts
 *
 * PHASE=before  the path as committed in 10695806 (_legacyLoaders.ts): the Dashboard's nine
 *               awaits in a row, every read on the full SDK's one shared stream.
 * PHASE=after   the app's loaders now: loadDashboardInputs / loadCashflowInputs over the
 *               shared read layer, the cold ledger read, background work after the screen.
 * PHASE=equiv   both, their results compared record for record and in order.
 *
 * Every request goes through a tracing shim on getDocs / getDoc of BOTH Firestore SDKs, so
 * the waterfall printed is the one a phone runs. Never writes; prints counts, sizes,
 * timings and equal / different — no record content.
 */
import { describe, it, expect, vi } from 'vitest';

const h = vi.hoisted(() => {
  const now = (): number => (globalThis as any).performance.now();
  const trace: { label: string; t0: number; t1: number; snap: any; single: boolean }[] = [];
  const labels = new WeakMap<object, string>();
  // Requests started and not yet answered — printed by a watchdog if a phase stalls.
  const inFlight = new Map<number, { label: string; t0: number }>();
  let seq = 0;
  const track = async <T,>(label: string, run: () => Promise<T>): Promise<{ snap: T; t0: number; t1: number }> => {
    const id = ++seq;
    const t0 = now();
    inFlight.set(id, { label, t0 });
    try {
      const snap = await run();
      return { snap, t0, t1: now() };
    } finally {
      inFlight.delete(id);
    }
  };
  const tail = (path: string) => path.split('/').slice(1).join('/'); // drop the workspace id
  /** The module, with every collection / query labelled and every read timed. */
  const traced = (m: any, tag: string) => ({
    ...m,
    collection: (...args: any[]) => {
      const ref = m.collection(...args);
      labels.set(ref, `${tag}${tail(ref.path)}`);
      return ref;
    },
    where: (field: any, op: string, value: any) => {
      const c = m.where(field, op, value);
      (c as any).__desc = `${String(field)} ${op} ${Array.isArray(value) ? `[${value.length} values]` : value}`;
      return c;
    },
    limit: (n: number) => {
      const c = m.limit(n);
      (c as any).__desc = `page of ${n}`;
      return c;
    },
    query: (ref: any, ...cons: any[]) => {
      const q = m.query(ref, ...cons);
      const desc = cons.map((c) => c?.__desc).filter(Boolean).join(' & ');
      labels.set(q, `${labels.get(ref) || '?'}${desc ? `  {${desc}}` : ''}`);
      return q;
    },
    getDocs: async (q: any) => {
      const label = labels.get(q) || '?';
      const { snap, t0, t1 } = await track(label, () => m.getDocs(q));
      trace.push({ label, t0, t1, snap, single: false });
      return snap;
    },
    getDoc: async (ref: any) => {
      const label = `${tag}${tail(ref.path)}`;
      const { snap, t0, t1 } = await track(label, () => m.getDoc(ref));
      trace.push({ label, t0, t1, snap, single: true });
      return snap;
    },
  });
  return { now, trace, traced, inFlight };
});

vi.mock('firebase/firestore', async (importOriginal) => h.traced(await importOriginal(), 'sdk  '));
vi.mock('firebase/firestore/lite', async (importOriginal) => h.traced(await importOriginal(), 'lite '));

const completeUserEmail = (u: string) =>
  u.includes('@') ? u : u.slice(-3) === 'ims' ? u + '@ims-metals.com' : u + '@gismetals.com';

const kbOf = (v: unknown) => JSON.stringify(v ?? null).length / 1024;
const fmt = (n: number, w = 7) => n.toFixed(0).padStart(w);
const QUIET_MS = 500; // features/live/launchGate.ts LAUNCH_QUIET_MS

type Report = { wall: number; requests: number; kb: number; docs: number; lines: string[] };

/** Run one loading path, return its waterfall. Sizes are measured AFTER the clock stops. */
async function phase<T>(name: string, run: (t0: number) => Promise<T>): Promise<{ out: T; report: Report }> {
  h.trace.length = 0;
  const t0 = h.now();
  // A stalled request would otherwise only show up as a test timeout: name it as it happens.
  const watchdog = setInterval(() => {
    const stuck = [...h.inFlight.values()].filter((r) => h.now() - r.t0 > 30_000);
    if (stuck.length) console.error(`  [${name}] still waiting: ${stuck.map((r) => `${r.label} (${((h.now() - r.t0) / 1000).toFixed(0)} s)`).join(' · ')}`);
  }, 30_000);
  const out = await run(t0).finally(() => clearInterval(watchdog));
  const wall = h.now() - t0;
  const rows = h.trace.map((r) => {
    const docs = r.single ? (r.snap.exists() ? 1 : 0) : r.snap.docs.length;
    const kb = r.single ? kbOf(r.snap.data()) : r.snap.docs.reduce((s: number, d: any) => s + kbOf(d.data()), 0);
    return { ...r, docs, kb, start: r.t0 - t0, ms: r.t1 - r.t0 };
  });
  const report: Report = {
    wall,
    requests: rows.length,
    kb: rows.reduce((s, r) => s + r.kb, 0),
    docs: rows.reduce((s, r) => s + r.docs, 0),
    lines: [
      '',
      `  ── ${name} ${'─'.repeat(Math.max(4, 80 - name.length))}`,
      '   start    took    docs      KB   request',
      ...rows
        .sort((a, b) => a.start - b.start)
        .map((r) => `  ${fmt(r.start, 6)}  ${fmt(r.ms, 6)}  ${fmt(r.docs, 6)}  ${fmt(r.kb, 6)}   ${r.label}`),
    ],
  };
  report.lines.push(
    `  ${'─'.repeat(84)}`,
    `  wall ${fmt(wall, 6)} ms · ${report.requests} requests · ${fmt(report.docs, 1)} docs · ${fmt(report.kb, 1)} KB`
  );
  return { out, report };
}

/** JSON with object keys sorted and Firestore timestamps reduced to their value, so the two SDKs' objects compare by content. */
function canon(v: any): any {
  if (v === null || typeof v !== 'object') return v;
  if (typeof v.toMillis === 'function' && 'seconds' in v) return `ts:${v.seconds}.${v.nanoseconds}`;
  if (Array.isArray(v)) return v.map(canon);
  const out: Record<string, any> = {};
  for (const k of Object.keys(v).sort()) out[k] = canon(v[k]);
  return out;
}
const same = (a: unknown, b: unknown) => JSON.stringify(canon(a)) === JSON.stringify(canon(b));

/** "equal" or where the first difference is — positions and counts only, never content. */
function compare(label: string, before: any, after: any): { ok: boolean; line: string } {
  if (same(before, after)) {
    const n = Array.isArray(before) ? `${before.length} records` : before && typeof before === 'object' ? `${Object.keys(before).length} keys` : 'value';
    return { ok: true, line: `  ✓ ${label.padEnd(52)} equal, in order (${n})` };
  }
  if (Array.isArray(before) && Array.isArray(after)) {
    if (before.length !== after.length) return { ok: false, line: `  ✗ ${label.padEnd(52)} ${before.length} records before, ${after.length} after` };
    const i = before.findIndex((r, k) => !same(r, after[k]));
    const sameSet = same([...before].map((r) => JSON.stringify(canon(r))).sort(), [...after].map((r) => JSON.stringify(canon(r))).sort());
    return { ok: false, line: `  ✗ ${label.padEnd(52)} first difference at position ${i}${sameSet ? ' (same records, different ORDER)' : ''}` };
  }
  return { ok: false, line: `  ✗ ${label.padEnd(52)} different` };
}

describe.skipIf(!process.env.SMOKE_EMAIL)('Dashboard and Cashflow loading path', () => {
  it('traces every request, then the compute and the device copy', async () => {
    const { signInWithEmailAndPassword } = await import('firebase/auth');
    const { auth } = await import('@/lib/firebase');
    const F = await import('@/data/firestore');
    const L = await import('./_legacyLoaders');
    const R = await import('@/data/collectionReads');
    const { loadDashboardInputs } = await import('@/features/dashboard/useDashboard');
    const { loadCashflowInputs, computeCashflow } = await import('@/features/cashflow/useCashflow');
    const { liveSyncWatches } = await import('@/features/live/useLiveSync');

    const cred = await signInWithEmailAndPassword(auth, completeUserEmail(process.env.SMOKE_EMAIL || ''), process.env.SMOKE_PASSWORD || '');
    const uid = String((await cred.user.getIdTokenResult()).claims.uidCollection);
    const settings: any = await F.loadSettings(uid);
    const curYr = new Date().getFullYear();
    const dateSelect = { start: `${curYr}-01-01`, end: `${curYr}-12-31` }; // the app's default period
    const mode = process.env.PHASE === 'after' ? 'after' : process.env.PHASE === 'equiv' ? 'equiv' : 'before';
    const out: string[] = ['', `  PHASE = ${mode} · period ${dateSelect.start} … ${dateSelect.end}`];

    // Warm both transports, as the app has them open before a screen asks for anything.
    await F.loadDataSettings(uid, 'cmpnyData');
    await R.readDocument(uid, 'cmpnyData');

    if (mode === 'equiv') {
      // ── the same records, in the same order ──────────────────────────────────────
      const checks: { ok: boolean; line: string }[] = [];
      const pairs = (label: string, a: Record<string, any>, b: Record<string, any>, skip: string[] = []) =>
        Object.keys(a)
          .filter((k) => !skip.includes(k))
          .forEach((k) => checks.push(compare(`${label} · ${k}`, a[k], b[k])));

      R.clearCollectionReads();
      pairs('Dashboard', await L.dashboardInputs(uid, dateSelect), await loadDashboardInputs(uid, dateSelect), ['liveRate']);
      R.clearCollectionReads();
      pairs('Cashflow (cold)', await L.cashflowInputs(uid, curYr), await loadCashflowInputs(uid, curYr));
      // Cashflow right after the Dashboard: the shared buckets are reused.
      R.clearCollectionReads();
      await loadDashboardInputs(uid, dateSelect);
      pairs('Cashflow (after Dashboard)', await L.cashflowInputs(uid, curYr), await loadCashflowInputs(uid, curYr));

      // A part-year range: asked of Firestore when nothing holds the bucket, cut from the
      // bucket when something does.
      const spring = { start: `${curYr}-03-01`, end: `${curYr}-05-31` };
      for (const path of ['invoices', 'contracts', 'expenses']) {
        const legacy = await L.loadData(uid, path, spring);
        R.clearCollectionReads();
        checks.push(compare(`loadData ${path} Mar–May, nothing shared`, legacy, await F.loadData(uid, path, spring)));
        await R.readRows(uid, 'data', `${path}_${curYr}`);
        checks.push(compare(`loadData ${path} Mar–May, cut from the bucket`, legacy, await F.loadData(uid, path, spring)));
      }
      // Contract invoice index for an older year: the `in` lookups, then cut from buckets.
      const old = { start: `${curYr - 2}-01-01`, end: `${curYr - 2}-12-31` };
      const oldContracts = await L.loadData<any>(uid, 'contracts', old);
      const legacyIndex = await L.buildInvoiceIndex(uid, oldContracts);
      R.clearCollectionReads();
      checks.push(compare(`buildInvoiceIndex ${curYr - 2}, by \`in\` lookups`, legacyIndex, await F.buildInvoiceIndex(uid, oldContracts)));
      await Promise.all([curYr - 3, curYr - 2, curYr - 1, curYr, curYr + 1].map((y) => R.readRows(uid, 'data', `invoices_${y}`)));
      checks.push(compare(`buildInvoiceIndex ${curYr - 2}, cut from buckets`, legacyIndex, await F.buildInvoiceIndex(uid, oldContracts)));
      // The rest of what moved to the shared layer.
      checks.push(compare('stock ledger: cold read vs listener snapshot', await L.ledger(uid), (await R.readWholeOnce(uid, 'data', 'stocks')).map((r) => r.data).filter(Boolean)));
      R.clearCollectionReads();
      checks.push(compare('notifications', await L.loadNotifications(uid), await F.loadNotifications(uid)));
      const sharedLegacy = await L.loadAllStockData(F.SHARED_STOCK_UID).catch((e) => `error ${e?.code || e?.name}`);
      const sharedNow = await F.loadAllStockData(F.SHARED_STOCK_UID).catch((e) => `error ${e?.code || e?.name}`);
      checks.push(compare('shared stock', sharedLegacy, sharedNow));
      checks.push(compare('cashflow document', await L.loadDataSettings(uid, 'cashflow'), await F.loadDisplayDocument(uid, 'cashflow')));
      // Cashflow now draws its non-stock sections before the ledger arrives: on the real
      // books, not one of those figures may move when the ledger lands.
      const { splitCashflow } = await import('@/features/cashflow/useCashflow');
      const cfInputs = await loadCashflowInputs(uid, curYr);
      const lots = await L.ledger(uid);
      checks.push(
        compare(
          'Cashflow flows: before the ledger = after it',
          splitCashflow(computeCashflow({ ...cfInputs, stocks: lots, settings })).flows,
          splitCashflow(computeCashflow({ ...cfInputs, stocks: [], settings })).flows
        )
      );

      out.push('', '  ── equivalence: before vs after, record for record ─────────────────────────────', ...checks.map((c) => c.line));
      out.push('', `  ${checks.filter((c) => c.ok).length} of ${checks.length} equal`, '');
      console.log(out.join('\n'));
      expect(checks.filter((c) => !c.ok).map((c) => c.line)).toEqual([]);
      return;
    }

    const after = mode === 'after';
    // ONLY=dashboard|launch|cashflow|next runs one scenario, so it meets cold connections the
    // way an app launch does — a later scenario in the same process rides on connections the
    // earlier ones have already warmed up.
    const only = process.env.ONLY || '';
    const wanted = (name: string) => !only || only === name;
    let dash: { out: any; report: Report } | null = null;
    let cash: { out: any; report: Report } | null = null;

    // ── DASHBOARD, nothing cached ──────────────────────────────────────────────────
    if (wanted('dashboard')) {
      R.clearCollectionReads();
      dash = await phase(`Dashboard — ${mode}`, () => (after ? loadDashboardInputs(uid, dateSelect) : L.dashboardInputs(uid, dateSelect)));
      out.push(...dash.report.lines);
    }

    // ── DASHBOARD AT LAUNCH ────────────────────────────────────────────────────────
    // Before: the ledger, the live-sync watchers' first reads and the notification badge all
    // started with the Dashboard, on one stream. After: the Dashboard alone, the rest once it
    // has its data (launchGate.ts) — the ledger as its listener's first snapshot (a copy is on
    // the phone), the watchers on their corrected paths, the badge over the shared layer.
    if (wanted('launch') && process.env.LAUNCH !== '0') {
      R.clearCollectionReads();
      let dashAt = 0;
      let backgroundAt = 0;
      const launch = await phase(`Dashboard at launch — ${mode}`, async (t0) => {
        if (!after) {
          const background = L.launchBackground(uid, curYr).then(() => (backgroundAt = h.now() - t0));
          const screen = L.dashboardInputs(uid, dateSelect).then(() => (dashAt = h.now() - t0));
          await Promise.all([background, screen]);
          return;
        }
        await loadDashboardInputs(uid, dateSelect);
        dashAt = h.now() - t0;
        await new Promise((r) => setTimeout(r, QUIET_MS));
        await Promise.all([
          L.ledger(uid),
          ...liveSyncWatches(curYr).map((w) => L.whole(uid, 'data', w.path)),
          F.loadNotifications(uid),
        ]);
        backgroundAt = h.now() - t0;
      });
      out.push(...launch.report.lines);
      out.push(`  the Dashboard had its data at ${fmt(dashAt, 1)} ms; the background work was done at ${fmt(backgroundAt, 1)} ms`);
    }

    // ── CASHFLOW, nothing cached ───────────────────────────────────────────────────
    if (wanted('cashflow')) {
      R.clearCollectionReads();
      let inputsAt = 0;
      let ledgerAt = 0;
      cash = await phase(`Cashflow — ${mode} (cold: nothing on the device)`, async (t0) => {
        const inputs = (after ? loadCashflowInputs(uid, curYr) : L.cashflowInputs(uid, curYr)).then((r) => {
          inputsAt = h.now() - t0;
          return r;
        });
        const lots = (after ? R.readWholeOnce(uid, 'data', 'stocks').then((rows) => rows.map((r) => r.data).filter(Boolean)) : L.ledger(uid)).then((r) => {
          ledgerAt = h.now() - t0;
          return r;
        });
        const [i, stocks] = await Promise.all([inputs, lots]);
        return { ...i, stocks };
      });
      out.push(...cash.report.lines);
      out.push(
        after
          ? `  clients, suppliers and expenses drew at ${fmt(inputsAt, 1)} ms; the stock sections at ${fmt(ledgerAt, 1)} ms`
          : `  everything but the ledger was in at ${fmt(inputsAt, 1)} ms; the screen drew at ${fmt(Math.max(inputsAt, ledgerAt), 1)} ms`
      );
    }

    // ── CASHFLOW RIGHT AFTER THE DASHBOARD ─────────────────────────────────────────
    if (wanted('next')) {
      R.clearCollectionReads();
      await (after ? loadDashboardInputs(uid, dateSelect) : L.dashboardInputs(uid, dateSelect));
      const next = await phase(`Cashflow opened after the Dashboard — ${mode} (ledger already live)`, () =>
        after ? loadCashflowInputs(uid, curYr) : L.cashflowInputs(uid, curYr)
      );
      out.push(...next.report.lines);
    }

    if (cash && dash) {
      // ── COMPUTE ──────────────────────────────────────────────────────────────────
      const c = cash.out;
      computeCashflow({ ...c, settings }); // warm-up: the first call pays for JIT
      const t0 = h.now();
      computeCashflow({ ...c, settings });
      out.push('', `  computeCashflow ${fmt(h.now() - t0, 6)} ms (this laptop; a phone is roughly 3–6× slower)`);

      // ── THE DEVICE COPY ──────────────────────────────────────────────────────────
      const { stocks, ...cashInputs } = c;
      let total = 0;
      out.push('', '  ── what these queries put in the device copy ────────────────────────────────────');
      for (const [label, v] of [
        ['cashflow query', cashInputs],
        ['dashboard query', dash.out],
        ['stock ledger', stocks],
      ] as [string, unknown][]) {
        const json = JSON.stringify(v);
        total += json.length;
        out.push(`  ${label.padEnd(18)} ${fmt(json.length / 1024, 7)} KB`);
      }
      out.push(`  ${'together'.padEnd(18)} ${fmt(total / 1024, 7)} KB`, '');
    }

    console.log(out.join('\n'));
    expect(out.length).toBeGreaterThan(2);
  }, 900_000);
});
