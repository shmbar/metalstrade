import { useEffect, useRef } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { useQueryClient } from '@tanstack/react-query';
import { db } from '@/lib/firebase';

// Live multi-user sync: watch this year's contract/invoice buckets (plus stocks)
// and refresh the query cache whenever ANOTHER session writes. Screens keep
// their fetch-based data flow — this just makes every list update in real time
// when a teammate records a payment or edits a contract.
export function useLiveSync(uidCollection: string | null) {
  const qc = useQueryClient();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!uidCollection) return;
    const year = new Date().getFullYear();

    // Debounced invalidation: a burst of writes triggers one refetch.
    const refresh = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        ['invoices', 'contracts', 'dashboard', 'contract-invoices', 'cashflow', 'expenses', 'stocks', 'briefing'].forEach((key) =>
          qc.invalidateQueries({ queryKey: [key] })
        );
      }, 600);
    };

    const watch = (name: string) => {
      let first = true; // skip the initial full snapshot — only react to real changes
      return onSnapshot(
        collection(db, uidCollection, 'data', name),
        (snap) => {
          if (first) {
            first = false;
            return;
          }
          // Ignore our own optimistic/local writes; those flows already invalidate.
          if (snap.metadata.hasPendingWrites) return;
          refresh();
        },
        () => {} // permission/transport errors: silently drop to fetch-based flow
      );
    };

    const subs = [watch(`invoices_${year}`), watch(`contracts_${year}`), watch('stocks')];
    return () => {
      subs.forEach((u) => u());
      if (timer.current) clearTimeout(timer.current);
    };
  }, [uidCollection, qc]);
}
