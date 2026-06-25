import React from 'react';
import { Text as RNText, TextProps, TextStyle } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { typography } from '@/theme/tokens';

type Variant = keyof typeof typography;
type Tone = 'default' | 'muted' | 'faint' | 'primary' | 'positive' | 'negative' | 'warn' | 'inverse';

export interface AppTextProps extends TextProps {
  variant?: Variant;
  tone?: Tone;
  color?: string;
}

export function Text({ variant = 'body', tone = 'default', color, style, ...rest }: AppTextProps) {
  const { colors } = useTheme();

  const toneColor: Record<Tone, string> = {
    default: colors.text,
    muted: colors.textMuted,
    faint: colors.textFaint,
    primary: colors.primary,
    positive: colors.positive,
    negative: colors.negative,
    warn: colors.warn,
    inverse: colors.primaryText,
  };

  const base = typography[variant] as TextStyle;
  return <RNText style={[base, { color: color ?? toneColor[tone] }, style]} {...rest} />;
}
