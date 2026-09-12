import { useMemo, useState, useEffect } from 'react';
import { View, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen, Card, TextField, Button, EmptyState, IconButton } from '@/components/ui';
import { useSettings } from '@/store/settings';
import { useSettingsEdit } from '@/features/settings/useSettingsEdit';
import { newId } from '@/data/writes';
import { StackHeader } from '@/components/StackHeader';

// Display-field fallback per category (port of web setup.js fieldByKey).
const FIELD_BY_KEY: Record<string, string> = {
  'Container Type': 'contType', 'Delivery Terms': 'delTerm', 'Delivery Time': 'delTime',
  Expenses: 'expType', Hs: 'hs', Origin: 'origin', POD: 'pod', POL: 'pol', Packing: 'packing',
  'Payment Terms': 'payTerm', Quantity: 'qty', Remarks: 'remarks', Shipment: 'shpType',
  Size: 'size', Currency: 'cur', Stocks: 'nname',
};

export default function ConfigEditor() {
  const { cat, title } = useLocalSearchParams<{ cat: string; title?: string }>();
  const insets = useSafeAreaInsets();
  const { settings } = useSettings();
  const { saveEntities } = useSettingsEdit();

  const original: any[] = (settings as any)?.[cat]?.[cat] || [];

  // Detect the editable field: first non-id/deleted key of an existing item, else fallback.
  const field = useMemo(() => {
    const first = original[0];
    if (first) {
      const k = Object.keys(first).find((key) => key !== 'id' && key !== 'deleted');
      if (k) return k;
    }
    return FIELD_BY_KEY[cat as string] || 'value';
  }, [original, cat]);

  const [items, setItems] = useState<any[]>(() => original.map((x) => ({ ...x })));
  const [busy, setBusy] = useState(false);
  useEffect(() => { setItems(original.map((x) => ({ ...x }))); /* eslint-disable-next-line */ }, [cat]);

  const visible = items.map((it, i) => ({ it, i })).filter(({ it }) => !it.deleted);

  const setVal = (i: number, v: string) => setItems((p) => p.map((x, k) => (k === i ? { ...x, [field]: v } : x)));
  const remove = (i: number) => setItems((p) => p.map((x, k) => (k === i ? { ...x, deleted: true } : x)));
  const add = () => setItems((p) => [...p, { id: newId(), [field]: '', deleted: false }]);

  const save = async () => {
    setBusy(true);
    try {
      const clean = items.filter((x) => x.deleted || String(x[field] ?? '').trim() !== '');
      await saveEntities(cat as string, clean);
      router.back();
    } catch (e: any) {
      Alert.alert('Save failed', e?.message || 'Could not save.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen contentContainerStyle={{ paddingTop: insets.top + 8 }} edges={false}>
      <StackHeader title={title || cat} right={<IconButton icon="add" variant="primary" accessibilityLabel="Add item" onPress={add} />} />

      {visible.length === 0 ? (
        <EmptyState title="No items" message="Tap + to add one." />
      ) : (
        <Card style={{ gap: 8 }}>
          {visible.map(({ it, i }) => (
            <View key={it.id || i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <TextField value={String(it[field] ?? '')} onChangeText={(v) => setVal(i, v)} placeholder="Value" />
              </View>
              <IconButton icon="trash-outline" tone="danger" size={36} accessibilityLabel="Delete item" onPress={() => remove(i)} />
            </View>
          ))}
        </Card>
      )}

      <Button title="Save changes" loading={busy} style={{ marginTop: 16 }} onPress={save} />
    </Screen>
  );
}
