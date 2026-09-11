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
      <Stack.Screen name="edit" options={{ animation: 'slide_from_bottom', presentation: 'modal' }} />
    </Stack>
  );
}
