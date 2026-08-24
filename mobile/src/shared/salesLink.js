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
