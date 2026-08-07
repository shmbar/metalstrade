import React, { useMemo, useState } from 'react';
import { View, FlatList, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card, Text, TextField, Badge, SkeletonList, FadeInItem, ErrorState, EmptyState } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { useStocks } from './useStocks';
import { GradeSummaryCard } from './GradeSummaryCard';
import { LotSheet } from './LotSheet';
import { curSymbol, fmtMoney } from '@/lib/format';

const fmtQty = (n: number) => new Intl.NumberFormat('en-US', { minimumFractionDigits: 3 }).format(n || 0);

export function InventoryView() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { data, labelTotals, setTotals, isLoading, isError, error, refetch } = useStocks();
  const [search, setSearch] = useState('');
  // Tapping a row opens the Materials Breakdown sheet (web whModal).
  const [lot, setLot] = useState<any | null>(null);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const all = data?.rows || [];
    if (!q) return all;
    // Web's global filter runs over EVERY column whose first value is a string or a
    // number — including the two hidden ones (date, originSupplier) — and it matches
    // the values the table is fed, not the raw record (page.js:91-129, :321;
    // newTable.js:109). Mobile searched four fields, so a search on a PO date, a
    // warehouse type, an original supplier or a unit price found nothing, and the
    // count, the grade card and the totals below it all disagreed with web.
    const hay = (r: any) =>
      [
        r.order,
        r.date,
        r.supplierName,
        r.originSupplierName,
        r.warehouseName,
        r.descriptionName,
        Number(r.qnty).toFixed(3),
        r.qTypeLabel,
        String(r.unitPrc ?? ''),
        r.total === '-' ? '-' : String(r.total ?? ''),
        r.sType,
      ]
        .map((v) => String(v ?? '').toLowerCase())
        .join(' ');
    return all.filter((r) => hay(r).includes(q));
  }, [data, search]);

  // Web parity: the Summary-Stocks card is recomputed from the FILTERED row model
  // (newTable.js:119-123 -> page.js:255-260), so it narrows with the search box.
  // Mobile was rendering the unfiltered totals beside a filtered list, which read
  // as "these 3 lots are worth $2.4m".
  const totals = useMemo(() => labelTotals(setTotals(rows as any)), [rows, labelTotals, setTotals]);

  if (isLoading) return <View style={{ flex: 1 }}><SkeletonList /></View>;
  if (isError) return <ErrorState message={(error as Error)?.message || 'Failed to load stock.'} onRetry={refetch} />;

  return (
    <View style={{ flex: 1 }}>
      <TextField
        value={search}
        onChangeText={setSearch}
        placeholder="Search material, warehouse, supplier…"
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

      {/* Totals + count scroll WITH the list (header), so the whole tab scrolls
          as one — a fixed totals card was swallowing the screen at 10+ warehouses. */}
      {(() => {
        const header = (
          <View>
            {(totals.length) > 0 && (
              <Card style={{ marginTop: 12 }}>
                <Text variant="label" tone="muted" style={{ marginBottom: 8 }}>
                  On-hand totals
                </Text>
                {totals.map((t, i) => (
                  <View
                    key={i}
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      paddingVertical: 6,
                      borderTopWidth: i === 0 ? 0 : 1,
                      borderTopColor: colors.border,
                    }}
                  >
                    <Text variant="body" numberOfLines={1} style={{ flex: 1 }}>
                      {t.warehouseName}
                    </Text>
                    <Text variant="bodyMedium" style={{ marginHorizontal: 10, fontVariant: ['tabular-nums'] }}>
                      {fmtQty(t.qnty)} {t.qTypeLabel || 'MT'}
                    </Text>
                    <Text variant="bodyMedium" tone="primary" style={{ fontVariant: ['tabular-nums'] }}>
                      {curSymbol(t.cur)}
                      {fmtMoney(t.total)}
                    </Text>
                  </View>
                ))}
              </Card>
            )}
            {/* Avg cost price per grade — web parity (stocks page GradeTable), fed
                the SEARCH-FILTERED rows exactly like web feeds it filteredData. */}
            <View style={{ marginTop: 12 }}>
              <GradeSummaryCard dataTable={rows} />
            </View>
            <Text variant="caption" tone="muted" style={{ marginBottom: 8 }}>
              {rows.length} item{rows.length === 1 ? '' : 's'} on hand
            </Text>
          </View>
        );

        return rows.length === 0 ? (
          <FlatList
            data={[]}
            renderItem={null}
            keyExtractor={() => 'x'}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: insets.bottom + 96 }}
            ListHeaderComponent={header}
            ListEmptyComponent={
              <EmptyState
                title={search ? 'No matches' : 'No stock on hand'}
                message={search ? 'Try a different search.' : 'Stock arrives via Warehouse Stock-In on a contract.'}
                icon={<Ionicons name="cube-outline" size={40} color={colors.textFaint} />}
                actionLabel={search ? undefined : 'Open contracts'}
                onAction={search ? undefined : () => router.push('/(app)/contracts')}
              />
            }
          />
        ) : (
        <FlatList
          data={rows}
          keyExtractor={(r) => r.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 96 }}
          ListHeaderComponent={header}
          onRefresh={refetch}
          refreshing={isLoading}
          renderItem={({ item, index }) => (
            <FadeInItem index={index}>
            <Card style={{ marginBottom: 12 }} onPress={() => setLot(item)}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text variant="h3" numberOfLines={2}>
                    {item.descriptionName || '—'}
                  </Text>
                  <Text variant="caption" tone="muted" numberOfLines={1} style={{ marginTop: 2 }}>
                    {item.warehouseName || '—'} · {item.supplierName}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text variant="h3">
                    {fmtQty(Number(item.qnty))}
                  </Text>
                  <Text variant="caption" tone="faint">
                    {item.qTypeLabel || 'MT'}
                  </Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 }}>
                {item.order ? <Badge label={item.order} tone="neutral" /> : null}
                {item.sType ? <Badge label={item.sType} tone="info" /> : null}
                <View style={{ flex: 1 }} />
                <Text variant="bodyMedium" tone="primary">
                  {item.total === '-' ? '—' : `${curSymbol(item.cur)}${fmtMoney(item.total as number)}`}
                </Text>
              </View>
            </Card>
            </FadeInItem>
          )}
        />
        );
      })()}

      <LotSheet item={lot} onClose={() => setLot(null)} />
    </View>
  );
}
