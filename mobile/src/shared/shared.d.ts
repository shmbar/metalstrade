// Ambient typings for the verbatim-ported pure JS business-logic modules.
// The .js files are copied unchanged from the web app (utils/) so the financial
// math is provably identical; these declarations give call sites type safety
// without touching the source of truth.

declare module '@shared/pureHelpers' {
  export function toIsoDate(s: string | null | undefined): string | null;
  export function resolveDueDate(inv: any): string | null;
  export function resolveInvoiceDate(inv: any): string | null;
  export function groupInvoicesByNumber(invoices: any[]): any[];
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
  export function isFinalized(inv: any): boolean;
  export function effectiveDueDate(inv: any, termDays?: number): string | null;
  export function isOverdue(inv: any, asOf?: Date, termDays?: number): boolean;
  export function fx(amount: number, cur: string, rate: number, base?: string): number;
  export function unitOf(contract: any, settings: any): string;
  export function toMT(qty: number, contract: any, settings: any): number;
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
