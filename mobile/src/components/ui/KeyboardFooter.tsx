import React, { useEffect } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useKeyboardOverlap } from '@/lib/keyboard';

/**
 * A bar pinned to the bottom of a screen — a Save bar, a message composer — that rides
 * up onto the keyboard's top edge while it is open and settles back when it closes.
 *
 * It moves by exactly the part of it the keyboard covers, measured, so it lands flush
 * whether the screen sits above a tab bar, fills the display, or Android has already
 * resized the window. Place it as the last child of a flex column whose other child
 * flexes: that child gives up the same height, so nothing overlaps.
 */
export function KeyboardFooter({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const { ref, overlap, onLayout, duration } = useKeyboardOverlap({ shifts: true });
  const lift = useSharedValue(0);

  useEffect(() => {
    lift.set(withTiming(overlap, { duration: Math.min(Math.max(duration, 120), 320) }));
  }, [overlap, duration, lift]);

  const animated = useAnimatedStyle(() => ({ marginBottom: lift.get() }));

  return (
    <Animated.View ref={ref as any} collapsable={false} onLayout={onLayout} style={[style, animated]}>
      {children}
    </Animated.View>
  );
}
