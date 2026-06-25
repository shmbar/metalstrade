import { useEffect, useMemo, useState } from 'react';
import { View, Pressable, Switch, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen, Card, Text, TextField, Select, DateField, Button, LoadingState, EmptyState } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { useSettings } from '@/store/settings';
import { useContracts } from '@/features/contracts/useContracts';
import { useStockInLots, useSaveStockIn, blankLot } from '@/features/stockin/useStockIn';
import { newId } from '@/data/writes';
import { num } from '@shared/finance';
import { curSymbol, fmtMoney } from '@/lib/format';

export default function StockIn() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { settings } = useSettings();
  const { data: contracts } = useContracts();
  const contract = useMemo(() => contracts?.find((c) => c.id === id), [contracts, id]);

  const { data: loaded, isLoading } = useStockInLots(contract);
  const save = useSaveStockIn();

  const [lots, setLots] = useState<any[]>([]);
  const [seeded, setSeeded] = useState(false);
  useEffect(() => {
    if (loaded && !seeded) {
      setLots(loaded.map((l: any) => ({ ...l })));
      setSeeded(true);
    }
  }, [loaded, seeded]);

  const sym = curSymbol(contract?.cur);
  const productOptions = useMemo(
    () => (contract?.productsData || []).map((p: any) => ({ value: p.id, label: p.description || '—' })),
    [contract]
  );
  const poOptions = useMemo(
    () => (contract?.poInvoices || []).map((p: any) => ({ value: p.id, label: String(p.inv ?? p.id) })),
    [contract]
  );
  const whOptions = useMemo(
    () => (settings?.Stocks?.Stocks || []).filter((w: any) => !w.deleted).map((w: any) => ({ value: w.id, label: w.stock || w.nname || '' })),
    [settings]
  );
  const clientOptions = useMemo(
    () => (settings?.Client?.Client || []).filter((c: any) => !c.deleted).map((c: any) => ({ value: c.id, label: c.nname || '—' })),
    [settings]
  );
  const statusOptions = [
    { value: 'sold', label: 'Sold' },
    { value: 'unsold', label: 'Unsold' },
  ];

  const update = (i: number, patch: any) =>
    setLots((prev) => {
      const next = [...prev];
      let row = { ...next[i], ...patch };
      // Auto-fill unit price from the contract product, then recompute total.
      if (patch.description !== undefined) {
        const p = contract?.productsData?.find((q: any) => q.id === patch.description);
        if (p?.unitPrc != null) row.unitPrc = p.unitPrc;
      }
      if ('qnty' in patch || 'unitPrc' in patch || patch.description !== undefined) {
        row.total = num(row.qnty) === 0 ? num(row.unitPrc) : Math.round(num(row.qnty) * num(row.unitPrc) * 100) / 100;
      }
      next[i] = row;
      return next;
    });

  const add = () => setLots((p) => [...p, blankLot(newId())]);
  const remove = (i: number) => setLots((p) => p.filter((_, k) => k !== i));

  const onSave = async () => {
    if (!contract) return;
    // Same required fields as whModal.
    const req = ['description', 'qnty', 'unitPrc', 'poInvoice', 'stock'];
    for (const l of lots) {
      const missing = req.some((k) => !l[k] && l[k] !== 0) || !l.indDate?.startDate;
      if (missing) {
        Alert.alert('Missing fields', 'Each lot needs material, quantity, unit price, PO invoice, warehouse and arrival date.');
        return;
      }
    }
    try {
      await save.mutateAsync({ contract, lots });
      router.back();
    } catch (e: any) {
      Alert.alert('Save failed', e?.message || 'Could not save stock.');
    }
  };

  if (!contract) {
    return (
      <Screen>
        <Back />
        <EmptyState title="Contract not found" message="Open it from the contracts list." />
      </Screen>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen contentContainerStyle={{ paddingTop: insets.top + 8 }} edges={false}>
        <Back />
        <View style={{ marginTop: 8, marginBottom: 14 }}>
          <Text variant="h1">Warehouse Stock</Text>
          <Text variant="body" tone="muted" style={{ marginTop: 2 }}>{contract.order}</Text>
        </View>

        {isLoading && !seeded ? (
          <LoadingState label="Loading lots…" />
        ) : (
          <View style={{ gap: 14 }}>
            {lots.map((l, i) => (
              <Card key={l.id} style={{ gap: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text variant="label" tone="muted">Lot {i + 1}</Text>
                  <Pressable onPress={() => remove(i)} hitSlop={8}>
                    <Ionicons name="trash-outline" size={20} color={colors.negative} />
                  </Pressable>
                </View>

                <Select label="Material" value={l.description} options={productOptions} onChange={(v) => update(i, { description: v })} required />

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <TextField label="Quantity" value={String(l.qnty ?? '')} onChangeText={(t) => update(i, { qnty: t })} keyboardType="decimal-pad" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <TextField label="Unit price" value={String(l.unitPrc ?? '')} onChangeText={(t) => update(i, { unitPrc: t })} keyboardType="decimal-pad" />
                  </View>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text variant="caption" tone="muted">Total</Text>
                  <Text variant="bodyMedium" tone="primary">{sym}{fmtMoney(num(l.total))}</Text>
                </View>

                <Select label="PO Invoice" value={l.poInvoice} options={poOptions} onChange={(v) => update(i, { poInvoice: v })} required />
                <Select label="Warehouse" value={l.stock} options={whOptions} onChange={(v) => update(i, { stock: v })} required />
                <DateField
                  label="Arrival date"
                  required
                  value={l.indDate?.startDate}
                  onChange={(iso) => update(i, { indDate: { startDate: iso, endDate: iso } })}
                />
                <Select label="Status" value={l.status} options={statusOptions} onChange={(v) => update(i, { status: v })} />
                <Select label="Consignee (optional)" value={l.client} options={clientOptions} onChange={(v) => update(i, { client: v })} />

                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text variant="body">Special invoice</Text>
                  <Switch value={!!l.spInv} onValueChange={(on) => update(i, { spInv: on })} trackColor={{ true: colors.primary }} />
                </View>
                {l.spInv && (
                  <TextField label="Company name" value={String(l.compName ?? '')} onChangeText={(t) => update(i, { compName: t })} />
                )}
              </Card>
            ))}

            <Pressable
              onPress={add}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.borderStrong }}
            >
              <Ionicons name="add" size={18} color={colors.primary} />
              <Text variant="bodyMedium" tone="primary">Add lot</Text>
            </Pressable>

            <Button title="Save stock" loading={save.isPending} onPress={onSave} />
            <Text variant="caption" tone="faint" style={{ textAlign: 'center' }}>
              Writes warehouse lots, updates the contract, and regenerates Misc-invoice rows for special-invoice lots.
            </Text>
          </View>
        )}
      </Screen>
    </KeyboardAvoidingView>
  );
}

function Back() {
  const { colors } = useTheme();
  return (
    <Pressable onPress={() => router.back()} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' }}>
      <Ionicons name="chevron-back" size={22} color={colors.primary} />
      <Text variant="bodyMedium" tone="primary">Back</Text>
    </Pressable>
  );
}
