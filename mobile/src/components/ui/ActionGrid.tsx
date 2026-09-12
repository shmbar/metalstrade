import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Text';
import { Pressable } from './Pressable';
import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/tokens';

export interface GridAction {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  loading?: boolean;
  /** Tinted tile for the one action that matters most in the set. */
  emphasis?: boolean;
  /** Drop the action without leaving a hole in the grid. */
  hidden?: boolean;
}

/**
 * Secondary actions as a tile grid — for the tail of a detail screen, where a
 * column of eight full-width buttons used to sit. Two tiles per row keeps every
 * action one tap away without the page reading like a settings list.
 */
export function ActionGrid({ actions, columns = 2 }: { actions: GridAction[]; columns?: 2 | 3 }) {
  const { colors } = useTheme();
  const list = actions.filter((a) => !a.hidden);
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
      {list.map((a) => {
        const tint = a.emphasis ? colors.primary : colors.textMuted;
        return (
          <Pressable
            key={a.key}
            onPress={a.onPress}
            disabled={a.loading}
            accessibilityRole="button"
            accessibilityLabel={a.label}
            style={{
              // `gap` is 10 → each tile gives up its share so rows stay full.
              flexBasis: `${100 / columns}%`,
              flexGrow: 1,
              maxWidth: columns === 2 ? '48.5%' : '31.5%',
              flexDirection: columns === 2 ? 'row' : 'column',
              alignItems: 'center',
              gap: 10,
              minHeight: 56,
              paddingHorizontal: 12,
              paddingVertical: 10,
              borderRadius: radius.lg,
              borderWidth: 1,
              borderColor: a.emphasis ? colors.primary + '55' : colors.border,
              backgroundColor: a.emphasis ? colors.primary + '10' : colors.card,
            }}
          >
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: a.emphasis ? colors.primary + '1A' : colors.surfaceAlt,
              }}
            >
              {a.loading ? <ActivityIndicator size="small" color={tint} /> : <Ionicons name={a.icon} size={17} color={tint} />}
            </View>
            <Text
              variant="caption"
              color={a.emphasis ? colors.primary : colors.text}
              numberOfLines={2}
              style={{ flexShrink: 1, fontFamily: 'PlusJakartaSans_600SemiBold', textAlign: columns === 2 ? 'left' : 'center' }}
            >
              {a.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
