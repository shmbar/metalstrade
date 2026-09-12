import React from 'react';
import { Pressable as RNPressable, StyleProp, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Text';
import { useTheme } from '@/theme/ThemeProvider';
import { getShadow } from '@/theme/tokens';
import { hapticTap } from '@/lib/haptics';

const AnimatedPressable = Animated.createAnimatedComponent(RNPressable);

export interface FabProps {
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  /** Extended form — icon + text, for a list whose primary action needs a name. */
  label?: string;
  accessibilityLabel?: string;
  /** Distance from the bottom edge; tab screens sit on the tab bar, stack screens add their inset. */
  bottom?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Floating action button — the list's one primary action. One shape (56pt
 * circle, or a pill when it carries a label), one shadow, the same spring
 * press as Card, so every list's "create" feels like the same control.
 */
export function Fab({ onPress, icon = 'add', label, accessibilityLabel, bottom = 20, style }: FabProps) {
  const { colors, scheme } = useTheme();
  const scale = useSharedValue(1);
  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));

  return (
    <AnimatedPressable
      onPress={() => {
        hapticTap();
        onPress();
      }}
      onPressIn={() => {
        scale.set(withSpring(0.92, { damping: 18, stiffness: 420, mass: 0.6 }));
      }}
      onPressOut={() => {
        scale.set(withSpring(1, { damping: 14, stiffness: 320, mass: 0.6 }));
      }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || label || 'Create'}
      style={[
        {
          position: 'absolute',
          right: 20,
          bottom,
          height: 56,
          minWidth: 56,
          paddingHorizontal: label ? 20 : 0,
          borderRadius: 28,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          backgroundColor: colors.primary,
          zIndex: 10,
          ...getShadow(scheme, 'lg'),
        },
        pressStyle,
        style,
      ]}
    >
      <Ionicons name={icon} size={label ? 22 : 28} color={colors.primaryText} />
      {label ? (
        <Text variant="bodyMedium" color={colors.primaryText}>
          {label}
        </Text>
      ) : null}
    </AnimatedPressable>
  );
}
