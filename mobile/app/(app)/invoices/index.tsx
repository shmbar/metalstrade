import { useMemo, useState } from 'react';
import { View, FlatList, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Text, TextField, SkeletonList, FadeInItem, ErrorState, EmptyState } from '@/components/ui';
import { ScreenHeader } from '@/components/ScreenHeader';
import { PeriodSelector } from '@/components/PeriodSelector';
import { useTheme } from '@/theme/ThemeProvider';
import { useSettings } from '@/store/settings';
import { useInvoices, deriveInvoice, InvoiceView } from '@/features/invoices/useInvoices';
import { InvoiceCard } from '@/features/invoices/InvoiceCard';
import { radius } from '@/theme/tokens';
import { fmtCurKM } from '@/lib/format';
import { exportCsv } from '@/lib/export';

type Filter = 'All' | 'Unpaid' | 'Partial' | 'Paid';
const FILTERS: Filter[] = ['All', 'Unpaid', 'Partial', 'Paid'];

export default function InvoicesList() {
  const { colors } = useTheme();
  const { settings } = useSettings();
  const { data: invoices, isLoading, isError, error, refetch } = useInvoices();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('All');

  const views: InvoiceView[] = useMemo(
    () => (invoices || []).map((inv) => deriveInvoice(inv, settings)),
    [invoices, settings]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return views.filter((v) => {
      if (filter === 'Unpaid' && v.status !== 'Unpaid') return false;
      if (filter === 'Partial' && v.status !== 'Partial') return false;
      if (filter === 'Paid' && v.status !== 'Paid') return false;
      if (!q) return true;
      return String(v.number ?? '').includes(q) || v.clientName.toLowerCase().includes(q);
    });
  }, [views, search, filter]);

  // Per-currency outstanding across the filtered set (never summed across $/€).
  const outstanding = useMemo(() => {
    const byCur: Record<string, number> = {};
    filtered.forEach((v) => {
      if (v.balance > 0.01) byCur[v.cur] = (byCur[v.cur] || 0) + v.balance;
    });
    return byCur;
  }, [filtered]);

  return (
    <Screen scroll={false}>
      <ScreenHeader
        subtitle="Client sales"
        title="Invoices"
        right={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Pressable
              onPress={() =>
                exportCsv(
                  'invoices',
                  ['Invoice', 'Client', 'Currency', 'Total', 'Paid', 'Balance', 'Status', 'Date'],
                  filtered.map((v) => [v.number ?? '', v.clientName, v.cur, v.total, v.paid, v.balance, v.status, v.dateIso || ''])
                )
              }
              hitSlop={8}
            >
              <Ionicons name="download-outline" size={20} color={colors.primary} />
            </Pressable>
            <PeriodSelector />
          </View>
        }
      />

      <TextField
        value={search}
        onChangeText={setSearch}
        placeholder="Search invoice # or client…"
        autoCapitalize="none"
        keyboardType="numbers-and-punctuation"
        rightElement={
          search ? (
            <Pressable onPress={() => setSearch('')} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={colors.textFaint} />
            </Pressable>
          ) : (
            <Ionicons name="search" size={18} color={colors.textFaint} />
          )
        }
      />

      {/* Status filter pills */}
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
        {FILTERS.map((f) => {
          const active = filter === f;
          return (
            <Pressable
              key={f}
              onPress={() => setFilter(f)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 7,
                borderRadius: radius.pill,
                borderWidth: 1.5,
                borderColor: active ? colors.primary : colors.border,
                backgroundColor: active ? colors.primary + '14' : 'transparent',
              }}
            >
              <Text variant="caption" tone={active ? 'primary' : 'muted'} style={{ fontFamily: 'Poppins_600SemiBold' }}>
                {f}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, marginBottom: 8 }}>
        <Text variant="caption" tone="muted">
          {filtered.length} invoice{filtered.length === 1 ? '' : 's'}
        </Text>
        {Object.keys(outstanding).length > 0 && (
          <Text variant="caption" tone="negative" style={{ fontFamily: 'Poppins_600SemiBold' }}>
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
          message={search || filter !== 'All' ? 'Try a different search or filter.' : 'No invoices in the selected period.'}
          icon={<Ionicons name="receipt-outline" size={40} color={colors.textFaint} />}
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(v) => v.id}
          renderItem={({ item, index }) => (
            <FadeInItem index={index}>
              <InvoiceCard inv={item} onPress={() => router.push(`/(app)/invoices/${item.id}`)} />
            </FadeInItem>
          )}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 120 }}
          onRefresh={refetch}
          refreshing={isLoading}
        />
      )}
    </Screen>
  );
}
