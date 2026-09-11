import React from 'react';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Pressable } from './Pressable';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * Circular back control — the one every pushed screen uses.
 *
 * Replaces 44 hand-rolled `‹ Back` text rows: a blue word that read like a web
 * link, sized by its text rather than by a thumb, and a dead end when the screen
 * was opened from a notification or a share (no history to go back to). This is a
 * 40pt surface button with an 8pt slop — a full 56pt target — and falls back to
 * the dashboard when there is nothing behind it.
 */
export function BackButton({ onPress, label = 'Back' }: { onPress?: () => void; label?: string }) {
  const { colors } = useTheme();
  const goBack = () => {
    if (onPress) return onPress();
    if (router.canGoBack()) router.back();
    else router.replace('/(app)');
  };
  return (
    <Pressable
      onPress={goBack}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.surfaceAlt,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Ionicons name="chevron-back" size={20} color={colors.text} style={{ marginLeft: -2 }} />
    </Pressable>
  );
}
