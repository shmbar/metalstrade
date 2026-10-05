import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { router } from '@/lib/nav';
import * as Linking from 'expo-linking';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import * as SplashScreen from 'expo-splash-screen';
// Plus Jakarta Sans, matching web's font consolidation — "the only family in
// the app... there is no Inter and no Poppins" (CLAUDE.md). Mobile had been
// left on Inter (and an unused Poppins dependency) since before that change.
import {
  useFonts,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import * as QuickActions from 'expo-quick-actions';
import { useQuickActionRouting } from 'expo-quick-actions/router';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';
import { PrivacyLock } from '@/components/PrivacyLock';
import { ToastHost } from '@/components/ToastHost';
import { queryClient, asyncStoragePersister } from '@/query/client';
import { dropSharedReadsOnInvalidate } from '@/query/sharedReads';
import { launch } from '@/features/live/launch';
import { useAuth } from '@/store/auth';

// Root error boundary — catches any render crash and shows a recovery screen.
export { AppErrorBoundary as ErrorBoundary } from '@/components/AppErrorBoundary';

SplashScreen.preventAutoHideAsync().catch(() => {});

// An invalidated query — a save, a teammate's change — drops the screens' shared reads first.
dropSharedReadsOnInvalidate(queryClient);

// The device copy is back in the cache (or there was none): the launch gate may start
// judging whether the first screen has its data (features/live/launchGate.ts).
const markRestored = () => launch.markRestored();

/* An app-icon shortcut navigates through lib/nav like everything else. The library's hook
   uses expo-router's own router, so a shortcut used while the app sat in the background
   with a sheet open pushed a screen under that sheet — the collision lib/nav exists to
   prevent. Returning true tells the hook the action is handled. Declared out here so its
   identity never changes: the hook re-runs, and re-handles the launch shortcut, whenever
   its callback does. */
const openShortcut = (action: QuickActions.Action): boolean => {
  const href = (action.params as { href?: unknown } | null | undefined)?.href;
  if (typeof href !== 'string' && !(href && typeof href === 'object')) return false;
  // Deferred a tick, as the library does, so a launch shortcut lands after the first mount.
  setTimeout(() => router.navigate(href as any, { withAnchor: true }));
  return true;
};

function RootNavigator() {
  const { colors, scheme } = useTheme();

  // Long-press app icon shortcuts → deep links (set once per session).
  useQuickActionRouting(openShortcut);
  useEffect(() => {
    QuickActions.setItems([
      { id: 'new-contract', title: 'New Contract', icon: 'compose', params: { href: '/(app)/contracts/edit' } },
      { id: 'assistant', title: 'AI Assistant', icon: 'search', params: { href: '/(app)/assistant' } },
      { id: 'invoices', title: 'Unpaid Invoices', icon: 'task', params: { href: '/(app)/invoices?filter=Unpaid' } },
    ]).catch(() => {});
  }, []);

  // "Open in IMS": a PDF handed to the app (Mail/Files/WhatsApp share sheet) lands on
  // the Shared document screen, which asks what it is: a supplier's invoice for a PO
  // already here (read into that PO's purchase invoices), or a proforma for a new
  // contract (the new-contract form with AI autofill — the only choice there used to be).
  useEffect(() => {
    const handle = (url: string | null) => {
      if (url && (url.startsWith('file:') || url.startsWith('content:'))) {
        router.push({ pathname: '/(app)/contracts/import', params: { uri: url } } as any);
      }
    };
    Linking.getInitialURL().then(handle).catch(() => {});
    const sub = Linking.addEventListener('url', (e) => handle(e.url));
    return () => sub.remove();
  }, []);

  return (
    <>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="sign-in" options={{ animation: 'fade' }} />
        <Stack.Screen name="(app)" />
      </Stack>
      <PrivacyLock />
      <ToastHost />
    </>
  );
}

export default function RootLayout() {
  const initAuth = useAuth((s) => s.init);
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
  });

  // Subscribe to Firebase auth once for the whole app session.
  useEffect(() => {
    const unsub = initAuth();
    return () => unsub();
  }, [initAuth]);

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PersistQueryClientProvider
          client={queryClient}
          persistOptions={{ persister: asyncStoragePersister, maxAge: 1000 * 60 * 60 * 24 * 7 }}
          onSuccess={markRestored}
          onError={markRestored}
        >
          <ThemeProvider>
            <RootNavigator />
          </ThemeProvider>
        </PersistQueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
