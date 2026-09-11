import React from 'react';
import { View } from 'react-native';
import { Pressable } from '@/components/ui/Pressable';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/tokens';
import { useSettings } from '@/store/settings';

// Compact year stepper bound to the settings date window. The web app uses a
// full date-range picker; on mobile the year stepper covers the common case and
// the richer picker arrives with the statements screens.
export function PeriodSelector() {
  const { colors } = useTheme();
  const { dateSelect, setYear } = useSettings();
  const year = parseInt(dateSelect.start.substring(0, 4)) || new Date().getFullYear();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: colors.border,
        paddingHorizontal: 4,
        paddingVertical: 2,
        gap: 2,
      }}
    >
      {/* Each chevron was a 28pt target with 6pt of slop — under Apple's 44pt
          minimum, so a thumb often missed it. The slop grows outward (not toward
          the year label) so the two arrows still can't be confused. */}
      <Pressable
        onPress={() => setYear(year - 1)}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 4 }}
        style={{ padding: 8 }}
        accessibilityRole="button"
        accessibilityLabel="Previous year"
      >
        <Ionicons name="chevron-back" size={16} color={colors.textMuted} />
      </Pressable>
      <Text variant="label" style={{ minWidth: 38, textAlign: 'center' }}>
        {year}
      </Text>
      <Pressable
        onPress={() => setYear(year + 1)}
        hitSlop={{ top: 12, bottom: 12, left: 4, right: 12 }}
        style={{ padding: 8 }}
        accessibilityRole="button"
        accessibilityLabel="Next year"
      >
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
      </Pressable>
    </View>
  );
}
