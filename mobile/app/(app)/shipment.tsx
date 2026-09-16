import { useState } from 'react';
import { View, FlatList, ScrollView } from 'react-native';
import { Pressable } from '@/components/ui/Pressable';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen, Card, Text, Badge, SkeletonList, ErrorState, EmptyState, Sheet, SearchField, Chip, TextField, Select, ChipRow, ChipDivider } from '@/components/ui';
import { PeriodSelector } from '@/components/PeriodSelector';
import { useTheme } from '@/theme/ThemeProvider';
import {
  useShipment, useSetShipmentStatus, useSaveShipmentLine, useSaveContractShipmentNotes, ShipmentRow, ShipmentLine, fmtShipDate,
} from '@/features/shipment/useShipment';
import { router } from 'expo-router';
import { toast } from '@/store/toast';
import { SHIPMENT_STATUSES } from '@shared/shipmentStatus';
import { StackHeader } from '@/components/StackHeader';
import { LIST_END_PADDING } from '@/theme/tokens';
import { keyboardScrollProps } from '@/lib/keyboard';

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
  const saveLine = useSaveShipmentLine();
  const saveNotes = useSaveContractShipmentNotes();
  // Notes are typed freely and saved when the field loses focus, like web's NotesCell.
  const [notes, setNotes] = useState<Record<string, string>>({});

  // Optimistic: the sheet reflects a change at once; the refetch replaces it.
  const patchEditing = (patch: Partial<ShipmentRow>) => setEditing((e) => (e ? { ...e, ...patch } : e));
  const patchLine = (lineId: string, patch: Partial<ShipmentLine>) =>
    setEditing((e) => (e ? { ...e, shipments: e.shipments.map((x) => (x.id === lineId ? { ...x, ...patch } : x)) } : e));
  const fail = (e: any) => toast.error(e?.message || 'Could not save — please try again.');

  return (
    <Screen scroll={false} flush contentContainerStyle={{ paddingTop: insets.top + 8 }} edges={false}>
      <StackHeader title="Shipments" right={<PeriodSelector />} />

      <SearchField value={search} onChangeText={setSearch} placeholder="Search PO, supplier, client or invoice…" />
      {/* Triage and status share one swipeable row. The separate "In transit" triage chip
          applied exactly the same filter as the In Transit status chip beside it, so the
          screen showed it twice across three stacked rows of chips. */}
      <ChipRow style={{ marginTop: 10 }}>
        <Chip label="Overdue" count={counts.overdue} active={urgency === 'overdue'} onPress={() => setUrgency((u) => (u === 'overdue' ? '' : 'overdue'))} />
        <Chip label="Arriving ≤7d" count={counts.soon} active={urgency === 'soon'} onPress={() => setUrgency((u) => (u === 'soon' ? '' : 'soon'))} />
        <ChipDivider />
        <Chip label="All" count={counts.all} active={status === ''} onPress={() => setStatusFilter('')} />
        {CHIP_STATUSES.map((s) => (
          <Chip key={s} label={s} count={counts.byStatus[s] || 0} active={status === s} onPress={() => setStatusFilter(s)} />
        ))}
      </ChipRow>

      {/* Supplier / client / ship type — web's three dropdowns, as picker chips. The row
          used to list every supplier, client and type as its own chip. */}
      {(options.suppliers.length > 1 || options.clients.length > 1 || options.shipTypes.length > 1) && (
        <ChipRow style={{ marginTop: 8 }}>
          {options.suppliers.length > 1 && (
            <Select variant="chip" label="Supplier" placeholder="All suppliers" value={supplier} options={options.suppliers.map((s) => ({ value: s, label: s }))} onChange={setSupplier} />
          )}
          {options.clients.length > 1 && (
            <Select variant="chip" label="Client" placeholder="All clients" value={client} options={options.clients.map((c) => ({ value: c, label: c }))} onChange={setClient} />
          )}
          {options.shipTypes.length > 1 && (
            <Select variant="chip" label="Ship type" placeholder="All types" value={shipType} options={options.shipTypes.map((t) => ({ value: t, label: t }))} onChange={setShipType} />
          )}
        </ChipRow>
      )}
      <View style={{ height: 12 }} />

      {isLoading ? (
        <SkeletonList />
      ) : isError ? (
        <ErrorState message={(error as Error)?.message || 'Failed to load.'} onRetry={refetch} />
      ) : rows.length === 0 ? (
        <EmptyState title="No shipments" message="No contracts match the current filters." icon={<Ionicons name="boat-outline" size={40} color={colors.textFaint} />} />
      ) : (
        <FlatList
        {...keyboardScrollProps} keyboardShouldPersistTaps="handled"
          data={rows}
          keyExtractor={(r) => r.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: LIST_END_PADDING }}
          onRefresh={refetch}
          refreshing={isLoading}
          ListHeaderComponent={
            <Text variant="caption" tone="muted" style={{ marginBottom: 8 }}>
              {rows.length} of {counts.all} shipment{counts.all === 1 ? '' : 's'}
            </Text>
          }
          renderItem={({ item }) => (
            <Card style={{ marginBottom: 12 }} onPress={() => setEditing(item)}>
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
                <Text variant="caption" tone="primary">{item.shipments.length > 1 ? `Manage ${item.shipments.length} shipments` : 'Manage'}</Text>
              </View>
            </Card>
          )}
        />
      )}

      {/* Shipment sheet — web's contract row + its expandable shipment rows: the
          contract's status and notes, then one row per invoice with that shipment's
          own status and notes (saved to the invoice), each opening its invoice. */}
      <Sheet
        visible={!!editing}
        onClose={() => setEditing(null)}
        title={editing ? `PO ${editing.order || ''}` : 'Shipment'}
        subtitle={editing ? [editing.supplierName, editing.clientName !== '—' ? editing.clientName : ''].filter(Boolean).join(' → ') : undefined}
      >
        {editing && (
          <View style={{ gap: 14, paddingBottom: 8 }}>
            <View style={{ gap: 8 }}>
              <Text variant="label" tone="muted">Contract status</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {SHIPMENT_STATUSES.map((st: string) => (
                  <Chip
                    key={st || 'none'}
                    label={st || 'No status'}
                    active={(editing.status || '') === st}
                    onPress={() => {
                      patchEditing({ status: st });
                      setStatus.mutate({ contract: editing.raw, status: st }, { onError: fail });
                    }}
                  />
                ))}
              </ScrollView>
              <TextField
                label="Notes"
                value={notes[editing.id] ?? String((editing.raw as any)?.shipmentNotes || '')}
                onChangeText={(t) => setNotes((p) => ({ ...p, [editing.id]: t }))}
                onEndEditing={() => {
                  const next = notes[editing.id];
                  if (next === undefined || next === String((editing.raw as any)?.shipmentNotes || '')) return;
                  saveNotes.mutate({ contract: editing.raw, notes: next }, { onError: fail });
                }}
                placeholder="Where the cargo is, what is holding it"
                multiline
              />
            </View>

            {editing.shipments.length > 0 && (
              <View style={{ gap: 4 }}>
                <Text variant="label" tone="muted">
                  {editing.shipments.length} shipment{editing.shipments.length === 1 ? '' : 's'}
                </Text>
                {editing.shipments.map((sh, i) => (
                  <View key={sh.id} style={{ paddingVertical: 12, borderTopWidth: i ? 1 : 0, borderTopColor: colors.border, gap: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                      <Pressable
                        onPress={() => {
                          setEditing(null);
                          router.push(`/(app)/invoices/${sh.id}`);
                        }}
                        accessibilityRole="link"
                        hitSlop={8}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                      >
                        <Text variant="bodyMedium" tone="primary">Invoice #{sh.invoice}</Text>
                        <Ionicons name="chevron-forward" size={16} color={colors.primary} />
                      </Pressable>
                      <Text variant="caption" tone="faint" style={{ fontVariant: ['tabular-nums'] }}>
                        {fmtShipDate(sh.date)} · {fmtQty(sh.qnty)} MT
                      </Text>
                    </View>
                    {sh.canceled ? (
                      <Badge label="Cancelled — shipped nothing" tone="neutral" />
                    ) : (
                      <>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                          {SHIPMENT_STATUSES.map((st: string) => (
                            <Chip
                              key={st || 'none'}
                              label={st || 'No status'}
                              active={(sh.shipmentStatus || '') === st}
                              onPress={() => {
                                patchLine(sh.id, { shipmentStatus: st });
                                saveLine.mutate({ line: sh, contract: editing.raw, patch: { shipmentStatus: st } }, { onError: fail });
                              }}
                            />
                          ))}
                        </ScrollView>
                        <TextField
                          value={notes[sh.id] ?? sh.shipmentNotes}
                          onChangeText={(t) => setNotes((p) => ({ ...p, [sh.id]: t }))}
                          onEndEditing={() => {
                            const next = notes[sh.id];
                            if (next === undefined || next === sh.shipmentNotes) return;
                            patchLine(sh.id, { shipmentNotes: next });
                            saveLine.mutate({ line: sh, contract: editing.raw, patch: { shipmentNotes: next } }, { onError: fail });
                          }}
                          placeholder="Shipment notes"
                          multiline
                        />
                      </>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </Sheet>
    </Screen>
  );
}
