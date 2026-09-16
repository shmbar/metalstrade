import React, { useCallback, useRef, useState } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent, Pressable as RNPressable, StyleProp, ViewStyle } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Text';
import { useTheme } from '@/theme/ThemeProvider';
import { getShadow } from '@/theme/tokens';

const AnimatedPressable = Animated.createAnimatedComponent(RNPressable);

/** Height of the button plus its gap above the tab bar — what a list must leave free at its end. */
export const FAB_CLEARANCE = 56 + 16 + 16;

export interface FabProps {
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  /** Extended form — icon + text, for a list whose primary action needs a name. */
  label?: string;
  /** Show the label. Pass useFabScroll().extended so it folds to a circle while scrolling down. */
  extended?: boolean;
  accessibilityLabel?: string;
  /**
   * Distance from the bottom of the screen's content area. Every (app) screen already
   * ends at the top of the tab bar, so the device's safe-area inset must NOT be added
   * here — doing so floated the button ~90pt up, over the cards.
   */
  bottom?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Collapse an extended FAB while the list scrolls down, expand it again on the way up
 * or back at the top — so the pill stops sitting on top of the rows being read.
 */
export function useFabScroll() {
  const [extended, setExtended] = useState(true);
  const lastY = useRef(0);
  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    const dy = y - lastY.current;
    lastY.current = y;
    if (y < 24) return setExtended(true);
    if (Math.abs(dy) < 6) return;
    setExtended(dy < 0);
  }, []);
  return { extended, onScroll, scrollEventThrottle: 16 };
}

/**
 * Floating action button — the list's one primary action. One shape (56pt
 * circle, or a pill when it carries a label), one shadow, the same spring
 * press as Card, so every list's "create" feels like the same control.
 */
export function Fab({ onPress, icon = 'add', label, extended = true, accessibilityLabel, bottom = 16, style }: FabProps) {
  const { colors, scheme } = useTheme();
  const scale = useSharedValue(1);
  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  const showLabel = !!label && extended;

  return (
    <AnimatedPressable
      layout={LinearTransition.springify().damping(20).stiffness(260)}
      onPress={onPress}
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
          right: 16,
          bottom,
          height: 56,
          minWidth: 56,
          paddingHorizontal: showLabel ? 20 : 0,
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
      <Ionicons name={icon} size={showLabel ? 22 : 28} color={colors.primaryText} />
      {showLabel ? (
        <Animated.View entering={FadeIn.duration(160)} exiting={FadeOut.duration(80)}>
          <Text variant="bodyStrong" color={colors.primaryText} numberOfLines={1}>
            {label}
          </Text>
        </Animated.View>
      ) : null}
    </AnimatedPressable>
  );
}
