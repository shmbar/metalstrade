import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { ErrorBoundaryProps } from 'expo-router';
import { Text, Button } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/tokens';

// Catches any render-time error in a route segment and shows a recovery screen
// instead of crashing the whole app. Wired via `export { ErrorBoundary }` from the
// route layouts (Expo Router convention).
export function AppErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.md }}>
      <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: colors.negative + '18', alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name="alert-circle-outline" size={38} color={colors.negative} />
      </View>
      <Text variant="h2" style={{ textAlign: 'center' }}>Something went wrong</Text>
      <Text variant="body" tone="muted" style={{ textAlign: 'center' }}>
        This screen hit an unexpected error. Your data is safe — try again or go back.
      </Text>
      {error?.message ? (
        <Text variant="caption" tone="faint" selectable style={{ textAlign: 'center' }}>
          {String(error.message).slice(0, 300)}
        </Text>
      ) : null}
      <View style={{ width: '100%', gap: spacing.sm, marginTop: spacing.sm }}>
        <Button title="Try again" onPress={retry} />
        <Button
          title="Go back"
          variant="secondary"
          onPress={() => {
            if (router.canGoBack()) router.back();
            else router.replace('/(app)');
          }}
        />
      </View>
    </View>
  );
}
