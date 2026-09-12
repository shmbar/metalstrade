import { useMemo, useState } from 'react';
import { View, FlatList } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen, Text, SkeletonList, FadeInItem, ErrorState, EmptyState, SearchField, Chip, Fab, IconButton } from '@/components/ui';
import { ScreenHeader } from '@/components/ScreenHeader';
import { PeriodSelector } from '@/components/PeriodSelector';
import { useTheme } from '@/theme/ThemeProvider';
import { useSettings } from '@/store/settings';
import { useContracts, deriveContract } from '@/features/contracts/useContracts';
import { ContractCard } from '@/features/contracts/ContractCard';
import { useDuplicateContract } from '@/features/contracts/useDuplicateContract';
import { SwipeRow } from '@/components/SwipeRow';
import { exportCsv } from '@/lib/export';
import { matchesAllWords, searchWords } from '@shared/search';

type SortKey = 'date' | 'value' | 'mt';
const SORTS: { key: SortKey; label: string }[] = [
  { key: 'date', label: 'Date' },
  { key: 'value', label: 'Value' },
  { key: 'mt', label: 'MT' },
];

export default function ContractsList() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { settings } = useSettings();
  const { data: contracts, isLoading, isError, error, refetch } = useContracts();
  const { duplicate } = useDuplicateContract();
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortKey>('date');

  const filtered = useMemo(() => {
    if (!contracts) return [];
    const words = searchWords(search);
    const list = !words.length
      ? [...contracts]
      : contracts.filter((c) => {
          const v = deriveContract(c, settings);
          return matchesAllWords([c.order, v.supplierName, v.productNames, v.status, (c.date || '').substring(0, 10)], words);
        });
    if (sort === 'date') return list.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    return list.sort((a, b) => {
      const va = deriveContract(a, settings);
      const vb = deriveContract(b, settings);
      return sort === 'value' ? vb.totalValue - va.totalValue : vb.totalMT - va.totalMT;
    });
  }, [contracts, search, settings, sort]);

  return (
    <View style={{ flex: 1 }}>
    <Screen scroll={false} flush>
      <ScreenHeader
        subtitle="Purchase orders"
        title="Contracts"
        right={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <IconButton
              icon="download-outline"
              accessibilityLabel="Export CSV"
              onPress={() =>
                exportCsv(
                    'contracts',
                    ['PO', 'Supplier', 'Currency', 'Value', 'MT', 'Status', 'Date'],
                    filtered.map((c) => {
                      const v = deriveContract(c, settings);
                      return [c.order || '', v.supplierName, v.currency, v.totalValue, v.totalMT, v.status, (c.date || '').substring(0, 10)];
                    })
                  )
              }
            />
            <PeriodSelector />
          </View>
        }
      />

      <SearchField value={search} onChangeText={setSearch} placeholder="Search PO, supplier, material…" />

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginTop: 12, marginBottom: 8 }}>
        <Text variant="caption" tone="muted" style={{ flexShrink: 1 }} numberOfLines={1}>
          {filtered.length} contract{filtered.length === 1 ? '' : 's'}
        </Text>
        {/* Sort chips */}
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {SORTS.map((s) => (
            <Chip
              key={s.key}
              label={s.label}
              active={sort === s.key}
              trailingIcon={sort === s.key ? 'arrow-down' : undefined}
              onPress={() => setSort(s.key)}
            />
          ))}
        </View>
      </View>

      {isLoading ? (
        <SkeletonList />
      ) : isError ? (
        <ErrorState message={(error as Error)?.message || 'Failed to load contracts.'} onRetry={refetch} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={search ? 'No matches' : 'No contracts'}
          message={search ? 'Try a different search.' : 'No contracts in the selected period.'}
          icon={<Ionicons name="document-text-outline" size={40} color={colors.textFaint} />}
          actionLabel={search ? undefined : 'Create contract'}
          onAction={search ? undefined : () => router.push('/(app)/contracts/edit')}
        />
      ) : (
        <FlatList keyboardShouldPersistTaps="handled"
          data={filtered}
          keyExtractor={(c) => c.id}
          renderItem={({ item, index }) => (
            <FadeInItem index={index}>
              <SwipeRow actionLabel="Duplicate" actionIcon="copy-outline" actionColor={colors.primary} onAction={() => duplicate(item)}>
                <ContractCard
                  contract={item}
                  settings={settings}
                  onPress={() => router.push(`/(app)/contracts/${item.id}`)}
                />
              </SwipeRow>
            </FadeInItem>
          )}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 96 }}
          onRefresh={refetch}
          refreshing={isLoading}
        />
      )}
    </Screen>

      {/* Create FAB */}
      <Fab label="New contract" onPress={() => router.push('/(app)/contracts/edit')} />
    </View>
  );
}
