import { QueryClient } from '@tanstack/react-query';

// Server cache for Firestore reads. Generous staleTime keeps navigation snappy
// and offline-friendly; screens expose pull-to-refresh for an explicit refetch.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      gcTime: 1000 * 60 * 30,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export const qk = {
  contracts: (uid: string, start: string, end: string) => ['contracts', uid, start, end] as const,
  contractInvoices: (uid: string, start: string, end: string) =>
    ['contract-invoices', uid, start, end] as const,
  receivables: (uid: string) => ['receivables', uid] as const,
  miscInvoices: (uid: string, start: string, end: string) => ['misc-invoices', uid, start, end] as const,
};
