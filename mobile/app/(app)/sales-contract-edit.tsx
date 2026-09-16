import { useEffect, useMemo, useRef, useState } from 'react';
import { View, Alert } from 'react-native';
import { Pressable } from '@/components/ui/Pressable';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen, Card, Text, Select, TextField, DateField, Button, SectionHeader, EmptyState, StackHeader, IconButton, Chip } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { useSettings } from '@/store/settings';
import {
  useSalesContracts, useSaveSalesContract, useDeleteSalesContract, missingSalesContractFields,
} from '@/features/salescontracts/useSalesContracts';
import { blankSalesContract, newId } from '@/data/writes';
import { curSymbol, fmtMoney } from '@/lib/format';
import { num } from '@shared/finance';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/store/auth';
import { loadData } from '@/data/firestore';

// Sales-contract detail / editor — the mobile twin of web's SalesContractDetails
// modal. Web requires client / cur / contractNo / date, derives `total` from the
// product lines, and never auto-generates the contract number.
export default function SalesContractEdit() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const settings = useSettings((s) => s.settings);
  const { rows } = useSalesContracts();
  const save = useSaveSalesContract();
  const del = useDeleteSalesContract();

  const isNew = id === 'new';
  const existing = useMemo(() => rows.find((r: any) => r.id === id), [rows, id]);
  const [v, setV] = useState<any>(() => (isNew ? blankSalesContract() : { ...((existing as any)?.raw || {}) }));
  const [submitted, setSubmitted] = useState(false);

  /* Seed once, when the contract arrives — see the note in invoices/edit.tsx. */
  const seededId = useRef<string | null>(null);
  useEffect(() => {
    if (isNew || !existing || seededId.current === existing.id) return;
    seededId.current = existing.id;
    // The list row is a derived VIEW (clientName, products, shipped %); the form edits
    // the stored document, which the row carries as .raw — the same thing the
    // useState initialiser reads. Seeding from the row itself would save view fields.
    setV({ ...((existing as any).raw || existing) });
  }, [existing, isNew]);

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

  /* The purchase contract the cargo came from (web 925f0c15 / 0bf24580). Offered for the
     sales contract's year ±1 — cargo is often bought a season before it is sold on —
     with finished business hidden by default, since a PO whose cargo is long sold is
     never the one being linked. Hidden, never unreachable: the chip says how many. */
  const uidCollection = useAuth((s) => s.uidCollection);
  const scYear = parseInt(String(v.dateRange?.startDate || v.date || '').substring(0, 4), 10) || new Date().getFullYear();
  const { data: purchaseContracts = [] } = useQuery({
    enabled: !!uidCollection,
    queryKey: ['sc-purchase-contracts', uidCollection, scYear],
    queryFn: () =>
      loadData<any>(uidCollection as string, 'contracts', { start: `${scYear - 1}-01-01`, end: `${scYear + 1}-12-31` } as any),
  });
  const [showCompletedPos, setShowCompletedPos] = useState(false);
  const poId: string = v.poSupplier?.id || '';
  const supName = (sid: string) => {
    const sup = (settings?.Supplier?.Supplier || []).find((z: any) => z.id === sid);
    return sup ? sup.nname || sup.supplier || '' : '';
  };
  const completedCount = purchaseContracts.filter((c: any) => c?.id && c.completed === true && c.id !== poId).length;
  const poOptions = useMemo(() => {
    const list = purchaseContracts
      .filter((c: any) => c?.id && (showCompletedPos || c.completed !== true || c.id === poId))
      .map((c: any) => ({ value: c.id, label: [c.order || '(no number)', supName(c.supplier)].filter(Boolean).join('  ·  ') }));
    // A PO linked outside the loaded window must stay visible, or the picker would show
    // "not linked" over a link that is actually set.
    if (poId && !list.some((x: any) => x.value === poId)) {
      list.unshift({
        value: poId,
        label: [v.poSupplier?.order || '(linked PO)', supName(v.poSupplier?.supplier)].filter(Boolean).join('  ·  '),
      });
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [purchaseContracts, poId, showCompletedPos, v.poSupplier, settings]);
  const linkPo = (pid: string) => {
    if (!pid) {
      set('poSupplier', { id: '', order: '', date: '', supplier: '' });
      return;
    }
    const c: any = purchaseContracts.find((x: any) => x.id === pid);
    if (!c) return;
    set('poSupplier', { id: c.id, order: c.order || '', date: c.dateRange?.startDate || c.date || '', supplier: c.supplier || '' });
  };

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
        <StackHeader title="Sales contract" backLabel="Cancel" />
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
    <Screen contentContainerStyle={{ paddingTop: insets.top + 8 }} edges={false}>
      <StackHeader title={isNew ? 'New sales contract' : 'Sales contract'} backLabel="Cancel" />

      <Card style={{ gap: 12, marginBottom: 12 }}>
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
        <Select
          label="Purchase contract (PO)"
          value={poId}
          options={poOptions}
          onChange={linkPo}
          placeholder="Not linked"
        />
        {completedCount > 0 && (
          <View style={{ flexDirection: 'row' }}>
            <Chip
              label={showCompletedPos ? 'Hide completed POs' : `Show ${completedCount} completed PO${completedCount === 1 ? '' : 's'}`}
              icon={showCompletedPos ? 'eye-off-outline' : 'eye-outline'}
              active={showCompletedPos}
              onPress={() => setShowCompletedPos((x) => !x)}
            />
          </View>
        )}
        <TextField label="Comments" value={String(v.comments ?? '')} onChangeText={(t) => set('comments', t)} multiline />
      </Card>

      <Card style={{ marginBottom: 12 }}>
        <SectionHeader
          title="Materials"
          subtitle={`${lines.length} line(s)`}
          right={
            <IconButton icon="add" size={36} accessibilityLabel="Add line" onPress={addLine} />
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
                <Pressable onPress={() => removeLine(i)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Remove line" style={{ paddingTop: 18 }}>
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
  );
}

