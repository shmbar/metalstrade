import { useMemo, useState } from 'react';
import { View, Pressable, Modal, Alert, ScrollView } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen, Card, Text, TextField, Button, EmptyState } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { useSettings } from '@/store/settings';
import { useSettingsEdit } from '@/features/settings/useSettingsEdit';
import { newId } from '@/data/writes';
import { radius, spacing } from '@/theme/tokens';

// Per-type config: category key, display field, label, and the editable fields.
function configFor(type: string) {
  if (type === 'Annex VII') {
    return {
      cat: 'Annex VII', displayKey: 'name', label: 'Annex VII Template',
      fields: [
        { key: 'name', label: 'Template name *' },
        { key: 'rDCode', label: 'R-Code / D-Code (field 8)' },
        { key: 'wasteDescription', label: 'Waste description (field 9)' },
        { key: 'baselCode', label: 'Basel Annex IX (10.i)' },
        { key: 'oecdCode', label: 'OECD code (10.ii)' },
        { key: 'annexIIIACode', label: 'Annex IIIA (10.iii)' },
        { key: 'annexIIIBCode', label: 'Annex IIIB (10.iv)' },
        { key: 'euCode', label: 'EU list of wastes (10.v)' },
        { key: 'nationalCode', label: 'National code (10.vi)' },
        { key: 'otherCode', label: 'Other code (10.vii)' },
        { key: 'exportCountry', label: 'Export / Dispatch country (11)' },
        { key: 'transitCountry', label: 'Transit country (11)' },
        { key: 'importCountry', label: 'Import / Destination (11)' },
      ],
    };
  }
  if (type === 'ISF') {
    return {
      cat: 'ISF', displayKey: 'name', label: 'ISF Template',
      fields: [
        { key: 'name', label: 'Template name *' },
        { key: 'importerRecordNum', label: 'Importer reference #' },
        { key: 'consigneeNum', label: 'Consignee number' },
        { key: 'htsCommodityCode', label: 'HTS-6 commodity code' },
        { key: 'itemDescription', label: 'Item description' },
        { key: 'email1', label: 'Notification email 1' },
        { key: 'email2', label: 'Notification email 2' },
      ],
    };
  }
  if (type === 'Carrier') {
    return {
      cat: 'Carrier', displayKey: 'name', label: 'Carrier',
      fields: [
        { key: 'name', label: 'Carrier name *' },
        { key: 'nickname', label: 'Nickname' },
        { key: 'address', label: 'Address' },
        { key: 'contact', label: 'Contact person' },
        { key: 'tel', label: 'Tel.' },
        { key: 'fax', label: 'Fax' },
        { key: 'email', label: 'E-Mail' },
      ],
    };
  }
  if (type === 'Bank Account') {
    return {
      cat: 'Bank Account',
      displayKey: 'bankNname',
      label: 'Bank Account',
      fields: [
        { key: 'bankNname', label: 'Display name *' },
        { key: 'bankName', label: 'Bank name' },
        { key: 'cur', label: 'Currency' },
        { key: 'swiftCode', label: 'SWIFT' },
        { key: 'iban', label: 'IBAN' },
        { key: 'corrBank', label: 'Correspondent bank' },
        { key: 'corrBankSwift', label: 'Corr. SWIFT' },
        { key: 'other', label: 'Other' },
      ],
    };
  }
  const cat = type === 'Client' ? 'Client' : 'Supplier';
  return {
    cat,
    displayKey: 'nname',
    label: cat,
    fields: [
      { key: 'nname', label: 'Display name *' },
      { key: cat.toLowerCase(), label: 'Legal / full name' },
      { key: 'street', label: 'Street' },
      { key: 'city', label: 'City' },
      { key: 'country', label: 'Country' },
      { key: 'other1', label: 'Contact / other' },
    ],
  };
}

export default function SettingsEntity() {
  const { type } = useLocalSearchParams<{ type: string }>();
  const { cat, displayKey, label, fields: FIELDS } = configFor(type as string);

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

  const openNew = () => { setForm(Object.fromEntries([['id', ''], ...FIELDS.map((f) => [f.key, ''])])); setEditing({}); };
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
    if (!form[displayKey]?.trim()) { Alert.alert('Name required', 'Enter a display name.'); return; }
    const raw = (settings as any)?.[cat]?.[cat] || [];
    if (form.id) {
      await persist(raw.map((x: any) => (x.id === form.id ? { ...x, ...form } : x)));
    } else {
      await persist([...raw, { ...form, id: newId() }]);
    }
  };

  const onDelete = (e: any) => {
    Alert.alert(`Delete ${label.toLowerCase()}?`, e[displayKey], [
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

  const subLine = (e: any) =>
    FIELDS.slice(1, 4).map((f) => e[f.key]).filter(Boolean).join(' · ');

  return (
    <Screen contentContainerStyle={{ paddingTop: insets.top + 8 }} edges={false}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Ionicons name="chevron-back" size={22} color={colors.primary} />
          <Text variant="bodyMedium" tone="primary">Back</Text>
        </Pressable>
        <Text variant="h2" style={{ flex: 1 }}>{label}s</Text>
        <Pressable onPress={openNew} hitSlop={8}><Ionicons name="add-circle" size={26} color={colors.primary} /></Pressable>
      </View>

      {list.length === 0 ? (
        <EmptyState title={`No ${label.toLowerCase()}s`} message="Tap + to add one." />
      ) : (
        <View style={{ gap: 10 }}>
          {list.map((e: any) => (
            <Card key={e.id} padded={false}>
              <Pressable onPress={() => openEdit(e)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 }}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text variant="bodyMedium" numberOfLines={1}>{e[displayKey] || '—'}</Text>
                  {subLine(e) ? <Text variant="caption" tone="muted" numberOfLines={1}>{subLine(e)}</Text> : null}
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
          <Text variant="h2">{form.id ? `Edit ${label.toLowerCase()}` : `New ${label.toLowerCase()}`}</Text>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: spacing.md, paddingBottom: spacing.sm }}>
            {FIELDS.map((f) => (
              <TextField key={f.key} label={f.label} value={String(form[f.key] ?? '')} onChangeText={(t) => setForm((p: any) => ({ ...p, [f.key]: t }))} />
            ))}
          </ScrollView>
          <Button title="Save" loading={busy} onPress={onSave} />
        </View>
      </Modal>
    </Screen>
  );
}
