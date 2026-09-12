import { useState } from 'react';
import { View, Alert } from 'react-native';
import { Pressable } from '@/components/ui/Pressable';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen, Card, Text, Badge, Button, TextField, SectionHeader, Sheet, IconButton } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuth } from '@/store/auth';
import { useSettings, selectCompanyRate, selectTermDays } from '@/store/settings';
import { useSettingsEdit } from '@/features/settings/useSettingsEdit';
import { radius, spacing } from '@/theme/tokens';
import { StackHeader } from '@/components/StackHeader';

// Company profile presets — port of web settings/tabs/logos.js (the two IMS entities).
const PROFILES: Record<string, any> = {
  old: { logolink: '/logo/imsLogo.png', logoSignatureLink: '/logo/imsSignature.png', street: 'Narva Mnt 13a', reg: '14976408', eori: 'EE14976408', name: 'IMS Stainless and Alloys OU', email: 'sbashan@ims-stainless.com', website: 'www.ims-stainless.com' },
  new: { logolink: '/logo/logoNew.png', logoSignatureLink: '/logo/imsSignatureNew.png', street: 'Jõe tn 4C', reg: '17031890', eori: 'EE17031890', name: 'IMS Metals & Alloys OU', email: 'sbashan@ims-metals.com', website: 'www.ims-metals.com' },
};

// One row of the directory list — the same shape as the More screen's rows, so
// Settings reads as part of the same app rather than a page of loose cards.
function NavRow({ title, sub, count, icon, onPress, first, trailing }: {
  title: string;
  sub?: string;
  count?: number;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  first?: boolean;
  trailing?: React.ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 15, borderTopWidth: first ? 0 : 1, borderTopColor: colors.border }}
    >
      <View style={{ width: 36, height: 36, borderRadius: radius.md, backgroundColor: colors.primary + '18', alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text variant="bodyMedium" numberOfLines={1}>{title}</Text>
        {sub ? <Text variant="caption" tone="muted" numberOfLines={1}>{sub}</Text> : null}
      </View>
      {typeof count === 'number' ? <Badge label={String(count)} tone="info" /> : null}
      {trailing ?? <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />}
    </Pressable>
  );
}

export default function SettingsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  // Web parity (utils/permissions.js isAdmin) — was an exact-string
  // `userTitle === 'Admin'` check that a superadmin-role account could fail.
  const { isAdmin } = useAuth();
  const { settings, compData } = useSettings();
  const { saveCompany } = useSettingsEdit();
  const rate = useSettings(selectCompanyRate);
  const termDays = useSettings(selectTermDays);

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
  // Switch the company legal identity / logo (web logos.js parity).
  const applyProfile = async (which: 'old' | 'new') => {
    setBusy(true);
    try {
      await saveCompany(PROFILES[which]);
    } catch (e: any) {
      Alert.alert('Save failed', e?.message || 'Could not switch profile.');
    } finally {
      setBusy(false);
    }
  };

  const count = (key: string) => (settings?.[key]?.[key] || []).filter((x: any) => !x.deleted).length;
  const configCounts = [
    ['Currency', 'Currencies'], ['Shipment', 'Shipment types'], ['Origin', 'Origins'], ['Delivery Terms', 'Delivery terms'],
    ['POL', 'POL'], ['POD', 'POD'], ['Packing', 'Packing'], ['Container Type', 'Container types'],
    ['Quantity', 'Quantity units'], ['Payment Terms', 'Payment terms'], ['Stocks', 'Warehouses'], ['Expenses', 'Expense types'],
  ].map(([key, label]) => ({ key, label, count: count(key) }));

  return (
    <Screen contentContainerStyle={{ paddingTop: insets.top + 8 }} edges={false}>
      <StackHeader title="Settings" subtitle="Manage suppliers, clients & company config" />

      {/* Company config (editable) */}
      <Card style={{ marginBottom: 14 }}>
        <SectionHeader
          title="Company"
          right={<IconButton icon="create-outline" size={36} accessibilityLabel="Edit company settings" onPress={openEditCompany} />}
        />
        <Row label="EUR → USD rate" value={rate > 0 ? String(rate) : 'Per-contract'} />
        <Row label="Default payment term" value={`${termDays} days`} />
        <Row label="Language" value={String(compData?.lng || 'English')} />
      </Card>

      {/* Directory — the lists the contract and invoice forms pick from. */}
      <Text variant="label" tone="muted" style={{ marginBottom: 6, marginLeft: 4, textTransform: 'uppercase', letterSpacing: 0.6 }}>
        Directory
      </Text>
      <Card padded={false} style={{ marginBottom: 14 }}>
        <NavRow first title="Suppliers" sub="Who you buy from" count={count('Supplier')} icon="business-outline" onPress={() => router.push('/(app)/settings-entity?type=Supplier')} />
        <NavRow title="Clients" sub="Who you sell to" count={count('Client')} icon="people-outline" onPress={() => router.push('/(app)/settings-entity?type=Client')} />
        <NavRow title="Bank Accounts" sub="Printed on invoices" count={count('Bank Account')} icon="card-outline" onPress={() => router.push('/(app)/settings-entity?type=Bank%20Account')} />
        {isAdmin && (
          <NavRow
            title="Users & roles"
            sub="Managed on the web app (admin)"
            icon="shield-checkmark-outline"
            trailing={<Ionicons name="information-circle-outline" size={18} color={colors.textFaint} />}
            onPress={() => Alert.alert('User management', 'Creating users with roles requires admin privileges and is managed from the web app (Settings → Users). Role-based access on mobile is already enforced.')}
          />
        )}
      </Card>

      <Text variant="label" tone="muted" style={{ marginBottom: 6, marginLeft: 4, textTransform: 'uppercase', letterSpacing: 0.6 }}>
        Documents
      </Text>
      <Card style={{ marginBottom: 14 }}>
        <SectionHeader title="Document templates" subtitle="Annex VII / ISF / Carriers" />
        {[
          { type: 'Annex VII', label: 'Annex VII templates' },
          { type: 'ISF', label: 'ISF templates' },
          { type: 'Carrier', label: 'Carriers' },
        ].map((d, i) => (
          <Pressable
            key={d.type}
            onPress={() => router.push(`/(app)/settings-entity?type=${encodeURIComponent(d.type)}`)}
            accessibilityRole="button"
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: colors.border }}
          >
            <Text variant="body">{d.label}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text variant="bodyMedium">{count(d.type)}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
            </View>
          </Pressable>
        ))}
      </Card>

      <Text variant="label" tone="muted" style={{ marginBottom: 6, marginLeft: 4, textTransform: 'uppercase', letterSpacing: 0.6 }}>
        Configuration
      </Text>
      <Card>
        <SectionHeader title="Lists" subtitle="The dropdown options used across the app" />
        {configCounts.map((c, i) => (
          <Pressable
            key={c.label}
            onPress={() => router.push(`/(app)/config-editor?cat=${encodeURIComponent(c.key)}&title=${encodeURIComponent(c.label)}`)}
            accessibilityRole="button"
            style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: colors.border }}
          >
            <Text variant="body">{c.label}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text variant="bodyMedium">{c.count}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
            </View>
          </Pressable>
        ))}
      </Card>

      {/* Company edit sheet */}
      <Sheet
        visible={editCompany}
        onClose={() => setEditCompany(false)}
        title="Company settings"
        footer={<Button title="Save" loading={busy} onPress={saveCompanyEdit} />}
      >
        <View style={{ gap: spacing.md }}>
          <TextField label="EUR → USD rate (blank = per-contract)" value={rateInput} onChangeText={setRateInput} keyboardType="decimal-pad" placeholder="e.g. 1.08" />
          <TextField label="Default payment term (days)" value={termInput} onChangeText={setTermInput} keyboardType="number-pad" placeholder="30" />

          <Text variant="label" tone="muted" style={{ marginTop: 4 }}>Company profile (logo & legal identity)</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {(['old', 'new'] as const).map((k) => {
              const active = (compData as any)?.logolink === PROFILES[k].logolink;
              return (
                <Pressable
                  key={k}
                  onPress={() => applyProfile(k)}
                  style={{ flex: 1, borderWidth: 1.5, borderColor: active ? colors.primary : colors.border, backgroundColor: active ? colors.primary + '14' : 'transparent', borderRadius: radius.md, padding: 12 }}
                >
                  <Text variant="bodyMedium" tone={active ? 'primary' : 'default'}>{PROFILES[k].name}</Text>
                  <Text variant="caption" tone="faint" numberOfLines={1}>{PROFILES[k].website}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </Sheet>
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
