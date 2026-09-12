import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Text';
import { Pressable } from './Pressable';
import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/tokens';

export interface ChipProps {
  label: string;
  active?: boolean;
  onPress?: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  /** Small count bubble after the label (filter chips). */
  count?: number;
  /** Trailing glyph — a sort chip shows its direction here. */
  trailingIcon?: keyof typeof Ionicons.glyphMap;
}

/**
 * Filter / sort chip — the one pill every list uses for its quick filters.
 * 34pt tall so a thumb lands on it; active state is a tinted fill + brand
 * border, the same treatment as the dashboard's filter chips, so "selected"
 * looks the same on every screen instead of each list inventing its own.
 */
export function Chip({ label, active = false, onPress, icon, count, trailingIcon }: ChipProps) {
  const { colors } = useTheme();
  const fg = active ? colors.primary : colors.textMuted;
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        height: 34,
        paddingHorizontal: 13,
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: active ? colors.primary : colors.border,
        backgroundColor: active ? colors.primary + '14' : colors.surfaceAlt,
      }}
    >
      {icon ? <Ionicons name={icon} size={14} color={fg} /> : null}
      <Text variant="caption" color={fg} style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}>
        {label}
      </Text>
      {typeof count === 'number' ? (
        <View
          style={{
            minWidth: 18,
            height: 18,
            paddingHorizontal: 5,
            borderRadius: 9,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: active ? colors.primary : colors.border,
          }}
        >
          <Text
            variant="caption"
            color={active ? colors.primaryText : colors.textMuted}
            style={{ fontSize: 11, lineHeight: 14, fontFamily: 'PlusJakartaSans_600SemiBold', fontVariant: ['tabular-nums'] }}
          >
            {count}
          </Text>
        </View>
      ) : null}
      {trailingIcon ? <Ionicons name={trailingIcon} size={12} color={fg} /> : null}
    </Pressable>
  );
}
