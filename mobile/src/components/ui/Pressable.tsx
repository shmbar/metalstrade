import React from 'react';
import { Pressable as RNPressable, PressableProps, StyleProp, ViewStyle } from 'react-native';

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
 * - A caller that already styles `pressed` itself (function style) is untouched.
 * - A childless Pressable (a modal backdrop) gets no feedback: dimming the scrim
 *   for a frame before its sheet closes reads as a flicker, not a response.
 * - `pressedOpacity={1}` opts a single control out.
 */
export function Pressable({
  style,
  children,
  pressedOpacity = 0.6,
  ...rest
}: PressableProps & { pressedOpacity?: number }) {
  if (typeof style === 'function' || children == null || pressedOpacity >= 1) {
    return (
      <RNPressable style={style} {...rest}>
        {children}
      </RNPressable>
    );
  }
  return (
    <RNPressable
      style={({ pressed }) => [
        style as StyleProp<ViewStyle>,
        pressed && !rest.disabled ? { opacity: pressedOpacity } : null,
      ]}
      {...rest}
    >
      {children}
    </RNPressable>
  );
}
