/**
 * The Dashboard used to make its thirteen requests one after another (nine awaits in a row),
 * so it waited for their SUM: 7–8 s on production data. Pinned here: every read of both
 * screens starts at once, the four-year invoice read starts first (the period's and the
 * contracts' invoices are cut from its buckets), the live rate can no longer hold the
 * screen, Cashflow's settings document is read off the listeners' stream, and the results
 * keep the exact shape the screens were built on.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const h = vi.hoisted(() => {
  const calls: string[] = [];
  const pending = new Map<string, { resolve: (v: any) => void; reject: (e: any) => void }>();
  // Every loader records its call and answers only when the test says so.
  const wait = (key: string) => {
    calls.push(key);
    return new Promise((resolve, reject) => pending.set(key, { resolve, reject }));
  };
  return { calls, pending, wait };
});
vi.mock('@/data/firestore', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  loadData: (_uid: string, path: string, r: { start: string; end: string }) => h.wait(`${path} ${r.start}..${r.end}`),
  loadInvoicesTagged: (_uid: string, r: { start: string; end: string }) => h.wait(`invoices(tagged) ${r.start}..${r.end}`),
  loadFlatByDate: (_uid: string, path: string, r: { start: string; end: string }) => h.wait(`${path} ${r.start}..${r.end}`),
  loadMargins: (_uid: string, y: number) => h.wait(`margins ${y}`),
  buildInvoiceIndex: (_uid: string, contracts: any[]) => h.wait(`invoice index of ${contracts.length}`),
  contractInvoicesFromIndex: (c: any) => [[{ invoice: 1, for: c.id }]],
  loadDisplayDocument: (_uid: string, d: string) => h.wait(`doc ${d} (display)`),
  loadDataSettings: (_uid: string, d: string) => h.wait(`doc ${d} (settings)`),
}));
vi.mock('@/data/writes', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getCur: () => h.wait('live EUR/USD'),
}));

import { loadDashboardInputs, FX_WAIT_MS } from '@/features/dashboard/useDashboard';
import { loadCashflowInputs } from '@/features/cashflow/useCashflow';

const answer = (key: string, value: any) => {
  const p = h.pending.get(key);
  if (!p) throw new Error(`no pending read "${key}" — got: ${[...h.pending.keys()].join(' | ')}`);
  p.resolve(value);
};
const fail = (key: string, e: any) => h.pending.get(key)!.reject(e);
const flush = async () => {
  for (let i = 0; i < 5; i++) await Promise.resolve();
};

const Y = new Date().getFullYear();
const period = { start: `${Y}-01-01`, end: `${Y}-12-31` };
const recv = `invoices ${Y - 3}-01-01..${Y}-12-31`;

beforeEach(() => {
  h.calls.length = 0;
  h.pending.clear();
});

describe('Dashboard: one wave of reads, not thirteen in a row', () => {
  it('starts every read at once — the four-year invoices first — and the index once the contracts are in', async () => {
    const run = loadDashboardInputs('ims', period);
    await flush();
    expect(h.calls).toEqual([
      recv,
      `invoices ${period.start}..${period.end}`,
      `contracts ${period.start}..${period.end}`,
      `specialInvoices ${period.start}..${period.end}`,
      `expenses ${period.start}..${period.end}`,
      'live EUR/USD',
      `margins ${Y}`,
      `companyExpenses ${period.start}..${period.end}`,
    ]);
    answer(`contracts ${period.start}..${period.end}`, [{ id: 'c1' }, { id: 'c2' }]);
    await flush();
    expect(h.calls.at(-1)).toBe('invoice index of 2');

    answer('invoice index of 2', {});
    answer(recv, ['r']);
    answer(`invoices ${period.start}..${period.end}`, ['p']);
    answer(`specialInvoices ${period.start}..${period.end}`, [{ m: 1 }, null]);
    answer(`expenses ${period.start}..${period.end}`, ['e']);
    answer('live EUR/USD', 1.17);
    answer(`margins ${Y}`, ['mo']);
    answer(`companyExpenses ${period.start}..${period.end}`, ['ce']);
    // the exact shape the Dashboard's derive was written for
    expect(await run).toEqual({
      enriched: [
        { id: 'c1', invoicesData: [[{ invoice: 1, for: 'c1' }]] },
        { id: 'c2', invoicesData: [[{ invoice: 1, for: 'c2' }]] },
      ],
      periodInvoices: ['p'],
      recvInvoices: ['r'],
      misc: [{ m: 1 }],
      expenseRows: ['e'],
      liveRate: 1.17,
      margins: ['mo'],
      companyExpenses: ['ce'],
    });
  });

  it('keeps the old failure rules: margins and overheads fall back to none, a failed read fails the load', async () => {
    const run = loadDashboardInputs('ims', period);
    await flush();
    answer(`contracts ${period.start}..${period.end}`, []);
    await flush();
    answer('invoice index of 0', {});
    answer(recv, []);
    answer(`invoices ${period.start}..${period.end}`, []);
    answer(`specialInvoices ${period.start}..${period.end}`, []);
    answer(`expenses ${period.start}..${period.end}`, []);
    answer('live EUR/USD', 1.1);
    fail(`margins ${Y}`, new Error('denied'));
    fail(`companyExpenses ${period.start}..${period.end}`, new Error('denied'));
    const out = await run;
    expect(out.margins).toEqual([]);
    expect(out.companyExpenses).toEqual([]);

    const broken = loadDashboardInputs('ims', period);
    await flush();
    fail(recv, new Error('unavailable'));
    await expect(broken).rejects.toThrow('unavailable');
  });

  describe('the live rate', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('a hung rate call is given up after FX_WAIT_MS with getCur\'s own failure value', async () => {
      const run = loadDashboardInputs('ims', period);
      await flush();
      answer(`contracts ${period.start}..${period.end}`, []);
      await flush();
      for (const k of [...h.pending.keys()].filter((k) => k !== 'live EUR/USD')) answer(k, []);
      await flush();
      let done = false;
      run.then(() => (done = true));
      await vi.advanceTimersByTimeAsync(FX_WAIT_MS - 1);
      expect(done).toBe(false);
      await vi.advanceTimersByTimeAsync(1);
      expect((await run).liveRate).toBe(1);
    });
  });
});

describe('Cashflow: every read at once, the settings document off the listeners\' stream', () => {
  it('starts all of them together and returns the shape computeCashflow takes', async () => {
    const run = loadCashflowInputs('ims', Y);
    await flush();
    const r4 = `${Y - 3}-01-01..${Y}-12-31`;
    const r2 = `${Y - 1}-01-01..${Y}-12-31`;
    expect(h.calls).toEqual([
      `invoices(tagged) ${r4}`,
      `contracts ${r4}`,
      `contracts ${r2}`,
      `expenses ${r2}`,
      `companyExpenses ${r2}`,
      `margins ${Y - 1}`,
      `margins ${Y}`,
      'doc cashflow (display)',
    ]);
    answer(`invoices(tagged) ${r4}`, ['i']);
    answer(`contracts ${r4}`, ['c4']);
    answer(`contracts ${r2}`, ['c2']);
    answer(`expenses ${r2}`, ['e']);
    answer(`companyExpenses ${r2}`, ['ce']);
    answer(`margins ${Y - 1}`, ['m1']);
    answer(`margins ${Y}`, ['m2']);
    answer('doc cashflow (display)', { financed: {} });
    expect(await run).toEqual({
      invoices: ['i'],
      contracts4y: ['c4'],
      contracts2y: ['c2'],
      expenses: ['e'],
      companyExpenses: ['ce'],
      margins: ['m1', 'm2'],
      cashflowDoc: { financed: {} },
    });
  });
});
