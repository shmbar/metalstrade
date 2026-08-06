import { useMemo, useState } from 'react';
import { View, Pressable, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen, Card, Text, Select, TextField, DateField, Button, SectionHeader, SegmentedControl, EmptyState, SkeletonList } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { useContracts } from '@/features/contracts/useContracts';
import { usePnl, useSetContractStatus, useSaveShipmentRow, CONTRACT_STATUSES, ShipmentRow } from '@/features/contracts/usePnl';
import { curSymbol, fmtMoney, dateLabel } from '@/lib/format';
import { hapticSuccess } from '@/lib/haptics';

const FINALIZED_FLAG = '4568';

// Shipments Tracking / P&L — web's third contract tab, which mobile had no
// counterpart for at all (the standalone shipment screen covers only contract-level
// ETD/ETA/status, not the per-invoice grid, freight/MT or profit).
export default function ContractPnl() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { data: contracts, isLoading } = useContracts();
  const setStatus = useSetContractStatus();
  const saveRow = useSaveShipmentRow();

  const contract = useMemo(() => contracts?.find((c) => c.id === id), [contracts, id]);
  const [viewCur, setViewCur] = useState<'us' | 'eu'>((contract as any)?.cur === 'eu' ? 'eu' : 'us');
  const pnl = usePnl(contract, viewCur);
  const [rows, setRows] = useState<ShipmentRow[] | null>(null);

  const shipments = rows ?? pnl?.shipments ?? [];
  const setRow = (i: number, patch: Partial<ShipmentRow>) =>
    setRows(shipments.map((r, k) => (k === i ? { ...r, ...patch } : r)));

  if (!contract && isLoading) {
    return (
      <Screen>
        <Back />
        <SkeletonList count={4} />
      </Screen>
    );
  }
  if (!contract || !pnl) {
    return (
      <Screen>
        <Back />
        <EmptyState title="Contract not found" message="Open it from the contracts list." />
      </Screen>
    );
  }

  const sym = curSymbol(viewCur);
  const m = (v: number) => `${sym}${fmtMoney(v)}`;

  return (
    <Screen contentContainerStyle={{ paddingTop: insets.top + 8 }} edges={false}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <Back />
        <Text variant="h3">P&amp;L · Shipments</Text>
        <View style={{ width: 60 }} />
      </View>
      <Text variant="caption" tone="muted" style={{ marginBottom: 12 }}>
        {(contract as any).order || 'Contract'}
      </Text>

      {/* Currency selector — web lets the whole tab be read in $ or €. */}
      <View style={{ marginBottom: 14 }}>
        <SegmentedControl
          value={viewCur}
          onChange={(v) => { setViewCur(v as any); setRows(null); }}
          options={[
            { value: 'us', label: 'USD' },
            { value: 'eu', label: 'EUR' },
          ]}
        />
      </View>

      <Card style={{ marginBottom: 14 }}>
        <SectionHeader title="Profit" subtitle="Sale − Purchase − Expenses" />
        <Row label="Invoice value (sale)" v={m(pnl.saleValue)} />
        <Row label="Purchase value" v={m(pnl.purchaseValue)} />
        <Row label="Expenses" v={m(pnl.expenses)} />
        <View style={{ borderTopWidth: 1, borderTopColor: colors.border, marginTop: 8, paddingTop: 8 }}>
          <Row
            label="Profit"
            v={m(pnl.profit)}
            strong
            color={pnl.profit >= 0 ? colors.positive : colors.negative}
          />
        </View>
      </Card>

      <Card style={{ marginBottom: 14 }}>
        <SectionHeader title="Freight" subtitle="freight-type expenses ÷ contracted MT" />
        <Row label="Freight total" v={m(pnl.freightTotal)} />
        <Row label="Contracted" v={`${fmtMoney(pnl.contractMT, 3)} MT`} />
        <Row label="Freight / MT" v={m(pnl.freightPerMT)} strong />
      </Card>

      <Card style={{ marginBottom: 14 }}>
        <SectionHeader title="Contract status" />
        <Select
          label=""
          value={(contract as any).conStatus || ''}
          options={CONTRACT_STATUSES.map((s) => ({ value: s.id, label: s.label }))}
          onChange={(v) =>
            setStatus.mutate(
              { contract, conStatus: v },
              { onError: (e: any) => Alert.alert('Failed', e?.message || 'Could not save status.') }
            )
          }
        />
      </Card>

      <Card>
        <SectionHeader title="Shipments" subtitle={`${shipments.length} invoice(s)`} />
        {shipments.length === 0 ? (
          <Text variant="body" tone="muted">No sales invoices linked yet.</Text>
        ) : (
          shipments.map((r, i) => (
            <View
              key={r.id}
              style={{ paddingVertical: 12, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: colors.border, gap: 10 }}
            >
              <Text variant="bodyMedium">Invoice #{r.invoice ?? '—'}</Text>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <TextField
                    label="Outturn"
                    value={String(r.rcvd ?? '')}
                    onChangeText={(t) => setRow(i, { rcvd: t.replace(/[^0-9.\-]/g, '') })}
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <TextField
                    label="Outturn amount"
                    value={String(r.outrnamnt ?? '')}
                    onChangeText={(t) => setRow(i, { outrnamnt: t.replace(/[^0-9.\-]/g, '') })}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <DateField
                    label={`ETD — ${dateLabel(r.etd)}`}
                    value={(r.etd as any)?.startDate || null}
                    onChange={(iso) => setRow(i, { etd: { startDate: iso, endDate: iso } })}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <DateField
                    label={`ETA — ${dateLabel(r.eta)}`}
                    value={(r.eta as any)?.startDate || null}
                    onChange={(iso) => setRow(i, { eta: { startDate: iso, endDate: iso } })}
                  />
                </View>
              </View>

              <TextField
                label="Release status"
                value={String(r.status ?? '')}
                onChangeText={(t) => setRow(i, { status: t })}
              />

              {/* Finalizing — '4568' means the final invoice has been issued. */}
              <Pressable
                onPress={() => setRow(i, { fnlzing: r.fnlzing === FINALIZED_FLAG ? '' : FINALIZED_FLAG })}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
              >
                <Ionicons
                  name={r.fnlzing === FINALIZED_FLAG ? 'checkbox' : 'square-outline'}
                  size={18}
                  color={r.fnlzing === FINALIZED_FLAG ? colors.primary : colors.textFaint}
                />
                <Text variant="body" tone="muted">Finalizing</Text>
              </Pressable>

              <Button
                title="Save shipment"
                variant="secondary"
                loading={saveRow.isPending}
                onPress={() =>
                  saveRow.mutate(
                    { row: r, contract },
                    {
                      onSuccess: () => { hapticSuccess(); setRows(null); },
                      onError: (e: any) => Alert.alert('Failed', e?.message || 'Could not save.'),
                    }
                  )
                }
              />
            </View>
          ))
        )}
      </Card>
    </Screen>
  );
}

function Row({ label, v, strong, color }: { label: string; v: string; strong?: boolean; color?: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 }}>
      <Text variant={strong ? 'bodyMedium' : 'body'} tone="muted">{label}</Text>
      <Text variant={strong ? 'bodyMedium' : 'body'} style={{ fontVariant: ['tabular-nums'], ...(color ? { color } : {}) }}>
        {v}
      </Text>
    </View>
  );
}

function Back() {
  const { colors } = useTheme();
  return (
    <Pressable onPress={() => router.back()} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <Ionicons name="chevron-back" size={22} color={colors.primary} />
      <Text variant="bodyMedium" tone="primary">Back</Text>
    </Pressable>
  );
}
