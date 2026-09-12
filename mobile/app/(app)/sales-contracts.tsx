import { useMemo, useState } from 'react';
import { View, FlatList } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen, Card, Text, Badge, ProgressBar, SkeletonList, ErrorState, EmptyState, SearchField, Fab } from '@/components/ui';
import { PeriodSelector } from '@/components/PeriodSelector';
import { useTheme } from '@/theme/ThemeProvider';
import { useSalesContracts } from '@/features/salescontracts/useSalesContracts';
import { fmtMoney } from '@/lib/format';
import { StackHeader } from '@/components/StackHeader';
import { matchesAllWords, searchWords } from '@shared/search';

// Web's Total Amount prefix (page.js:103) is '$' for 'us', '€' for 'eu' and NOTHING
// for anything else. The shared curSymbol falls back to '$' on an empty currency and
// to "<id> " on an unknown one, so a contract saved without a currency read
// "$1,234.00" here against web's bare "1,234.00".
const salesCur = (cur?: string) => (cur === 'us' ? '$' : cur === 'eu' ? '€' : '');

export default function SalesContracts() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { rows, isLoading, isError, error, refetch } = useSalesContracts();
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const words = searchWords(search);
    if (!words.length) return rows;
    return rows.filter(
      (r: any) =>
        matchesAllWords([r.contractNo, r.clientName, r.products], words)
    );
  }, [rows, search]);

  return (
    <Screen scroll={false} flush contentContainerStyle={{ paddingTop: insets.top + 8 }} edges={false}>
      <StackHeader title="Sales Contracts" right={<PeriodSelector />} />

      <SearchField value={search} onChangeText={setSearch} placeholder="Search contract #, consignee, material…" />
      <View style={{ height: 12 }} />

      {isLoading ? (
        <SkeletonList />
      ) : isError ? (
        <ErrorState message={(error as Error)?.message || 'Failed to load.'} onRetry={refetch} />
      ) : filtered.length === 0 ? (
        <EmptyState title="No sales contracts" message="None in the selected period." icon={<Ionicons name="document-attach-outline" size={40} color={colors.textFaint} />} />
      ) : (
        <FlatList keyboardShouldPersistTaps="handled"
          data={filtered}
          keyExtractor={(r: any) => r.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 96 }}
          onRefresh={refetch}
          refreshing={isLoading}
          renderItem={({ item }: any) => (
            <Card style={{ marginBottom: 12 }} onPress={() => router.push(`/(app)/sales-contract-edit?id=${item.id}`)}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text variant="h3" numberOfLines={1}>{item.contractNo}</Text>
                  <Text variant="caption" tone="muted" numberOfLines={1}>{item.clientName}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text variant="bodyMedium" style={{ fontVariant: ['tabular-nums'] }}>
                    {salesCur(item.cur)}{fmtMoney(item.totalAmount)}
                  </Text>
                  {/* Web renders every quantity on this page at 3 fixed decimals
                      (page.js:97, :108, :116). Mobile rounded to whole tonnes, so a
                      25.5 MT contract read "26". */}
                  <Text variant="caption" tone="faint">{fmtMoney(item.contractedQty, 3)} MT contracted</Text>
                </View>
              </View>

              {item.products.length > 0 && (
                <Text variant="caption" tone="muted" numberOfLines={1} style={{ marginTop: 8 }}>
                  {item.products.join(' · ')}
                </Text>
              )}

              <View style={{ marginTop: 10, gap: 4 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text variant="caption" tone="faint">Shipped {fmtMoney(item.shippedQty, 3)} / {fmtMoney(item.contractedQty, 3)} MT</Text>
                  <Text variant="caption" tone={item.remaining < -0.0001 ? 'warn' : item.status === 'Fully shipped' ? 'positive' : 'muted'}>
                    {item.remaining < -0.0001
                      ? `Over-shipped ${fmtMoney(Math.abs(item.remaining), 3)} MT`
                      : `${fmtMoney(item.remaining, 3)} MT left`}
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
      {/* Create — web's 'New Sales Contract' button. */}
      <Fab label="New sales contract" bottom={insets.bottom + 88} onPress={() => router.push('/(app)/sales-contract-edit?id=new')} />
    </Screen>
  );
}
