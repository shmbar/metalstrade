import React from 'react';
import { View, ViewProps, Pressable as RNPressable } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, getShadow, Elevation } from '@/theme/tokens';

export interface CardProps extends ViewProps {
  padded?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
  elevation?: Elevation | 'none';
}

const AnimatedPressable = Animated.createAnimatedComponent(RNPressable);

// Physical press: the card settles in under the finger and springs back on
// release — driven on the UI thread, so it responds even while JS is busy
// working out what the tap should open. The old press was a one-frame opacity
// blink, which is exactly what reads as "did that register?".
const PRESS_IN = { damping: 18, stiffness: 420, mass: 0.6 };
const PRESS_OUT = { damping: 14, stiffness: 320, mass: 0.6 };

// Flat-by-default surface: white on the neutral canvas + hairline border does
// the separation (modern fintech). Pass `elevation` only for things that float.
export function Card({ padded = true, style, children, onPress, onLongPress, elevation = 'none', ...rest }: CardProps) {
  const { colors, scheme } = useTheme();
  const scale = useSharedValue(1);
  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));

  const cardStyle = [
    {
      backgroundColor: colors.card,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: colors.border,
      padding: padded ? 14 : 0,
      ...(elevation === 'none' ? {} : getShadow(scheme, elevation)),
    },
    style,
  ];

  if (onPress || onLongPress) {
    return (
      <AnimatedPressable
        onPress={onPress}
        onLongPress={onLongPress}
        onPressIn={() => {
          scale.set(withSpring(0.975, PRESS_IN));
        }}
        onPressOut={() => {
          scale.set(withSpring(1, PRESS_OUT));
        }}
        accessibilityRole="button"
        style={[cardStyle, pressStyle]}
        {...rest}
      >
        {children}
      </AnimatedPressable>
    );
  }

  return (
    <View style={cardStyle} {...rest}>
      {children}
    </View>
  );
}
