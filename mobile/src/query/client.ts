import { QueryClient, MutationCache, onlineManager } from '@tanstack/react-query';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Network from 'expo-network';
import { toast } from '@/store/toast';
import { haptics } from '@/lib/haptics';

declare module '@tanstack/react-query' {
  interface Register {
    mutationMeta: {
      /**
       * The confirmation the web app shows for this action ("Invoice successfully saved!",
       * "Expense successfully deleted!" …). A string, or built from the result and the
       * call's variables; return null for no toast (e.g. a delete the server refused).
       */
      success?: string | ((data: any, variables: any) => string | null | undefined);
    };
  }
}

/* Every save, edit, update and delete confirms itself the way web does — a toast with
   web's own wording — from ONE place. Each mutation names its message beside its
   mutationFn; nothing on a screen has to remember to say it, so no action can silently
   succeed. Failures stay with the screens, which already explain them — but every one is
   felt the same way, with one error pulse, whether the screen shows a toast or an Alert. */
const mutationCache = new MutationCache({
  onSuccess: (data, variables, _context, mutation) => {
    const s = mutation.options.meta?.success;
    const msg = typeof s === 'function' ? s(data, variables) : s;
    if (msg) toast.success(msg);
  },
  onError: () => haptics.error(),
});

// Server cache for Firestore reads. Generous staleTime keeps navigation snappy;
// gcTime is a week so the persisted cache survives restarts and the app can
// render real data with no connection (offline mode).
export const queryClient = new QueryClient({
  mutationCache,
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      gcTime: 1000 * 60 * 60 * 24 * 7,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Live market data — metal prices polled every 60 s, FX every 30 min — lives on
// its OWN client that is never persisted. The persister below re-serialises the
// ENTIRE app cache after any query update; measured against production data on
// 2026-09-11 that is ~10.7 MB for an ordinary session (3,325 stock lots alone are
// 5.1 MB), 154 ms of JSON.stringify on a laptop and several times that on a phone.
// Polling prices on the persisted client would schedule that freeze every minute;
// on this one a price tick touches nothing else.
export const marketsQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      gcTime: 1000 * 60 * 30,
    },
  },
});

// Persist the query cache to device storage so previously loaded contracts,
// invoices, stocks etc. render instantly on launch — even with no internet.
//
// throttleTime was 2 s. Every refetch — each screen visit past staleTime, each
// live-sync event from a teammate — re-serialised those ~10.7 MB on the JS thread
// two seconds later, and a tap that landed in that window did nothing: the
// client's "some need to press a few times". At 30 s the offline copy is at most
// half a minute behind, and the stall is rare instead of constant.
export const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'ims-query-cache',
  throttleTime: 30_000,
});

// Feed real connectivity into TanStack Query so it pauses/retries fetches
// correctly and we can show the offline banner from the same source of truth.
onlineManager.setEventListener((setOnline) => {
  const sub = Network.addNetworkStateListener((state) => {
    setOnline(!!state.isConnected && state.isInternetReachable !== false);
  });
  Network.getNetworkStateAsync()
    .then((state) => setOnline(!!state.isConnected && state.isInternetReachable !== false))
    .catch(() => {});
  return () => sub.remove();
});

export const qk = {
  contracts: (uid: string, start: string, end: string) => ['contracts', uid, start, end] as const,
  contractInvoices: (uid: string, start: string, end: string) =>
    ['contract-invoices', uid, start, end] as const,
  receivables: (uid: string) => ['receivables', uid] as const,
  miscInvoices: (uid: string, start: string, end: string) => ['misc-invoices', uid, start, end] as const,
};
