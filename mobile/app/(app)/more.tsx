import { useMemo, useState } from 'react';
import { View, Pressable, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Card, Text, Badge, Button, TextField, SectionHeader, EmptyState } from '@/components/ui';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuth } from '@/store/auth';
import { clearBiometricCredentials } from '@/lib/secureStore';
import { radius } from '@/theme/tokens';

interface NavItem {
  label: string;
  sub: string;
  icon: keyof typeof Ionicons.glyphMap;
  href: string;
  admin?: boolean;
}

// Single nav inventory, grouped the way people think about the business —
// searchable so nothing is more than a few keystrokes away.
const GROUPS: { group: string; items: NavItem[] }[] = [
  {
    group: 'Money',
    items: [
      { label: 'Cashflow', sub: 'Receivables, payables, expenses, unsold stock', icon: 'cash-outline', href: '/(app)/cashflow' },
      { label: 'Accounting', sub: 'Sales invoices ↔ purchases & expenses', icon: 'calculator-outline', href: '/(app)/accounting' },
      { label: 'Expenses', sub: 'Supplier & company expenses', icon: 'card-outline', href: '/(app)/expenses' },
      { label: 'Misc Invoices', sub: 'Standalone sales + categories', icon: 'receipt-outline', href: '/(app)/misc-invoices' },
      { label: 'Account Statement', sub: 'Per-client mid/end-month statement', icon: 'reader-outline', href: '/(app)/acc-statement' },
    ],
  },
  {
    group: 'Trade',
    items: [
      { label: 'Sales Contracts', sub: 'Sell-side contracts + shipped %', icon: 'document-attach-outline', href: '/(app)/sales-contracts' },
      { label: 'Shipments', sub: 'Status, ETD/ETA tracking', icon: 'boat-outline', href: '/(app)/shipment' },
      { label: 'Contracts Review', sub: 'Shipped % + statement totals', icon: 'albums-outline', href: '/(app)/contracts-review' },
      { label: 'Invoices Review', sub: 'Invoices + client/supplier statement', icon: 'documents-outline', href: '/(app)/invoices-review' },
    ],
  },
  {
    group: 'Reports',
    items: [
      { label: 'Analysis', sub: 'Shipped weight by material & client', icon: 'bar-chart-outline', href: '/(app)/analysis' },
      { label: 'Stock Audit', sub: 'Data-integrity report on stock records', icon: 'shield-checkmark-outline', href: '/(app)/stock-audit' },
      { label: 'Activity Log', sub: 'Who did what, and when', icon: 'time-outline', href: '/(app)/activity' },
      { label: 'Notifications', sub: 'Alerts & read state', icon: 'notifications-outline', href: '/(app)/notifications' },
    ],
  },
  {
    group: 'Admin',
    items: [
      { label: 'Margins', sub: 'Monthly profit, quantity & shipped', icon: 'stats-chart-outline', href: '/(app)/margins', admin: true },
      { label: 'Formulas Calc', sub: 'FeNiCr / Stainless / SuperAlloys pricing', icon: 'calculator-outline', href: '/(app)/formulas', admin: true },
    ],
  },
  {
    group: 'Reference',
    items: [
      { label: 'Incoterms 2020', sub: 'Delivery-term reference', icon: 'earth-outline', href: '/(app)/incoterms' },
      { label: 'Material Tables', sub: 'Element composition', icon: 'grid-outline', href: '/(app)/materials' },
      { label: 'Settings', sub: 'Suppliers, clients, templates, config', icon: 'settings-outline', href: '/(app)/settings' },
    ],
  },
];

function NavRow({ item, first, isAdmin }: { item: NavItem; first: boolean; isAdmin: boolean }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={() => router.push(item.href as any)}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 15, borderTopWidth: first ? 0 : 1, borderTopColor: colors.border }}
    >
      <View style={{ width: 36, height: 36, borderRadius: radius.md, backgroundColor: colors.primary + '22', alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={item.icon} size={18} color={colors.primary} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text variant="bodyMedium">{item.label}</Text>
        <Text variant="caption" tone="muted" numberOfLines={1}>{item.sub}</Text>
      </View>
      {item.admin && isAdmin && <Badge label="Admin" tone="info" />}
      <Ionicons name="chevron-forward" size={18} color={colors.textFaint} style={item.admin ? { marginLeft: 8 } : undefined} />
    </Pressable>
  );
}

export default function More() {
  const { colors, pref, setPref } = useTheme();
  const { currentUser, userTitle, gisAccount, signOut } = useAuth();
  const isAdmin = userTitle === 'Admin';
  const [query, setQuery] = useState('');

  const themeOptions: { key: 'light' | 'dark' | 'system'; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: 'light', icon: 'sunny' },
    { key: 'dark', icon: 'moon' },
    { key: 'system', icon: 'phone-portrait' },
  ];

  // Visible groups: admin items only for admins; search filters across every group.
  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    return GROUPS.map((g) => ({
      group: g.group,
      items: g.items.filter(
        (it) =>
          (!it.admin || isAdmin) &&
          (!q || it.label.toLowerCase().includes(q) || it.sub.toLowerCase().includes(q))
      ),
    })).filter((g) => g.items.length > 0);
  }, [query, isAdmin]);

  const onSignOut = () => {
    Alert.alert('Sign out?', 'You can sign back in with your password or biometrics.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await clearBiometricCredentials();
          await signOut();
        },
      },
    ]);
  };

  return (
    <Screen>
      <ScreenHeader title="More" subtitle="Account & tools" />

      {/* Account card */}
      <Card style={{ marginBottom: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
            <Text variant="h2" color="#fff">{currentUser.name.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text variant="h3" numberOfLines={1}>{currentUser.name}</Text>
            <Text variant="caption" tone="muted" numberOfLines={1}>{currentUser.email}</Text>
          </View>
          {isAdmin && <Badge label="Admin" tone="info" />}
          {gisAccount && <Badge label="GIS" tone="neutral" />}
        </View>
      </Card>

      {/* Search across all tools */}
      <TextField
        value={query}
        onChangeText={setQuery}
        placeholder="Search tools… (e.g. cashflow, audit)"
        autoCapitalize="none"
        rightElement={
          query ? (
            <Pressable onPress={() => setQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={colors.textFaint} />
            </Pressable>
          ) : (
            <Ionicons name="search" size={18} color={colors.textFaint} />
          )
        }
      />
      <View style={{ height: 14 }} />

      {/* AI Assistant — featured */}
      {!query && (
        <Card style={{ marginBottom: 14 }} padded={false}>
          <Pressable onPress={() => router.push('/(app)/assistant')} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 15 }}>
            <View style={{ width: 36, height: 36, borderRadius: radius.md, backgroundColor: colors.primary + '22', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="sparkles" size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="bodyMedium">AI Assistant</Text>
              <Text variant="caption" tone="muted">Ask about your data in plain language</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
          </Pressable>
        </Card>
      )}

      {/* Grouped tools */}
      {groups.length === 0 ? (
        <EmptyState title="No matches" message="Try a different search." icon={<Ionicons name="search-outline" size={40} color={colors.textFaint} />} />
      ) : (
        groups.map((g) => (
          <View key={g.group} style={{ marginBottom: 14 }}>
            <Text variant="label" tone="muted" style={{ marginBottom: 6, marginLeft: 4, textTransform: 'uppercase', letterSpacing: 0.6 }}>
              {g.group}
            </Text>
            <Card padded={false}>
              {g.items.map((it, i) => (
                <NavRow key={it.href} item={it} first={i === 0} isAdmin={isAdmin} />
              ))}
            </Card>
          </View>
        ))
      )}

      {/* Appearance */}
      {!query && (
        <Card style={{ marginBottom: 14 }}>
          <SectionHeader title="Appearance" />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {themeOptions.map((o) => {
              const active = pref === o.key;
              return (
                <Pressable
                  key={o.key}
                  onPress={() => setPref(o.key)}
                  style={{
                    flex: 1,
                    alignItems: 'center',
                    gap: 6,
                    paddingVertical: 12,
                    borderRadius: radius.md,
                    borderWidth: 1.5,
                    borderColor: active ? colors.primary : colors.border,
                    backgroundColor: active ? colors.primary + '14' : 'transparent',
                  }}
                >
                  <Ionicons name={o.icon} size={20} color={active ? colors.primary : colors.textMuted} />
                  <Text variant="caption" color={active ? colors.primary : colors.textMuted} style={{ textTransform: 'capitalize' }}>
                    {o.key}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Card>
      )}

      {!query && (
        <>
          <Button
            title="Sign out"
            variant="danger"
            leftIcon={<Ionicons name="log-out-outline" size={18} color="#fff" />}
            onPress={onSignOut}
          />
          <Text variant="caption" tone="faint" style={{ textAlign: 'center', marginTop: 16 }}>
            IMS Mobile · v1.0.3 · same account as the web CRM
          </Text>
        </>
      )}
    </Screen>
  );
}
