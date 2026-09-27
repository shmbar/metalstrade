import { useQuery } from '@tanstack/react-query';
import { hasFiles } from '@/data/storage';

/**
 * Whether an expense has its invoice attached: true, false, or undefined while unknown.
 * An expense's documents live in a Storage folder named by the expense id — the same one
 * web's Files button and Autofill-from-PDF write to. A failed listing makes no claim either
 * way (web ExpenseInvoiceCell). Keyed under ['files', id] so the Attachments screen's
 * upload/delete invalidation refreshes the paperclip too.
 */
export function useHasAttachment(expenseId: string | undefined) {
  const q = useQuery({
    enabled: !!expenseId,
    queryKey: ['files', expenseId, 'has'],
    queryFn: () => hasFiles(expenseId as string),
    staleTime: Infinity,
    retry: false,
  });
  return q.isError ? undefined : q.data;
}
