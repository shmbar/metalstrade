import { useMemo, useState } from 'react';
import { View, Pressable, FlatList } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen, Card, Text, Badge, TextField, BarChart, SectionHeader, SkeletonList, ErrorState, EmptyState } from '@/components/ui';
import { PeriodSelector } from '@/components/PeriodSelector';
import { useTheme } from '@/theme/ThemeProvider';
import { useAccounting, AccountingGroup } from '@/features/accounting/useAccounting';
import { curSymbol, fmtMoney } from '@/lib/format';

const DAYS = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const dayIdx = (iso?: string) => {
  if (!iso) return -1;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return -1;
  const day = d.getDay(); // 0=Sun … 6=Sat
  return day === 6 ? 0 : day + 1; // Sat→0, Sun→1 … Fri→6
};

export default function Accounting() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { data, isLoading, isError, error, refetch } = useAccounting();
  const [search, setSearch] = useState('');

  const groups: AccountingGroup[] = useMemo(() => {
    const q = search.trim().toLowerCase();
    const all = data || [];
    if (!q) return all;
    return all.filter(
      (g) => g.saleInvoice.toLowerCase().includes(q) || g.clientInvName.toLowerCase().includes(q) || g.invoice.includes(q)
    );
  }, [data, search]);

  // Debit (costs) vs Credit (sales) by weekday — parity with the web accounting chart.
  const chart = useMemo(() => {
    const debit = new Array(7).fill(0);
    const credit = new Array(7).fill(0);
    (data || []).forEach((g) => {
      const ci = dayIdx(g.dateInv);
      if (ci >= 0) credit[ci] += g.amountInv || 0;
      g.lines.forEach((l) => {
        const di = dayIdx(l.dateExp);
        if (di >= 0) debit[di] += l.amountExp || 0;
      });
    });
    return { debit, credit, hasData: debit.some((v) => v) || credit.some((v) => v) };
  }, [data]);

  return (
    <Screen scroll={false} flush contentContainerStyle={{ paddingTop: insets.top + 8 }} edges={false}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Ionicons name="chevron-back" size={22} color={colors.primary} />
          <Text variant="bodyMedium" tone="primary">Back</Text>
        </Pressable>
        <Text variant="h2">Accounting</Text>
        <PeriodSelector />
      </View>

      <TextField
        value={search}
        onChangeText={setSearch}
        placeholder="Search invoice # or client…"
        autoCapitalize="none"
        rightElement={<Ionicons name="search" size={18} color={colors.textFaint} />}
      />
      <View style={{ height: 12 }} />

      {isLoading ? (
        <SkeletonList />
      ) : isError ? (
        <ErrorState message={(error as Error)?.message || 'Failed to load.'} onRetry={refetch} />
      ) : groups.length === 0 ? (
        <EmptyState title="No entries" message="No invoices in the selected period." icon={<Ionicons name="reader-outline" size={40} color={colors.textFaint} />} />
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(g) => g.invoice}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 96 }}
          onRefresh={refetch}
          refreshing={isLoading}
          ListHeaderComponent={
            chart.hasData ? (
              <Card style={{ marginBottom: 12 }}>
                <SectionHeader title="Debit vs Credit" subtitle="By weekday" />
                <BarChart
                  labels={DAYS}
                  series={[
                    { name: 'Debit', color: '#103a7a', data: chart.debit },
                    { name: 'Credit', color: '#9fb8d4', data: chart.credit },
                  ]}
                />
              </Card>
            ) : null
          }
          renderItem={({ item }) => {
            const symS = curSymbol(item.curINV);
            const costs = item.lines.reduce((s, l) => s + l.amountExp, 0);
            return (
              <Card style={{ marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text variant="h3" numberOfLines={1}>#{item.saleInvoice || item.invoice}</Text>
                    <Text variant="caption" tone="muted" numberOfLines={1}>{item.clientInvName}{item.dateInv ? ` · ${item.dateInv}` : ''}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text variant="h3" tone="primary">{symS}{fmtMoney(item.amountInv)}</Text>
                    {item.invType ? <Badge label={item.invType} tone="info" /> : null}
                  </View>
                </View>

                {item.lines.length > 0 && (
                  <View style={{ marginTop: 10, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8, gap: 6 }}>
                    {item.lines.map((l, i) => (
                      <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text variant="caption" numberOfLines={1}>{l.supplierName}</Text>
                          <Text variant="caption" tone="faint" numberOfLines={1}>
                            {[l.expType, l.expInvoice, l.dateExp].filter(Boolean).join(' · ')}
                          </Text>
                        </View>
                        <Text variant="caption" tone="negative">−{curSymbol(l.curEX)}{fmtMoney(l.amountExp)}</Text>
                      </View>
                    ))}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                      <Text variant="caption" tone="muted">Costs</Text>
                      <Text variant="caption" tone="negative">{symS}{fmtMoney(costs)}</Text>
                    </View>
                  </View>
                )}
              </Card>
            );
          }}
        />
      )}
    </Screen>
  );
}
