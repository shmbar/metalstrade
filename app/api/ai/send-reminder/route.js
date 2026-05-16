import { Resend } from 'resend';
import { db } from '../../../../utils/firebase';
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { guardAiRequest } from '../../../../utils/aiGuard';

const COOLDOWN_HOURS = 24;

let resend;
function getResend() {
    if (!resend) resend = new Resend(process.env.RESEND_API_KEY);
    return resend;
}

function escapeHtml(s = '') {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function bodyToHtml(plainText, companyName) {
    const paragraphs = String(plainText || '')
        .split(/\n\s*\n/)
        .map(p => `<p style="margin:0 0 14px 0;color:#28264f;font-size:14px;line-height:1.55;">${escapeHtml(p).replace(/\n/g, '<br>')}</p>`)
        .join('');

    return `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f8fbff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#f8fbff;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="background:#ffffff;border:1px solid #b8ddf8;border-radius:12px;overflow:hidden;max-width:600px;">
        <tr><td style="background:#dbeeff;padding:16px 24px;border-bottom:1px solid #b8ddf8;">
          <p style="margin:0;font-size:13px;font-weight:600;color:#103a7a;">${escapeHtml(companyName || 'Payment Reminder')}</p>
        </td></tr>
        <tr><td style="padding:24px;">${paragraphs}</td></tr>
        <tr><td style="padding:14px 24px;background:#f8fbff;border-top:1px solid #b8ddf8;">
          <p style="margin:0;font-size:11px;color:#7c8ca8;">This message was sent from ${escapeHtml(companyName || 'our accounts team')}.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

export async function POST(request) {
    const guard = await guardAiRequest(request);
    if (guard.error) return Response.json({ error: guard.error }, { status: guard.status });

    try {
        const { invoiceId, invoiceYear, to, subject, body, uidCollection, companyName, replyTo, attachmentBase64, attachmentName } = await request.json();

        // Invoice docs are stored per-year (invoices_YYYY). Use the invoice's own
        // year if provided; fall back to the current year for legacy callers.
        const invYear = /^\d{4}$/.test(String(invoiceYear)) ? String(invoiceYear) : String(new Date().getFullYear());

        if (!to || !subject || !body) {
            return Response.json({ error: 'Missing required fields: to, subject, body' }, { status: 400 });
        }
        if (!process.env.RESEND_API_KEY) {
            return Response.json({ error: 'Email service not configured. Add RESEND_API_KEY to .env.local' }, { status: 503 });
        }

        // Server-side cooldown check — defends against double-clicks, client-side bypasses,
        // and stale UI showing the button enabled
        if (invoiceId && uidCollection) {
            try {
                const invoiceRef = doc(db, uidCollection, 'data', 'invoices_' + invYear, invoiceId);
                const snap = await getDoc(invoiceRef);
                const reminders = snap.exists() ? (snap.data().reminders || []) : [];
                const last = reminders[reminders.length - 1];
                if (last?.sentAt) {
                    const hoursSince = (Date.now() - new Date(last.sentAt).getTime()) / 36e5;
                    if (hoursSince < COOLDOWN_HOURS) {
                        const wait = Math.ceil(COOLDOWN_HOURS - hoursSince);
                        return Response.json({
                            error: `A reminder was sent ${Math.round(hoursSince)}h ago. Please wait ${wait}h to avoid spamming the client.`
                        }, { status: 429 });
                    }
                }
            } catch (fsErr) {
                // Non-fatal — if Firestore is down we still allow the send rather than blocking
                console.warn('Cooldown check failed (allowing send):', fsErr.message);
            }
        }

        const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@yourdomain.com';
        const fromName = companyName || 'IMS Trading';
        const html = bodyToHtml(body, companyName);

        const payload = {
            from: `${fromName} <${fromEmail}>`,
            to: [to],
            subject,
            text: body,
            html,
        };
        if (replyTo) payload.replyTo = replyTo;
        if (attachmentBase64 && attachmentName) {
            payload.attachments = [{ filename: attachmentName, content: attachmentBase64 }];
        }

        const { data, error } = await getResend().emails.send(payload);

        if (error) {
            console.error('Resend error:', error);
            return Response.json({ error: error.message || 'Failed to send email' }, { status: 500 });
        }

        // Log reminder to Firestore invoice doc
        if (invoiceId && uidCollection) {
            try {
                const invoiceRef = doc(db, uidCollection, 'data', 'invoices_' + invYear, invoiceId);
                await updateDoc(invoiceRef, {
                    reminders: arrayUnion({
                        sentAt: new Date().toISOString(),
                        to,
                        subject,
                        preview: body.slice(0, 120),
                        messageId: data?.id || '',
                        hadAttachment: !!attachmentBase64,
                    })
                });
            } catch (fsErr) {
                // Non-fatal — email was sent successfully, log warning only
                console.warn('Failed to log reminder to Firestore:', fsErr.message);
            }
        }

        return Response.json({ success: true, messageId: data?.id });

    } catch (err) {
        console.error('Send reminder error:', err);
        return Response.json({ error: err.message || 'Failed to send reminder' }, { status: 500 });
    }
}
