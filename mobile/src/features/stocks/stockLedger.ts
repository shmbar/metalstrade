import { collection, onSnapshot } from 'firebase/firestore';
import type { QueryClient } from '@tanstack/react-query';
import { db } from '@/lib/firebase';
import { readWholeOnce } from '@/data/collectionReads';
import { launch } from '@/features/live/launch';
import { createLedger, LedgerCache } from './ledgerCore';
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
 * COLD START (2026-10-05). When there is no copy of the ledger on the phone at all — the
 * first sign-in, the other company's first visit, a copy older than a week — a screen
 * waiting for the listener's first answer waited 9–12 s: the listener shares the full
 * SDK's one stream, where the 3,358 lots arrive slowly and everything else queues behind
 * them. A plain read of the same collection (data/collectionReads.ts readWholeOnce) is a
 * separate request and takes about 3.5 s, so a cold ledger is read that way first and the
 * listener starts the moment it lands. The rules live in ledgerCore.ts.
 *
 * The subscription is shared by every screen and outlives a tab switch (KEEP_ALIVE_MS),
 * so walking Stocks → Cashflow → Stocks costs nothing.
 */

const KEEP_ALIVE_MS = 5 * 60_000;

const ledger = createLedger({
  listen: (uid, onRows, onError) =>
    onSnapshot(
      collection(db, uid, 'data', 'stocks'),
      // Local writes are INCLUDED on purpose: Firestore hands us the new row before the
      // server confirms it, so a save the user just made shows up in the same frame.
      (snap) => onRows(snap.docs.map((d) => d.data()).filter(Boolean)),
      onError
    ),
  readOnce: async (uid) => (await readWholeOnce(uid, 'data', 'stocks')).map((r) => r.data).filter(Boolean),
  whenRestored: () => launch.whenRestored(),
  setTimer: (fn, ms) => setTimeout(fn, ms),
  clearTimer: (id) => clearTimeout(id as ReturnType<typeof setTimeout>),
  keepAliveMs: KEEP_ALIVE_MS,
});

const cacheOf = (qc: QueryClient): LedgerCache => ({
  get: (uid) => qc.getQueryData([STOCK_LOTS_KEY, uid]),
  set: (uid, rows) => {
    qc.setQueryData([STOCK_LOTS_KEY, uid], rows);
  },
});

/** Rows as soon as the ledger has them — the first read, or the live copy already held. */
export const lotsReady = (uid: string, qc: QueryClient): Promise<any[]> => ledger.lotsReady(uid, cacheOf(qc));

/** Keep the ledger live while a screen is mounted; it lingers briefly after the last one. */
export const holdLots = (uid: string, qc: QueryClient): (() => void) => ledger.holdLots(uid, cacheOf(qc));

/** Sign-out: drop the listener so the next account starts clean. */
export const stopLotsLedger = (): void => ledger.stop();
