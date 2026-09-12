import { useMemo, useState } from 'react';
import { View, Alert } from 'react-native';
import { Pressable } from '@/components/ui/Pressable';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Card, Text, Badge, Button, SectionHeader, EmptyState, SearchField, Chip } from '@/components/ui';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuth } from '@/store/auth';
import { clearBiometricCredentials } from '@/lib/secureStore';
import { radius } from '@/theme/tokens';
import { matchesAllWords, searchWords } from '@shared/search';

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
      { label: 'Balances', sub: 'Who owes what — clients & suppliers', icon: 'wallet-outline', href: '/(app)/balances' },
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
      /* Web calls this 'Sharon Admin', or 'Gis Admin' on the GIS workspace
         (components/const.js:69) — the label is the account, not the page. Mobile
         called it 'Margins', so it did not match what users say out loud. The
         resolved label is applied in the memo below, where gisAccount is known. */
      { label: 'Margins', sub: 'Margins — monthly profit, quantity & shipped', icon: 'stats-chart-outline', href: '/(app)/margins', admin: true },
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
  // Web parity (utils/permissions.js): a superadmin-role claim, or an admin
  // whose legacy `title` claim isn't literally the string 'Admin' (different
  // capitalisation, say), used to fall through this page's OWN ad-hoc
  // `userTitle === 'Admin'` check and lose the Margins/Formulas group and its
  // badge — the auth store's isAdmin is the one place this is now derived.
  const { currentUser, gisAccount, isAdmin, signOut } = useAuth();
  const [query, setQuery] = useState('');

  const themeOptions: { key: 'light' | 'dark' | 'system'; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: 'light', icon: 'sunny' },
    { key: 'dark', icon: 'moon' },
    { key: 'system', icon: 'phone-portrait' },
  ];

  // Visible groups: admin items only for admins; search filters across every group.
  const groups = useMemo(() => {
    const words = searchWords(query);
    const label = (it: NavItem) =>
      it.href === '/(app)/margins' ? (gisAccount ? 'Gis Admin' : 'Sharon Admin') : it.label;
    return GROUPS.map((g) => ({
      group: g.group,
      items: g.items
        .map((it) => ({ ...it, label: label(it) }))
        .filter((it) => (!it.admin || isAdmin) && matchesAllWords([it.label, it.sub, g.group], words)),
    })).filter((g) => g.items.length > 0);
  }, [query, isAdmin, gisAccount]);

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

      {/* Account card — who is signed in, on which workspace, and the way out.
          Sign out lives here (where every phone app keeps it: under the
          profile) as well as at the foot of the page. */}
      <Card style={{ marginBottom: 14 }} padded={false}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 }}>
          <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
            <Text variant="h2" color={colors.primaryText}>{currentUser.name.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text variant="h3" numberOfLines={1}>{currentUser.name}</Text>
            <Text variant="caption" tone="muted" numberOfLines={1}>{currentUser.email}</Text>
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
              <Badge label={gisAccount ? 'GIS workspace' : 'IMS workspace'} tone="neutral" />
              {isAdmin && <Badge label="Admin" tone="info" />}
            </View>
          </View>
        </View>
        <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.border }}>
          <Pressable
            onPress={() => router.push('/(app)/settings')}
            accessibilityRole="button"
            style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12 }}
          >
            <Ionicons name="settings-outline" size={16} color={colors.primary} />
            <Text variant="label" tone="primary">Settings</Text>
          </Pressable>
          <View style={{ width: 1, backgroundColor: colors.border }} />
          <Pressable
            onPress={onSignOut}
            accessibilityRole="button"
            style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12 }}
          >
            <Ionicons name="log-out-outline" size={16} color={colors.negative} />
            <Text variant="label" style={{ color: colors.negative }}>Sign out</Text>
          </Pressable>
        </View>
      </Card>

      {/* Search across all tools */}
      <SearchField value={query} onChangeText={setQuery} placeholder="Search tools… (e.g. balances, audit)" />
      <View style={{ height: 14 }} />

      {/* AI Assistant — the page's one feature row, so it reads as an invitation
          rather than the first item of the Money list. */}
      {!query && (
        <Card
          padded={false}
          style={{ marginBottom: 14, backgroundColor: colors.primary + '0F', borderColor: colors.primary + '33' }}
        >
          <Pressable onPress={() => router.push('/(app)/assistant')} accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 15 }}>
            <View style={{ width: 38, height: 38, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="sparkles" size={19} color={colors.primaryText} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text variant="bodyMedium">AI Assistant</Text>
              <Text variant="caption" tone="muted" numberOfLines={1}>Ask about your data in plain language</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.primary} />
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
            {themeOptions.map((o) => (
              <Chip
                key={o.key}
                icon={o.icon}
                label={o.key === 'light' ? 'Light' : o.key === 'dark' ? 'Dark' : 'System'}
                active={pref === o.key}
                onPress={() => setPref(o.key)}
              />
            ))}
          </View>
        </Card>
      )}

      {!query && (
        <>
          <Button
            title="Sign out"
            variant="ghost"
            style={{ borderColor: colors.negative + '55' }}
            leftIcon={<Ionicons name="log-out-outline" size={18} color={colors.negative} />}
            onPress={onSignOut}
          />
          <Text variant="caption" tone="faint" style={{ textAlign: 'center', marginTop: 16 }}>
            IMS Tech · v{Constants.expoConfig?.version || '1.0'} · same account as the web CRM
          </Text>
        </>
      )}
    </Screen>
  );
}
