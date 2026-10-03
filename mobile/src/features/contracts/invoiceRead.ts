// Reading a supplier's invoice for the Purchase invoices screen — the parts of web's
// DocumentImportOverlay (documentType 'expense') that decide what lands on the row:
// which fields start ticked, and how the reader's answer maps onto the Expense shape
// that poInvModal addInvoiceFromDoc consumes. Pure — the file picker and the network
// call live in docImport.ts. Covered by __tests__/parity/po-invoice-pdf-import.test.ts.
import { nameForInvoice } from '@shared/invoiceFiles';

/**
 * The name the read document is attached under: web's nameForInvoice, so the Cashflow
 * invoice preview can find it again ("Invoice 147 - scan_0001.pdf") — with any slash
 * turned into a dash. Storage treats "/" as a folder, so "Invoice FVEH/00002 - …"
 * would be filed in a sub-folder and never listed with the contract's attachments.
 */
export const attachmentName = (docName: string, invoiceNo: string): string =>
  nameForInvoice(docName || 'document.pdf', invoiceNo).replace(/[\\/]/g, '-');

/** The fields the web overlay lists for a supplier invoice, in its order (handleFile). */
export const INVOICE_FIELDS = [
  'vendorInvoiceNumber',
  'supplier',
  'buyerPoNumber',
  'date',
  'currency',
  'amount',
  'expenseType',
  'comments',
] as const;

export type InvoiceField = (typeof INVOICE_FIELDS)[number];
export type Selection = Partial<Record<InvoiceField, boolean>>;

/**
 * Which fields start ticked — web handleFile: every field except a LOW-confidence read.
 * A field the reader gave no confidence for borrows the supplier's, then the client's —
 * web's fallback, kept as is.
 */
export function defaultSelection(result: any): Selection {
  const sel: Selection = {};
  INVOICE_FIELDS.forEach((f) => {
    const conf = result?.confidence?.[f] || result?.confidence?.supplier || result?.confidence?.client;
    sel[f] = conf !== 'low';
  });
  return sel;
}

/**
 * The reader's answer in the project's Expense shape — web handleApply, the 'expense'
 * branch. Only ticked fields land. The Purchase invoices screen reads `expense` (the
 * supplier's invoice number) and `amount`; the rest is kept so this stays the web
 * mapping, not a subset of it.
 */
export function expenseOut(result: any, selected: Selection): any {
  const out: any = {};
  if (!result) return out;
  if (selected.vendorInvoiceNumber && result.vendorInvoiceNumber) out.expense = result.vendorInvoiceNumber;
  if (selected.supplier && result.supplierId) out.supplier = result.supplierId;
  if (selected.date && result.date) {
    out.dateRange = { startDate: result.date, endDate: result.date };
    out.date = result.date;
  }
  if (selected.currency && result.currencyId) out.cur = result.currencyId;
  if (selected.amount && result.amount != null) out.amount = String(result.amount);
  if (selected.expenseType && result.expenseTypeId) out.expType = result.expenseTypeId;
  if (selected.comments) {
    const parts: string[] = [];
    if (result.buyerPoNumber) parts.push(`Buyer PO: ${result.buyerPoNumber}`);
    if (result.comments) parts.push(result.comments);
    if (parts.length) out.comments = parts.join('\n');
  }
  if (selected.buyerPoNumber && result.linkedContract) {
    out.poSupplier = {
      id: result.linkedContract.id,
      order: result.linkedContract.order,
      date: result.linkedContract.date || result.date || '',
    };
  }
  return out;
}

// The PO-number test the document-reader route links an invoice to a contract by
// (route.js matchByOrder), verbatim: lower-cased, everything but letters, digits and
// "-" dropped, then equal, or either one containing the other.
const poKey = (s: any) => String(s || '').toLowerCase().replace(/[^a-z0-9-]/g, '');
export const matchesPoNumber = (order: any, buyerPo: any): boolean => {
  const ord = poKey(order);
  const target = poKey(buyerPo);
  if (!ord || !target) return false;
  return ord === target || ord.includes(target) || target.includes(ord);
};

const dateOf = (c: any): string => String(c?.date || c?.dateRange?.startDate || '');

export interface PoSuggestion {
  contract: any;
  /** 'po' = the PO number printed on the invoice; 'supplier' = that supplier's recent POs. */
  why: 'po' | 'supplier';
}

/**
 * Which POs a shared supplier invoice most likely belongs to, best first: the one(s)
 * whose number is printed on the invoice, then the invoice supplier's latest POs.
 *
 * Matched here rather than by sending the contract list with the file (as web's expense
 * import does): same rule, a smaller upload, and it works whether or not the contracts
 * had loaded when the file was read. One difference, for a suggestion list only: a
 * number of 1–3 characters must match exactly — "26" is inside half the POs of a year.
 */
export function suggestPurchaseOrders(result: any, contracts: any[], limit = 5): PoSuggestion[] {
  const live = (contracts || []).filter((c: any) => c && !c.deleted && c.order);
  const byDate = (a: any, b: any) => dateOf(b).localeCompare(dateOf(a));
  const out: PoSuggestion[] = [];
  const seen = new Set<string>();
  const add = (c: any, why: PoSuggestion['why']) => {
    if (out.length >= limit || seen.has(c.id)) return;
    seen.add(c.id);
    out.push({ contract: c, why });
  };
  const target = poKey(result?.buyerPoNumber);
  if (target) {
    live
      .filter((c: any) => (target.length < 4 || poKey(c.order).length < 4 ? poKey(c.order) === target : matchesPoNumber(c.order, target)))
      .sort(byDate)
      .forEach((c: any) => add(c, 'po'));
  }
  if (result?.supplierId) {
    live
      .filter((c: any) => c.supplier === result.supplierId)
      .sort(byDate)
      .forEach((c: any) => add(c, 'supplier'));
  }
  return out;
}

/**
 * What to check before adding the invoice. The first three are web's own banners.
 * The supplier and currency checks are the phone's: this screen belongs to one PO, so
 * an invoice from another supplier or in another currency is almost certainly on the
 * wrong PO. Web's preview lists the supplier and currency without comparing them.
 */
export function readWarnings(
  result: any,
  po: { supplierId?: string; supplierName?: string; currencyId?: string; currencyCode?: string }
): string[] {
  const w: string[] = [];
  if (!result) return w;
  if (result.visionUsed) {
    w.push('Scanned document — the figures were read from an image. Check the invoice number and the amount.');
  }
  if (result.selfPartyCorrected) {
    w.push('This document names our own company as a party — it was issued by the counterparty. Check the supplier.');
  }
  if (result.multipleInvoices) {
    w.push('This file appears to hold more than one invoice. Only the FIRST one was read — add the others separately.');
  }
  if (result.lineCheckFailed) {
    w.push("The invoice's line totals do not multiply out — a figure may have been misread. Check the amount.");
  }
  if (result.supplierId && po.supplierId && result.supplierId !== po.supplierId) {
    w.push(`This invoice is from ${result.supplierName || 'another supplier'}, but this PO is with ${po.supplierName || 'a different supplier'}.`);
  }
  if (result.currencyId && po.currencyId && result.currencyId !== po.currencyId) {
    w.push(`This invoice is in ${result.currencyCode || 'another currency'}, but this PO is in ${po.currencyCode || 'a different currency'}.`);
  }
  return w;
}
