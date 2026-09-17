import React, { useEffect } from 'react';
import { Modal, View, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { scheduleOnRN } from 'react-native-worklets';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Text';
import { Pressable } from './Pressable';
import { useTheme } from '@/theme/ThemeProvider';
import { getShadow, spacing } from '@/theme/tokens';
import { KeyboardRevealContext, keyboardScrollProps, syncKeyboard, useKeyboard, useKeyboardAwareScroll, usePresentAfterKeyboard } from '@/lib/keyboard';

interface SheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  /** Extra header control, left of the close button. */
  headerRight?: React.ReactNode;
  children: React.ReactNode;
  /** Wrap the body in a ScrollView. A body that brings its own FlatList passes false. */
  scroll?: boolean;
  /** Pinned under the body — totals, primary actions. */
  footer?: React.ReactNode;
  /** Share of the window height the sheet may take. */
  maxHeightPct?: number;
}

/** Time the panel takes to ride up with the keyboard; fields are revealed after it lands. */
const LIFT_MS = 240;

/**
 * Bottom sheet — the one sheet every screen uses.
 *
 * Replaces the hand-rolled `<Modal transparent animationType="slide">` blocks,
 * which slid the dimmed scrim up together with the panel, had no grabber, and
 * could only be dismissed by aiming at a small ✕ or the scrim. Here the scrim
 * fades, the panel springs up, and the header follows the finger: drag it down
 * far enough (or flick) and the sheet closes — the gesture iOS and every banking
 * app have trained people to expect.
 *
 * Keyboard: the panel rides up by exactly the part of the screen the keyboard covers
 * and gives up the same amount of its maximum height, so the header, the focused field
 * (scrolled into view) and the footer's Save all stay visible above the keyboard. The
 * overlap comes from the app-wide keyboard store (lib/keyboard), so a sheet whose first
 * field autofocuses — Cashflow's "Add entry" — lifts too; that one used to open entirely
 * behind the keyboard.
 */
export function Sheet({
  visible,
  onClose,
  title,
  subtitle,
  headerRight,
  children,
  scroll = true,
  footer,
  maxHeightPct = 0.88,
}: SheetProps) {
  const { colors, scheme } = useTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const y = useSharedValue(0);
  const lift = useSharedValue(0);
  // The sheet is a full-screen Modal, so the keyboard covers exactly its own height of it —
  // no measuring. It used to measure a probe view inside the Modal; on the FIRST open the
  // Modal is not attached yet, that measurement comes back empty, nothing re-measured, and
  // the sheet stayed behind the keyboard (Cash Flow → Add Entry, build 37). Later opens
  // worked, which is why it looked random.
  const keyboard = useKeyboard();
  const keyboardUp = keyboard.height > 0;
  const body = useKeyboardAwareScroll({ settleMs: LIFT_MS + 60, padForKeyboard: false, deferAutoFocus: true });

  // A keyboard that is up when the sheet is asked to open belongs to a field on the screen
  // behind it (Cash Flow's search, then Add Entry). The sheet does not present until that
  // keyboard has finished closing — the order is enforced in lib/keyboard, once, for every
  // sheet — so the form is never positioned from a keyboard it is about to lose.
  const presented = usePresentAfterKeyboard(visible);

  // The panel slides in on the same value the drag-to-close uses. A Reanimated "entering"
  // layout animation ran on the panel before; it is a separate animator on the same view as
  // the keyboard lift, and a lift that lands while it is still running can be lost.
  useEffect(() => {
    if (!presented) return;
    y.set(height);
    y.set(withSpring(0, { damping: 20, stiffness: 220, mass: 0.8 }));
  }, [presented, y, height]);

  // Once the Modal is really on screen: re-read the keyboard (in case any event arrived out
  // of order during the transition), then focus the field that asked for autoFocus.
  const onShown = () => {
    syncKeyboard();
    body.flushAutoFocus();
  };

  useEffect(() => {
    lift.set(withTiming(keyboard.height, { duration: LIFT_MS }));
  }, [keyboard.height, lift]);

  // The drag lives on the header only, so a scrolling body keeps its own gesture.
  const pan = Gesture.Pan()
    .activeOffsetY(6)
    .failOffsetX([-24, 24])
    .onUpdate((e) => {
      y.set(Math.max(0, e.translationY));
    })
    .onEnd((e) => {
      if (e.translationY > 120 || e.velocityY > 900) {
        y.set(withTiming(height, { duration: 180 }, () => scheduleOnRN(onClose)));
      } else {
        y.set(withSpring(0, { damping: 22, stiffness: 260 }));
      }
    });

  const topGap = insets.top + 12;
  const panelStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: y.get() }],
    marginBottom: lift.get(),
    maxHeight: Math.min(height * maxHeightPct, height - topGap - lift.get()),
  }));

  if (!presented) return null;

  // With the keyboard up it covers the home indicator, so the safe-area padding goes.
  const bottomPad = (keyboardUp ? 0 : insets.bottom) + spacing.md;

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={onClose} onShow={onShown}>
      <GestureHandlerRootView style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable
          style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(10,8,24,0.45)' }]}
          onPress={onClose}
          accessibilityLabel="Close"
        />
        <Animated.View
          style={[
            {
              backgroundColor: colors.bgElevated,
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              paddingBottom: footer ? 0 : bottomPad,
              ...getShadow(scheme, 'lg'),
            },
            panelStyle,
          ]}
        >
          <GestureDetector gesture={pan}>
            <View style={{ paddingTop: 8, paddingHorizontal: spacing.lg, paddingBottom: title ? spacing.md : spacing.sm }}>
              <View
                style={{
                  alignSelf: 'center',
                  width: 40,
                  height: 5,
                  borderRadius: 3,
                  backgroundColor: colors.borderStrong,
                  marginBottom: title ? 12 : 4,
                }}
              />
              {title ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text variant="h2" numberOfLines={1}>
                      {title}
                    </Text>
                    {subtitle ? (
                      <Text variant="caption" tone="muted" numberOfLines={2} style={{ marginTop: 2 }}>
                        {subtitle}
                      </Text>
                    ) : null}
                  </View>
                  {headerRight}
                  <Pressable
                    onPress={onClose}
                    hitSlop={12}
                    accessibilityRole="button"
                    accessibilityLabel="Close"
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      backgroundColor: colors.surfaceAlt,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Ionicons name="close" size={18} color={colors.textMuted} />
                  </Pressable>
                </View>
              ) : null}
            </View>
          </GestureDetector>

          {scroll ? (
            <KeyboardRevealContext.Provider value={body.revealer}>
              <ScrollView
                ref={body.scrollRef}
                onScroll={body.onScroll}
                scrollEventThrottle={16}
                style={{ flexGrow: 0, flexShrink: 1 }}
                {...keyboardScrollProps}
                // The panel itself rides above the keyboard (lift, below), so the body must
                // not be inset by it a second time.
                automaticallyAdjustKeyboardInsets={false}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}
              >
                {children}
              </ScrollView>
            </KeyboardRevealContext.Provider>
          ) : (
            // A body with its own list: fields in it must not reach for the screen behind.
            <KeyboardRevealContext.Provider value={null}>
              <View style={{ flexShrink: 1 }}>{children}</View>
            </KeyboardRevealContext.Provider>
          )}

          {footer ? (
            <View
              style={{
                paddingHorizontal: spacing.lg,
                paddingTop: spacing.md,
                paddingBottom: bottomPad,
                borderTopWidth: StyleSheet.hairlineWidth,
                borderTopColor: colors.borderStrong,
                backgroundColor: colors.bgElevated,
              }}
            >
              {footer}
            </View>
          ) : null}
        </Animated.View>
      </GestureHandlerRootView>
    </Modal>
  );
}
