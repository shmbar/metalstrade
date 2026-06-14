'use client';
import { useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, FileWarning, TrendingDown, Bell, Loader2 } from 'lucide-react';
import { SettingsContext } from '@contexts/useSettingsContext';
import { UserAuth } from '@contexts/useAuthContext';
import { loadData, loadMarginsRange, resolveDueDate, ensureNotification } from '@utils/utils';
import { receivables as financeReceivables, groupInvoices, isOverdue, invoiceBalance } from '@utils/finance';

// Compact pill button used for each alert chip
function AlertPill({ icon: Icon, label, count, severity, onClick }) {
    const palette = {
        red: { bg: '#fee2e2', border: '#fca5a5', text: '#991b1b' },
        amber: { bg: '#fff3cd', border: '#ffc107', text: '#92400e' },
        green: { bg: '#d1fae5', border: '#86efac', text: '#065f46' },
        blue: { bg: '#dbeeff', border: '#b8ddf8', text: 'var(--chathams-blue)' },
    }[severity];
    return (
        <button
            onClick={onClick}
            aria-label={`${label}: ${count}`}
            className='flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--endeavour)]/30'
            style={{
                background: palette.bg,
                border: `1px solid ${palette.border}`,
                fontSize: '0.65rem',
                color: palette.text,
                fontWeight: 600,
            }}
        >
            <Icon className='w-3.5 h-3.5' aria-hidden='true' />
            <span>{label}</span>
            <span
                className='px-1.5 py-0.5 rounded-full'
                style={{ background: 'white', fontSize: '0.58rem', minWidth: '18px', textAlign: 'center' }}
            >
                {count}
            </span>
        </button>
    );
}

const AIAlertsBar = () => {
    const router = useRouter();
    const { settings, compData, dateSelect } = useContext(SettingsContext);
    const termDays = parseInt(compData?.defaultTermDays, 10) > 0 ? parseInt(compData.defaultTermDays, 10) : 30;
    const { uidCollection } = UserAuth();

    const [counts, setCounts] = useState({ balance: 0, due: 0, marginAlerts: 0, recentReminders: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            if (!uidCollection || !dateSelect) return;
            setLoading(true);
            try {
                // Outstanding receivables are a running total, not a single-year flow — an
                // unpaid 2024/2025 invoice is still money owed today. Load a multi-year
                // window (last 4 years) so the alert reflects TRUE outstanding, not just
                // invoices dated in the currently-selected period. Margin alerts stay
                // scoped to the selected period (margins are a period figure).
                const curYr = new Date().getFullYear();
                const outstandingRange = { start: `${curYr - 3}-01-01`, end: `${curYr}-12-31` };
                const [invoices, margins] = await Promise.all([
                    loadData(uidCollection, 'invoices', outstandingRange),
                    loadMarginsRange(uidCollection, dateSelect),
                ]);
                if (cancelled) return;

                const today = new Date();

                // Receivables via the canonical finance module — deduped (an invoice + its
                // Credit/Final note count ONCE, payments combined), balance = total − payments
                // (same rule the Cashflow page uses), draft/canceled excluded. `due` = overdue
                // (past due date); `balance` = owed but not yet due.
                const recv = financeReceivables(invoices, { asOf: today, termDays });
                let due = 0;
                let balance = 0;
                Object.values(recv.byCur).forEach(s => { due += s.dueCount; balance += s.balanceCount; });

                // Overdue invoices (for the bell notifications) — same canonical rule.
                const overdueInvs = groupInvoices(invoices)
                    .filter(inv => isOverdue(inv, today, termDays))
                    .map(inv => ({ ...inv, _balanceDue: invoiceBalance(inv), _dueDate: resolveDueDate(inv) }));

                // Reminders sent in the last 7 days.
                let recentReminders = 0;
                const reminderCutoff = Date.now() - 7 * 86400000;
                invoices.forEach(inv => {
                    (inv.reminders || []).forEach(r => {
                        if (r.sentAt && new Date(r.sentAt).getTime() >= reminderCutoff) recentReminders++;
                    });
                });

                // Turn overdue receivables into real (idempotent) notifications so they
                // surface in the bell, not just as a count. ensureNotification is
                // create-if-absent — repeated dashboard loads neither duplicate nor
                // reset read/snooze. Capped to avoid a burst of reads.
                overdueInvs.slice(0, 50).forEach(inv => {
                    const days = Math.max(0, Math.ceil((today.getTime() - new Date(inv._dueDate).getTime()) / 86400000));
                    const clientName = settings?.Client?.Client?.find(c => c.id === inv.client)?.nname || 'client';
                    const cur = settings?.Currency?.Currency?.find(c => c.id === inv.cur)?.cur || '';
                    ensureNotification(uidCollection, `overdue:invoice:${inv.id}`, {
                        type: 'settlement.overdue', entityType: 'invoice', entityId: inv.id || '',
                        entityLabel: `Invoice #${inv.invoice ?? ''}`, action: 'overdue', severity: 'warning',
                        message: `Invoice #${inv.invoice ?? ''} overdue ${days}d — ${cur} ${Number(inv._balanceDue || 0).toFixed(2)} (${clientName})`,
                    });
                });

                // Margin alerts: only REAL risks — margin was entered and total profit
                // is ≤ threshold. Rows with no margin entered are data gaps, not alerts.
                const threshold = settings?.MarginAlert?.threshold != null
                    ? parseFloat(settings.MarginAlert.threshold)
                    : 0;
                let marginAlerts = 0;
                margins.forEach(monthRow => {
                    (monthRow.items || []).forEach(item => {
                        const qty = parseFloat(item.purchase) || 0;
                        const perUnitMargin = parseFloat(item.margin) || 0;
                        const totalMargin = parseFloat(item.totalMargin) || 0;
                        const hasContent = (item.description && String(item.description).trim())
                            || qty > 0 || perUnitMargin !== 0 || totalMargin !== 0;
                        if (!hasContent) return;
                        const marginEntered = perUnitMargin !== 0 || totalMargin !== 0;
                        if (!marginEntered) return; // incomplete row — not a financial alert
                        if (totalMargin <= threshold) marginAlerts++;
                    });
                });

                setCounts({ balance, due, marginAlerts, recentReminders });
            } catch {
                // Soft fail — dashboard shouldn't break if this widget fails
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        load();
        return () => { cancelled = true; };
    }, [uidCollection, dateSelect, settings, termDays]);

    if (loading) {
        return (
            <div className='flex items-center gap-2 px-3 py-2.5 rounded-xl mb-3 shadow-sm' style={{ border: '1px solid #e6eef8', background: '#ffffff' }}>
                <Loader2 className='w-3.5 h-3.5 animate-spin' style={{ color: 'var(--endeavour)' }} />
                <span style={{ fontSize: '0.65rem', color: 'var(--regent-gray)' }}>Checking alerts…</span>
            </div>
        );
    }

    const hasAny = counts.balance > 0 || counts.due > 0 || counts.marginAlerts > 0 || counts.recentReminders > 0;
    if (!hasAny) {
        return (
            <div className='flex items-center gap-2 px-3 py-2 rounded-xl mb-3' style={{ border: '1px solid #86efac', background: '#f0fdf4' }}>
                <AlertTriangle className='w-3.5 h-3.5' style={{ color: '#16a34a' }} />
                <span style={{ fontSize: '0.65rem', color: '#15803d', fontWeight: 600 }}>
                    All clear — no outstanding receivables or margin alerts.
                </span>
            </div>
        );
    }

    return (
        <div
            className='flex flex-wrap items-center gap-2 px-3 py-2.5 rounded-xl mb-3 shadow-sm'
            style={{ border: '1px solid #e6eef8', background: '#ffffff' }}
            role='region'
            aria-label='AI alerts summary'
        >
            <span className='flex items-center gap-1.5' style={{ fontSize: '0.65rem', color: 'var(--chathams-blue)', fontWeight: 600 }}>
                <span className='relative flex h-2 w-2'>
                    <span className='absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping' />
                    <span className='relative inline-flex rounded-full h-2 w-2 bg-emerald-500' />
                </span>
                Live alerts
            </span>
            {counts.due > 0 && (
                <AlertPill
                    icon={FileWarning}
                    label='Due invoices'
                    count={counts.due}
                    severity='red'
                    onClick={() => router.push('/invoices')}
                />
            )}
            {counts.balance > 0 && (
                <AlertPill
                    icon={FileWarning}
                    label='Balance invoices'
                    count={counts.balance}
                    severity='amber'
                    onClick={() => router.push('/invoices')}
                />
            )}
            {counts.marginAlerts > 0 && (
                <AlertPill
                    icon={TrendingDown}
                    label='Margin alerts'
                    count={counts.marginAlerts}
                    severity='amber'
                    onClick={() => router.push('/margins')}
                />
            )}
            {counts.recentReminders > 0 && (
                <AlertPill
                    icon={Bell}
                    label='Reminders sent (7d)'
                    count={counts.recentReminders}
                    severity='blue'
                    onClick={() => router.push('/invoices')}
                />
            )}
        </div>
    );
};

export default AIAlertsBar;
