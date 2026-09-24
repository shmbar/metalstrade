import React from 'react';
import { Pressable as RNPressable, PressableProps, StyleProp, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { haptics } from '@/lib/haptics';

export type PressHaptic = 'selection' | 'impact';

const AnimatedPressable = Animated.createAnimatedComponent(RNPressable);

/**
 * Drop-in Pressable that shows a pressed state on every tap.
 *
 * Client report (2026-09-11): "I press on buttons and it takes time... some need
 * to press a few times." Of 176 Pressables in the app only Card dimmed on touch,
 * so a tap that landed during a busy frame looked like a miss and got repeated.
 * This dims the target the instant the finger is down — the way iOS's own
 * controls and every banking app respond — independent of how long the work
 * behind the tap then takes.
 *
 * The dim is a Reanimated opacity driven from onPressIn/onPressOut, NOT a
 * `style={({ pressed }) => …}` callback. The first version used the callback
 * and every styled control in the app rendered with no style at all on device
 * (chips as bare text, nav rows stacked in the corner, back buttons without
 * their disc): the NativeWind JSX runtime that was still wired into babel
 * swallowed function styles on Pressable. NativeWind is gone now, but the
 * opacity also runs on the UI thread this way, so the feedback lands even
 * while JS is busy with the work the tap started.
 *
 * - A caller that styles `pressed` itself (function style) is passed through.
 * - A childless Pressable (a modal backdrop) gets no feedback: dimming the scrim
 *   for a frame before its sheet closes reads as a flicker, not a response.
 * - `pressedOpacity={1}` opts a single control out.
 */
export function Pressable({
  style,
  children,
  pressedOpacity = 0.6,
  haptic,
  onPressIn,
  onPressOut,
  ...rest
}: PressableProps & {
  pressedOpacity?: number;
  /**
   * Feedback felt the instant the finger touches — iOS's own controls tick on touch-down.
   * Firing it from onPress meant waiting for the finger to LIFT and for the JS thread to
   * finish whatever the tap started (client, 2026-09-24: "haptics feel slow").
   */
  haptic?: PressHaptic;
}) {
  const opacity = useSharedValue(1);
  const dim = useAnimatedStyle(() => ({ opacity: opacity.get() }));
  const buzz = () => {
    if (!haptic || rest.disabled) return;
    if (haptic === 'selection') haptics.selection();
    else haptics.impact();
  };

  if (typeof style === 'function' || children == null || pressedOpacity >= 1) {
    return (
      <RNPressable
        style={style}
        onPressIn={(e) => {
          buzz();
          onPressIn?.(e);
        }}
        onPressOut={onPressOut}
        {...rest}
      >
        {children}
      </RNPressable>
    );
  }
  return (
    <AnimatedPressable
      style={[style as StyleProp<ViewStyle>, dim]}
      onPressIn={(e) => {
        buzz();
        if (!rest.disabled) opacity.set(withTiming(pressedOpacity, { duration: 60 }));
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        opacity.set(withTiming(1, { duration: 160 }));
        onPressOut?.(e);
      }}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  );
}
