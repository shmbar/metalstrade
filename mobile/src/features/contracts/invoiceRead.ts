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
