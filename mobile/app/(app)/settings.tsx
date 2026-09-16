import { View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen, Card, Text, Badge } from '@/components/ui';
import { Pressable } from '@/components/ui/Pressable';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuth } from '@/store/auth';
import { useSettings } from '@/store/settings';
import { loadGrades } from '@/data/firestore';
import { radius } from '@/theme/tokens';
import { StackHeader } from '@/components/StackHeader';
import { useShallow } from 'zustand/react/shallow';

/*
 * Settings — web app/(root)/settings/page.js. Web's tabs, in web's order, each a row:
 * Company Details, Setup, Suppliers, Clients, Bank Account, Stocks, Grades, Documents,
 * Email Setup, and Users for someone who may manage them. Every one opens its own
 * screen with the same fields web edits.
 */

const SETUP_EXCLUDED = new Set(['Supplier', 'Client', 'Bank Account', 'InvTypes', 'ExpPmnt', 'Currency', 'Stocks', 'Annex VII', 'ISF', 'Carrier']);

function NavRow({
  title,
  sub,
  count,
  icon,
  onPress,
  first,
  trailing,
}: {
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
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12, borderTopWidth: first ? 0 : 1, borderTopColor: colors.border }}
    >
      <View style={{ width: 36, height: 36, borderRadius: radius.md, backgroundColor: colors.primary + '18', alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text variant="bodyMedium" numberOfLines={1}>{title}</Text>
        {sub ? <Text variant="caption" tone="muted" numberOfLines={1}>{sub}</Text> : null}
      </View>
      {typeof count === 'number' ? <Badge label={String(count)} tone="info" /> : null}
      {trailing ?? <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />}
    </Pressable>
  );
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  // Web shows the Users tab only to someone who can manage users (canManageUsers).
  const isAdmin = useAuth((s) => s.isAdmin);
  const { settings, compData } = useSettings(useShallow((s) => ({ settings: s.settings, compData: s.compData })));
  const { data: grades = [] } = useQuery({ queryKey: ['grades'], queryFn: loadGrades, staleTime: 5 * 60_000 });

  const count = (key: string) => ((settings as any)?.[key]?.[key] || []).filter((x: any) => !x?.deleted).length;
  const setupLists = Object.keys(settings || {}).filter((key) => {
    if (SETUP_EXCLUDED.has(key)) return false;
    const node = (settings as any)?.[key];
    return node && typeof node === 'object' && !Array.isArray(node) && Array.isArray(node?.[key]);
  }).length;
  const docCount = count('Annex VII') + count('ISF') + count('Carrier');

  return (
    <Screen contentContainerStyle={{ paddingTop: insets.top + 8 }} edges={false}>
      <StackHeader title="Settings" subtitle="Manage suppliers, clients & company config" />

      <Card padded={false}>
        <NavRow first title="Company Details" sub={String(compData?.name || 'Name, address, contact, invoicing, currency')} icon="briefcase-outline" onPress={() => router.push('/(app)/settings-company')} />
        <NavRow title="Setup" sub="The dropdown options used across the app" count={setupLists} icon="list-outline" onPress={() => router.push('/(app)/settings-setup')} />
        <NavRow title="Suppliers" sub="Who you buy from" count={count('Supplier')} icon="business-outline" onPress={() => router.push('/(app)/settings-entity?type=Supplier')} />
        <NavRow title="Clients" sub="Who you sell to" count={count('Client')} icon="people-outline" onPress={() => router.push('/(app)/settings-entity?type=Client')} />
        <NavRow title="Bank Account" sub="Printed on invoices" count={count('Bank Account')} icon="card-outline" onPress={() => router.push('/(app)/settings-entity?type=Bank%20Account')} />
        <NavRow title="Stocks" sub="Warehouses and virtual stocks" count={count('Stocks')} icon="cube-outline" onPress={() => router.push('/(app)/settings-entity?type=Stocks')} />
        <NavRow title="Grades" sub="Material grades, shared by IMS and GIS" count={grades.filter((g: any) => !g.deleted).length} icon="pricetags-outline" onPress={() => router.push('/(app)/settings-grades')} />
        <NavRow title="Documents" sub="Annex VII / ISF templates and carriers" count={docCount} icon="document-text-outline" onPress={() => router.push('/(app)/settings-entity?type=Annex%20VII')} />
        <NavRow title="Email Setup" sub="Payment reminder emails and cadence" icon="mail-outline" onPress={() => router.push('/(app)/settings-email')} />
        {isAdmin && (
          <NavRow title="Users" sub="Members, roles and page access" icon="shield-checkmark-outline" onPress={() => router.push('/(app)/settings-users')} />
        )}
      </Card>
    </Screen>
  );
}
