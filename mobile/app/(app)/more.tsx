import { useMemo, useState, useEffect } from 'react';
import { View, Alert, Switch } from 'react-native';
import { Pressable } from '@/components/ui/Pressable';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Card, Text, Badge, Button, SectionHeader, EmptyState, SearchField, Chip } from '@/components/ui';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuth } from '@/store/auth';
import { isBiometricEnabled, setLockPreference } from '@/lib/secureStore';
import { haptics } from '@/lib/haptics';
import { authenticateBiometric, biometricLabel, isBiometricAvailable } from '@/lib/biometric';
import { radius, layout } from '@/theme/tokens';
import { matchesAllWords, searchWords } from '@shared/search';
import { routeKeyOf } from '@/lib/access';
import { useShallow } from 'zustand/react/shallow';

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
         resolved label (auth store marginsLabel) is applied in the memo below. */
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
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: layout.cardInset, paddingVertical: layout.rowPad, borderTopWidth: first ? 0 : 1, borderTopColor: colors.border }}
    >
      <View style={{ width: layout.leading, height: layout.leading, borderRadius: radius.md, backgroundColor: colors.primary + '22', alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={item.icon} size={18} color={colors.primary} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text variant="bodyMedium">{item.label}</Text>
        <Text variant="caption" tone="muted" numberOfLines={1}>{item.sub}</Text>
      </View>
      {item.admin && isAdmin && <Badge label="Admin" tone="info" />}
      <Ionicons name="chevron-forward" size={16} color={colors.textFaint} style={item.admin ? { marginLeft: 8 } : undefined} />
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
  const { currentUser, gisAccount, marginsLabel, isAdmin, signOut, canRoute } = useAuth(useShallow((s) => ({ currentUser: s.currentUser, gisAccount: s.gisAccount, marginsLabel: s.marginsLabel, isAdmin: s.isAdmin, signOut: s.signOut, canRoute: s.canRoute })));
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
      it.href === '/(app)/margins' ? marginsLabel : it.label;
    return GROUPS.map((g) => ({
      group: g.group,
      items: g.items
        .map((it) => ({ ...it, label: label(it) }))
        // Per-page permissions decide what a user sees here, exactly as web's sidebar
        // hides a page the user cannot open (was: admin-flag only).
        .filter((it) => canRoute(routeKeyOf(it.href)) && matchesAllWords([it.label, it.sub, g.group], words)),
    })).filter((g) => g.items.length > 0);
  }, [query, marginsLabel, canRoute]);

  // Face ID: "lock" keeps the session and asks for Face ID to open the app; "sign out"
  // ends the session. They used to be one thing — and signing out also deleted the Face ID
  // sign-in while its own message promised you could sign back in with it.
  const lockEnabled = useAuth((s) => s.lockEnabled);
  const refreshLockEnabled = useAuth((s) => s.refreshLockEnabled);
  const [bio, setBio] = useState<{ available: boolean; label: string; signIn: boolean }>({ available: false, label: 'Face ID', signIn: false });
  useEffect(() => {
    let live = true;
    (async () => {
      const available = await isBiometricAvailable().catch(() => false);
      const label = available ? await biometricLabel().catch(() => 'Face ID') : 'Face ID';
      const signIn = await isBiometricEnabled().catch(() => false);
      if (live) setBio({ available, label, signIn });
      refreshLockEnabled();
    })();
    return () => {
      live = false;
    };
  }, [refreshLockEnabled]);

  const toggleLock = async (on: boolean) => {
    haptics.selection();
    // Turning the lock ON is proven with the biometric itself, so nobody can enable a lock
    // they cannot open.
    if (on && !(await authenticateBiometric(`Turn on ${bio.label} lock`).catch(() => false))) return;
    await setLockPreference(on);
    await refreshLockEnabled();
  };

  const onSignOut = () => {
    Alert.alert(
      'Sign out?',
      bio.signIn
        ? `You can sign back in with ${bio.label} or your password.`
        : 'You will need your password to sign in again.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign out', style: 'destructive', onPress: () => signOut() },
      ]
    );
  };

  return (
    <Screen>
      <ScreenHeader title="More" subtitle="Account & tools" />

      {/* Account card — who is signed in, on which workspace, and the way out.
          Sign out lives here (where every phone app keeps it: under the
          profile) as well as at the foot of the page. */}
      <Card style={{ marginBottom: layout.stack }} padded={false}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: layout.cardInset }}>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
            <Text variant="h3" color={colors.primaryText}>{currentUser.name.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text variant="h3" numberOfLines={1}>{currentUser.name}</Text>
            <Text variant="caption" tone="muted" numberOfLines={1}>{currentUser.email}</Text>
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
              <Badge label={gisAccount ? 'GIS workspace' : 'IMS workspace'} tone="neutral" />
              {isAdmin && <Badge label="Admin" tone="info" />}
            </View>
          </View>
        </View>
        {bio.available && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: layout.cardInset, paddingVertical: layout.rowPad, borderTopWidth: 1, borderTopColor: colors.border }}>
            <Ionicons name="lock-closed-outline" size={16} color={colors.primary} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text variant="bodyMedium">{bio.label} lock</Text>
              <Text variant="caption" tone="muted" numberOfLines={2}>
                Stay signed in — {bio.label} opens the app after you have been away.
              </Text>
            </View>
            <Switch value={lockEnabled} onValueChange={toggleLock} accessibilityLabel={`${bio.label} lock`} />
          </View>
        )}
        <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.border }}>
          {canRoute('settings') && (
            <>
              <Pressable
                onPress={() => router.push('/(app)/settings')}
                accessibilityRole="button"
                style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10 }}
              >
                <Ionicons name="settings-outline" size={16} color={colors.primary} />
                <Text variant="label" tone="primary">Settings</Text>
              </Pressable>
              <View style={{ width: 1, backgroundColor: colors.border }} />
            </>
          )}
          <Pressable
            onPress={onSignOut}
            accessibilityRole="button"
            style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10 }}
          >
            <Ionicons name="log-out-outline" size={16} color={colors.negative} />
            <Text variant="label" style={{ color: colors.negative }}>Sign out</Text>
          </Pressable>
        </View>
      </Card>

      {/* Search across all tools */}
      <SearchField value={query} onChangeText={setQuery} placeholder="Search tools… (e.g. balances, audit)" />
      <View style={{ height: 8 }} />

      {/* AI Assistant — the page's one feature row, so it reads as an invitation
          rather than the first item of the Money list. */}
      {!query && canRoute('assistant') && (
        <Card
          padded={false}
          style={{ marginBottom: 12, backgroundColor: colors.primary + '0F', borderColor: colors.primary + '33' }}
        >
          <Pressable onPress={() => router.push('/(app)/assistant')} accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 15 }}>
            <View style={{ width: layout.leading, height: layout.leading, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="sparkles" size={19} color={colors.primaryText} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text variant="bodyMedium">AI Assistant</Text>
              <Text variant="caption" tone="muted" numberOfLines={1}>Ask about your data in plain language</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.primary} />
          </Pressable>
        </Card>
      )}

      {/* Grouped tools */}
      {groups.length === 0 ? (
        <EmptyState title="No matches" message="Try a different search." icon={<Ionicons name="search-outline" size={24} color={colors.textFaint} />} />
      ) : (
        groups.map((g) => (
          <View key={g.group} style={{ marginBottom: 12 }}>
            <Text variant="overline" tone="muted" style={{ marginBottom: 6, marginLeft: 4 }}>
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
        <Card style={{ marginBottom: layout.stack }}>
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
          <Text variant="caption" tone="faint" style={{ textAlign: 'center', marginTop: 12 }}>
            IMS Tech · v{Constants.expoConfig?.version || '1.0'}
          </Text>
        </>
      )}
    </Screen>
  );
}
