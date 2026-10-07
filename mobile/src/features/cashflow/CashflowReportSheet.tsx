import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Sheet, Text, Button } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { eurRateNote, moneyFull, moneyLines } from '@/lib/format';
import { exportCsv, exportPdf } from '@/lib/export';
import { toast } from '@/store/toast';
import { layout } from '@/theme/tokens';
import type { ByCur, CashflowReport } from './cashflowReport';

/*
 * Cashflow → Report — the phone's twin of web's Report dialog (reportModal.js, eb201c9f):
 * the position, who owes us and for how long, whom we owe, what is in the warehouses, unpaid
 * expenses, unsold stock and every Pending hold. Exact amounts throughout. Shared as a PDF
 * (the summary) or a CSV that opens in Excel (every invoice and lot, grouped by section and
 * party) — web writes an .xlsx; a phone shares what it can open.
 */
const TOP = 5;
const usd = (n: number) => moneyFull('us', n);
const line = (byCur: ByCur) => moneyLines(byCur).split('\n').join('  ');
// Receivables are a dollar figure; when any of them is in euros, the per-currency line says how much.
const perCur = (r: CashflowReport) => (Math.abs(r.receivables.byCur.eu || 0) > 0.005 ? line(r.receivables.byCur) : undefined);

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={{ marginBottom: layout.stack }}>
      <Text variant="overline" tone="muted" style={{ marginBottom: 6 }}>{title}</Text>
      <View style={{ borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.borderStrong, overflow: 'hidden' }}>{children}</View>
    </View>
  );
}

function Row({ label, sub, value, strong, faint, first }: { label: string; sub?: string; value: string; strong?: boolean; faint?: boolean; first?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 8, borderTopWidth: first ? 0 : StyleSheet.hairlineWidth, borderTopColor: colors.border, opacity: faint ? 0.72 : 1 }}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text variant={strong ? 'bodyStrong' : 'body'} numberOfLines={1}>{label}</Text>
        {sub ? <Text variant="caption" tone="muted" numberOfLines={1}>{sub}</Text> : null}
      </View>
      <Text variant={strong ? 'bodyStrong' : 'bodyMedium'} style={{ textAlign: 'right', flexShrink: 0 }}>{value}</Text>
    </View>
  );
}

export function reportHtml(r: CashflowReport, company: string): string {
  const esc = (s: unknown) => String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c] as string);
  const table = (title: string, rows: [string, string][]) =>
    rows.length
      ? `<h2>${esc(title)}</h2><table>${rows.map(([a, b]) => `<tr><td>${esc(a)}</td><td class="n">${esc(b)}</td></tr>`).join('')}</table>`
      : '';
  const parts = [
    r.position &&
      table('Position', [
        ...r.position.left.map((x) => [x.label, usd(x.usd)] as [string, string]),
        ['Total (Left)', usd(r.position.totalLeft)],
        ...r.position.right.map((x) => [x.label, usd(x.usd)] as [string, string]),
        ['Total (Right)', usd(r.position.totalRight)],
        ['Balance', usd(r.position.balance)],
      ]),
    table('Receivables', [
      ['Outstanding (USD)', usd(r.receivables.usd)],
      ...(perCur(r) ? [['… per currency', perCur(r) as string] as [string, string]] : []),
      ...(Object.keys(r.receivables.pendingByCur).length ? [['On hold (not included)', line(r.receivables.pendingByCur)] as [string, string]] : []),
      ...r.receivables.aging.map((b) => [`${b.label} (${b.count})`, line(b.byCur)] as [string, string]),
      ...(r.receivables.undated.count ? [[`No invoice date (${r.receivables.undated.count})`, line(r.receivables.undated.byCur)] as [string, string]] : []),
    ]),
    table('Clients', r.receivables.parties.map((p) => [p.name, line(p.byCur)])),
    table('Payables', [['Outstanding (USD)', usd(r.payables.usd)], ...(r.payables.pendingUsd ? [['On hold (not included)', usd(r.payables.pendingUsd)] as [string, string]] : [])]),
    table('Suppliers', r.payables.parties.map((p) => [p.name, usd(p.usd)])),
    table('Stock', [['Paid', usd(r.stock.paidUsd)], ['Unpaid', usd(r.stock.unpaidUsd)], ...r.stock.warehouses.map((w) => [w.name, usd(w.paidUsd + w.unpaidUsd)] as [string, string])]),
    table('Unpaid expenses', [['Total (USD)', usd(r.expenses.usd)], ...r.expenses.parties.map((p) => [p.name, usd(p.usd)] as [string, string])]),
    table('Unsold stock', r.unsold.parties.map((p) => [p.name, moneyFull(p.cur, p.total)])),
    table('On hold', r.holds.map((h) => [`${h.kind} · ${h.party} · ${h.ref}`, moneyFull(h.cur, h.amount)])),
  ].filter(Boolean);
  return `<html><head><meta charset="utf-8"><style>
    body{font-family:-apple-system,Helvetica,Arial,sans-serif;color:#1d1b2e;padding:24px;font-size:11px}
    h1{font-size:18px;margin:0 0 2px} .sub{color:#6b6880;margin-bottom:16px}
    h2{font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:#6d5ce0;margin:18px 0 6px}
    table{width:100%;border-collapse:collapse} td{padding:5px 6px;border-bottom:1px solid #e6e3f0}
    td.n{text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums}
  </style></head><body><h1>Cashflow report</h1><div class="sub">${esc(company)} · as of ${esc(r.asOf)}${r.fx.hasEuro ? `<br>${esc(eurRateNote(r.fx))}` : ''}</div>${parts.join('')}</body></html>`;
}

export function CashflowReportSheet({ visible, onClose, report, company, money }: { visible: boolean; onClose: () => void; report: CashflowReport | null; company: string; money: (s: string) => string }) {
  const { colors } = useTheme();
  const [busy, setBusy] = useState<'pdf' | 'csv' | null>(null);
  const run = async (kind: 'pdf' | 'csv') => {
    if (!report) return;
    setBusy(kind);
    try {
      if (kind === 'pdf') await exportPdf(reportHtml(report, company), `Cashflow report ${report.asOf}`);
      else
        await exportCsv(`Cashflow report ${report.asOf}`, ['Section', 'Party', 'Ref', 'PO#', 'Date', 'Description', 'Cur.', 'Amount', 'Balance', 'Status'],
          report.rows.map((x) => [x.section, x.party, x.ref, x.po, x.date, x.description, x.cur === 'eu' ? 'EUR' : 'USD', x.amount.toFixed(2), x.balance.toFixed(2), x.status]));
    } catch (e: any) {
      toast.error(e?.message || 'Could not create the report.');
    } finally {
      setBusy(null);
    }
  };
  const r = report;
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Cashflow report"
      subtitle={r ? `As of ${r.asOf} · ${r.holds.length} on hold` : undefined}
      footer={
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Button title="Share PDF" variant="primary" loading={busy === 'pdf'} disabled={!r || !!busy} onPress={() => run('pdf')} leftIcon={<Ionicons name="document-text-outline" size={16} color={colors.primaryText} />} style={{ flex: 1 }} />
          <Button title="Export CSV" variant="secondary" loading={busy === 'csv'} disabled={!r || !!busy} onPress={() => run('csv')} leftIcon={<Ionicons name="grid-outline" size={16} color={colors.primary} />} style={{ flex: 1 }} />
        </View>
      }
    >
      {r ? (
        <>
          {r.fx.hasEuro ? (
            <Text variant="caption" tone="muted" style={{ marginBottom: layout.stack }}>
              {eurRateNote(r.fx)}
            </Text>
          ) : null}
          {r.position && (
            <Block title="Position">
              <Row first label="Total (Left)" sub="What we have and are owed" value={money(usd(r.position.totalLeft))} />
              <Row label="Total (Right)" sub="What we owe" value={money(usd(r.position.totalRight))} />
              <Row label="Balance" value={money(usd(r.position.balance))} strong />
            </Block>
          )}
          <Block title="Who owes us — and for how long">
            <Row first label="Outstanding (USD)" sub={perCur(r)} value={money(usd(r.receivables.usd))} strong />
            {r.receivables.aging.map((b) => (
              <Row key={b.label} label={b.label} sub={`${b.count} invoice${b.count === 1 ? '' : 's'}`} value={money(line(b.byCur))} />
            ))}
            {r.receivables.undated.count > 0 && <Row label="No invoice date" sub={`${r.receivables.undated.count}`} value={money(line(r.receivables.undated.byCur))} />}
            {Object.keys(r.receivables.pendingByCur).length > 0 && <Row label="On hold (not included)" value={money(line(r.receivables.pendingByCur))} faint />}
            {r.receivables.parties.slice(0, TOP).map((p) => (
              <Row key={`c-${p.name}`} label={p.name} sub={`${p.count} invoice${p.count === 1 ? '' : 's'}`} value={money(line(p.byCur))} />
            ))}
          </Block>
          <Block title="Whom we owe">
            <Row first label="Outstanding (USD)" value={money(usd(r.payables.usd))} strong />
            {r.payables.pendingUsd ? <Row label="On hold (not included)" value={money(usd(r.payables.pendingUsd))} faint /> : null}
            {r.payables.parties.slice(0, TOP).map((p) => (
              <Row key={`s-${p.name}`} label={p.name} sub={`${p.count} invoice${p.count === 1 ? '' : 's'}`} value={money(usd(p.usd))} />
            ))}
          </Block>
          <Block title="Stock">
            <Row first label="Paid" value={money(usd(r.stock.paidUsd))} />
            <Row label="Unpaid" value={money(usd(r.stock.unpaidUsd))} />
            {r.stock.pendingUsd ? <Row label="On hold (not included)" value={money(usd(r.stock.pendingUsd))} faint /> : null}
            {r.stock.warehouses.slice(0, TOP).map((w) => (
              <Row key={`w-${w.name}`} label={w.name} sub={`${w.lots} lot${w.lots === 1 ? '' : 's'}`} value={money(usd(w.paidUsd + w.unpaidUsd))} />
            ))}
          </Block>
          <Block title="Unpaid expenses">
            <Row first label="Total (USD)" value={money(usd(r.expenses.usd))} strong />
            {r.expenses.parties.slice(0, TOP).map((p) => (
              <Row key={`e-${p.name}`} label={p.name} value={money(usd(p.usd))} />
            ))}
          </Block>
          {r.unsold.parties.length > 0 && (
            <Block title="Unsold stock">
              {r.unsold.parties.slice(0, TOP).map((p, i) => (
                <Row key={`u-${p.name}`} first={i === 0} label={p.name} sub={`${p.lines} line${p.lines === 1 ? '' : 's'}`} value={money(moneyFull(p.cur, p.total))} />
              ))}
            </Block>
          )}
          {r.holds.length > 0 && (
            <Block title="On hold">
              {r.holds.map((h, i) => (
                <Row key={`h-${i}`} first={i === 0} label={`${h.party} · ${h.ref}`} sub={h.kind} value={money(moneyFull(h.cur, h.amount))} />
              ))}
            </Block>
          )}
        </>
      ) : null}
    </Sheet>
  );
}
