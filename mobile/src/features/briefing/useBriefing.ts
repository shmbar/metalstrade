import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/store/auth';
import { useSettings } from '@/store/settings';
import { useInvoices, deriveInvoice } from '@/features/invoices/useInvoices';
import { useMetalPrices } from '@/features/prices/useMetalPrices';
import { apiConfigured, postJson } from '@/lib/api';
import { fmtCurKM, dateLabel } from '@/lib/format';
import { effectiveDueDate, num } from '@shared/finance';
import { arr } from '@/lib/guard';

// Deterministic briefing facts computed from the books the app already loaded.
// The AI only phrases these — every number here is exact.
export interface BriefingFacts {
  firstName: string;
  date: string;
  overdue?: string;
  paymentsRecent?: string;
  shipmentsDue?: string;
  topDebtor?: string;
  metals?: string;
}

const DAY = 86400000;

export function useBriefing() {
  const { uidCollection, currentUser } = useAuth();
  const { settings, compData, loaded } = useSettings();
  const { data: invoices } = useInvoices();
  const { prices } = useMetalPrices();

  const facts: BriefingFacts | null = useMemo(() => {
    if (!invoices || !loaded) return null;
    const now = new Date();
    const termDays = parseInt((compData as any)?.defaultTermDays, 10) > 0 ? parseInt((compData as any).defaultTermDays, 10) : 30;
    const views = invoices.map((inv) => deriveInvoice(inv, settings));

    // Overdue: issued, balance, effective due date past.
    const overdueViews = views.filter((v) => {
      if (!v.issued || v.balance <= 0.01) return false;
      const due = effectiveDueDate(v.raw as any, termDays);
      return due && new Date(due) < now;
    });
    const overdueByCur: Record<string, number> = {};
    overdueViews.forEach((v) => (overdueByCur[v.cur] = (overdueByCur[v.cur] || 0) + v.balance));
    const overdue = overdueViews.length
      ? `${overdueViews.length} invoice(s) overdue, total ${Object.entries(overdueByCur).map(([c, n]) => fmtCurKM(c, n)).join(' + ')}`
      : undefined;

    // Payments recorded in the last 48h.
    const recent: string[] = [];
    views.forEach((v) => {
      arr<any>((v.raw as any).payments).forEach((p) => {
        const d = new Date(dateLabel(p.date || p.pmntDate));
        if (!isNaN(d.getTime()) && now.getTime() - d.getTime() <= 2 * DAY && num(p.pmnt) > 0) {
          recent.push(`${fmtCurKM(v.cur, num(p.pmnt))} from ${v.clientName} (inv #${v.number})`);
        }
      });
    });
    const paymentsRecent = recent.length ? recent.slice(0, 3).join('; ') : undefined;

    // Shipments with ETA within the next 7 days.
    const etas = views
      .map((v) => ({ v, eta: ((v.raw as any).shipData?.eta?.startDate as string) || null }))
      .filter(({ eta }) => {
        if (!eta) return false;
        const d = new Date(eta);
        return !isNaN(d.getTime()) && d >= now && d.getTime() - now.getTime() <= 7 * DAY;
      });
    const shipmentsDue = etas.length
      ? `${etas.length} shipment(s) arriving within 7 days: ${etas.slice(0, 3).map(({ v, eta }) => `inv #${v.number} (${v.clientName}) ETA ${eta}`).join('; ')}`
      : undefined;

    // Biggest single debtor by outstanding balance.
    const debt: Record<string, number> = {};
    views.forEach((v) => {
      if (v.issued && v.balance > 0.01) debt[`${v.clientName}|${v.cur}`] = (debt[`${v.clientName}|${v.cur}`] || 0) + v.balance;
    });
    const top = Object.entries(debt).sort((a, b) => b[1] - a[1])[0];
    const topDebtor = top ? `${top[0].split('|')[0]} owes ${fmtCurKM(top[0].split('|')[1], top[1])}` : undefined;

    // Metal price moves (from the live LME strip).
    const metals = prices?.length
      ? prices
          .slice(0, 3)
          .map((p) => `${p.name}: $${p.price}${p.change != null ? ` (${p.change > 0 ? '+' : ''}${Number(p.change).toFixed(1)}%)` : ''}`)
          .join(', ')
      : undefined;

    return {
      firstName: currentUser.name.split(' ')[0] || 'there',
      date: now.toISOString().slice(0, 10),
      overdue,
      paymentsRecent,
      shipmentsDue,
      topDebtor,
      metals,
    };
  }, [invoices, settings, compData, loaded, prices, currentUser.name]);

  // One AI call per day per facts-shape; persisted with the query cache so the
  // briefing also shows offline.
  const query = useQuery({
    enabled: !!uidCollection && !!facts && apiConfigured(),
    queryKey: ['briefing', uidCollection, facts?.date],
    staleTime: 6 * 60 * 60 * 1000,
    retry: 1,
    queryFn: async () => (await postJson<{ briefing: string }>('/api/ai/daily-briefing', { facts })).briefing,
  });

  return { facts, briefing: query.data, isLoading: query.isLoading && !!facts, isError: query.isError };
}
