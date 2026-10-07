// Sales-contract (client PO) linkage for a sales invoice — ONE definition, read by
// the invoice modals, the Sales Contracts page and its detail modal.
//
// WHY IT IS PER LINE. An invoice used to link to exactly one sales contract via
// `invoice.salesContractId`, and the Sales Contracts page credited that contract
// with the invoice's ENTIRE quantity. That breaks the moment one shipment covers
// two client POs: crediting the whole tonnage to both double-counts it, and the
// shipped / remaining figures the client reads go wrong silently.
//
// So the link lives on the invoice LINE (`productsDataInvoice[].salesContractId`),
// mirroring how the purchase-side `po` already works on the same rows. Each PO is
// then credited with exactly the tonnage of its own lines.
//
// BACKWARD COMPATIBILITY is the reason for the fallback in lineSalesContractId:
// every existing invoice has line-level `undefined` and an invoice-level id, so it
// resolves to that id for all lines and reproduces its current numbers exactly.
// Nothing needs migrating, and an invoice only splits once someone tags a line.

import { standingDocs, invoiceRank } from './finance.js';

// 's' is the sentinel this app uses for a line with no weight (a service//adjustment
// row); it must not count as zero-parsed tonnage anywhere.
export const lineQty = (row) => (row?.qnty === 's' ? 0 : (parseFloat(row?.qnty) || 0));

// Which sales contract a single invoice line belongs to. Line first, invoice as the
// fallback — see the note above.
export const lineSalesContractId = (inv, row) =>
    (row && row.salesContractId) || (inv && inv.salesContractId) || '';

// Every sales contract this invoice touches, de-duplicated, in line order.
export const salesContractIdsOf = (inv) => {
    const rows = (inv && inv.productsDataInvoice) || [];
    const ids = [];
    for (const r of rows) {
        const id = lineSalesContractId(inv, r);
        if (id && !ids.includes(id)) ids.push(id);
    }
    // An invoice with no lines yet still carries its header-level link.
    if (!ids.length && inv && inv.salesContractId) ids.push(inv.salesContractId);
    return ids;
};

// { salesContractId: quantity } for one invoice. The sum over the returned values
// equals the invoice's total quantity, which is what keeps this from
// double-counting when a line-level tag splits an invoice across two POs.
export const invoiceQtyBySalesContract = (inv) => {
    const out = {};
    for (const r of (inv && inv.productsDataInvoice) || []) {
        const id = lineSalesContractId(inv, r);
        if (!id) continue;
        out[id] = (out[id] || 0) + lineQty(r);
    }
    return out;
};

// Quantity this invoice contributes to ONE sales contract.
export const invoiceQtyForSalesContract = (inv, salesContractId) =>
    salesContractId ? (invoiceQtyBySalesContract(inv)[salesContractId] || 0) : 0;

// Does this invoice touch the given sales contract at all?
export const invoiceLinksSalesContract = (inv, salesContractId) =>
    !!salesContractId && salesContractIdsOf(inv).includes(salesContractId);

/* The invoices that count for shipped tonnage — each invoice ONCE, as it stands.

   An invoice and its Final Note are one shipment: the note is the invoice issued again
   with its settled weights (utils/finance.js standingDocs). Crediting both counted the
   shipment twice — PCI / 3014 (Iberinox) ordered 23 MT and read 45.606 shipped, 22.606
   over and "Fully shipped", on invoice 1460 and its note 1460FN; 13 of the 33 sales
   contracts in IMS and GIS were wrong this way (client-facing, 2026-10-06). So within one
   invoice number only the live documents of the highest rank count.

   A note issued without the sales-contract link takes it from the invoice it replaces —
   ten of the notes on linked invoices carry none, and counting them unlinked would drop
   their shipment instead. Line by line where the lines match (the same material line,
   descriptionId — a note's lines are new rows with new ids), else the old invoice's one
   contract when it named only one. A link the note makes itself always stands. */
const lineMaterial = (row) => (row && (row.descriptionId || row.description)) || '';

const withInheritedLinks = (doc, replaced) => {
    const byMaterial = new Map();
    const named = new Set();
    for (const old of replaced) {
        if (old && old.salesContractId) named.add(old.salesContractId);
        for (const r of (old && old.productsDataInvoice) || []) {
            const id = lineSalesContractId(old, r);
            if (!id) continue;
            named.add(id);
            const m = lineMaterial(r);
            if (!m) continue;
            if (!byMaterial.has(m)) byMaterial.set(m, new Set());
            byMaterial.get(m).add(id);
        }
    }
    if (!named.size) return doc;
    const only = named.size === 1 ? [...named][0] : '';
    const rows = ((doc && doc.productsDataInvoice) || []).map((r) => {
        if (lineSalesContractId(doc, r)) return r;
        const ids = byMaterial.get(lineMaterial(r));
        const id = ids && ids.size === 1 ? [...ids][0] : only;
        return id ? { ...r, salesContractId: id } : r;
    });
    return { ...doc, productsDataInvoice: rows };
};

export const settledInvoices = (invoices) => {
    const groups = new Map();
    for (const inv of invoices || []) {
        if (!inv) continue;
        const key = inv.invoice !== undefined && inv.invoice !== null && inv.invoice !== '' ? `n:${inv.invoice}` : `id:${inv.id}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(inv);
    }
    const out = [];
    for (const group of groups.values()) {
        const standing = standingDocs(group);
        if (!standing.length) continue;
        const top = invoiceRank(standing[0]);
        const replaced = group.filter((d) => invoiceRank(d) < top);
        for (const doc of standing) out.push(replaced.length ? withInheritedLinks(doc, replaced) : doc);
    }
    return out;
};

// "PB062971 · Oryx Stainless BV" — the label a sales contract is shown and SEARCHED by.
//
// A bare contract number is not something anyone recognises at a glance, and the
// dropdown's type-to-filter matches the label only: with just the number, typing a
// buyer's name found nothing, which is what "why can't we search sales POs by
// buyer/consignee?" was about. Same reasoning, and the same separator, as the
// purchase-PO picker in salescontracts/modals/salesContractDetails.js.
export const salesContractLabel = (sc, clients = []) => {
    if (!sc) return '';
    const no = sc.contractNo || '(no number)';
    const c = clients.find((k) => k && k.id === sc.client);
    const who = c ? (c.nname || c.client || '') : '';
    return who ? `${no}  ·  ${who}` : String(no);
};

// Decorate a list of sales contracts with that label, ready for <Selector secondaryName='scLabel'>.
export const withSalesContractLabels = (list = [], clients = []) =>
    list.map((sc) => ({ ...sc, scLabel: salesContractLabel(sc, clients) }));
