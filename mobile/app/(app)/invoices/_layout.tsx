import { Stack } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';

export { AppErrorBoundary as ErrorBoundary } from '@/components/AppErrorBoundary';

export default function InvoicesLayout() {
  const { colors } = useTheme();
  return (
    // freezeOnBlur: the list underneath a pushed detail/edit screen stops
    // re-rendering until it is back on top — same reason as the tab bar's.
    <Stack screenOptions={{ headerShown: false, freezeOnBlur: true, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[id]" options={{ animation: 'slide_from_right' }} />
      {/* A full screen, not an iOS page sheet: inside a page sheet views report positions
          relative to the sheet while the keyboard reports them relative to the screen, so
          anything placed against the keyboard (the sticky Save bar) landed short of it. */}
      <Stack.Screen name="edit" options={{ animation: 'slide_from_bottom' }} />
    </Stack>
  );
}
