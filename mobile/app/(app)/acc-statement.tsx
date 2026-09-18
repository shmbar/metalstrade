import { useMemo, useState } from 'react';
import { View, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen, Card, Text, Select, SkeletonList, ErrorState, EmptyState, Button } from '@/components/ui';
import { PeriodSelector } from '@/components/PeriodSelector';
import { useTheme } from '@/theme/ThemeProvider';
import { useSettings } from '@/store/settings';
import {
  useAccStatement,
  periodsForYear,
  statementTotals,
  stmtMoney,
  stmtDate,
} from '@/features/accstatement/useAccStatement';
import { dateLabel } from '@/lib/format';
import { exportCsv, exportPdf } from '@/lib/export';
import { accountStatementHtml } from '@/lib/pdfTemplates';
import { useAuth } from '@/store/auth';
import { num } from '@shared/finance';
import { StackHeader } from '@/components/StackHeader';
import { useShallow } from 'zustand/react/shallow';
import { layout } from '@/theme/tokens';

const COLS = [
  { key: 'invoice', label: 'Invoice', w: 90, money: false },
  { key: 'date', label: 'Date', w: 90, money: false },
  { key: 'amount', label: 'Amount', w: 90, money: true },
  { key: 'due', label: 'Due', w: 90, money: false },
  { key: 'paid', label: 'Paid', w: 90, money: true },
  { key: 'notPaid', label: 'Not Paid', w: 90, money: true },
] as const;

export default function AccStatement() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { settings, compData, dateSelect } = useSettings(useShallow((s) => ({ settings: s.settings, compData: s.compData, dateSelect: s.dateSelect })));
  const gisAccount = useAuth((s) => s.gisAccount);
  const year = dateSelect.start.substring(0, 4);

  const clientOptions = useMemo(
    () => (settings?.Client?.Client || []).filter((c: any) => !c.deleted).map((c: any) => ({ value: c.id, label: c.nname || '—' })),
    [settings]
  );
  const periods = useMemo(() => periodsForYear().map((p) => ({ value: p.date1, label: p.label })), []);

  const [client, setClient] = useState('');
  const [date1, setDate1] = useState('');

  const { data: rows, isLoading, isError, error, refetch } = useAccStatement(client, year, date1);

  const clientObj = useMemo(
    () => (settings?.Client?.Client || []).find((c: any) => c.id === client),
    [settings, client]
  );

  // Web parity (accstatement setTtl): totals are kept PER CURRENCY — never mixed,
  // and a third currency lands in NEITHER bucket. See statementTotals.
  const totals = useMemo(() => statementTotals(rows), [rows]);

  // Web exports the statement two ways (accstatement/excel.js + pdfAccountStatement.js).
  // Both were missing on mobile. Same 7 columns and the same per-currency totals block.
  const exportRows = () =>
    (rows || []).map((r) => [
      String(r.invoice ?? ''),
      dateLabel(r.date),
      num(r.amount).toFixed(2),
      settings?.Currency?.Currency?.find((c: any) => c.id === r.cur)?.cur || r.cur || '',
      dateLabel(r.due),
      num(r.paid).toFixed(2),
      num(r.notPaid).toFixed(2),
    ]);

  const onExportCsv = () =>
    exportCsv(
      `Account Statement - ${clientObj?.nname || 'client'}`,
      ['Invoice', 'Date', 'Amount', 'Currency', 'Due Payment', 'Paid', 'Unpaid'],
      exportRows()
    );

  const onExportPdf = () =>
    exportPdf(
      accountStatementHtml({
        client: clientObj,
        compData,
        gisAccount,
        rows: exportRows(),
        totals,
      }),
      `Debt_${clientObj?.nname || 'client'}`
    );

  const ready = client && date1;

  return (
    <Screen contentContainerStyle={{ paddingTop: insets.top + 8 }} edges={false}>
      <StackHeader title="Statement" right={<PeriodSelector />} />

      <Card style={{ gap: 12, marginBottom: 12 }}>
        <Select label="Client" value={client} options={clientOptions} onChange={setClient} required />
        <Select label={`Period (${year})`} value={date1} options={periods} onChange={setDate1} required searchable={false} />
        {/* Web offers both a branded PDF and an Excel export of this statement. */}
        {!!rows?.length && (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button title="PDF" variant="secondary" fullWidth={false} style={{ flex: 1 }} onPress={onExportPdf} leftIcon={<Ionicons name="document-text-outline" size={16} color={colors.primary} />} />
            <Button title="Excel (CSV)" variant="secondary" fullWidth={false} style={{ flex: 1 }} onPress={onExportCsv} leftIcon={<Ionicons name="grid-outline" size={16} color={colors.primary} />} />
          </View>
        )}
      </Card>

      {!ready ? (
        <EmptyState title="Pick a client & period" message="Choose a client and a mid/end-month period to load the statement." icon={<Ionicons name="reader-outline" size={24} color={colors.textFaint} />} />
      ) : isLoading ? (
        <SkeletonList count={6} />
      ) : isError ? (
        <ErrorState message={(error as Error)?.message || 'Failed to load.'} onRetry={refetch} />
      ) : !rows || rows.length === 0 ? (
        <EmptyState title="No statement" message="No statement found for this client and period." />
      ) : (
        <Card padded={false}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ padding: layout.cardInset }}>
            <View>
              {/* Header */}
              <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.borderStrong, paddingBottom: 6 }}>
                {COLS.map((c) => (
                  <Text key={c.key} variant="tableStrong" tone="muted" style={{ width: c.w, textAlign: c.money ? 'right' : 'left' }}>
                    {c.label}
                  </Text>
                ))}
              </View>
              {/* Rows */}
              {rows.map((r, i) => (
                <View key={i} style={{ flexDirection: 'row', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                  {COLS.map((c) => (
                    <Text key={c.key} variant="table" style={{ width: c.w, textAlign: c.money ? 'right' : 'left' }} numberOfLines={1}>
                      {c.money
                        ? stmtMoney(num((r as any)[c.key]), r.cur)
                        : c.key === 'due' || c.key === 'date'
                          ? stmtDate((r as any)[c.key])
                          : String((r as any)[c.key] || '—')}
                    </Text>
                  ))}
                </View>
              ))}
              {/* Totals — one row per currency (web keeps $ and € separate) */}
              {/* Web's statement PDF always prints BOTH the USD and the EUR line,
                  so a single-currency statement showed two totals on the document
                  the client receives and only one here. */}
              {(['us', 'eu'] as const).map((cur) => (
                <View key={cur} style={{ flexDirection: 'row', paddingVertical: 8 }}>
                  <Text variant="tableStrong" tone="primary" style={{ width: COLS[0].w + COLS[1].w }}>
                    Total {cur === 'us' ? 'USD' : 'EUR'}
                  </Text>
                  <Text variant="tableStrong" tone="primary" style={{ width: 90, textAlign: 'right' }}>
                    {stmtMoney(totals[cur].amount, cur)}
                  </Text>
                  <Text variant="table" tone="faint" style={{ width: 90, textAlign: 'right' }}>—</Text>
                  <Text variant="tableStrong" tone="primary" style={{ width: 90, textAlign: 'right' }}>
                    {stmtMoney(totals[cur].paid, cur)}
                  </Text>
                  <Text variant="tableStrong" tone="primary" style={{ width: 90, textAlign: 'right' }}>
                    {stmtMoney(totals[cur].notPaid, cur)}
                  </Text>
                </View>
              ))}
            </View>
          </ScrollView>
        </Card>
      )}
    </Screen>
  );
}
