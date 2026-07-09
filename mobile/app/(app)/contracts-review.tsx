import { useMemo, useState } from 'react';
import { View, Pressable, FlatList } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen, Card, Text, Badge, TextField, SegmentedControl, ProgressBar, SkeletonList, ErrorState, EmptyState } from '@/components/ui';
import { PeriodSelector } from '@/components/PeriodSelector';
import { useTheme } from '@/theme/ThemeProvider';
import { useContractsReview, statusTone } from '@/features/review/useContractsReview';
import { fmtMoney } from '@/lib/format';

const wt = (n: number) => `${fmtMoney(n, 3)}`; // web shows MT to 3 decimals

export default function ContractsReview() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { rows, statement, isLoading, isError, error, refetch } = useContractsReview();
  const [tab, setTab] = useState<'review' | 'statement'>('review');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.order.toLowerCase().includes(q) || r.supplierName.toLowerCase().includes(q));
  }, [rows, search]);

  return (
    <Screen scroll={false} flush contentContainerStyle={{ paddingTop: insets.top + 8 }} edges={false}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Ionicons name="chevron-back" size={22} color={colors.primary} />
          <Text variant="bodyMedium" tone="primary">Back</Text>
        </Pressable>
        <Text variant="h2">Contracts Review</Text>
        <PeriodSelector />
      </View>

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
          <TextField value={search} onChangeText={setSearch} placeholder="Search PO or supplier…" autoCapitalize="none" rightElement={<Ionicons name="search" size={18} color={colors.textFaint} />} />
          <View style={{ height: 12 }} />
        </>
      )}

      {isLoading ? (
        <SkeletonList />
      ) : isError ? (
        <ErrorState message={(error as Error)?.message || 'Failed to load.'} onRetry={refetch} />
      ) : tab === 'review' ? (
        filtered.length === 0 ? (
          <EmptyState title="No contracts" message="None in the selected period." icon={<Ionicons name="albums-outline" size={40} color={colors.textFaint} />} />
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(r) => r.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: insets.bottom + 96 }}
            onRefresh={refetch}
            refreshing={isLoading}
            renderItem={({ item }) => {
              const pct = item.poWeight > 0 ? Math.min(100, (item.shippedWeight / item.poWeight) * 100) : 0;
              return (
                <Card style={{ marginBottom: 12 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text variant="h3" numberOfLines={1}>{item.order}</Text>
                      <Text variant="caption" tone="muted" numberOfLines={1}>{item.supplierName}</Text>
                    </View>
                    <Badge label={item.statusLabel || '—'} tone={statusTone(item.statusKey)} />
                  </View>
                  <View style={{ marginTop: 10, gap: 4 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text variant="caption" tone="faint">Shipped {wt(item.shippedWeight)} / {wt(item.poWeight)} MT</Text>
                      <Text variant="caption" tone={pct >= 99.9 ? 'positive' : 'muted'}>{pct.toFixed(0)}%</Text>
                    </View>
                    <ProgressBar pct={pct} color={pct >= 99.9 ? colors.positive : colors.primary} height={8} />
                    <Text variant="caption" tone="faint">Remaining {wt(item.remaining)} MT</Text>
                  </View>
                </Card>
              );
            }}
          />
        )
      ) : statement.length === 0 ? (
        <EmptyState title="No statement data" message="None in the selected period." />
      ) : (
        <FlatList
          data={statement}
          keyExtractor={(s, i) => `${s.supplier}-${s.cur}-${i}`}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 96 }}
          onRefresh={refetch}
          refreshing={isLoading}
          renderItem={({ item }) => (
            <Card style={{ marginBottom: 10 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text variant="h3" numberOfLines={1} style={{ flex: 1 }}>{item.supplier}</Text>
                <Badge label={item.cur === 'eu' ? 'EUR' : 'USD'} tone="neutral" />
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
                <View><Text variant="caption" tone="faint">Contracted</Text><Text variant="bodyMedium">{wt(item.poWeight)} MT</Text></View>
                <View><Text variant="caption" tone="faint">Shipped</Text><Text variant="bodyMedium" tone="positive">{wt(item.shippedWeight)} MT</Text></View>
                <View><Text variant="caption" tone="faint">Remaining</Text><Text variant="bodyMedium" tone={item.remaining > 0.01 ? 'warn' : 'positive'}>{wt(item.remaining)} MT</Text></View>
              </View>
            </Card>
          )}
        />
      )}
    </Screen>
  );
}
