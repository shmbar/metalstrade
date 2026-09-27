import { describe, expect, it } from 'vitest';
import { linkedInvoiceBlock } from '@/features/contracts/poInvoiceModel';

// web poInvModal deleteItems (66b06dd7): a purchase invoice linked to a sales invoice can't
// be deleted while that invoice still exists. Mobile deleted with no check at all.
describe('purchase-invoice delete guard', () => {
  const own = '020725';

  it('a link to a deleted sales invoice does not block (PO 020725 / invoice 496 → 1299)', () => {
    expect(linkedInvoiceBlock(['1299'], new Map(), own)).toBeNull();
  });

  it('a link to a live invoice on this PO blocks, and says to unlink it here', () => {
    const msg = linkedInvoiceBlock(['1300'], new Map([['1300', own]]), own);
    expect(msg).toContain('Linked to sales invoice 1300 —');
    expect(msg).toContain('Shipments Tracking tab of this PO');
  });

  it('a live invoice on ANOTHER PO blocks too, naming that PO', () => {
    const msg = linkedInvoiceBlock(['1448'], new Map([['1448', '220526']]), own);
    expect(msg).toContain('1448 (on PO 220526)');
    expect(msg).toContain('tab of that PO');
  });

  it('only the live links are named when some are stale', () => {
    const msg = linkedInvoiceBlock(['1299', '1300'], new Map([['1300', own]]), own);
    expect(msg).toContain('sales invoice 1300 —');
    expect(msg).not.toContain('1299');
  });
});
