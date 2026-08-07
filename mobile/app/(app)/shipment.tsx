import { useState } from 'react';
import { View, Pressable, FlatList, Modal, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen, Card, Text, Badge, TextField, SkeletonList, ErrorState, EmptyState } from '@/components/ui';
import { PeriodSelector } from '@/components/PeriodSelector';
import { useTheme } from '@/theme/ThemeProvider';
import { useShipment, useSetShipmentStatus, ShipmentRow, fmtShipDate } from '@/features/shipment/useShipment';
import { SHIPMENT_STATUSES } from '@shared/shipmentStatus';
import { radius, spacing } from '@/theme/tokens';

const tone = (s: string): 'neutral' | 'info' | 'positive' | 'negative' | 'warn' => {
  if (s === 'Completed') return 'positive';
  if (s === 'On Hold') return 'negative';
  if (s === 'Pending') return 'warn';
  if (s === 'Shipped' || s === 'In Transit' || s === 'Arrived') return 'info';
  return 'neutral';
};

// The statuses web builds its chip row from (page.js:589), in web's order.
const CHIP_STATUSES = ['Pending', 'Shipped', 'In Transit', 'Arrived', 'Completed', 'On Hold'];

export default function Shipment() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [status, setStatusFilter] = useState('');
  const [supplier, setSupplier] = useState('');
  const [client, setClient] = useState('');
  const [shipType, setShipType] = useState('');
  const [urgency, setUrgency] = useState<'' | 'overdue' | 'soon'>('');
  const [editing, setEditing] = useState<ShipmentRow | null>(null);

  const { rows, counts, options, isLoading, isError, error, refetch } = useShipment({
    search,
    status,
    supplier,
    client,
    shipType,
    urgency,
  });
  const setStatus = useSetShipmentStatus();

  const Chip = ({ label, active, onPress, count }: { label: string; active: boolean; onPress: () => void; count?: number }) => (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999,
        backgroundColor: active ? colors.primary : colors.surfaceAlt,
        borderWidth: 1, borderColor: active ? colors.primary : colors.border,
      }}
    >
      <Text variant="caption" color={active ? '#fff' : colors.textMuted}>
        {label}{count == null ? '' : ` (${count})`}
      </Text>
    </Pressable>
  );

  return (
    <Screen scroll={false} flush contentContainerStyle={{ paddingTop: insets.top + 8 }} edges={false}>
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
        placeholder="Search PO, supplier, client or invoice…"
        autoCapitalize="none"
        rightElement={<Ionicons name="search" size={18} color={colors.textFaint} />}
      />
      <View style={{ height: 10 }} />

      {/* Attention strip — web's overdue / arriving-soon / in-transit triage counts,
          computed over ALL loaded contracts regardless of the other filters. */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 10 }}>
        <Chip label="Overdue" count={counts.overdue} active={urgency === 'overdue'} onPress={() => setUrgency((u) => (u === 'overdue' ? '' : 'overdue'))} />
        <Chip label="Arriving ≤7d" count={counts.soon} active={urgency === 'soon'} onPress={() => setUrgency((u) => (u === 'soon' ? '' : 'soon'))} />
        <Chip label="In transit" count={counts.inTransit} active={status === 'In Transit'} onPress={() => setStatusFilter((s) => (s === 'In Transit' ? '' : 'In Transit'))} />
      </ScrollView>

      {/* Status chips — counts ignore the other active filters, like web's. */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 10 }}>
        <Chip label="All" count={counts.all} active={status === ''} onPress={() => setStatusFilter('')} />
        {CHIP_STATUSES.map((s) => (
          <Chip key={s} label={s} count={counts.byStatus[s] || 0} active={status === s} onPress={() => setStatusFilter(s)} />
        ))}
      </ScrollView>

      {/* Supplier / client / ship-type filters — web's three dropdowns. */}
      {(options.suppliers.length > 1 || options.clients.length > 1 || options.shipTypes.length > 1) && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 12 }}>
          {supplier ? <Chip label={`Supplier: ${supplier}`} active onPress={() => setSupplier('')} /> : null}
          {client ? <Chip label={`Client: ${client}`} active onPress={() => setClient('')} /> : null}
          {shipType ? <Chip label={`Type: ${shipType}`} active onPress={() => setShipType('')} /> : null}
          {!supplier && options.suppliers.map((s) => <Chip key={`s-${s}`} label={s} active={false} onPress={() => setSupplier(s)} />)}
          {!client && options.clients.map((c) => <Chip key={`c-${c}`} label={c} active={false} onPress={() => setClient(c)} />)}
          {!shipType && options.shipTypes.map((t) => <Chip key={`t-${t}`} label={t} active={false} onPress={() => setShipType(t)} />)}
        </ScrollView>
      )}

      {isLoading ? (
        <SkeletonList />
      ) : isError ? (
        <ErrorState message={(error as Error)?.message || 'Failed to load.'} onRetry={refetch} />
      ) : rows.length === 0 ? (
        <EmptyState title="No shipments" message="No contracts match the current filters." icon={<Ionicons name="boat-outline" size={40} color={colors.textFaint} />} />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(r) => r.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 96 }}
          onRefresh={refetch}
          refreshing={isLoading}
          ListHeaderComponent={
            <Text variant="caption" tone="muted" style={{ marginBottom: 8 }}>
              {rows.length} of {counts.all} shipment{counts.all === 1 ? '' : 's'}
            </Text>
          }
          renderItem={({ item }) => (
            <Card style={{ marginBottom: 10 }} onPress={() => setEditing(item)}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text variant="h3" numberOfLines={1}>
                    {item.order || 'PO'}
                    {item.invoiceNo ? <Text variant="caption" tone="faint">{`  #${item.invoiceNo}`}</Text> : null}
                  </Text>
                  <Text variant="caption" tone="muted" numberOfLines={1}>
                    {item.supplierName}
                    {item.clientName !== '—' ? ` → ${item.clientName}` : ''}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Badge label={item.status || 'No status'} tone={tone(item.status)} />
                  {item.urgency && (
                    <Text variant="caption" tone={item.urgency === 'overdue' ? 'negative' : 'warn'}>
                      {item.urgency === 'overdue' ? 'Overdue' : 'Arriving soon'}
                    </Text>
                  )}
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 16, marginTop: 10, flexWrap: 'wrap' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Ionicons name="airplane-outline" size={13} color={colors.textFaint} />
                  {/* Web renders these DD.MM.YY, not raw ISO. */}
                  <Text variant="caption" tone="faint">ETD {fmtShipDate(item.etd)}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Ionicons name="flag-outline" size={13} color={colors.textFaint} />
                  <Text variant="caption" tone="faint">ETA {fmtShipDate(item.eta)}</Text>
                </View>
                {item.shpType !== '—' && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Ionicons name="cube-outline" size={13} color={colors.textFaint} />
                    <Text variant="caption" tone="faint">{item.shpType}</Text>
                  </View>
                )}
              </View>

              {(item.pol !== '—' || item.pod !== '—') && (
                <Text variant="caption" tone="faint" style={{ marginTop: 4 }} numberOfLines={1}>
                  {item.pol} → {item.pod}
                </Text>
              )}

              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                <Text variant="caption" tone="faint">
                  {item.updatedAt ? `Updated ${fmtShipDate(new Date(item.updatedAt).toISOString().slice(0, 10))}` : 'Never updated'}
                </Text>
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
