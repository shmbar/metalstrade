import React from 'react';
import { Text as RNText, TextProps, TextStyle } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { MAX_FONT_SCALE, typography } from '@/theme/tokens';

export type TextVariant = keyof typeof typography;
type Tone = 'default' | 'muted' | 'faint' | 'primary' | 'positive' | 'negative' | 'warn' | 'inverse';

export interface AppTextProps extends TextProps {
  variant?: TextVariant;
  tone?: Tone;
  color?: string;
}

// Tabular digits on every line of text, not just the ones someone remembered to mark:
// amounts, weights and dates in neighbouring rows then take the same width and line up.
const TABULAR: TextStyle = { fontVariant: ['tabular-nums'] };

/*
 * The only Text in the app. Size, weight and line height come from the variant — never
 * from a style prop — so the whole app follows one ladder (theme/tokens typography).
 * System Larger Text still enlarges it, up to MAX_FONT_SCALE: past that, fixed-height
 * controls (chips, fields, tab bar) stop fitting the text they hold, which is what made
 * some rows look uneven next to others.
 */
export function Text({ variant = 'body', tone = 'default', color, style, maxFontSizeMultiplier = MAX_FONT_SCALE, ...rest }: AppTextProps) {
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
  return <RNText maxFontSizeMultiplier={maxFontSizeMultiplier} style={[TABULAR, base, { color: color ?? toneColor[tone] }, style]} {...rest} />;
}
