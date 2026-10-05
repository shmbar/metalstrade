import { useEffect, useRef } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { useQueryClient } from '@tanstack/react-query';
import { db } from '@/lib/firebase';
import { launch } from './launch';

/*
 * Live multi-user sync: a teammate's save on the web appears here without a refresh.
 *
 * Two things were wrong before (client, 2026-09-16: "not good synchronization" and "the
 * app feels always stuck"):
 *   1. Only invoices, contracts and stocks were watched, so an expense, company expense,
 *      misc invoice, sales contract, margin or settings edit made on the web never
 *      reached a phone that was already open.
 *   2. Every event invalidated EVERY list, including the 5.2 MB stock ledger — one save
 *      anywhere in the office re-downloaded it in full. The ledger now updates itself
 *      through its own listener (features/stocks/stockLedger.ts) and is not invalidated
 *      here at all; the rest is scoped to the keys that actually derive from the
 *      collection that changed.
 * Settings and company data have their own listener in store/settings.ts.
 *
 * 2026-10-05: two of the watchers named collections that do not exist — 'specialinvoices'
 * (it is specialInvoices) and 'salescontracts' (sales contracts are year-bucketed like
 * contracts) — so a teammate's misc invoice or sales contract never reached an open phone.
 * And every watcher's first answer is a full read of its collection, so they now start
 * after the first screen has its data (launchGate.ts) instead of competing with it.
 */

// Which cached screens derive from which collection.
const DERIVED: Record<string, string[]> = {
  invoices: ['invoices', 'contract-invoices', 'receivables', 'accounting', 'dashboard', 'cashflow', 'review', 'briefing', 'notifications', 'shipment'],
  contracts: ['contracts', 'contract-invoices', 'dashboard', 'cashflow', 'contracts-review', 'shipment', 'margins', 'sales-contracts', 'briefing'],
  expenses: ['expenses-screen', 'dashboard', 'cashflow', 'storage-expenses'],
  companyExpenses: ['expenses-screen', 'dashboard', 'cashflow'],
  specialinvoices: ['misc-invoices', 'dashboard'],
  salescontracts: ['sales-contracts', 'contracts', 'dashboard'],
  activity: ['activity'],
};

/** The collections watched, as {path, kind} — the year-bucketed ones for the current year. */
export function liveSyncWatches(year: number): { path: string; kind: keyof typeof DERIVED }[] {
  return [
    { path: `invoices_${year}`, kind: 'invoices' },
    { path: `contracts_${year}`, kind: 'contracts' },
    { path: `expenses_${year}`, kind: 'expenses' },
    { path: 'companyExpenses', kind: 'companyExpenses' },
    { path: 'specialInvoices', kind: 'specialinvoices' },
    { path: `salescontracts_${year}`, kind: 'salescontracts' },
  ];
}

export function useLiveSync(uidCollection: string | null) {
  const qc = useQueryClient();
  const pending = useRef(new Set<string>());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!uidCollection) return;
    const year = new Date().getFullYear();
    let live = true;
    let subs: (() => void)[] = [];

    // Several documents usually change together (an invoice and its contract); collect
    // the affected screens for a moment and refresh each of them once.
    const schedule = (kind: string) => {
      (DERIVED[kind] || []).forEach((k) => pending.current.add(k));
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        const keys = [...pending.current];
        pending.current.clear();
        keys.forEach((key) => qc.invalidateQueries({ queryKey: [key] }));
      }, 700);
    };

    const watch = (path: string, kind: string) => {
      let first = true; // the initial full snapshot is the data we already have
      return onSnapshot(
        collection(db, uidCollection, 'data', path),
        (snap) => {
          if (first) {
            first = false;
            return;
          }
          if (snap.metadata.hasPendingWrites) return; // our own write, already applied
          schedule(kind);
        },
        () => {} // permission/transport errors: the fetch-based flow still covers it
      );
    };

    launch.whenSettled().then(() => {
      if (live) subs = liveSyncWatches(year).map((w) => watch(w.path, w.kind));
    });
    return () => {
      live = false;
      subs.forEach((u) => u());
      if (timer.current) clearTimeout(timer.current);
    };
  }, [uidCollection, qc]);
}
