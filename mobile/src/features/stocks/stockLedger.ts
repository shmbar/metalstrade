import { collection, onSnapshot } from 'firebase/firestore';
import type { QueryClient } from '@tanstack/react-query';
import { db } from '@/lib/firebase';
import { STOCK_LOTS_KEY } from './useAllStockLots';

/*
 * The stock ledger, kept live instead of re-downloaded.
 *
 * Measured on production data (2026-09-16): {uid}/data/stocks is 3,326 documents and
 * 5.2 MB — 11.7 s on laptop wifi, far worse on a phone. Six screens need it (Inventory,
 * Shared Stock, Storage Costs, Aging, Stock Audit, Cashflow), and the live-sync listener
 * reacted to every teammate's write by INVALIDATING it, so each save anywhere in the
 * office pulled all 5.2 MB again, recomputed every stock screen and re-serialised the
 * cache. That is what "the app feels always stuck" was made of.
 *
 * Firestore already streams deltas to an open listener, so the listener IS the loader
 * now: one full read per session, then only the documents that actually changed, applied
 * straight into the query cache. No refetch, no second copy, and the screens update
 * themselves — which is also what "not good synchronization" was asking for.
 *
 * The subscription is shared by every screen and outlives a tab switch (KEEP_ALIVE_MS),
 * so walking Stocks → Cashflow → Stocks costs nothing.
 */

const KEEP_ALIVE_MS = 5 * 60_000;

type Waiter = { resolve: (rows: any[]) => void; reject: (e: any) => void };

let current: {
  uid: string;
  unsub: () => void;
  rows: any[] | null;
  waiters: Waiter[];
  refs: number;
  idle: ReturnType<typeof setTimeout> | null;
} | null = null;

const stop = () => {
  if (!current) return;
  current.unsub();
  if (current.idle) clearTimeout(current.idle);
  current = null;
};

function start(uid: string, qc: QueryClient) {
  const state = {
    uid,
    unsub: () => {},
    rows: null as any[] | null,
    waiters: [] as Waiter[],
    refs: 0,
    idle: null as ReturnType<typeof setTimeout> | null,
  };
  state.unsub = onSnapshot(
    collection(db, uid, 'data', 'stocks'),
    (snap) => {
      // Local writes are INCLUDED on purpose: Firestore hands us the new row before the
      // server confirms it, so a save the user just made shows up in the same frame.
      const rows = snap.docs.map((d) => d.data()).filter(Boolean);
      state.rows = rows;
      qc.setQueryData([STOCK_LOTS_KEY, uid], rows);
      state.waiters.splice(0).forEach((w) => w.resolve(rows));
    },
    (err) => {
      // Permission or transport failure: hand the error to whoever is waiting and let
      // the query fall back to a plain read on its next attempt.
      state.waiters.splice(0).forEach((w) => w.reject(err));
      if (current === state) stop();
    }
  );
  current = state;
  return state;
}

/** Rows as soon as the ledger has them — the first snapshot, or the live copy already held. */
export function lotsReady(uid: string, qc: QueryClient): Promise<any[]> {
  const state = current?.uid === uid ? current : (stop(), start(uid, qc));
  if (state.rows) return Promise.resolve(state.rows);
  return new Promise<any[]>((resolve, reject) => state.waiters.push({ resolve, reject }));
}

/** Keep the ledger live while a screen is mounted; it lingers briefly after the last one. */
export function holdLots(uid: string, qc: QueryClient): () => void {
  const state = current?.uid === uid ? current : (stop(), start(uid, qc));
  state.refs += 1;
  if (state.idle) {
    clearTimeout(state.idle);
    state.idle = null;
  }
  return () => {
    state.refs -= 1;
    if (state.refs > 0 || current !== state) return;
    state.idle = setTimeout(() => {
      if (current === state && state.refs === 0) stop();
    }, KEEP_ALIVE_MS);
  };
}

/** Sign-out: drop the listener so the next account starts clean. */
export const stopLotsLedger = stop;
