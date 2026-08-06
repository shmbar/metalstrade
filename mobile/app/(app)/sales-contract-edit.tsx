import { useMemo, useState } from 'react';
import { View, Pressable, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen, Card, Text, Select, TextField, DateField, Button, SectionHeader, EmptyState } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { useSettings } from '@/store/settings';
import {
  useSalesContracts, useSaveSalesContract, useDeleteSalesContract, missingSalesContractFields,
} from '@/features/salescontracts/useSalesContracts';
import { blankSalesContract, newId } from '@/data/writes';
import { curSymbol, fmtMoney } from '@/lib/format';
import { num } from '@shared/finance';
import { hapticSuccess } from '@/lib/haptics';

// Sales-contract detail / editor — the mobile twin of web's SalesContractDetails
// modal. Web requires client / cur / contractNo / date, derives `total` from the
// product lines, and never auto-generates the contract number.
export default function SalesContractEdit() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { settings } = useSettings();
  const { rows } = useSalesContracts();
  const save = useSaveSalesContract();
  const del = useDeleteSalesContract();

  const isNew = id === 'new';
  const existing = useMemo(() => rows.find((r: any) => r.id === id), [rows, id]);
  const [v, setV] = useState<any>(() => (isNew ? blankSalesContract() : { ...((existing as any)?.raw || {}) }));
  const [submitted, setSubmitted] = useState(false);

  const set = (k: string, val: any) => setV((p: any) => ({ ...p, [k]: val }));
  const setDate = (iso: string) => setV((p: any) => ({ ...p, dateRange: { startDate: iso, endDate: iso }, date: iso }));

  const clientOptions = useMemo(
    () => (settings?.Client?.Client || []).filter((c: any) => !c.deleted).map((c: any) => ({ value: c.id, label: c.nname || '—' })),
    [settings]
  );
  const curOptions = useMemo(
    () => (settings?.Currency?.Currency || []).map((c: any) => ({ value: c.id, label: c.cur || c.id })),
    [settings]
  );
  const qtyOptions = useMemo(
    () => (settings?.Quantity?.Quantity || []).map((q: any) => ({ value: q.id, label: q.qTypeTable || q.id })),
    [settings]
  );

  const lines: any[] = v.productsData || [];
  const setLine = (i: number, patch: any) =>
    setV((p: any) => {
      const arr = [...(p.productsData || [])];
      arr[i] = { ...arr[i], ...patch };
      return { ...p, productsData: arr };
    });
  const addLine = () =>
    setV((p: any) => ({ ...p, productsData: [...(p.productsData || []), { id: newId(), description: '', qnty: '', unitPrc: '' }] }));
  const removeLine = (i: number) =>
    setV((p: any) => ({ ...p, productsData: (p.productsData || []).filter((_: any, k: number) => k !== i) }));

  // Same derivation the write layer applies, shown live.
  const total = lines.reduce((s, r) => s + num(r.qnty) * num(r.unitPrc), 0);

  const missing = missingSalesContractFields(v);
  const err = (k: string) => (submitted && missing.includes(k) ? 'Required' : undefined);

  if (!isNew && !existing) {
    return (
      <Screen>
        <BackBar />
        <EmptyState title="Sales contract not found" message="Open it from the list." />
      </Screen>
    );
  }

  const onSave = async () => {
    setSubmitted(true);
    if (missing.length) {
      Alert.alert('Missing fields', `Required: ${missing.join(', ')}`);
      return;
    }
    try {
      await save.mutateAsync({
        value: v,
        previousDate: (existing as any)?.raw?.dateRange?.startDate || (existing as any)?.raw?.date,
      });
      hapticSuccess();
      router.back();
    } catch (e: any) {
      Alert.alert('Save failed', e?.message || 'Could not save the sales contract.');
    }
  };

  const onDelete = () =>
    Alert.alert('Delete sales contract?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await del.mutateAsync(v);
            router.back();
          } catch (e: any) {
            Alert.alert('Delete failed', e?.message || 'Could not delete.');
          }
        },
      },
    ]);

  const sym = curSymbol(v.cur);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen contentContainerStyle={{ paddingTop: insets.top + 8 }} edges={false}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <BackBar />
          <Text variant="h3">{isNew ? 'New sales contract' : 'Sales contract'}</Text>
          <View style={{ width: 60 }} />
        </View>

        <Card style={{ gap: 12, marginBottom: 14 }}>
          <TextField
            label="Sales contract # *"
            value={String(v.contractNo ?? '')}
            onChangeText={(t) => set('contractNo', t)}
            error={err('contractNo')}
          />
          <DateField label="Date" value={v.dateRange?.startDate || v.date || null} onChange={setDate} error={err('date')} required />
          <Select label="Client" value={v.client} options={clientOptions} onChange={(x) => set('client', x)} error={err('client')} required />
          <Select label="Currency" value={v.cur} options={curOptions} onChange={(x) => set('cur', x)} error={err('cur')} required />
          <Select label="Quantity unit" value={v.qTypeTable} options={qtyOptions} onChange={(x) => set('qTypeTable', x)} />
          <TextField label="Comments" value={String(v.comments ?? '')} onChangeText={(t) => set('comments', t)} multiline />
        </Card>

        <Card style={{ marginBottom: 14 }}>
          <SectionHeader
            title="Materials"
            subtitle={`${lines.length} line(s)`}
            right={
              <Pressable onPress={addLine} hitSlop={8}>
                <Ionicons name="add-circle-outline" size={22} color={colors.primary} />
              </Pressable>
            }
          />
          {lines.length === 0 ? (
            <Text variant="body" tone="muted">No material lines yet.</Text>
          ) : (
            lines.map((p, i) => (
              <View
                key={p.id || i}
                style={{ paddingVertical: 10, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: colors.border, gap: 8 }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <TextField
                      label="Description"
                      value={String(p.description ?? '')}
                      onChangeText={(t) => setLine(i, { description: t })}
                    />
                  </View>
                  <Pressable onPress={() => removeLine(i)} hitSlop={8} style={{ paddingTop: 18 }}>
                    <Ionicons name="trash-outline" size={18} color={colors.negative} />
                  </Pressable>
                </View>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <TextField
                      label="Quantity"
                      value={String(p.qnty ?? '')}
                      onChangeText={(t) => setLine(i, { qnty: t.replace(/[^0-9.]/g, '') })}
                      keyboardType="decimal-pad"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <TextField
                      label="Unit price"
                      value={String(p.unitPrc ?? '')}
                      onChangeText={(t) => setLine(i, { unitPrc: t.replace(/[^0-9.]/g, '') })}
                      keyboardType="decimal-pad"
                    />
                  </View>
                </View>
                <Text variant="caption" tone="faint" style={{ textAlign: 'right' }}>
                  Line total {sym}{fmtMoney(num(p.qnty) * num(p.unitPrc))}
                </Text>
              </View>
            ))
          )}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: 10, marginTop: 6, borderTopWidth: 1, borderTopColor: colors.border }}>
            <Text variant="bodyMedium">Total</Text>
            <Text variant="bodyMedium" tone="primary" style={{ fontVariant: ['tabular-nums'] }}>
              {sym}{fmtMoney(total)}
            </Text>
          </View>
        </Card>

        <Button title="Save" loading={save.isPending} onPress={onSave} />
        {!isNew && (
          <Pressable onPress={onDelete} style={{ alignSelf: 'center', paddingVertical: 14 }}>
            <Text variant="bodyMedium" style={{ color: colors.negative }}>Delete sales contract</Text>
          </Pressable>
        )}
      </Screen>
    </KeyboardAvoidingView>
  );
}

function BackBar() {
  const { colors } = useTheme();
  return (
    <Pressable onPress={() => router.back()} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <Ionicons name="chevron-back" size={22} color={colors.primary} />
      <Text variant="bodyMedium" tone="primary">Back</Text>
    </Pressable>
  );
}
