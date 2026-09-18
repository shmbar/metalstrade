import { useEffect } from 'react';
import { AppState, Keyboard, View } from 'react-native';
import { onlineManager } from '@tanstack/react-query';
import { Tabs, Redirect, useSegments } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/store/auth';
import { useSettings } from '@/store/settings';
import { OfflineBanner } from '@/components/OfflineBanner';
import { registerPush, listenPushTaps } from '@/features/push/registerPush';
import { useLiveSync } from '@/features/live/useLiveSync';
import { useFreshOnFocus } from '@/features/live/useFreshOnFocus';
import { useWarmLedger } from '@/features/stocks/useWarmLedger';
import { useTheme } from '@/theme/ThemeProvider';
import { getShadow, typography } from '@/theme/tokens';
import { haptics } from '@/lib/haptics';
import { useShallow } from 'zustand/react/shallow';

export { AppErrorBoundary as ErrorBoundary } from '@/components/AppErrorBoundary';

// Tab icon: outline at rest, filled and tinted when selected — the way iOS's own tab bars
// show the active tab. There used to be a 5pt "active dot" drawn UNDER the icon as part of
// the layout: it took 8pt from a bar that had none to spare, pushed the label down, and
// read as a notification badge (client, 2026-09-18: "notification dots are not positioned
// correctly"). The filled icon and colour already say which tab is active.
function tabIcon(base: string) {
  return ({ focused, color, size }: { focused: boolean; color: any; size: number }) => (
    <Ionicons name={(focused ? base : `${base}-outline`) as any} size={size ?? 22} color={color} />
  );
}

export default function AppLayout() {
  const { user, initializing, uidCollection, currentUser, canRoute, landingHref, allowedPages } = useAuth(useShallow((s) => ({ user: s.user, initializing: s.initializing, uidCollection: s.uidCollection, currentUser: s.currentUser, canRoute: s.canRoute, landingHref: s.landingHref, allowedPages: s.allowedPages })));
  const loadSettings = useSettings((s) => s.load);
  const startSettings = useSettings((s) => s.start);
  const { colors, scheme } = useTheme();
  const insets = useSafeAreaInsets();
  // Per-page permissions (web utils/permissions.js): the tab bar and every route are
  // gated by the pages this user may open. An Accounting member's default set is
  // just ['accounting'], so the old accounting-only special case falls out of this.
  const segments = useSegments() as string[];
  const route = segments[1] || 'index';
  const homeIsAccounting = !canRoute('index') && canRoute('accounting');

  // The lists start from the device copy, retry until the server answers, follow edits
  // live, and refresh on reconnect or on returning to the app (store/settings.ts).
  useEffect(() => {
    if (!uidCollection) return;
    const stop = startSettings(uidCollection);
    const refresh = () => loadSettings(uidCollection);
    const unOnline = onlineManager.subscribe((online) => {
      if (online) refresh();
    });
    const appState = AppState.addEventListener('change', (next) => {
      if (next === 'active') refresh();
    });
    return () => {
      stop();
      unOnline();
      appState.remove();
    };
  }, [uidCollection, loadSettings, startSettings]);

  // Register this device for push alerts (overdue-invoice digest). Silent no-op
  // if the user declines or the device can't receive push.
  useEffect(() => {
    if (uidCollection) registerPush(uidCollection, currentUser.email);
  }, [uidCollection, currentUser.email]);

  // Tapping a push deep-links into the relevant screen.
  useEffect(() => listenPushTaps(), []);

  // Live multi-user sync: teammate writes refresh this device in real time.
  useLiveSync(uidCollection);
  // The big stock ledger starts loading at sign-in and then stays live.
  useWarmLedger(uidCollection);
  // Switching tab (or returning to the app) refreshes what is on screen and stale.
  useFreshOnFocus(route, !!uidCollection);

  // Moving to another screen ends editing on the one being left. Otherwise a keyboard opened
  // by a search box stays up over the next screen — an Add/Edit form opens with its fields
  // and its Save bar underneath a keyboard that belongs to a field no longer visible.
  const screenKey = segments.join('/');
  useEffect(() => {
    Keyboard.dismiss();
  }, [screenKey]);

  if (initializing) return null;
  if (!user) return <Redirect href="/sign-in" />;
  // Route guard: a screen this user may not open sends them to web's landing page
  // for them. Never redirect a route to itself, so a misconfigured claim cannot loop.
  const here = route === 'index' ? '/(app)' : `/(app)/${route}`;
  if (!canRoute(route) && landingHref !== here) return <Redirect href={landingHref as any} />;

  return (
    <View style={{ flex: 1 }}>
    <OfflineBanner />
    <Tabs
      screenListeners={{ tabPress: () => haptics.selection() }}
      screenOptions={{
        headerShown: false,
        // A visited tab stays mounted, and without this it keeps re-rendering in
        // the background: one live-sync event from a teammate re-ran Cashflow's
        // and Inventory's full computations in hidden tabs (~100 ms each on a
        // laptop, several times that on a phone) while the user was tapping
        // somewhere else — the "press a few times" freezes. A frozen tab renders
        // nothing until it is focused again, then catches up once.
        freezeOnBlur: true,
        tabBarActiveTintColor: colors.tabActive,
        tabBarInactiveTintColor: colors.tabInactive,
        // iOS's own tab bar is 49pt + the home-indicator inset. Icon 22, a 2pt gap, label 10:
        // everything fits with room, on every phone, without negative margins.
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          height: 49 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 6,
          ...getShadow(scheme, 'lg'),
        },
        tabBarItemStyle: { paddingVertical: 0 },
        tabBarIconStyle: { marginBottom: 0 },
        tabBarAllowFontScaling: false,
        tabBarLabelStyle: { fontFamily: typography.overline.fontFamily, fontSize: typography.overline.fontSize, lineHeight: 12, marginTop: 2 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Dashboard', tabBarIcon: tabIcon('grid'), href: canRoute('index') ? undefined : null }}
      />
      <Tabs.Screen
        name="contracts"
        options={{ title: 'Contracts', tabBarIcon: tabIcon('document-text'), href: canRoute('contracts') ? undefined : null }}
      />
      <Tabs.Screen
        name="invoices"
        options={{ title: 'Invoices', tabBarIcon: tabIcon('receipt'), href: canRoute('invoices') ? undefined : null }}
      />
      <Tabs.Screen
        name="stocks"
        options={{ title: 'Stocks', tabBarIcon: tabIcon('cube'), href: canRoute('stocks') ? undefined : null }}
      />
      {/* Client feedback (2026-09-03, Sharon): the Cashflow page belongs on the
          bottom bar, not Balances — Balances moves to More instead, same slot
          Cashflow used to sit in. */}
      <Tabs.Screen
        name="cashflow"
        options={{ title: 'Cashflow', tabBarIcon: tabIcon('cash'), href: canRoute('cashflow') ? undefined : null }}
      />
      {/* Routable but not shown in the tab bar (opened from More). */}
      <Tabs.Screen name="balances" options={{ href: null }} />
      <Tabs.Screen name="incoterms" options={{ href: null }} />
      <Tabs.Screen name="materials" options={{ href: null }} />
      <Tabs.Screen name="activity" options={{ href: null }} />
      <Tabs.Screen name="misc-invoices" options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
      <Tabs.Screen name="shipment" options={{ href: null }} />
      <Tabs.Screen name="sales-contracts" options={{ href: null }} />
      <Tabs.Screen name="sales-contract-edit" options={{ href: null }} />
      <Tabs.Screen name="expenses" options={{ href: null }} />
      <Tabs.Screen name="expense-edit" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
      <Tabs.Screen name="acc-statement" options={{ href: null }} />
      <Tabs.Screen name="assistant" options={{ href: null }} />
      <Tabs.Screen
        name="accounting"
        options={
          homeIsAccounting
            ? { title: 'Accounting', tabBarIcon: tabIcon('reader') }
            : { href: null }
        }
      />
      <Tabs.Screen name="contracts-review" options={{ href: null }} />
      <Tabs.Screen name="invoices-review" options={{ href: null }} />
      <Tabs.Screen name="margins" options={{ href: null }} />
      <Tabs.Screen name="formulas" options={{ href: null }} />
      <Tabs.Screen name="settings-entity" options={{ href: null }} />
      <Tabs.Screen name="settings-company" options={{ href: null }} />
      <Tabs.Screen name="settings-setup" options={{ href: null }} />
      <Tabs.Screen name="settings-grades" options={{ href: null }} />
      <Tabs.Screen name="settings-email" options={{ href: null }} />
      <Tabs.Screen name="settings-users" options={{ href: null }} />
      <Tabs.Screen name="config-editor" options={{ href: null }} />
      <Tabs.Screen name="analysis" options={{ href: null }} />
      <Tabs.Screen name="stock-audit" options={{ href: null }} />
      <Tabs.Screen
        name="more"
        options={{
          // The hub stays unless Accounting is literally the only page this user has.
          href: homeIsAccounting && allowedPages.length <= 1 ? null : undefined,
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
