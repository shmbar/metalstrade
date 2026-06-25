import React from 'react';
import { View } from 'react-native';
import { Text } from './Text';
import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/tokens';

type BadgeTone = 'neutral' | 'positive' | 'negative' | 'warn' | 'info';

export function Badge({ label, tone = 'neutral' }: { label: string; tone?: BadgeTone }) {
  const { colors, scheme } = useTheme();

  const map: Record<BadgeTone, { bg: string; fg: string }> = {
    neutral: { bg: scheme === 'dark' ? '#1f2c47' : '#eef3f9', fg: colors.textMuted },
    positive: { bg: scheme === 'dark' ? '#10331f' : '#dcfce7', fg: colors.positive },
    negative: { bg: scheme === 'dark' ? '#3a1414' : '#fee2e2', fg: colors.negative },
    warn: { bg: scheme === 'dark' ? '#3a2c0f' : '#fef3c7', fg: colors.warn },
    info: { bg: scheme === 'dark' ? '#13294a' : '#dbeafe', fg: colors.info },
  };
  const c = map[tone];

  return (
    <View
      style={{
        alignSelf: 'flex-start',
        backgroundColor: c.bg,
        borderRadius: radius.pill,
        paddingHorizontal: 8,
        paddingVertical: 3,
      }}
    >
      <Text variant="caption" color={c.fg} style={{ fontFamily: 'Poppins_600SemiBold' }}>
        {label}
      </Text>
    </View>
  );
}
