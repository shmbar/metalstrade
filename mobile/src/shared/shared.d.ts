// Ambient typings for the verbatim-ported pure JS business-logic modules.
// The .js files are copied unchanged from the web app (utils/) so the financial
// math is provably identical; these declarations give call sites type safety
// without touching the source of truth.

declare module '@shared/pureHelpers' {
  export function toIsoDate(s: string | null | undefined): string | null;
  export function resolveDueDate(inv: any): string | null;
  export function resolveInvoiceDate(inv: any): string | null;
  export function groupInvoicesByNumber(invoices: any[]): any[];
  export interface StockNetRow {
    description: string;
    qnty: number;
    unit: string;
    warehouse: string;
  }
  export function computeStockNetSummary(stockDocs: any[], settings: any): StockNetRow[];
}

declare module '@shared/finance' {
  export const FINALIZED_FLAG: string;
  export const DEFAULT_TERM_DAYS: number;
  export const UNIT_TO_MT: Record<string, number>;
  export function num(v: unknown): number;
  export function resolveCur(entity: any): 'us' | 'eu';
  export function invoicePaid(inv: any): number;
  export function invoiceBalance(inv: any): number;
  export function isIssued(inv: any): boolean;
  export function isFinalNote(inv: any): boolean;
  export function isFinalized(inv: any): boolean;
  export function effectiveDueDate(inv: any, termDays?: number): string | null;
  export function isOverdue(inv: any, asOf?: Date, termDays?: number): boolean;
  export function fx(amount: number, cur: string, rate: number, base?: string): number;
  export function unitOf(contract: any, settings: any): string;
  export function toMT(qty: number, contract: any, settings: any): number;
  export function settledInQty(lot: any): number;
  export function settlementReduction(lots: any[]): number;
  export function groupInvoices(list: any[]): any[];
  export function invoiceRevenue(
    list: any[],
    opts?: { base?: string; rateOf?: (inv: any) => number }
  ): { byCur: Record<string, number>; base: number };

  export interface ReceivablesSlot {
    due: number;
    balance: number;
    finalized: number;
    provisional: number;
    dueCount: number;
    balanceCount: number;
    finalizedCount: number;
    provisionalCount: number;
  }
  export function receivables(
    list: any[],
    opts?: { asOf?: Date; termDays?: number }
  ): { byCur: Record<string, ReceivablesSlot> };

  export interface AgingBucket {
    label: string;
    maxDays: number;
    byCur: Record<string, number>;
    count: number;
  }
  export function agingBuckets(list: any[], opts?: { asOf?: Date }): AgingBucket[];
  export function contractPurchaseValue(
    contract: any,
    opts?: { base?: string }
  ): { byCur: Record<string, number>; base: number };
  export function pnl(args?: { revenue?: number; cost?: number; expense?: number }): {
    revenue: number;
    cost: number;
    expense: number;
    profit: number;
  };
  export { resolveDueDate, resolveInvoiceDate, toIsoDate } from '@shared/pureHelpers';
}

declare module '@shared/splitUtils' {
  export const SPLIT_DEFAULT_RATIO: number;
  export function splitStatusOf(row: any): 'none' | 'pending' | 'done';
  export function computeShares(
    amount: number,
    ratioToIms?: number
  ): { imsShare: number; gisShare: number };
  export function splitNotifId(entityType: string, entityId: string): string;
  export function curSymbol(cur: string): string;
}

declare module '@shared/fxRates' {
  export function getRates(base?: string): Promise<Record<string, number>>;
  export function convert(
    amount: number,
    fromCur: string,
    toBase: string,
    rates: Record<string, number>
  ): number;
}

declare module '@shared/languages' {
  export function getTtl(key: string, ln?: string): string;
  const _default: any;
  export default _default;
}

declare module '@shared/notificationPriority' {
  export interface PriorityToken {
    key: string;
    rank: number;
    label: string;
    color: string;
    bg: string;
    border: string;
  }
  export const PRIORITY: Record<'high' | 'medium' | 'low', PriorityToken>;
  export const PRIORITY_ORDER: ('high' | 'medium' | 'low')[];
  export function priorityOf(n?: any): 'high' | 'medium' | 'low';
  export function priorityRank(n: any): number;
  export function sortByPriority<T>(arr?: T[]): T[];
}

declare module '@shared/notificationRouting' {
  export function routeFor(entityType: string, entityId: string): string;
}

declare module '@shared/shipmentStatus' {
  export const SHIPMENT_STATUSES: string[];
  export function normalizeStatus(s: string | undefined | null): string;
  export const SHIPMENT_STATUS_STYLES: Record<string, any>;
  export function hasShipmentStatus(s: string | undefined | null): boolean;
}

declare module '@shared/soldStatus' {
  export function lotIsSold(lot?: any): boolean;
  export function rollupTone(soldQty: number, basisQty: number): 'none' | 'unsold' | 'partial' | 'sold';
  export function computeLineSold(args: { contractQty?: number; shippedQty?: number; lots?: any[] }): {
    tone: string;
    soldQty: number;
    receivedQty: number;
    shippedQty: number;
  };
  export function aggregateRollups(rollups?: any[]): { tone: string; soldQty: number; receivedQty: number; shippedQty: number };
  export function lineStatus(args?: { shipmentStatus?: string; rollup?: any }): { key: string; label: string; isShipment: boolean };
}

declare module '@shared/salesLink' {
  export function lineQty(row?: any): number;
  export function lineSalesContractId(inv?: any, row?: any): string;
  export function salesContractIdsOf(inv?: any): string[];
  export function invoiceQtyBySalesContract(inv?: any): Record<string, number>;
  export function invoiceQtyForSalesContract(inv?: any, salesContractId?: string): number;
  export function invoiceLinksSalesContract(inv?: any, salesContractId?: string): boolean;
  export function salesContractLabel(sc?: any, clients?: any[]): string;
  export function withSalesContractLabels<T = any>(list?: T[], clients?: any[]): (T & { scLabel: string })[];
}

declare module '@shared/storageUtils' {
  export const STORAGE_LABELS: string[];
  export const EUR_USD: number;
  export const UNIT: { key: string; label: string; factor: number }[];
  export function toUsd(amt: number, cur: string): number;
  export function ym(s: string | undefined | null): string;
  export function arrivalStr(lot: any): string;
  export function isStorageType(exp: any, expTypes?: any[]): boolean;
  export function mtInWh(lots: any[], whId: string, month: string): number;
  export interface StorageRow {
    wh: string;
    name: string;
    cost: number;
    mt: number;
    rate: number | null;
  }
  export function computeStorageMetric(args: {
    tagged?: any[];
    lots?: any[];
    whName?: (id: string) => string;
  }): { rows: StorageRow[]; totalCost: number; totalMt: number; overall: number | null };
}

declare module '@shared/permissions' {
  export interface RoleMeta {
    key: 'superadmin' | 'admin' | 'user' | 'accounting';
    label: string;
    rank: number;
    blurb: string;
  }
  export const ROLES: RoleMeta[];
  export function normalizeRole(value: unknown): RoleMeta['key'];
  export function roleMeta(role: unknown): RoleMeta;
  export function roleLabel(role: unknown): string;
  export function roleRank(role: unknown): number;
  export function isSuperAdmin(claims?: Record<string, any>, uid?: string): boolean;
  export function canManageUsers(claims?: Record<string, any>, uid?: string): boolean;
  export function isProtectedAccount(targetUid?: string, targetClaims?: Record<string, any>): boolean;
  export function canManageRole(actorClaims: Record<string, any>, targetRole: unknown, actorUid?: string): boolean;
  export function assignableRoles(actorClaims: Record<string, any>, actorUid?: string): RoleMeta[];
}

declare module '@shared/activityStats' {
  export const DAY_MS: number;
  export const WEEK_MS: number;
  export const LOGIN_TYPE: string;
  export const LOGOUT_TYPE: string;
  export function startOfWeek(ms?: number): number;
  export function startOfDay(ms?: number): number;
  export function activityLeaderboard(
    rows?: any[],
    opts?: { from?: number; to?: number }
  ): { uid: string; name: string; count: number; share: number }[];
  export function weeklyBreakdown(
    rows?: any[],
    opts?: { weeks?: number; now?: number }
  ): { weekStart: number; label: string; total: number; byUser: Record<string, number> }[];
  export function loginCounts(
    rows?: any[],
    opts?: { from?: number; to?: number }
  ): { uid: string; name: string; logins: number }[];
  /** Earliest createdAtMs in the pool — null when the window predates the feature. */
  export function coverageFrom(rows?: any[], type?: string | null): number | null;
  export function splitPresence(
    presence?: any[],
    opts?: { onlineMs?: number; now?: number }
  ): { online: any[]; away: any[] };
}

declare module '@shared/search' {
  /** The query as keywords: lower-cased, accent-stripped, empty when blank. */
  export function searchWords(query: string | null | undefined): string[];
  /** Every keyword in `query` appears somewhere in `fields`. Blank query = match. */
  export function matchesAllWords(fields: any, query: string | string[] | null | undefined): boolean;
  const _default: typeof matchesAllWords;
  export default _default;
}

declare module '@shared/gradeKey' {
  /** Folds spelling variants of one grade onto a common key. */
  export function gradeKeyOf(description: string): { key: string; label: string; ni: number | null };
  export function niRangeLabel(values: (number | null)[]): string;
  export function gradeLabel(synthesised: string | null, originals: string[]): string;
}

declare module '@shared/grades' {
  export interface Grade {
    id: string;
    name: string;
    spec?: string;
    aliases?: string[];
    lineIds?: string[];
    deleted?: boolean;
  }
  export interface GradeIndex {
    byAlias: Map<string, Grade>;
    byLine: Map<string, Grade>;
    byId: Map<string, Grade>;
  }
  export const ELEMENTS: string[];
  export function deCyrillic(s: string): string;
  export function parseAssay(text: string): Record<string, number>;
  export function hasAssay(a: any): boolean;
  export function formatAssay(a: any): string;
  export function assayOf(lot: any, descriptionText?: string): Record<string, number>;
  export function assayRange(assays?: any[]): Record<string, { min: number; max: number }>;
  export function formatRange(range: any): string;
  export function aliasKey(description: string): string;
  export function buildGradeIndex(grades?: Grade[]): GradeIndex;
  export function resolveGrade(
    index: GradeIndex | null | undefined,
    args?: { description?: string; lineId?: string }
  ): Grade | null;
  export function findGradeByName(grades: Grade[], name: string): Grade | null;
  export function makeGrade(id: string, args: { name: string; spec?: string }): Grade;
  /** Put spellings on one grade, taking each off any other grade that held it; returns the grades that changed. */
  export function assignAliases(grades: Grade[], targetId: string, spellings?: string[]): Grade[];
  export function parseSpecQuery(query: string): Record<string, any> | null;
  export function assayMatches(assay: any, spec: any): boolean;
  export function describeSpec(spec: any): string;
}

// Additional exports of modules declared above (ambient module declarations merge).
declare module '@shared/pureHelpers' {
  /** lstSaved ('dd-mmm-yyyy, HH:MM') as UTC ms; -1 when absent or unparseable. */
  export function savedAtMs(rec: any): number;
  /** One document id is one record across year buckets; the copy saved last wins. */
  export function dedupeById<T = any>(rows: { id: string; data: T }[]): T[];
}

declare module '@shared/permissions' {
  export interface PageDef {
    key: string;
    label: string;
    group?: string;
  }
  export const PAGE_GROUPS: { ttl: string; pages: PageDef[] }[];
  export const PAGES: PageDef[];
  export const PAGE_KEYS: string[];
  export function pageLabel(key: string): string;
  export function defaultPagesForRole(role: unknown): string[];
  export function resolvePages(claims?: Record<string, any>, uid?: string): string[];
  export function canAccess(claims?: Record<string, any>, pageKey?: string, uid?: string): boolean;
  export function pageKeyFromPath(pathname?: string): string;
  export function landingPage(claims?: Record<string, any>, uid?: string): string;
}

declare module '@shared/stockGuards' {
  /** The duplicate-line trap: null when the save is fine, else the message to show. */
  export function duplicateLineTrap(
    invoice: any,
    contract: { id?: string; productsData?: { id: string; description?: string }[]; invoices?: { invoice?: unknown }[] } | null | undefined,
    loadRows: (lineIds: string[]) => Promise<any[]>
  ): Promise<string | null>;
  /** The ledger rows that belong to one contract, the invoice being saved left out. */
  export function contractLedger(rows: any[], contract: any, invoiceNum?: unknown): any[];
  /** Net quantity per line over a set of ledger rows. */
  export function onHandByLine(rows: any[], lineIds: string[]): Record<string, number>;
}

declare module '@shared/notificationPrefs' {
  export interface NotificationCategory {
    key: string;
    label: string;
    description: string;
    match?: (n: any) => boolean;
  }
  export interface NotificationPrefs {
    categories: Record<string, boolean>;
  }
  export const NOTIFICATION_CATEGORIES: NotificationCategory[];
  export const OTHER_CATEGORY: NotificationCategory;
  export const CATEGORY_KEYS: string[];
  export function categoryOf(n: any): string;
  export function categoryLabel(key: string): string;
  export function defaultNotificationPrefs(): NotificationPrefs;
  export function normalizeNotificationPrefs(raw: any): NotificationPrefs;
  export function isCategoryEnabled(prefs: any, key: string): boolean;
  export function isNotificationEnabled(prefs: any, n: any): boolean;
  export function notificationPrefsPath(uidCollection: string, userUid: string): [string, string, string, string];
  export const PUSH_CATEGORIES: { overdueReceivables: string };
  export function shouldDeliverPush(prefsByUser: any[], device: { userUid?: string; userEmail?: string }, category: string): boolean;
}

declare module '@shared/currency' {
  export function curKind(cur: unknown): 'usd' | 'eur' | null;
  export function curSymbol(cur: unknown): string;
  export function curCode(cur: unknown): string;
  export function curTone(cur: unknown): 'green' | 'blue' | 'gray';
  /** "$1,234.50", "-€12.00", "GBP 1,234.50" — the one money format, web and mobile. */
  export function moneyFull(cur: string | undefined | null, value: number | string, decimals?: number): string;
  /** "$1.23M", "-€45.60K", "$980.00". */
  export function moneyCompact(cur: string | undefined | null, value: number | string, decimals?: number): string;
}
