import { useEffect } from 'react';
import { View } from 'react-native';
import { Tabs, Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/store/auth';
import { useSettings } from '@/store/settings';
import { OfflineBanner } from '@/components/OfflineBanner';
import { registerPush, listenPushTaps } from '@/features/push/registerPush';
import { useLiveSync } from '@/features/live/useLiveSync';
import { useTheme } from '@/theme/ThemeProvider';
import { getShadow } from '@/theme/tokens';

export { AppErrorBoundary as ErrorBoundary } from '@/components/AppErrorBoundary';

// Premium tab icon: fills on focus + a small active dot underneath.
function tabIcon(base: string, activeColor: string) {
  return ({ focused, color, size }: { focused: boolean; color: any; size: number }) => (
    <View style={{ alignItems: 'center', justifyContent: 'center', width: 44 }}>
      <Ionicons name={(focused ? base : `${base}-outline`) as any} size={size ?? 22} color={color} />
      <View
        style={{
          width: 5, height: 5, borderRadius: 3, marginTop: 3,
          backgroundColor: focused ? activeColor : 'transparent',
        }}
      />
    </View>
  );
}

export default function AppLayout() {
  const { user, initializing, uidCollection, userTitle, currentUser } = useAuth();
  const loadSettings = useSettings((s) => s.load);
  const { colors, scheme } = useTheme();
  const insets = useSafeAreaInsets();
  // Web parity: 'accounting' users are restricted to the accounting view only.
  const accountingOnly = userTitle === 'accounting';

  // Load account settings (suppliers/clients/quantity + company data) once we
  // know the tenant namespace — every screen derives names/rates from these.
  useEffect(() => {
    if (uidCollection) loadSettings(uidCollection);
  }, [uidCollection, loadSettings]);

  // Register this device for push alerts (overdue-invoice digest). Silent no-op
  // if the user declines or the device can't receive push.
  useEffect(() => {
    if (uidCollection) registerPush(uidCollection, currentUser.email);
  }, [uidCollection, currentUser.email]);

  // Tapping a push deep-links into the relevant screen.
  useEffect(() => listenPushTaps(), []);

  // Live multi-user sync: teammate writes refresh this device in real time.
  useLiveSync(uidCollection);

  if (initializing) return null;
  if (!user) return <Redirect href="/sign-in" />;

  return (
    <View style={{ flex: 1 }}>
    <OfflineBanner />
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.tabActive,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom > 0 ? insets.bottom - 2 : 8,
          paddingTop: 8,
          ...getShadow(scheme, 'lg'),
        },
        tabBarLabelStyle: { fontFamily: 'Inter_600SemiBold', fontSize: 10.5, marginTop: -2 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Dashboard', tabBarIcon: tabIcon('grid', colors.tabActive), href: accountingOnly ? null : undefined }}
      />
      <Tabs.Screen
        name="contracts"
        options={{ title: 'Contracts', tabBarIcon: tabIcon('document-text', colors.tabActive), href: accountingOnly ? null : undefined }}
      />
      <Tabs.Screen
        name="invoices"
        options={{ title: 'Invoices', tabBarIcon: tabIcon('receipt', colors.tabActive), href: accountingOnly ? null : undefined }}
      />
      <Tabs.Screen
        name="stocks"
        options={{ title: 'Stocks', tabBarIcon: tabIcon('cube', colors.tabActive), href: accountingOnly ? null : undefined }}
      />
      {/* Routable but not shown in the tab bar (opened from More). */}
      <Tabs.Screen name="cashflow" options={{ href: null }} />
      <Tabs.Screen name="incoterms" options={{ href: null }} />
      <Tabs.Screen name="materials" options={{ href: null }} />
      <Tabs.Screen name="activity" options={{ href: null }} />
      <Tabs.Screen name="misc-invoices" options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
      <Tabs.Screen name="shipment" options={{ href: null }} />
      <Tabs.Screen name="sales-contracts" options={{ href: null }} />
      <Tabs.Screen name="expenses" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
      <Tabs.Screen name="acc-statement" options={{ href: null }} />
      <Tabs.Screen name="assistant" options={{ href: null }} />
      <Tabs.Screen
        name="accounting"
        options={
          accountingOnly
            ? { title: 'Accounting', tabBarIcon: tabIcon('reader', colors.tabActive) }
            : { href: null }
        }
      />
      <Tabs.Screen name="contracts-review" options={{ href: null }} />
      <Tabs.Screen name="invoices-review" options={{ href: null }} />
      <Tabs.Screen name="margins" options={{ href: null }} />
      <Tabs.Screen name="formulas" options={{ href: null }} />
      <Tabs.Screen name="settings-entity" options={{ href: null }} />
      <Tabs.Screen name="config-editor" options={{ href: null }} />
      <Tabs.Screen name="analysis" options={{ href: null }} />
      <Tabs.Screen name="stock-audit" options={{ href: null }} />
      <Tabs.Screen
        name="more"
        options={{
          href: accountingOnly ? null : undefined,
          title: 'More',
          tabBarIcon: ({ focused, color, size }) => (
            <View style={{ alignItems: 'center', justifyContent: 'center', width: 44 }}>
              <Ionicons name={focused ? 'ellipsis-horizontal-circle' : 'ellipsis-horizontal'} size={size ?? 22} color={color} />
              <View style={{ width: 5, height: 5, borderRadius: 3, marginTop: 3, backgroundColor: focused ? colors.tabActive : 'transparent' }} />
            </View>
          ),
        }}
      />
    </Tabs>
    </View>
  );
}
