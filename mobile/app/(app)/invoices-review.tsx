import { useMemo, useState } from 'react';
import { View, FlatList } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen, Card, Text, SegmentedControl, SectionHeader, SkeletonList, ErrorState, EmptyState, SearchField } from '@/components/ui';
import { PeriodSelector } from '@/components/PeriodSelector';
import { useTheme } from '@/theme/ThemeProvider';
import { InvoiceCard } from '@/features/invoices/InvoiceCard';
import { useInvoicesReview, PartyStatement } from '@/features/review/useInvoicesReview';
import { fmtCurKM } from '@/lib/format';
import { StackHeader } from '@/components/StackHeader';
import { matchesAllWords, searchWords } from '@shared/search';

const curLine = (byCur: Record<string, number>) => {
  const ents = Object.entries(byCur).filter(([, v]) => Math.abs(v) > 0.005);
  return ents.length ? ents.map(([c, v]) => fmtCurKM(c, v)).join('  ') : '$0';
};

function PartyList({ rows, accent }: { rows: PartyStatement[]; accent: string }) {
  const { colors } = useTheme();
  if (!rows.length) return <Text variant="body" tone="muted" style={{ paddingVertical: 8 }}>None in this period.</Text>;
  return (
    <>
      {rows.map((r, i) => (
        <View key={r.name + i} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 7, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: colors.border }}>
          <Text variant="body" numberOfLines={1} style={{ flex: 1, paddingRight: 10 }}>{r.name}</Text>
          <Text variant="bodyMedium" color={accent}>{curLine(r.byCur)}</Text>
        </View>
      ))}
    </>
  );
}

export default function InvoicesReview() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { rows, clients, suppliers, isLoading, isError, error, refetch } = useInvoicesReview();
  const [tab, setTab] = useState<'review' | 'statement'>('review');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const words = searchWords(search);
    if (!words.length) return rows;
    return rows.filter((r) => matchesAllWords([r.number, r.clientName], words));
  }, [rows, search]);

  return (
    <Screen scroll={false} flush contentContainerStyle={{ paddingTop: insets.top + 8 }} edges={false}>
      <StackHeader title="Invoices Review" right={<PeriodSelector />} />

      <View style={{ marginBottom: 14 }}>
        <SegmentedControl
          value={tab}
          onChange={(v) => setTab(v as any)}
          options={[
            { value: 'review', label: 'Review' },
            { value: 'statement', label: 'Statement' },
          ]}
        />
      </View>

      {tab === 'review' && (
        <>
          <SearchField value={search} onChangeText={setSearch} placeholder="Search invoice # or client…" />
          <View style={{ height: 12 }} />
        </>
      )}

      {isLoading ? (
        <SkeletonList />
      ) : isError ? (
        <ErrorState message={(error as Error)?.message || 'Failed to load.'} onRetry={refetch} />
      ) : tab === 'review' ? (
        filtered.length === 0 ? (
          <EmptyState title="No invoices" message="None in the selected period." icon={<Ionicons name="receipt-outline" size={40} color={colors.textFaint} />} />
        ) : (
          <FlatList keyboardShouldPersistTaps="handled"
            data={filtered}
            keyExtractor={(r) => r.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: insets.bottom + 96 }}
            onRefresh={refetch}
            refreshing={isLoading}
            renderItem={({ item }) => <InvoiceCard inv={item} onPress={() => router.push(`/(app)/invoices/${item.id}`)} />}
          />
        )
      ) : (
        <FlatList keyboardShouldPersistTaps="handled"
          data={[0]}
          keyExtractor={() => 'statement'}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 96 }}
          onRefresh={refetch}
          refreshing={isLoading}
          renderItem={() => (
            <View style={{ gap: 14 }}>
              <Card>
                <SectionHeader title="Clients · receivables" subtitle="Outstanding by client" />
                <PartyList rows={clients} accent={colors.positive} />
              </Card>
              <Card>
                <SectionHeader title="Suppliers · payables" subtitle="Open purchase balances" />
                <PartyList rows={suppliers} accent={colors.negative} />
              </Card>
            </View>
          )}
        />
      )}
    </Screen>
  );
}
