/**
 * Inventory hot-path benchmark.
 *
 * WHY THIS EXISTS
 * A real-data smoke run against production (3,237 stock lots) measured
 * computeInventory at 5,218 ms and computeGradeSummary at 2,437 ms of PURE JS.
 * Both run inside useMemo, and React Native executes JS on a single thread — so
 * for those five seconds the app cannot respond to a touch. That is what the
 * client means by "getting stuck", and a desktop Node figure is typically 3-6x
 * better than a mid-range phone.
 *
 * This harness makes the cost reproducible offline so an optimisation can be
 * proved rather than asserted, and stays here so it can be re-proved later.
 *
 *   node __tests__/perf/inventory.bench.mjs
 *
 * It deliberately does NOT assert a threshold — machines differ, and a flaky
 * perf gate teaches people to ignore it. It prints numbers; you compare them.
 */

import { performance } from 'node:perf_hooks';

// Loaded through vite-node so the TS + '@/' aliases resolve exactly as the app's.
const { computeInventory } = await import('../../mobile/src/features/stocks/aggregate.ts');
const { computeGradeSummary } = await import('../../mobile/src/features/stocks/gradeSummary.ts');

// ── synthetic ledger, shaped like the real one ───────────────────────────────
// The production set is 3,237 lots over ~132 (warehouse|description) groups, so
// roughly 25 lots per group. Deterministic: a seeded LCG, no Math.random, so two
// runs are comparable.
let seed = 12345;
const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);

const WAREHOUSES = Array.from({ length: 12 }, (_, i) => `wh-${i}`);
const DESCRIPTIONS = Array.from({ length: 11 }, (_, i) => `desc-${i}`);
const SUPPLIERS = Array.from({ length: 20 }, (_, i) => `sup-${i}`);

function makeLots(n) {
  const lots = [];
  for (let i = 0; i < n; i++) {
    const desc = DESCRIPTIONS[Math.floor(rnd() * DESCRIPTIONS.length)];
    const isIn = rnd() > 0.25;
    lots.push({
      id: `lot-${i}`,
      type: isIn ? 'in' : 'out',
      stock: WAREHOUSES[Math.floor(rnd() * WAREHOUSES.length)],
      description: desc,
      descriptionId: desc,
      // Every few lots, let descriptionId disagree with description. This is not
      // noise: computeInventory's group filter matches on EITHER field, so such a
      // lot lands in TWO groups. Any "optimisation" that turns the grouping into a
      // strict partition silently loses that, and this data is what catches it.
      ...(i % 37 === 0 ? { descriptionId: DESCRIPTIONS[(DESCRIPTIONS.indexOf(desc) + 1) % DESCRIPTIONS.length] } : {}),
      supplier: SUPPLIERS[Math.floor(rnd() * SUPPLIERS.length)],
      order: `PO-${Math.floor(rnd() * 400)}`,
      invoice: `${Math.floor(rnd() * 900)}`,
      invType: ['1111', '2222', '3333'][Math.floor(rnd() * 3)],
      qnty: (rnd() * 40).toFixed(3),
      unitPrc: (rnd() * 3000).toFixed(2),
      cur: rnd() > 0.3 ? 'us' : 'eu',
      qTypeTable: 'qt-mt',
      total: 0,
      productsData: [{ id: desc, description: `Material ${desc}`, unitPrc: (rnd() * 3000).toFixed(2) }],
      contractData: { date: '2026-03-14' },
      ...(rnd() > 0.9 ? { finalqnty: (rnd() * 40).toFixed(3) } : {}),
    });
  }
  return lots;
}

const SETTINGS = {
  Stocks: { Stocks: WAREHOUSES.map((id, i) => ({ id, nname: `Warehouse ${i}`, sType: i % 2 ? 'Own' : 'Third party' })) },
  Currency: { Currency: [{ id: 'us', cur: 'USD', symbol: '$' }, { id: 'eu', cur: 'EUR', symbol: '€' }] },
  Quantity: { Quantity: [{ id: 'qt-mt', qTypeTable: 'MT' }] },
  Supplier: { Supplier: SUPPLIERS.map((id, i) => ({ id, nname: `Supplier ${i}` })) },
};

function time(label, fn, runs = 3) {
  fn(); // warm up — first call pays JIT and module-init costs
  const times = [];
  let out;
  for (let i = 0; i < runs; i++) {
    const t0 = performance.now();
    out = fn();
    times.push(performance.now() - t0);
  }
  const best = Math.min(...times);
  const mean = times.reduce((a, b) => a + b, 0) / times.length;
  console.log(`  ${label.padEnd(38)} best ${best.toFixed(0).padStart(6)} ms   mean ${mean.toFixed(0).padStart(6)} ms`);
  return out;
}

console.log('\n  inventory hot path — synthetic ledger at production scale\n');

for (const n of [800, 3300]) {
  const lots = makeLots(n);
  console.log(`  ── ${n} lots ─────────────────────────────────────────────────`);
  const inv = time('computeInventory (stocks mode)', () => computeInventory(lots, SETTINGS));
  time('computeInventory (cashflow mode)', () => computeInventory(lots, SETTINGS, { minQnty: 0, cashflow: true }));
  time('computeGradeSummary', () => computeGradeSummary(inv.rows, SETTINGS));
  console.log(`     -> ${inv.rows.length} rows, ${inv.totals.length} totals\n`);
}

console.log('  (real production data is 3,237 lots; a phone is 3-6x slower than this)\n');
