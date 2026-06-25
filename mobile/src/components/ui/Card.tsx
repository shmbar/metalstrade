import React from 'react';
import { View, ViewProps, Pressable } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing, getShadow, Elevation } from '@/theme/tokens';

export interface CardProps extends ViewProps {
  padded?: boolean;
  onPress?: () => void;
  elevation?: Elevation;
}

export function Card({ padded = true, style, children, onPress, elevation = 'md', ...rest }: CardProps) {
  const { colors, scheme } = useTheme();

  const cardStyle = [
    {
      backgroundColor: colors.card,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: colors.border,
      padding: padded ? spacing.lg : 0,
      ...getShadow(scheme, elevation),
    },
    style,
  ];

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [...cardStyle, pressed && { opacity: 0.85, transform: [{ scale: 0.995 }] }]}
        {...rest}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View style={cardStyle} {...rest}>
      {children}
    </View>
  );
}
