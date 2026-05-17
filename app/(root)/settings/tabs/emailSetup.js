'use client';
import { useContext, useEffect, useRef, useState } from 'react';
import { Mail, CheckCircle2, AlertTriangle, Loader2, ExternalLink, Copy, Check, Clock } from 'lucide-react';
import { authedFetch } from '@utils/aiClient';
import { SettingsContext } from '@contexts/useSettingsContext';
import { UserAuth } from '@contexts/useAuthContext';

function CodeBlock({ children }) {
    const [copied, setCopied] = useState(false);
    const copy = async () => {
        try {
            await navigator.clipboard.writeText(children);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch { /* clipboard blocked */ }
    };
    return (
        <div
            className='relative rounded-lg p-2.5 mt-1 mb-2 font-mono'
            style={{ background: '#0f172a', color: '#e2e8f0', fontSize: '0.65rem' }}
        >
            <button
                onClick={copy}
                className='absolute top-1.5 right-1.5 p-1 rounded hover:bg-white/10 transition-colors'
                title='Copy'
            >
                {copied ? <Check className='w-3 h-3' style={{ color: '#86efac' }} /> : <Copy className='w-3 h-3' style={{ color: '#94a3b8' }} />}
            </button>
            <pre className='whitespace-pre-wrap pr-6'>{children}</pre>
        </div>
    );
}

const EmailSetup = () => {
    const { settings, updateSettings } = useContext(SettingsContext);
    const { uidCollection } = UserAuth();

    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Reminder cadence — how often the Bell icon should "ask" for a follow-up reminder
    const settingsCadence = settings?.ReminderCadence?.days;
    const [cadence, setCadence] = useState(() => {
        const n = parseFloat(settingsCadence);
        return Number.isFinite(n) && n > 0 ? n : 7;
    });
    const cadenceTimer = useRef(null);

    useEffect(() => {
        const n = parseFloat(settingsCadence);
        if (Number.isFinite(n) && n > 0) setCadence(n);
    }, [settingsCadence]);

    const handleCadenceChange = (val) => {
        const n = parseFloat(val);
        if (!Number.isFinite(n) || n < 1 || n > 90) return;
        setCadence(n);
        if (cadenceTimer.current) clearTimeout(cadenceTimer.current);
        cadenceTimer.current = setTimeout(() => {
            if (uidCollection) updateSettings(uidCollection, { days: n }, 'ReminderCadence', true);
        }, 600);
    };

    const fetchStatus = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await authedFetch('/api/ai/email-status');
            if (!res.ok) throw new Error('Could not check status');
            const data = await res.json();
            setStatus(data);
        } catch (e) {
            setError(e.message || 'Failed to check email config');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchStatus(); }, []);

    return (
        <div className='p-3 space-y-3'>
            {/* Status card */}
            <div className='rounded-xl p-4' style={{ border: '1px solid #b8ddf8', background: '#f8fbff' }}>
                <div className='flex items-center justify-between mb-3'>
                    <div className='flex items-center gap-2'>
                        <Mail className='w-4 h-4' style={{ color: 'var(--endeavour)' }} />
                        <span className='font-semibold' style={{ fontSize: '0.78rem', color: 'var(--chathams-blue)' }}>
                            Payment Reminder Emails
                        </span>
                    </div>
                    <button
                        onClick={fetchStatus}
                        disabled={loading}
                        className='px-2.5 py-1 rounded-full border transition-colors hover:border-[var(--endeavour)] disabled:opacity-50'
                        style={{ fontSize: '0.6rem', borderColor: '#b8ddf8', color: 'var(--chathams-blue)' }}
                    >
                        {loading ? <Loader2 className='w-2.5 h-2.5 animate-spin inline' /> : 'Re-check'}
                    </button>
                </div>

                {loading && (
                    <div className='flex items-center gap-2'>
                        <Loader2 className='w-3.5 h-3.5 animate-spin' style={{ color: 'var(--endeavour)' }} />
                        <span style={{ fontSize: '0.7rem', color: 'var(--regent-gray)' }}>Checking server config…</span>
                    </div>
                )}

                {!loading && error && (
                    <div className='flex items-center gap-2 px-3 py-2 rounded-lg' style={{ background: '#fee2e2', border: '1px solid #fca5a5' }}>
                        <AlertTriangle className='w-3.5 h-3.5' style={{ color: '#991b1b' }} />
                        <span style={{ fontSize: '0.65rem', color: '#991b1b' }}>{error}</span>
                    </div>
                )}

                {!loading && status && (
                    <>
                        {status.ready ? (
                            <div className='flex items-start gap-2 px-3 py-2.5 rounded-lg' style={{ background: '#f0fdf4', border: '1px solid #86efac' }}>
                                <CheckCircle2 className='w-4 h-4 flex-shrink-0 mt-0.5' style={{ color: '#16a34a' }} />
                                <div>
                                    <p className='font-semibold' style={{ fontSize: '0.7rem', color: '#15803d' }}>
                                        Email sending is configured
                                    </p>
                                    <p style={{ fontSize: '0.62rem', color: '#15803d', marginTop: '2px' }}>
                                        Sending from <code style={{ background: '#dcfce7', padding: '1px 4px', borderRadius: '3px' }}>{status.fromEmail}</code>
                                        {status.fromDomain && (
                                            <> — make sure <strong>{status.fromDomain}</strong> is verified in your Resend dashboard for best deliverability.</>
                                        )}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className='flex items-start gap-2 px-3 py-2.5 rounded-lg' style={{ background: '#fff3cd', border: '1px solid #ffc107' }}>
                                <AlertTriangle className='w-4 h-4 flex-shrink-0 mt-0.5' style={{ color: '#d97706' }} />
                                <div>
                                    <p className='font-semibold' style={{ fontSize: '0.7rem', color: '#92400e' }}>
                                        Email sending is NOT configured
                                    </p>
                                    <p style={{ fontSize: '0.62rem', color: '#92400e', marginTop: '2px' }}>
                                        Missing:{' '}
                                        {!status.hasApiKey && <code style={{ background: '#fde68a', padding: '1px 4px', borderRadius: '3px', marginRight: '4px' }}>RESEND_API_KEY</code>}
                                        {!status.hasFromEmail && <code style={{ background: '#fde68a', padding: '1px 4px', borderRadius: '3px' }}>RESEND_FROM_EMAIL</code>}
                                    </p>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Cadence */}
            <div className='rounded-xl p-4' style={{ border: '1px solid #b8ddf8', background: '#f8fbff' }}>
                <div className='flex items-center justify-between gap-3 flex-wrap'>
                    <div className='flex items-start gap-2 min-w-0 flex-1'>
                        <Clock className='w-4 h-4 mt-0.5 flex-shrink-0' style={{ color: 'var(--endeavour)' }} />
                        <div>
                            <p className='font-semibold' style={{ fontSize: '0.72rem', color: 'var(--chathams-blue)' }}>
                                Reminder cadence
                            </p>
                            <p style={{ fontSize: '0.62rem', color: 'var(--regent-gray)', marginTop: '2px' }}>
                                The Bell icon on the Invoices page shows a red dot when an invoice is still unpaid this many days after the last reminder.
                            </p>
                        </div>
                    </div>
                    <div className='flex items-center gap-1.5'>
                        <input
                            type='number'
                            min='1'
                            max='90'
                            step='1'
                            value={cadence}
                            onChange={e => handleCadenceChange(e.target.value)}
                            aria-label='Reminder cadence in days'
                            className='w-16 text-center rounded-full border px-2 py-1 outline-none focus:border-[var(--endeavour)] focus:ring-2 focus:ring-[var(--endeavour)]/20'
                            style={{ fontSize: '0.68rem', borderColor: '#b8ddf8', background: 'white', color: 'var(--port-gore)' }}
                        />
                        <span style={{ fontSize: '0.65rem', color: 'var(--chathams-blue)' }}>days</span>
                    </div>
                </div>
            </div>

            {/* Setup steps */}
            <div className='rounded-xl p-4' style={{ border: '1px solid #b8ddf8', background: 'white' }}>
                <p className='font-semibold mb-2' style={{ fontSize: '0.72rem', color: 'var(--chathams-blue)' }}>
                    Setup steps {status?.ready && <span style={{ color: '#16a34a' }}>(complete ✓)</span>}
                </p>

                <ol className='space-y-3' style={{ fontSize: '0.68rem', color: 'var(--port-gore)' }}>
                    <li>
                        <span className='font-semibold' style={{ color: 'var(--chathams-blue)' }}>1. Create a Resend account.</span>
                        <a
                            href='https://resend.com/signup'
                            target='_blank'
                            rel='noopener noreferrer'
                            className='inline-flex items-center gap-1 ml-2 underline'
                            style={{ color: 'var(--endeavour)', fontSize: '0.65rem' }}
                        >
                            resend.com/signup <ExternalLink className='w-2.5 h-2.5' />
                        </a>
                    </li>
                    <li>
                        <span className='font-semibold' style={{ color: 'var(--chathams-blue)' }}>2. Create an API key</span> in the Resend dashboard (API Keys → Create).
                    </li>
                    <li>
                        <span className='font-semibold' style={{ color: 'var(--chathams-blue)' }}>3. Verify your sending domain</span> in Resend (Domains → Add Domain → add the DNS records).
                        <p style={{ fontSize: '0.6rem', color: 'var(--regent-gray)', marginTop: '2px' }}>
                            Without domain verification, emails will go to spam or bounce. This is the most common reason reminders fail.
                        </p>
                    </li>
                    <li>
                        <span className='font-semibold' style={{ color: 'var(--chathams-blue)' }}>4. Add these to your <code>.env.local</code> file</span> at the project root:
                        <CodeBlock>{`RESEND_API_KEY=re_your_key_here
RESEND_FROM_EMAIL=billing@yourdomain.com`}</CodeBlock>
                    </li>
                    <li>
                        <span className='font-semibold' style={{ color: 'var(--chathams-blue)' }}>5. Restart your dev server</span> for the env vars to load, then click <strong>Re-check</strong> above.
                    </li>
                </ol>
            </div>

            <p style={{ fontSize: '0.58rem', color: 'var(--regent-gray)', textAlign: 'center' }}>
                The Bell icon on the Invoices page sends AI-generated reminders. The 24-hour cooldown prevents spam.
            </p>
        </div>
    );
};

export default EmailSetup;
