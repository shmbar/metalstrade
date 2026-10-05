import type { QueryClient } from '@tanstack/react-query';
import { clearCollectionReadsOnChange } from '@/data/collectionReads';

/**
 * Keeps the screens' shared reads (data/collectionReads.ts) honest. A query is invalidated
 * when what it shows may have changed — after a save, or a teammate's change arriving
 * through live sync — so the shared copies are dropped before the refetch that follows
 * reads them. A burst of invalidations in one tick drops them once, so the refetches it
 * starts share new reads instead of each making its own.
 */
export function dropSharedReadsOnInvalidate(qc: QueryClient): () => void {
  return qc.getQueryCache().subscribe((event) => {
    if (event.type === 'updated' && event.action.type === 'invalidate') clearCollectionReadsOnChange();
  });
}
