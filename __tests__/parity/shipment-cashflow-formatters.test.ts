/**
 * PARITY SUITE — Shipments tracking, Cashflow bottom line, display formatters,
 * and the Weight Analysis report.
 *
 * Web sources mirrored here (all of them are locked inside `page.js` React
 * components and therefore cannot be imported — see __tests__/parity/README.md,
 * "Known limits"):
 *   app/(root)/shipment/page.js   fmtDate, getUrgency, getSupplierName, getClientName,
 *                                 getPOL, getShpType, getMainInvoice, invYears,
 *                                 filtered, getSortValue, handleStatusChange
 *   app/(root)/cashflow/page.js   incoming (`tmp`), Total (Left) (`total`),
 *                                 Total (Right), Balance
 *   app/(root)/dashboard/page.js  fmtMoney, fmtAutoKM, fmtCurKM, fmtMT
 *   utils/utils.js                groupedArrayInvoice, sortArr
 *   app/(root)/analysis/page.js   @ git 065057f — the LAST revision where the Weight
 *                                 Analysis pipeline still existed (HEAD deleted it)
 *
 * Every mirror below is transcribed VERBATIM from web and guarded by the drift
 * alarm, so the suite goes red the moment web's own formula moves.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createHash } from 'node:crypto';

import { expectWebUnchanged, webFnSource, repoFileText } from './_helpers/webSource';
import {
  FIXED_NOW,
  makeSettings,
  makeContract,
  makeInvoice,
  makeInvoiceProduct,
  makePoInvoice,
  makeExpense,
  makeMarginMonth,
  makeProduct,
  makeStockLot,
} from './_helpers/fixtures';

// WEB's own status-normalisation module (a plain JS module — importable as-is).
// Used to build the contract list web's shipment page actually holds in state.
// @ts-ignore — plain JS, no types
import { normalizeStatus as webNormalizeStatus } from '../../app/(root)/contractsstatement/shipmentStatus';

// ── mobile under test ────────────────────────────────────────────────────────
import {
  fmtShipDate,
  getUrgency,
  buildShipmentInvoiceMap,
  shipmentInvoiceRange,
  buildShipmentRows,
  computeShipmentCounts,
  filterShipmentRows,
  shipmentFilterOptions,
  shipmentWriteDate,
  type ShipmentRow,
} from '@/features/shipment/useShipment';
import {
  computeCashflow,
  cashflowYearRanges,
  sumMarginsRemaining,
  sumManualEntries,
} from '@/features/cashflow/useCashflow';
import { curSymbol, fmtMoney, fmtAutoKM, fmtCurKM, fmtMT, dateLabel, initials } from '@/lib/format';
import {
  extractData,
  calc,
  mergeObj,
  groupedArrayInvoice as mobileGroupedArrayInvoice,
  calcAverage,
  createWeightRows,
} from '@/features/analysis/weightAnalysis';

// ─────────────────────────────────────────────────────────────────────────────
// A region-level drift alarm, for web formulas that live inside an ANONYMOUS
// `useEffect(() => { … })` or straight in JSX and therefore have no symbol name
// for webFnSource to find (cashflow's Total (Right) and Balance).
//
// Same contract as expectWebUnchanged: the hash is the ALARM, not the bug. Do not
// paste a new hash in to go green — read what changed in web first.
// ─────────────────────────────────────────────────────────────────────────────
function webRegion(relPath: string, startAnchor: string, endAnchor: string): string {
  const text = repoFileText(relPath);
  const i = text.indexOf(startAnchor);
  if (i === -1) {
    throw new Error(
      `[parity] start anchor ${JSON.stringify(startAnchor)} not found in ${relPath}. ` +
        `Web almost certainly rewrote this block — re-check the mobile port, do not just re-anchor.`
    );
  }
  const j = text.indexOf(endAnchor, i + startAnchor.length);
  if (j === -1) {
    throw new Error(
      `[parity] end anchor ${JSON.stringify(endAnchor)} not found after the start anchor in ${relPath}.`
    );
  }
  return text.slice(i, j + endAnchor.length).replace(/\s+/g, ' ').trim();
}

function expectRegionUnchanged(relPath: string, start: string, end: string, expected: string): void {
  const actual = createHash('sha256')
    .update(webRegion(relPath, start, end), 'utf8')
    .digest('hex')
    .slice(0, 12);
  if (actual === expected) return;
  throw new Error(
    [
      '',
      '════════════════════ WEB DRIFT ALARM (region) ════════════════════',
      `  file   : ${relPath}`,
      `  region : ${start.slice(0, 60)} … ${end.slice(0, 60)}`,
      `  recorded hash : ${expected}`,
      `  current  hash : ${actual}`,
      '',
      "  web's formula changed — re-check the mobile port in this domain and",
      '  update the recorded hash only once mobile is confirmed to still match.',
      '  Do NOT paste the new hash to make this green.',
      '══════════════════════════════════════════════════════════════════',
      '',
    ].join('\n')
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// SHARED FIXTURES
// ═════════════════════════════════════════════════════════════════════════════

/**
 * makeSettings() carries no POL/POD (no other screen resolves them). The shipment
 * table does — `settings.POL.POL.find(p => p.id === polId)?.pol` (page.js:462-474).
 * `over` is shallow-merged, so adding the two keys leaves everything else intact.
 */
const shipSettings = (over?: Record<string, any>) =>
  makeSettings({
    POL: { POL: [{ id: 'pol-1', pol: 'Rotterdam' }, { id: 'pol-2', pol: 'Antwerp' }] },
    POD: { POD: [{ id: 'pod-1', pod: 'Shanghai' }] },
    ...(over || {}),
  });

/** A sales invoice in the shape the shipment loader reads: shipData.etd/eta are picker objects. */
const shipInvoice = (over?: Record<string, any>) =>
  makeInvoice({
    shipData: {
      fnlzing: '',
      rcvd: '',
      status: '',
      etd: { startDate: '2026-04-20', endDate: '2026-04-20' },
      eta: { startDate: '2026-08-14', endDate: '2026-08-14' },
    },
    pol: 'pol-1',
    pod: 'pod-1',
    shpType: '323',
    ...(over || {}),
  });

// ═════════════════════════════════════════════════════════════════════════════
// WEB MIRRORS — shipment/page.js
// ═════════════════════════════════════════════════════════════════════════════

/** Mirror of app/(root)/shipment/page.js:63 fmtDate. Transcribed verbatim. */
const webFmtDate = (d: any): string | null => {
  if (!d) return null;
  try {
    const [y, m, day] = d.split('-');
    if (!y || !m || !day) return null;
    return `${day}.${m}.${y.slice(2)}`;
  } catch {
    return null;
  }
};

/** Mirror of page.js:371-372 getRawETD / getRawETA. */
const webGetRawETD = (c: any, invoiceMap: any) => c.shipmentEtd || invoiceMap[c.id]?.etd || '';
const webGetRawETA = (c: any, invoiceMap: any) => c.shipmentEta || invoiceMap[c.id]?.eta || '';

/** Mirror of page.js:397-407 getUrgency. Transcribed verbatim, Date.now() and all. */
const webGetUrgency = (contract: any, invoiceMap: any): 'overdue' | 'soon' | null => {
  if ((contract.shipmentStatus || '') === 'Completed') return null;
  const etaStr = webGetRawETA(contract, invoiceMap);
  if (!etaStr) return null;
  const eta = new Date(etaStr);
  if (isNaN(eta.getTime())) return null;
  const days = Math.floor((Date.now() - eta.getTime()) / 86400000);
  if (days > 0) return 'overdue';
  if (days >= -7) return 'soon';
  return null;
};

/** Mirror of page.js:355-360 getSupplierName. */
const webGetSupplierName = (contract: any, settings: any) => {
  const sups = settings?.Supplier?.Supplier;
  if (!sups) return '—';
  return (
    sups.find((s: any) => s.id === contract.supplier)?.nname ||
    sups.find((s: any) => s.id === contract.supplier)?.supplier ||
    '—'
  );
};

/** Mirror of page.js:362-368 getClientName. */
const webGetClientName = (contractId: string, settings: any, invoiceMap: any) => {
  const clts = settings?.Client?.Client;
  const inv = invoiceMap[contractId];
  if (!clts || !inv) return '—';
  return (
    clts.find((c: any) => c.id === inv.client)?.nname || clts.find((c: any) => c.id === inv.client)?.client || '—'
  );
};

/** Mirror of page.js:462-474 getPOL / getPOD. */
const webGetPOL = (contract: any, settings: any, invoiceMap: any) => {
  const list = settings?.POL?.POL;
  const polId = invoiceMap[contract.id]?.pol || contract.pol;
  if (!list || !polId) return '—';
  return list.find((p: any) => p.id === polId)?.pol || '—';
};
const webGetPOD = (contract: any, settings: any, invoiceMap: any) => {
  const list = settings?.POD?.POD;
  const podId = invoiceMap[contract.id]?.pod || contract.pod;
  if (!list || !podId) return '—';
  return list.find((p: any) => p.id === podId)?.pod || '—';
};

/** Mirror of page.js:476-481 SHP_TYPE_MAP / getShpType. */
const WEB_SHP_TYPE_MAP: Record<string, string> = {
  '323': 'Container',
  '434': 'Truck',
  '565': 'Container+',
  '787': 'Flight',
};
const webGetShpType = (contract: any, invoiceMap: any) => {
  const shpType = invoiceMap[contract.id]?.shpType || contract.shpType;
  if (!shpType) return '—';
  return WEB_SHP_TYPE_MAP[shpType] || shpType;
};

/** Mirror of page.js:483-486 getMainInvoice. */
const webGetMainInvoice = (contract: any) => {
  if (!contract.invoices?.length) return null;
  return contract.invoices.find((i: any) => i.invType === '1111') || contract.invoices[0];
};

/** Mirror of page.js:314-316 invYears (the invoice-loading window). */
const webInvYears = (sortedContracts: any[]) =>
  sortedContracts.flatMap((c: any) =>
    (c.invoices || []).map((inv: any) => (inv.date || '').substring(0, 4)).filter(Boolean)
  );

interface WebFilterState {
  statusFilter: string;
  supplierFilter: string;
  clientFilter: string;
  shipTypeFilter: string;
  urgencyFilter: string;
  search: string;
}
const NO_FILTERS: WebFilterState = {
  statusFilter: '',
  supplierFilter: '',
  clientFilter: '',
  shipTypeFilter: '',
  urgencyFilter: '',
  search: '',
};

/** Mirror of page.js:598-617 `filtered`. Transcribed verbatim. */
const webFiltered = (contracts: any[], settings: any, invoiceMap: any, f: WebFilterState) =>
  contracts.filter((c) => {
    const matchStatus = f.statusFilter === '' || (c.shipmentStatus || '') === f.statusFilter;
    if (!matchStatus) return false;
    const matchSupplier = f.supplierFilter === '' || c.supplier === f.supplierFilter;
    if (!matchSupplier) return false;
    const matchClient = f.clientFilter === '' || invoiceMap[c.id]?.client === f.clientFilter;
    if (!matchClient) return false;
    const matchShipType =
      f.shipTypeFilter === '' || (invoiceMap[c.id]?.shpType || c.shpType) === f.shipTypeFilter;
    if (!matchShipType) return false;
    if (f.urgencyFilter !== '' && webGetUrgency(c, invoiceMap) !== f.urgencyFilter) return false;
    if (!f.search.trim()) return true;
    const q = f.search.toLowerCase();
    const inv = webGetMainInvoice(c);
    return (
      (c.order || '').toLowerCase().includes(q) ||
      webGetSupplierName(c, settings).toLowerCase().includes(q) ||
      webGetClientName(c.id, settings, invoiceMap).toLowerCase().includes(q) ||
      (inv?.invoice?.toString() || '').includes(q)
    );
  });

/** Mirror of page.js:619-635 getSortValue. */
const webGetSortValue = (c: any, col: string, settings: any, invoiceMap: any): any => {
  const inv = webGetMainInvoice(c);
  switch (col) {
    case 'order':
      return (c.order || '').toLowerCase();
    case 'supplier':
      return webGetSupplierName(c, settings).toLowerCase();
    case 'invoice':
      return inv?.invoice?.toString().toLowerCase() || '';
    case 'client':
      return webGetClientName(c.id, settings, invoiceMap).toLowerCase();
    case 'etd':
      return webGetRawETD(c, invoiceMap);
    case 'eta':
      return webGetRawETA(c, invoiceMap);
    case 'pol':
      return webGetPOL(c, settings, invoiceMap).toLowerCase();
    case 'pod':
      return webGetPOD(c, settings, invoiceMap).toLowerCase();
    case 'shpType':
      return webGetShpType(c, invoiceMap).toLowerCase();
    case 'status':
      return (c.shipmentStatus || '').toLowerCase();
    case 'updated':
      return c.shipmentUpdatedAt || 0;
    default:
      return '';
  }
};

/**
 * Mirror of the whole web ordering pipeline as the page renders it on arrival:
 *   page.js:286  baseContracts sorted by contract date ASCENDING
 *   page.js:253  sortCol defaults to 'updated'
 *   page.js:254  sortDir defaults to 'desc'
 *   page.js:637  sortedFiltered = [...filtered].sort(cmp) with cmp negated for desc
 * Array.prototype.sort is stable, so contracts sharing a timestamp keep the
 * date-ascending order they arrived in.
 */
const webDefaultOrder = (contracts: any[], settings: any, invoiceMap: any, f: WebFilterState = NO_FILTERS) => {
  const base = [...contracts].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  const filtered = webFiltered(base, settings, invoiceMap, f);
  return [...filtered].sort((a, b) => {
    const av = webGetSortValue(a, 'updated', settings, invoiceMap);
    const bv = webGetSortValue(b, 'updated', settings, invoiceMap);
    const cmp = av < bv ? -1 : av > bv ? 1 : 0;
    return -cmp;
  });
};

/**
 * Mirror of page.js:284-285 — the page normalizes EVERY contract's shipmentStatus
 * as it loads, so getUrgency (page.js:398), `filtered` (page.js:599), the chip
 * counts (page.js:852) and the In-Transit strip (page.js:595) all compare the
 * NORMALIZED vocabulary and never the stored legacy token. Web's own module is
 * imported rather than re-transcribed, so the alias table cannot drift apart.
 */
const webLoadContracts = (contracts: any[]) =>
  contracts.map((c) => ({ ...c, shipmentStatus: webNormalizeStatus(c.shipmentStatus) }));

// ═════════════════════════════════════════════════════════════════════════════
describe('shipment — web drift alarms for every mirrored formula', () => {
  const SHIP = 'app/(root)/shipment/page.js';

  it("web's fmtDate has not drifted", () => expectWebUnchanged(SHIP, 'fmtDate', '748b44a6e7cc'));
  it("web's getUrgency has not drifted", () => expectWebUnchanged(SHIP, 'getUrgency', 'f7ab00fc8539'));
  it("web's getRawETA has not drifted", () => expectWebUnchanged(SHIP, 'getRawETA', '0156c958598b'));
  it("web's getSupplierName has not drifted", () => expectWebUnchanged(SHIP, 'getSupplierName', 'c5f462823d58'));
  it("web's getClientName has not drifted", () => expectWebUnchanged(SHIP, 'getClientName', '84b5bd14faad'));
  it("web's getPOL has not drifted", () => expectWebUnchanged(SHIP, 'getPOL', 'faff3d66a5d9'));
  it("web's getShpType has not drifted", () => expectWebUnchanged(SHIP, 'getShpType', '0de913459394'));
  it("web's SHP_TYPE_MAP has not drifted", () => expectWebUnchanged(SHIP, 'SHP_TYPE_MAP', '5885fa5b516b'));
  it("web's getMainInvoice has not drifted", () => expectWebUnchanged(SHIP, 'getMainInvoice', '74d88bf66bd8'));
  it("web's invYears window has not drifted", () => expectWebUnchanged(SHIP, 'invYears', '2f5ae934148d'));
  it("web's filter predicate has not drifted", () => expectWebUnchanged(SHIP, 'filtered', '32dd3e37e532'));
  it("web's getSortValue has not drifted", () => expectWebUnchanged(SHIP, 'getSortValue', '6bf1a8081611'));
  it("web's handleStatusChange has not drifted", () =>
    expectWebUnchanged(SHIP, 'handleStatusChange', '816e11397406'));

  it("web's default sort is still 'updated' descending over a date-ascending list", () => {
    // These three literals are the whole basis of the tiebreak assertions below, so
    // they get their own alarm rather than living only in a comment.
    const text = repoFileText(SHIP);
    // page.js:286 — the load order the stable sort falls back to. Note it orders on
    // the RAW `date` field, not on dateRange.
    expect(text).toContain(".sort((a, b) => (a.date || '').localeCompare(b.date || ''));");
    expect(text).toContain("const [sortCol, setSortCol] = useState('updated');");
    expect(text).toContain("const [sortDir, setSortDir] = useState('desc');");
  });
});

// ═════════════════════════════════════════════════════════════════════════════
describe('shipment — ETD/ETA render as DD.MM.YY', () => {
  it('a stored YYYY-MM-DD prints day-first with a two-digit year', () => {
    // web page.js:63-70 fmtDate → `${day}.${m}.${y.slice(2)}`
    expect(fmtShipDate('2026-08-14')).toBe('14.08.26');
    expect(fmtShipDate('2026-08-14')).toBe(webFmtDate('2026-08-14'));
  });

  it('an unset or malformed date renders the em-dash placeholder, not a partial date', () => {
    // Web returns null from fmtDate and the DateCell renders `display || '—'`
    // (page.js:110). Mobile has no cell wrapper, so fmtShipDate returns the
    // placeholder itself — the SCREEN text is identical, which is the parity claim.
    for (const bad of ['', '2026', '2026-08']) {
      expect(fmtShipDate(bad)).toBe('—');
      expect(fmtShipDate(bad)).toBe(webFmtDate(bad) ?? '—');
    }
    expect(fmtShipDate(undefined)).toBe('—');
  });

  it('a hyphenated non-date is passed through verbatim on BOTH apps', () => {
    // Neither app validates: web's fmtDate splits on '-' and only checks that three
    // parts exist (page.js:66-67), so 'not-a-date' becomes 'date.a.t' on the web
    // table too. Pinned so nobody "fixes" one side into disagreeing with the other.
    expect(fmtShipDate('not-a-date')).toBe('date.a.t');
    expect(fmtShipDate('not-a-date')).toBe(webFmtDate('not-a-date'));
  });

  it('the day and month are printed exactly as stored — no zero-padding or re-parsing', () => {
    // web splits the STRING; it never constructs a Date, so '2026-8-4' stays '4.8.26'.
    expect(fmtShipDate('2026-8-4')).toBe('4.8.26');
    expect(fmtShipDate('2026-8-4')).toBe(webFmtDate('2026-8-4'));
  });
});

// ═════════════════════════════════════════════════════════════════════════════
describe('shipment — arrival urgency', () => {
  // getUrgency reads Date.now(); every assertion below is anchored to FIXED_NOW.
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW); // 2026-08-07T12:00:00Z
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  const map = { 'con-1': { eta: '' } } as any;
  const withEta = (eta: string, shipmentStatus = '') => ({ id: 'con-1', shipmentStatus, shipmentEta: eta });

  it('cargo past its arrival date is overdue', () => {
    // web page.js:404-405 — days > 0
    expect(getUrgency('', '2026-08-06')).toBe('overdue');
    expect(getUrgency('', '2026-08-06')).toBe(webGetUrgency(withEta('2026-08-06'), map));
  });

  it('an ETA of TODAY classifies "soon" and can never be overdue', () => {
    // The pinned quirk: `new Date('2026-08-07')` is UTC MIDNIGHT while the clock is a
    // wall-clock instant, so the elapsed span for an ETA of today is always in
    // [0h, 24h) → Math.floor(...) === 0 → the `days > 0` overdue branch cannot fire.
    // Web behaves this way (page.js:401-405) and mobile reproduces it deliberately.
    expect(getUrgency('', '2026-08-07')).toBe('soon');
    expect(getUrgency('', '2026-08-07')).toBe(webGetUrgency(withEta('2026-08-07'), map));

    // Still 'soon' 11 hours later, i.e. after midnight in any UTC+ zone.
    vi.setSystemTime(new Date('2026-08-07T23:00:00Z'));
    expect(getUrgency('', '2026-08-07')).toBe('soon');
    expect(getUrgency('', '2026-08-07')).toBe(webGetUrgency(withEta('2026-08-07'), map));
  });

  it('arrival within the next 7 days is "soon", and the 7-day edge is inclusive', () => {
    // web page.js:406 — days >= -7. At 12:00Z an ETA of the 14th is -6.5 days,
    // floored to -7, so the seventh day still counts.
    expect(getUrgency('', '2026-08-14')).toBe('soon');
    expect(getUrgency('', '2026-08-14')).toBe(webGetUrgency(withEta('2026-08-14'), map));
  });

  it('arrival further out than the 7-day window is not flagged at all', () => {
    expect(getUrgency('', '2026-08-15')).toBeNull();
    expect(getUrgency('', '2026-08-15')).toBe(webGetUrgency(withEta('2026-08-15'), map));
  });

  it('completed cargo is never flagged, however overdue its ETA is', () => {
    // web page.js:398 — the Completed short-circuit precedes every date test.
    expect(getUrgency('Completed', '2020-01-01')).toBeNull();
    expect(getUrgency('Completed', '2020-01-01')).toBe(webGetUrgency(withEta('2020-01-01', 'Completed'), map));
  });

  it('a missing or unparseable ETA is not flagged', () => {
    // web page.js:400-403 — the !etaStr guard, then the isNaN(getTime()) guard.
    expect(getUrgency('In Transit', '')).toBeNull();
    expect(getUrgency('In Transit', 'tbc')).toBeNull();
    expect(getUrgency('In Transit', 'tbc')).toBe(webGetUrgency(withEta('tbc', 'In Transit'), map));
  });

  it('a status other than Completed does not suppress the flag', () => {
    expect(getUrgency('In Transit', '2026-08-01')).toBe('overdue');
    expect(getUrgency('On Hold', '2026-08-01')).toBe('overdue');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
describe('shipment — the row a contract becomes', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  const settings = shipSettings();
  const invoices = [shipInvoice()];
  const invMap = buildShipmentInvoiceMap(invoices);
  const contracts = [
    makeContract({
      invoices: [{ invType: '1111', invoice: 1001 }],
      shipmentStatus: 'In Transit',
      shipmentUpdatedAt: 1_700_000_000_000,
    }),
  ];
  const row = () => buildShipmentRows(contracts, invMap, {}, settings)[0];

  it('only the FIRST original sales invoice feeds a contract row', () => {
    // web page.js:330-342 — `invType === '1111' && !map[cid]`.
    const many = [
      shipInvoice({ id: 'a', invType: '2222', pol: 'pol-2' }),
      shipInvoice({ id: 'b', pol: 'pol-1' }),
      shipInvoice({ id: 'c', pol: 'pol-2' }),
    ];
    const m = buildShipmentInvoiceMap(many);
    expect(m['con-1'].pol).toBe('pol-1'); // the credit note and the second original are ignored
  });

  it('the supplier name falls back to the legal name when there is no short name', () => {
    // web page.js:358-359 — `?.nname || ?.supplier || '—'`.
    const s = shipSettings({ Supplier: { Supplier: [{ id: 'sup-1', supplier: 'Acme Metals GmbH' }] } });
    const r = buildShipmentRows(contracts, invMap, {}, s)[0];
    expect(r.supplierName).toBe('Acme Metals GmbH');
    expect(r.supplierName).toBe(webGetSupplierName(contracts[0], s));
  });

  it('an unknown supplier renders the em-dash placeholder', () => {
    const s = shipSettings({ Supplier: { Supplier: [] } });
    const r = buildShipmentRows(contracts, invMap, {}, s)[0];
    expect(r.supplierName).toBe('—');
    expect(r.supplierName).toBe(webGetSupplierName(contracts[0], s));
  });

  it('the client comes off the linked invoice, not the contract', () => {
    // web page.js:362-368 — getClientName(contractId) reads invoiceMap[contractId].client.
    expect(row().clientName).toBe('Northwind Steel');
    expect(row().clientName).toBe(webGetClientName('con-1', settings, invMap));
  });

  it('a contract with no linked invoice has no client', () => {
    expect(buildShipmentRows(contracts, {}, {}, settings)[0].clientName).toBe('—');
    expect(webGetClientName('con-1', settings, {})).toBe('—');
  });

  it('POL, POD and ship type prefer the invoice and fall back to the contract field', () => {
    // web page.js:462-481 — `invoiceMap[c.id]?.x || contract.x`.
    expect(row().pol).toBe('Rotterdam');
    expect(row().pod).toBe('Shanghai');
    expect(row().shpType).toBe('Container');
    expect(row().pol).toBe(webGetPOL(contracts[0], settings, invMap));
    expect(row().pod).toBe(webGetPOD(contracts[0], settings, invMap));
    expect(row().shpType).toBe(webGetShpType(contracts[0], invMap));

    const own = [makeContract({ pol: 'pol-2', pod: 'pod-1', shpType: '787' })];
    const r = buildShipmentRows(own, {}, {}, settings)[0];
    expect(r.pol).toBe('Antwerp');
    expect(r.shpType).toBe('Flight');
    expect(r.pol).toBe(webGetPOL(own[0], settings, {}));
    expect(r.shpType).toBe(webGetShpType(own[0], {}));
  });

  it('an unmapped ship-type id is printed raw rather than swallowed', () => {
    // web page.js:480 — `SHP_TYPE_MAP[shpType] || shpType`.
    const odd = [makeContract({ shpType: '999' })];
    expect(buildShipmentRows(odd, {}, {}, settings)[0].shpType).toBe('999');
    expect(buildShipmentRows(odd, {}, {}, settings)[0].shpType).toBe(String(webGetShpType(odd[0], {})));
  });

  it('the invoice number shown is the original, or the first one when there is none', () => {
    // web page.js:483-486 getMainInvoice.
    expect(row().invoiceNo).toBe('1001');
    const noOriginal = [makeContract({ invoices: [{ invType: '2222', invoice: 2002 }] })];
    expect(buildShipmentRows(noOriginal, {}, {}, settings)[0].invoiceNo).toBe('2002');
    expect(buildShipmentRows(noOriginal, {}, {}, settings)[0].invoiceNo).toBe(
      String(webGetMainInvoice(noOriginal[0]).invoice)
    );
    const none = [makeContract({ invoices: [] })];
    expect(buildShipmentRows(none, {}, {}, settings)[0].invoiceNo).toBe('');
    expect(webGetMainInvoice(none[0])).toBeNull();
  });

  it('ETD/ETA prefer the contract override over the linked invoice', () => {
    // web page.js:371-372 — `contract.shipmentEtd || invoiceMap[...].etd`.
    const overridden = [makeContract({ shipmentEtd: '2026-06-01', shipmentEta: '2026-07-01' })];
    const r = buildShipmentRows(overridden, invMap, {}, settings)[0];
    expect(r.etd).toBe('2026-06-01');
    expect(r.eta).toBe('2026-07-01');
    expect(r.etd).toBe(webGetRawETD(overridden[0], invMap));
    expect(r.eta).toBe(webGetRawETA(overridden[0], invMap));

    // and fall through to the invoice when the contract has none
    expect(row().etd).toBe('2026-04-20');
    expect(row().eta).toBe('2026-08-14');
    expect(row().etd).toBe(webGetRawETD(contracts[0], invMap));
  });

  it('"last update" is the newer of the stored stamp and the newest shipment activity row', () => {
    // web page.js:306-309 — `Math.max(c.shipmentUpdatedAt || 0, actMap[c.id] || 0)`.
    const act = { 'con-1': 1_800_000_000_000 };
    expect(buildShipmentRows(contracts, invMap, act, settings)[0].updatedAt).toBe(1_800_000_000_000);
    expect(buildShipmentRows(contracts, invMap, {}, settings)[0].updatedAt).toBe(1_700_000_000_000);
    const never = [makeContract({ id: 'con-9' })];
    expect(buildShipmentRows(never, {}, {}, settings)[0].updatedAt).toBe(0);
  });

  it('the row urgency is the urgency of the resolved ETA', () => {
    // Contract has no shipmentEta, so the invoice's 2026-08-14 wins → 'soon' at FIXED_NOW.
    expect(row().urgency).toBe('soon');
    expect(row().urgency).toBe(webGetUrgency(contracts[0], invMap));
  });

  it('the attention counts are taken over every loaded contract, ignoring the filters', () => {
    // web page.js:593-595 — computed from `contracts`, never from `filtered`.
    const world = [
      makeContract({ id: 'c1', shipmentStatus: 'In Transit', shipmentEta: '2026-08-01' }), // overdue
      makeContract({ id: 'c2', shipmentStatus: 'In Transit', shipmentEta: '2026-08-09' }), // soon
      makeContract({ id: 'c3', shipmentStatus: 'Completed', shipmentEta: '2026-01-01' }), // calm
      makeContract({ id: 'c4', shipmentStatus: '' }),
    ];
    const rows = buildShipmentRows(world, {}, {}, settings);
    const counts = computeShipmentCounts(rows);
    expect(counts.overdue).toBe(world.filter((c) => webGetUrgency(c, {}) === 'overdue').length);
    expect(counts.soon).toBe(world.filter((c) => webGetUrgency(c, {}) === 'soon').length);
    expect(counts.inTransit).toBe(world.filter((c) => (c.shipmentStatus || '') === 'In Transit').length);
    expect(counts.all).toBe(4);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
describe('shipment — legacy statuses are normalized before ANYTHING reads them', () => {
  // Regression guard added by the adversarial pass: mobile normalized the status for
  // DISPLAY only and kept reading `raw.shipmentStatus` for urgency, filtering and the
  // chip counts. Web normalizes once at load (page.js:285) and every consumer sees the
  // new vocabulary, so a contract stored as 'Delivered' was calm and Completed on web
  // while mobile flagged it overdue and hid it from the Completed chip.
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  const settings = shipSettings();
  const legacy = [
    makeContract({ id: 'old-done', shipmentStatus: 'Delivered', shipmentEta: '2020-01-01' }),
    makeContract({ id: 'old-port', shipmentStatus: 'At Port', shipmentEta: '2026-08-09' }),
    makeContract({ id: 'live', shipmentStatus: 'In Transit', shipmentEta: '2026-08-01' }),
  ];
  const rows = () => buildShipmentRows(legacy, {}, {}, settings);

  it("web really does normalize at load — the alarm for the whole block", () => {
    expect(repoFileText('app/(root)/shipment/page.js')).toContain(
      '.map(c => ({ ...c, shipmentStatus: normalizeStatus(c.shipmentStatus) }))'
    );
    // The alias table itself is web's module, imported above.
    expect(webNormalizeStatus('Delivered')).toBe('Completed');
    expect(webNormalizeStatus('At Port')).toBe('Arrived');
  });

  it('a legacy Delivered contract is Completed and therefore NEVER flagged overdue', () => {
    // web page.js:398 short-circuits on 'Completed'; after normalisation that is what
    // a 'Delivered' contract is, so its six-year-old ETA raises nothing.
    const r = rows().find((x) => x.id === 'old-done')!;
    expect(r.status).toBe('Completed');
    expect(r.urgency).toBeNull();
    expect(r.urgency).toBe(webGetUrgency(webLoadContracts(legacy)[0], {}));
  });

  it('the Completed chip selects the legacy row whose own pill already reads Completed', () => {
    const got = filterShipmentRows(rows(), { status: 'Completed' }).map((r) => r.id);
    expect(got).toEqual(['old-done']);
    expect(got).toEqual(
      webFiltered(webLoadContracts(legacy), settings, {}, { ...NO_FILTERS, statusFilter: 'Completed' }).map(
        (c) => c.id
      )
    );
    // and the legacy token is not itself a selectable status any more
    expect(filterShipmentRows(rows(), { status: 'Delivered' })).toEqual([]);
    expect(
      webFiltered(webLoadContracts(legacy), settings, {}, { ...NO_FILTERS, statusFilter: 'Delivered' })
    ).toEqual([]);
  });

  it('the chip counts are keyed on the normalized vocabulary', () => {
    // web page.js:852 counts `contracts.filter(c => (c.shipmentStatus || '') === s)`
    // over the SHIPMENT_STATUSES list, on the already-normalized array.
    const counts = computeShipmentCounts(rows());
    const web = webLoadContracts(legacy);
    for (const s of ['Completed', 'Arrived', 'In Transit']) {
      expect(counts.byStatus[s] || 0).toBe(web.filter((c) => (c.shipmentStatus || '') === s).length);
      expect(counts.byStatus[s]).toBe(1);
    }
    expect(counts.byStatus['Delivered']).toBeUndefined();
    expect(counts.byStatus['At Port']).toBeUndefined();
    expect(counts.inTransit).toBe(web.filter((c) => (c.shipmentStatus || '') === 'In Transit').length);
  });

  it('an At Port contract still carries its urgency — only Completed is exempt', () => {
    // 'At Port' → 'Arrived', which is NOT the exempt status, so the 2026-08-09 ETA
    // stays inside the 7-day window and the row is 'soon' on both apps.
    const r = rows().find((x) => x.id === 'old-port')!;
    expect(r.status).toBe('Arrived');
    expect(r.urgency).toBe('soon');
    expect(r.urgency).toBe(webGetUrgency(webLoadContracts(legacy)[1], {}));
  });
});

// ═════════════════════════════════════════════════════════════════════════════
describe('shipment — filtering', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  const settings = shipSettings();
  const contracts = [
    makeContract({
      id: 'c1',
      order: 'PO-AAA',
      supplier: 'sup-1',
      date: '2026-01-10',
      shipmentStatus: 'In Transit',
      shpType: '323',
      invoices: [{ invType: '1111', invoice: 5001 }],
    }),
    makeContract({
      id: 'c2',
      order: 'PO-BBB',
      supplier: 'sup-2',
      date: '2026-02-10',
      shipmentStatus: 'Completed',
      shpType: '434',
      invoices: [{ invType: '1111', invoice: 5002 }],
    }),
    makeContract({
      id: 'c3',
      order: 'PO-CCC',
      supplier: 'sup-1',
      date: '2026-03-10',
      shipmentStatus: '',
      shpType: '434',
      shipmentEta: '2026-08-01',
      invoices: [{ invType: '1111', invoice: 5003 }],
    }),
  ];
  const invMap = {
    c1: { client: 'cli-1', etd: '', eta: '', pol: null, pod: null, shpType: null },
    c2: { client: 'cli-2', etd: '', eta: '', pol: null, pod: null, shpType: null },
  } as any;
  const rows = () => buildShipmentRows(contracts, invMap, {}, settings);
  const ids = (rs: ShipmentRow[]) => rs.map((r) => r.id).sort();
  const webIds = (f: Partial<WebFilterState>) =>
    webFiltered(contracts, settings, invMap, { ...NO_FILTERS, ...f })
      .map((c) => c.id)
      .sort();

  it('no filter keeps every contract', () => {
    expect(ids(filterShipmentRows(rows(), {}))).toEqual(webIds({}));
  });

  it('the status filter matches the stored status exactly, and "" is not a status', () => {
    // web page.js:599 — `(c.shipmentStatus || '') === statusFilter`, and an empty
    // filter means "all", so the status-less contract is only ever reachable via All.
    expect(ids(filterShipmentRows(rows(), { status: 'In Transit' }))).toEqual(webIds({ statusFilter: 'In Transit' }));
    expect(ids(filterShipmentRows(rows(), { status: 'Completed' }))).toEqual(webIds({ statusFilter: 'Completed' }));
    // A status no contract holds selects nothing on EITHER app — compared against the
    // mirror rather than a bare [], so the assertion cannot pass by the fixture being
    // empty for some unrelated reason.
    expect(ids(filterShipmentRows(rows(), { status: 'Pending' }))).toEqual(webIds({ statusFilter: 'Pending' }));
    expect(webIds({ statusFilter: 'Pending' })).toEqual([]);
  });

  it('the supplier filter selects the same contracts web selects by supplier id', () => {
    // DIVERGENCE OF TOKEN, NOT OF SELECTION: web's dropdown stores the supplier ID
    // (page.js:588, 870-873) while mobile's chips are built from
    // shipmentFilterOptions and therefore carry the NAME. The chosen set must match.
    expect(ids(filterShipmentRows(rows(), { supplier: 'Acme Metals' }))).toEqual(
      webIds({ supplierFilter: 'sup-1' })
    );
    expect(ids(filterShipmentRows(rows(), { supplier: 'Bravo Alloys' }))).toEqual(
      webIds({ supplierFilter: 'sup-2' })
    );
  });

  it('the supplier chips are exactly the names the filter accepts', () => {
    // Regression guard for the bug this suite found: the options were names while
    // the predicate compared ids, so every supplier chip produced an empty list.
    const opts = shipmentFilterOptions(rows());
    for (const name of opts.suppliers) {
      expect(filterShipmentRows(rows(), { supplier: name }).length).toBeGreaterThan(0);
    }
    expect(opts.suppliers).toEqual(['Acme Metals', 'Bravo Alloys']);
  });

  it('the client filter selects the same contracts web selects by client id', () => {
    expect(ids(filterShipmentRows(rows(), { client: 'Northwind Steel' }))).toEqual(
      webIds({ clientFilter: 'cli-1' })
    );
  });

  it('the ship-type filter selects the same contracts web selects by ship-type id', () => {
    // Web compares the raw id ('434'); mobile compares the label ('Truck') because
    // that is what its chips carry. Same contracts either way.
    expect(ids(filterShipmentRows(rows(), { shipType: 'Truck' }))).toEqual(webIds({ shipTypeFilter: '434' }));
    expect(ids(filterShipmentRows(rows(), { shipType: 'Container' }))).toEqual(webIds({ shipTypeFilter: '323' }));
  });

  it('the urgency filter keeps only cargo in that urgency band', () => {
    expect(ids(filterShipmentRows(rows(), { urgency: 'overdue' }))).toEqual(webIds({ urgencyFilter: 'overdue' }));
    expect(ids(filterShipmentRows(rows(), { urgency: 'overdue' }))).toEqual(['c3']);
  });

  it('search matches the PO, the supplier name, the client name AND the invoice number', () => {
    // web page.js:611-616 searches all four; mobile once searched only two, so a
    // client name or an invoice number found nothing.
    expect(ids(filterShipmentRows(rows(), { search: 'po-bbb' }))).toEqual(webIds({ search: 'po-bbb' }));
    expect(ids(filterShipmentRows(rows(), { search: 'acme' }))).toEqual(webIds({ search: 'acme' }));
    expect(ids(filterShipmentRows(rows(), { search: 'southgate' }))).toEqual(webIds({ search: 'southgate' }));
    expect(ids(filterShipmentRows(rows(), { search: '5003' }))).toEqual(webIds({ search: '5003' }));
    expect(ids(filterShipmentRows(rows(), { search: '5003' }))).toEqual(['c3']);
  });

  it('a whitespace-only search is treated as no search', () => {
    // web page.js:608 — `if (!search.trim()) return true`.
    expect(ids(filterShipmentRows(rows(), { search: '   ' }))).toEqual(webIds({ search: '   ' }));
  });

  it('filters compose — every active one must match', () => {
    expect(ids(filterShipmentRows(rows(), { supplier: 'Acme Metals', shipType: 'Truck' }))).toEqual(
      webIds({ supplierFilter: 'sup-1', shipTypeFilter: '434' })
    );
    // Bravo Alloys' only contract is Completed, so the pair selects nothing — and web
    // agrees, which is what makes the empty result meaningful rather than accidental.
    expect(ids(filterShipmentRows(rows(), { supplier: 'Bravo Alloys', status: 'In Transit' }))).toEqual(
      webIds({ supplierFilter: 'sup-2', statusFilter: 'In Transit' })
    );
    expect(webIds({ supplierFilter: 'sup-2', statusFilter: 'In Transit' })).toEqual([]);
    // ...while each half on its own does select it, so the emptiness comes from the
    // COMPOSITION and not from one filter being broken.
    expect(ids(filterShipmentRows(rows(), { supplier: 'Bravo Alloys' }))).toEqual(['c2']);
    expect(ids(filterShipmentRows(rows(), { status: 'In Transit' }))).toEqual(['c1']);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
describe('shipment — default ordering', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  const settings = shipSettings();

  /**
   * makeContract()'s `over` is shallow, so overriding `date` alone leaves the default
   * `dateRange` in place. Both are set here — otherwise every fixture would share one
   * dateRange and the ordering assertions would pass for the wrong reason.
   */
  const dated = (over: Record<string, any>) =>
    makeContract({ ...over, dateRange: { startDate: over.date, endDate: over.date } });

  it('rows are listed last-touched first', () => {
    // web page.js:253-254 + 632 — sortCol 'updated', sortDir 'desc'.
    const contracts = [
      dated({ id: 'old', date: '2026-01-01', shipmentUpdatedAt: 1000 }),
      dated({ id: 'new', date: '2026-02-01', shipmentUpdatedAt: 9000 }),
      dated({ id: 'mid', date: '2026-03-01', shipmentUpdatedAt: 5000 }),
    ];
    const got = filterShipmentRows(buildShipmentRows(contracts, {}, {}, settings), {}).map((r) => r.id);
    expect(got).toEqual(['new', 'mid', 'old']);
    expect(got).toEqual(webDefaultOrder(contracts, settings, {}).map((c) => c.id));
  });

  it('contracts that have never been touched keep web\'s oldest-first order', () => {
    // Every untouched contract has updatedAt 0, so the tiebreak decides the ENTIRE
    // list. Web's sort is stable over a date-ASCENDING array (page.js:286), so the
    // oldest contract heads the block. Sorting ties newest-first reversed it.
    const contracts = [
      dated({ id: 'c-mar', date: '2026-03-01' }),
      dated({ id: 'c-jan', date: '2026-01-01' }),
      dated({ id: 'c-feb', date: '2026-02-01' }),
    ];
    const got = filterShipmentRows(buildShipmentRows(contracts, {}, {}, settings), {}).map((r) => r.id);
    expect(got).toEqual(['c-jan', 'c-feb', 'c-mar']);
    expect(got).toEqual(webDefaultOrder(contracts, settings, {}).map((c) => c.id));
  });

  it('the tiebreak orders on the contract `date`, the field web orders on', () => {
    // web page.js:286 sorts baseContracts on `a.date`. A legacy contract whose
    // dateRange.startDate disagrees with its `date` must still land where web puts
    // it, so the tiebreak cannot read the display field (which prefers dateRange).
    const contracts = [
      makeContract({ id: 'later-date', date: '2026-06-01', dateRange: { startDate: '2020-01-01' } }),
      makeContract({ id: 'earlier-date', date: '2026-01-01', dateRange: { startDate: '2030-01-01' } }),
    ];
    const got = filterShipmentRows(buildShipmentRows(contracts, {}, {}, settings), {}).map((r) => r.id);
    expect(got).toEqual(['earlier-date', 'later-date']);
    expect(got).toEqual(webDefaultOrder(contracts, settings, {}).map((c) => c.id));
  });

  it('the timestamp outranks the date — a freshly touched old contract leads', () => {
    const contracts = [
      dated({ id: 'recent-2020', date: '2020-01-01', shipmentUpdatedAt: 9000 }),
      dated({ id: 'stale-2026', date: '2026-01-01', shipmentUpdatedAt: 0 }),
    ];
    const got = filterShipmentRows(buildShipmentRows(contracts, {}, {}, settings), {}).map((r) => r.id);
    expect(got).toEqual(['recent-2020', 'stale-2026']);
    expect(got).toEqual(webDefaultOrder(contracts, settings, {}).map((c) => c.id));
  });

  it('activity-fed timestamps take part in the sort, not just the display', () => {
    // web page.js:306-309 folds actMap into shipmentUpdatedAt BEFORE setContracts,
    // so a contract touched only through the activity feed sorts to the top.
    const contracts = [
      dated({ id: 'stored', date: '2026-01-01', shipmentUpdatedAt: 5000 }),
      dated({ id: 'viaFeed', date: '2026-02-01', shipmentUpdatedAt: 0 }),
    ];
    const act = { viaFeed: 9000 };
    const got = filterShipmentRows(buildShipmentRows(contracts, {}, act, settings), {}).map((r) => r.id);
    expect(got).toEqual(['viaFeed', 'stored']);
    const webContracts = contracts.map((c) => ({
      ...c,
      shipmentUpdatedAt: Math.max(c.shipmentUpdatedAt || 0, (act as any)[c.id] || 0),
    }));
    expect(got).toEqual(webDefaultOrder(webContracts, settings, {}).map((c) => c.id));
  });
});

// ═════════════════════════════════════════════════════════════════════════════
describe('shipment — the invoice-loading window', () => {
  const fallback = { start: '2026-01-01', end: '2026-12-31' };

  it('spans January of the earliest linked invoice year to December of the latest', () => {
    // web page.js:314-324.
    const contracts = [
      makeContract({ id: 'a', invoices: [{ date: '2023-05-01' }, { date: '2026-02-01' }] }),
      makeContract({ id: 'b', invoices: [{ date: '2024-11-01' }] }),
    ];
    expect(shipmentInvoiceRange(contracts, fallback)).toEqual({ start: '2023-01-01', end: '2026-12-31' });
    const yrs = webInvYears(contracts);
    expect(shipmentInvoiceRange(contracts, fallback)).toEqual({
      start: `${yrs.reduce((a, b) => (a < b ? a : b))}-01-01`,
      end: `${yrs.reduce((a, b) => (a > b ? a : b))}-12-31`,
    });
  });

  it('falls back to the selected period when no contract has a linked invoice date', () => {
    // web page.js:325-327 — `else invoicesData = await loadData(..., dateSelect)`.
    expect(shipmentInvoiceRange([makeContract({ invoices: [] })], fallback)).toEqual(fallback);
    expect(webInvYears([makeContract({ invoices: [] })])).toHaveLength(0);
  });

  it('ANY non-empty 4-character date prefix counts as a year — implausible ones included', () => {
    // web page.js:315 takes `(inv.date || '').substring(0, 4)` and filters only on
    // truthiness. Sanity-checking the year here (e.g. dropping <= 2000) would shrink
    // the window BELOW web's and silently blank dates web still resolves.
    const contracts = [makeContract({ invoices: [{ date: '0001-01-01' }, { date: '2026-02-01' }] })];
    expect(shipmentInvoiceRange(contracts, fallback)).toEqual({ start: '0001-01-01', end: '2026-12-31' });
    expect(webInvYears(contracts)).toEqual(['0001', '2026']);
  });

  it('an empty date string contributes no year', () => {
    const contracts = [makeContract({ invoices: [{ date: '' }, { date: '2025-06-01' }] })];
    expect(shipmentInvoiceRange(contracts, fallback)).toEqual({ start: '2025-01-01', end: '2025-12-31' });
    expect(webInvYears(contracts)).toEqual(['2025']);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
describe('shipment — where a status change is written', () => {
  it('the write targets contracts_{contract.date}, not the dateRange', () => {
    // web page.js:493 passes `contract.date` to updateContractField, which derives
    // the year bucket from it. Preferring dateRange.startDate would target a
    // DIFFERENT bucket on any legacy contract where the two disagree, and the write
    // then silently fails.
    expect(webFnSource('app/(root)/shipment/page.js', 'handleStatusChange')).toContain(
      'updateContractField(uidCollection, contract.id, contract.date,'
    );
    const legacy = makeContract({ date: '2024-12-31', dateRange: { startDate: '2025-01-02' } });
    expect(shipmentWriteDate(legacy)).toBe('2024-12-31');
  });

  it('dateRange is only a last resort when the contract has no date at all', () => {
    expect(shipmentWriteDate({ date: '', dateRange: { startDate: '2025-01-02' } })).toBe('2025-01-02');
    expect(shipmentWriteDate({})).toBe('');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// CASHFLOW
// ═════════════════════════════════════════════════════════════════════════════

/** Mirror of app/(root)/cashflow/page.js:215-219 — the "Future / incoming" figure. */
const webIncoming = (marginsPerYear: any[][]) =>
  marginsPerYear.reduce(
    (total, dt) =>
      total +
      dt
        .filter((item: any) => !isNaN(item.remaining))
        .reduce((acc: number, item: any) => acc + (parseFloat(item.remaining) || 0), 0),
    0
  );

/** Mirror of app/(root)/cashflow/page.js:287-304 — Total (Left). */
const webTotalLeft = (p: {
  incoming: number;
  initialData: any[];
  stockData1: any[];
  stockData2: any[];
  clientInvoices1: any[];
  clientInvoices2: any[];
  financedLeft: any[];
}) =>
  p.incoming +
  p.initialData?.reduce((total, obj) => total + (parseFloat(obj.num) || 0), 0) +
  p.stockData1.reduce((total, obj) => total + (parseFloat(obj.total) || 0), 0) +
  p.stockData2.reduce((total, obj) => total + (parseFloat(obj.total) || 0), 0) +
  p.clientInvoices1.reduce((total, obj) => total + (parseFloat(obj.debtBlnc) || 0), 0) +
  p.clientInvoices2.reduce((total, obj) => total + (parseFloat(obj.debtBlnc) || 0), 0) +
  (Array.isArray(p.financedLeft) ? p.financedLeft.reduce((total, obj) => total + (parseFloat(obj.num) || 0), 0) : 0);

/** Mirror of app/(root)/cashflow/page.js:314-324 — Total (Right). */
const webTotalRight = (p: {
  supPayments1: any[];
  supPayments2: any[];
  expenses: any[];
  financedRight: any[];
}) =>
  p.supPayments1?.reduce((total, obj) => total + (parseFloat(obj.blnc) || 0), 0) +
  p.supPayments2?.reduce((total, obj) => total + (parseFloat(obj.blnc) || 0), 0) +
  p.expenses?.reduce((total, obj) => total + (parseFloat(obj.amount) || 0), 0) +
  (Array.isArray(p.financedRight)
    ? p.financedRight.reduce((total, obj) => total + (parseFloat(obj.num) || 0), 0)
    : 0);

/**
 * Mirror of cashflow/funcs.js:1655 getTotalsSupPayments — the ONLY place web
 * converts a supplier balance. Note the missing rate fallback, pinned below.
 */
const webSupBlnc = (item: any) =>
  item.cur === 'us' ? parseFloat(item.blnc) : parseFloat(String(item.blnc * item.euroToUSD));

describe('cashflow — web drift alarms', () => {
  const CF = 'app/(root)/cashflow/page.js';

  it("web's incoming figure has not drifted", () => expectWebUnchanged(CF, 'tmp', 'e5830119f799'));
  it("web's Total (Left) has not drifted", () => expectWebUnchanged(CF, 'total', 'ef1a8e305133'));

  it("web's Total (Right) has not drifted", () => {
    // Total (Right) is computed inside an ANONYMOUS useEffect, so it has no symbol
    // name — hashed as a source region between two anchors instead.
    expectRegionUnchanged(CF, 'let total =\n            supPayments1?.reduce', 'setTotalRight(total)', '15c9117b81fe');
  });

  it("web's Balance is still Total (Left) minus Total (Right)", () => {
    // JSX, not a function — page.js:1846-1849.
    expectRegionUnchanged(CF, 'Balance\n', 'value={totalLeft - totalRight}', '216c77e07d22');
  });

  it("web's supplier-balance currency conversion has not drifted", () =>
    expectWebUnchanged('app/(root)/cashflow/funcs.js', 'getTotalsSupPayments', 'b2d86479b057'));
});

describe('cashflow — the running-balance windows', () => {
  it('the two window widths are the ones web hardcodes, not a mobile choice', () => {
    // Without this the numbers below would be magic. Both widths are read straight
    // out of web:
    //   funcs.js:1097 runInvoices     → invoices  {start: `${invCurYr - 3}-01-01`}
    //   funcs.js:1583 runSupPayments  → contracts {start: `${supCurYr - 3}-01-01`}
    //   page.js:83    yr              → [currentYear - 1, currentYear] (expenses/stock)
    const funcs = repoFileText('app/(root)/cashflow/funcs.js');
    expect(funcs).toContain('{ start: `${invCurYr - 3}-01-01`, end: `${invCurYr}-12-31` }');
    expect(funcs).toContain('{ start: `${supCurYr - 3}-01-01`, end: `${supCurYr}-12-31` }');
    expect(repoFileText('app/(root)/cashflow/page.js')).toContain(
      'const [yr, setYr] = useState([currentYear - 1, currentYear])'
    );
  });

  it('receivables and payables look back 4 years, expenses and stock 2', () => {
    // web cashflow/page.js:83 `yr = [currentYear - 1, currentYear]` drives the 2-year
    // loads; the receivables/payables pipeline reaches back four (funcs.js:1097/1583).
    expect(cashflowYearRanges(2026)).toEqual({
      range4y: { start: '2023-01-01', end: '2026-12-31' },
      range2y: { start: '2025-01-01', end: '2026-12-31' },
    });
  });

  it('both windows end on 31 December of the anchor year, not on today', () => {
    // These are RUNNING balances: they are anchored on the real current year and are
    // deliberately independent of the selected period.
    const r = cashflowYearRanges(2030);
    expect(r.range4y.end).toBe('2030-12-31');
    expect(r.range2y.end).toBe('2030-12-31');
  });
});

describe('cashflow — the incoming (Future) figure', () => {
  it('sums the margins MONTH documents\' own remaining, already GIS-halved', () => {
    // web page.js:215-219 reduces over each YEAR's array of month docs and reads
    // `item.remaining` — the month-level field, which margins/page.js:484 writes as
    // `cur.gis ? cur.remaining / 2 : cur.remaining`. Summing items[].remaining raw
    // instead double-counts every GIS row.
    const months = [
      makeMarginMonth({ month: '01', remaining: 6 }),
      makeMarginMonth({ month: '02', remaining: 12.5 }),
    ];
    expect(sumMarginsRemaining(months)).toBe(18.5);
    expect(sumMarginsRemaining(months)).toBe(webIncoming([months]));
  });

  it('a month whose remaining is not a number is skipped, not treated as zero-and-counted', () => {
    // web page.js:217 — `.filter(item => !isNaN(item.remaining))`.
    const months = [
      makeMarginMonth({ month: '01', remaining: 10 }),
      makeMarginMonth({ month: '02', remaining: 'n/a' }),
      makeMarginMonth({ month: '03', remaining: undefined }),
    ];
    expect(sumMarginsRemaining(months)).toBe(10);
    expect(sumMarginsRemaining(months)).toBe(webIncoming([months]));
  });

  it('a numeric string remaining is parsed, and a blank one contributes zero', () => {
    // isNaN('') is false, so '' survives the filter and parseFloat('') || 0 gives 0.
    const months = [makeMarginMonth({ remaining: '7.25' }), makeMarginMonth({ remaining: '' })];
    expect(sumMarginsRemaining(months)).toBe(7.25);
    expect(sumMarginsRemaining(months)).toBe(webIncoming([months]));
  });

  it('years are summed together, not the latest year only', () => {
    // web reduces over marginsPerYear (one array per year in `yr`).
    const y1 = [makeMarginMonth({ remaining: 100 })];
    const y2 = [makeMarginMonth({ remaining: 50 })];
    expect(sumMarginsRemaining([...y1, ...y2])).toBe(webIncoming([y1, y2]));
    expect(sumMarginsRemaining([...y1, ...y2])).toBe(150);
  });

  it('no margins at all gives zero, never NaN', () => {
    expect(sumMarginsRemaining([])).toBe(0);
    expect(sumMarginsRemaining(undefined as any)).toBe(0);
  });
});

describe('cashflow — the manual entry rows', () => {
  it('a manual list contributes the sum of its num fields', () => {
    // web page.js:288-290 / 302 — `parseFloat(obj.num) || 0`.
    expect(sumManualEntries([{ num: '100' }, { num: 250.5 }, { num: 'x' }, {}])).toBe(350.5);
  });

  it('a missing or non-array manual list contributes zero, not NaN', () => {
    // web page.js:302 guards with Array.isArray for exactly this.
    expect(sumManualEntries(undefined)).toBe(0);
    expect(sumManualEntries({} as any)).toBe(0);
  });
});

describe('cashflow — the bottom line', () => {
  const settings = makeSettings();

  const world = (over?: Partial<Parameters<typeof computeCashflow>[0]>) =>
    computeCashflow({
      invoices: [],
      contracts4y: [],
      contracts2y: [],
      expenses: [],
      companyExpenses: [],
      margins: [],
      cashflowDoc: {},
      stocks: [],
      settings,
      ...(over || {}),
    });

  it('Total (Left) adds incoming, the initial cash, both stock blocks, receivables and financing', () => {
    // Mirror: web page.js:287-304. Every component is fed to the mirror in the row
    // shape web reduces over, so a dropped or clamped component fails here.
    const invoices = [
      makeInvoice({ id: 'i1', invoice: 1001, totalAmount: 12000, payments: [{ pmnt: '5000' }] }),
      makeInvoice({ id: 'i2', invoice: 1002, totalAmount: 4000, payments: [], client: 'cli-2' }),
    ];
    const margins = [makeMarginMonth({ remaining: 900 })];
    const cashflowDoc = { financed: { initial: [{ num: '2000' }], financedLeft: [{ num: '150' }] } };
    const d = world({ invoices, margins, cashflowDoc });

    expect(d.totalLeft).toBeCloseTo(
      webTotalLeft({
        incoming: d.incoming,
        initialData: [{ num: '2000' }],
        stockData1: d.stocksPaid.map((s) => ({ total: s.total })),
        stockData2: d.stocksUnpaid.map((s) => ({ total: s.total })),
        clientInvoices1: [{ debtBlnc: 7000 }],
        clientInvoices2: [{ debtBlnc: 4000 }],
        financedLeft: [{ num: '150' }],
      }),
      6
    );
    expect(d.totalLeft).toBeCloseTo(900 + 2000 + 0 + 0 + 7000 + 4000 + 150, 6);
  });

  /**
   * Regression guard added by the adversarial pass. The test above feeds the mirror
   * `d.stocksPaid` / `d.stocksUnpaid` — mobile's own output — and the fixture world has
   * NO stock, so both blocks were 0 and deleting them from Total (Left) left the suite
   * green. Here the two blocks are non-zero and every expected figure is derived from
   * the LOT (qnty × unitPrc), never read back off mobile.
   *
   * web page.js:291-294 adds stockData1 (Stocks - Paid) and stockData2 (Stocks - UnPaid)
   * into Total (Left); funcs.js:376-400 splits a netted row into UnPaid when its
   * purchase invoice has `pmnt === '0' | 0` and into Paid otherwise.
   */
  const stockWorld = () => {
    const paidLot = makeStockLot({
      id: 'lot-paid',
      invoice: 1001,
      stock: 'wh-1',
      description: 'prd-1',
      descriptionId: 'prd-1',
      qnty: '10',
      unitPrc: '1000',
      poInvoice: 'po-paid',
      productsData: [makeProduct({ id: 'prd-1', unitPrc: '1000' })],
      contractData: { id: 'con-1', order: 'PO-2026-001', date: '2026-03-15' },
    });
    const unpaidLot = makeStockLot({
      id: 'lot-unpaid',
      invoice: 1002,
      stock: 'wh-2',
      description: 'prd-2',
      descriptionId: 'prd-2',
      qnty: '5',
      unitPrc: '200',
      poInvoice: 'po-unpaid',
      productsData: [makeProduct({ id: 'prd-2', unitPrc: '200' })],
      contractData: { id: 'con-1', order: 'PO-2026-001', date: '2026-03-15' },
    });
    const contracts2y = [
      makeContract({
        id: 'con-1',
        productsData: [],
        stock: [],
        poInvoices: [
          makePoInvoice({ id: 'po-paid', pmnt: '10000' }),
          makePoInvoice({ id: 'po-unpaid', pmnt: '0' }),
        ],
      }),
    ];
    return { stocks: [paidLot, unpaidLot], contracts2y };
  };

  it('Total (Left) carries BOTH stock blocks — dropping either understates the left side', () => {
    const { stocks, contracts2y } = stockWorld();
    const d = world({ stocks, contracts2y });

    // Derived from the lots: 10 MT × $1,000 sits on a PAID purchase invoice,
    // 5 MT × $200 on one with pmnt '0'.
    expect(d.stocksPaidTotal).toBeCloseTo(10_000, 6);
    expect(d.stocksUnpaidTotal).toBeCloseTo(1_000, 6);
    expect(d.totalLeft).toBeCloseTo(11_000, 6);
    expect(d.totalLeft).toBeCloseTo(
      webTotalLeft({
        incoming: 0,
        initialData: [],
        stockData1: [{ total: 10_000 }], // web's Stocks - Paid roll-up
        stockData2: [{ total: 1_000 }], // web's Stocks - UnPaid roll-up
        clientInvoices1: [],
        clientInvoices2: [],
        financedLeft: [],
      }),
      6
    );
  });

  it('the paid/unpaid split follows the LIVE contract, not the lot\'s stale snapshot', () => {
    // web funcs.js:383-388 — `contractsData.find(...).poInvoices` is consulted FIRST,
    // because a lot's embedded poInvoices is a snapshot taken at breakdown-save time
    // and never refreshed when a payment lands (ELG 010726). The snapshot below still
    // says unpaid; the live contract says paid, and web believes the live contract.
    const { stocks, contracts2y } = stockWorld();
    const stale = stocks.map((l: any) =>
      l.id === 'lot-paid' ? { ...l, poInvoices: [{ id: 'po-paid', pmnt: '0' }] } : l
    );
    const d = world({ stocks: stale, contracts2y });
    expect(d.stocksPaidTotal).toBeCloseTo(10_000, 6);
    expect(d.stocksUnpaidTotal).toBeCloseTo(1_000, 6);
    // and the split itself must move when the LIVE invoice is unpaid
    const nowUnpaid = [
      makeContract({
        id: 'con-1',
        productsData: [],
        stock: [],
        poInvoices: [
          makePoInvoice({ id: 'po-paid', pmnt: '0' }),
          makePoInvoice({ id: 'po-unpaid', pmnt: '0' }),
        ],
      }),
    ];
    const d2 = world({ stocks, contracts2y: nowUnpaid });
    expect(d2.stocksPaidTotal).toBeCloseTo(0, 6);
    expect(d2.stocksUnpaidTotal).toBeCloseTo(11_000, 6);
    expect(d2.totalLeft).toBeCloseTo(11_000, 6); // the SUM is unchanged — only the block moves
  });

  it('a client credit balance REDUCES Total (Left) — a receivable is never clamped at zero', () => {
    // web funcs.js runInvoices keeps every row with |debtBlnc| > 0.011 REGARDLESS of
    // sign, and page.js:295-301 adds `parseFloat(obj.debtBlnc)` straight in. An
    // over-paid invoice therefore pulls Total (Left) DOWN. Clamping the balance at
    // zero would overstate the left side by the whole credit and hide the refund owed.
    const invoices = [
      makeInvoice({ id: 'over', invoice: 1001, totalAmount: 1000, payments: [{ pmnt: '1500' }] }),
    ];
    const d = world({ invoices });
    expect(d.receivablesByCur.us).toBeCloseTo(-500, 6);
    expect(d.totalLeft).toBeCloseTo(-500, 6);
    expect(d.totalLeft).toBeCloseTo(
      webTotalLeft({
        incoming: 0,
        initialData: [],
        stockData1: [],
        stockData2: [],
        clientInvoices1: [{ debtBlnc: -500 }],
        clientInvoices2: [],
        financedLeft: [],
      }),
      6
    );
    // and a credit nets against a debt rather than being dropped
    const mixed = world({
      invoices: [
        ...invoices,
        makeInvoice({ id: 'owed', invoice: 1002, totalAmount: 2000, payments: [], client: 'cli-2' }),
      ],
    });
    expect(mixed.totalLeft).toBeCloseTo(1_500, 6);
  });

  it('Total (Left) sums receivables ACROSS currencies — web does not convert them', () => {
    // web page.js:295-301 reduces clientInvoices1/2 on `debtBlnc` with no currency
    // handling, while getTotals (funcs.js:1164) aggregates per CLIENT, not per
    // currency. Mobile reproduces the page rather than fixing it.
    const invoices = [
      makeInvoice({ id: 'usd', invoice: 1001, cur: 'us', totalAmount: 1000, payments: [] }),
      makeInvoice({ id: 'eur', invoice: 1002, cur: 'eu', totalAmount: 500, payments: [], client: 'cli-2' }),
    ];
    const d = world({ invoices });
    expect(d.receivablesByCur).toEqual({ us: 1000, eu: 500 });
    expect(d.totalLeft).toBeCloseTo(1500, 6); // 500 EUR added to 1000 USD as if it were USD
    expect(d.totalLeft).toBeCloseTo(
      webTotalLeft({
        incoming: 0,
        initialData: [],
        stockData1: [],
        stockData2: [],
        clientInvoices1: [{ debtBlnc: 1000 }],
        clientInvoices2: [{ debtBlnc: 500 }],
        financedLeft: [],
      }),
      6
    );
  });

  it('Total (Right) adds supplier payables, unpaid expenses and right-hand financing', () => {
    // Mirror: web page.js:314-324.
    const contracts4y = [
      makeContract({
        id: 'c1',
        cur: 'us',
        poInvoices: [makePoInvoice({ id: 'p1', invValue: '10000', pmnt: '4000', blnc: '6000' })],
      }),
    ];
    const expenses = [makeExpense({ id: 'e1', amount: '1500', cur: 'us', paid: '222' })];
    const cashflowDoc = { financed: { financedRight: [{ num: '75' }] } };
    const d = world({ contracts4y, expenses, cashflowDoc });

    expect(d.totalRight).toBeCloseTo(
      webTotalRight({
        supPayments1: [{ blnc: webSupBlnc({ cur: 'us', blnc: '6000' }) }],
        supPayments2: [],
        expenses: [{ amount: 1500 }],
        financedRight: [{ num: '75' }],
      }),
      6
    );
    expect(d.totalRight).toBeCloseTo(6000 + 1500 + 75, 6);
  });

  it('a EUR supplier balance is converted at the contract rate before it joins Total (Right)', () => {
    // web funcs.js:1655 — `item.cur === 'us' ? parseFloat(blnc) : blnc * euroToUSD`.
    const contracts4y = [
      makeContract({
        id: 'c1',
        cur: 'eu',
        euroToUSD: 1.1,
        poInvoices: [makePoInvoice({ id: 'p1', blnc: '1000' })],
      }),
    ];
    const d = world({ contracts4y });
    expect(d.payablesUsd).toBeCloseTo(1100, 6);
    expect(d.payablesUsd).toBeCloseTo(webSupBlnc({ cur: 'eu', blnc: '1000', euroToUSD: 1.1 }), 6);
  });

  it('an unpaid EUR expense converts at the flat 1.08, not at the contract rate', () => {
    // web funcs.js runExpenses multiplies anything non-'us' by 1.08.
    const expenses = [makeExpense({ id: 'e1', amount: '1000', cur: 'eu', paid: '222' })];
    expect(world({ expenses }).expensesUsd).toBeCloseTo(1080, 6);
  });

  it('only expenses flagged unpaid reach Total (Right)', () => {
    // '222' is the unpaid sentinel; '111' (paid) and anything else contribute nothing.
    const expenses = [
      makeExpense({ id: 'e1', amount: '1000', paid: '222' }),
      makeExpense({ id: 'e2', amount: '9999', paid: '111' }),
      makeExpense({ id: 'e3', amount: '8888', paid: '' }),
    ];
    expect(world({ expenses }).expensesUsd).toBeCloseTo(1000, 6);
  });

  it('the same expense loaded from both collections is counted once', () => {
    const e = makeExpense({ id: 'dup', amount: '500', paid: '222' });
    expect(world({ expenses: [e], companyExpenses: [{ ...e }] }).expensesUsd).toBeCloseTo(500, 6);
  });

  it('draft purchase invoices and sub-cent residues never reach Total (Right)', () => {
    const contracts4y = [
      makeContract({
        id: 'c1',
        poInvoices: [
          makePoInvoice({ id: 'p1', blnc: '5000', draft: true }),
          makePoInvoice({ id: 'p2', blnc: '0.004' }),
          makePoInvoice({ id: 'p3', blnc: '250' }),
        ],
      }),
    ];
    expect(world({ contracts4y }).payablesUsd).toBeCloseTo(250, 6);
  });

  it('Balance is Total (Left) minus Total (Right), and is allowed to go negative', () => {
    // web page.js:1849 — `value={totalLeft - totalRight}`; NumericFormat is set
    // allowNegative, so the page never clamps it.
    const contracts4y = [
      makeContract({ id: 'c1', poInvoices: [makePoInvoice({ id: 'p1', blnc: '9000' })] }),
    ];
    const d = world({ contracts4y, margins: [makeMarginMonth({ remaining: 1000 })] });
    expect(d.balance).toBeCloseTo(d.totalLeft - d.totalRight, 6);
    expect(d.balance).toBeCloseTo(1000 - 9000, 6);
    expect(d.balance).toBeLessThan(0);
  });

  it('an empty world gives zeros on both sides rather than NaN', () => {
    const d = world();
    expect(d.totalLeft).toBe(0);
    expect(d.totalRight).toBe(0);
    expect(d.balance).toBe(0);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// FORMATTERS — mobile/src/lib/format.ts vs app/(root)/dashboard/page.js
// ═════════════════════════════════════════════════════════════════════════════

/** Mirror of app/(root)/dashboard/page.js:33-46 fmtMoney. */
const webFmtMoney = (n: any, decimals = 2) => {
  const num = typeof n === 'string' ? Number(n.replace(/[^0-9.-]+/g, '')) : Number(n);
  if (!Number.isFinite(num)) return (0).toFixed(decimals);
  return num.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
};

/** Mirror of app/(root)/dashboard/page.js:52-65 fmtAutoKM. */
const webFmtAutoKM = (n: any, decimals = 2) => {
  const num = Number(n);
  if (!Number.isFinite(num)) return '$0';
  if (Math.abs(num) >= 1_000_000) return `$${webFmtMoney(num / 1_000_000, decimals)}M`;
  if (Math.abs(num) >= 1_000) return `$${webFmtMoney(num / 1_000, decimals)}K`;
  return `$${webFmtMoney(num, decimals)}`;
};

/** Mirror of app/(root)/dashboard/page.js:234-241 fmtCurKM (ReceivablesSplitCard). */
const webFmtCurKM = (cur: string, n: any) => {
  const s = cur === 'us' ? '$' : cur === 'eu' ? '€' : '';
  const num = Number(n) || 0;
  const a = Math.abs(num);
  if (a >= 1e6) return `${s}${(num / 1e6).toFixed(2)}M`;
  if (a >= 1e3) return `${s}${(num / 1e3).toFixed(2)}K`;
  return `${s}${num.toFixed(2)}`;
};

/** Mirror of app/(root)/dashboard/page.js:576 fmtMT. */
const webFmtMT = (n: any) => `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n || 0)} MT`;

/** Mirror of components/CommentThread.js:16 initials (identical in ActivityLog.js:30). */
const webInitials = (name = '') =>
  name
    .toString()
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() || '')
    .join('') || '?';

describe('formatters — web drift alarms', () => {
  const DASH = 'app/(root)/dashboard/page.js';
  it("web's fmtMoney has not drifted", () => expectWebUnchanged(DASH, 'fmtMoney', 'dccf57912629'));
  it("web's fmtAutoKM has not drifted", () => expectWebUnchanged(DASH, 'fmtAutoKM', '7c8827acfaf0'));
  it("web's fmtCurKM has not drifted", () => expectWebUnchanged(DASH, 'fmtCurKM', '7a19beb4ac39'));
  it("web's fmtMT has not drifted", () => expectWebUnchanged(DASH, 'fmtMT', 'dd4799e102e0'));
  it("web's initials has not drifted", () =>
    expectWebUnchanged('components/CommentThread.js', 'initials', 'afecc7496c2a'));
});

describe('formatters — money', () => {
  const cases = [0, 1, 999.994, 999.995, 1000, -1234.5, 1_000_000, -2_500_000, 12345.678];

  it('money is grouped US-style with a fixed 2 decimals', () => {
    for (const n of cases) expect(fmtMoney(n)).toBe(webFmtMoney(n));
    expect(fmtMoney(1234.5)).toBe('1,234.50');
  });

  it('a formatted string is re-parsed by stripping everything but digits, dot and minus', () => {
    // web page.js:34-36 — `Number(n.replace(/[^0-9.-]+/g, ""))`.
    expect(fmtMoney('$1,234.50')).toBe(webFmtMoney('$1,234.50'));
    expect(fmtMoney('$1,234.50')).toBe('1,234.50');
  });

  it('a value that cannot be a number formats as 0.00, never as NaN', () => {
    // web page.js:38 — the !Number.isFinite guard returns (0).toFixed(decimals).
    for (const bad of ['abc', NaN, Infinity, -Infinity, null, undefined]) {
      expect(fmtMoney(bad as any)).toBe(webFmtMoney(bad));
    }
    expect(fmtMoney('abc')).toBe('0.00');
  });

  it('the decimals argument controls both the minimum and the maximum', () => {
    expect(fmtMoney(1234.5678, 0)).toBe(webFmtMoney(1234.5678, 0));
    expect(fmtMoney(1234.5678, 4)).toBe(webFmtMoney(1234.5678, 4));
  });
});

describe('formatters — compact $K / $M', () => {
  it('a thousand becomes K, a million becomes M, and smaller values stay plain', () => {
    // web page.js:52-64 — the thresholds are on the ABSOLUTE value.
    for (const n of [0, 999.99, 1000, -1000, 999_999, 1_000_000, -1_500_000, 2_450_000]) {
      expect(fmtAutoKM(n)).toBe(webFmtAutoKM(n));
    }
    expect(fmtAutoKM(1_500_000)).toBe('$1.50M');
    expect(fmtAutoKM(-1500)).toBe('$-1.50K');
    expect(fmtAutoKM(999.99)).toBe('$999.99');
  });

  it('a non-finite amount collapses to $0, not to $NaN', () => {
    for (const bad of [NaN, Infinity, 'abc', undefined]) {
      expect(fmtAutoKM(bad as any)).toBe(webFmtAutoKM(bad));
    }
    expect(fmtAutoKM(NaN)).toBe('$0');
  });

  it('the default symbol is the dollar web hardcodes', () => {
    // Mobile adds a `sym` parameter web does not have; its DEFAULT must reproduce web.
    expect(fmtAutoKM(2500)).toBe(webFmtAutoKM(2500));
    expect(fmtAutoKM(2500, 2, '€')).toBe('€2.50K'); // the added capability
  });
});

describe('formatters — per-currency compact amounts', () => {
  it('USD and EUR carry their symbol and are never summed together', () => {
    // web page.js:234-241 — the whole point of fmtCurKM is that it is per-currency.
    for (const n of [0, 12.5, 1500, -1500, 2_400_000]) {
      expect(fmtCurKM('us', n)).toBe(webFmtCurKM('us', n));
      expect(fmtCurKM('eu', n)).toBe(webFmtCurKM('eu', n));
    }
    expect(fmtCurKM('us', 1500)).toBe('$1.50K');
    expect(fmtCurKM('eu', 2_400_000)).toBe('€2.40M');
  });

  it('a non-numeric amount is zero, not NaN', () => {
    // web page.js:236 — `Number(n) || 0`.
    expect(fmtCurKM('us', 'abc' as any)).toBe(webFmtCurKM('us', 'abc'));
    expect(fmtCurKM('us', NaN)).toBe('$0.00');
  });
});

describe('formatters — tonnage', () => {
  it('MT is grouped and rounded to whole tonnes', () => {
    // web page.js:576 — maximumFractionDigits 0.
    for (const n of [0, 9.4, 9.5, 1234, 1234.6, -5.5]) expect(fmtMT(n)).toBe(webFmtMT(n));
    expect(fmtMT(1234.6)).toBe('1,235 MT');
  });

  it('a missing tonnage reads 0 MT', () => {
    // web page.js:576 — `format(n || 0)`.
    expect(fmtMT(undefined as any)).toBe(webFmtMT(undefined));
    expect(fmtMT(NaN)).toBe(webFmtMT(NaN));
    expect(fmtMT(undefined as any)).toBe('0 MT');
  });
});

describe('formatters — avatar initials', () => {
  it('two words give two letters, uppercased', () => {
    expect(initials('Northwind Steel')).toBe(webInitials('Northwind Steel'));
    expect(initials('Northwind Steel')).toBe('NS');
  });

  it('repeated separators do not eat a letter', () => {
    // The bug this suite found: splitting on a single space left an empty token, so
    // 'Acme  Metals' rendered as 'A'. Web filters empty tokens out.
    expect(initials('Acme  Metals')).toBe(webInitials('Acme  Metals'));
    expect(initials('Acme  Metals')).toBe('AM');
    expect(initials('  Acme Metals ')).toBe(webInitials('  Acme Metals '));
  });

  it('an address splits on @ and . the way web does', () => {
    expect(initials('zak.rehman@example.com')).toBe(webInitials('zak.rehman@example.com'));
    expect(initials('zak.rehman@example.com')).toBe('ZR');
  });

  it('an empty name still gets a glyph, never a blank avatar', () => {
    // web falls back to '?' (`.join('') || '?'`).
    expect(initials('')).toBe(webInitials(''));
    expect(initials('')).toBe('?');
    expect(initials(undefined as any)).toBe('?');
  });

  it('only the first two tokens are used', () => {
    expect(initials('Acme Metals Trading BV')).toBe(webInitials('Acme Metals Trading BV'));
    expect(initials('Acme Metals Trading BV')).toBe('AM');
  });
});

describe('formatters — currency symbols and legacy dates', () => {
  it('the dollar and euro ids resolve to their symbols in every stored spelling', () => {
    // Contracts store 'us'/'eu'; a FINALIZED invoice stores { id, cur: 'USD' }, and
    // several legacy rows carry the symbol itself (fixtures.ts makeFinalizedInvoice).
    for (const c of ['us', 'usd', 'USD', '$']) expect(curSymbol(c)).toBe('$');
    for (const c of ['eu', 'eur', 'EUR', '€']) expect(curSymbol(c)).toBe('€');
  });

  it('an unset currency falls back to the dollar, matching web\'s USD-default totals', () => {
    expect(curSymbol('')).toBe('$');
    expect(curSymbol(undefined)).toBe('$');
  });

  it('a legacy datepicker object renders its startDate, never "[object Object]"', () => {
    // Dates are stored either as an ISO string or as the picker's {startDate,endDate}.
    // Web always reads `.startDate` off the object (shipment page.js:335-336,
    // cashflow `con.dateRange?.startDate`); rendering the object crashes React Native.
    expect(dateLabel({ startDate: '2026-03-15', endDate: '2026-03-15' })).toBe('2026-03-15');
    expect(dateLabel({ startDate: null, endDate: '2026-03-16' })).toBe('2026-03-16');
    expect(dateLabel('2026-03-15T00:00:00.000Z')).toBe('2026-03-15');
    expect(dateLabel(null)).toBe('—');
    expect(dateLabel({})).toBe('—');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// WEIGHT ANALYSIS — mirrors of app/(root)/analysis/page.js @ git 065057f
// ═════════════════════════════════════════════════════════════════════════════

/**
 * mathjs `isNumber`, which web's analysis page imported: `typeof x === 'number'`.
 * NOT Number.isFinite — that difference is asserted below.
 */
const webIsNumber = (x: any) => typeof x === 'number';

/** Mirror of analysis/page.js@065057f:44-59 extractData. */
const webExtractData = (x: any, type: string) => {
  const elements: Record<string, number> = {};
  const regex = /(\d+(\.\d+)?)(Ni|Cr|Mo)/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(x)) !== null) {
    const [, value, , element] = match;
    if (type === '1111') elements['To' + element] = parseFloat(value);
    else elements['Back' + element] = parseFloat(value);
  }
  return elements;
};

/** Mirror of analysis/page.js@065057f:89-93 calc. */
const webCalc = (z: any): any =>
  isNaN(z) ? '' : webIsNumber(z) && z !== 0 ? z.toFixed(2) : webIsNumber(z) && z === 0 ? 0 : '';

/** Mirror of analysis/page.js@065057f:61-87 mergeObj. */
const webMergeObj = (data: any[]) => {
  const merged: any[] = [];
  let i = 0;
  let j = 0;
  const inv1111 = data.filter((item) => item.invType === '1111');
  const inv3333 = data.filter((item) => item.invType === '3333');
  while (i < inv1111.length && j < inv3333.length) {
    merged.push({
      ...inv1111[i],
      ...inv3333[j],
      invType: inv1111[i].invType + '/' + inv3333[j].invType,
      Toqnty: inv1111[i].qnty,
      Backqnty: inv3333[j].qnty,
      cert: inv1111[i].cert,
    });
    i++;
    j++;
  }
  return merged;
};

/** Mirror of utils/utils.js:123 groupedArrayInvoice — sorts the CALLER'S array in place. */
const webGroupedArrayInvoice = (arrD: any[]) =>
  arrD
    .sort((a, b) => a.invoice - b.invoice)
    .reduce<any[][]>((result, obj) => {
      const group = result.find((g) => g[0]?.invoice === obj.invoice);
      if (group) group.push(obj);
      else result.push([obj]);
      return result;
    }, []);

/** Mirror of utils/utils.js:143 sortArr. */
const webSortArr = (arr: any[], name: string) => {
  if (!Array.isArray(arr)) return [];
  return arr.sort((a, b) => {
    const A = a[name]?.toString()?.toLowerCase();
    const B = b[name]?.toString()?.toLowerCase();
    if (A < B) return -1;
    if (A > B) return 1;
    return 0;
  });
};

/** Mirror of analysis/page.js@065057f:95-141 calcAverage. */
const webCalcAverage = (arr: any[]) => {
  const grouped = arr
    .sort((a, b) => a.order - b.order)
    .reduce<any[][]>((result, obj) => {
      const group = result.find((g) => g[0]?.order === obj.order);
      if (group) group.push(obj);
      else result.push([obj]);
      return result;
    }, []);
  const calcAvg = (nums: any[]) => (nums.length ? webCalc(nums.reduce((acc, n) => acc + n * 1, 0) / nums.length) : 0);
  const calcSum = (nums: any[]) => (nums.length ? webCalc(nums.reduce((acc, n) => acc + n * 1, 0)) : 0);
  const pick = (g: any[], k: string) => g.map((x) => x[k]).filter((item) => item !== null && item !== undefined);
  return grouped
    .map((group) =>
      group.length > 1
        ? [
            ...group,
            {
              cert: 'Average',
              order: group[0].order,
              ToNi: calcAvg(pick(group, 'ToNi')),
              ToCr: calcAvg(pick(group, 'ToCr')),
              ToMo: calcAvg(pick(group, 'ToMo')),
              BackNi: calcAvg(pick(group, 'BackNi')),
              BackCr: calcAvg(pick(group, 'BackCr')),
              BackMo: calcAvg(pick(group, 'BackMo')),
              Toqnty: calcSum(pick(group, 'Toqnty')),
              Backqnty: calcSum(pick(group, 'Backqnty')),
              date: group[0].date,
              invoice: '',
              supplier: group[0].supplier,
              diffCr: '',
              diffMo: '',
              diffNi: '',
              diffqnty: '',
            },
          ]
        : group
    )
    .flat();
};

/** Mirror of analysis/page.js@065057f:186-233 createData. */
const webCreateData = (arr: any[]) => {
  const newArr: any[] = [];
  arr.forEach((obj) => {
    const order = obj.order;
    const date = obj.date;
    obj.invoicesData.forEach((z: any) => {
      let tempObj: any = { invoice: z.invoice, invType: z.invType, order, date };
      z.productsDataInvoice.forEach((q: any) => {
        const desc =
          q.descriptionText === ''
            ? obj.productsData.find((x: any) => x.id === q.descriptionId)?.description
            : q.descriptionText;
        tempObj = { ...tempObj, ...webExtractData(desc, z.invType), descriptionText: desc, qnty: q.qnty, cert: q.cert ?? '' };
        newArr.push(tempObj);
      });
    });
  });
  const newArr1: any[] = [];
  webGroupedArrayInvoice(newArr).forEach((z) => newArr1.push(webMergeObj(z)));
  let flatArr = newArr1.flat();
  flatArr = flatArr.map((z: any) => ({
    ...z,
    diffNi: webCalc(z.BackNi - z.ToNi),
    diffCr: webCalc(z.BackCr - z.ToCr),
    diffMo: webCalc(z.BackMo - z.ToMo),
    diffqnty: webCalc(z.Backqnty - z.Toqnty),
  }));
  return webSortArr(webCalcAverage(flatArr), 'date');
};

describe('weight analysis — drift alarms', () => {
  it("web's /analysis is still the gutted HEAD version the mobile port routes around", () => {
    // mobile/src/features/analysis/weightAnalysis.ts is ported from git 065057f
    // because commit 75eaf3f deleted web's whole transformation pipeline. If web
    // ever restores it, this fails — and the port must be re-diffed against the
    // restored code rather than against a two-year-old revision.
    const text = repoFileText('app/(root)/analysis/page.js');
    expect(text).toContain('// ...data transformation logic here...');
    expect(text).not.toContain('const extractData');
    expect(text).not.toContain('const calcAverage');
  });

  it("web's groupedArrayInvoice has not drifted", () =>
    expectWebUnchanged('utils/utils.js', 'groupedArrayInvoice', 'a2e5f7fadd86'));
  it("web's sortArr has not drifted", () => expectWebUnchanged('utils/utils.js', 'sortArr', '9c686eb8a0e8'));
});

describe('weight analysis — assay extraction', () => {
  it('an original invoice fills the contracted (To) columns, anything else the returned (Back) ones', () => {
    // web@065057f extractData — the regex captures `<number><Ni|Cr|Mo>`.
    const desc = '8.5Ni 18.2Cr 2Mo scrap';
    expect(extractData(desc, '1111')).toEqual(webExtractData(desc, '1111'));
    expect(extractData(desc, '1111')).toEqual({ ToNi: 8.5, ToCr: 18.2, ToMo: 2 });
    expect(extractData(desc, '3333')).toEqual(webExtractData(desc, '3333'));
    expect(extractData(desc, '3333')).toEqual({ BackNi: 8.5, BackCr: 18.2, BackMo: 2 });
  });

  it('a description with no assay figures yields no columns', () => {
    expect(extractData('Mixed turnings', '1111')).toEqual(webExtractData('Mixed turnings', '1111'));
    expect(extractData('Mixed turnings', '1111')).toEqual({});
  });

  it('a repeated element keeps the LAST occurrence', () => {
    // Plain object assignment, no de-duplication, in both copies.
    expect(extractData('8Ni 9Ni', '1111')).toEqual(webExtractData('8Ni 9Ni', '1111'));
    expect(extractData('8Ni 9Ni', '1111')).toEqual({ ToNi: 9 });
  });

  it('a missing description yields no columns rather than throwing', () => {
    // Web relies on `regex.exec(undefined)` stringifying to "undefined"; mobile
    // stringifies explicitly. Same result, no crash either way.
    expect(extractData(undefined as any, '1111')).toEqual(webExtractData(undefined, '1111'));
    expect(extractData(undefined as any, '1111')).toEqual({});
  });
});

describe('weight analysis — cell formatting', () => {
  it('a numeric difference prints to 2 decimals', () => {
    for (const n of [1.234, -0.5, 12]) expect(calc(n)).toBe(webCalc(n));
    expect(calc(1.234)).toBe('1.23');
  });

  it('an exact zero prints as the number 0, not as "0.00"', () => {
    // web@065057f calc's third branch returns the literal 0. The table renders a
    // bare 0 for "no difference" and a blank for "not comparable" — different cells.
    expect(calc(0)).toBe(webCalc(0));
    expect(calc(0)).toBe(0);
  });

  it('a non-comparable value prints blank, not NaN', () => {
    expect(calc(NaN)).toBe(webCalc(NaN));
    expect(calc(undefined as any)).toBe(webCalc(undefined));
    expect(calc(NaN)).toBe('');
  });

  it('a numeric STRING prints blank — only real numbers are formatted', () => {
    // isNaN('5') is false so it passes the first guard, but isNumber('5') is false,
    // so it falls through every branch to ''.
    expect(calc('5')).toBe(webCalc('5'));
    expect(calc('5')).toBe('');
  });
});

describe('weight analysis — pairing originals with final notes', () => {
  const rows = [
    { invType: '1111', qnty: '10', cert: 'C-1', ToNi: 8 },
    { invType: '3333', qnty: '9.6', cert: 'C-9', BackNi: 8.2 },
  ];

  it('an original and a final note merge into one line, positionally', () => {
    expect(mergeObj(rows)).toEqual(webMergeObj(rows));
    expect(mergeObj(rows)[0]).toMatchObject({ invType: '1111/3333', Toqnty: '10', Backqnty: '9.6' });
  });

  it('the merged line keeps the ORIGINAL certificate, not the final note\'s', () => {
    // web@065057f mergeObj spreads inv3333 last but then re-assigns cert from inv1111.
    expect(mergeObj(rows)[0].cert).toBe('C-1');
    expect(mergeObj(rows)[0].cert).toBe(webMergeObj(rows)[0].cert);
  });

  it('an unmatched original is dropped by the merge', () => {
    // The while loop stops as soon as either list runs out — a PO with no final note
    // yet produces no merged line at all.
    const only = [{ invType: '1111', qnty: '10', cert: 'C-1' }];
    expect(mergeObj(only)).toEqual(webMergeObj(only));
    expect(mergeObj(only)).toEqual([]);
  });

  it('a credit note takes no part in the pairing', () => {
    const withCn = [...rows, { invType: '2222', qnty: '-1', cert: 'C-2' }];
    expect(mergeObj(withCn)).toEqual(webMergeObj(withCn));
    expect(mergeObj(withCn)).toHaveLength(1);
  });
});

describe('weight analysis — grouping by invoice number', () => {
  it('rows sharing an invoice number end up in one group, ordered by number', () => {
    const rows = () => [{ invoice: 1002, id: 'b' }, { invoice: 1001, id: 'a' }, { invoice: 1002, id: 'c' }];
    expect(mobileGroupedArrayInvoice(rows())).toEqual(webGroupedArrayInvoice(rows()));
    expect(mobileGroupedArrayInvoice(rows()).map((g) => g.map((r: any) => r.id))).toEqual([['a'], ['b', 'c']]);
  });

  it('grouping does not reorder the caller\'s array', () => {
    // DIVERGENCE (mobile is safer): web's groupedArrayInvoice sorts arrD IN PLACE
    // (utils/utils.js:125), silently reordering whatever the caller still holds.
    // Mobile copies first. The GROUPS are identical either way.
    const input = [{ invoice: 1002, id: 'b' }, { invoice: 1001, id: 'a' }];
    const webInput = [{ invoice: 1002, id: 'b' }, { invoice: 1001, id: 'a' }];
    mobileGroupedArrayInvoice(input);
    webGroupedArrayInvoice(webInput);
    expect(input.map((r) => r.id)).toEqual(['b', 'a']); // untouched
    expect(webInput.map((r) => r.id)).toEqual(['a', 'b']); // web mutated it
  });
});

describe('weight analysis — the per-PO Average row', () => {
  const group = [
    { order: 'PO-1', date: '2026-01-01', ToNi: 8, BackNi: 8.4, Toqnty: 10, Backqnty: 9.8 },
    { order: 'PO-1', date: '2026-01-01', ToNi: 9, BackNi: 8.6, Toqnty: 20, Backqnty: 20.2 },
  ];

  it('assays are averaged while weights are SUMMED', () => {
    const mob = calcAverage(group.map((g) => ({ ...g })));
    const web = webCalcAverage(group.map((g) => ({ ...g })));
    const mobAvg = mob.find((r: any) => r.cert === 'Average');
    const webAvg = web.find((r: any) => r.cert === 'Average');
    expect(mobAvg.ToNi).toBe(webAvg.ToNi);
    expect(mobAvg.ToNi).toBe('8.50');
    expect(mobAvg.Toqnty).toBe(webAvg.Toqnty);
    expect(mobAvg.Toqnty).toBe('30.00');
    expect(mobAvg.Backqnty).toBe('30.00');
  });

  it('a PO with a single line gets no Average row', () => {
    // web@065057f calcAverage — `group.length > 1 ? [...] : group`.
    const one = [{ order: 'PO-9', date: '2026-01-01', ToNi: 8 }];
    expect(calcAverage(one.map((g) => ({ ...g })))).toHaveLength(1);
    expect(webCalcAverage(one.map((g) => ({ ...g })))).toHaveLength(1);
  });

  it('the Average row carries no difference figures', () => {
    // web@065057f writes diffNi/diffCr/diffMo/diffqnty as '' on the synthetic row.
    const avg = calcAverage(group.map((g) => ({ ...g }))).find((r: any) => r.cert === 'Average');
    expect([avg.diffNi, avg.diffCr, avg.diffMo, avg.diffqnty]).toEqual(['', '', '', '']);
  });

  it('an element nobody reported averages to 0 rather than NaN', () => {
    // web@065057f calculateAverage returns the literal 0 for an empty list.
    const avg = calcAverage(group.map((g) => ({ ...g }))).find((r: any) => r.cert === 'Average');
    expect(avg.ToMo).toBe(0);
    expect(avg.ToMo).toBe(webCalcAverage(group.map((g) => ({ ...g }))).find((r: any) => r.cert === 'Average').ToMo);
  });
});

describe('weight analysis — the whole report', () => {
  const contracts = () => [
    {
      order: 'PO-2026-001',
      date: '2026-03-15',
      productsData: [{ id: 'prd-1', description: '8.5Ni 18.2Cr scrap' }],
      invoicesData: [
        {
          invoice: 1001,
          invType: '1111',
          productsDataInvoice: [{ descriptionId: 'prd-1', descriptionText: '', qnty: '10', cert: 'C-1' }],
        },
        {
          invoice: 1001,
          invType: '3333',
          productsDataInvoice: [{ descriptionId: 'prd-1', descriptionText: '8.7Ni 18.0Cr scrap', qnty: '9.8', cert: 'C-2' }],
        },
      ],
    },
  ];

  it('the report reproduces web\'s pipeline end to end', () => {
    expect(createWeightRows(contracts())).toEqual(webCreateData(contracts()));
  });

  it('a blank line description falls back to the contract product description', () => {
    // web@065057f createData:207 — `q.descriptionText === '' ? productsData.find(...)`.
    const rows = createWeightRows(contracts());
    expect(rows[0].ToNi).toBe(8.5);
    expect(rows[0].ToCr).toBe(18.2);
  });

  it('the difference columns are Back minus To', () => {
    const rows = createWeightRows(contracts());
    expect(rows[0].diffNi).toBe(webCalc(8.7 - 8.5));
    expect(rows[0].diffNi).toBe('0.20');
    expect(rows[0].diffqnty).toBe(webCalc(9.8 - 10));
  });

  it('rows come out ordered by contract date', () => {
    const two = [
      { ...contracts()[0], order: 'PO-B', date: '2026-05-01' },
      { ...contracts()[0], order: 'PO-A', date: '2026-01-01' },
    ];
    expect(createWeightRows(two).map((r: any) => r.date)).toEqual(
      webCreateData(two.map((c) => ({ ...c }))).map((r: any) => r.date)
    );
    expect(createWeightRows(two).map((r: any) => r.date)).toEqual(['2026-01-01', '2026-05-01']);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// TIER 4 — the intentional divergence register for this domain
// ═════════════════════════════════════════════════════════════════════════════
describe('TIER 4 — intentional divergences', () => {
  it('mobile fmtCurKM labels an UNKNOWN currency; web drops the symbol entirely', () => {
    // web dashboard page.js:235 — `cur === 'us' ? '$' : cur === 'eu' ? '€' : ''`, so an
    // unrecognised currency renders a bare number that reads as dollars. Mobile's
    // curSymbol emits `'<code> '` instead, because a mobile row can be scrolled far
    // from any currency heading. Deliberate; the 'us'/'eu' cases are identical.
    expect(webFmtCurKM('gbp', 1500)).toBe('1.50K');
    expect(fmtCurKM('gbp', 1500)).toBe('gbp 1.50K');
    expect(fmtCurKM('us', 1500)).toBe(webFmtCurKM('us', 1500));
    expect(fmtCurKM('eu', 1500)).toBe(webFmtCurKM('eu', 1500));
  });

  it('mobile fmtCurKM defaults an EMPTY currency to $; web prints no symbol', () => {
    expect(webFmtCurKM('', 1500)).toBe('1.50K');
    expect(fmtCurKM('', 1500)).toBe('$1.50K');
  });

  it('mobile calc() is finite-guarded where web\'s mathjs isNumber is not', () => {
    // web imported `isNumber` from mathjs — `typeof x === 'number'`, which is TRUE for
    // Infinity, so web prints the literal 'Infinity' in an assay cell. Mobile's isNum
    // adds Number.isFinite and blanks it, matching every other "not comparable" cell.
    expect(webCalc(Infinity)).toBe('Infinity');
    expect(calc(Infinity)).toBe('');
    expect(webCalc(-Infinity)).toBe('-Infinity');
    expect(calc(-Infinity)).toBe('');
  });

  it('mobile groups rows with a MISSING invoice number deterministically; web produces a NaN comparator', () => {
    // web utils.js:126 `a.invoice - b.invoice` is NaN when either side is undefined,
    // which leaves the pair in engine-defined order. Mobile coerces the missing side
    // to 0 so the grouping is reproducible run to run.
    const input = [{ invoice: undefined, id: 'x' }, { invoice: 1001, id: 'a' }];
    expect(mobileGroupedArrayInvoice(input).map((g) => g[0].id)).toEqual(['x', 'a']);
    expect(webFnSource('utils/utils.js', 'groupedArrayInvoice')).toContain('a.invoice - b.invoice');
  });

  it('mobile sorts rows with NO date to the front; web leaves them where they were', () => {
    // web utils.js:152-155 compares `a[name]?.toString()` — undefined vs a string makes
    // every comparison false, so sortArr returns 0 and the row keeps its position.
    // Mobile treats a missing date as '' and therefore orders it, giving a stable
    // total order instead of one that depends on the input sequence.
    //
    // The mobile half runs mobile's REAL pipeline (createWeightRows' own final sort);
    // re-implementing the comparator here would only have compared the test to itself.
    const pair = (order: string, date: any, invoice: number) => ({
      order,
      date,
      productsData: [{ id: 'prd-1', description: '8Ni' }],
      invoicesData: [
        {
          invoice,
          invType: '1111',
          productsDataInvoice: [{ descriptionId: 'prd-1', descriptionText: '', qnty: '10', cert: 'C' }],
        },
        {
          invoice,
          invType: '3333',
          productsDataInvoice: [{ descriptionId: 'prd-1', descriptionText: '8Ni', qnty: '10', cert: 'C' }],
        },
      ],
    });
    const contracts = [pair('PO-MAY', '2026-05-01', 5001), pair('PO-NONE', undefined, 5002), pair('PO-JAN', '2026-01-01', 5003)];

    expect(createWeightRows(contracts).map((r: any) => r.order)).toEqual(['PO-NONE', 'PO-JAN', 'PO-MAY']);

    // Web, on the same three rows, leaves the undated one exactly where it arrived.
    const webRows = [
      { date: '2026-05-01', order: 'PO-MAY' },
      { date: undefined, order: 'PO-NONE' },
      { date: '2026-01-01', order: 'PO-JAN' },
    ];
    expect(webSortArr(webRows.map((r) => ({ ...r })), 'date').map((r) => r.order)).toEqual([
      'PO-MAY',
      'PO-NONE',
      'PO-JAN',
    ]);

    // PARITY, not divergence, once every row HAS a date: both put January first.
    const dated = contracts.filter((c) => c.date);
    expect(createWeightRows(dated).map((r: any) => r.order)).toEqual(['PO-JAN', 'PO-MAY']);
    expect(
      webSortArr(webRows.filter((r) => r.date).map((r) => ({ ...r })), 'date').map((r) => r.order)
    ).toEqual(['PO-JAN', 'PO-MAY']);
  });

  it('mobile falls back to a 1.08 EUR rate where web produces NaN', () => {
    // web funcs.js:1655 does `blnc * item.euroToUSD` with no guard, so a EUR contract
    // missing euroToUSD poisons Total (Right) into NaN and the page shows nothing.
    // Mobile falls back to the same 1.08 the expenses side uses.
    expect(webSupBlnc({ cur: 'eu', blnc: '1000', euroToUSD: undefined })).toBeNaN();
    const d = computeCashflow({
      invoices: [],
      contracts4y: [makeContract({ cur: 'eu', euroToUSD: undefined, poInvoices: [makePoInvoice({ blnc: '1000' })] })],
      contracts2y: [],
      expenses: [],
      companyExpenses: [],
      margins: [],
      cashflowDoc: {},
      stocks: [],
      settings: makeSettings(),
    });
    expect(d.payablesUsd).toBeCloseTo(1080, 6);
    expect(Number.isFinite(d.totalRight)).toBe(true);
  });

  it('the shipment filter tokens differ in SHAPE but never in selection', () => {
    // Registered here rather than buried in the filtering block: web's dropdowns store
    // ids (supplier id, client id, ship-type id) because they are rendered from
    // `uniqueSupplierIds` etc. (page.js:588-590); mobile's chips are rendered from
    // shipmentFilterOptions and therefore carry names/labels. The filtering block above
    // asserts the two select the same contracts.
    const settings = shipSettings();
    const contracts = [makeContract({ id: 'c1', supplier: 'sup-1', shpType: '323' })];
    const rows = buildShipmentRows(contracts, {}, {}, settings);
    expect(shipmentFilterOptions(rows)).toEqual({
      suppliers: ['Acme Metals'],
      clients: [],
      shipTypes: ['Container'],
    });
    expect(webFnSource('app/(root)/shipment/page.js', 'filtered')).toContain('c.supplier === supplierFilter');
  });

  it('mobile fmtShipDate returns the placeholder itself where web returns null', () => {
    // web fmtDate returns null and the DateCell renders `display || '—'` (page.js:110).
    // Mobile has no such wrapper, so the fallback lives in the formatter. Same pixels.
    expect(webFmtDate('')).toBeNull();
    expect(fmtShipDate('')).toBe('—');
  });
});

// A tiny guard so the invoice-product builder stays imported and the fixture shapes
// used above keep matching the ones every other suite builds from.
describe('fixtures sanity', () => {
  it('the invoice product line still carries the fields the weight report reads', () => {
    const p = makeInvoiceProduct();
    expect(p).toHaveProperty('descriptionId');
    expect(p).toHaveProperty('qnty');
  });
});
