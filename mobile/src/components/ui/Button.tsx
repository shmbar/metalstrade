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

  const bg: Record<Variant, string> = {
    primary: colors.primary,
    secondary: scheme === 'dark' ? colors.surfaceAlt : '#dbeeff',
    ghost: 'transparent',
    danger: colors.negative,
  };
  const fg: Record<Variant, string> = {
    primary: colors.primaryText,
    secondary: colors.primary,
    ghost: colors.primary,
    danger: '#ffffff',
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        {
          backgroundColor: bg[variant],
          borderRadius: radius.md,
          paddingVertical: 13,
          paddingHorizontal: spacing.lg,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: 8,
          width: fullWidth ? '100%' : undefined,
          borderWidth: variant === 'ghost' ? 1 : 0,
          borderColor: colors.border,
          opacity: isDisabled ? 0.55 : pressed ? 0.9 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg[variant]} />
      ) : (
        <>
          {leftIcon && <View>{leftIcon}</View>}
          <Text variant="bodyMedium" color={fg[variant]} style={{ fontFamily: 'Poppins_600SemiBold' }}>
            {title}
          </Text>
        </>
      )}
    </Pressable>
  );
}
