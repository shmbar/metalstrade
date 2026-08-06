import React, { useMemo, useState } from 'react';
import { View, ScrollView, Pressable, Modal, Alert, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card, Text, Select, TextField, Button, LoadingState, ErrorState } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/tokens';
import { GradeSummaryCard } from './GradeSummaryCard';
import {
  useSharedStock, blankLot, financedOf, OWNERS, FINANCING, Financing, SharedLot,
} from './useSharedStock';

const fmtQ = (v: number) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 3 }).format(v || 0);

// Shared Stock (IMS + GIS) — inventory jointly held by the two companies. Lots need
// no contract, invoice or selling price; they live in a fixed namespace both
// accounts read. Port of the web tab (app/(root)/stocks/SharedStock.js).
export function SharedStockView() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const {
    rows, netRows, totalMt, money, accountName,
    warehouses, suppliers, currencies, whName, curSym,
    save, remove, isLoading, isError, error, refetch,
  } = useSharedStock();

  const [open, setOpen] = useState(false);
  const [lot, setLot] = useState<any>(blankLot());

  const whOptions = useMemo(
    () => warehouses.map((w: any) => ({ value: w.id, label: w.stock || w.nname || '' })).filter((o: any) => o.label),
    [warehouses]
  );
  const supOptions = useMemo(
    () => suppliers.map((s: any) => ({ value: s.id, label: s.nname || '' })).filter((o: any) => o.label),
    [suppliers]
  );
  const curOptions = useMemo(
    () => currencies.map((c: any) => ({ value: c.id, label: c.cur || c.symbol || c.id })),
    [currencies]
  );
  const pickOptions = useMemo(
    () => netRows.map((r) => ({
      value: r.id,
      label: `${r.name} · ${whName(r.stock)} · ${new Intl.NumberFormat('en-US', { maximumFractionDigits: 4 }).format(r.net)} MT${r.order ? ` · PO ${r.order}` : ''}`,
    })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [netRows, warehouses]
  );

  const setF = (k: string, v: any) =>
    setLot((prev: any) => {
      const next = { ...prev, [k]: v };
      if (k === 'qnty' || k === 'unitPrc') {
        next.total = (parseFloat(next.qnty) || 0) * (parseFloat(next.unitPrc) || 0);
      }
      return next;
    });

  const pickFromStock = (id: string) => {
    const r = netRows.find((x) => x.id === id);
    if (!r) return;
    setLot((prev: any) => ({
      ...prev,
      sourceId: r.id, sourceAccount: accountName, sourcePo: r.order,
      descriptionText: r.name,
      qnty: String(r.net),
      unitPrc: String(r.unitPrc ?? ''),
      total: (parseFloat(String(r.net)) || 0) * (parseFloat(String(r.unitPrc)) || 0),
      stock: r.stock,
      supplier: r.supplier || '',
      cur: r.cur,
    }));
  };

  const toggleOwner = (o: string) =>
    setLot((prev: any) => ({
      ...prev,
      owners: prev.owners.includes(o) ? prev.owners.filter((x: string) => x !== o) : [...prev.owners, o],
    }));

  const openAdd = () => { setLot(blankLot()); setOpen(true); };
  const openEdit = (row: SharedLot) => {
    setLot({
      ...blankLot(), ...row,
      owners: Array.isArray(row.owners) && row.owners.length ? row.owners : ['IMS', 'GIS'],
      financedBy: financedOf(row),
      qnty: String(row.qnty ?? ''),
      unitPrc: String(row.unitPrc ?? ''),
    });
    setOpen(true);
  };

  const doSave = () => {
    if (!lot.descriptionText || !lot.qnty || !lot.stock) {
      Alert.alert('Incomplete', 'Material, quantity and warehouse are required.');
      return;
    }
    save.mutate(lot, {
      onSuccess: () => setOpen(false),
      onError: (e: any) => Alert.alert('Could not save', e?.message || 'Failed to save shared stock.'),
    });
  };

  const doRemove = () => {
    if (!lot.id) { setOpen(false); return; }
    Alert.alert('Remove shared lot?', 'This deletes the shared record for both accounts.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => remove.mutate(lot.id, { onSuccess: () => setOpen(false) }),
      },
    ]);
  };

  const fmtMoneyMap = (obj: Record<string, number>) => {
    const parts = Object.entries(obj).map(
      ([cur, v]) =>
        (curSym(cur) || '$') +
        new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v)
    );
    return parts.length ? parts.join(' · ') : `${curSym('us') || '$'}0.00`;
  };

  if (isLoading) return <LoadingState label="Loading shared stock…" />;
  if (isError) return <ErrorState message={(error as Error)?.message || 'Failed to load.'} onRetry={refetch} />;

  return (
    <>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 96 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 12 }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text variant="caption" tone="muted">
              Shared between IMS &amp; GIS · {rows.length} lot{rows.length !== 1 ? 's' : ''} · {fmtQ(totalMt)} MT
            </Text>
          </View>
          <Pressable
            onPress={openAdd}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 4,
              paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999,
              backgroundColor: colors.primary,
            }}
          >
            <Ionicons name="add" size={15} color="#fff" />
            <Text variant="caption" color="#fff">Add</Text>
          </Pressable>
        </View>

        {rows.length === 0 ? (
          <Card style={{ borderStyle: 'dashed', paddingVertical: 28 }}>
            <Text variant="body" tone="muted" style={{ textAlign: 'center' }}>
              No shared stock yet. Use <Text variant="bodyMedium" tone="primary">Add</Text> to record inventory
              jointly held by IMS &amp; GIS — no contract or invoice needed. It appears here for both accounts.
            </Text>
          </Card>
        ) : (
          <>
            {rows.map((r) => (
              <Card key={r.id} style={{ marginBottom: 10 }} onPress={() => openEdit(r)}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text variant="bodyMedium" numberOfLines={2}>{r.descriptionName}</Text>
                    <Text variant="caption" tone="muted" numberOfLines={1} style={{ marginTop: 2 }}>
                      {[r.stockName, r.supplierName, r.status].filter((x) => x && x !== '—').join(' · ') || '—'}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text variant="bodyMedium">{fmtQ(parseFloat(String(r.qnty)) || 0)} MT</Text>
                    <Text variant="caption" tone="primary">
                      {curSym(r.cur) || '$'}
                      {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
                        (parseFloat(String(r.qnty)) || 0) * (parseFloat(String(r.unitPrc)) || 0)
                      )}
                    </Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                  <Pill label={r.ownersLabel} icon="share-social-outline" />
                  <Pill label={`Financed: ${r.financedLabel}`} />
                  {!!r.sourcePo && <Pill label={`PO ${r.sourcePo}`} />}
                </View>
              </Card>
            ))}

            {/* Bottom summary: total value + who finances how much (web parity). */}
            <Card style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 }}>
                <Text variant="body" tone="muted">Total</Text>
                <Text variant="bodyMedium">{fmtQ(totalMt)} MT · {fmtMoneyMap(money.totals)}</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 }}>
                <Text variant="body" tone="muted">Financing — IMS</Text>
                <Text variant="bodyMedium">{fmtMoneyMap(money.fin.IMS)}</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 }}>
                <Text variant="body" tone="muted">Financing — GIS</Text>
                <Text variant="bodyMedium">{fmtMoneyMap(money.fin.GIS)}</Text>
              </View>
              <Text variant="caption" tone="faint" style={{ marginTop: 6 }}>
                From each lot&apos;s &quot;Financed by&quot; — Both counts half to each company.
              </Text>
            </Card>

            {/* Same per-grade summary the regular stock tab has. */}
            <GradeSummaryCard dataTable={rows} />
          </>
        )}
      </ScrollView>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }} onPress={() => setOpen(false)} />
        <View
          style={{
            backgroundColor: colors.bgElevated,
            borderTopLeftRadius: radius['2xl'],
            borderTopRightRadius: radius['2xl'],
            paddingBottom: insets.bottom + spacing.lg,
            maxHeight: '88%',
          }}
        >
          <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
            <Text variant="h2">{lot.id ? 'Edit shared stock' : 'Add shared stock'}</Text>

            {pickOptions.length > 0 && (
              <View
                style={{
                  backgroundColor: colors.surfaceAlt, borderRadius: radius.lg,
                  borderWidth: 1, borderColor: colors.border, padding: 10, gap: 6,
                }}
              >
                <Select
                  label="Pick from my current stock"
                  value={lot.sourceId || ''}
                  options={pickOptions}
                  onChange={pickFromStock}
                />
                <Text variant="caption" tone="faint">
                  Selecting a lot fills everything in from your inventory ({accountName}) — lower the quantity
                  if you&apos;re sharing only part of it. The lot also stays in your own stock list.
                </Text>
              </View>
            )}

            <TextField
              label="Material / description *"
              value={lot.descriptionText}
              onChangeText={(v) => setF('descriptionText', v)}
              placeholder="e.g. 56Ni 14Cr 13Co Turnings"
            />
            <TextField
              label="Quantity (MT) *"
              value={String(lot.qnty ?? '')}
              onChangeText={(v) => setF('qnty', v.replace(/[^0-9.]/g, ''))}
              keyboardType="decimal-pad"
            />
            <Select label="Warehouse / location *" value={lot.stock} options={whOptions} onChange={(v) => setF('stock', v)} required />
            <TextField
              label="Unit price"
              value={String(lot.unitPrc ?? '')}
              onChangeText={(v) => setF('unitPrc', v.replace(/[^0-9.]/g, ''))}
              keyboardType="decimal-pad"
            />
            <Select label="Currency" value={lot.cur} options={curOptions} onChange={(v) => setF('cur', v)} />
            <Select label="Supplier (optional)" value={lot.supplier} options={supOptions} onChange={(v) => setF('supplier', v)} />
            <TextField
              label="Shipment status (optional)"
              value={lot.status}
              onChangeText={(v) => setF('status', v)}
              placeholder="e.g. Arrived / In transit"
            />

            <View>
              <Text variant="label" tone="muted" style={{ marginBottom: 6 }}>Owners</Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {OWNERS.map((o) => {
                  const on = lot.owners.includes(o);
                  return (
                    <Pressable
                      key={o}
                      onPress={() => toggleOwner(o)}
                      style={{
                        flexDirection: 'row', alignItems: 'center', gap: 6,
                        paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999,
                        backgroundColor: on ? colors.primary : colors.surfaceAlt,
                        borderWidth: 1, borderColor: on ? colors.primary : colors.border,
                      }}
                    >
                      <Ionicons
                        name={on ? 'checkbox' : 'square-outline'}
                        size={15}
                        color={on ? '#fff' : colors.textFaint}
                      />
                      <Text variant="caption" color={on ? '#fff' : colors.textMuted}>{o}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <Text variant="caption" tone="faint" style={{ marginTop: 4 }}>
                Both accounts see this lot regardless; owners records who holds it.
              </Text>
            </View>

            <View>
              <Text variant="label" tone="muted" style={{ marginBottom: 6 }}>Financed by</Text>
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                {FINANCING.map((f) => {
                  const on = (lot.financedBy || 'BOTH') === f;
                  return (
                    <Pressable
                      key={f}
                      onPress={() => setF('financedBy', f as Financing)}
                      style={{
                        paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999,
                        backgroundColor: on ? colors.primary : colors.surfaceAlt,
                        borderWidth: 1, borderColor: on ? colors.primary : colors.border,
                      }}
                    >
                      <Text variant="caption" color={on ? '#fff' : colors.textMuted}>
                        {f === 'BOTH' ? 'Both (50/50)' : f}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <Text variant="caption" tone="faint" style={{ marginTop: 4 }}>
                Who paid for this stock — drives the financing totals below the list.
              </Text>
            </View>

            <Button title="Save" loading={save.isPending} onPress={doSave} />
            <Button title="Cancel" variant="secondary" onPress={() => setOpen(false)} />
            {!!lot.id && (
              <Pressable onPress={doRemove} style={{ alignSelf: 'center', paddingVertical: 8 }}>
                <Text variant="bodyMedium" style={{ color: colors.negative }}>Remove</Text>
              </Pressable>
            )}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

function Pill({ label, icon }: { label: string; icon?: any }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row', alignItems: 'center', gap: 4,
        paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999,
        backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border,
      }}
    >
      {icon && <Ionicons name={icon} size={11} color={colors.textMuted} />}
      <Text variant="caption" tone="muted">{label}</Text>
    </View>
  );
}
