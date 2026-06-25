import { useState } from 'react';
import { View, Pressable, Modal, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen, Card, Text, Badge, Button, TextField, SectionHeader } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuth } from '@/store/auth';
import { useSettings, selectCompanyRate, selectTermDays } from '@/store/settings';
import { useSettingsEdit } from '@/features/settings/useSettingsEdit';
import { radius, spacing } from '@/theme/tokens';

function NavRow({ title, count, icon, onPress }: { title: string; count: number; icon: keyof typeof Ionicons.glyphMap; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Card padded={false} style={{ marginBottom: 14 }}>
      <Pressable onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 }}>
        <View style={{ width: 36, height: 36, borderRadius: radius.md, backgroundColor: colors.primary + '18', alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name={icon} size={18} color={colors.primary} />
        </View>
        <Text variant="h3" style={{ flex: 1 }}>{title}</Text>
        <Badge label={String(count)} tone="info" />
        <Ionicons name="chevron-forward" size={18} color={colors.textFaint} style={{ marginLeft: 6 }} />
      </Pressable>
    </Card>
  );
}

export default function SettingsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { userTitle } = useAuth();
  const { settings, compData } = useSettings();
  const { saveCompany } = useSettingsEdit();
  const rate = useSettings(selectCompanyRate);
  const termDays = useSettings(selectTermDays);
  const isAdmin = userTitle === 'Admin';

  const [editCompany, setEditCompany] = useState(false);
  const [rateInput, setRateInput] = useState('');
  const [termInput, setTermInput] = useState('');
  const [busy, setBusy] = useState(false);

  const openEditCompany = () => {
    setRateInput(rate > 0 ? String(rate) : '');
    setTermInput(String(termDays));
    setEditCompany(true);
  };
  const saveCompanyEdit = async () => {
    setBusy(true);
    try {
      await saveCompany({ eurUsdRate: rateInput.trim(), defaultTermDays: termInput.trim() });
      setEditCompany(false);
    } catch (e: any) {
      Alert.alert('Save failed', e?.message || 'Could not save.');
    } finally {
      setBusy(false);
    }
  };

  const count = (key: string) => (settings?.[key]?.[key] || []).filter((x: any) => !x.deleted).length;
  const configCounts = [
    ['Currency', 'Currencies'], ['Shipment', 'Shipment types'], ['Origin', 'Origins'], ['Delivery Terms', 'Delivery terms'],
    ['POL', 'POL'], ['POD', 'POD'], ['Packing', 'Packing'], ['Container Type', 'Container types'],
    ['Quantity', 'Quantity units'], ['Payment Terms', 'Payment terms'], ['Stocks', 'Warehouses'], ['Expenses', 'Expense types'],
  ].map(([key, label]) => ({ label, count: count(key) }));

  return (
    <Screen contentContainerStyle={{ paddingTop: insets.top + 8 }} edges={false}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={colors.primary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text variant="h1">Settings</Text>
          <Text variant="caption" tone="faint">Manage suppliers, clients & company config</Text>
        </View>
      </View>

      {/* Company config (editable) */}
      <Card style={{ marginBottom: 14 }}>
        <SectionHeader
          title="Company"
          right={<Pressable onPress={openEditCompany} hitSlop={8}><Ionicons name="create-outline" size={20} color={colors.primary} /></Pressable>}
        />
        <Row label="EUR → USD rate" value={rate > 0 ? String(rate) : 'Per-contract'} />
        <Row label="Default payment term" value={`${termDays} days`} />
        <Row label="Language" value={String(compData?.lng || 'English')} />
      </Card>

      <NavRow title="Suppliers" count={count('Supplier')} icon="business-outline" onPress={() => router.push('/(app)/settings-entity?type=Supplier')} />
      <NavRow title="Clients" count={count('Client')} icon="people-outline" onPress={() => router.push('/(app)/settings-entity?type=Client')} />

      {isAdmin && (
        <Card padded={false} style={{ marginBottom: 14 }}>
          <Pressable
            onPress={() => Alert.alert('User management', 'Creating users with roles requires admin privileges and is managed from the web app (Settings → Users). Role-based access on mobile is already enforced.')}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 }}
          >
            <View style={{ width: 36, height: 36, borderRadius: radius.md, backgroundColor: colors.primary + '18', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="shield-checkmark-outline" size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="h3">Users & roles</Text>
              <Text variant="caption" tone="muted">Managed on web (admin)</Text>
            </View>
            <Ionicons name="information-circle-outline" size={18} color={colors.textFaint} />
          </Pressable>
        </Card>
      )}

      <Card>
        <SectionHeader title="Configuration" />
        {configCounts.map((c, i) => (
          <View key={c.label} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 7, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: colors.border }}>
            <Text variant="body" tone="muted">{c.label}</Text>
            <Text variant="bodyMedium">{c.count}</Text>
          </View>
        ))}
      </Card>

      {/* Company edit sheet */}
      <Modal visible={editCompany} transparent animationType="slide" onRequestClose={() => setEditCompany(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }} onPress={() => setEditCompany(false)} />
        <View style={{ backgroundColor: colors.bgElevated, borderTopLeftRadius: radius['2xl'], borderTopRightRadius: radius['2xl'], padding: spacing.lg, paddingBottom: insets.bottom + spacing.lg, gap: spacing.md }}>
          <Text variant="h2">Company settings</Text>
          <TextField label="EUR → USD rate (blank = per-contract)" value={rateInput} onChangeText={setRateInput} keyboardType="decimal-pad" placeholder="e.g. 1.08" />
          <TextField label="Default payment term (days)" value={termInput} onChangeText={setTermInput} keyboardType="number-pad" placeholder="30" />
          <Button title="Save" loading={busy} onPress={saveCompanyEdit} />
        </View>
      </Modal>
    </Screen>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 7, borderTopWidth: 1, borderTopColor: colors.border }}>
      <Text variant="body" tone="muted">{label}</Text>
      <Text variant="bodyMedium">{value}</Text>
    </View>
  );
}
