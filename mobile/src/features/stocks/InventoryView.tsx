import React, { useMemo, useState } from 'react';
import { View, FlatList, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card, Text, TextField, Badge, SkeletonList, FadeInItem, ErrorState, EmptyState } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { useStocks } from './useStocks';
import { curSymbol, fmtMoney } from '@/lib/format';

const fmtQty = (n: number) => new Intl.NumberFormat('en-US', { minimumFractionDigits: 3 }).format(n || 0);

export function InventoryView() {
  const { colors } = useTheme();
  const { data, isLoading, isError, error, refetch } = useStocks();
  const [search, setSearch] = useState('');

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const all = data?.rows || [];
    if (!q) return all;
    return all.filter(
      (r) =>
        (r.descriptionName || '').toLowerCase().includes(q) ||
        (r.warehouseName || '').toLowerCase().includes(q) ||
        (r.supplierName || '').toLowerCase().includes(q) ||
        (r.order || '').toLowerCase().includes(q)
    );
  }, [data, search]);

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

      {/* Per-warehouse totals */}
      {(data?.totals.length || 0) > 0 && (
        <Card style={{ marginTop: 12 }}>
          <Text variant="label" tone="muted" style={{ marginBottom: 8 }}>
            On-hand totals
          </Text>
          {data!.totals.map((t, i) => (
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
              <Text variant="bodyMedium" style={{ marginHorizontal: 10 }}>
                {fmtQty(t.qnty)} {t.qTypeLabel || 'MT'}
              </Text>
              <Text variant="bodyMedium" tone="primary">
                {curSymbol(t.cur)}
                {fmtMoney(t.total)}
              </Text>
            </View>
          ))}
        </Card>
      )}

      <Text variant="caption" tone="muted" style={{ marginTop: 12, marginBottom: 8 }}>
        {rows.length} item{rows.length === 1 ? '' : 's'} on hand
      </Text>

      {rows.length === 0 ? (
        <EmptyState
          title={search ? 'No matches' : 'No stock on hand'}
          message={search ? 'Try a different search.' : 'No current inventory.'}
          icon={<Ionicons name="cube-outline" size={40} color={colors.textFaint} />}
        />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(r) => r.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 160 }}
          onRefresh={refetch}
          refreshing={isLoading}
          renderItem={({ item, index }) => (
            <FadeInItem index={index}>
            <Card style={{ marginBottom: 12 }}>
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
      )}
    </View>
  );
}
