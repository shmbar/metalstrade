import React from 'react';
import { Pressable, ActivityIndicator, ViewStyle, View } from 'react-native';
import { Text } from './Text';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/tokens';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  leftIcon?: React.ReactNode;
  fullWidth?: boolean;
  style?: ViewStyle;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  loading,
  disabled,
  leftIcon,
  fullWidth = true,
  style,
}: ButtonProps) {
  const { colors, scheme } = useTheme();
  const isDisabled = disabled || loading;

  // Explicit fallbacks so a missing/undefined theme token can never collapse the
  // background to transparent (which previously rendered buttons invisible).
  const bg: Record<Variant, string> = {
    primary: colors.primary || '#0366ae',
    secondary: scheme === 'dark' ? colors.surfaceAlt || '#1c2942' : '#eef0f3',
    ghost: 'transparent',
    danger: colors.negative || '#dc2626',
  };
  const fg: Record<Variant, string> = {
    primary: colors.primaryText || '#ffffff',
    secondary: colors.primary || '#0366ae',
    ghost: colors.primary || '#0366ae',
    danger: '#ffffff',
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={[
        {
          backgroundColor: bg[variant],
          borderRadius: radius.md,
          paddingVertical: 13,
          paddingHorizontal: spacing.lg,
          minHeight: 50,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: 8,
          width: fullWidth ? '100%' : undefined,
          borderWidth: variant === 'ghost' ? 1 : 0,
          borderColor: colors.border,
          opacity: isDisabled ? 0.55 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg[variant]} />
      ) : (
        <>
          {leftIcon && <View>{leftIcon}</View>}
          <Text variant="bodyMedium" color={fg[variant]} style={{ fontFamily: 'Inter_600SemiBold' }}>
            {title}
          </Text>
        </>
      )}
    </Pressable>
  );
}
