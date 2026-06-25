import { useMutation } from '@tanstack/react-query';
import { useAuth } from '@/store/auth';
import { postJson } from '@/lib/api';

// Generate an AI payment-reminder email draft (web /api/ai/generate-reminder).
export function useGenerateReminder() {
  return useMutation({
    mutationFn: async (args: { invoice: any; clientEmail: string; companyName: string; language?: string }) =>
      postJson<{ subject: string; body: string }>('/api/ai/generate-reminder', {
        invoice: args.invoice,
        clientEmail: args.clientEmail,
        companyName: args.companyName,
        language: args.language || 'English',
      }),
  });
}

// Send the reminder via the server (Resend). Returns {ok} or throws (e.g. 503 if
// RESEND_API_KEY isn't configured on the backend).
export function useSendReminder() {
  const { uidCollection } = useAuth();
  return useMutation({
    mutationFn: async (args: {
      invoiceId: string;
      invoiceYear: string;
      to: string;
      subject: string;
      body: string;
      companyName: string;
      replyTo?: string;
    }) =>
      postJson('/api/ai/send-reminder', {
        invoiceId: args.invoiceId,
        invoiceYear: args.invoiceYear,
        to: args.to,
        subject: args.subject,
        body: args.body,
        uidCollection,
        companyName: args.companyName,
        replyTo: args.replyTo,
      }),
  });
}
