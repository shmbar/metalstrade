import { useMemo, useState } from 'react';
import { View, Pressable, FlatList } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen, Card, Text, Badge, TextField, ProgressBar, SkeletonList, ErrorState, EmptyState } from '@/components/ui';
import { PeriodSelector } from '@/components/PeriodSelector';
import { useTheme } from '@/theme/ThemeProvider';
import { useSalesContracts } from '@/features/salescontracts/useSalesContracts';
import { fmtMoney, curSymbol } from '@/lib/format';

export default function SalesContracts() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { rows, isLoading, isError, error, refetch } = useSalesContracts();
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r: any) =>
        String(r.contractNo).toLowerCase().includes(q) ||
        r.clientName.toLowerCase().includes(q) ||
        r.products.some((p: string) => p.toLowerCase().includes(q))
    );
  }, [rows, search]);

  return (
    <Screen scroll={false} flush contentContainerStyle={{ paddingTop: insets.top + 8 }} edges={false}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Ionicons name="chevron-back" size={22} color={colors.primary} />
          <Text variant="bodyMedium" tone="primary">Back</Text>
        </Pressable>
        <Text variant="h2">Sales Contracts</Text>
        <PeriodSelector />
      </View>

      <TextField
        value={search}
        onChangeText={setSearch}
        placeholder="Search contract #, consignee, material…"
        autoCapitalize="none"
        rightElement={<Ionicons name="search" size={18} color={colors.textFaint} />}
      />
      <View style={{ height: 12 }} />

      {isLoading ? (
        <SkeletonList />
      ) : isError ? (
        <ErrorState message={(error as Error)?.message || 'Failed to load.'} onRetry={refetch} />
      ) : filtered.length === 0 ? (
        <EmptyState title="No sales contracts" message="None in the selected period." icon={<Ionicons name="document-attach-outline" size={40} color={colors.textFaint} />} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(r: any) => r.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 96 }}
          onRefresh={refetch}
          refreshing={isLoading}
          renderItem={({ item }: any) => (
            <Card style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text variant="h3" numberOfLines={1}>{item.contractNo}</Text>
                  <Text variant="caption" tone="muted" numberOfLines={1}>{item.clientName}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text variant="bodyMedium" style={{ fontVariant: ['tabular-nums'] }}>
                    {curSymbol(item.cur)}{fmtMoney(item.totalAmount)}
                  </Text>
                  <Text variant="caption" tone="faint">{fmtMoney(item.contractedQty, 0)} MT contracted</Text>
                </View>
              </View>

              {item.products.length > 0 && (
                <Text variant="caption" tone="muted" numberOfLines={1} style={{ marginTop: 8 }}>
                  {item.products.join(' · ')}
                </Text>
              )}

              <View style={{ marginTop: 10, gap: 4 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text variant="caption" tone="faint">Shipped {fmtMoney(item.shippedQty, 0)} / {fmtMoney(item.contractedQty, 0)} MT</Text>
                  <Text variant="caption" tone={item.remaining < -0.0001 ? 'warn' : item.status === 'Fully shipped' ? 'positive' : 'muted'}>
                    {item.remaining < -0.0001
                      ? `Over-shipped ${fmtMoney(Math.abs(item.remaining), 1)} MT`
                      : `${fmtMoney(item.remaining, 1)} MT left`}
                  </Text>
                </View>
                <ProgressBar pct={item.pct} color={item.pct >= 99.9 ? colors.positive : colors.primary} height={8} />
              </View>

              <View style={{ marginTop: 10 }}>
                <Badge
                  label={item.status}
                  tone={item.status === 'Fully shipped' ? 'positive' : item.status === 'Partial' ? 'info' : 'warn'}
                />
              </View>
            </Card>
          )}
        />
      )}
    </Screen>
  );
}
