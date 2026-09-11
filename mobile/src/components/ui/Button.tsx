import React from 'react';
import { ActivityIndicator, ViewStyle, View } from 'react-native';
import { Pressable } from './Pressable';
import { Text } from './Text';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/tokens';
import { hapticTap, hapticWarning } from '@/lib/haptics';

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
  const { colors } = useTheme();
  const isDisabled = disabled || loading;

  // Every colour comes from the theme. The old hardcoded fallbacks were the OLD
  // blue brand (#0366ae), so any theme miss silently repainted the button in a
  // colour the web app no longer uses — worse than the transparent background they
  // were added to prevent, because it looked deliberate rather than broken.
  const bg: Record<Variant, string> = {
    primary: colors.primary,
    secondary: colors.surfaceAlt,
    ghost: 'transparent',
    danger: colors.negative,
  };
  const fg: Record<Variant, string> = {
    primary: colors.primaryText,
    secondary: colors.primary,
    ghost: colors.primary,
    danger: '#FFFFFF',
  };

  // One tap of feedback for every button in the app, rather than each screen
  // remembering to wire it up — danger buttons (delete, etc.) get the heavier
  // "warning" pattern the way a destructive action deserves to feel.
  const onPressWithHaptic = onPress
    ? () => {
        (variant === 'danger' ? hapticWarning : hapticTap)();
        onPress();
      }
    : undefined;

  return (
    <Pressable
      onPress={onPressWithHaptic}
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
          <Text variant="bodyMedium" color={fg[variant]} style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}>
            {title}
          </Text>
        </>
      )}
    </Pressable>
  );
}
