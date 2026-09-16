import React from 'react';
import { View, ScrollView, RefreshControl, ScrollViewProps, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/tokens';
import { haptics } from '@/lib/haptics';
import { KeyboardRevealContext, keyboardScrollProps, NATIVE_KEYBOARD_INSETS, useKeyboardAwareScroll } from '@/lib/keyboard';

interface ScreenProps extends ScrollViewProps {
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  edges?: boolean;
  // For screens whose child is itself scrollable (e.g. a FlatList): drop the
  // outer bottom padding so the list reaches the bottom of the screen instead of
  // leaving a dead band above the tab bar. The child manages its own bottom inset.
  flush?: boolean;
}

// Standard screen container: themed background, safe-area aware, optional
// pull-to-refresh, keyboard-aware.
export function Screen({
  children,
  scroll = true,
  refreshing,
  onRefresh,
  edges = true,
  flush = false,
  contentContainerStyle,
  onScroll: onScrollProp,
  ...rest
}: ScreenProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  // On iOS the scroll view is inset by the keyboard natively (keyboardScrollProps), so
  // adding our own bottom padding as well would leave a keyboard-sized hole under the
  // last field. Android has no such thing, so there we still pad by the measured overlap.
  const kb = useKeyboardAwareScroll({ padForKeyboard: !NATIVE_KEYBOARD_INSETS });

  // Every (app) screen lives inside the tab navigator, whose bar already reserves the
  // device's bottom safe area — the screen ends at the bar's top edge. The old
  // `insets.bottom + 96` counted that inset a second time and added a FAB's clearance
  // to screens without one: ~130pt of nothing at the end of every page.
  const pad = {
    paddingTop: edges ? insets.top + spacing.sm : spacing.sm,
    paddingBottom: flush ? 0 : spacing['2xl'],
    paddingHorizontal: spacing.lg,
  };

  if (!scroll) {
    // Apply contentContainerStyle here too so non-scroll screens honour their
    // paddingTop override (otherwise headers render under the status bar).
    return (
      <View style={[{ flex: 1, backgroundColor: colors.bg }, pad, contentContainerStyle as any]}>{children}</View>
    );
  }

  // While the keyboard covers part of this screen the content gets exactly that much
  // more room at the end, so the last field on the page can still scroll above it.
  const basePad = Number(StyleSheet.flatten([pad, contentContainerStyle])?.paddingBottom) || 0;

  return (
    <View ref={kb.frameRef} onLayout={kb.onFrameLayout} collapsable={false} style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardRevealContext.Provider value={kb.revealer}>
        <ScrollView
          ref={kb.scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={[pad, contentContainerStyle, kb.bottomInset > 0 ? { paddingBottom: basePad + kb.bottomInset } : null]}
          showsVerticalScrollIndicator={false}
          // Keyboard behaviour is the same on every scrollable in the app: iOS insets the
          // view itself and scrolls the focused field up, taps still land on controls while
          // the keyboard is open, and a drag dismisses it.
          {...keyboardScrollProps}
          scrollEventThrottle={16}
          onScroll={(e) => {
            kb.onScroll(e);
            onScrollProp?.(e);
          }}
          refreshControl={
            onRefresh ? (
              // Fires the instant the pull-to-refresh triggers, every screen that
              // uses <Screen onRefresh>, the way pulling to refresh feels on a
              // banking app's transaction list.
              <RefreshControl refreshing={!!refreshing} onRefresh={() => { haptics.impact(); onRefresh(); }} tintColor={colors.primary} />
            ) : undefined
          }
          {...rest}
        >
          {children}
        </ScrollView>
      </KeyboardRevealContext.Provider>
      {/* Status-bar backdrop. Scrolled content used to run underneath the clock
          and battery with nothing behind them — the client's screenshot has
          "17:24" printed straight over "Stocks paid". */}
      <View
        pointerEvents="none"
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: insets.top, backgroundColor: colors.bg }}
      />
    </View>
  );
}
