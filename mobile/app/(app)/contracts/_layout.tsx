import { Stack } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';

export { AppErrorBoundary as ErrorBoundary } from '@/components/AppErrorBoundary';

export default function ContractsLayout() {
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        // The list underneath a pushed detail/edit screen stops re-rendering until
        // it is back on top — same reason as the tab bar's freezeOnBlur.
        freezeOnBlur: true,
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="[id]" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="edit" options={{ animation: 'slide_from_bottom', presentation: 'modal' }} />
      <Stack.Screen name="final-settlement" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="stock-in" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="new-invoice" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="files" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="cert-checker" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="po-invoices" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="pnl" options={{ animation: 'slide_from_right' }} />
    </Stack>
  );
}
