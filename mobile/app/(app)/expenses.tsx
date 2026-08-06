import { useState } from 'react';
import { View, Pressable, FlatList } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen, Card, Text, Badge, SegmentedControl, SectionHeader, SkeletonList, ErrorState, EmptyState } from '@/components/ui';
import { PeriodSelector } from '@/components/PeriodSelector';
import { useTheme } from '@/theme/ThemeProvider';
import { useExpenses, useSaveExpenseSplit, ExpenseRow } from '@/features/expenses/useExpenses';
import { SplitControl } from '@/components/SplitControl';
import { curSymbol, fmtMoney, fmtCurKM, dateLabel } from '@/lib/format';

// Web prints these at FULL precision (two decimals), never compact $K/$M.
const curLine = (byCur: Record<string, number>) => {
  const ents = Object.entries(byCur).filter(([, v]) => Math.abs(v) > 0.005);
  return ents.length ? ents.map(([c, v]) => `${curSymbol(c)}${fmtMoney(v)}`).join('  ') : '$0.00';
};

export default function Expenses() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { data, isLoading, isError, error, refetch } = useExpenses();
  const [tab, setTab] = useState<'supplier' | 'company'>('supplier');
  // Web parity: companyexpenses/expenses have an "unsplit only" filter.
  const [onlyUnsplit, setOnlyUnsplit] = useState(false);
  const saveSplit = useSaveExpenseSplit();

  const allRows: ExpenseRow[] = data ? (tab === 'supplier' ? data.supplier : data.company) : [];
  // Web parity (companyexpenses/page.js:276): the filter keeps rows whose split is
  // PENDING — not every row that isn't done. 'none' rows were never put under control.
  const rows = onlyUnsplit ? allRows.filter((r) => r.splitStatus === 'pending') : allRows;
  const totals = data
    ? (tab === 'supplier' ? data.supplierTotals : data.companyTotals)
    : { all: {}, unpaid: {}, byVendor: [], byVendorUnpaid: [] };

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

      <View style={{ marginBottom: 12 }}>
        <SegmentedControl
          value={tab}
          onChange={(v) => setTab(v as any)}
          options={[
            { value: 'supplier', label: 'Supplier' },
            { value: 'company', label: 'Company' },
          ]}
        />
      </View>

      {/* "Unsplit only" filter — web parity (companyexpenses onlyUnsplit toggle). */}
      <Pressable
        onPress={() => setOnlyUnsplit((v) => !v)}
        style={{
          alignSelf: 'flex-start',
          flexDirection: 'row', alignItems: 'center', gap: 6,
          paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, marginBottom: 12,
          backgroundColor: onlyUnsplit ? colors.primary : colors.surfaceAlt,
          borderWidth: 1, borderColor: onlyUnsplit ? colors.primary : colors.border,
        }}
      >
        <Ionicons
          name={onlyUnsplit ? 'checkbox' : 'square-outline'}
          size={14}
          color={onlyUnsplit ? '#fff' : colors.textFaint}
        />
        <Text variant="caption" color={onlyUnsplit ? '#fff' : colors.textMuted}>Needs split</Text>
      </Pressable>

      {/* Create — web has an "Add expense" action on both expense pages. */}
      <Pressable
        onPress={() => router.push(`/(app)/expense-edit?id=new&kind=${tab === 'supplier' ? 'supplier' : 'company'}`)}
        style={{
          position: 'absolute', right: 18, bottom: insets.bottom + 88, zIndex: 10,
          width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center',
          backgroundColor: colors.primary,
        }}
      >
        <Ionicons name="add" size={26} color="#fff" />
      </Pressable>

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
            <View>
              <Card style={{ marginBottom: 12 }}>
                <SectionHeader title="Totals" subtitle={`${rows.length} expense(s)`} right={<Text variant="h3" tone="primary">{curLine(totals.all)}</Text>} />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text variant="body" tone="muted">Unpaid</Text>
                  <Text variant="bodyMedium" tone="negative">{curLine(totals.unpaid)}</Text>
                </View>
              </Card>

              {/* Web's two per-vendor summary tables. */}
              {totals.byVendorUnpaid.length > 0 && (
                <VendorSummary title="Unpaid — by vendor" rows={totals.byVendorUnpaid} totals={totals.unpaid} />
              )}
              {totals.byVendor.length > 0 && (
                <VendorSummary title="Summary — by vendor" rows={totals.byVendor} totals={totals.all} />
              )}
            </View>
          }
          renderItem={({ item }) => (
            <Card style={{ marginBottom: 10 }} onPress={() => router.push(`/(app)/expense-edit?id=${item.id}&kind=${tab === 'supplier' ? 'supplier' : 'company'}`)}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text variant="bodyMedium" numberOfLines={1}>{item.supplierName}</Text>
                  <Text variant="caption" tone="muted" numberOfLines={1}>
                    {[item.expTypeLabel, item.invoice, item.order, dateLabel(item.date)].filter(Boolean).join(' · ') || '—'}
                  </Text>
                  {!!item.comments && (
                    <Text variant="caption" tone="faint" numberOfLines={2} style={{ marginTop: 2 }}>
                      {item.comments}
                    </Text>
                  )}
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text variant="bodyMedium" tone="primary">{curSymbol(item.cur)}{fmtMoney(item.amount)}</Text>
                  {/* Only '111' is Paid and only '222' is Unpaid — a blank status is
                      neither, and labelling it "Unpaid" overstated what is owed. */}
                  <Badge
                    label={item.paid ? 'Paid' : item.unpaid ? 'Unpaid' : '—'}
                    tone={item.paid ? 'positive' : item.unpaid ? 'negative' : 'neutral'}
                  />
                </View>
              </View>
              {/* IMS/GIS split — web has this column on both expenses pages. */}
              <View style={{ marginTop: 10 }}>
                <SplitControl
                  row={item}
                  entityType={tab === 'supplier' ? 'expense' : 'companyexpense'}
                  entityLabel={[item.supplierName, item.invoice].filter(Boolean).join(' · ')}
                  amount={item.amount}
                  currency={item.cur}
                  onPersist={(split) =>
                    saveSplit.mutateAsync({
                      row: item,
                      kind: tab === 'supplier' ? 'expense' : 'companyexpense',
                      split,
                    })
                  }
                />
              </View>
            </Card>
          )}
        />
      )}
    </Screen>
  );
}

// Per-vendor summary card — web renders one for unpaid rows and one for all rows,
// each with the Total $ / Total € footer.
function VendorSummary({
  title, rows, totals,
}: {
  title: string;
  rows: { vendor: string; byCur: Record<string, number> }[];
  totals: Record<string, number>;
}) {
  const { colors } = useTheme();
  return (
    <Card style={{ marginBottom: 12 }}>
      <Text variant="label" tone="muted" style={{ marginBottom: 8 }}>{title}</Text>
      {rows.map((r, i) => (
        <View
          key={r.vendor}
          style={{
            flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
            paddingVertical: 6, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: colors.border,
          }}
        >
          <Text variant="body" numberOfLines={1} style={{ flex: 1 }}>{r.vendor}</Text>
          <Text variant="bodyMedium" style={{ fontVariant: ['tabular-nums'] }}>{curLine(r.byCur)}</Text>
        </View>
      ))}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: 8, marginTop: 4, borderTopWidth: 1, borderTopColor: colors.border }}>
        <Text variant="bodyMedium">Total</Text>
        <Text variant="bodyMedium" tone="primary" style={{ fontVariant: ['tabular-nums'] }}>{curLine(totals)}</Text>
      </View>
    </Card>
  );
}
