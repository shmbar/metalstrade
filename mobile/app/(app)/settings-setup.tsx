import { useMemo } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen, Card, Text, EmptyState } from '@/components/ui';
import { Pressable } from '@/components/ui/Pressable';
import { StackHeader } from '@/components/StackHeader';
import { useTheme } from '@/theme/ThemeProvider';
import { useSettings } from '@/store/settings';

/*
 * Settings → Setup — web settings/tabs/setup.js. Every dropdown list in the account's
 * settings, found the way web finds them: each settings key holding `{ [key]: [...] }`,
 * minus the ones that have a tab of their own (Suppliers, Clients, Bank Account, Stocks,
 * Documents) or are not user-editable (Currency, InvTypes, ExpPmnt). Sorted by name, like
 * web. Mobile used to show a hand-picked twelve — including Currency, which web does not
 * let anyone edit, and missing Delivery Time, HS, Remarks and Size.
 */
const EXCLUDED = new Set(['Supplier', 'Client', 'Bank Account', 'InvTypes', 'ExpPmnt', 'Currency', 'Stocks', 'Annex VII', 'ISF', 'Carrier']);

export default function SettingsSetup() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const settings = useSettings((s) => s.settings);

  const lists = useMemo(
    () =>
      Object.keys(settings || {})
        .filter((key) => !EXCLUDED.has(key))
        .filter((key) => {
          const node = (settings as any)?.[key];
          return node && typeof node === 'object' && !Array.isArray(node) && Array.isArray(node?.[key]);
        })
        .sort()
        .map((key) => ({ key, count: ((settings as any)[key][key] || []).filter((x: any) => !x?.deleted).length })),
    [settings]
  );

  return (
    <Screen contentContainerStyle={{ paddingTop: insets.top + 8 }} edges={false}>
      <StackHeader title="Setup" subtitle="The dropdown options used across the app" />
      {lists.length === 0 ? (
        <EmptyState title="No lists" message="Settings have not loaded yet." />
      ) : (
        <Card padded={false}>
          {lists.map((l, i) => (
            <Pressable
              key={l.key}
              onPress={() => router.push(`/(app)/config-editor?cat=${encodeURIComponent(l.key)}&title=${encodeURIComponent(l.key)}`)}
              accessibilityRole="button"
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12, borderTopWidth: i ? 1 : 0, borderTopColor: colors.border }}
            >
              <Text variant="body" style={{ flex: 1 }}>{l.key}</Text>
              <Text variant="bodyMedium" tone="muted" style={{ fontVariant: ['tabular-nums'] }}>{l.count}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
            </Pressable>
          ))}
        </Card>
      )}
      <View style={{ height: 8 }} />
    </Screen>
  );
}
