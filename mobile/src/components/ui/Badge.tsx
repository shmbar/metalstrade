import React from 'react';
import { View } from 'react-native';
import { Text } from './Text';
import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/tokens';

type BadgeTone = 'neutral' | 'positive' | 'negative' | 'warn' | 'info';

// Status chip, modern-fintech style: a small colored dot + quiet text on a
// neutral wash — state reads at a glance without pastel-pill noise.
export function Badge({ label, tone = 'neutral' }: { label: string; tone?: BadgeTone }) {
  const { colors, scheme } = useTheme();

  const dot: Record<BadgeTone, string> = {
    neutral: colors.textFaint,
    positive: colors.positive,
    negative: colors.negative,
    warn: colors.warn,
    info: colors.info,
  };

  return (
    <View
      style={{
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: scheme === 'dark' ? '#ffffff10' : '#11182708',
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.pill,
        paddingHorizontal: 8,
        paddingVertical: 2.5,
      }}
    >
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: dot[tone] }} />
      <Text variant="caption" tone="muted" style={{ fontFamily: 'Inter_500Medium' }}>
        {label}
      </Text>
    </View>
  );
}
