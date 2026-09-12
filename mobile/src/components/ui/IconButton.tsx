import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable } from './Pressable';
import { useTheme } from '@/theme/ThemeProvider';

export interface IconButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  accessibilityLabel: string;
  /** 'surface' — quiet circle (header actions); 'primary' — filled brand circle. */
  variant?: 'surface' | 'primary';
  /** Glyph colour on a surface button. Destructive row actions use 'danger'. */
  tone?: 'primary' | 'danger' | 'muted';
  size?: number;
  disabled?: boolean;
}

/**
 * Round icon control — the partner of BackButton for the other end of a header
 * (export, add, edit) and for destructive row actions. Same disc + 8pt slop, so
 * a bare 20px glyph is never the whole touch target again.
 */
export function IconButton({
  icon,
  onPress,
  accessibilityLabel,
  variant = 'surface',
  tone = 'primary',
  size = 40,
  disabled,
}: IconButtonProps) {
  const { colors } = useTheme();
  const primary = variant === 'primary';
  const glyph = primary
    ? colors.primaryText
    : tone === 'danger'
      ? colors.negative
      : tone === 'muted'
        ? colors.textMuted
        : colors.primary;
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: primary ? colors.primary : colors.surfaceAlt,
        borderWidth: primary ? 0 : 1,
        borderColor: tone === 'danger' ? colors.negative + '33' : colors.border,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <Ionicons name={icon} size={Math.round(size / 2)} color={glyph} />
    </Pressable>
  );
}
