import { QueryClient, onlineManager } from '@tanstack/react-query';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Network from 'expo-network';

// Server cache for Firestore reads. Generous staleTime keeps navigation snappy;
// gcTime is a week so the persisted cache survives restarts and the app can
// render real data with no connection (offline mode).
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      gcTime: 1000 * 60 * 60 * 24 * 7,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Persist the query cache to device storage so previously loaded contracts,
// invoices, stocks etc. render instantly on launch — even with no internet.
export const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'ims-query-cache',
  throttleTime: 2000,
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
