/**
 * DETERMINISTIC FIXTURES for the web ↔ mobile parity suites.
 *
 * Shapes are taken from the real Firestore documents as described by
 * mobile/src/data/types.ts and as consumed by mobile/src/features/**\/use*.ts and the
 * matching web pages — they are not invented. Every builder takes an `over` object
 * that is SHALLOW-merged over the defaults, so overriding a nested container
 * (`Supplier`, `dateRange`, `shipData`, …) replaces it wholesale. That is deliberate:
 * it keeps "what this fixture is" readable at the call site.
 *
 * DETERMINISM RULES (non-negotiable — see __tests__/parity/README.md):
 *   • no Date.now(), no Math.random(), no argless `new Date()` anywhere in this file
 *   • every date is a literal string
 *   • FIXED_NOW is the one clock the suites freeze to: 2026-08-07T12:00:00Z
 *
 * USAGE
 * -----
 * ```ts
 * import { makeContract, makeInvoice, scenario, FIXED_NOW } from './_helpers/fixtures';
 *
 * const c = makeContract({ cur: 'eu', euroToUSD: 1.08 });
 * const world = scenario('invoicePlusCreditNote');   // deep clone — safe to mutate
 * vi.setSystemTime(FIXED_NOW);
 * ```
 */

// ── constants ────────────────────────────────────────────────────────────────

/** The single frozen clock for every time-dependent parity assertion. */
export const FIXED_NOW = new Date('2026-08-07T12:00:00Z');
export const FIXED_NOW_ISO = '2026-08-07T12:00:00Z';
export const FIXED_TODAY = '2026-08-07';

/**
 * invType arrives in TWO shapes across the app: numeric ids on drafts/working docs
 * and human labels on finalized docs (mobile/src/shared/finance.js:24-31). Parity
 * suites must exercise both — a rule that only handles one shape is a latent bug.
 */
export const INV_TYPE = {
  invoiceId: '1111',
  creditId: '2222',
  finalId: '3333',
  invoiceLabel: 'Invoice',
  creditLabel: 'Credit Note',
  finalLabel: 'Final Note',
} as const;

/** shipData.fnlzing sentinel meaning "final invoice issued" (finance.js FINALIZED_FLAG). */
export const FINALIZED_FLAG = '4568';

/** paid sentinels on expense docs: only '222' counts as unpaid in web's totals. */
export const PAID = { paid: '111', unpaid: '222' } as const;

export type Over = Record<string, any> | undefined;

const merge = <T extends Record<string, any>>(base: T, over: Over): T =>
  ({ ...base, ...(over || {}) }) as T;

// ── settings ─────────────────────────────────────────────────────────────────

/**
 * The `settings` document every screen resolves ids against. Ids are stable and
 * human-readable so a failing assertion reads as 'Acme Metals', not 'a7f3…'.
 *
 * Note the currency ids: contracts and drafts store 'us'/'eu', while a FINALIZED
 * invoice stores `cur` as the OBJECT `{ id, cur: 'USD' }` — several web reducers
 * map back through settings.Currency to recover the id
 * (mobile/src/features/dashboard/pnlChain.ts:69-71).
 */
export function makeSettings(over?: Over) {
  return merge(
    {
      Supplier: {
        Supplier: [
          { id: 'sup-1', nname: 'Acme Metals' },
          { id: 'sup-2', nname: 'Bravo Alloys' },
        ],
      },
      Client: {
        Client: [
          { id: 'cli-1', nname: 'Northwind Steel' },
          { id: 'cli-2', nname: 'Southgate Trading' },
        ],
      },
      Quantity: {
        Quantity: [
          { id: 'q-mt', qTypeTable: 'MT' },
          { id: 'q-kgs', qTypeTable: 'KGS' },
          { id: 'q-lb', qTypeTable: 'LB' },
        ],
      },
      Currency: {
        Currency: [
          { id: 'us', cur: 'USD' },
          { id: 'eu', cur: 'EUR' },
        ],
      },
      Expenses: {
        Expenses: [
          { id: 'exp-freight', expType: 'Freight' },
          { id: 'exp-storage', expType: 'Storage' },
          { id: 'exp-warehouse', expType: 'Warehouse' },
          { id: 'exp-commission', expType: 'Commission' },
          { id: 'exp-other', expType: 'Other' },
        ],
      },
      Stocks: {
        Stocks: [
          { id: 'wh-1', nname: 'Rotterdam', sType: 'own' },
          { id: 'wh-2', nname: 'Antwerp', sType: 'third' },
        ],
      },
    },
    over
  );
}

/** Company-level config (mobile/src/store/settings.ts selectCompanyRate / selectTermDays). */
export function makeCompanyData(over?: Over) {
  return merge({ eurUsdRate: '', defaultTermDays: '30', lng: 'English' }, over);
}

/** The active period window. Literal strings — never derived from the wall clock. */
export function makeDateSelect(over?: Over) {
  return merge({ start: '2026-01-01', end: '2026-12-31' }, over);
}

// ── contracts ────────────────────────────────────────────────────────────────

/**
 * One `productsData` row. `import: true` marks a breakdown/merge helper created by
 * the warehouse PDF import — web's CONTRACTS page excludes those from every
 * quantity roll-up while web's DASHBOARD counts them
 * (mobile/src/features/contracts/useContracts.ts:47-50 vs pnlChain.ts:152-163).
 * Parity suites need rows of both kinds to pin that inconsistency down.
 */
export function makeProduct(over?: Over) {
  return merge(
    { id: 'prd-1', description: 'Ni Scrap 304', qnty: '10', unitPrc: '1000', import: false },
    over
  );
}

/** An import-flagged breakdown row (excluded by contracts, counted by dashboard). */
export function makeImportProduct(over?: Over) {
  return makeProduct(merge({ id: 'prd-imp', description: 'Ni Scrap 304 (breakdown)', qnty: '4', import: true }, over));
}

/** One payment row on a purchase invoice (poInvoiceModel.PoPayment). */
export function makePoPayment(over?: Over) {
  return merge(
    {
      pmntId: 'pop-1',
      pmntDate: { startDate: '2026-04-01', endDate: '2026-04-01' },
      pmntPerc: '100',
      pmnt: '10000',
    },
    over
  );
}

/**
 * A purchase invoice on a contract. Invariants web maintains:
 *   pmnt = Σ payments[].pmnt   and   blnc = round2(invValue − pmnt)
 * `invRef` is an ARRAY of linked sales-invoice ids (data/types.ts PoInvoice).
 */
export function makePoInvoice(over?: Over) {
  return merge(
    {
      id: 'po-1',
      inv: 'SUP-INV-001',
      invValue: '10000',
      pmnt: '10000',
      blnc: '0',
      invRef: ['inv-1'],
      payments: [makePoPayment()],
      draft: false,
    },
    over
  );
}

/** An expense embedded on a contract (what dashboard calContracts iterates: x.expenses). */
export function makeContractExpense(over?: Over) {
  return merge({ id: 'cex-1', expType: 'exp-freight', amount: '500', cur: 'us' }, over);
}

/**
 * A contract. Defaults describe the simple happy path: USD, MT, one product line,
 * one fully-paid purchase invoice, no linked sales invoices yet.
 *
 * `expenses` and `dateRange` are ALWAYS present because web's calContracts reads
 * `x.expenses.forEach` and `x.dateRange.startDate` unguarded
 * (app/(root)/dashboard/funcs.js:195+) — a fixture without them crashes web, not mobile,
 * which would mask the thing under test.
 *
 * `invoicesData` is the client-side enrichment: an array of GROUPS, each group being
 * the invoice docs that share one invoice number (useContracts.ts:24).
 */
export function makeContract(over?: Over) {
  return merge(
    {
      id: 'con-1',
      order: 'PO-2026-001',
      date: '2026-03-15',
      dateRange: { startDate: '2026-03-15', endDate: '2026-03-15' },
      supplier: 'sup-1',
      cur: 'us',
      euroToUSD: 1.1,
      qTypeTable: 'q-mt',
      conStatus: 'open',
      productsData: [makeProduct()],
      poInvoices: [makePoInvoice()],
      invoices: [],
      expenses: [],
      stock: [],
      remarks: [],
      comments: '',
      invoicesData: [],
    },
    over
  );
}

// ── invoices ─────────────────────────────────────────────────────────────────

/** A client payment against a sales invoice. */
export function makePayment(over?: Over) {
  return merge({ pmnt: '5000', date: '2026-05-01', pmntDate: '2026-05-01' }, over);
}

/** One `productsDataInvoice` line. `qnty: 's'` is a real sentinel web skips. */
export function makeInvoiceProduct(over?: Over) {
  return merge(
    {
      id: 'ivp-1',
      descriptionId: 'prd-1',
      description: 'Ni Scrap 304',
      qnty: '10',
      unitPrc: '1200',
      total: '12000',
      container: 'CONT-0001',
    },
    over
  );
}

/**
 * A DRAFT-SHAPE sales invoice: numeric `invType` id, `cur` as the id 'us'/'eu',
 * `client` as the client id, `final: false`.
 */
export function makeInvoice(over?: Over) {
  return merge(
    {
      id: 'inv-1',
      invoice: 1001,
      invType: INV_TYPE.invoiceId,
      date: '2026-04-10',
      dateRange: { startDate: '2026-04-10', endDate: '2026-04-10' },
      delDate: { startDate: '2026-05-10', endDate: '2026-05-10' },
      totalAmount: 12000,
      debtBlnc: 7000,
      balanceDue: 7000,
      payments: [makePayment()],
      productsDataInvoice: [makeInvoiceProduct()],
      cur: 'us',
      client: 'cli-1',
      final: false,
      draft: false,
      canceled: false,
      shpType: 'FOB',
      pol: 'Rotterdam',
      pod: 'Shanghai',
      comments: '',
      poSupplier: { id: 'con-1', order: 'PO-2026-001', date: '2026-03-15' },
      shipData: { fnlzing: '', rcvd: '', status: '', etd: '2026-04-20', eta: '2026-05-20' },
    },
    over
  );
}

/**
 * A FINALIZED sales invoice — the awkward shape.
 *   • `invType` is the LABEL ('Invoice'), not '1111'
 *   • `cur` is an OBJECT { id, cur: 'USD' }, not the id string
 *   • `client` is the embedded entity object, not the client id
 *   • `final: true` and shipData.fnlzing === FINALIZED_FLAG
 * Anything that resolves currency or client must handle both this and makeInvoice().
 */
export function makeFinalizedInvoice(over?: Over) {
  return makeInvoice(
    merge(
      {
        id: 'inv-f1',
        invType: INV_TYPE.invoiceLabel,
        final: true,
        cur: { id: 'us', cur: 'USD' },
        client: { id: 'cli-1', nname: 'Northwind Steel' },
        shipData: { fnlzing: FINALIZED_FLAG, rcvd: '', status: 'shipped', etd: '2026-04-20', eta: '2026-05-20' },
      },
      over
    )
  );
}

/** A credit note (id shape). Negative totalAmount — it reduces the original. */
export function makeCreditNote(over?: Over) {
  return makeInvoice(
    merge(
      {
        id: 'inv-1cn',
        invType: INV_TYPE.creditId,
        totalAmount: -2000,
        debtBlnc: -2000,
        payments: [],
        productsDataInvoice: [makeInvoiceProduct({ id: 'ivp-1cn', qnty: '-2', total: '-2400' })],
      },
      over
    )
  );
}

/** A final note (id shape). Issuing one finalizes the shipment (finance.isFinalNote). */
export function makeFinalNote(over?: Over) {
  return makeInvoice(
    merge(
      {
        id: 'inv-1fn',
        invType: INV_TYPE.finalId,
        totalAmount: 11500,
        debtBlnc: 11500,
        payments: [],
        productsDataInvoice: [makeInvoiceProduct({ id: 'ivp-1fn', qnty: '9.5', total: '11400' })],
      },
      over
    )
  );
}

// ── stock ────────────────────────────────────────────────────────────────────

/**
 * One stock-ledger lot. `type: 'in'` is a purchase (adds), `type: 'out'` a sale
 * (subtracts). `finalqnty` is the settled quantity: when it differs from `qnty`
 * the difference is netted off the in-lot (mobile/src/features/stocks/aggregate.ts:160-168).
 * A missing `type` is treated as 'in' by both apps.
 */
export function makeStockLot(over?: Over) {
  return merge(
    {
      id: 'lot-1',
      type: 'in',
      invoice: 1001,
      invType: INV_TYPE.invoiceId,
      stock: 'wh-1',
      description: 'prd-1',
      descriptionId: 'prd-1',
      descriptionName: '',
      descriptionText: 'Ni Scrap 304',
      qnty: '10',
      finalqnty: '',
      unitPrc: '1000',
      cur: 'us',
      qTypeTable: 'q-mt',
      order: 'PO-2026-001',
      supplier: 'sup-1',
      originSupplier: 'sup-1',
      indDate: '2026-03-20',
      contractData: { id: 'con-1', order: 'PO-2026-001', date: '2026-03-15' },
      productsData: [makeProduct()],
      mtrlStatus: '',
      moveType: '',
      isSelection: false,
    },
    over
  );
}

/** The matching 'out' lot for a sale off the same (warehouse | description) key. */
export function makeStockOutLot(over?: Over) {
  return makeStockLot(
    merge(
      { id: 'lot-1out', type: 'out', moveType: 'out', qnty: '4', descriptionName: 'Ni Scrap 304', indDate: '2026-05-02' },
      over
    )
  );
}

// ── expenses ─────────────────────────────────────────────────────────────────

/**
 * A standalone expense doc (supplier-linked `expenses_{year}` or flat
 * `companyExpenses`). `paid` is a SENTINEL: '111' = paid, '222' = unpaid; anything
 * else counts as neither in web's unpaid totals (useExpenses.ts:44).
 */
export function makeExpense(over?: Over) {
  return merge(
    {
      id: 'exp-1',
      expense: 'EXP-2026-001',
      supplier: 'sup-1',
      expType: 'exp-freight',
      amount: '1500',
      cur: 'us',
      paid: PAID.paid,
      date: '2026-04-05',
      dateRange: { startDate: '2026-04-05', endDate: '2026-04-05' },
      poSupplier: { id: 'con-1', order: 'PO-2026-001' },
      comments: '',
      split: null,
    },
    over
  );
}

// ── margins ──────────────────────────────────────────────────────────────────

/**
 * One margins row. Derived fields follow marginsModel.recomputeItem:
 *   totalMargin = purchase × margin
 *   openShip    = purchase − shipped
 *   remaining   = (purchase − shipped) × margin
 * `gis: true` halves this row's totalMargin and remaining in the month roll-up
 * (but NOT its purchase or openShip) — marginsModel.rollupMonth.
 */
export function makeMarginItem(over?: Over) {
  return merge(
    {
      id: 'mi-1',
      date: { startDate: '2026-01-10', endDate: '2026-01-10' },
      purchase: '100',
      description: 'Ni Scrap 304',
      supplier: 'sup-1',
      client: 'cli-1',
      margin: '0.1',
      totalMargin: 10,
      shipped: '40',
      openShip: 60,
      remaining: 6,
      gis: false,
    },
    over
  );
}

/**
 * A margins month. `ids` drives the on-screen row order (marginsModel.orderByIds),
 * so it is kept in sync with `items` unless you override it explicitly.
 */
export function makeMarginMonth(over?: Over) {
  const o: Record<string, any> = over || {};
  const items = o.items ?? [makeMarginItem()];
  const base = {
    month: '01',
    openShip: 60,
    purchase: 100,
    remaining: 6,
    totalMargin: 10,
    items,
    ids: items.map((i: any) => i.id),
  };
  return { ...base, ...o, items, ids: o.ids ?? base.ids };
}

// ── material tables ──────────────────────────────────────────────────────────

/**
 * One row of a material table. `kgs` is the WEIGHT column whatever the table's unit
 * is (the field name is legacy — a table with `unit: 'mt'` stores metric tons in it),
 * which is exactly why the cost columns have to convert through UNIT_TO_MT.
 */
export function makeMaterialRow(over?: Over) {
  return merge(
    {
      id: 'mr-1',
      material: 'Ni Scrap 304',
      container: '',
      kgs: '20000',
      ni: '8.5',
      cr: '18.2',
      mo: '0.4',
      co: '0',
      nb: '0',
      w: '0',
      cu: '0.3',
      fe: '72.6',
      ti: '0',
      _feManual: false,
    },
    over
  );
}

/**
 * A material table document. Defaults are a kgs table with no prices and cost
 * columns off — i.e. the state a freshly added table is in on web
 * (app/(root)/materialtables/page.js addTable).
 */
export function makeMaterialTable(over?: Over) {
  const o: Record<string, any> = over || {};
  return {
    id: 'mtb-1',
    name: 'Rotterdam intake',
    unit: 'kgs',
    elements: [
      { key: 'ni', label: 'Ni' },
      { key: 'cr', label: 'Cr' },
      { key: 'mo', label: 'Mo' },
      { key: 'co', label: 'Co' },
      { key: 'nb', label: 'Nb' },
      { key: 'w', label: 'W' },
      { key: 'cu', label: 'Cu' },
      { key: 'fe', label: 'Fe', autoCalc: true },
      { key: 'ti', label: 'Ti' },
    ],
    prices: {},
    niPercent: 100,
    showCosts: false,
    showContainer: false,
    containerNo: '',
    containerLabel: 'Container',
    costLabel: 'Price',
    priceKeys: null,
    data: o.data ?? [makeMaterialRow()],
    ...o,
  };
}

// ── pricing formulas ─────────────────────────────────────────────────────────

/**
 * The `formulasCalc` settings document the formulas page edits. Every field is a
 * STRING because web writes them straight from text inputs
 * (app/(root)/formulas/page.js handleChange strips to /[^0-9.]/ and stores the text).
 */
export function makeFormulaValue(over?: Over) {
  const o: Record<string, any> = over || {};
  return {
    general: {
      nilme: '16000',
      mt: '2204.62',
      euroRate: '1.08',
      chargeCrLb: '1.15',
      MoOxideLb: '22.5',
      ...(o.general || {}),
    },
    fenicr: {
      ni: '8.5',
      cr: '18',
      mo: '0.5',
      formulaNiCost: '85',
      crPrice: '1200',
      moPrice: '30000',
      fePrice: '250',
      formulaNiPrice: '92',
      crPriceArgus: '95',
      moPriceArgus: '90',
      fePrice1: '280',
      ...(o.fenicr || {}),
    },
    stainless: {
      ni: '8.5',
      cr: '18',
      mo: '0.5',
      formulaNiCost: '85',
      crPrice: '1200',
      moPrice: '30000',
      fePrice: '250',
      formulaNiPrice: '92',
      crPriceArgus: '95',
      moPriceArgus: '90',
      fePrice1: '280',
      ...(o.stainless || {}),
    },
    supperalloys: {
      ni: '55',
      cr: '20',
      mo: '9',
      nb: '3.5',
      co: '1',
      w: '0.5',
      hf: '0',
      ta: '0',
      crPrice: '1200',
      moPrice: '30000',
      nbPrice: '45000',
      coPrice: '35000',
      wPrice: '30000',
      hfPrice: '90000',
      taPrice: '200000',
      formulaIntsCost: '85',
      formulaIntsPrice: '95',
      ...(o.supperalloys || {}),
    },
  };
}

// ── account statement ────────────────────────────────────────────────────────

/**
 * One row of a STORED account statement (`actStatements/{year}/{client}/{period}`),
 * as written by app/(root)/accstatement/func.js runAccountStatement and read back by
 * both apps. `cur` is the raw currency ID ('us'/'eu'), and web's totals test it for
 * EQUALITY, so a third id must land in neither bucket.
 */
export function makeStatementRow(over?: Over) {
  return merge(
    {
      invoice: '1001',
      date: '2026-04-10',
      amount: 12000,
      cur: 'us',
      due: '2026-04-15',
      paid: 5000,
      notPaid: 7000,
    },
    over
  );
}

// ── misc / special invoices ──────────────────────────────────────────────────

/**
 * One `specialInvoices` doc (web: app/(root)/specialinvoices, mobile: Misc Invoices).
 * `paidNotPaid` is a free-text status — web's unpaid summary keeps everything that
 * is not the literal string 'Paid'.
 */
export function makeMiscInvoice(over?: Over) {
  return merge(
    {
      id: 'misc-1',
      compName: 'Acme Metals BV',
      date: '2026-04-05',
      supplier: 'sup-1',
      originSupplier: 'sup-2',
      order: 'PO-2026-001',
      salesInvoice: '1001',
      invoice: 'MISC-001',
      description: 'Demurrage',
      qnty: '2.5',
      unitPrc: '400',
      total: '1000',
      cur: 'us',
      paidNotPaid: 'Not Paid',
      category: '',
    },
    over
  );
}

// ── scenarios ────────────────────────────────────────────────────────────────

/**
 * Complete, named, cross-linked worlds. Each is `{ note, settings, compData,
 * companyRate, contracts, invoices?, stockLots?, expenses? }` where every contract
 * already carries its GROUPED `invoicesData`, so a suite can feed it straight into
 * web's calContracts / mobile's computePnl without re-linking anything.
 *
 * Prefer `scenario('name')` over touching SCENARIOS directly — it hands back a deep
 * clone, so a suite that mutates its world cannot poison the next one.
 */
const SETTINGS = makeSettings();

const buildScenarios = () => {
  // ── singleInvoice: one USD/MT contract, one issued invoice, half paid ──────
  const s1inv = makeInvoice();
  const singleInvoice = {
    note: 'Baseline: USD contract, MT units, one issued invoice (12000, 5000 paid).',
    settings: SETTINGS,
    compData: makeCompanyData(),
    companyRate: 0,
    contracts: [makeContract({ invoicesData: [[s1inv]] })],
    invoices: [s1inv],
  };

  // ── invoicePlusCreditNote: same invoice NUMBER, original + credit note ─────
  // groupInvoices supersedes the '1111' original with the '2222' credit note and
  // combines payments across both (finance.js:104-121).
  const s2orig = makeInvoice();
  const s2cn = makeCreditNote();
  const invoicePlusCreditNote = {
    note: 'Invoice 1001 issued at 12000 then credited by -2000. One GROUP of two docs.',
    settings: SETTINGS,
    compData: makeCompanyData(),
    companyRate: 0,
    contracts: [makeContract({ invoicesData: [[s2orig, s2cn]] })],
    invoices: [s2orig, s2cn],
  };

  // ── invoicePlusCreditPlusFinal: three ranks in one group ───────────────────
  const s3orig = makeInvoice();
  const s3cn = makeCreditNote();
  const s3fn = makeFinalNote();
  const invoicePlusCreditPlusFinal = {
    note: 'Invoice 1001 + credit note + final note. Highest rank (3333) supersedes.',
    settings: SETTINGS,
    compData: makeCompanyData(),
    companyRate: 0,
    contracts: [makeContract({ invoicesData: [[s3orig, s3cn, s3fn]] })],
    invoices: [s3orig, s3cn, s3fn],
  };

  // ── twoOriginalsSameNumber: equal rank => NOT an original+note pair ────────
  // Both docs survive grouping (finance.js:115), so anything that assumes a group
  // collapses to one doc is wrong here.
  const s4a = makeInvoice({ id: 'inv-1a', totalAmount: 12000 });
  const s4b = makeInvoice({ id: 'inv-1b', totalAmount: 3000, payments: [] });
  const twoOriginalsSameNumber = {
    note: 'Two docs, both invType 1111, both numbered 1001 — same rank, so neither supersedes.',
    settings: SETTINGS,
    compData: makeCompanyData(),
    companyRate: 0,
    contracts: [makeContract({ invoicesData: [[s4a, s4b]] })],
    invoices: [s4a, s4b],
  };

  // ── eurContractUsdInvoice: cross-currency, finalized doc, cur as OBJECT ────
  const s5inv = makeFinalizedInvoice({ totalAmount: 12000 });
  const eurContractUsdInvoice = {
    note: 'EUR contract (euroToUSD 1.08) whose finalized invoice is billed in USD with cur as an object.',
    settings: SETTINGS,
    compData: makeCompanyData(),
    companyRate: 0,
    contracts: [makeContract({ cur: 'eu', euroToUSD: 1.08, invoicesData: [[s5inv]] })],
    invoices: [s5inv],
  };

  // ── overShipped: invoiced tonnage exceeds contract tonnage => soldFrac clamps ─
  const s6inv = makeInvoice({ productsDataInvoice: [makeInvoiceProduct({ qnty: '14', total: '16800' })], totalAmount: 16800 });
  const overShipped = {
    note: 'Contract of 10 MT invoiced for 14 MT — soldFrac must clamp to 1 and unsold value to 0.',
    settings: SETTINGS,
    compData: makeCompanyData(),
    companyRate: 0,
    contracts: [makeContract({ invoicesData: [[s6inv]] })],
    invoices: [s6inv],
  };

  // ── zeroQtyLot: in and out cancel exactly => row must drop out of inventory ─
  const zeroQtyLot = {
    note: 'One in-lot of 10 fully consumed by an out-lot of 10, plus a 0.05 residual below the 0.1 floor.',
    settings: SETTINGS,
    compData: makeCompanyData(),
    companyRate: 0,
    contracts: [makeContract()],
    stockLots: [
      makeStockLot(),
      makeStockOutLot({ qnty: '10' }),
      makeStockLot({ id: 'lot-2', description: 'prd-2', descriptionId: 'prd-2', qnty: '0.05', descriptionText: 'Cr Scrap 430' }),
    ],
  };

  // ── draftAndCanceled: the pnlChain traps ──────────────────────────────────
  // Web's sumInvProductsMT skips `canceled` but NOT `draft`, so the draft's qty
  // inflates shipped MT while contributing zero revenue (pnlChain.ts:36-52).
  const s8issued = makeInvoice({ id: 'inv-i', invoice: 1001 });
  const s8draft = makeInvoice({ id: 'inv-d', invoice: 1002, draft: true, totalAmount: 5000, productsDataInvoice: [makeInvoiceProduct({ id: 'ivp-d', qnty: '3' })] });
  const s8cancel = makeInvoice({ id: 'inv-c', invoice: 1003, canceled: true, totalAmount: 4000, productsDataInvoice: [makeInvoiceProduct({ id: 'ivp-c', qnty: '2' })] });
  const draftAndCanceled = {
    note: 'Issued + draft + canceled invoices. Draft counts toward shipped MT but not revenue; canceled counts toward neither.',
    settings: SETTINGS,
    compData: makeCompanyData(),
    companyRate: 0,
    contracts: [makeContract({ invoicesData: [[s8issued], [s8draft], [s8cancel]] })],
    invoices: [s8issued, s8draft, s8cancel],
  };

  // ── kgsContractImportRows: unit-mismatch trap + import-flagged rows ────────
  // 12000 KGS = 12 MT, but the invoice's raw 10 is summed unconverted, and the
  // import row is counted by dashboard yet excluded by the contracts page.
  const s9inv = makeInvoice();
  const kgsContractImportRows = {
    note: 'KGS contract with an import-flagged breakdown row — exercises the raw-vs-converted quantity trap and the import filter.',
    settings: SETTINGS,
    compData: makeCompanyData(),
    companyRate: 0,
    contracts: [
      makeContract({
        qTypeTable: 'q-kgs',
        productsData: [makeProduct({ qnty: '12000', unitPrc: '1.2' }), makeImportProduct({ qnty: '4000' })],
        invoicesData: [[s9inv]],
      }),
    ],
    invoices: [s9inv],
  };

  return {
    singleInvoice,
    invoicePlusCreditNote,
    invoicePlusCreditPlusFinal,
    twoOriginalsSameNumber,
    eurContractUsdInvoice,
    overShipped,
    zeroQtyLot,
    draftAndCanceled,
    kgsContractImportRows,
  };
};

export const SCENARIOS = buildScenarios();
export type ScenarioName = keyof typeof SCENARIOS;

/** Deep clone of a named world — mutate it freely, the next suite gets a fresh copy. */
export function scenario<K extends ScenarioName>(name: K): (typeof SCENARIOS)[K] {
  const s = SCENARIOS[name];
  if (!s) throw new Error(`[fixtures] unknown scenario "${String(name)}". Known: ${Object.keys(SCENARIOS).join(', ')}`);
  return structuredClone(s);
}
