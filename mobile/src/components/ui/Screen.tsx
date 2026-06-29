import React from 'react';
import { View, ScrollView, RefreshControl, ScrollViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/tokens';

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
// pull-to-refresh. Bottom padding clears the tab bar.
export function Screen({
  children,
  scroll = true,
  refreshing,
  onRefresh,
  edges = true,
  flush = false,
  contentContainerStyle,
  ...rest
}: ScreenProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const pad = {
    paddingTop: edges ? insets.top + spacing.sm : spacing.sm,
    paddingBottom: flush ? 0 : insets.bottom + 96,
    paddingHorizontal: spacing.lg,
  };

  if (!scroll) {
    // Apply contentContainerStyle here too so non-scroll screens honour their
    // paddingTop override (otherwise headers render under the status bar).
    return (
      <View style={[{ flex: 1, backgroundColor: colors.bg }, pad, contentContainerStyle as any]}>{children}</View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={[pad, contentContainerStyle]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        ) : undefined
      }
      {...rest}
    >
      {children}
    </ScrollView>
  );
}
