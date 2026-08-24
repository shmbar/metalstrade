import { describe, it, expect } from 'vitest';
import {
    lineQty,
    lineSalesContractId,
    salesContractIdsOf,
    invoiceQtyBySalesContract,
    invoiceQtyForSalesContract,
    invoiceLinksSalesContract,
} from '../salesLink.js';

// The whole point of this module is that shipped tonnage is credited to the right
// client PO. Two properties matter more than any single number:
//   1. an invoice that predates per-line tagging must total EXACTLY as it did before
//   2. a split invoice must DIVIDE its tonnage, never duplicate it
// Everything below exists to hold those two.

describe('lineQty', () => {
    it("treats the 's' service-line sentinel as zero, not NaN", () => {
        expect(lineQty({ qnty: 's' })).toBe(0);
    });
    it('parses numeric strings and tolerates junk', () => {
        expect(lineQty({ qnty: '10.5' })).toBe(10.5);
        expect(lineQty({ qnty: '' })).toBe(0);
        expect(lineQty({})).toBe(0);
        expect(lineQty(null)).toBe(0);
    });
});

describe('lineSalesContractId', () => {
    it('prefers the line tag', () => {
        expect(lineSalesContractId({ salesContractId: 'SC1' }, { salesContractId: 'SC2' })).toBe('SC2');
    });
    it('falls back to the invoice link when the line is untagged', () => {
        expect(lineSalesContractId({ salesContractId: 'SC1' }, {})).toBe('SC1');
        expect(lineSalesContractId({ salesContractId: 'SC1' }, { salesContractId: '' })).toBe('SC1');
    });
    it('returns empty when neither is set', () => {
        expect(lineSalesContractId({}, {})).toBe('');
        expect(lineSalesContractId(null, null)).toBe('');
    });
});

describe('backward compatibility — invoices with no line tags', () => {
    const legacy = {
        salesContractId: 'SC1',
        productsDataInvoice: [{ qnty: '10' }, { qnty: '5.5' }, { qnty: 's' }, { qnty: '' }],
    };

    it('credits the whole invoice to its header contract, exactly as before', () => {
        expect(invoiceQtyBySalesContract(legacy)).toEqual({ SC1: 15.5 });
    });
    it('reports a single linked contract', () => {
        expect(salesContractIdsOf(legacy)).toEqual(['SC1']);
    });
    it('still reports the header link when the invoice has no lines yet', () => {
        expect(salesContractIdsOf({ salesContractId: 'SC1' })).toEqual(['SC1']);
    });
});

describe('split across two client POs', () => {
    const split = {
        salesContractId: 'SC1',
        productsDataInvoice: [
            { qnty: '10' },                        // untagged -> SC1
            { qnty: '4', salesContractId: 'SC2' },
            { qnty: '6', salesContractId: 'SC2' },
        ],
    };

    it('divides the tonnage instead of double-counting it', () => {
        expect(invoiceQtyBySalesContract(split)).toEqual({ SC1: 10, SC2: 10 });
    });
    it('conserves the invoice total across the split', () => {
        const total = Object.values(invoiceQtyBySalesContract(split)).reduce((a, b) => a + b, 0);
        expect(total).toBe(20);
    });
    it('lists both contracts, in line order, de-duplicated', () => {
        expect(salesContractIdsOf(split)).toEqual(['SC1', 'SC2']);
    });
    it('answers per-contract quantity', () => {
        expect(invoiceQtyForSalesContract(split, 'SC2')).toBe(10);
        expect(invoiceQtyForSalesContract(split, 'SC3')).toBe(0);
        expect(invoiceQtyForSalesContract(split, '')).toBe(0);
    });
    it('reports linkage for a contract reached only through a line tag', () => {
        expect(invoiceLinksSalesContract(split, 'SC2')).toBe(true);
        expect(invoiceLinksSalesContract(split, 'SC3')).toBe(false);
    });
    it('gives the header contract nothing once every line is retagged', () => {
        const retagged = { salesContractId: 'SC1', productsDataInvoice: [{ qnty: '7', salesContractId: 'SC2' }] };
        expect(invoiceQtyBySalesContract(retagged)).toEqual({ SC2: 7 });
    });
});

describe('unlinked and malformed invoices', () => {
    it('credits nothing when there is no link at all', () => {
        const inv = { productsDataInvoice: [{ qnty: '3' }] };
        expect(invoiceQtyBySalesContract(inv)).toEqual({});
        expect(salesContractIdsOf(inv)).toEqual([]);
    });
    it('survives null / undefined without throwing', () => {
        expect(salesContractIdsOf(null)).toEqual([]);
        expect(invoiceQtyBySalesContract(null)).toEqual({});
        expect(invoiceQtyBySalesContract(undefined)).toEqual({});
        expect(invoiceLinksSalesContract(null, 'SC1')).toBe(false);
    });
});
