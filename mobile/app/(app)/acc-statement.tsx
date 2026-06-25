import { useMemo, useState } from 'react';
import { View, Pressable, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen, Card, Text, Select, LoadingState, ErrorState, EmptyState } from '@/components/ui';
import { PeriodSelector } from '@/components/PeriodSelector';
import { useTheme } from '@/theme/ThemeProvider';
import { useSettings } from '@/store/settings';
import { useAccStatement, periodsForYear } from '@/features/accstatement/useAccStatement';
import { curSymbol, fmtMoney } from '@/lib/format';
import { num } from '@shared/finance';

const COLS = [
  { key: 'invoice', label: 'Invoice', w: 90, money: false },
  { key: 'date', label: 'Date', w: 90, money: false },
  { key: 'amount', label: 'Amount', w: 90, money: true },
  { key: 'due', label: 'Due', w: 90, money: true },
  { key: 'paid', label: 'Paid', w: 90, money: true },
  { key: 'notPaid', label: 'Not Paid', w: 90, money: true },
] as const;

export default function AccStatement() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { settings, dateSelect } = useSettings();
  const year = dateSelect.start.substring(0, 4);

  const clientOptions = useMemo(
    () => (settings?.Client?.Client || []).filter((c: any) => !c.deleted).map((c: any) => ({ value: c.id, label: c.nname || '—' })),
    [settings]
  );
  const periods = useMemo(() => periodsForYear().map((p) => ({ value: p.date1, label: p.label })), []);

  const [client, setClient] = useState('');
  const [date1, setDate1] = useState('');

  const { data: rows, isLoading, isError, error, refetch } = useAccStatement(client, year, date1);

  const totals = useMemo(() => {
    const t = { amount: 0, due: 0, paid: 0, notPaid: 0 };
    (rows || []).forEach((r) => {
      t.amount += num(r.amount);
      t.due += num(r.due);
      t.paid += num(r.paid);
      t.notPaid += num(r.notPaid);
    });
    return t;
  }, [rows]);

  const sym = curSymbol((rows && rows[0]?.cur) || 'us');
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
      </Card>

      {!ready ? (
        <EmptyState title="Pick a client & period" message="Choose a client and a mid/end-month period to load the statement." icon={<Ionicons name="reader-outline" size={40} color={colors.textFaint} />} />
      ) : isLoading ? (
        <LoadingState label="Loading statement…" />
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
                  <Text key={c.key} variant="caption" tone="muted" style={{ width: c.w, textAlign: c.money ? 'right' : 'left', fontFamily: 'Poppins_600SemiBold' }}>
                    {c.label}
                  </Text>
                ))}
              </View>
              {/* Rows */}
              {rows.map((r, i) => (
                <View key={i} style={{ flexDirection: 'row', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                  {COLS.map((c) => (
                    <Text key={c.key} variant="caption" style={{ width: c.w, textAlign: c.money ? 'right' : 'left' }} numberOfLines={1}>
                      {c.money ? `${sym}${fmtMoney(num((r as any)[c.key]))}` : String((r as any)[c.key] || '—')}
                    </Text>
                  ))}
                </View>
              ))}
              {/* Totals */}
              <View style={{ flexDirection: 'row', paddingVertical: 8 }}>
                <Text variant="caption" tone="primary" style={{ width: COLS[0].w + COLS[1].w, fontFamily: 'Poppins_600SemiBold' }}>Total</Text>
                {(['amount', 'due', 'paid', 'notPaid'] as const).map((k) => (
                  <Text key={k} variant="caption" tone="primary" style={{ width: 90, textAlign: 'right', fontFamily: 'Poppins_600SemiBold' }}>
                    {sym}{fmtMoney(totals[k])}
                  </Text>
                ))}
              </View>
            </View>
          </ScrollView>
        </Card>
      )}
    </Screen>
  );
}
