import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { focusManager, useQueryClient } from '@tanstack/react-query';

/*
 * Keeps what you are looking at current, without refetching what you are not.
 *
 * Tab screens stay mounted, so nothing used to re-read when you came back to one: a tab
 * opened half an hour earlier still showed the figures from then, and the app only caught
 * up if a live-sync event happened to fire. Now, switching tab or returning to the app
 * refetches the queries that are BOTH on screen and past their staleTime — a couple of
 * hundred KB at most. The 5.2 MB stock ledger is never in that set: it holds a live
 * listener and is never stale (features/stocks/stockLedger.ts).
 */
export function useFreshOnFocus(routeKey: string, enabled: boolean) {
  const qc = useQueryClient();
  const first = useRef(true);

  // Returning to the app from the background counts as a focus, the way a browser tab does.
  useEffect(() => {
    focusManager.setEventListener((handleFocus) => {
      const sub = AppState.addEventListener('change', (state) => handleFocus(state === 'active'));
      return () => sub.remove();
    });
  }, []);

  useEffect(() => {
    if (!enabled) return;
    if (first.current) {
      first.current = false; // the screen just mounted and fetched for itself
      return;
    }
    qc.refetchQueries({ type: 'active', stale: true });
  }, [routeKey, enabled, qc]);
}
