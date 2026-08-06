import { useMemo, useState } from 'react';
import { View, Pressable, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen, Card, Text, Select, SkeletonList, ErrorState, EmptyState } from '@/components/ui';
import { PeriodSelector } from '@/components/PeriodSelector';
import { useTheme } from '@/theme/ThemeProvider';
import { useSettings } from '@/store/settings';
import { useAccStatement, periodsForYear } from '@/features/accstatement/useAccStatement';
import { curSymbol, fmtMoney, dateLabel } from '@/lib/format';
import { exportCsv, exportPdf } from '@/lib/export';
import { accountStatementHtml } from '@/lib/pdfTemplates';
import { useAuth } from '@/store/auth';
import { num } from '@shared/finance';

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
  const { settings, compData, dateSelect } = useSettings();
  const { gisAccount } = useAuth();
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

  // Web parity (accstatement setTtl): totals are kept PER CURRENCY — never mixed.
  const totals = useMemo(() => {
    const mk = () => ({ amount: 0, paid: 0, notPaid: 0 });
    const t: Record<'us' | 'eu', ReturnType<typeof mk>> = { us: mk(), eu: mk() };
    (rows || []).forEach((r) => {
      const cur = r.cur === 'eu' ? 'eu' : 'us';
      t[cur].amount += num(r.amount);
      t[cur].paid += num(r.paid);
      t[cur].notPaid += num(r.notPaid);
    });
    return t;
  }, [rows]);
  const ready = client && date1;

  return (
    <Screen contentContainerStyle={{ paddingTop: insets.top + 8 }} edges={false}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Ionicons name="chevron-back" size={22} color={colors.primary} />
          <Text variant="bodyMedium" tone="primary">Back</Text>
        </Pressable>
        <Text variant="h2">Statement</Text>
        <PeriodSelector />
      </View>

      <Card style={{ gap: 12, marginBottom: 14 }}>
        <Select label="Client" value={client} options={clientOptions} onChange={setClient} required />
        <Select label={`Period (${year})`} value={date1} options={periods} onChange={setDate1} required searchable={false} />
        {/* Web offers both a branded PDF and an Excel export of this statement. */}
        {!!rows?.length && (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Pressable
              onPress={onExportPdf}
              style={{
                flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
                paddingVertical: 9, borderRadius: 999,
                backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border,
              }}
            >
              <Ionicons name="document-text-outline" size={15} color={colors.primary} />
              <Text variant="caption" tone="primary">PDF</Text>
            </Pressable>
            <Pressable
              onPress={onExportCsv}
              style={{
                flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
                paddingVertical: 9, borderRadius: 999,
                backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border,
              }}
            >
              <Ionicons name="grid-outline" size={15} color={colors.primary} />
              <Text variant="caption" tone="primary">Excel (CSV)</Text>
            </Pressable>
          </View>
        )}
      </Card>

      {!ready ? (
        <EmptyState title="Pick a client & period" message="Choose a client and a mid/end-month period to load the statement." icon={<Ionicons name="reader-outline" size={40} color={colors.textFaint} />} />
      ) : isLoading ? (
        <SkeletonList count={6} />
      ) : isError ? (
        <ErrorState message={(error as Error)?.message || 'Failed to load.'} onRetry={refetch} />
      ) : !rows || rows.length === 0 ? (
        <EmptyState title="No statement" message="No statement found for this client and period." />
      ) : (
        <Card padded={false}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ padding: 14 }}>
            <View>
              {/* Header */}
              <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.borderStrong, paddingBottom: 6 }}>
                {COLS.map((c) => (
                  <Text key={c.key} variant="caption" tone="muted" style={{ width: c.w, textAlign: c.money ? 'right' : 'left', fontFamily: 'Inter_600SemiBold' }}>
                    {c.label}
                  </Text>
                ))}
              </View>
              {/* Rows */}
              {rows.map((r, i) => (
                <View key={i} style={{ flexDirection: 'row', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                  {COLS.map((c) => (
                    <Text key={c.key} variant="caption" style={{ width: c.w, textAlign: c.money ? 'right' : 'left' }} numberOfLines={1}>
                      {c.money ? `${curSymbol(r.cur)}${fmtMoney(num((r as any)[c.key]))}` : c.key === 'due' ? dateLabel((r as any).due) : String((r as any)[c.key] || '—')}
                    </Text>
                  ))}
                </View>
              ))}
              {/* Totals — one row per currency (web keeps $ and € separate) */}
              {(['us', 'eu'] as const)
                .filter((cur) => totals[cur].amount || totals[cur].paid || totals[cur].notPaid)
                .map((cur) => (
                  <View key={cur} style={{ flexDirection: 'row', paddingVertical: 8 }}>
                    <Text variant="caption" tone="primary" style={{ width: COLS[0].w + COLS[1].w, fontFamily: 'Inter_600SemiBold' }}>
                      Total {cur === 'us' ? 'USD' : 'EUR'}
                    </Text>
                    <Text variant="caption" tone="primary" style={{ width: 90, textAlign: 'right', fontFamily: 'Inter_600SemiBold', fontVariant: ['tabular-nums'] }}>
                      {curSymbol(cur)}{fmtMoney(totals[cur].amount)}
                    </Text>
                    <Text variant="caption" tone="faint" style={{ width: 90, textAlign: 'right' }}>—</Text>
                    <Text variant="caption" tone="primary" style={{ width: 90, textAlign: 'right', fontFamily: 'Inter_600SemiBold', fontVariant: ['tabular-nums'] }}>
                      {curSymbol(cur)}{fmtMoney(totals[cur].paid)}
                    </Text>
                    <Text variant="caption" tone="primary" style={{ width: 90, textAlign: 'right', fontFamily: 'Inter_600SemiBold', fontVariant: ['tabular-nums'] }}>
                      {curSymbol(cur)}{fmtMoney(totals[cur].notPaid)}
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
