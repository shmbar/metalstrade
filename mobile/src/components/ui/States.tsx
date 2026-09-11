import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Text';
import { Button } from './Button';
import { Skeleton } from './Skeleton';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/tokens';

/**
 * Loading / empty / error states. Same props as before, so every screen that
 * already uses them lifts with no call-site change.
 *
 * The old versions were a bare spinner, and a line of heading text with an
 * optional icon floating above it — the 2020 "nothing here" page. Now each state
 * has the same anatomy: a soft tinted disc carrying the glyph, a short heading,
 * one supporting sentence at a readable measure, and the one action that gets the
 * person unstuck.
 */

function Disc({ children, tint }: { children: React.ReactNode; tint: string }) {
  return (
    <View
      style={{
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: tint + '1A',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 6,
      }}
    >
      {children}
    </View>
  );
}

/**
 * Loading. A shimmering outline of content rather than a spinner: the page's
 * shape arrives first, so the wait reads as "filling in" instead of "stuck".
 */
export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <View style={{ paddingVertical: spacing.xl, gap: 12 }} accessibilityRole="progressbar" accessibilityLabel={label}>
      <Skeleton width={'45%'} height={18} />
      <Skeleton width={'80%'} height={12} />
      <Skeleton width={'65%'} height={12} />
      <View style={{ height: 8 }} />
      <Skeleton height={64} style={{ borderRadius: 16 }} />
      <Skeleton height={64} style={{ borderRadius: 16 }} />
    </View>
  );
}

export function EmptyState({
  title,
  message,
  icon,
  actionLabel,
  onAction,
}: {
  title: string;
  message?: string;
  icon?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: spacing['3xl'], paddingHorizontal: spacing.lg, gap: 8 }}>
      <Disc tint={colors.primary}>
        {icon ?? <Ionicons name="file-tray-outline" size={32} color={colors.primary} />}
      </Disc>
      <Text variant="h3" style={{ textAlign: 'center' }}>
        {title}
      </Text>
      {message ? (
        <Text variant="body" tone="muted" style={{ textAlign: 'center', maxWidth: 300 }}>
          {message}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <Button title={actionLabel} variant="secondary" fullWidth={false} onPress={onAction} style={{ marginTop: 10, paddingHorizontal: spacing.xl }} />
      ) : null}
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { colors } = useTheme();
  return (
    <View
      style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: spacing['3xl'], paddingHorizontal: spacing.lg, gap: 8 }}
      accessibilityRole="alert"
    >
      <Disc tint={colors.negative}>
        <Ionicons name="cloud-offline-outline" size={32} color={colors.negative} />
      </Disc>
      <Text variant="h3" style={{ textAlign: 'center' }}>
        Couldn’t load this
      </Text>
      <Text variant="body" tone="muted" style={{ textAlign: 'center', maxWidth: 300 }}>
        {message}
      </Text>
      {onRetry ? (
        <Button
          title="Try again"
          variant="secondary"
          fullWidth={false}
          onPress={onRetry}
          leftIcon={<Ionicons name="refresh" size={16} color={colors.primary} />}
          style={{ marginTop: 10, paddingHorizontal: spacing.xl }}
        />
      ) : null}
    </View>
  );
}
