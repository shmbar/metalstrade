import { useMemo, useState } from 'react';
import { View, Pressable, Modal, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen, Card, Text, TextField, Button, EmptyState } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { useSettings } from '@/store/settings';
import { useSettingsEdit } from '@/features/settings/useSettingsEdit';
import { newId } from '@/data/writes';
import { radius, spacing } from '@/theme/tokens';

export default function SettingsEntity() {
  const { type } = useLocalSearchParams<{ type: string }>();
  const cat = type === 'Client' ? 'Client' : 'Supplier';
  const nameKey = cat.toLowerCase(); // 'supplier' | 'client' — the legal-name field

  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { settings } = useSettings();
  const { saveEntities } = useSettingsEdit();

  const list = useMemo(
    () => ((settings as any)?.[cat]?.[cat] || []).filter((x: any) => !x.deleted),
    [settings, cat]
  );

  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState<any>({});
  const [busy, setBusy] = useState(false);

  const openNew = () => { setForm({ id: '', nname: '', [nameKey]: '', street: '', city: '', country: '', other1: '' }); setEditing({}); };
  const openEdit = (e: any) => { setForm({ ...e }); setEditing(e); };

  const persist = async (nextList: any[]) => {
    setBusy(true);
    try {
      await saveEntities(cat, nextList);
      setEditing(null);
    } catch (e: any) {
      Alert.alert('Save failed', e?.message || 'Could not save.');
    } finally {
      setBusy(false);
    }
  };

  const onSave = async () => {
    if (!form.nname?.trim()) { Alert.alert('Name required', 'Enter a display name.'); return; }
    const raw = (settings as any)?.[cat]?.[cat] || [];
    if (form.id) {
      await persist(raw.map((x: any) => (x.id === form.id ? { ...x, ...form } : x)));
    } else {
      await persist([...raw, { ...form, id: newId() }]);
    }
  };

  const onDelete = (e: any) => {
    Alert.alert(`Delete ${cat.toLowerCase()}?`, e.nname, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          const raw = (settings as any)?.[cat]?.[cat] || [];
          persist(raw.map((x: any) => (x.id === e.id ? { ...x, deleted: true } : x)));
        },
      },
    ]);
  };

  const FIELDS: { key: string; label: string }[] = [
    { key: 'nname', label: 'Display name *' },
    { key: nameKey, label: 'Legal / full name' },
    { key: 'street', label: 'Street' },
    { key: 'city', label: 'City' },
    { key: 'country', label: 'Country' },
    { key: 'other1', label: 'Contact / other' },
  ];

  return (
    <Screen contentContainerStyle={{ paddingTop: insets.top + 8 }} edges={false}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Ionicons name="chevron-back" size={22} color={colors.primary} />
          <Text variant="bodyMedium" tone="primary">Back</Text>
        </Pressable>
        <Text variant="h2" style={{ flex: 1 }}>{cat}s</Text>
        <Pressable onPress={openNew} hitSlop={8}><Ionicons name="add-circle" size={26} color={colors.primary} /></Pressable>
      </View>

      {list.length === 0 ? (
        <EmptyState title={`No ${cat.toLowerCase()}s`} message="Tap + to add one." />
      ) : (
        <View style={{ gap: 10 }}>
          {list.map((e: any) => (
            <Card key={e.id} padded={false}>
              <Pressable onPress={() => openEdit(e)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 }}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text variant="bodyMedium" numberOfLines={1}>{e.nname || '—'}</Text>
                  {(e[nameKey] || e.city) ? <Text variant="caption" tone="muted" numberOfLines={1}>{[e[nameKey], e.city, e.country].filter(Boolean).join(' · ')}</Text> : null}
                </View>
                <Pressable onPress={() => onDelete(e)} hitSlop={8}><Ionicons name="trash-outline" size={20} color={colors.negative} /></Pressable>
                <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
              </Pressable>
            </Card>
          ))}
        </View>
      )}

      {/* Edit/new sheet */}
      <Modal visible={!!editing} transparent animationType="slide" onRequestClose={() => setEditing(null)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }} onPress={() => setEditing(null)} />
        <View style={{ backgroundColor: colors.bgElevated, borderTopLeftRadius: radius['2xl'], borderTopRightRadius: radius['2xl'], padding: spacing.lg, paddingBottom: insets.bottom + spacing.lg, gap: spacing.md, maxHeight: '88%' }}>
          <Text variant="h2">{form.id ? `Edit ${cat.toLowerCase()}` : `New ${cat.toLowerCase()}`}</Text>
          {FIELDS.map((f) => (
            <TextField key={f.key} label={f.label} value={String(form[f.key] ?? '')} onChangeText={(t) => setForm((p: any) => ({ ...p, [f.key]: t }))} />
          ))}
          <Button title="Save" loading={busy} onPress={onSave} />
        </View>
      </Modal>
    </Screen>
  );
}
