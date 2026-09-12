import { useMemo, useState } from 'react';
import { View, FlatList, ScrollView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Text, SkeletonList, FadeInItem, ErrorState, EmptyState, SearchField, Chip, IconButton } from '@/components/ui';
import { ScreenHeader } from '@/components/ScreenHeader';
import { PeriodSelector } from '@/components/PeriodSelector';
import { useTheme } from '@/theme/ThemeProvider';
import { useSettings } from '@/store/settings';
import { useInvoices, deriveInvoice, InvoiceView } from '@/features/invoices/useInvoices';
import { InvoiceCard } from '@/features/invoices/InvoiceCard';
import { fmtCurKM } from '@/lib/format';
import { spacing } from '@/theme/tokens';
import { exportCsv } from '@/lib/export';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SwipeRow } from '@/components/SwipeRow';
import { matchesAllWords, searchWords } from '@shared/search';

type Filter = 'All' | 'Unpaid' | 'Partial' | 'Paid';
const FILTERS: Filter[] = ['All', 'Unpaid', 'Partial', 'Paid'];

type SortKey = 'date' | 'total' | 'balance';
const SORTS: { key: SortKey; label: string }[] = [
  { key: 'date', label: 'Date' },
  { key: 'total', label: 'Total' },
  { key: 'balance', label: 'Due' },
];

export default function InvoicesList() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { settings } = useSettings();
  const { data: invoices, isLoading, isError, error, refetch } = useInvoices();
  // Dashboard tiles deep-link here with ?filter=Unpaid (drill-through).
  // Dashboard tiles deep-link with ?filter=Unpaid; the Balances tab deep-links
  // with ?client=<name> so a balance leads straight to the invoices behind it.
  const { filter: filterParam, client: clientParam } = useLocalSearchParams<{ filter?: string; client?: string }>();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>(
    FILTERS.includes(filterParam as Filter) ? (filterParam as Filter) : 'All'
  );
  const [sort, setSort] = useState<SortKey>('date');

  const views: InvoiceView[] = useMemo(
    () => (invoices || []).map((inv) => deriveInvoice(inv, settings)),
    [invoices, settings]
  );

  const filtered = useMemo(() => {
    const words = searchWords(search);
    const list = views.filter((v) => {
      if (clientParam && v.clientName !== clientParam) return false;
      if (filter === 'Unpaid' && v.status !== 'Unpaid') return false;
      if (filter === 'Partial' && v.status !== 'Partial') return false;
      if (filter === 'Paid' && v.status !== 'Paid') return false;
      return matchesAllWords([v.number, v.clientName, v.status, v.dateIso, v.totalLabel], words);
    });
    if (sort === 'total') return [...list].sort((a, b) => b.total - a.total);
    if (sort === 'balance') return [...list].sort((a, b) => b.balance - a.balance);
    return [...list].sort((a, b) => (b.dateIso || '').localeCompare(a.dateIso || ''));
  }, [views, search, filter, sort, clientParam]);

  // Per-currency outstanding across the filtered set (never summed across $/€).
  const outstanding = useMemo(() => {
    const byCur: Record<string, number> = {};
    filtered.forEach((v) => {
      if (v.balance > 0.01) byCur[v.cur] = (byCur[v.cur] || 0) + v.balance;
    });
    return byCur;
  }, [filtered]);

  return (
    <Screen scroll={false} flush>
      <ScreenHeader
        subtitle="Client sales"
        title="Invoices"
        right={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <IconButton
              icon="download-outline"
              accessibilityLabel="Export CSV"
              onPress={() =>
                exportCsv(
                    'invoices',
                    ['Invoice', 'Client', 'Currency', 'Total', 'Paid', 'Balance', 'Status', 'Date'],
                    filtered.map((v) => [v.number ?? '', v.clientName, v.cur, v.total, v.paid, v.balance, v.status, v.dateIso || ''])
                  )
              }
            />
            <PeriodSelector />
          </View>
        }
      />

      <SearchField value={search} onChangeText={setSearch} placeholder="Search invoice # or client…" keyboardType="numbers-and-punctuation" />

      {/* Status filters and sort share one swipeable row — a divider keeps the
          two groups apart. Stacking them as two rows pushed the list below the
          fold on small phones; cramming both beside the count squeezed the chips. */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginTop: 12, marginHorizontal: -spacing.lg }}
        contentContainerStyle={{ gap: 8, paddingHorizontal: spacing.lg, alignItems: 'center' }}
      >
        {FILTERS.map((f) => (
          <Chip key={f} label={f} active={filter === f} onPress={() => setFilter(f)} />
        ))}
        <View style={{ width: 1, height: 22, backgroundColor: colors.borderStrong, marginHorizontal: 4 }} />
        {SORTS.map((s) => (
          <Chip
            key={s.key}
            label={s.label}
            active={sort === s.key}
            trailingIcon={sort === s.key ? 'arrow-down' : undefined}
            onPress={() => setSort(s.key)}
          />
        ))}
      </ScrollView>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginTop: 12, marginBottom: 8 }}>
        <Text variant="caption" tone="muted">
          {filtered.length} invoice{filtered.length === 1 ? '' : 's'}
        </Text>
        {Object.keys(outstanding).length > 0 && (
          <Text variant="caption" tone="negative" style={{ fontFamily: 'PlusJakartaSans_600SemiBold', flexShrink: 1 }} numberOfLines={1}>
            {Object.entries(outstanding)
              .map(([c, v]) => fmtCurKM(c, v))
              .join('  ')}{' '}
            due
          </Text>
        )}
      </View>

      {isLoading ? (
        <SkeletonList />
      ) : isError ? (
        <ErrorState message={(error as Error)?.message || 'Failed to load invoices.'} onRetry={refetch} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={search || filter !== 'All' ? 'No matches' : 'No invoices'}
          message={search || filter !== 'All' ? 'Try a different search or filter.' : 'Invoices are created from a contract.'}
          icon={<Ionicons name="receipt-outline" size={40} color={colors.textFaint} />}
          actionLabel={search || filter !== 'All' ? undefined : 'Open contracts'}
          onAction={search || filter !== 'All' ? undefined : () => router.push('/(app)/contracts')}
        />
      ) : (
        <FlatList keyboardShouldPersistTaps="handled"
          data={filtered}
          keyExtractor={(v) => v.id}
          renderItem={({ item, index }) => (
            <FadeInItem index={index}>
              {item.balance > 0.01 ? (
                <SwipeRow
                  actionLabel="Payment"
                  actionIcon="cash-outline"
                  actionColor={colors.positive}
                  onAction={() => router.push(`/(app)/invoices/${item.id}?pay=1`)}
                >
                  <InvoiceCard inv={item} onPress={() => router.push(`/(app)/invoices/${item.id}`)} />
                </SwipeRow>
              ) : (
                <InvoiceCard inv={item} onPress={() => router.push(`/(app)/invoices/${item.id}`)} />
              )}
            </FadeInItem>
          )}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 96 }}
          onRefresh={refetch}
          refreshing={isLoading}
        />
      )}
    </Screen>
  );
}
