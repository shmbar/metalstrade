import React from 'react';
import { ScrollView, StyleProp, View, ViewStyle } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/tokens';

/**
 * One swipeable row of chips, bleeding to both screen edges so the clipped chip at the
 * edge says "swipe me".
 *
 * Every filter row goes through here because of one React Native trap: a horizontal
 * ScrollView in a column that is NOT itself scrolling (a list screen whose FlatList sits
 * below the filters) grows to fill the free height. With a short list that turned the
 * Invoices filters into a band of empty space above and below the chips. flexGrow and
 * flexShrink 0 pin the row to its content height.
 */
export function ChipRow({
  children,
  style,
  contentContainerStyle,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      style={[{ flexGrow: 0, flexShrink: 0, marginHorizontal: -spacing.lg }, style]}
      contentContainerStyle={[{ gap: 8, paddingHorizontal: spacing.lg, alignItems: 'center' }, contentContainerStyle]}
    >
      {children}
    </ScrollView>
  );
}

/** Separates two groups of chips in one row (filters | sort). */
export function ChipDivider() {
  const { colors } = useTheme();
  return <View style={{ width: 1, height: 22, backgroundColor: colors.borderStrong, marginHorizontal: 4 }} />;
}
