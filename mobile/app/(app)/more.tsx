import { View, Pressable, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Card, Text, Badge, Button, SectionHeader } from '@/components/ui';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuth } from '@/store/auth';
import { clearBiometricCredentials } from '@/lib/secureStore';
import { radius } from '@/theme/tokens';

type Status = 'live' | 'next' | 'planned';

// The full feature inventory from the migration plan, surfaced in-app so the
// migration status is transparent. "live" = shipped in this slice.
const FEATURES: { group: string; items: { label: string; status: Status; admin?: boolean }[] }[] = [
  {
    group: 'Shipped',
    items: [
      { label: 'Dashboard (KPIs, receivables, aging)', status: 'live' },
      { label: 'Contracts — list & detail', status: 'live' },
      { label: 'Contracts — create / edit / delete', status: 'live' },
      { label: 'Invoices — list & detail', status: 'live' },
      { label: 'Invoices — record payments', status: 'live' },
      { label: 'Invoice creation — materials + stock-out', status: 'live' },
      { label: 'Stocks — on-hand inventory', status: 'live' },
      { label: 'Storage Costs — rates + tag invoices', status: 'live' },
      { label: 'Warehouse Stock-In — lot entry + write', status: 'live' },
      { label: 'Final Settlement — per-lot + Draft toggle', status: 'live' },
      { label: 'Cashflow — drill-down + partial/full payments', status: 'live' },
      { label: 'Account Statement — per-client', status: 'live' },
      { label: 'Accounting — invoice/cost ledger', status: 'live' },
      { label: 'AI Assistant — streaming chat', status: 'live' },
      { label: 'Biometric sign-in', status: 'live' },
    ],
  },
  {
    group: 'Next slice',
    items: [
      { label: 'Invoice creation (materials + stock-lot selection)', status: 'next' },
      { label: 'Cashflow — per-row ledger + partial-pay dialogs', status: 'next' },
    ],
  },
  {
    group: 'Reference & logs',
    items: [
      { label: 'Misc Invoices — list + categories', status: 'live' },
      { label: 'Incoterms 2020', status: 'live' },
      { label: 'Material Tables', status: 'live' },
      { label: 'Activity Log', status: 'live' },
      { label: 'Settings (read-only)', status: 'live' },
    ],
  },
  {
    group: 'Trade',
    items: [
      { label: 'Sales Contracts — list + shipped %', status: 'live' },
      { label: 'Shipments — status + ETD/ETA', status: 'live' },
      { label: 'Expenses — supplier & company', status: 'live' },
      { label: 'Notifications — feed + mark read', status: 'live' },
      { label: 'Contracts Review + Statement', status: 'live' },
      { label: 'Invoices Review + Statement', status: 'live' },
    ],
  },
  {
    group: 'Admin',
    items: [
      { label: 'Margins — monthly profit', status: 'live', admin: true },
      { label: 'Formulas Calc (Beta) — pricing', status: 'live', admin: true },
    ],
  },
];

const STATUS_META: Record<Status, { label: string; tone: 'positive' | 'info' | 'neutral' }> = {
  live: { label: 'Live', tone: 'positive' },
  next: { label: 'Next', tone: 'info' },
  planned: { label: 'Planned', tone: 'neutral' },
};

export default function More() {
  const { colors, pref, setPref } = useTheme();
  const { currentUser, userTitle, gisAccount, signOut } = useAuth();
  const isAdmin = userTitle === 'Admin';

  const themeOptions: { key: 'light' | 'dark' | 'system'; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: 'light', icon: 'sunny' },
    { key: 'dark', icon: 'moon' },
    { key: 'system', icon: 'phone-portrait' },
  ];

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
      <ScreenHeader title="More" subtitle="Account & settings" />

      {/* Account card */}
      <Card style={{ marginBottom: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: colors.primary,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text variant="h2" color="#fff">
              {currentUser.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text variant="h3" numberOfLines={1}>
              {currentUser.name}
            </Text>
            <Text variant="caption" tone="muted" numberOfLines={1}>
              {currentUser.email}
            </Text>
          </View>
          {isAdmin && <Badge label="Admin" tone="info" />}
          {gisAccount && <Badge label="GIS" tone="neutral" />}
        </View>
      </Card>

      {/* Assistant */}
      <Card style={{ marginBottom: 14 }} padded={false}>
        <Pressable
          onPress={() => router.push('/(app)/assistant')}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 }}
        >
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

      {/* Trade */}
      <Card style={{ marginBottom: 14 }} padded={false}>
        {[
          { label: 'Sales Contracts', sub: 'Sell-side contracts + shipped %', icon: 'document-attach-outline', href: '/(app)/sales-contracts' },
          { label: 'Shipments', sub: 'Status, ETD/ETA tracking', icon: 'boat-outline', href: '/(app)/shipment' },
          { label: 'Contracts Review', sub: 'Shipped % + statement totals', icon: 'albums-outline', href: '/(app)/contracts-review' },
          { label: 'Invoices Review', sub: 'Invoices + client/supplier statement', icon: 'documents-outline', href: '/(app)/invoices-review' },
          { label: 'Expenses', sub: 'Supplier & company expenses', icon: 'card-outline', href: '/(app)/expenses' },
        ].map((row, i) => (
          <Pressable
            key={row.href}
            onPress={() => router.push(row.href as any)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: colors.border }}
          >
            <View style={{ width: 36, height: 36, borderRadius: radius.md, backgroundColor: colors.primary + '22', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name={row.icon as any} size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="bodyMedium">{row.label}</Text>
              <Text variant="caption" tone="muted">{row.sub}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
          </Pressable>
        ))}
      </Card>

      {/* Reports */}
      <Card style={{ marginBottom: 14 }} padded={false}>
        {[
          { label: 'Cashflow', sub: 'Receivables, payables, expenses, unsold stock', icon: 'cash-outline', href: '/(app)/cashflow' },
          { label: 'Accounting', sub: 'Sales invoices ↔ purchases & expenses', icon: 'calculator-outline', href: '/(app)/accounting' },
          { label: 'Account Statement', sub: 'Per-client mid/end-month statement', icon: 'reader-outline', href: '/(app)/acc-statement' },
          { label: 'Analysis', sub: 'Shipped weight by material & client', icon: 'bar-chart-outline', href: '/(app)/analysis' },
          { label: 'Stock Audit', sub: 'Data-integrity report on stock records', icon: 'shield-checkmark-outline', href: '/(app)/stock-audit' },
        ].map((row, i) => (
          <Pressable
            key={row.href}
            onPress={() => router.push(row.href as any)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: colors.border }}
          >
            <View style={{ width: 36, height: 36, borderRadius: radius.md, backgroundColor: colors.primary + '22', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name={row.icon as any} size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="bodyMedium">{row.label}</Text>
              <Text variant="caption" tone="muted">{row.sub}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
          </Pressable>
        ))}
      </Card>

      {/* Admin */}
      {isAdmin && (
        <Card style={{ marginBottom: 14 }} padded={false}>
          {[
            { label: gisAccount ? 'GIS Margins' : 'Margins', sub: 'Monthly profit, quantity & shipped', icon: 'stats-chart-outline', href: '/(app)/margins' },
            { label: 'Formulas Calc', sub: 'FeNiCr / Stainless / SuperAlloys pricing', icon: 'calculator-outline', href: '/(app)/formulas' },
          ].map((row, i) => (
            <Pressable
              key={row.href}
              onPress={() => router.push(row.href as any)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: colors.border }}
            >
              <View style={{ width: 36, height: 36, borderRadius: radius.md, backgroundColor: colors.primary + '22', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name={row.icon as any} size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="bodyMedium">{row.label}</Text>
                <Text variant="caption" tone="muted">{row.sub}</Text>
              </View>
              <Badge label="Admin" tone="info" />
              <Ionicons name="chevron-forward" size={18} color={colors.textFaint} style={{ marginLeft: 8 }} />
            </Pressable>
          ))}
        </Card>
      )}

      {/* Reference & logs */}
      <Card style={{ marginBottom: 14 }} padded={false}>
        {[
          { label: 'Misc Invoices', sub: 'Standalone sales + categories', icon: 'receipt-outline', href: '/(app)/misc-invoices' },
          { label: 'Incoterms 2020', sub: 'Delivery-term reference', icon: 'earth-outline', href: '/(app)/incoterms' },
          { label: 'Material Tables', sub: 'Element composition', icon: 'grid-outline', href: '/(app)/materials' },
          { label: 'Notifications', sub: 'Alerts & read state', icon: 'notifications-outline', href: '/(app)/notifications' },
          { label: 'Activity Log', sub: 'Who did what, and when', icon: 'time-outline', href: '/(app)/activity' },
          { label: 'Settings', sub: 'Suppliers, clients, config', icon: 'settings-outline', href: '/(app)/settings' },
        ].map((row, i) => (
          <Pressable
            key={row.href}
            onPress={() => router.push(row.href as any)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              padding: 16,
              borderTopWidth: i === 0 ? 0 : 1,
              borderTopColor: colors.border,
            }}
          >
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: radius.md,
                backgroundColor: colors.primary + '22',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name={row.icon as any} size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="bodyMedium">{row.label}</Text>
              <Text variant="caption" tone="muted">{row.sub}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
          </Pressable>
        ))}
      </Card>

      {/* Appearance */}
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

      {/* Feature map */}
      {FEATURES.map((section) => {
        const items = section.items.filter((it) => !it.admin || isAdmin);
        if (!items.length) return null;
        return (
          <Card key={section.group} style={{ marginBottom: 14 }}>
            <SectionHeader title={section.group} />
            {items.map((it, i) => (
              <View
                key={it.label}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingVertical: 9,
                  borderTopWidth: i === 0 ? 0 : 1,
                  borderTopColor: colors.border,
                }}
              >
                <Text variant="body" style={{ flex: 1, paddingRight: 12 }}>
                  {it.label}
                </Text>
                <Badge label={STATUS_META[it.status].label} tone={STATUS_META[it.status].tone} />
              </View>
            ))}
          </Card>
        );
      })}

      <Button
        title="Sign out"
        variant="danger"
        leftIcon={<Ionicons name="log-out-outline" size={18} color="#fff" />}
        onPress={onSignOut}
      />

      <Text variant="caption" tone="faint" style={{ textAlign: 'center', marginTop: 16 }}>
        IMS Mobile · v1.0.0 · same account as the web CRM
      </Text>
    </Screen>
  );
}
