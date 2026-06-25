import { useMemo, useState } from 'react';
import { View, Pressable, FlatList, Modal } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen, Card, Text, Badge, TextField, SkeletonList, ErrorState, EmptyState } from '@/components/ui';
import { PeriodSelector } from '@/components/PeriodSelector';
import { useTheme } from '@/theme/ThemeProvider';
import { useShipment, useSetShipmentStatus, ShipmentRow } from '@/features/shipment/useShipment';
import { SHIPMENT_STATUSES } from '@shared/shipmentStatus';
import { radius, spacing } from '@/theme/tokens';

const tone = (s: string): 'neutral' | 'info' | 'positive' | 'negative' | 'warn' => {
  if (s === 'Completed') return 'positive';
  if (s === 'On Hold') return 'negative';
  if (s === 'Pending') return 'warn';
  if (s === 'Shipped' || s === 'In Transit' || s === 'Arrived') return 'info';
  return 'neutral';
};

export default function Shipment() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { rows, isLoading, isError, error, refetch } = useShipment();
  const setStatus = useSetShipmentStatus();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<ShipmentRow | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.order.toLowerCase().includes(q) || r.supplierName.toLowerCase().includes(q));
  }, [rows, search]);

  return (
    <Screen scroll={false} contentContainerStyle={{ paddingTop: insets.top + 8 }} edges={false}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Ionicons name="chevron-back" size={22} color={colors.primary} />
          <Text variant="bodyMedium" tone="primary">Back</Text>
        </Pressable>
        <Text variant="h2">Shipments</Text>
        <PeriodSelector />
      </View>

      <TextField
        value={search}
        onChangeText={setSearch}
        placeholder="Search PO or supplier…"
        autoCapitalize="none"
        rightElement={<Ionicons name="search" size={18} color={colors.textFaint} />}
      />
      <View style={{ height: 12 }} />

      {isLoading ? (
        <SkeletonList />
      ) : isError ? (
        <ErrorState message={(error as Error)?.message || 'Failed to load.'} onRetry={refetch} />
      ) : filtered.length === 0 ? (
        <EmptyState title="No shipments" message="No contracts in the selected period." icon={<Ionicons name="boat-outline" size={40} color={colors.textFaint} />} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(r) => r.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 120 }}
          onRefresh={refetch}
          refreshing={isLoading}
          renderItem={({ item }) => (
            <Card style={{ marginBottom: 10 }} onPress={() => setEditing(item)}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text variant="h3" numberOfLines={1}>{item.order || 'PO'}</Text>
                  <Text variant="caption" tone="muted" numberOfLines={1}>{item.supplierName}</Text>
                </View>
                <Badge label={item.status || 'No status'} tone={tone(item.status)} />
              </View>
              <View style={{ flexDirection: 'row', gap: 16, marginTop: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Ionicons name="airplane-outline" size={13} color={colors.textFaint} />
                  <Text variant="caption" tone="faint">ETD {item.etd || '—'}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Ionicons name="flag-outline" size={13} color={colors.textFaint} />
                  <Text variant="caption" tone="faint">ETA {item.eta || '—'}</Text>
                </View>
                <View style={{ flex: 1 }} />
                <Text variant="caption" tone="primary">Set status</Text>
              </View>
            </Card>
          )}
        />
      )}

      {/* Status picker */}
      <Modal visible={!!editing} transparent animationType="slide" onRequestClose={() => setEditing(null)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }} onPress={() => setEditing(null)} />
        <View style={{ backgroundColor: colors.bgElevated, borderTopLeftRadius: radius['2xl'], borderTopRightRadius: radius['2xl'], padding: spacing.lg, paddingBottom: insets.bottom + spacing.lg }}>
          <Text variant="h2" style={{ marginBottom: 8 }}>Shipment status</Text>
          {SHIPMENT_STATUSES.map((s: string) => {
            const active = (editing?.status || '') === s;
            return (
              <Pressable
                key={s || 'none'}
                onPress={async () => {
                  if (editing) await setStatus.mutateAsync({ contract: editing.raw, status: s });
                  setEditing(null);
                }}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 13 }}
              >
                <Text variant="body" tone={active ? 'primary' : 'default'}>{s || 'No status'}</Text>
                {active && <Ionicons name="checkmark" size={18} color={colors.primary} />}
              </Pressable>
            );
          })}
        </View>
      </Modal>
    </Screen>
  );
}
