import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Text } from './Text';
import { Button } from './Button';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/tokens';

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: spacing['3xl'], gap: 12 }}>
      <ActivityIndicator color={colors.primary} size="large" />
      <Text variant="bodyMedium" tone="muted">
        {label}
      </Text>
    </View>
  );
}

export function EmptyState({
  title,
  message,
  icon,
}: {
  title: string;
  message?: string;
  icon?: React.ReactNode;
}) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: spacing['3xl'], gap: 8 }}>
      {icon}
      <Text variant="h3">{title}</Text>
      {message && (
        <Text variant="body" tone="muted" style={{ textAlign: 'center', maxWidth: 280 }}>
          {message}
        </Text>
      )}
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: spacing['3xl'], gap: 12 }}>
      <Text variant="h3" tone="negative">
        Something went wrong
      </Text>
      <Text variant="body" tone="muted" style={{ textAlign: 'center', maxWidth: 300 }}>
        {message}
      </Text>
      {onRetry && <Button title="Try again" variant="secondary" fullWidth={false} onPress={onRetry} />}
    </View>
  );
}
