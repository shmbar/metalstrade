import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Text';
import { Pressable } from './Pressable';
import { useTheme } from '@/theme/ThemeProvider';
import { layout, radius } from '@/theme/tokens';
import { haptics } from '@/lib/haptics';

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
export function Chip({ label, active: activeProp, onPress, icon, count, trailingIcon }: ChipProps) {
  const { colors } = useTheme();
  const active = !!activeProp;
  const press = onPress && activeProp !== undefined ? () => { haptics.selection(); onPress(); } : onPress;
  const fg = active ? colors.primary : colors.textMuted;
  return (
    <Pressable
      onPress={press}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        height: layout.pillHeight,
        paddingHorizontal: 12,
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: active ? colors.primary : colors.border,
        backgroundColor: active ? colors.primary + '14' : colors.surfaceAlt,
      }}
    >
      {icon ? <Ionicons name={icon} size={14} color={fg} /> : null}
      <Text variant="captionStrong" color={fg}>
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
            variant="tableStrong"
            color={active ? colors.primaryText : colors.textMuted}
          >
            {count}
          </Text>
        </View>
      ) : null}
      {trailingIcon ? <Ionicons name={trailingIcon} size={12} color={fg} /> : null}
    </Pressable>
  );
}
