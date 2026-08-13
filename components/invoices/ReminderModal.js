'use client';
import { useState } from 'react';
import { Bell, Loader2, Send, X, Sparkles, CheckCircle2, AlertTriangle, Mail, Paperclip } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { authedFetch } from '../../utils/aiClient';
import { resolveDueDate, resolveInvoiceDate } from '../../utils/utils';
import { TONES } from '../statusUtils';

const ReminderModal = ({ invoice, clientEmail: initialEmail, companyName, language, onClose }) => {
    const [email, setEmail] = useState(initialEmail || '');
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [generating, setGenerating] = useState(false);
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState(null);
    const [attachSummary, setAttachSummary] = useState(true);

    // Build a simple invoice summary PDF client-side and return base64 — keeps the
    // formal contract-PDF generator out of the dependency chain since it expects state
    // we don't have here. This is a clean fallback document for the client.
    const buildSummaryPdfBase64 = () => {
        try {
            const doc = new jsPDF();
            const balance = `${invoice.currency || ''} ${Number(invoice.balanceDue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            const due = invoice.dueDate || resolveDueDate(invoice) || '—';

            doc.setFontSize(16);
            doc.text(companyName || 'Payment Reminder', 20, 25);
            doc.setFontSize(11);
            doc.text('Payment Reminder', 20, 35);

            doc.setDrawColor(184, 221, 248);
            doc.line(20, 40, 190, 40);

            doc.setFontSize(10);
            let y = 55;
            const row = (label, value) => {
                doc.setFont(undefined, 'bold');
                doc.text(label, 20, y);
                doc.setFont(undefined, 'normal');
                doc.text(String(value ?? '—'), 75, y);
                y += 8;
            };
            row('Invoice #:', invoice.number || invoice.invoice || '—');
            row('Client:', invoice.client || '—');
            row('Balance Due:', balance);
            row('Due Date:', due);
            row('Status:', invoice.paymentStatus || '—');

            y += 6;
            doc.setFontSize(9);
            doc.setTextColor(120);
            const generatedDate = new Date().toISOString().split('T')[0];
            doc.text(`Generated ${generatedDate}`, 20, y);

            const dataUri = doc.output('datauristring');
            return dataUri.split('base64,')[1] || null;
        } catch (e) {
            console.warn('Failed to build summary PDF:', e);
            return null;
        }
    };

    const generate = async () => {
        if (generating) return;
        setGenerating(true);
        setError(null);
        try {
            const res = await authedFetch('/api/ai/generate-reminder', {
                method: 'POST',
                body: JSON.stringify({ invoice, clientEmail: email, companyName, language }),
            });
            const data = await res.json();
            if (!res.ok || data.error) throw new Error(data.error || 'Generation failed');
            setSubject(data.subject);
            setBody(data.body);
        } catch (e) {
            setError(e.message);
        } finally {
            setGenerating(false);
        }
    };

    const send = async () => {
        if (!email.trim() || !subject.trim() || !body.trim() || sending) return;
        setSending(true);
        setError(null);
        try {
            const attachmentBase64 = attachSummary ? buildSummaryPdfBase64() : null;
            const attachmentName = attachSummary ? `Invoice-${invoice.number || invoice.invoice || 'summary'}.pdf` : null;

            // The invoice may be from a prior year — send its year so the server
            // targets the correct Firestore collection for cooldown + logging.
            const invDate = resolveInvoiceDate(invoice) || invoice.date || '';
            const invoiceYear = /^\d{4}/.test(String(invDate)) ? String(invDate).slice(0, 4) : null;

            const res = await authedFetch('/api/ai/send-reminder', {
                method: 'POST',
                body: JSON.stringify({
                    invoiceId: invoice.id,
                    invoiceYear,
                    to: email.trim(),
                    subject,
                    body,
                    uidCollection: invoice.uidCollection,
                    companyName,
                    attachmentBase64,
                    attachmentName,
                }),
            });
            const data = await res.json();
            if (!res.ok || data.error) throw new Error(data.error || 'Send failed');
            setSent(true);
        } catch (e) {
            setError(e.message);
        } finally {
            setSending(false);
        }
    };

    const lastReminder = invoice.reminders?.[invoice.reminders.length - 1];
    const hoursSinceLastReminder = lastReminder?.sentAt
        ? (Date.now() - new Date(lastReminder.sentAt).getTime()) / 36e5
        : Infinity;
    const onCooldown = hoursSinceLastReminder < 24;
    const cooldownHoursLeft = onCooldown ? Math.ceil(24 - hoursSinceLastReminder) : 0;

    return (
        <div
            className='fixed inset-0 z-modal flex items-center justify-center p-3 sm:p-4'
            style={{ background: 'var(--overlay)' }}
            role='dialog'
            aria-modal='true'
            aria-labelledby='reminder-modal-title'
        >
            <div className='w-full max-w-lg rounded-2xl bg-[var(--bg-card)] overflow-hidden' style={{ border: '1px solid var(--line)', boxShadow: 'var(--shadow-md)', maxHeight: '92vh' }}>

                {/* Header */}
                <div className='flex items-center justify-between px-4 py-3' style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--line)' }}>
                    <div className='flex items-center gap-2'>
                        <Bell className='w-4 h-4' style={{ color: 'var(--brand)' }} />
                        <div>
                            <p id='reminder-modal-title' className='font-semibold' style={{ fontSize: 'var(--fs-input)', color: 'var(--ink)' }}>
                                Payment Reminder — Invoice #{invoice.number}
                            </p>
                            <p style={{ fontSize: 'var(--fs-table)', color: 'var(--ink-muted)' }}>
                                {invoice.client} · {invoice.currency} {Number(invoice.balanceDue || 0).toFixed(2)} outstanding · {invoice.paymentStatus}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        aria-label='Close reminder modal'
                        className='p-1 rounded-full hover:bg-[var(--bg-subtle)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/40'
                    >
                        <X className='w-4 h-4' style={{ color: 'var(--ink-secondary)' }} />
                    </button>
                </div>

                <div className='overflow-y-auto p-4 space-y-3' style={{ maxHeight: 'calc(90vh - 130px)' }}>

                    {/* Last reminder notice */}
                    {lastReminder && (
                        <div className='flex items-center gap-2 px-3 py-2 rounded-lg' style={{
                            background: onCooldown ? TONES.amber.bg : TONES.green.bg,
                            border: onCooldown ? `1px solid ${TONES.amber.border}` : `1px solid ${TONES.green.border}`
                        }}>
                            {onCooldown
                                ? <AlertTriangle className='w-3 h-3 flex-shrink-0' style={{ color: TONES.amber.text }} />
                                : <CheckCircle2 className='w-3 h-3 flex-shrink-0' style={{ color: TONES.green.text }} />
                            }
                            <span style={{ fontSize: 'var(--fs-table)', color: onCooldown ? TONES.amber.text : TONES.green.text }}>
                                {onCooldown
                                    ? `Reminder sent ${Math.round(hoursSinceLastReminder)}h ago to ${lastReminder.to}. Wait ${cooldownHoursLeft}h to send another.`
                                    : `Last reminder sent ${new Date(lastReminder.sentAt).toLocaleDateString()} to ${lastReminder.to}`}
                            </span>
                        </div>
                    )}

                    {/* Recipient email */}
                    <div>
                        <label className='block font-semibold mb-1' style={{ fontSize: 'var(--fs-table)', color: 'var(--ink)' }}>
                            Recipient Email
                        </label>
                        <div className='flex items-center gap-2 px-3 py-1.5 rounded-lg border focus-within:border-[var(--brand)] transition-colors'
                            style={{ borderColor: 'var(--line-strong)', background: 'var(--bg-subtle)' }}>
                            <Mail className='w-3 h-3 flex-shrink-0' style={{ color: 'var(--ink-muted)' }} />
                            <input
                                type='email'
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder='client@email.com'
                                className='flex-1 outline-none bg-transparent'
                                style={{ fontSize: 'var(--fs-body)', color: 'var(--ink)' }}
                            />
                        </div>
                        {!initialEmail && (
                            <p style={{ fontSize: 'var(--fs-caption)', color: TONES.amber.text, marginTop: '3px' }}>
                                Add client email in Settings → Clients to pre-fill this field.
                            </p>
                        )}
                    </div>

                    {/* Generate button */}
                    {!body && (
                        <button onClick={generate} disabled={generating || !email.trim()}
                            className='w-full flex items-center justify-center gap-2 py-2 rounded-2xl font-medium transition-all disabled:opacity-50'
                            style={{ background: 'var(--brand)', color: 'var(--on-brand)', fontSize: 'var(--fs-input)' }}>
                            {generating ? <><Loader2 className='w-4 h-4 animate-spin' /> Generating email…</> : <><Sparkles className='w-4 h-4' /> Generate Reminder Email</>}
                        </button>
                    )}

                    {/* Email fields */}
                    {(subject || body) && (
                        <div className='space-y-2'>
                            <div>
                                <label className='block font-semibold mb-1' style={{ fontSize: 'var(--fs-table)', color: 'var(--ink)' }}>Subject</label>
                                <input
                                    type='text'
                                    value={subject}
                                    onChange={e => setSubject(e.target.value)}
                                    className='w-full px-3 py-1.5 rounded-lg border outline-none focus:border-[var(--brand)] transition-colors'
                                    style={{ fontSize: 'var(--fs-body)', borderColor: 'var(--line-strong)', background: 'var(--bg-subtle)', color: 'var(--ink)' }}
                                />
                            </div>
                            <div>
                                <div className='flex items-center justify-between mb-1'>
                                    <label className='font-semibold' style={{ fontSize: 'var(--fs-table)', color: 'var(--ink)' }}>Email Body</label>
                                    <button onClick={generate} disabled={generating}
                                        className='flex items-center gap-1 px-2 py-0.5 rounded-full transition-colors disabled:opacity-50'
                                        style={{ fontSize: 'var(--fs-caption)', background: 'var(--bg-subtle)', border: '1px solid var(--line-strong)', color: 'var(--ink-secondary)' }}>
                                        {generating ? <Loader2 className='w-2.5 h-2.5 animate-spin' /> : <Sparkles className='w-2.5 h-2.5' />}
                                        Regenerate
                                    </button>
                                </div>
                                <textarea
                                    rows={7}
                                    value={body}
                                    onChange={e => setBody(e.target.value)}
                                    className='w-full px-3 py-2 rounded-2xl border outline-none focus:border-[var(--brand)] transition-colors resize-none'
                                    style={{ fontSize: 'var(--fs-body)', borderColor: 'var(--line-strong)', background: 'var(--bg-subtle)', color: 'var(--ink)', fontFamily: 'inherit', lineHeight: '1.5' }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Attach summary PDF */}
                    {body && !sent && (
                        <label
                            className='flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors'
                            style={{ background: attachSummary ? TONES.green.bg : 'var(--bg-subtle)', border: `1px solid ${attachSummary ? TONES.green.border : 'var(--line)'}` }}
                        >
                            <input
                                type='checkbox'
                                checked={attachSummary}
                                onChange={e => setAttachSummary(e.target.checked)}
                                className='cursor-pointer'
                            />
                            <Paperclip className='w-3 h-3' style={{ color: attachSummary ? TONES.green.text : 'var(--ink-muted)' }} />
                            <span style={{ fontSize: 'var(--fs-table)', color: attachSummary ? TONES.green.text : 'var(--ink-secondary)' }}>
                                Attach invoice summary PDF
                            </span>
                        </label>
                    )}

                    {/* Error */}
                    {error && (
                        <div className='flex items-center gap-2 px-3 py-2 rounded-lg' style={{ background: TONES.red.bg, border: `1px solid ${TONES.red.border}` }}>
                            <AlertTriangle className='w-3.5 h-3.5 flex-shrink-0' style={{ color: TONES.red.text }} />
                            <span style={{ fontSize: 'var(--fs-table)', color: TONES.red.text }}>{error}</span>
                        </div>
                    )}

                    {/* Success */}
                    {sent && (
                        <div className='flex items-center gap-2 px-3 py-2 rounded-lg' style={{ background: TONES.green.bg, border: `1px solid ${TONES.green.border}` }}>
                            <CheckCircle2 className='w-3.5 h-3.5 flex-shrink-0' style={{ color: TONES.green.text }} />
                            <span style={{ fontSize: 'var(--fs-body)', color: TONES.green.text, fontWeight: 600 }}>Reminder sent to {email}</span>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className='flex items-center justify-end gap-2 px-4 py-3' style={{ borderTop: '1px solid var(--line)', background: 'var(--bg-subtle)' }}>
                    <button onClick={onClose} className='px-3 py-1.5 rounded-lg border transition-colors hover:border-[var(--brand)]'
                        style={{ fontSize: 'var(--fs-table)', borderColor: 'var(--line-strong)', color: 'var(--ink-secondary)' }}>
                        {sent ? 'Close' : 'Cancel'}
                    </button>
                    {!sent && body && (
                        <button onClick={send} disabled={sending || onCooldown || !email.trim() || !subject.trim() || !body.trim()}
                            className='flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[var(--on-brand)] font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed'
                            style={{ fontSize: 'var(--fs-table)', background: onCooldown ? 'var(--ink-muted)' : 'var(--brand)' }}
                            title={onCooldown ? `Cooldown active — wait ${cooldownHoursLeft}h` : undefined}>
                            {sending ? <Loader2 className='w-3 h-3 animate-spin' /> : <Send className='w-3 h-3' />}
                            {sending ? 'Sending…' : onCooldown ? `Wait ${cooldownHoursLeft}h` : 'Send Reminder'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ReminderModal;
