import { useMemo, useState } from 'react';
import { View, FlatList } from 'react-native';
import { router } from 'expo-router';
import { Pressable } from '@/components/ui/Pressable';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Text, SkeletonList, FadeInItem, ErrorState, EmptyState, SearchField, Chip, Fab, IconButton, Sheet, useFabScroll, FAB_CLEARANCE } from '@/components/ui';
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
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/store/auth';
import { updateContractField } from '@/data/writes';
import { toast } from '@/store/toast';
import { keyboardScrollProps } from '@/lib/keyboard';
import { layout } from '@/theme/tokens';

type SortKey = 'date' | 'value' | 'mt';
const SORTS: { key: SortKey; label: string }[] = [
  { key: 'date', label: 'Date' },
  { key: 'value', label: 'Value' },
  { key: 'mt', label: 'MT' },
];

export default function ContractsList() {
  // The create button folds to a circle while the list scrolls down.
  const fab = useFabScroll();
  const { colors } = useTheme();
  const settings = useSettings((s) => s.settings);
  const { data: contracts, isLoading, isError, error, refetch } = useContracts();
  const { duplicate } = useDuplicateContract();
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortKey>('date');

  /* Delayed-response alerts — web contracts/page.js: a contract with no purchase
     invoice yet, 14 days past its end date, stays flagged until dismissed. "Dismissed"
     is contract.alert === false; a contract that never had the field counts as
     flagged, exactly like web's alert === undefined branch. */
  const uidCollection = useAuth((s) => s.uidCollection);
  const qc = useQueryClient();
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [dismissed, setDismissed] = useState<Record<string, true>>({});
  const delayed = useMemo(() => {
    const today = new Date();
    return (contracts || []).filter((z: any) => {
      if (dismissed[z.id]) return false;
      if (Array.isArray(z.poInvoices) && z.poInvoices.length > 0) return false;
      const end = z.dateRange?.endDate;
      if (!end) return false;
      const due = new Date(end);
      due.setDate(due.getDate() + 14);
      return due < today && (z.alert === undefined || !!z.alert);
    });
  }, [contracts, dismissed]);
  const dismissAlert = async (c: any) => {
    if (!uidCollection) return;
    setDismissed((p) => ({ ...p, [c.id]: true }));
    try {
      await updateContractField(uidCollection, c.id, c.dateRange?.startDate || c.date || '', { alert: false });
      qc.invalidateQueries({ queryKey: ['contracts'] });
      toast.success('Alert successfully removed!');
    } catch (e: any) {
      setDismissed((p) => {
        const next = { ...p };
        delete next[c.id];
        return next;
      });
      toast.error(e?.message || 'Could not remove the alert.');
    }
  };

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

      {delayed.length > 0 && (
        <Pressable
          onPress={() => setAlertsOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={`${delayed.length} contracts waiting on a supplier invoice`}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            marginBottom: 10,
            paddingHorizontal: layout.cardInset,
            paddingVertical: 11,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: colors.warn + '55',
            backgroundColor: colors.warn + '14',
          }}
        >
          <Ionicons name="alarm-outline" size={18} color={colors.warn} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text variant="bodyMedium" numberOfLines={1}>
              {delayed.length} contract{delayed.length === 1 ? '' : 's'} with no supplier invoice
            </Text>
            <Text variant="caption" tone="muted" numberOfLines={1}>Two weeks past the contract date — tap to review</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
        </Pressable>
      )}

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
          icon={<Ionicons name="document-text-outline" size={24} color={colors.textFaint} />}
          actionLabel={search ? undefined : 'Create contract'}
          onAction={search ? undefined : () => router.push('/(app)/contracts/edit')}
        />
      ) : (
        <FlatList
        {...keyboardScrollProps} keyboardShouldPersistTaps="handled"
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
          contentContainerStyle={{ paddingBottom: FAB_CLEARANCE }}
          onScroll={fab.onScroll}
          scrollEventThrottle={16}
          onRefresh={refetch}
          refreshing={isLoading}
        />
      )}
      <Sheet
        visible={alertsOpen}
        onClose={() => setAlertsOpen(false)}
        title="Delayed responses"
        subtitle="No purchase invoice 14 days after the contract date"
      >
        {delayed.length === 0 ? (
          <Text variant="body" tone="muted" style={{ paddingVertical: 16, textAlign: 'center' }}>All clear.</Text>
        ) : (
          delayed.map((c: any, i: number) => {
            const v = deriveContract(c, settings);
            return (
              <View
                key={c.id}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: layout.rowPad, borderTopWidth: i ? 1 : 0, borderTopColor: colors.border }}
              >
                <Pressable
                  onPress={() => {
                    setAlertsOpen(false);
                    router.push(`/(app)/contracts/${c.id}`);
                  }}
                  accessibilityRole="button"
                  style={{ flex: 1, minWidth: 0 }}
                >
                  <Text variant="bodyMedium" numberOfLines={1}>{c.order || 'Untitled PO'}</Text>
                  <Text variant="caption" tone="muted" numberOfLines={1}>
                    {v.supplierName} · ends {String(c.dateRange?.endDate || '').substring(0, 10)}
                  </Text>
                </Pressable>
                <Chip label="Dismiss" icon="checkmark" onPress={() => dismissAlert(c)} />
              </View>
            );
          })
        )}
      </Sheet>
    </Screen>

      {/* Create FAB */}
      <Fab label="New contract" extended={fab.extended} onPress={() => router.push('/(app)/contracts/edit')} />
    </View>
  );
}
