// A supplier invoice read on the "shared document" screen, handed to the Purchase
// invoices screen of the PO the user picked — so the file is read once, not twice.
// Module state rather than a store: it lives for one hand-over and nothing renders
// from it. The receiving screen peeks while it initialises its state (a pure read),
// then clears it from an effect.
import type { PickedDocument } from './docImport';

export interface PendingRead {
  contractId: string;
  doc: PickedDocument;
  result: any;
}

let pending: PendingRead | null = null;

export function setPendingRead(p: PendingRead | null): void {
  pending = p;
}

/** The read waiting for this PO, or null — without using it up. */
export function peekPendingRead(contractId: string): PendingRead | null {
  return pending && pending.contractId === contractId ? pending : null;
}

/** Done with this PO's read: the next visit to its screen opens no sheet. */
export function clearPendingRead(contractId: string): void {
  if (pending && pending.contractId === contractId) pending = null;
}
