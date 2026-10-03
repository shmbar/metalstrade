/**
 * PARITY: reading a supplier's invoice into the Purchase invoices list
 *
 * Web: app/(root)/contracts/modals/poInvModal.js "Autofill from PDF" opens
 * components/DocumentImportOverlay.js with documentType 'expense'; the overlay picks
 * the default ticks (handleFile), maps the read onto the Expense shape (handleApply)
 * and hands it to poInvModal's addInvoiceFromDoc, which adds the row — or refreshes
 * the row already carrying that invoice number.
 *
 * Mobile, 2026-10-03: the same three steps — invoiceRead.defaultSelection /
 * invoiceRead.expenseOut / poInvoiceModel.addInvoiceFromDoc — behind the
 * "Autofill from PDF" and "Scan with camera" buttons on the Purchase invoices screen.
 * Each web function below is transcribed verbatim and hash-pinned, so a web change
 * trips the drift alarm instead of leaving the two apps reading invoices differently.
 */
import { describe, it, expect } from 'vitest';
import { addInvoiceFromDoc } from '@/features/contracts/poInvoiceModel';
import { attachmentName, defaultSelection, expenseOut, readWarnings, INVOICE_FIELDS } from '@/features/contracts/invoiceRead';
import { apiErrorText } from '@/lib/apiError';
import { mimeFor } from '@/lib/mime';
import { nameForInvoice, pickInvoiceFile } from '@shared/invoiceFiles';
import { expectWebUnchanged, repoFileText } from './_helpers/webSource';

const collapsed = (rel: string) => repoFileText(rel).replace(/\s+/g, ' ');

// ── web, transcribed ─────────────────────────────────────────────────────────

// poInvModal.js addInvoiceFromDoc — the two setValueCon updaters as one pure function
// over the list (`valueCon.poInvoices` / `prev.poInvoices` are the same list here).
const webAddInvoiceFromDoc = (poInvoices: any[], out: any, newId: string, newPmntId: string) => {
  const val = out?.amount != null && out.amount !== '' ? String(out.amount) : '';
  const num = String(out?.expense || '').trim();
  const normNo = (s: any) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const existing = num && (poInvoices || []).find((p: any) => normNo(p.inv) === normNo(num));
  if (existing) {
    return {
      existing,
      list: poInvoices.map((item: any) => {
        if (item.id !== existing.id) return item;
        const paid = (item.payments || []).reduce((t: number, z: any) => t + (parseFloat(z.pmnt) || 0), 0);
        const v = val !== '' ? (parseFloat(val) || 0) : (parseFloat(item.invValue) || 0);
        return { ...item, invValue: val !== '' ? val : item.invValue, pmnt: paid, blnc: Math.round((v - paid) * 100) / 100 };
      }),
    };
  }
  const newInv = {
    id: newId,
    inv: num,
    invValue: val,
    pmnt: '0',
    blnc: parseFloat(val) || 0,
    invRef: [],
    payments: [{ pmntId: newPmntId, pmntDate: null, pmntPerc: '', pmnt: '' }],
  };
  return { existing: null, list: [...(poInvoices || []), newInv] };
};

// DocumentImportOverlay.js handleFile — the default ticks, 'expense' list.
const webDefaultSelection = (data: any) => {
  const sel: Record<string, boolean> = {};
  const allFields = ['vendorInvoiceNumber', 'supplier', 'buyerPoNumber', 'date', 'currency', 'amount', 'expenseType', 'comments'];
  allFields.forEach((f) => {
    const conf = data.confidence?.[f] || data.confidence?.supplier || data.confidence?.client;
    sel[f] = conf !== 'low';
  });
  return sel;
};

// DocumentImportOverlay.js handleApply — the 'expense' branch.
const webExpenseOut = (result: any, selected: any) => {
  const out: any = {};
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
};

// ── fixtures ─────────────────────────────────────────────────────────────────

const paidRow = () => ({
  id: 'inv-1',
  inv: 'FVEH/00002',
  invValue: '10000',
  pmnt: 3000,
  blnc: 7000,
  invRef: [],
  payments: [
    { pmntId: 'p1', pmntDate: { startDate: '2026-09-01', endDate: '2026-09-01' }, pmntPerc: 30, pmnt: '3000' },
  ],
});

const READ = {
  vendorInvoiceNumber: 'FVEH/00002',
  supplierName: 'Nicrometal',
  supplierId: 'sup-nicro',
  buyerPoNumber: '050626',
  date: '2026-09-28',
  currencyCode: 'EUR',
  currencyId: 'eu',
  amount: 12345.67,
  multipleInvoices: false,
  expenseTypeName: 'Material purchase',
  expenseTypeId: 'exp-mat',
  comments: 'Payment 30 days',
  confidence: { vendorInvoiceNumber: 'high', supplier: 'high', amount: 'high', date: 'medium', buyerPoNumber: 'low' },
  linkedContract: null,
  visionUsed: false,
};

// ═════════════════════════════════════════════════════════════════════════════

describe('web sources have not drifted', () => {
  it('poInvModal addInvoiceFromDoc, and the overlay it opens', () => {
    expectWebUnchanged('app/(root)/contracts/modals/poInvModal.js', 'addInvoiceFromDoc', '908749c5e5cc');
    expectWebUnchanged('components/DocumentImportOverlay.js', 'handleFile', '2a5934e42cae');
    expectWebUnchanged('components/DocumentImportOverlay.js', 'handleApply', '501763d5416a');
  });

  it("the Purchase invoices window reads with the 'expense' reader, anchored to the contract", () => {
    const src = collapsed('app/(root)/contracts/modals/poInvModal.js');
    expect(src).toContain("documentType='expense'");
    expect(src).toContain('anchorId={valueCon?.id}');
    expect(src).toContain('onApply={addInvoiceFromDoc}');
  });
});

describe('a read lands on the list as web lands it', () => {
  it('a new invoice number adds a row with one empty payment', () => {
    const out = webExpenseOut(READ, webDefaultSelection(READ));
    const mob = addInvoiceFromDoc([], out, 'new-1', 'pay-1');
    expect(mob).toEqual(webAddInvoiceFromDoc([], out, 'new-1', 'pay-1'));
    expect(mob.existing).toBeNull();
    expect(mob.list[0]).toMatchObject({ inv: 'FVEH/00002', invValue: '12345.67', pmnt: '0', blnc: 12345.67 });
  });

  it('the same number, written differently, refreshes the recorded row — never a twin', () => {
    // The Nicrometal FVEH/00002 case: a re-read used to double the supplier's balance.
    const list = [paidRow()];
    const out = { expense: 'fveh 00002', amount: '12500' };
    const mob = addInvoiceFromDoc(list, out, 'new-1', 'pay-1');
    expect(mob).toEqual(webAddInvoiceFromDoc(list, out, 'new-1', 'pay-1'));
    expect(mob.list).toHaveLength(1);
    expect(mob.existing?.id).toBe('inv-1');
    // Payments untouched (no percentage rescale); pmnt / blnc re-derived from them.
    expect(mob.list[0]).toMatchObject({ invValue: '12500', pmnt: 3000, blnc: 9500 });
    expect(mob.list[0].payments).toEqual(list[0].payments);
  });

  it('a read without an amount keeps the recorded value', () => {
    const list = [paidRow()];
    const out = { expense: 'FVEH/00002' };
    const mob = addInvoiceFromDoc(list, out, 'n', 'p');
    expect(mob).toEqual(webAddInvoiceFromDoc(list, out, 'n', 'p'));
    expect(mob.list[0]).toMatchObject({ invValue: '10000', blnc: 7000 });
  });

  it('a read without a number always adds — there is nothing to match on', () => {
    const list = [paidRow()];
    const out = { amount: '500' };
    const mob = addInvoiceFromDoc(list, out, 'n', 'p');
    expect(mob).toEqual(webAddInvoiceFromDoc(list, out, 'n', 'p'));
    expect(mob.list).toHaveLength(2);
  });
});

describe('what starts ticked, and what lands', () => {
  it('lists the overlay\'s eight supplier-invoice fields, in its order', () => {
    expect([...INVOICE_FIELDS]).toEqual(['vendorInvoiceNumber', 'supplier', 'buyerPoNumber', 'date', 'currency', 'amount', 'expenseType', 'comments']);
  });

  it('a low-confidence read starts unticked; a field with no confidence borrows the supplier\'s', () => {
    for (const confidence of [
      READ.confidence,
      { vendorInvoiceNumber: 'low', amount: 'low', supplier: 'high' },
      { supplier: 'low' }, // every field without its own confidence borrows this low
      {},
    ]) {
      const r = { ...READ, confidence };
      expect(defaultSelection(r)).toEqual(webDefaultSelection(r));
    }
    expect(defaultSelection({ confidence: { amount: 'low' } }).amount).toBe(false);
    expect(defaultSelection({ confidence: { supplier: 'low' } }).amount).toBe(false);
  });

  it('maps the read onto the Expense shape, only the ticked fields', () => {
    const all = Object.fromEntries(INVOICE_FIELDS.map((f) => [f, true]));
    const linked = { ...READ, linkedContract: { id: 'c1', order: '050626', date: '2026-06-05' } };
    expect(expenseOut(linked, all)).toEqual(webExpenseOut(linked, all));
    const some = { ...all, amount: false, comments: false };
    expect(expenseOut(READ, some)).toEqual(webExpenseOut(READ, some));
    expect(expenseOut(READ, some).amount).toBeUndefined();
    expect(expenseOut(null, all)).toEqual({});
  });

  it('end to end: read → ticks → list, identical to web', () => {
    const list = [paidRow()];
    const mob = addInvoiceFromDoc(list, expenseOut(READ, defaultSelection(READ)), 'n', 'p');
    const web = webAddInvoiceFromDoc(list, webExpenseOut(READ, webDefaultSelection(READ)), 'n', 'p');
    expect(mob).toEqual(web);
  });
});

describe('what the review sheet warns about', () => {
  const po = { supplierId: 'sup-nicro', supplierName: 'Nicrometal', currencyId: 'eu', currencyCode: 'EUR' };

  it('nothing for a clean read on the right PO', () => {
    expect(readWarnings(READ, po)).toEqual([]);
  });

  it("web's banners: scanned, our own name on the page, several invoices, line totals off", () => {
    const w = readWarnings({ ...READ, visionUsed: true, selfPartyCorrected: true, multipleInvoices: true, lineCheckFailed: true }, po);
    expect(w).toHaveLength(4);
    expect(w[0]).toMatch(/^Scanned document/);
    expect(w[2]).toMatch(/Only the FIRST one was read/);
  });

  it("an invoice from another supplier, or in another currency, than this PO's", () => {
    const w = readWarnings({ ...READ, supplierId: 'sup-other', supplierName: 'Shalex', currencyId: 'us', currencyCode: 'USD' }, po);
    expect(w).toEqual([
      'This invoice is from Shalex, but this PO is with Nicrometal.',
      'This invoice is in USD, but this PO is in EUR.',
    ]);
    // An unmatched supplier or currency (no id) is not called a mismatch.
    expect(readWarnings({ ...READ, supplierId: null, currencyId: null }, po)).toEqual([]);
  });
});

describe('the attached file is found again by the Cashflow preview', () => {
  it('a file without the number is named for the invoice; one that names it is kept', () => {
    expect(nameForInvoice('scan_0001.pdf', 'FVEH/00002')).toBe('Invoice FVEH/00002 - scan_0001.pdf');
    expect(nameForInvoice('Invoice No. 147 dd. 08.09.2026.pdf', '147')).toBe('Invoice No. 147 dd. 08.09.2026.pdf');
    expect(nameForInvoice('Scan 2026-10-03 16.05.jpg', '')).toBe('Scan 2026-10-03 16.05.jpg');
  });

  it('a slash in the invoice number never becomes a Storage folder', () => {
    // "Invoice FVEH/00002 - …" would be filed under a sub-folder "Invoice FVEH" and never
    // listed with the contract's attachments.
    expect(attachmentName('scan_0001.pdf', 'FVEH/00002')).toBe('Invoice FVEH-00002 - scan_0001.pdf');
    expect(attachmentName('scan_0001.pdf', '147')).toBe('Invoice 147 - scan_0001.pdf');
    expect(attachmentName('', '')).toBe('document.pdf');
  });

  it('is stored as a PDF, so the web shows it instead of downloading it', () => {
    // A phone blob carries no type; Storage then served application/octet-stream.
    expect(mimeFor('Invoice 147 - scan_0001.pdf', '')).toBe('application/pdf');
    expect(mimeFor('Invoice 147 - scan_0001.PDF', 'application/octet-stream')).toBe('application/pdf');
    expect(mimeFor('Scan 2026-10-03 16.05.jpg', undefined)).toBe('image/jpeg');
    expect(mimeFor('anything.pdf', 'image/png')).toBe('image/png'); // the picker's own type wins
    expect(mimeFor('no-extension', null)).toBeUndefined();
  });

  it('and the preview picks exactly that file for that invoice', () => {
    const files = [
      { name: nameForInvoice('scan_0001.pdf', '146'), url: 'a' },
      { name: nameForInvoice('scan_0002.pdf', '147'), url: 'b' },
    ];
    expect(pickInvoiceFile(files, '147')?.url).toBe('b');
  });
});

describe('a failed read says something a person can act on', () => {
  it("the reader's sentence, not its code", () => {
    expect(apiErrorText(504, { error: 'READ_TIMED_OUT', message: 'This document took too long to read.' }, true))
      .toBe('This document took too long to read.');
    expect(apiErrorText(400, { error: 'No file provided' }, true)).toBe('No file provided');
    expect(apiErrorText(500, { message: 'Something broke' }, true)).toBe('Something broke');
  });

  it("the platform's own error page becomes a sentence, never its HTML", () => {
    const html = { error: '<!DOCTYPE html><html>…Request Entity Too Large…</html>' };
    expect(apiErrorText(413, html, false)).toBe('That file is too large to send.');
    expect(apiErrorText(504, html, false)).toBe('The server took too long to answer. Try again.');
    expect(apiErrorText(502, html, false)).toBe('Request failed (502).');
  });
});
