import '../global.css';
import { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import * as Linking from 'expo-linking';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import * as QuickActions from 'expo-quick-actions';
import { useQuickActionRouting } from 'expo-quick-actions/router';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';
import { PrivacyLock } from '@/components/PrivacyLock';
import { queryClient, asyncStoragePersister } from '@/query/client';
import { useAuth } from '@/store/auth';

// Root error boundary — catches any render crash and shows a recovery screen.
export { AppErrorBoundary as ErrorBoundary } from '@/components/AppErrorBoundary';

SplashScreen.preventAutoHideAsync().catch(() => {});

function RootNavigator() {
  const { colors, scheme } = useTheme();

  // Long-press app icon shortcuts → deep links (set once per session).
  useQuickActionRouting();
  useEffect(() => {
    QuickActions.setItems([
      { id: 'new-contract', title: 'New Contract', icon: 'compose', params: { href: '/(app)/contracts/edit' } },
      { id: 'assistant', title: 'AI Assistant', icon: 'search', params: { href: '/(app)/assistant' } },
      { id: 'invoices', title: 'Unpaid Invoices', icon: 'task', params: { href: '/(app)/invoices?filter=Unpaid' } },
    ]).catch(() => {});
  }, []);

  // "Open in IMS": a PDF handed to the app (Mail/Files/WhatsApp share sheet)
  // lands on the new-contract form with AI autofill running on that file.
  useEffect(() => {
    const handle = (url: string | null) => {
      if (url && (url.startsWith('file:') || url.startsWith('content:'))) {
        router.push({ pathname: '/(app)/contracts/edit', params: { importUri: url } } as any);
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
    </>
  );
}

export default function RootLayout() {
  const initAuth = useAuth((s) => s.init);
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
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
        >
          <ThemeProvider>
            <RootNavigator />
          </ThemeProvider>
        </PersistQueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
