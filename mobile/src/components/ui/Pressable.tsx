import React, { useRef } from 'react';
import { GestureResponderEvent, Pressable as RNPressable, PressableProps, StyleProp, StyleSheet, ViewStyle } from 'react-native';
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
 *
 * The dim MULTIPLIES the control's own opacity. It used to replace it: an animated style
 * wins over a static one, so the 0.5 a disabled Button or IconButton sets was overwritten
 * by the dim's resting 1 — every disabled control in the app looked live, and a tap on one
 * did nothing ("buttons not responding", client, 2026-10-05).
 */
export function Pressable({
  style,
  children,
  pressedOpacity = 0.6,
  haptic,
  pressGuardMs = 0,
  onPress,
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
  /**
   * A second press within this many ms of the first is ignored — a double tap is one
   * action. Button and IconButton set it: a quick double tap on Save wrote twice, and on
   * "+" added two rows, because the second tap landed before the first had re-rendered
   * the control as busy.
   */
  pressGuardMs?: number;
}) {
  const progress = useSharedValue(0);
  // The opacity the caller asked for (a disabled control's dim), which the press multiplies.
  const restOpacity = typeof style === 'function' ? 1 : Number(StyleSheet.flatten(style as StyleProp<ViewStyle>)?.opacity ?? 1);
  const dim = useAnimatedStyle(
    () => ({ opacity: restOpacity * (1 - progress.get() * (1 - pressedOpacity)) }),
    [restOpacity, pressedOpacity]
  );
  const lastPress = useRef(0);
  const guardedPress = onPress
    ? (e: GestureResponderEvent) => {
        if (pressGuardMs > 0) {
          const t = Date.now();
          if (t - lastPress.current < pressGuardMs) return;
          lastPress.current = t;
        }
        onPress(e);
      }
    : undefined;
  const buzz = () => {
    if (!haptic || rest.disabled) return;
    if (haptic === 'selection') haptics.selection();
    else haptics.impact();
  };

  if (typeof style === 'function' || children == null || pressedOpacity >= 1) {
    return (
      <RNPressable
        style={style}
        onPress={guardedPress}
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
      onPress={guardedPress}
      onPressIn={(e) => {
        buzz();
        if (!rest.disabled) progress.set(withTiming(1, { duration: 60 }));
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        progress.set(withTiming(0, { duration: 160 }));
        onPressOut?.(e);
      }}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  );
}

/** The double-tap window Button and IconButton use. */
export const PRESS_GUARD_MS = 400;
