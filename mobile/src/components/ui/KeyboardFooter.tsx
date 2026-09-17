import React, { useEffect } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useKeyboardLift } from '@/lib/keyboard';

/**
 * A bar pinned to the bottom of a screen — a Save bar, a message composer — that rides up
 * onto the keyboard's top edge while it is open and settles back when it closes.
 *
 * The lift comes from the keyboard's height and where this bar RESTS with the keyboard down
 * (lib/keyboard useKeyboardLift). It used to be measured while the bar was moving, which fed
 * the bar's own animation back into the maths and came out short inside an iOS page sheet —
 * the Save bar on contract/invoice edit stayed under the keyboard. If the resting position is
 * ever unknown the bar rises the full keyboard height: slightly high, never hidden.
 *
 * Place it as the last child of a flex column whose other child flexes: that child gives up
 * the same height, so nothing overlaps.
 */
export function KeyboardFooter({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const { ref, onLayout, lift, duration } = useKeyboardLift();
  const offset = useSharedValue(0);

  useEffect(() => {
    offset.set(withTiming(lift, { duration: Math.min(Math.max(duration, 120), 320) }));
  }, [lift, duration, offset]);

  const animated = useAnimatedStyle(() => ({ marginBottom: offset.get() }));

  return (
    <Animated.View ref={ref as any} collapsable={false} onLayout={onLayout} style={[style, animated]}>
      {children}
    </Animated.View>
  );
}
