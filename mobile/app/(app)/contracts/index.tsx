import { useMemo, useState } from 'react';
import { View, FlatList, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen, Text, TextField, SkeletonList, FadeInItem, ErrorState, EmptyState } from '@/components/ui';
import { ScreenHeader } from '@/components/ScreenHeader';
import { PeriodSelector } from '@/components/PeriodSelector';
import { useTheme } from '@/theme/ThemeProvider';
import { useSettings } from '@/store/settings';
import { useContracts, deriveContract } from '@/features/contracts/useContracts';
import { ContractCard } from '@/features/contracts/ContractCard';
import { useDuplicateContract } from '@/features/contracts/useDuplicateContract';
import { SwipeRow } from '@/components/SwipeRow';
import { exportCsv } from '@/lib/export';
import { radius } from '@/theme/tokens';

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
    const q = search.trim().toLowerCase();
    const list = !q
      ? [...contracts]
      : contracts.filter((c) => {
          const v = deriveContract(c, settings);
          return (
            (c.order || '').toLowerCase().includes(q) ||
            v.supplierName.toLowerCase().includes(q) ||
            v.productNames.some((p) => p.toLowerCase().includes(q))
          );
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
            <Pressable
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
        placeholder="Search PO, supplier, material…"
        autoCapitalize="none"
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

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, marginBottom: 8 }}>
        <Text variant="caption" tone="muted">
          {filtered.length} contract{filtered.length === 1 ? '' : 's'}
        </Text>
        {/* Sort chips */}
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {SORTS.map((s) => {
            const active = sort === s.key;
            return (
              <Pressable
                key={s.key}
                onPress={() => setSort(s.key)}
                hitSlop={4}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 3,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: radius.pill,
                  borderWidth: 1.5,
                  borderColor: active ? colors.primary : colors.border,
                  backgroundColor: active ? colors.primary + '14' : 'transparent',
                }}
              >
                {active && <Ionicons name="arrow-down" size={11} color={colors.primary} />}
                <Text variant="caption" tone={active ? 'primary' : 'muted'} style={{ fontFamily: 'Inter_600SemiBold' }}>
                  {s.label}
                </Text>
              </Pressable>
            );
          })}
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
        <FlatList
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
      <Pressable
        onPress={() => router.push('/(app)/contracts/edit')}
        style={{
          position: 'absolute',
          right: 20,
          bottom: 20,
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: colors.primary,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#103a7a',
          shadowOpacity: 0.3,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 6 },
          elevation: 6,
        }}
      >
        <Ionicons name="add" size={28} color={colors.primaryText} />
      </Pressable>
    </View>
  );
}
