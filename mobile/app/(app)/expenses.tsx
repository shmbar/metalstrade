import { useState } from 'react';
import { View, Pressable, FlatList } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen, Card, Text, Badge, SegmentedControl, SectionHeader, SkeletonList, ErrorState, EmptyState } from '@/components/ui';
import { PeriodSelector } from '@/components/PeriodSelector';
import { useTheme } from '@/theme/ThemeProvider';
import { useExpenses, ExpenseRow } from '@/features/expenses/useExpenses';
import { curSymbol, fmtMoney, fmtCurKM } from '@/lib/format';

const curLine = (byCur: Record<string, number>) => {
  const ents = Object.entries(byCur).filter(([, v]) => Math.abs(v) > 0.005);
  return ents.length ? ents.map(([c, v]) => fmtCurKM(c, v)).join('  ') : '$0';
};

export default function Expenses() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { data, isLoading, isError, error, refetch } = useExpenses();
  const [tab, setTab] = useState<'supplier' | 'company'>('supplier');

  const rows: ExpenseRow[] = data ? (tab === 'supplier' ? data.supplier : data.company) : [];
  const totals = data ? (tab === 'supplier' ? data.supplierTotals : data.companyTotals) : { all: {}, unpaid: {} };

  return (
    <Screen scroll={false} flush contentContainerStyle={{ paddingTop: insets.top + 8 }} edges={false}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Ionicons name="chevron-back" size={22} color={colors.primary} />
          <Text variant="bodyMedium" tone="primary">Back</Text>
        </Pressable>
        <Text variant="h2">Expenses</Text>
        <PeriodSelector />
      </View>

      <View style={{ marginBottom: 14 }}>
        <SegmentedControl
          value={tab}
          onChange={(v) => setTab(v as any)}
          options={[
            { value: 'supplier', label: 'Supplier' },
            { value: 'company', label: 'Company' },
          ]}
        />
      </View>

      {isLoading ? (
        <SkeletonList />
      ) : isError ? (
        <ErrorState message={(error as Error)?.message || 'Failed to load.'} onRetry={refetch} />
      ) : rows.length === 0 ? (
        <EmptyState title="No expenses" message="None in the selected period." icon={<Ionicons name="card-outline" size={40} color={colors.textFaint} />} />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(r) => r.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 96 }}
          onRefresh={refetch}
          refreshing={isLoading}
          ListHeaderComponent={
            <Card style={{ marginBottom: 12 }}>
              <SectionHeader title="Totals" subtitle={`${rows.length} expense(s)`} right={<Text variant="h3" tone="primary">{curLine(totals.all)}</Text>} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text variant="body" tone="muted">Unpaid</Text>
                <Text variant="bodyMedium" tone="negative">{curLine(totals.unpaid)}</Text>
              </View>
            </Card>
          }
          renderItem={({ item }) => (
            <Card style={{ marginBottom: 10 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text variant="bodyMedium" numberOfLines={1}>{item.supplierName}</Text>
                  <Text variant="caption" tone="muted" numberOfLines={1}>
                    {[item.expTypeLabel, item.invoice, item.order].filter(Boolean).join(' · ') || '—'}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text variant="bodyMedium" tone="primary">{curSymbol(item.cur)}{fmtMoney(item.amount)}</Text>
                  <Badge label={item.paid ? 'Paid' : 'Unpaid'} tone={item.paid ? 'positive' : 'negative'} />
                </View>
              </View>
            </Card>
          )}
        />
      )}
    </Screen>
  );
}
