import React, { useEffect } from 'react';
import { Modal, View, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import Animated, { SlideInDown, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { scheduleOnRN } from 'react-native-worklets';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Text';
import { Pressable } from './Pressable';
import { useTheme } from '@/theme/ThemeProvider';
import { getShadow, spacing } from '@/theme/tokens';

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

/**
 * Bottom sheet — the one sheet every screen uses.
 *
 * Replaces the hand-rolled `<Modal transparent animationType="slide">` blocks,
 * which slid the dimmed scrim up together with the panel, had no grabber, and
 * could only be dismissed by aiming at a small ✕ or the scrim. Here the scrim
 * fades, the panel springs up, and the header follows the finger: drag it down
 * far enough (or flick) and the sheet closes — the gesture iOS and every banking
 * app have trained people to expect.
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

  useEffect(() => {
    if (visible) y.set(0);
  }, [visible, y]);

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

  const panelStyle = useAnimatedStyle(() => ({ transform: [{ translateY: y.get() }] }));

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1, justifyContent: 'flex-end' }}
        >
          <Pressable
            style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(10,8,24,0.45)' }]}
            onPress={onClose}
            accessibilityLabel="Close"
          />
          <Animated.View
            entering={SlideInDown.springify().damping(20).stiffness(220)}
            style={[
              {
                maxHeight: height * maxHeightPct,
                backgroundColor: colors.bgElevated,
                borderTopLeftRadius: 28,
                borderTopRightRadius: 28,
                paddingBottom: footer ? 0 : insets.bottom + spacing.md,
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
              <ScrollView
                style={{ flexGrow: 0 }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}
              >
                {children}
              </ScrollView>
            ) : (
              <View style={{ flexShrink: 1 }}>{children}</View>
            )}

            {footer ? (
              <View
                style={{
                  paddingHorizontal: spacing.lg,
                  paddingTop: spacing.md,
                  paddingBottom: insets.bottom + spacing.md,
                  borderTopWidth: StyleSheet.hairlineWidth,
                  borderTopColor: colors.borderStrong,
                  backgroundColor: colors.bgElevated,
                }}
              >
                {footer}
              </View>
            ) : null}
          </Animated.View>
        </KeyboardAvoidingView>
      </GestureHandlerRootView>
    </Modal>
  );
}
