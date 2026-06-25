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
}

// Standard screen container: themed background, safe-area aware, optional
// pull-to-refresh. Bottom padding clears the tab bar.
export function Screen({
  children,
  scroll = true,
  refreshing,
  onRefresh,
  edges = true,
  contentContainerStyle,
  ...rest
}: ScreenProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const pad = {
    paddingTop: edges ? insets.top + spacing.sm : spacing.sm,
    paddingBottom: insets.bottom + 96,
    paddingHorizontal: spacing.lg,
  };

  if (!scroll) {
    return (
      <View style={[{ flex: 1, backgroundColor: colors.bg }, pad]}>{children}</View>
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
