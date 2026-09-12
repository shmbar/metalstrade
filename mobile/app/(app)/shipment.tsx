import { useState } from 'react';
import { View, FlatList, ScrollView } from 'react-native';
import { Pressable } from '@/components/ui/Pressable';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen, Card, Text, Badge, SkeletonList, ErrorState, EmptyState, Sheet, SearchField, Chip } from '@/components/ui';
import { PeriodSelector } from '@/components/PeriodSelector';
import { useTheme } from '@/theme/ThemeProvider';
import { useShipment, useSetShipmentStatus, ShipmentRow, fmtShipDate } from '@/features/shipment/useShipment';
import { SHIPMENT_STATUSES } from '@shared/shipmentStatus';
import { StackHeader } from '@/components/StackHeader';
import { spacing } from '@/theme/tokens';

const tone = (s: string): 'neutral' | 'info' | 'positive' | 'negative' | 'warn' => {
  if (s === 'Completed') return 'positive';
  if (s === 'On Hold') return 'negative';
  if (s === 'Pending') return 'warn';
  if (s === 'Shipped' || s === 'In Transit' || s === 'Arrived') return 'info';
  return 'neutral';
};

// The statuses web builds its chip row from (page.js:589), in web's order.
const CHIP_STATUSES = ['Pending', 'Shipped', 'In Transit', 'Arrived', 'Completed', 'On Hold'];

// Web prints shipment quantities with 3 decimals (frmQty).
const fmtQty = (n: number) =>
  new Intl.NumberFormat('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(Number(n) || 0);

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

  return (
    <Screen scroll={false} flush contentContainerStyle={{ paddingTop: insets.top + 8 }} edges={false}>
      <StackHeader title="Shipments" right={<PeriodSelector />} />

      <SearchField value={search} onChangeText={setSearch} placeholder="Search PO, supplier, client or invoice…" />
      <View style={{ height: 10 }} />

      {/* Attention strip — web's overdue / arriving-soon / in-transit triage counts,
          computed over ALL loaded contracts regardless of the other filters. */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginHorizontal: -spacing.lg, flexGrow: 0 }}
        contentContainerStyle={{ gap: 8, paddingHorizontal: spacing.lg, paddingBottom: 10 }}
      >
        <Chip label="Overdue" count={counts.overdue} active={urgency === 'overdue'} onPress={() => setUrgency((u) => (u === 'overdue' ? '' : 'overdue'))} />
        <Chip label="Arriving ≤7d" count={counts.soon} active={urgency === 'soon'} onPress={() => setUrgency((u) => (u === 'soon' ? '' : 'soon'))} />
        <Chip label="In transit" count={counts.inTransit} active={status === 'In Transit'} onPress={() => setStatusFilter((s) => (s === 'In Transit' ? '' : 'In Transit'))} />
      </ScrollView>

      {/* Status chips — counts ignore the other active filters, like web's. */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginHorizontal: -spacing.lg, flexGrow: 0 }}
        contentContainerStyle={{ gap: 8, paddingHorizontal: spacing.lg, paddingBottom: 10 }}
      >
        <Chip label="All" count={counts.all} active={status === ''} onPress={() => setStatusFilter('')} />
        {CHIP_STATUSES.map((s) => (
          <Chip key={s} label={s} count={counts.byStatus[s] || 0} active={status === s} onPress={() => setStatusFilter(s)} />
        ))}
      </ScrollView>

      {/* Supplier / client / ship-type filters — web's three dropdowns. */}
      {(options.suppliers.length > 1 || options.clients.length > 1 || options.shipTypes.length > 1) && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginHorizontal: -spacing.lg, flexGrow: 0 }}
          contentContainerStyle={{ gap: 8, paddingHorizontal: spacing.lg, paddingBottom: 12 }}
        >
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
        <FlatList keyboardShouldPersistTaps="handled"
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
                    {item.shipments.length > 1 ? (
                      <Text variant="caption" tone="faint">{`  +${item.shipments.length - 1}`}</Text>
                    ) : null}
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

              {/* PO quantity, shipped and what is still owed — web's three quantity
                  columns (page.js, 2026-09-02). Without them the phone could not answer
                  "how much of this PO is still coming?", which is why the page exists.
                  Remaining is amber while the PO is open, red when over-shipped, and a
                  contract with no stated quantity shows no figures at all. */}
              {item.poQty > 0 && (
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                  {[
                    { k: 'PO', v: fmtQty(item.poQty), tone: colors.textMuted },
                    { k: 'Shipped', v: item.shippedQty ? fmtQty(item.shippedQty) : '—', tone: colors.text },
                    {
                      k: 'Remaining',
                      v: item.remainingQty === null ? '—' : Math.abs(item.remainingQty) < 0.0005 ? '0' : fmtQty(item.remainingQty),
                      tone:
                        item.remainingQty === null || Math.abs(item.remainingQty) < 0.0005
                          ? colors.textMuted
                          : item.remainingQty > 0
                            ? colors.warn
                            : colors.negative,
                    },
                  ].map((q) => (
                    <View
                      key={q.k}
                      style={{
                        flex: 1,
                        paddingVertical: 7,
                        paddingHorizontal: 10,
                        borderRadius: 10,
                        backgroundColor: colors.surfaceAlt,
                        borderWidth: 1,
                        borderColor: colors.border,
                      }}
                    >
                      <Text variant="caption" tone="faint">{q.k}</Text>
                      <Text variant="bodyMedium" numberOfLines={1} style={{ color: q.tone, fontVariant: ['tabular-nums'] }}>
                        {q.v}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

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
      <Sheet visible={!!editing} onClose={() => setEditing(null)} title="Shipment status">
        {SHIPMENT_STATUSES.map((s: string) => {
          const active = (editing?.status || '') === s;
          return (
            <Pressable
              key={s || 'none'}
              onPress={async () => {
                if (editing) await setStatus.mutateAsync({ contract: editing.raw, status: s });
                setEditing(null);
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 }}
            >
              <Text variant="body" tone={active ? 'primary' : 'default'}>{s || 'No status'}</Text>
              {active && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
            </Pressable>
          );
        })}
      </Sheet>
    </Screen>
  );
}
