import { useMemo, useState } from 'react';
import { View, Pressable, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen, Card, Text, TextField, Select, DateField, Button, SectionHeader, EmptyState } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { useSettings } from '@/store/settings';
import { useInvoices, deriveInvoice } from '@/features/invoices/useInvoices';
import { useEditInvoice } from '@/features/invoices/useEditInvoice';
import { newId } from '@/data/writes';
import { num } from '@shared/finance';
import { curSymbol, fmtMoney } from '@/lib/format';
import { hapticSuccess } from '@/lib/haptics';

export default function InvoiceEdit() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { settings } = useSettings();
  const { data: invoices } = useInvoices();
  const edit = useEditInvoice();

  const view = useMemo(() => {
    const inv = invoices?.find((i) => i.id === id);
    return inv ? deriveInvoice(inv, settings) : null;
  }, [invoices, id, settings]);

  const [client, setClient] = useState<string>(() => {
    const c = view?.raw.client;
    return (c && typeof c === 'object' ? c.id : c) || '';
  });
  const [shpType, setShpType] = useState<string>(view?.raw.shpType || '');
  const [delDate, setDelDate] = useState<string | null>((view?.raw.delDate as any)?.startDate || null);
  const [lines, setLines] = useState<any[]>(() => (view?.raw.productsDataInvoice || []).map((p: any) => ({ ...p })));

  if (!view) {
    return (
      <Screen>
        <Back />
        <EmptyState title="Invoice not found" message="Open it from the invoices list." />
      </Screen>
    );
  }

  const sym = curSymbol(view.cur);
  const clientOptions = (settings?.Client?.Client || []).filter((c: any) => !c.deleted).map((c: any) => ({ value: c.id, label: c.nname || '—' }));
  const shipOptions = (settings?.Shipment?.Shipment || []).filter((s: any) => !s.deleted).map((s: any) => ({ value: s.id, label: s.shpType || '' }));

  const setLine = (i: number, patch: any) =>
    setLines((prev) => {
      const arr = [...prev];
      const row = { ...arr[i], ...patch };
      if ('qnty' in patch || 'unitPrc' in patch) row.total = row.qnty === 's' ? num(row.unitPrc) : Math.round(num(row.qnty) * num(row.unitPrc) * 100) / 100;
      arr[i] = row;
      return arr;
    });
  const addLine = () => setLines((p) => [...p, { id: newId(), description: '', descriptionId: '', qnty: '', unitPrc: '', total: 0 }]);
  const removeLine = (i: number) => setLines((p) => p.filter((_, k) => k !== i));
  const total = lines.reduce((s, p) => s + num(p.total), 0);

  const onSave = async () => {
    if (!client || !shpType) {
      Alert.alert('Missing fields', 'Client and shipment are required.');
      return;
    }
    try {
      await edit.mutateAsync({
        id: view.id,
        year: view.year,
        patch: {
          client,
          shpType,
          delDate: delDate ? { startDate: delDate, endDate: delDate } : { startDate: null, endDate: null },
          productsDataInvoice: lines,
          totalAmount: total,
        },
      });
      hapticSuccess();
      router.back();
    } catch (e: any) {
      Alert.alert('Save failed', e?.message || 'Could not save the invoice.');
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen contentContainerStyle={{ paddingTop: insets.top + 8 }} edges={false}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <Back />
          <Text variant="h3">Edit Invoice #{view.number}</Text>
          <View style={{ width: 60 }} />
        </View>

        <View style={{ gap: 14 }}>
          <Card style={{ gap: 14 }}>
            <Select label="Client" value={client} options={clientOptions} onChange={setClient} required />
            <Select label="Shipment" value={shpType} options={shipOptions} onChange={setShpType} required />
            <DateField label="Delivery date" value={delDate} onChange={setDelDate} />
          </Card>

          <Card>
            <SectionHeader title="Materials" subtitle={`${lines.length} line(s)`} right={<Text variant="h3" tone="primary">{sym}{fmtMoney(total)}</Text>} />
            {lines.map((l, i) => (
              <View key={l.id || i} style={{ gap: 8, paddingVertical: 12, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: colors.border }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <TextField value={String(l.description ?? '')} onChangeText={(t) => setLine(i, { description: t })} placeholder="Description" />
                  </View>
                  <Pressable onPress={() => removeLine(i)} hitSlop={8}><Ionicons name="trash-outline" size={20} color={colors.negative} /></Pressable>
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <View style={{ flex: 1 }}><TextField value={String(l.qnty ?? '')} onChangeText={(t) => setLine(i, { qnty: t })} placeholder="Qty" keyboardType="decimal-pad" /></View>
                  <View style={{ flex: 1 }}><TextField value={String(l.unitPrc ?? '')} onChangeText={(t) => setLine(i, { unitPrc: t })} placeholder="Unit price" keyboardType="decimal-pad" /></View>
                  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'flex-end' }}><Text variant="bodyMedium" tone="muted">{sym}{fmtMoney(num(l.total))}</Text></View>
                </View>
              </View>
            ))}
            <Pressable onPress={addLine} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12, paddingVertical: 11, borderRadius: 12, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.borderStrong }}>
              <Ionicons name="add" size={18} color={colors.primary} />
              <Text variant="bodyMedium" tone="primary">Add material</Text>
            </Pressable>
          </Card>

          <Text variant="caption" tone="faint" style={{ textAlign: 'center' }}>Invoice date & number are unchanged.</Text>
        </View>
      </Screen>

      {/* Sticky save bar */}
      <View
        style={{
          borderTopWidth: 1,
          borderTopColor: colors.border,
          backgroundColor: colors.bgElevated,
          paddingHorizontal: 16,
          paddingTop: 10,
          paddingBottom: insets.bottom + 10,
        }}
      >
        <Button title="Save changes" loading={edit.isPending} onPress={onSave} />
      </View>
    </KeyboardAvoidingView>
  );
}

function Back() {
  const { colors } = useTheme();
  return (
    <Pressable onPress={() => router.back()} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <Ionicons name="chevron-back" size={22} color={colors.primary} />
      <Text variant="bodyMedium" tone="primary">Cancel</Text>
    </Pressable>
  );
}
