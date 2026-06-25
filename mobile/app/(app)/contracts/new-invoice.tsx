import { useMemo, useState } from 'react';
import { View, Pressable, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen, Card, Text, TextField, Select, DateField, Button, SectionHeader, EmptyState } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { useSettings } from '@/store/settings';
import { useContracts } from '@/features/contracts/useContracts';
import { useCreateInvoice, blankInvoiceForContract } from '@/features/invoices/useCreateInvoice';
import { newId } from '@/data/writes';
import { num } from '@shared/finance';
import { curSymbol, fmtMoney } from '@/lib/format';

export default function NewInvoice() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { settings } = useSettings();
  const { data: contracts } = useContracts();
  const contract = useMemo(() => contracts?.find((c) => c.id === id), [contracts, id]);
  const create = useCreateInvoice();

  const [inv, setInv] = useState(() => (contract ? blankInvoiceForContract(contract) : null));

  const sym = curSymbol(contract?.cur);
  const clientOptions = useMemo(
    () => (settings?.Client?.Client || []).filter((c: any) => !c.deleted).map((c: any) => ({ value: c.id, label: c.nname || '—' })),
    [settings]
  );
  const shipOptions = useMemo(
    () => (settings?.Shipment?.Shipment || []).filter((s: any) => !s.deleted).map((s: any) => ({ value: s.id, label: s.shpType || '' })),
    [settings]
  );
  const productOptions = useMemo(
    () => (contract?.productsData || []).map((p: any) => ({ value: p.id, label: p.description || '—' })),
    [contract]
  );
  const whOptions = useMemo(
    () => (settings?.Stocks?.Stocks || []).filter((w: any) => !w.deleted).map((w: any) => ({ value: w.id, label: w.stock || w.nname || '' })),
    [settings]
  );

  if (!contract || !inv) {
    return (
      <Screen>
        <Back />
        <EmptyState title="Contract not found" message="Open it from the contracts list." />
      </Screen>
    );
  }

  const lines = inv.productsDataInvoice || [];
  const set = (patch: any) => setInv((v) => ({ ...v!, ...patch }));
  const setLine = (i: number, patch: any) =>
    setInv((v) => {
      const arr = [...(v!.productsDataInvoice || [])];
      let row = { ...arr[i], ...patch };
      if (patch.descriptionId !== undefined) {
        const p = contract.productsData?.find((q: any) => q.id === patch.descriptionId);
        row.description = p?.description || '';
        if (p?.unitPrc != null && !row.unitPrc) row.unitPrc = p.unitPrc;
      }
      if ('qnty' in patch || 'unitPrc' in patch || patch.descriptionId !== undefined) {
        row.total = row.qnty === 's' ? num(row.unitPrc) : Math.round(num(row.qnty) * num(row.unitPrc) * 100) / 100;
      }
      arr[i] = row;
      return { ...v!, productsDataInvoice: arr };
    });
  const addLine = () =>
    set({ productsDataInvoice: [...lines, { id: newId(), po: '', descriptionId: '', container: '', qnty: '', unitPrc: '', total: 0, description: '', mtrlStatus: 'select', stock: '', stockValue: '' }] });
  const removeLine = (i: number) => set({ productsDataInvoice: lines.filter((_: any, k: number) => k !== i) });

  const total = lines.reduce((s: number, p: any) => s + num(p.total), 0);

  const onSave = async () => {
    if (!inv.client || !inv.cur || !inv.shpType || !inv.dateRange?.startDate) {
      Alert.alert('Missing fields', 'Client, currency, shipment and date are required.');
      return;
    }
    for (const l of lines as any[]) {
      if (!l.descriptionId || !l.qnty || !l.unitPrc || (l.stock === '' && l.qnty !== 's')) {
        Alert.alert('Materials incomplete', 'Each line needs material, quantity, unit price and warehouse.');
        return;
      }
    }
    const clientName = settings?.Client?.Client?.find((c: any) => c.id === inv.client)?.nname || '';
    try {
      const saved = await create.mutateAsync({ contract, invoice: { ...inv, date: inv.dateRange!.startDate! }, clientName });
      router.replace(`/(app)/invoices/${saved.id}`);
    } catch (e: any) {
      Alert.alert('Save failed', e?.message || 'Could not create the invoice.');
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen contentContainerStyle={{ paddingTop: insets.top + 8 }} edges={false}>
        <Back />
        <View style={{ marginTop: 8, marginBottom: 14 }}>
          <Text variant="h1">New Invoice</Text>
          <Text variant="body" tone="muted" style={{ marginTop: 2 }}>From {contract.order} · # assigned on save</Text>
        </View>

        <View style={{ gap: 14 }}>
          <Card style={{ gap: 14 }}>
            <Select label="Client" value={String(inv.client || '')} options={clientOptions} onChange={(v) => set({ client: v })} required />
            <Select label="Shipment" value={String(inv.shpType || '')} options={shipOptions} onChange={(v) => set({ shpType: v })} required />
            <DateField label="Invoice date" required value={inv.dateRange?.startDate} onChange={(iso) => set({ dateRange: { startDate: iso, endDate: iso } })} />
            <DateField label="Delivery date" value={(inv.delDate as any)?.startDate} onChange={(iso) => set({ delDate: { startDate: iso, endDate: iso } })} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text variant="label" tone="muted">Currency</Text>
              <Text variant="bodyMedium">{sym.trim() === '€' ? 'EUR' : 'USD'} (from contract)</Text>
            </View>
          </Card>

          <Card>
            <SectionHeader
              title="Materials"
              subtitle={`${lines.length} line(s)`}
              right={<Text variant="h3" tone="primary">{sym}{fmtMoney(total)}</Text>}
            />
            {lines.map((l: any, i: number) => (
              <View key={l.id} style={{ gap: 10, paddingVertical: 12, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: colors.border }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text variant="label" tone="faint" style={{ width: 18 }}>{i + 1}</Text>
                  <View style={{ flex: 1 }}>
                    <Select label="Material" value={l.descriptionId} options={productOptions} onChange={(v) => setLine(i, { descriptionId: v })} required />
                  </View>
                  <Pressable onPress={() => removeLine(i)} hitSlop={8} style={{ padding: 4 }}>
                    <Ionicons name="trash-outline" size={20} color={colors.negative} />
                  </Pressable>
                </View>
                <Select label="Warehouse" value={l.stock} options={whOptions} onChange={(v) => setLine(i, { stock: v })} required />
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <View style={{ flex: 1 }}><TextField label="Qty" value={String(l.qnty ?? '')} onChangeText={(t) => setLine(i, { qnty: t })} keyboardType="decimal-pad" /></View>
                  <View style={{ flex: 1 }}><TextField label="Unit price" value={String(l.unitPrc ?? '')} onChangeText={(t) => setLine(i, { unitPrc: t })} keyboardType="decimal-pad" /></View>
                  <View style={{ flex: 1, justifyContent: 'flex-end', paddingBottom: 12, alignItems: 'flex-end' }}>
                    <Text variant="bodyMedium" tone="muted">{sym}{fmtMoney(num(l.total))}</Text>
                  </View>
                </View>
              </View>
            ))}
            <Pressable
              onPress={addLine}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12, paddingVertical: 11, borderRadius: 12, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.borderStrong }}
            >
              <Ionicons name="add" size={18} color={colors.primary} />
              <Text variant="bodyMedium" tone="primary">Add material</Text>
            </Pressable>
          </Card>

          <Button title="Create invoice" loading={create.isPending} onPress={onSave} />
          <Text variant="caption" tone="faint" style={{ textAlign: 'center' }}>
            Assigns the next invoice #, links it to {contract.order}, and records a stock-out per line.
          </Text>
        </View>
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
